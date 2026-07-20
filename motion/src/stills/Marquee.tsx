import React from 'react'
import {BrowserFrame, MarkTile} from '../kit/Chrome'
import {TABS, urlOnlyText} from '../kit/data'
import {Popup} from '../kit/Popup'
import {Dome, Eyebrow, MetaRow, Rain} from '../kit/press'
import {theme} from '../kit/theme'

// The 1400×560 marquee — the store's largest slot, set as the broadsheet's
// masthead. A nameplate on the left (mono eyebrow, ink signing tile, a serif
// wordmark, the lede, the mono metadata), the weather behind it (rain thinning
// under a canopy), and — bleeding off the right edge — the product in a real
// browser with a real pile of tabs and the popup open mid-copy. Ink only.

export const Marquee: React.FC = () => (
  <div style={{width: '100%', height: '100%', position: 'relative', overflow: 'hidden', background: theme.bg, fontFamily: theme.font.sans}}>
    <Rain opacity={0.42} focus="120% 120% at 26% 42%" />
    <div style={{position: 'absolute', left: 40, top: 18, zIndex: 0}}>
      <Dome width={560} opacity={0.55} />
    </div>
    <div style={{position: 'absolute', inset: 0, background: theme.noise, opacity: 0.5, mixBlendMode: 'multiply'}} />

    {/* Left nameplate */}
    <div
      style={{
        position: 'absolute',
        left: 84,
        top: 0,
        bottom: 0,
        width: 540,
        zIndex: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        gap: 20,
      }}
    >
      <Eyebrow>Copy All URLs · Chrome extension</Eyebrow>

      <div style={{display: 'flex', alignItems: 'center', gap: 18}}>
        <MarkTile size={58} radius={16} />
        <h1 style={{margin: 0, fontFamily: theme.font.serif, fontSize: 82, fontWeight: 500, letterSpacing: '-0.035em', lineHeight: 0.92, color: theme.text}}>
          Umbrella
        </h1>
      </div>

      <div style={{fontSize: 21, lineHeight: 1.44, color: theme.dim, maxWidth: 470, letterSpacing: '-0.01em'}}>
        Copy every open tab in one click. Paste the list back tomorrow and{' '}
        <span style={{fontFamily: theme.font.serif, fontStyle: 'italic', color: theme.text}}>the whole session re-opens</span>.
      </div>

      <MetaRow items={['No account', 'No server', 'Open source']} style={{marginTop: 6}} />
    </div>

    {/* Right: a real browser full of tabs, bleeding off the right edge… */}
    <div style={{position: 'absolute', left: 606, top: 70, width: 960, height: 560, zIndex: 1}}>
      <BrowserFrame url="github.com/Flozad/copy-all-urls-extension" tabs={TABS} style={{width: 960, height: 520}}>
        <PageBackdrop />
      </BrowserFrame>
    </div>

    {/* …and the popup floated fully in frame, the subject of the shot. */}
    <div style={{position: 'absolute', right: 46, top: 52, zIndex: 2}}>
      <Popup
        width={384}
        format="url_only"
        content={urlOnlyText(6)}
        message={{text: '✓ Copied 14 URLs to clipboard', kind: 'ok'}}
        style={{transform: 'scale(0.92)', transformOrigin: 'top right'}}
      />
    </div>
  </div>
)

/** A quiet, believable page behind the browser chrome — a repo-ish view in
 *  newsprint greys, deliberately low-contrast so the popup stays the subject. */
export const PageBackdrop: React.FC = () => (
  <div style={{width: '100%', height: '100%', background: theme.panel, padding: '26px 34px', boxSizing: 'border-box'}}>
    <div style={{display: 'flex', alignItems: 'center', gap: 12, marginBottom: 22}}>
      <div style={{width: 30, height: 30, borderRadius: 999, background: theme.panelSunk2}} />
      <div style={{width: 220, height: 13, borderRadius: 4, background: theme.panelSunk2}} />
      <div style={{flex: 1}} />
      <div style={{width: 92, height: 30, borderRadius: 8, background: theme.panelSunk}} />
      <div style={{width: 72, height: 30, borderRadius: 8, background: theme.panelSunk}} />
    </div>
    <div style={{display: 'flex', gap: 26}}>
      <div style={{flex: 1, display: 'flex', flexDirection: 'column', gap: 13}}>
        {[100, 86, 92, 70, 96, 62, 88, 78].map((w, i) => (
          <div key={i} style={{display: 'flex', alignItems: 'center', gap: 12}}>
            <div style={{width: 15, height: 15, borderRadius: 4, background: theme.panelSunk2}} />
            <div style={{width: `${w}%`, height: 10, borderRadius: 4, background: i % 3 === 0 ? theme.panelSunk2 : theme.panelSunk}} />
          </div>
        ))}
      </div>
      <div style={{width: 220, display: 'flex', flexDirection: 'column', gap: 12}}>
        <div style={{height: 15, width: 120, borderRadius: 4, background: theme.panelSunk2}} />
        {[100, 82, 90].map((w, i) => (
          <div key={i} style={{height: 8, width: `${w}%`, borderRadius: 4, background: theme.panelSunk}} />
        ))}
      </div>
    </div>
  </div>
)
