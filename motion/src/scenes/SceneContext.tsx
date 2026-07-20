import React from 'react'
import {AbsoluteFill} from 'remotion'
import {Mark} from '../kit/Chrome'
import {Cursor} from '../kit/Cursor'
import {useCursor, useEnter} from '../kit/human'
import {theme} from '../kit/theme'
import {BrowserBed} from './shell'

// The context-menu clip: no popup. The cursor right-clicks the page, Chrome's
// menu opens, and Umbrella's two entries sit in it — the cursor slides down to
// "Copy all URLs" and presses. Copy and paste, without the toolbar.

const AT = {x: 620, y: 470}

const NATIVE = ['Back', 'Forward', 'Reload', 'Save as…', 'Print…']

export const SceneContext: React.FC = () => {
  const menu = useEnter(1.5, {damping: 22, stiffness: 240})
  const menuUp = menu > 0.02

  const cur = useCursor(
    [
      {t: 0, x: 480, y: 360},
      {t: 0.9, x: AT.x, y: AT.y},
      {t: 2.3, x: AT.x + 150, y: AT.y + 250}, // slide onto "Copy all URLs"
      {t: 6.2, x: AT.x + 120, y: AT.y + 300},
    ],
    [{t: 1.45}, {t: 3.2}],
  )

  // Which Umbrella row the cursor is over (0 = copy, 1 = paste).
  const overCopy = cur.y > AT.y + 210 && cur.y < AT.y + 250

  return (
    <BrowserBed>
      <AbsoluteFill>
        {menuUp ? (
          <div
            style={{
              position: 'absolute',
              left: AT.x,
              top: AT.y,
              width: 250,
              padding: '6px 0',
              borderRadius: 12,
              background: theme.panel,
              border: `1px solid ${theme.line}`,
              boxShadow: theme.shadow.lift,
              fontFamily: theme.font.sans,
              opacity: Math.min(1, menu * 2),
              transform: `scale(${0.96 + menu * 0.04})`,
              transformOrigin: 'top left',
            }}
          >
            {NATIVE.map((n) => (
              <div key={n} style={{padding: '8px 16px', fontSize: 14, color: theme.dim}}>
                {n}
              </div>
            ))}
            <div style={{height: 1, background: theme.line, margin: '6px 0'}} />
            <MenuItem label="Copy all URLs" over={overCopy} />
            <MenuItem label="Paste URLs to open" over={!overCopy && cur.y > AT.y + 250} />
          </div>
        ) : null}

        <Cursor {...cur} />
      </AbsoluteFill>
    </BrowserBed>
  )
}

const MenuItem: React.FC<{label: string; over?: boolean}> = ({label, over}) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '9px 16px',
      fontSize: 14,
      fontWeight: 600,
      color: over ? theme.onBrand : theme.text,
      background: over ? theme.text : 'transparent',
    }}
  >
    <Mark size={16} color={over ? theme.onBrand : theme.text} crease={over ? theme.text : theme.panel} />
    {label}
  </div>
)
