import React from 'react'
import {AbsoluteFill} from 'remotion'
import {BrowserFrame, Stage} from '../kit/Chrome'
import {Cursor} from '../kit/Cursor'
import {TABS, urlOnlyText} from '../kit/data'
import {useAfter, useCursor, useEnter, useTimeline} from '../kit/human'
import {Popup} from '../kit/Popup'
import {PageBackdrop} from '../stills/Marquee'
import {ANCHOR, BROWSER, POP, POP_LEFT} from './shell'

// The payoff clip: a pasted list becomes tabs. The window starts nearly empty;
// on the Paste click, the strip fills back up one tab at a time — the literal
// "reopen every tab". Its own frame (not BrowserBed) so the tab count can grow.

export const StepPaste: React.FC = () => {
  const open = useEnter(0.3, {damping: 22, stiffness: 210})

  // Tabs reopen after the paste click at ~2.0s.
  const tabCount = Math.round(useTimeline([{t: 2.05, v: 1}, {t: 4.6, v: TABS.length}]))
  const tabs = TABS.slice(0, Math.max(1, tabCount))
  const opened = useAfter(4.7)

  const cur = useCursor(
    [
      {t: 0, x: ANCHOR.paste.x + 30, y: ANCHOR.paste.y + 150},
      {t: 0.9, x: ANCHOR.paste.x, y: ANCHOR.paste.y},
      {t: 5.6, x: ANCHOR.paste.x + 40, y: ANCHOR.paste.y + 240},
    ],
    [{t: 1.95}],
  )
  const pressingPaste = cur.pressed && Math.abs(cur.x - ANCHOR.paste.x) < 70

  return (
    <Stage aura>
      <AbsoluteFill>
        <div style={{position: 'absolute', left: BROWSER.left, top: BROWSER.top}}>
          <BrowserFrame url="github.com/Flozad/copy-all-urls-extension" tabs={tabs} style={{width: BROWSER.width, height: BROWSER.height}}>
            <PageBackdrop />
          </BrowserFrame>
        </div>

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
              content={urlOnlyText(6)}
              source="Textarea"
              hot={pressingPaste ? 'paste' : undefined}
              message={opened ? {text: '✓ Opened 14 tabs from your list', kind: 'ok'} : undefined}
            />
          </div>
        ) : null}

        <Cursor {...cur} />
      </AbsoluteFill>
    </Stage>
  )
}
