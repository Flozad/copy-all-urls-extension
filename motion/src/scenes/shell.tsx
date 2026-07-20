import React from 'react'
import {AbsoluteFill} from 'remotion'
import {BrowserFrame, Stage} from '../kit/Chrome'
import {TABS} from '../kit/data'
import {PageBackdrop} from '../stills/Marquee'

// Shared geometry for the wide (1600×900) motion scenes, so the cursor can land
// on real controls and every clip frames the product identically.

export const BROWSER = {left: 150, top: 96, width: 1300, height: 780}
/** The Umbrella toolbar button — where the popup hangs from. */
export const ICON = {x: BROWSER.left + BROWSER.width - 66, y: BROWSER.top + 44 + 23}
export const POP = {right: BROWSER.left + BROWSER.width - 22, top: BROWSER.top + 84, width: 396}
export const POP_LEFT = POP.right - POP.width

// Control anchors on the popup, derived from the Popup layout once.
export const ANCHOR = {
  copy: {x: POP_LEFT + 122, y: POP.top + 122},
  caret: {x: POP_LEFT + 218, y: POP.top + 122},
  paste: {x: POP_LEFT + 300, y: POP.top + 122},
  // A format row inside the open dropdown (Text=0 … Custom=5), measured from a
  // rendered frame: first row centre ~161px below the popup top, 34px apart.
  formatRow: (i: number) => ({x: POP_LEFT + 130, y: POP.top + 161 + i * 34}),
}

/** The browser bed every wide scene sits on: aura, then the tab-filled window. */
export const BrowserBed: React.FC<{children?: React.ReactNode}> = ({children}) => (
  <Stage aura>
    <AbsoluteFill>
      <div style={{position: 'absolute', left: BROWSER.left, top: BROWSER.top}}>
        <BrowserFrame
          url="github.com/Flozad/copy-all-urls-extension"
          tabs={TABS}
          style={{width: BROWSER.width, height: BROWSER.height}}
        >
          <PageBackdrop />
        </BrowserFrame>
      </div>
      {children}
    </AbsoluteFill>
  </Stage>
)
