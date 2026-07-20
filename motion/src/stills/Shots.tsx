import React from 'react'
import {BrowserFrame, Mark} from '../kit/Chrome'
import {jsonBody, TABS, urlOnlyText} from '../kit/data'
import {Popup} from '../kit/Popup'
import {Eyebrow, Rain} from '../kit/press'
import {theme} from '../kit/theme'
import {PageBackdrop} from './Marquee'

// The five Chrome Web Store screenshots (1280×800). Each is a captioned plate in
// the broadsheet: a mono ruled eyebrow and a Newsreader headline up top, the
// weather behind them, and the product — real browser, real popup — staged
// below. They share one layout so the set reads as one publication.

const Shot: React.FC<{
  eyebrow: string
  title: React.ReactNode
  children: React.ReactNode
}> = ({eyebrow, title, children}) => (
  <div style={{width: '100%', height: '100%', position: 'relative', overflow: 'hidden', background: theme.bg, fontFamily: theme.font.sans}}>
    <Rain opacity={0.34} focus="120% 78% at 50% 30%" />
    <div style={{position: 'absolute', inset: 0, background: theme.noise, opacity: 0.5, mixBlendMode: 'multiply'}} />

    {/* Caption */}
    <div style={{position: 'absolute', top: 60, left: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16}}>
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2
        style={{
          margin: 0,
          fontFamily: theme.font.serif,
          fontSize: 46,
          fontWeight: 480,
          letterSpacing: '-0.025em',
          color: theme.text,
          textAlign: 'center',
          maxWidth: 960,
          lineHeight: 1.04,
        }}
      >
        {title}
      </h2>
    </div>

    {/* Stage */}
    <div style={{position: 'absolute', top: 236, left: 0, right: 0, bottom: 0}}>{children}</div>
  </div>
)

/** The browser, sized and centred for a screenshot, with an optional popup and
 *  overlay. Bleeds off the bottom, which reads as "a real, taller window". */
const Stage: React.FC<{popup?: React.ReactNode; overlay?: React.ReactNode; url?: string}> = ({
  popup,
  overlay,
  url = 'github.com/Flozad/copy-all-urls-extension',
}) => (
  <div style={{position: 'absolute', left: 100, top: 0, width: 1080, height: 640}}>
    <BrowserFrame url={url} tabs={TABS} style={{width: 1080, height: 640}}>
      <PageBackdrop />
    </BrowserFrame>
    {overlay}
    {popup ? (
      <div style={{position: 'absolute', top: 84, right: 24, transform: 'scale(0.84)', transformOrigin: 'top right'}}>{popup}</div>
    ) : null}
  </div>
)

const Em: React.FC<{children: React.ReactNode}> = ({children}) => (
  <span style={{fontStyle: 'italic', color: theme.textSoft}}>{children}</span>
)

export const Shot01: React.FC = () => (
  <Shot eyebrow="One Click" title={<>Copy every open tab, <Em>all at once</Em></>}>
    <Stage
      popup={<Popup width={396} format="url_only" content={urlOnlyText(5)} message={{text: '✓ Copied 14 URLs to clipboard', kind: 'ok'}} />}
    />
  </Shot>
)

export const Shot02: React.FC = () => (
  <Shot eyebrow="Six Formats" title={<>Text, HTML, JSON — <Em>or your own</Em></>}>
    <Stage
      popup={
        <Popup width={396} format="json" content={jsonBody(4)} dropdownOpen dropdownProgress={1} formatHot="json" />
      }
    />
  </Shot>
)

export const Shot03: React.FC = () => (
  <Shot eyebrow="Restore" title={<>Paste a saved list to <Em>reopen every tab</Em></>}>
    <Stage
      popup={
        <Popup width={396} format="url_only" content={urlOnlyText(5)} source="Textarea" hot="paste" message={{text: '✓ Opened 14 tabs from your list', kind: 'ok'}} />
      }
    />
  </Shot>
)

export const Shot04: React.FC = () => (
  <Shot eyebrow="Anywhere" title={<>Keyboard shortcuts and a <Em>right-click menu</Em></>}>
    <Stage overlay={<ContextLayer />} />
  </Shot>
)

