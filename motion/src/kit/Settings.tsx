import React from 'react'
import {Mark} from './Chrome'
import {theme} from './theme'

// The options page, traced from extension/options.html: a single scrolling card
// of setting rows — default action, default format, custom template, delimiter,
// appearance, behaviour, and the storage health panel. Monochrome throughout.
// Dynamic bits (toggles, the storage state, the pressed control) come in as
// props so both the options and storage scenes can drive the same surface.

export type StorageState = 'idle' | 'checking' | 'ok' | 'repairing' | 'repaired'

type SettingsProps = {
  width?: number
  darkOn?: boolean
  autoCopyOn?: boolean
  allWindowsOn?: boolean
  storage?: StorageState
  hot?: 'dark' | 'auto' | 'windows' | 'check' | 'repair'
}

const Toggle: React.FC<{on?: boolean; hot?: boolean}> = ({on, hot}) => (
  <div
    style={{
      width: 44,
      height: 26,
      borderRadius: 999,
      background: on ? theme.text : theme.panelSunk2,
      border: `1px solid ${on ? theme.text : theme.line}`,
      position: 'relative',
      transition: 'none',
      transform: hot ? 'scale(0.95)' : 'none',
      flexShrink: 0,
    }}
  >
    <div
      style={{
        position: 'absolute',
        top: 2,
        left: on ? 20 : 2,
        width: 20,
        height: 20,
        borderRadius: 999,
        background: theme.panel,
        boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
      }}
    />
  </div>
)

const Row: React.FC<{
  label: string
  hint?: string
  children: React.ReactNode
  top?: boolean
}> = ({label, hint, children, top}) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 20,
      padding: '18px 0',
      borderTop: top ? 'none' : `1px solid ${theme.line}`,
    }}
  >
    <div style={{minWidth: 0}}>
      <div style={{fontSize: 15, fontWeight: 600, color: theme.text}}>{label}</div>
      {hint ? <div style={{fontSize: 13, color: theme.dim, marginTop: 3}}>{hint}</div> : null}
    </div>
    <div style={{flexShrink: 0}}>{children}</div>
  </div>
)

const Field: React.FC<{value: string; mono?: boolean; w?: number}> = ({value, mono, w = 180}) => (
  <div
    style={{
      width: w,
      padding: '9px 12px',
      borderRadius: theme.radius.md,
      border: `1px solid ${theme.line}`,
      background: theme.panel,
      fontFamily: mono ? theme.font.mono : theme.font.sans,
      fontSize: 13,
      color: theme.text,
      textAlign: 'left',
    }}
  >
    {value}
  </div>
)

const Segmented: React.FC<{options: string[]; active: number}> = ({options, active}) => (
  <div style={{display: 'flex', gap: 4, padding: 4, borderRadius: theme.radius.md, background: theme.panelSunk}}>
    {options.map((o, i) => (
      <div
        key={o}
        style={{
          padding: '6px 14px',
          borderRadius: 8,
          fontSize: 13,
          fontWeight: 600,
          color: i === active ? theme.onBrand : theme.textSoft,
          background: i === active ? theme.text : 'transparent',
        }}
      >
        {o}
      </div>
    ))}
  </div>
)

const StatusPill: React.FC<{label: string; ok?: boolean; muted?: boolean}> = ({label, ok, muted}) => (
  <div
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 7,
      padding: '7px 12px',
      borderRadius: 999,
      background: theme.panelSunk,
      fontSize: 13,
      fontWeight: 600,
      color: muted ? theme.dim2 : theme.text,
    }}
  >
    <span
      style={{
        width: 15,
        height: 15,
        borderRadius: 999,
        display: 'grid',
        placeItems: 'center',
        background: ok ? theme.text : 'transparent',
        border: ok ? 'none' : `1.5px solid ${theme.dim2}`,
        color: theme.panel,
        fontSize: 10,
        fontWeight: 800,
      }}
    >
      {ok ? '✓' : ''}
    </span>
    {label}
  </div>
)

