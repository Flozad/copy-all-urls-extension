import React from 'react'
import {MarkTile} from '../kit/Chrome'
import {TABS} from '../kit/data'
import {Eyebrow, Rain} from '../kit/press'
import {theme} from '../kit/theme'

// The 440×280 small promo tile — a tight broadsheet card. Too small for a
// browser mock, so it's a nameplate: the mono eyebrow, the ink signing tile, a
// serif wordmark, one line, and a compact row of tab ticks collapsing into a
// single clipboard — the whole product in one glance, in ink.

export const Promo: React.FC = () => (
  <div
    style={{
      width: '100%',
      height: '100%',
      position: 'relative',
      overflow: 'hidden',
      background: theme.bg,
      fontFamily: theme.font.sans,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      padding: '0 32px',
      boxSizing: 'border-box',
    }}
  >
    <Rain opacity={0.32} focus="130% 120% at 30% 40%" />
    <div style={{position: 'absolute', inset: 0, background: theme.noise, opacity: 0.5, mixBlendMode: 'multiply'}} />

    <Eyebrow style={{position: 'relative', fontSize: 10.5, marginBottom: 14}}>Copy All URLs</Eyebrow>

    <div style={{position: 'relative', display: 'flex', alignItems: 'center', gap: 13, marginBottom: 14}}>
      <MarkTile size={44} radius={12} />
      <div style={{fontFamily: theme.font.serif, fontSize: 46, fontWeight: 500, letterSpacing: '-0.035em', color: theme.text, lineHeight: 0.9}}>Umbrella</div>
    </div>

    <div style={{position: 'relative', fontSize: 16, lineHeight: 1.4, color: theme.dim, maxWidth: 350}}>
      Copy every open tab in one click. Paste it back to{' '}
      <span style={{fontFamily: theme.font.serif, fontStyle: 'italic', color: theme.text}}>reopen the session</span>.
    </div>

    {/* Tab ticks collapsing into a clipboard */}
    <div style={{position: 'relative', display: 'flex', alignItems: 'center', gap: 7, marginTop: 20}}>
      {TABS.slice(0, 5).map((t, i) => (
        <div
          key={i}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            height: 22,
            padding: '0 8px',
            borderRadius: theme.radius.pill,
            background: theme.panel,
            border: `1px solid ${theme.line}`,
            boxShadow: theme.shadow.card,
          }}
        >
          <span style={{width: 8, height: 8, borderRadius: 3, background: t.fav ?? theme.dim2}} />
          <span style={{width: 18, height: 5, borderRadius: 3, background: theme.panelSunk2}} />
        </div>
      ))}
      <span style={{fontSize: 15, color: theme.text, fontWeight: 700, margin: '0 3px'}}>→</span>
      <div
        style={{
          width: 30,
          height: 30,
          borderRadius: 9,
          display: 'grid',
          placeItems: 'center',
          background: theme.gradient,
          boxShadow: '0 6px 16px -6px rgba(15,15,15,0.5), inset 0 1px 0 rgba(255,255,255,0.14)',
        }}
      >
        <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={theme.onBrand} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <rect x="8" y="3" width="8" height="4" rx="1" />
          <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
        </svg>
      </div>
    </div>
  </div>
)
