import React from 'react'
import {AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig} from 'remotion'
import {urlOnlyText} from '../kit/data'
import {useAfter, useTimeline} from '../kit/human'
import {Popup} from '../kit/Popup'
import {theme} from '../kit/theme'
import {PANEL_ORIGIN, PANEL_SCALE} from './panel-shell'

// Dark mode: the same popup, the same session, the theme flipped underneath it.
// The bed and the popup crossfade from light to dark at the midpoint — Umbrella
// following the system theme. No cursor; the switch is the whole story.

const NAT_W = 420

export const SceneDark: React.FC = () => {
  const frame = useCurrentFrame()
  const {fps, durationInFrames} = useVideoConfig()
  const t = frame / fps

  // Entrance/exit fade so the loop seam is invisible.
  const fade = 0.3 * fps
  const seam = Math.min(
    interpolate(frame, [0, fade], [0, 1], {extrapolateRight: 'clamp'}),
    interpolate(frame, [durationInFrames - fade, durationInFrames], [1, 0], {extrapolateLeft: 'clamp'}),
  )

  // The theme flip, centred at 4s.
  const dark = useTimeline([
    {t: 3.4, v: 0},
    {t: 4.6, v: 1},
  ])

  const copied = useAfter(1.4)
  const content = urlOnlyText(9)

  // Bed colour crossfades paper → near-black.
  const bed = mix(theme.bg, '#171719', dark)

  const popupBox: React.CSSProperties = {
    position: 'absolute',
    left: PANEL_ORIGIN.x,
    top: PANEL_ORIGIN.y,
    width: NAT_W,
    transform: `scale(${PANEL_SCALE})`,
    transformOrigin: 'top left',
    filter: `drop-shadow(${theme.shadow.lift})`,
  }

  const toast = copied ? {text: '✓ Copied 14 URLs to clipboard', kind: 'ok' as const} : undefined

  return (
    <div style={{width: '100%', height: '100%', background: bed, position: 'relative', overflow: 'hidden'}}>
      <div style={{position: 'absolute', inset: 0, opacity: seam}}>
        <AbsoluteFill>
          {/* Light popup underneath */}
          <div style={{...popupBox, opacity: 1 - dark}}>
            <Popup format="url_only" content={content} message={toast} />
          </div>
          {/* Dark popup on top, fading in */}
          <div style={{...popupBox, opacity: dark}}>
            <Popup format="url_only" content={content} message={toast} dark />
          </div>

          {/* The label, colour-flipping with the theme */}
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 70,
              textAlign: 'center',
              fontFamily: theme.font.mono,
              fontSize: 15,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: mix(theme.dim as string, 'rgba(237,237,240,0.6)', dark),
            }}
          >
            Follows your system theme
          </div>
        </AbsoluteFill>
      </div>
    </div>
  )
}

// Crossfade two colours. Handles #rrggbb and rgba() by sampling endpoints only —
// for our two-stop needs, a straight rgba interpolation on parsed channels.
function mix(a: string, b: string, p: number): string {
  const pa = parse(a)
  const pb = parse(b)
  const c = pa.map((v, i) => Math.round(v + (pb[i] - v) * p))
  return `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${(pa[3] + (pb[3] - pa[3]) * p).toFixed(3)})`
}
function parse(s: string): [number, number, number, number] {
  if (s.startsWith('#')) {
    const h = s.slice(1)
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16), 1]
  }
  const m = s.match(/rgba?\(([^)]+)\)/)
  if (m) {
    const parts = m[1].split(',').map((x) => parseFloat(x.trim()))
    return [parts[0], parts[1], parts[2], parts[3] ?? 1]
  }
  return [0, 0, 0, 1]
}
