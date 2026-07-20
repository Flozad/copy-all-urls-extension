import React from 'react'
import {Mark} from './Chrome'
import {theme} from './theme'

// The extension's action popup, traced from extension/popup.html so the demo
// shows the product a real user will meet — the split Copy button, the format
// menu, the paste/settings row, the chips, the auto-copy toggle, the footer.
// Strict monochrome: the buttons ship black and stay black (white in dark mode,
// exactly as the product inverts them). A palette object `P` drives light/dark
// so every surface swaps from one switch.

export const FORMATS = [
  {id: 'text', label: 'Text (URL + Title)'},
  {id: 'html', label: 'HTML'},
  {id: 'json', label: 'JSON'},
  {id: 'url_only', label: 'URL Only'},
  {id: 'delimited', label: 'Delimited'},
  {id: 'custom', label: 'Custom'},
] as const

export type FormatId = (typeof FORMATS)[number]['id']

const formatLabel = (id: FormatId) => FORMATS.find((f) => f.id === id)?.label ?? 'URL Only'

type Palette = {
  surface: string
  sunk: string
  sunk2: string
  text: string
  textSoft: string
  dim: string
  dim2: string
  line: string
  accentSoft: string
  btnBg: string
  btnText: string
  okText: string
  okBg: string
  shadow: string
  fieldBg: string
}

const LIGHT: Palette = {
  surface: theme.panel,
  sunk: theme.panelSunk,
  sunk2: theme.panelSunk2,
  text: theme.text,
  textSoft: theme.textSoft,
  dim: theme.dim,
  dim2: theme.dim2,
  line: theme.line,
  accentSoft: theme.brandSoft,
  // The product's black slab, with a soft top glint.
  btnBg: 'linear-gradient(180deg, #2c2c31, #16161a 60%, #000000)',
  btnText: '#ffffff',
  okText: theme.text,
  okBg: 'rgba(22,22,26,0.07)',
  shadow: theme.shadow.popup,
  fieldBg: theme.panel,
}

// The real dark theme (extension/popup.html body.theme-dark): near-black paper,
// grey surfaces, and — the tell — bg-black buttons inverted to white on ink.
const DARK: Palette = {
  surface: '#1f1f22',
  sunk: '#323238',
  sunk2: '#3b3b42',
  text: '#ededf0',
  textSoft: '#c8c8cf',
  dim: 'rgba(237,237,240,0.60)',
  dim2: 'rgba(237,237,240,0.32)',
  line: 'rgba(255,255,255,0.12)',
  accentSoft: 'rgba(255,255,255,0.14)',
  btnBg: 'linear-gradient(180deg, #ffffff, #ededf0 60%, #dcdce0)',
  btnText: '#161618',
  okText: '#ededf0',
  okBg: 'rgba(255,255,255,0.10)',
  shadow: '0 18px 48px -12px rgba(0,0,0,0.6), 0 4px 12px -6px rgba(0,0,0,0.5)',
  fieldBg: '#26262a',
}

export type PopupState = {
  format?: FormatId
  /** The textarea body. Pass a growing slice to stream it in. */
  content?: string
  caret?: boolean
  /** Which control is pressed right now. */
  hot?: 'copy' | 'copyCaret' | 'paste' | 'settings' | 'scopeAll' | 'scopeWin'
  /** The format dropdown, and its 0..1 entrance. */
  dropdownOpen?: boolean
  dropdownProgress?: number
  /** The format row the cursor is over inside the open dropdown. */
  formatHot?: FormatId
  source?: 'Clipboard' | 'Textarea'
  autoCopy?: boolean
  /** Optional scope segmented control (This window / All windows) + which is on. */
  scope?: 'window' | 'all'
  /** The status line under the toggle. */
  message?: {text: string; kind?: 'ok' | 'err'}
  /** Dark theme — the product's own inverted palette. */
  dark?: boolean
  /** Overall popup width. The product is 420; scenes scale via transform. */
  width?: number
  style?: React.CSSProperties
}

