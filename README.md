# Umbrella — Copy All URLs

Umbrella is a Chrome extension (Manifest V3) that lets you **save and restore browser tabs instantly**. Copy the URLs of all open tabs — or just the selected ones — in multiple formats, then paste them back to reopen everything in one go.

It began as an enhanced fork of the original **CopyAllURLs** extension and has since grown its own feature set, settings UI, and marketing site.

## Repository layout

This repo holds three independent projects:

| Path             | What it is                                                                 |
|------------------|---------------------------------------------------------------------------|
| `extension/`     | The Chrome extension itself (Manifest V3, vanilla JS). This is the product. |
| `umbrella-docs/` | The marketing + documentation site (Next.js, deployed to Vercel).          |
| `store-assets/`  | Chrome Web Store listing assets (screenshots, promo tiles, icon source).    |
| `motion/`        | Remotion project for promotional/demo videos.                              |

If you only care about the extension, everything you need is in `extension/`.

## Features

- Copy URLs in multiple formats: text, HTML, JSON, and custom templates
- Paste URLs to reopen them as new tabs
- Optionally include every Chrome window
- Keyboard shortcuts and a right-click context menu
- Auto-copy on demand
- Configurable default actions and MIME types
- Robust storage with sync/local fallback, plus a built-in health check and repair tool
- Friendly error handling and notifications

## Installing the extension (from source)

1. Clone or download this repository
2. Open `chrome://extensions/` in Chrome
3. Enable **Developer mode** (top right)
4. Click **Load unpacked** and select the `extension/` directory

Or install the published version from the Chrome Web Store (see the [docs site](./umbrella-docs)).

## Usage

- Click the Umbrella icon in the toolbar to copy or paste URLs from the popup
- Use the keyboard shortcuts (`Ctrl/Cmd+Shift+U` to copy, `Ctrl/Cmd+Shift+Y` to paste)
- Right-click a page to use the context-menu actions
- Open the **Options** page to customize formats, templates, and behavior
- If settings ever fail to persist, use the storage **Health Check** and **Repair** tools on the Options page

### Custom formatting

Custom templates support variables: `$url`, `$title`, `$date`. Formats include text, HTML, JSON, and delimited output with configurable delimiters.

## Permissions

Umbrella requests only what it needs: `tabs`, `storage`, `clipboardRead`, `clipboardWrite`, `contextMenus`, `offscreen`, and `alarms`. It has **no host permissions** and no content scripts, and its content security policy is restricted to `'self'`. URLs and clipboard contents never leave your browser.

Every asset the extension loads ships inside the package — including the Tailwind stylesheet, which is vendored at `extension/vendor/tailwind.min.css` rather than fetched from a CDN. The popup and options pages make **no network requests at all**; you can verify this in DevTools → Network with the extension open.

## Docs site

The `umbrella-docs/` folder is a standalone Next.js app. To run it locally:

```bash
cd umbrella-docs
bun install
bun run dev
```

Then open http://localhost:3000.

## Development

| Command | What it does | Requires |
|---|---|---|
| `npm test` | Runs the full suite (Node's built-in runner + jsdom). | — |
| `npm run build:zip` | Packages `extension/` for the Web Store, named from the manifest version. | — |
| `npm run check:listing` | Validates `store-assets/LISTING.md` against the Web Store's title/summary limits and copy rules. | — |
| `npm run build:icons` | Regenerates every extension and store icon from `store-assets/icon-master.png`. | **Python 3 + [Pillow](https://pypi.org/project/Pillow/)** |

`build:icons` is the only task with a dependency outside npm. Install it with:

```bash
python3 -m pip install Pillow
```

Then verify the committed icons match the Web Store's 96-in-128 spec without
rewriting them:

```bash
python3 tools/build-icons.py --check
```

## Version history

See [CHANGELOG.md](./CHANGELOG.md).

## Contributing

Contributions are welcome — fork the repo, make your changes, and open a pull request.

## License

MIT — see [LICENSE](./LICENSE).

## Acknowledgments

- Inspired by the original [CopyAllURLs](https://github.com/vincepare/CopyAllUrl_Chrome) Chrome extension
- Built by [Lozard](https://github.com/Flozad)
