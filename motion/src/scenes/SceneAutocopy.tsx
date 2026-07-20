import React from 'react'
import {urlOnlyText} from '../kit/data'
import {useAfter, useEnter, useTimeline} from '../kit/human'
import {Popup} from '../kit/Popup'
import {PanelBed} from './panel-shell'

// Auto-copy: the popup opens with the toggle already on, and the URLs land on
// the clipboard the instant it appears — no click. The textarea fills and the
// toast confirms, all from the act of opening. No cursor: the point is that you
// touch nothing.

export const SceneAutocopy: React.FC = () => {
  const open = useEnter(0.5, {damping: 21, stiffness: 200})

  // Streaming begins the moment the popup is up — that's the whole feature.
  const lines = Math.round(useTimeline([{t: 1.0, v: 0}, {t: 3.4, v: 9}]))
  const streaming = lines > 0 && lines < 9
  const copied = useAfter(3.5)

  return (
    <PanelBed
      open={open}
      popup={
        <Popup
          format="url_only"
          content={urlOnlyText(lines)}
          caret={streaming}
          autoCopy
          message={
            copied ? {text: '✓ Auto-copied 14 URLs on open', kind: 'ok'} : undefined
          }
        />
      }
    />
  )
}
