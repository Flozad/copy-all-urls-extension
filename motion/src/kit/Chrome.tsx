import React from 'react'
import {interpolate, useCurrentFrame, useVideoConfig} from 'remotion'
import {theme} from './theme'

/**
 * The Umbrella mark — the real brand drawing (umbrella-docs/components/mark): a
 * scalloped canopy over a pole and J-hook, built from primitives so it holds at
 * favicon size. Monochrome by construction — it paints in `color`, and the rib
 * creases are cut in the surface behind it (pass `crease` to match the plate the
 * mark sits on: paper by default, on-ink when reversed out of an ink tile).
 */
export const Mark: React.FC<{size?: number; color?: string; crease?: string}> = ({
  size = 22,
  color = theme.text,
  crease = theme.panel,
}) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" style={{flexShrink: 0}}>
    <circle cx="16" cy="2.7" r="0.95" fill={color} />
    <path
      d="M3 16.4 A13 13 0 0 1 29 16.4 Q 25.75 19 22.5 16.4 Q 19.25 19 16 16.4 Q 12.75 19 9.5 16.4 Q 6.25 19 3 16.4 Z"
      fill={color}
    />
    <path
      d="M16 3.4 V 16.4 M9.6 6 Q 12 12 12.6 16.4 M22.4 6 Q 20 12 19.4 16.4"
      stroke={crease}
      strokeWidth="0.9"
      strokeLinecap="round"
      opacity="0.5"
    />
    <path
      d="M16 3.2 V 25.2 a 2.7 2.7 0 0 1 -5.4 0"
      stroke={color}
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

/**
 * The signing lockup — the mark reversed out of an ink tile, for the marquee and
 * promo. Warm-black slab, the canopy in on-ink, a soft top glint. No hue.
 */
export const MarkTile: React.FC<{size?: number; radius?: number}> = ({size = 56, radius = 15}) => (
  <div
    style={{
      width: size,
      height: size,
      borderRadius: radius,
      display: 'grid',
      placeItems: 'center',
      background: theme.gradient,
      boxShadow:
        '0 6px 18px -6px rgba(15,15,15,0.5), inset 0 1px 0 rgba(255,255,255,0.14), inset 0 -2px 6px rgba(0,0,0,0.35)',
      flexShrink: 0,
    }}
  >
    <Mark size={size * 0.6} color={theme.onBrand} crease={theme.text} />
  </div>
)

/**
 * The bed every scene sits on. Two jobs: put the clip on the product's own paper
 * so the video doesn't read as a foreign rectangle, and fade the first/last few
 * frames so a looping clip's seam is invisible. The fade goes on the CONTENT over
 * an opaque paper bed — never the root, since a video has no alpha and "faded to
 * nothing" encodes as black.
 */
export const Stage: React.FC<{children: React.ReactNode; aura?: boolean}> = ({
  children,
  aura,
}) => {
  const frame = useCurrentFrame()
  const {fps, durationInFrames} = useVideoConfig()
  const fade = 0.3 * fps

  const opacity = Math.min(
    interpolate(frame, [0, fade], [0, 1], {extrapolateRight: 'clamp'}),
    interpolate(frame, [durationInFrames - fade, durationInFrames], [1, 0], {
      extrapolateLeft: 'clamp',
    }),
  )

  return (
    <div style={{width: '100%', height: '100%', background: theme.bg, position: 'relative', overflow: 'hidden'}}>
      {aura ? <div style={{position: 'absolute', inset: 0, background: theme.aura}} /> : null}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          opacity,
          fontFamily: theme.font.sans,
          color: theme.text,
          overflow: 'hidden',
        }}
      >
        {children}
      </div>
    </div>
  )
}

export type BrowserTab = {title: string; fav?: string; active?: boolean}

/**
 * A Chrome window, and it has to actually look like one — because the whole
 * point of these clips is that this is a REAL browser full of REAL tabs. So: a
 * tab strip that can carry a dozen-plus tabs (they shrink to fit, the way Chrome
 * does), a nav row with an omnibox, and the extensions row on the right where
 * Chrome actually puts the Umbrella button — lit when the popup is open.
 *
 * The popup is passed in and floats, anchored under the extension icon.
 */
