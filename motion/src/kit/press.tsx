import React from 'react'
import {theme} from './theme'

// The Pressroom's page furniture — the weather-broadsheet motifs, lifted from
// umbrella-docs/app/globals.css so the store artwork is the same publication as
// the site: a fine rain of ink ticks, a sheltering canopy, and the mono eyebrow
// ruled with a dash. Ink only; density and rule are the whole vocabulary.

const TICK = 'rgba(22, 22, 26, 0.22)'

/**
 * The rain field — a repeating column of ink ticks, masked so it's dense at the
 * edges and dissolves behind the type. `focus` sets where the shelter thins.
 */
export const Rain: React.FC<{opacity?: number; focus?: string}> = ({
  opacity = 0.5,
  focus = '120% 90% at 50% 46%',
}) => (
  <div
    style={{
      position: 'absolute',
      inset: 0,
      zIndex: 0,
      pointerEvents: 'none',
      backgroundImage: `repeating-linear-gradient(16deg, ${TICK} 0 1.5px, transparent 1.5px 9px)`,
      backgroundSize: '9px 26px',
      opacity,
      WebkitMaskImage: `radial-gradient(${focus}, transparent 0%, transparent 32%, #000 74%)`,
      maskImage: `radial-gradient(${focus}, transparent 0%, transparent 32%, #000 74%)`,
    }}
  />
)

/**
 * The dome — a single umbrella canopy arc in hairline, the shelter the rain
 * thins under. Drawn wide and faint, floated behind a nameplate.
 */
export const Dome: React.FC<{width?: number; color?: string; opacity?: number}> = ({
  width = 520,
  color = theme.line,
  opacity = 1,
}) => (
  <svg width={width} height={width * 0.32} viewBox="0 0 520 166" fill="none" style={{opacity}}>
    {/* canopy: a broad semicircle closed by a scalloped hem */}
    <path
      d="M20 150 A240 240 0 0 1 500 150 Q 440 176 380 150 Q 320 176 260 150 Q 200 176 140 150 Q 80 176 20 150 Z"
      stroke={color}
      strokeWidth="1.25"
      fill="none"
    />
    {/* ribs */}
    <path d="M260 22 V150 M150 44 Q 205 100 210 150 M370 44 Q 315 100 310 150" stroke={color} strokeWidth="1" fill="none" opacity="0.7" />
    {/* the ferrule tip */}
    <circle cx="260" cy="18" r="2.4" fill={color} />
  </svg>
)

/**
 * The mono eyebrow, ruled with a dash — the site's .u-eyebrow. Uppercase Geist
 * Mono with wide tracking, led by a short dashed rule cut from ink.
 */
export const Eyebrow: React.FC<{children: React.ReactNode; light?: boolean; style?: React.CSSProperties}> = ({
  children,
  light,
  style,
}) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      fontFamily: theme.font.mono,
      fontSize: 12,
      letterSpacing: '0.18em',
      textTransform: 'uppercase',
      color: light ? theme.dim : theme.dim2,
      ...style,
    }}
  >
    <span
      style={{
        width: 22,
        height: 3,
        backgroundImage: `linear-gradient(90deg, ${theme.text} 3px, transparent 0)`,
        backgroundSize: '6px 3px',
        flexShrink: 0,
      }}
    />
    {children}
  </div>
)

/** The mono metadata row — "No account · No server · Open source" — with square
 *  ink bullets, matching .u-hero-meta. */
export const MetaRow: React.FC<{items: string[]; style?: React.CSSProperties}> = ({items, style}) => (
  <div style={{display: 'flex', gap: 18, flexWrap: 'wrap', ...style}}>
    {items.map((it) => (
      <span
        key={it}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          fontFamily: theme.font.mono,
          fontSize: 11,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: theme.dim2,
        }}
      >
        <span style={{width: 4, height: 4, background: theme.text}} />
        {it}
      </span>
    ))}
  </div>
)