export const Shot05: React.FC = () => (
  <Shot eyebrow="Yours" title={<>Tune defaults, formats, and <Em>dark mode</Em></>}>
    <div style={{position: 'absolute', left: 0, right: 0, top: 8, display: 'flex', justifyContent: 'center'}}>
      <SettingsCard />
    </div>
  </Shot>
)

/* ── The right-click context menu + shortcut hints ───────────────────────── */

const ContextLayer: React.FC = () => (
  <>
    {/* the menu, opened over the page */}
    <div style={{position: 'absolute', left: 300, top: 210}}>
      <div
        style={{
          width: 244,
          background: theme.panel,
          borderRadius: theme.radius.md,
          border: `1px solid ${theme.line}`,
          boxShadow: theme.shadow.pop,
          padding: '6px 0',
          fontSize: 13.5,
          color: theme.textSoft,
        }}
      >
        {['Back', 'Forward', 'Reload'].map((l) => (
          <MenuItem key={l} label={l} />
        ))}
        <Divider />
        <MenuItem label="Copy all URLs" brand mark accel="⌘⇧U" />
        <MenuItem label="Paste URLs to open tabs" brand mark accel="⌘⇧Y" />
        <Divider />
        {['Save as…', 'Print…', 'Inspect'].map((l) => (
          <MenuItem key={l} label={l} />
        ))}
      </div>
    </div>

    {/* the shortcut hint card, lower-right */}
    <div
      style={{
        position: 'absolute',
        right: 40,
        bottom: 150,
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        padding: '18px 22px',
        background: theme.panel,
        borderRadius: theme.radius.lg,
        border: `1px solid ${theme.line}`,
        boxShadow: theme.shadow.pop,
      }}
    >
      <ShortcutRow keys={['⌘', '⇧', 'U']} label="Copy all tabs" />
      <ShortcutRow keys={['⌘', '⇧', 'Y']} label="Paste to reopen" />
    </div>
  </>
)

const MenuItem: React.FC<{label: string; brand?: boolean; mark?: boolean; accel?: string}> = ({label, brand, mark, accel}) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '7px 14px',
      background: brand ? theme.brandSofter : 'transparent',
      color: brand ? theme.text : theme.textSoft,
      fontWeight: brand ? 600 : 400,
    }}
  >
    <span style={{width: 16, display: 'grid', placeItems: 'center'}}>{mark ? <Mark size={14} color={theme.brand} /> : null}</span>
    <span style={{flex: 1}}>{label}</span>
    {accel ? <span style={{fontSize: 11.5, color: theme.dim2, fontFamily: theme.font.mono}}>{accel}</span> : null}
  </div>
)

const Divider: React.FC = () => <div style={{height: 1, background: theme.line, margin: '6px 0'}} />

const ShortcutRow: React.FC<{keys: string[]; label: string}> = ({keys, label}) => (
  <div style={{display: 'flex', alignItems: 'center', gap: 12}}>
    <div style={{display: 'flex', gap: 5}}>
      {keys.map((k) => (
        <span
          key={k}
          style={{
            minWidth: 26,
            height: 28,
            padding: '0 7px',
            display: 'grid',
            placeItems: 'center',
            borderRadius: 7,
            background: theme.panelSunk,
            border: `1px solid ${theme.line}`,
            boxShadow: '0 1px 0 rgba(15,15,15,0.10)',
            fontSize: 14,
            fontWeight: 600,
            color: theme.text,
          }}
        >
          {k}
        </span>
      ))}
    </div>
    <span style={{fontSize: 14, color: theme.textSoft, fontWeight: 500}}>{label}</span>
  </div>
)

/* ── The settings card ───────────────────────────────────────────────────── */

