#!/usr/bin/env python3
"""
Regenerates the extension and store icons from store-assets/icon-master.png.

Why this exists: the Chrome Web Store store-icon spec is 96x96 of artwork
centred in a 128x128 canvas, with 16px of transparent padding. The icons
shipped before 1.13.0 had artwork at 69x69-equivalent with 36px of padding on
the left and 23px on the right, so the mark rendered both undersized and
visibly off-centre next to compliant icons.

Rather than hand-nudging five PNGs, this derives every size from one master by
measuring the artwork's true alpha bounding box and re-centring it. Run it
after any change to the icon artwork.

Requires Pillow:  python3 -m pip install Pillow
Run:              npm run build:icons
Verify:           python3 tools/build-icons.py --check
"""

import sys
from PIL import Image

MASTER = 'store-assets/icon-master.png'

# Artwork occupies 96 of 128 => 75% of the canvas, the rest transparent
# padding. Applying the same ratio at every size keeps the toolbar icons
# visually consistent with the store icon.
FILL = 0.75

TARGETS = [
    (16, 'extension/icon-16.png'),
    (32, 'extension/icon-32.png'),
    (48, 'extension/icon-48.png'),
    (128, 'extension/icon-128.png'),
    (512, 'store-assets/store-icon-512.png'),
]


def artwork(path):
    """The source image cropped to its true alpha bounding box."""
    img = Image.open(path).convert('RGBA')
    box = img.getchannel('A').getbbox()
    if box is None:
        raise SystemExit(f'{path} is fully transparent')
    return img.crop(box)


def build(art, size):
    box = size * FILL
    scale = box / max(art.width, art.height)   # uniform: never distort aspect
    w = max(1, round(art.width * scale))
    h = max(1, round(art.height * scale))
    scaled = art.resize((w, h), Image.LANCZOS)
    canvas = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    canvas.paste(scaled, ((size - w) // 2, (size - h) // 2), scaled)
    return canvas


def check():
    ok = True
    print(f"{'file':<34}{'canvas':<11}{'artwork':<11}{'pad L/T/R/B':<16}{'@128':<7}verdict")
    for _, path in TARGETS:
        img = Image.open(path).convert('RGBA')
        w, h = img.size
        l, t, r, b = img.getchannel('A').getbbox()
        aw, ah = r - l, b - t
        k = 128 / w
        # The larger dimension should fill the 96 box; the smaller axis carries
        # the 16px minimum padding.
        good = abs(max(aw, ah) * k - 96) < 2 and abs(min(l, t) * k - 16) < 2
        ok = ok and good
        print(f"{path:<34}{f'{w}x{h}':<11}{f'{aw}x{ah}':<11}"
              f"{f'{l}/{t}/{w - r}/{h - b}':<16}{max(aw, ah) * k:<7.0f}"
              f"{'OK' if good else 'OFF-SPEC'}")
    return ok


def main():
    if '--check' in sys.argv:
        raise SystemExit(0 if check() else 1)

    art = artwork(MASTER)
    print(f'master artwork: {art.width}x{art.height}')
    for size, path in TARGETS:
        build(art, size).save(path)
        print('wrote', path)
    print()
    check()


if __name__ == '__main__':
    main()