export const BrowserFrame: React.FC<{
  url: string
  tabs: BrowserTab[]
  children: React.ReactNode
  /** The popup, floated under the toolbar icon. Also lights the icon. */
  popup?: React.ReactNode
  /** Nudge the popup horizontally (px from the frame's right edge to its right). */
  popupRight?: number
  style?: React.CSSProperties
}> = ({url, tabs, children, popup, popupRight = 14, style}) => (
  <div
    style={{
      display: 'flex',
      flexDirection: 'column',
      background: theme.panel,
      borderRadius: theme.radius.xl,
      overflow: 'hidden',
      boxShadow: theme.shadow.lift,
      border: `1px solid ${theme.line}`,
      position: 'relative',
      ...style,
    }}
  >
    {/* Tab strip */}
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-end',
        gap: 1,
        padding: '9px 10px 0',
        background: '#dee1e6', // Chrome's own tab strip grey
        flexShrink: 0,
        height: 44,
        boxSizing: 'border-box',
      }}
    >
      <div style={{display: 'flex', gap: 8, alignItems: 'center', paddingBottom: 12, paddingRight: 6}}>
        {/* macOS traffic lights — greyed to hold the monochrome line */}
        {['#c9c9cc', '#b6b6b9', '#a3a3a7'].map((c) => (
          <div key={c} style={{width: 11, height: 11, borderRadius: 999, background: c}} />
        ))}
      </div>

      <div style={{display: 'flex', alignItems: 'flex-end', gap: 1, flex: 1, minWidth: 0}}>
        {tabs.map((tab, i) => (
          <Tab key={i} tab={tab} />
        ))}
      </div>

      <span style={{color: theme.dim2, fontSize: 17, paddingBottom: 9, paddingLeft: 6}}>+</span>
    </div>

    {/* Nav row */}
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '0 14px',
        height: 46,
        background: theme.panel,
        borderBottom: `1px solid ${theme.line}`,
        flexShrink: 0,
      }}
    >
      <NavGlyph d="M15 5 L8 12 L15 19" />
      <NavGlyph d="M9 5 L16 12 L9 19" dim />
      <NavGlyph d="M19 12 a7 7 0 1 1 -2.5 -5.4 M17 3.5 V7 H13.5" dim />

      <div
        style={{
          flex: 1,
          height: 32,
          maxWidth: 720,
          borderRadius: 999,
          background: '#f1f3f4',
          display: 'flex',
          alignItems: 'center',
          gap: 9,
          padding: '0 15px',
          fontSize: 13,
          color: theme.dim,
        }}
      >
        <svg width={11} height={13} viewBox="0 0 11 13" fill="none" style={{flexShrink: 0}}>
          <rect x="1" y="5.5" width="9" height="7" rx="1.6" fill={theme.dim} />
          <path d="M3 5.5 V3.6 a2.5 2.5 0 0 1 5 0 V5.5" stroke={theme.dim} strokeWidth="1.4" fill="none" />
        </svg>
        {url}
      </div>

      <div style={{flex: 1}} />

      {/* Extensions row — a puzzle piece, then the Umbrella button, lit while its
          popup is open (that's how Chrome shows an open action popup). */}
      <svg width={18} height={18} viewBox="0 0 24 24" style={{flexShrink: 0}}>
        <path
          d="M10 3a2 2 0 0 1 4 0v1h3a1 1 0 0 1 1 1v3h1a2 2 0 0 1 0 4h-1v3a1 1 0 0 1-1 1h-3v1a2 2 0 0 1-4 0v-1H7a1 1 0 0 1-1-1v-3H5a2 2 0 0 1 0-4h1V5a1 1 0 0 1 1-1h3z"
          fill="none"
          stroke={theme.dim2}
          strokeWidth="1.6"
        />
      </svg>

      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: 8,
          display: 'grid',
          placeItems: 'center',
          background: popup ? theme.brandSoft : 'transparent',
          boxShadow: popup ? `0 0 0 1.5px ${theme.brand}` : 'none',
          flexShrink: 0,
        }}
      >
        <Mark size={18} color={theme.text} />
      </div>
    </div>

    {/* The page */}
    <div style={{flex: 1, position: 'relative', overflow: 'hidden'}}>{children}</div>

    {/* The popup floats under the toolbar icon — a real action popup overlays the
        page from the top-right, it does not dock. */}
    {popup ? (
      <div style={{position: 'absolute', top: 84, right: popupRight, zIndex: 20}}>{popup}</div>
    ) : null}
  </div>
)

const Tab: React.FC<{tab: BrowserTab}> = ({tab}) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 7,
      height: 34,
      flex: tab.active ? '0 0 200px' : '1 1 0',
      minWidth: 34,
      maxWidth: 200,
      padding: '0 10px',
      background: tab.active ? theme.panel : 'transparent',
      borderRadius: '9px 9px 0 0',
      fontSize: 12,
      color: tab.active ? theme.text : theme.dim,
      position: 'relative',
    }}
  >
    <div style={{width: 13, height: 13, borderRadius: 4, background: tab.fav ?? theme.dim2, flexShrink: 0}} />
    <span style={{flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>{tab.title}</span>
    {tab.active ? <span style={{color: theme.dim2, fontSize: 14, lineHeight: 1}}>×</span> : null}
    {/* the hairline separators Chrome draws between inactive tabs */}
    {!tab.active ? (
      <span style={{position: 'absolute', right: 0, top: 9, bottom: 9, width: 1, background: 'rgba(15,15,15,0.10)'}} />
    ) : null}
  </div>
)

const NavGlyph: React.FC<{d: string; dim?: boolean}> = ({d, dim}) => (
  <svg width={18} height={18} viewBox="0 0 24 24" style={{flexShrink: 0}}>
    <path d={d} fill="none" stroke={dim ? theme.dim2 : theme.dim} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)
