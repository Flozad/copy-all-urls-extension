import React from 'react'
import {AbsoluteFill} from 'remotion'
import {Stage} from '../kit/Chrome'
import {theme} from '../kit/theme'

// Geometry for the tall 4/5 PANEL scenes (960×1200) — the popup-only clips that
// sit in the site's .u-shot.panel plates. The popup is drawn at its true 420px
// width and scaled up bodily, so its proportions match the shipping product
// exactly; anchors are the on-screen coordinates of each control after scaling.

// Scale chosen so the whole popup — including its scope control, toast and footer
// — fits the 1200px-tall panel with margin. Scenes cap the textarea to ~9 lines
// (it scrolls in the real product) to keep the height in budget.
export const PANEL_SCALE = 1.55
const NAT_W = 420
export const PANEL_ORIGIN = {x: (960 - NAT_W * PANEL_SCALE) / 2, y: 70}

// Natural (unscaled) control centres inside the Popup, measured from its layout.
const NAT = {
  copy: {x: 105, y: 113},
  caret: {x: 206, y: 113},
  paste: {x: 289, y: 113},
  toggle: {x: 34, y: 372}, // the auto-copy checkbox
  formatRow: (i: number) => ({x: 120, y: 158 + i * 34}),
}

const toScreen = (p: {x: number; y: number}) => ({
  x: PANEL_ORIGIN.x + p.x * PANEL_SCALE,
  y: PANEL_ORIGIN.y + p.y * PANEL_SCALE,
})

export const PANEL_ANCHOR = {
  copy: toScreen(NAT.copy),
  caret: toScreen(NAT.caret),
  paste: toScreen(NAT.paste),
  toggle: toScreen(NAT.toggle),
  formatRow: (i: number) => toScreen(NAT.formatRow(i)),
}

/**
 * The paper bed for a panel scene. `popup` is drawn scaled (its coordinates are
 * natural popup space); `overlay` is drawn at screen scale — that's where the
 * <Cursor/> goes, since PANEL_ANCHOR is in screen coordinates.
 */
export const PanelBed: React.FC<{
  popup: React.ReactNode
  overlay?: React.ReactNode
  open?: number
}> = ({popup, overlay, open = 1}) => (
  <Stage aura>
    <AbsoluteFill>
      <div
        style={{
          position: 'absolute',
          left: PANEL_ORIGIN.x,
          top: PANEL_ORIGIN.y,
          width: NAT_W,
          transform: `scale(${PANEL_SCALE * (0.96 + open * 0.04)})`,
          transformOrigin: 'top left',
          opacity: Math.min(1, open * 2),
          filter: `drop-shadow(${theme.shadow.lift})`,
        }}
      >
        {popup}
      </div>
      {overlay}
    </AbsoluteFill>
  </Stage>
)
