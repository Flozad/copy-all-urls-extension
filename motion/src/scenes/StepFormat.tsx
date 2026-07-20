import React from 'react'
import {Cursor} from '../kit/Cursor'
import {jsonBody, urlOnlyText} from '../kit/data'
import {useAfter, useCursor, useEnter} from '../kit/human'
import {Popup} from '../kit/Popup'
import {ANCHOR, BrowserBed, POP, POP_LEFT} from './shell'

// One capability, one clip: switch the copy format. The popup is already open;
// the cursor opens the format menu and picks JSON, and the textarea reformats.

export const StepFormat: React.FC = () => {
  const open = useEnter(0.3, {damping: 22, stiffness: 210})
  const menu = useEnter(1.65)

  // Hooks are called unconditionally, then combined — a `&&` in front of a
  // useAfter() would short-circuit the call and change the hook count per frame.
  const afterCaret = useAfter(1.6)
  const afterClose = useAfter(3.15)
  const afterPick = useAfter(3.05)
  const afterHover = useAfter(2.5)

  // The menu is up between the caret click and the pick.
  const menuUp = afterCaret && !afterClose
  const picked = afterPick
  const overJson = afterHover && !picked

  const cur = useCursor(
    [
      {t: 0, x: ANCHOR.caret.x + 40, y: ANCHOR.caret.y + 120},
      {t: 0.9, x: ANCHOR.caret.x, y: ANCHOR.caret.y},
      {t: 2.0, x: ANCHOR.formatRow(2).x, y: ANCHOR.formatRow(2).y},
      {t: 5.4, x: ANCHOR.caret.x + 60, y: ANCHOR.caret.y + 220},
    ],
    [{t: 1.5}, {t: 3.05}],
  )

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
            format={picked ? 'json' : 'url_only'}
            content={picked ? jsonBody(6) : urlOnlyText(6)}
            dropdownOpen={menuUp}
            dropdownProgress={menu}
            formatHot={overJson ? 'json' : undefined}
          />
        </div>
      ) : null}

      <Cursor {...cur} />
    </BrowserBed>
  )
}