const Btn: React.FC<{label: string; primary?: boolean; hot?: boolean; busy?: boolean}> = ({
  label,
  primary,
  hot,
  busy,
}) => (
  <div
    style={{
      padding: '9px 16px',
      borderRadius: theme.radius.md,
      fontSize: 13,
      fontWeight: 600,
      background: primary ? theme.text : theme.panel,
      color: primary ? theme.onBrand : theme.text,
      border: primary ? 'none' : `1px solid ${theme.line}`,
      transform: hot ? 'scale(0.96)' : 'none',
      opacity: busy ? 0.6 : 1,
    }}
  >
    {busy ? `${label}…` : label}
  </div>
)

export const Settings: React.FC<SettingsProps> = ({
  width = 660,
  darkOn,
  autoCopyOn = true,
  allWindowsOn,
  storage = 'idle',
  hot,
}) => {
  const checked = storage === 'ok' || storage === 'repairing' || storage === 'repaired'
  const localOk = storage === 'repaired' || storage === 'ok'
  const localBad = storage === 'ok' // pretend local drifted until repaired
  return (
    <div
      style={{
        width,
        background: theme.panel,
        borderRadius: theme.radius.panel,
        border: `1px solid ${theme.line}`,
        boxShadow: theme.shadow.pop,
        fontFamily: theme.font.sans,
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div style={{display: 'flex', alignItems: 'center', gap: 12, padding: '22px 28px', borderBottom: `1px solid ${theme.line}`}}>
        <Mark size={26} color={theme.text} />
        <div style={{fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em', color: theme.text}}>Umbrella — Settings</div>
      </div>

      <div style={{padding: '4px 28px 24px'}}>
        <SectionLabel>General</SectionLabel>
        <Row label="Default action" hint="What the popup does first" top>
          <Segmented options={['Copy', 'Paste']} active={0} />
        </Row>
        <Row label="Default format" hint="How copied tabs are written">
          <Field value="URL Only  ▾" w={150} />
        </Row>
        <Row label="Custom template" hint="Variables: $url, $title, $date">
          <Field value="$url — $title" mono w={200} />
        </Row>
        <Row label="Delimiter" hint="Separates fields in delimited mode">
          <Field value="--" mono w={90} />
        </Row>

        <SectionLabel>Behaviour</SectionLabel>
        <Row label="Auto-copy on popup open" hint="Copy every tab the moment the popup appears" top>
          <Toggle on={autoCopyOn} hot={hot === 'auto'} />
        </Row>
        <Row label="Include all windows" hint="Take in every open window, not just this one">
          <Toggle on={allWindowsOn} hot={hot === 'windows'} />
        </Row>
        <Row label="Dark mode" hint="Follow the system, or force dark">
          <Toggle on={darkOn} hot={hot === 'dark'} />
        </Row>

        <SectionLabel>Storage</SectionLabel>
        <div style={{padding: '18px 0 4px', borderTop: `1px solid ${theme.line}`}}>
          <div style={{fontSize: 15, fontWeight: 600, color: theme.text}}>Storage health</div>
          <div style={{fontSize: 13, color: theme.dim, marginTop: 3, marginBottom: 14}}>
            Settings sync across your machines, with a local fallback.
          </div>
          <div style={{display: 'flex', gap: 10, marginBottom: 16, minHeight: 30}}>
            {checked ? (
              <>
                <StatusPill label="Sync" ok />
                <StatusPill label={localOk ? 'Local' : 'Local — needs repair'} ok={localOk} muted={localBad} />
              </>
            ) : (
              <div style={{fontSize: 13, color: theme.dim2, alignSelf: 'center'}}>
                {storage === 'checking' ? 'Checking…' : 'Not checked yet'}
              </div>
            )}
          </div>
          <div style={{display: 'flex', gap: 10}}>
            <Btn label="Check storage health" hot={hot === 'check'} busy={storage === 'checking'} />
            <Btn label="Repair storage" primary hot={hot === 'repair'} busy={storage === 'repairing'} />
          </div>
        </div>
      </div>
    </div>
  )
}

const SectionLabel: React.FC<{children: React.ReactNode}> = ({children}) => (
  <div
    style={{
      fontFamily: theme.font.mono,
      fontSize: 11,
      letterSpacing: '0.14em',
      textTransform: 'uppercase',
      color: theme.dim2,
      marginTop: 22,
      marginBottom: 2,
    }}
  >
    {children}
  </div>
)
