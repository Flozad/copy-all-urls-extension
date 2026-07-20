// Renders the whole media package:
//   · the site clips → ../umbrella-docs/public/motion/*.mp4, each with a JPEG
//     poster taken from a late frame so a reader who never triggers playback
//     still sees the resolved state (see umbrella-docs/components/shot.tsx)
//   · the Chrome Web Store stills → ../store-assets/*.png (store slot dimensions)
//
// Usage:
//   bun run scripts/render-all.ts                    # everything
//   bun run scripts/render-all.ts --stills           # just the store PNGs
//   bun run scripts/render-all.ts --clips            # just the clips + posters
//   bun run scripts/render-all.ts hero-demo tour-copy  # just those clips

import {existsSync, mkdirSync} from 'node:fs'
import {fileURLToPath} from 'node:url'
import {$} from 'bun'

const ENTRY = 'src/index.ts'

// Store stills → the extension's store-assets folder.
const STILLS = [
  {id: 'marquee', file: 'marquee-1400x560'},
  {id: 'promo', file: 'promo-440x280'},
  {id: 'shot-01-copy', file: '01-copy-all-tabs'},
  {id: 'shot-02-formats', file: '02-six-formats'},
  {id: 'shot-03-paste', file: '03-paste-to-reopen'},
  {id: 'shot-04-shortcuts', file: '04-shortcuts-and-menu'},
  {id: 'shot-05-settings', file: '05-settings'},
]

// Site clips → umbrella-docs/public/motion/. `frames` is the clip length, used
// to place the poster. Keep in lockstep with src/Root.tsx durations (fps 30).
const CLIPS = [
  {id: 'hero-demo', frames: 13 * 30},
  {id: 'tour-copy', frames: 9 * 30},
  {id: 'tour-formats', frames: 7 * 30},
  {id: 'tour-paste', frames: 7 * 30},
  {id: 'tour-autocopy', frames: 8 * 30},
  {id: 'tour-shortcuts', frames: 8 * 30},
  {id: 'tour-context', frames: 8 * 30},
  {id: 'tour-windows', frames: 9 * 30},
  {id: 'tour-options', frames: 8 * 30},
  {id: 'tour-storage', frames: 9 * 30},
  {id: 'tour-dark', frames: 8 * 30},
]

// fileURLToPath, not `.pathname`: the repo path can contain characters a URL
// keeps percent-encoded, which would create a literally mis-named directory.
const STORE = fileURLToPath(new URL('../../store-assets/', import.meta.url))
const MOTION = fileURLToPath(new URL('../../umbrella-docs/public/motion/', import.meta.url))
for (const dir of [STORE, MOTION]) if (!existsSync(dir)) mkdirSync(dir, {recursive: true})

const argv = process.argv.slice(2)
const only = argv.filter((a) => !a.startsWith('--'))
const stillsFlag = argv.includes('--stills')
const clipsFlag = argv.includes('--clips')
const doStills = (argv.length === 0 || stillsFlag) && !clipsFlag && !only.length
const doClips = argv.length === 0 || clipsFlag || only.length > 0

if (doStills) {
  console.log('\n▶ Store stills → store-assets/')
  for (const s of STILLS) {
    await $`bunx remotion still ${ENTRY} ${s.id} ${STORE + s.file + '.png'} --log=error`
    console.log(`  ✓ ${s.file}.png`)
  }
}

if (doClips) {
  const todo = only.length ? CLIPS.filter((c) => only.includes(c.id)) : CLIPS
  console.log('\n▶ Site clips → umbrella-docs/public/motion/')
  for (const c of todo) {
    // crf 26 is transparent on flat monochrome UI (no film grain to preserve)
    // and keeps each file small; faststart puts the moov atom up front so the
    // browser can start playing before the whole file lands.
    await $`bunx remotion render ${ENTRY} ${c.id} ${MOTION + c.id + '.mp4'} --codec=h264 --crf=26 --log=error`
    // The poster: a late frame, so it shows the outcome, not the setup.
    const poster = Math.round(c.frames * 0.86)
    await $`bunx remotion still ${ENTRY} ${c.id} ${MOTION + c.id + '.jpg'} --frame=${poster} --jpeg-quality=82 --log=error`
    console.log(`  ✓ ${c.id}.mp4 (+ poster)`)
  }
}

console.log('\nDone.')