const SettingsCard: React.FC = () => (
  <div
    style={{
      width: 720,
      background: theme.panel,
      borderRadius: theme.radius.xl,
      border: `1px solid ${theme.line}`,
      boxShadow: theme.shadow.lift,
      overflow: 'hidden',
      fontFamily: theme.font.sans,
    }}
  >
    <div style={{display: 'flex', alignItems: 'center', gap: 10, padding: '18px 24px', borderBottom: `1px solid ${theme.line}`}}>
      <Mark size={22} color={theme.text} />
      <strong style={{fontSize: 17, letterSpacing: '-0.01em'}}>Settings</strong>
      <span style={{marginLeft: 8, fontSize: 13, color: theme.dim}}>Copy All URLs</span>
    </div>

    <div style={{padding: 24, display: 'flex', flexDirection: 'column', gap: 20}}>
      <SettingsBlock title="Output Format">
        <div style={{display: 'flex', gap: 8, flexWrap: 'wrap'}}>
          {['URL Only', 'Text', 'HTML', 'JSON', 'Delimited', 'Custom'].map((f, i) => (
            <span
              key={f}
              style={{
                padding: '7px 14px',
                borderRadius: theme.radius.pill,
                fontSize: 13,
                fontWeight: 600,
                background: i === 0 ? theme.brand : theme.panelSunk,
                color: i === 0 ? theme.onBrand : theme.textSoft,
                border: i === 0 ? 'none' : `1px solid ${theme.line}`,
              }}
            >
              {f}
            </span>
          ))}
        </div>
      </SettingsBlock>

      <SettingsBlock title="General">
        <Toggle label="Include every open Chrome window" on />
        <Toggle label="Add Copy / Paste to the right-click menu" on />
        <Toggle label="Auto-copy when the popup opens" />
        <Toggle label="Only copy highlighted tabs" />
      </SettingsBlock>

      <div style={{display: 'flex', gap: 20}}>
        <SettingsBlock title="Theme" flex>
          <div style={{display: 'flex', gap: 8}}>
            {['Auto', 'Light', 'Dark'].map((t, i) => (
              <span
                key={t}
                style={{
                  flex: 1,
                  textAlign: 'center',
                  padding: '9px 0',
                  borderRadius: theme.radius.md,
                  fontSize: 13,
                  fontWeight: 600,
                  background: i === 2 ? theme.text : theme.panelSunk,
                  color: i === 2 ? theme.panel : theme.textSoft,
                  border: `1px solid ${i === 2 ? theme.text : theme.line}`,
                }}
              >
                {t}
              </span>
            ))}
          </div>
        </SettingsBlock>

        <SettingsBlock title="Shortcuts" flex>
          <div style={{display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13, color: theme.textSoft}}>
            <div style={{display: 'flex', justifyContent: 'space-between'}}>
              <span>Copy</span>
              <span style={{fontFamily: theme.font.mono, color: theme.text}}>⌘⇧U</span>
            </div>
            <div style={{display: 'flex', justifyContent: 'space-between'}}>
              <span>Paste</span>
              <span style={{fontFamily: theme.font.mono, color: theme.text}}>⌘⇧Y</span>
            </div>
          </div>
        </SettingsBlock>
      </div>
    </div>
  </div>
)

const SettingsBlock: React.FC<{title: string; children: React.ReactNode; flex?: boolean}> = ({title, children, flex}) => (
  <div style={{flex: flex ? 1 : undefined}}>
    <div style={{fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: theme.dim2, marginBottom: 12}}>{title}</div>
    <div style={{display: 'flex', flexDirection: 'column', gap: 12}}>{children}</div>
  </div>
)

const Toggle: React.FC<{label: string; on?: boolean}> = ({label, on}) => (
  <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
    <span style={{fontSize: 14, color: theme.textSoft}}>{label}</span>
    <span
      style={{
        width: 40,
        height: 23,
        borderRadius: 999,
        background: on ? theme.brand : theme.panelSunk2,
        position: 'relative',
        boxShadow: on ? 'none' : `inset 0 0 0 1px ${theme.line}`,
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: 2,
          left: on ? 19 : 2,
          width: 19,
          height: 19,
          borderRadius: 999,
          background: theme.panel,
          boxShadow: '0 1px 3px rgba(15,15,15,0.3)',
        }}
      />
    </span>
  </div>
)