export const Popup: React.FC<PopupState> = ({
  format = 'url_only',
  content = '',
  caret,
  hot,
  dropdownOpen,
  dropdownProgress = 1,
  formatHot,
  source = 'Clipboard',
  autoCopy,
  scope,
  message,
  dark,
  width = 420,
  style,
}) => {
  const P = dark ? DARK : LIGHT
  const btn = (radius: number | string) =>
    ({
      background: P.btnBg,
      color: P.btnText,
      borderRadius: radius,
      boxShadow: dark
        ? '0 1px 2px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.5)'
        : '0 1px 2px rgba(15,15,15,0.24), 0 8px 20px -10px rgba(15,15,15,0.45), inset 0 1px 0 rgba(255,255,255,0.16)',
    }) as const

  return (
    <div
      style={{
        width,
        background: P.surface,
        borderRadius: theme.radius.xl,
        boxShadow: P.shadow,
        border: `1px solid ${P.line}`,
        fontFamily: theme.font.sans,
        color: P.text,
        overflow: 'hidden',
        ...style,
      }}
    >
      <div style={{padding: 24}}>
        {/* Header */}
        <div style={{textAlign: 'center', marginBottom: 16}}>
          <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 6}}>
            <Mark size={28} color={P.text} crease={P.surface} />
            <span style={{fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em'}}>Copy All URLs</span>
          </div>
          <div style={{fontSize: 13, color: P.dim}}>Copy all open tabs or paste links to open them instantly.</div>
        </div>

        {/* Optional scope segmented control */}
        {scope ? (
          <div
            style={{
              display: 'flex',
              gap: 4,
              padding: 4,
              marginBottom: 14,
              borderRadius: theme.radius.lg,
              background: P.sunk,
            }}
          >
            <ScopeTab label="This window" on={scope === 'window'} hot={hot === 'scopeWin'} P={P} />
            <ScopeTab label="All windows" on={scope === 'all'} hot={hot === 'scopeAll'} P={P} />
          </div>
        ) : null}

        {/* Action row */}
        <div style={{position: 'relative', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14}}>
          <div style={{position: 'relative', flex: 1}}>
            <div style={{display: 'flex'}}>
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '13px 16px',
                  fontSize: 14,
                  fontWeight: 600,
                  ...btn('10px 0 0 10px'),
                  transform: hot === 'copy' ? 'scale(0.97)' : 'none',
                  transformOrigin: 'center',
                }}
              >
                Copy URLs
              </div>
              <div
                style={{
                  display: 'grid',
                  placeItems: 'center',
                  padding: '0 12px',
                  ...btn('0 10px 10px 0'),
                  borderLeft: `1px solid ${dark ? 'rgba(22,22,26,0.15)' : 'rgba(255,255,255,0.22)'}`,
                  transform: hot === 'copyCaret' ? 'scale(0.97)' : 'none',
                }}
              >
                <Chevron color={P.btnText} />
              </div>
            </div>

            {dropdownOpen ? (
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  top: '100%',
                  marginTop: 6,
                  background: P.surface,
                  border: `1px solid ${P.line}`,
                  borderRadius: theme.radius.lg,
                  boxShadow: P.shadow,
                  overflow: 'hidden',
                  zIndex: 10,
                  opacity: Math.min(1, dropdownProgress * 2),
                  transform: `translateY(${(1 - dropdownProgress) * -8}px) scale(${0.97 + dropdownProgress * 0.03})`,
                  transformOrigin: 'top center',
                }}
              >
                {FORMATS.map((f) => {
                  const on = f.id === format
                  const over = f.id === formatHot
                  return (
                    <div
                      key={f.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '9px 14px',
                        fontSize: 13,
                        color: P.textSoft,
                        background: over ? P.sunk : 'transparent',
                      }}
                    >
                      <span style={{width: 14, color: P.text, fontWeight: 700}}>{on ? '✓' : ''}</span>
                      {f.label}
                    </div>
                  )
                })}
              </div>
            ) : null}
          </div>

          {/* Paste button */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '13px 16px',
              fontSize: 14,
              fontWeight: 600,
              ...btn(theme.radius.lg),
              transform: hot === 'paste' ? 'scale(0.97)' : 'none',
            }}
          >
            Paste URLs
          </div>

          {/* Settings */}
          <div
            style={{
              width: 44,
              height: 44,
              display: 'grid',
              placeItems: 'center',
              borderRadius: theme.radius.lg,
              background: P.sunk,
              color: P.textSoft,
              transform: hot === 'settings' ? 'scale(0.94)' : 'none',
            }}
          >
            <Gear />
          </div>
        </div>

        {/* Textarea */}
        <div
          style={{
            border: `2px solid ${caret ? P.text : P.line}`,
            borderRadius: theme.radius.lg,
            padding: '12px 12px',
            minHeight: 176,
            background: P.fieldBg,
            boxShadow: caret ? `0 0 0 3px ${P.accentSoft}` : 'none',
            marginBottom: 12,
          }}
        >
          {content ? (
            <pre
              style={{
                margin: 0,
                fontFamily: theme.font.mono,
                fontSize: 12.5,
                lineHeight: 1.55,
                color: P.text,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
              }}
            >
              {content}
              {caret ? <span style={{color: P.text}}>▏</span> : null}
            </pre>
          ) : (
            <div style={{fontFamily: theme.font.mono, fontSize: 12.5, color: P.dim2, lineHeight: 1.55}}>
              Copied URLs will appear here. You can also paste URLs to open them…
            </div>
          )}
        </div>

        {/* Format + source chips */}
        <div style={{display: 'flex', gap: 8, marginBottom: 14}}>
          <Chip label={`Format: ${formatLabel(format)}`} P={P} />
          <Chip label={`Paste: ${source}`} P={P} />
        </div>

        {/* Auto-copy toggle */}
        <label style={{display: 'flex', alignItems: 'center', gap: 8, marginBottom: message ? 14 : 4}}>
          <span
            style={{
              width: 16,
              height: 16,
              borderRadius: 4,
              display: 'grid',
              placeItems: 'center',
              background: autoCopy ? P.text : P.surface,
              border: `1.5px solid ${autoCopy ? P.text : P.dim2}`,
              color: P.surface,
              fontSize: 11,
              fontWeight: 800,
            }}
          >
            {autoCopy ? '✓' : ''}
          </span>
          <span style={{fontSize: 13, color: P.textSoft}}>Auto-copy on popup open</span>
        </label>

        {/* Message / toast */}
        {message ? (
          <div
            style={{
              textAlign: 'center',
              padding: '11px 14px',
              borderRadius: theme.radius.lg,
              fontSize: 13,
              fontWeight: 600,
              color: P.okText,
              background: P.okBg,
            }}
          >
            {message.text}
          </div>
        ) : null}

        {/* Footer */}
        <div
          style={{
            marginTop: 14,
            paddingTop: 12,
            borderTop: `1px solid ${P.line}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            fontSize: 12,
            color: P.dim,
          }}
        >
          {['GitHub', 'My site', 'Twitter', 'Feedback'].map((l, i) => (
            <React.Fragment key={l}>
              {i > 0 ? <span style={{color: P.dim2}}>|</span> : null}
              <span>{l}</span>
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  )
}

const ScopeTab: React.FC<{label: string; on: boolean; hot?: boolean; P: Palette}> = ({label, on, hot, P}) => (
  <div
    style={{
      flex: 1,
      textAlign: 'center',
      padding: '7px 0',
      borderRadius: theme.radius.md,
      fontSize: 12.5,
      fontWeight: 600,
      color: on ? P.btnText : P.textSoft,
      background: on ? P.btnBg : 'transparent',
      boxShadow: on ? P.shadow : 'none',
      transform: hot ? 'scale(0.97)' : 'none',
    }}
  >
    {label}
  </div>
)

const Chip: React.FC<{label: string; P: Palette}> = ({label, P}) => (
  <div
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      padding: '7px 12px',
      borderRadius: theme.radius.lg,
      background: P.sunk,
      fontSize: 12,
      fontWeight: 500,
      color: P.textSoft,
    }}
  >
    {label}
    <Chevron size={11} color={P.dim} />
  </div>
)

const Chevron: React.FC<{size?: number; color?: string}> = ({size = 15, color = '#ffffff'}) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill={color} style={{flexShrink: 0}}>
    <path
      fillRule="evenodd"
      d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
      clipRule="evenodd"
    />
  </svg>
)

const Gear: React.FC = () => (
  <svg width={20} height={20} viewBox="0 0 20 20" fill="currentColor">
    <path
      fillRule="evenodd"
      d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z"
      clipRule="evenodd"
    />
  </svg>
)
