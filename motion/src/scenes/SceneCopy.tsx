import React from 'react'
import {Cursor} from '../kit/Cursor'
import {urlOnlyText} from '../kit/data'
import {useAfter, useCursor, useEnter, useTimeline} from '../kit/human'
import {Popup} from '../kit/Popup'
import {PANEL_ANCHOR, PanelBed} from './panel-shell'

// Popup-only, tall: the one-button copy. The cursor lands on Copy URLs, the
// textarea streams every URL in, and the toast confirms the count. Loops on its
// own resting state.

export const SceneCopy: React.FC = () => {
  const open = useEnter(0.4, {damping: 22, stiffness: 210})

  // The textarea shows ~9 lines (it scrolls); the toast reports the full count.
  const lines = Math.round(useTimeline([{t: 2.4, v: 0}, {t: 5.2, v: 9}]))
  const streaming = lines > 0 && lines < 9
  const copied = useAfter(5.35)

  const cur = useCursor(
    [
      {t: 0, x: PANEL_ANCHOR.copy.x + 40, y: PANEL_ANCHOR.copy.y + 260},
      {t: 1.0, x: PANEL_ANCHOR.copy.x, y: PANEL_ANCHOR.copy.y},
      {t: 7.4, x: PANEL_ANCHOR.copy.x - 30, y: PANEL_ANCHOR.copy.y + 320},
    ],
    [{t: 2.15}],
  )
  const pressing =
    cur.pressed &&
    Math.abs(cur.x - PANEL_ANCHOR.copy.x) < 130 &&
    Math.abs(cur.y - PANEL_ANCHOR.copy.y) < 40

  return (
    <PanelBed
      open={open}
      popup={
        <Popup
          format="url_only"
          content={urlOnlyText(lines)}
          caret={streaming}
          hot={pressing ? 'copy' : undefined}
          message={copied ? {text: '✓ Copied 14 URLs to clipboard', kind: 'ok'} : undefined}
        />
      }
      overlay={<Cursor {...cur} />}
    />
  )
}
