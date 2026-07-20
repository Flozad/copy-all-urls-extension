import React from 'react'
import {Cursor} from '../kit/Cursor'
import {urlOnlyText} from '../kit/data'
import {useAfter, useCursor, useEnter} from '../kit/human'
import {Popup} from '../kit/Popup'
import {PANEL_ORIGIN, PANEL_SCALE, PanelBed} from './panel-shell'

// All-windows: the popup's scope control switches from this window to every
// window, and the copied count jumps. The cursor presses "All windows" and the
// textarea grows from one window's worth of tabs to the lot.

// The scope control sits just under the header, so the action row and the
// controls below it are pushed down by its height (~44px). Anchors are nudged
// to match.
const dy = 44
const anchor = (nx: number, ny: number) => ({
  x: PANEL_ORIGIN.x + nx * PANEL_SCALE,
  y: PANEL_ORIGIN.y + (ny + dy) * PANEL_SCALE,
})
const SCOPE_ALL = anchor(300, 78) // right half of the segmented control
const COPY = anchor(105, 113)

export const SceneWindows: React.FC = () => {
  const open = useEnter(0.4, {damping: 22, stiffness: 210})
  const switched = useAfter(1.9)

  // 14 tabs in this window; 31 across all windows. The textarea shows ~9 lines
  // (it scrolls); switching scope swaps in a couple of the other window's URLs so
  // the list visibly changes, and the toast reports the full count.
  const total = switched ? 31 : 14
  const copied = useAfter(4.9)
  const content = switched
    ? urlOnlyText(6) + '\n' + extraWindows(3)
    : urlOnlyText(9)

  const cur = useCursor(
    [
      {t: 0, x: SCOPE_ALL.x + 20, y: SCOPE_ALL.y + 220},
      {t: 1.0, x: SCOPE_ALL.x, y: SCOPE_ALL.y},
      {t: 2.6, x: COPY.x, y: COPY.y},
      {t: 7.2, x: COPY.x - 20, y: COPY.y + 300},
    ],
    [{t: 1.85}, {t: 4.35}],
  )
  const pressScope = cur.pressed && cur.y < SCOPE_ALL.y + 30 && cur.y > SCOPE_ALL.y - 30
  const pressCopy = cur.pressed && cur.y > COPY.y - 30 && cur.y < COPY.y + 30

  return (
    <PanelBed
      open={open}
      popup={
        <Popup
          scope={switched ? 'all' : 'window'}
          format="url_only"
          content={content}
          hot={pressScope ? 'scopeAll' : pressCopy ? 'copy' : undefined}
          message={
            copied
              ? {text: `✓ Copied ${total} URLs from all windows`, kind: 'ok'}
              : undefined
          }
        />
      }
      overlay={<Cursor {...cur} />}
    />
  )
}

// A second window's worth of believable URLs, revealed as the scope widens.
const EXTRA = [
  'https://mail.google.com/mail/u/0',
  'https://calendar.google.com',
  'https://open.spotify.com',
  'https://www.figma.com/board',
  'https://docs.google.com/document',
  'https://twitter.com/home',
  'https://reddit.com/r/chrome',
  'https://developer.chrome.com/docs/extensions',
  'https://news.google.com',
  'https://maps.google.com',
  'https://drive.google.com',
  'https://amazon.com/orders',
  'https://en.wikipedia.org/wiki/Umbrella',
  'https://weather.com',
  'https://calendar.notion.so',
  'https://slack.com/messages',
  'https://linear.app/team',
]
const extraWindows = (n: number) => EXTRA.slice(0, n).join('\n')
