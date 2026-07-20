import React from 'react'
import {Cursor} from '../kit/Cursor'
import {TABS, urlOnlyText} from '../kit/data'
import {useAfter, useCursor, useEnter, useTimeline} from '../kit/human'
import {Popup} from '../kit/Popup'
import {ANCHOR, BrowserBed, ICON, POP, POP_LEFT} from './shell'

// The opener: a real browser full of tabs, the extension clicked open, and every
// URL copied in one motion. Built to loop — it opens and closes on the same
// resting state, and <Stage> fades the seam.

export const HeroDemo: React.FC = () => {
  const open = useEnter(1.75, {damping: 20, stiffness: 200})

  // URLs stream into the textarea line by line once Copy is pressed.
  const lines = Math.round(useTimeline([{t: 3.7, v: 0}, {t: 6.6, v: TABS.length}]))
  const streaming = lines > 0 && lines < TABS.length
  const copied = useAfter(6.75)

  const cur = useCursor(
    [
      {t: 0, x: 780, y: 640},
      {t: 0.7, x: ICON.x, y: ICON.y},
      {t: 3.0, x: ANCHOR.copy.x, y: ANCHOR.copy.y},
      {t: 8.6, x: 900, y: 560},
    ],
    [{t: 1.7}, {t: 3.35}],
  )

  const pressingCopy = cur.pressed && Math.abs(cur.x - ANCHOR.copy.x) < 80 && Math.abs(cur.y - ANCHOR.copy.y) < 30

  return (
    <BrowserBed>
      {open > 0.02 ? (
        <div
          style={{
            position: 'absolute',
            left: POP_LEFT,
            top: POP.top,
            opacity: Math.min(1, open * 2),
            transform: `scale(${0.9 + open * 0.1})`,
            transformOrigin: 'top right',
          }}
        >
          <Popup
            width={POP.width}
            format="url_only"
            content={urlOnlyText(lines)}
            caret={streaming}
            hot={pressingCopy ? 'copy' : undefined}
            message={copied ? {text: '✓ Copied 14 URLs to clipboard', kind: 'ok'} : undefined}
          />
        </div>
      ) : null}

      <Cursor {...cur} />
    </BrowserBed>
  )
}
