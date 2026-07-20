import React from 'react'
import {AbsoluteFill} from 'remotion'
import {theme} from '../kit/theme'
import {useAfter, useEnter, usePulse} from '../kit/human'
import {BrowserBed, ICON} from './shell'

// The keyboard clip: no popup, no cursor — just the page, and the shortcut fired
// from the keyboard. Three keycaps press in sequence (⌘ ⇧ U), the extension icon
// pulses to acknowledge, and a small confirmation slides in under it. That's the
// whole promise: copy every tab without touching the mouse.

const KEYS = [
  {label: '⌘', t: 1.4},
  {label: '⇧', t: 1.62},
  {label: 'U', t: 1.84},
]

const KeyCap: React.FC<{label: string; down: number}> = ({label, down}) => (
  <div
    style={{
      minWidth: 92,
      height: 92,
      padding: '0 22px',
      borderRadius: 16,
      display: 'grid',
      placeItems: 'center',
      fontFamily: theme.font.sans,
      fontSize: 40,
      fontWeight: 600,
      color: down > 0.5 ? theme.onBrand : theme.text,
      background: down > 0.5 ? theme.text : theme.panel,
      border: `1px solid ${theme.line}`,
      boxShadow:
        down > 0.5
          ? 'inset 0 2px 6px rgba(0,0,0,0.4)'
          : '0 6px 0 -1px rgba(22,22,26,0.14), 0 10px 22px -10px rgba(22,22,26,0.5)',
      transform: `translateY(${down * 5}px)`,
    }}
  >
    {label}
  </div>
)

export const SceneShortcuts: React.FC = () => {
  const acknowledged = useAfter(2.05)
  const iconPulse = usePulse(2.05, 0.6)
  const toast = useEnter(2.3, {damping: 20, stiffness: 210})

  return (
    <BrowserBed>
      <AbsoluteFill>
        {/* The extension icon pulses when the shortcut fires */}
        <div
          style={{
            position: 'absolute',
            left: ICON.x - 26,
            top: ICON.y - 26,
            width: 52,
            height: 52,
            borderRadius: 12,
            border: `2px solid ${theme.text}`,
            opacity: iconPulse * 0.8,
            transform: `scale(${1 + iconPulse * 0.5})`,
          }}
        />

        {/* Confirmation, sliding in from under the toolbar icon */}
        {acknowledged ? (
          <div
            style={{
              position: 'absolute',
              right: 96,
              top: ICON.y + 26,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '13px 18px',
              borderRadius: 12,
              background: theme.text,
              color: theme.onBrand,
              fontFamily: theme.font.sans,
              fontSize: 16,
              fontWeight: 600,
              boxShadow: theme.shadow.lift,
              opacity: Math.min(1, toast * 2),
              transform: `translateY(${(1 - toast) * -10}px)`,
            }}
          >
            <span style={{fontSize: 18}}>✓</span> Copied 14 URLs to clipboard
          </div>
        ) : null}

        {/* The keycaps, pressed in sequence, centred low on the page */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 120,
            display: 'flex',
            gap: 16,
            justifyContent: 'center',
          }}
        >
          {KEYS.map((k) => (
            <Cap key={k.label} label={k.label} t={k.t} />
          ))}
        </div>

        {/* The caption tying it together */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 72,
            textAlign: 'center',
            fontFamily: theme.font.mono,
            fontSize: 15,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: theme.dim,
          }}
        >
          Copy every tab — from anywhere
        </div>
      </AbsoluteFill>
    </BrowserBed>
  )
}

// Each cap presses at its time and holds. Split out so each can call the hook.
const Cap: React.FC<{label: string; t: number}> = ({label, t}) => {
  const down = useEnter(t, {damping: 18, stiffness: 320})
  const released = useAfter(3.4)
  return <KeyCap label={label} down={released ? 0 : down} />
}
