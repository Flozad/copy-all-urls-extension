// A machine draws these clips, but a person should appear to have driven them.
// Three things sell that: hands travel on bowed paths and settle with a spring
// (not straight lines that stop dead), hands are never perfectly still, and
// people type at an uneven rate that slows at punctuation.
//
// Everything here is frame-derived — no CSS transitions, no rAF — because
// Remotion renders each frame in isolation and anything stateful would tear.

import {Easing, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion'

export type Move = {
  /** Seconds at which the pointer starts travelling to this point. */
  t: number
  x: number
  y: number
  /** Travel time in seconds. Default: derived from distance, Fitts-style. */
  dur?: number
}

export type Click = {
  /** Seconds at which the button goes down. */
  t: number
  /** Down-time in seconds. Default 0.09 — a real click is quicker than you think. */
  hold?: number
}

export type CursorState = {
  x: number
  y: number
  /** True while the button is down. Drives the cursor's own squash. */
  pressed: boolean
  /** Feed to <Cursor/>: the clicks currently blooming, if any. */
  ripples: {x: number; y: number; age: number}[]
}

/** Fitts' law, roughly: longer throws take longer, but sublinearly. */
const travelTime = (dist: number) => 0.22 + Math.min(0.62, dist / 2400)

/**
 * Drives a pointer through a list of waypoints with human ballistics: a spring
 * ease into each target (slight overshoot, then settle), a bowed path, tremor
 * in flight, and idle drift at rest.
 */
export const useCursor = (moves: Move[], clicks: Click[] = []): CursorState => {
  const frame = useCurrentFrame()
  const {fps} = useVideoConfig()
  const t = frame / fps

  const first = moves[0] ?? {t: 0, x: 0, y: 0}
  let from = {x: first.x, y: first.y}
  let x = first.x
  let y = first.y

  for (let i = 1; i < moves.length; i++) {
    const m = moves[i]
    const prev = moves[i - 1]
    const dist = Math.hypot(m.x - prev.x, m.y - prev.y)
    const dur = m.dur ?? travelTime(dist)

    if (t < m.t) break // not started yet — hold at `from`
    from = {x: prev.x, y: prev.y}

    const p = spring({
      frame: frame - m.t * fps,
      fps,
      durationInFrames: Math.max(1, Math.round(dur * fps)),
      config: {damping: 26, stiffness: 170, mass: 0.75},
    })

    x = prev.x + (m.x - prev.x) * p
    y = prev.y + (m.y - prev.y) * p

    // Bow the path — perpendicular offset peaking mid-flight, alternating side
    // per leg so consecutive moves don't all curve the same way.
    if (p > 0.001 && p < 0.999 && dist > 24) {
      const nx = -(m.y - prev.y) / dist
      const ny = (m.x - prev.x) / dist
      const bow = Math.sin(Math.PI * Math.min(1, p)) * dist * 0.05 * (i % 2 === 0 ? 1 : -1)
      x += nx * bow
      y += ny * bow

      const tremor = Math.sin(Math.PI * Math.min(1, p))
      x += Math.sin(t * 41) * 1.1 * tremor
      y += Math.cos(t * 37) * 1.1 * tremor
    }
  }

  // Idle drift — two frequencies with an irrational-ish ratio so the loop is
  // never long enough to spot.
  x += Math.sin(t * 2.3) * 0.7 + Math.sin(t * 5.1) * 0.35
  y += Math.cos(t * 1.9) * 0.7 + Math.cos(t * 4.3) * 0.35

  const ripples: CursorState['ripples'] = []
  let pressed = false
  for (const c of clicks) {
    const hold = c.hold ?? 0.09
    if (t >= c.t && t <= c.t + hold) pressed = true
    const age = t - c.t
    if (age >= 0 && age < 0.6) ripples.push({x, y, age})
  }

  return {x, y, pressed, ripples}
}

/**
 * Types text at an uneven human rate: a base speed with per-character noise, a
 * beat of hesitation after punctuation, and a caret that blinks on its own clock.
 */
export const useTyping = (text: string, startT: number, cps = 13) => {
  const frame = useCurrentFrame()
  const {fps} = useVideoConfig()
  const t = frame / fps - startT

  if (t < 0) return {typed: '', done: false, caret: true, progress: 0}

  let elapsed = 0
  let n = 0
  for (let i = 0; i < text.length; i++) {
    const jitter = 0.55 + ((((Math.sin(i * 12.9898) * 43758.5453) % 1) + 1) % 1)
    let d = jitter / cps
    if (/[.,;:?!/]/.test(text[i])) d += 0.14
    if (text[i] === ' ') d *= 0.7
    if (elapsed + d > t) break
    elapsed += d
    n = i + 1
  }

  const done = n >= text.length
  const caret = done ? Math.floor((t - elapsed) * 1.8) % 2 === 0 : true

  return {typed: text.slice(0, n), done, caret, progress: n / text.length}
}

/**
 * A value timeline. `{t, v}` pairs, eased between. The workhorse for anything
 * that isn't the pointer: scroll offsets, panel slides, list reveals, opacity.
 */
export const useTimeline = (
  keys: {t: number; v: number}[],
  easing = Easing.bezier(0.32, 0.72, 0.15, 1),
) => {
  const frame = useCurrentFrame()
  const {fps} = useVideoConfig()
  const t = frame / fps

  if (keys.length === 0) return 0
  if (keys.length === 1) return keys[0].v

  return interpolate(
    t,
    keys.map((k) => k.t),
    keys.map((k) => k.v),
    {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing},
  )
}

/** 0 → 1 → 0 over `dur` seconds starting at `t0`. For flashes and pulses. */
export const usePulse = (t0: number, dur = 0.5) => {
  const frame = useCurrentFrame()
  const {fps} = useVideoConfig()
  const t = frame / fps
  if (t < t0 || t > t0 + dur) return 0
  return Math.sin(((t - t0) / dur) * Math.PI)
}

/** True once `t0` seconds have passed. Sugar, but every scene wants it. */
export const useAfter = (t0: number) => {
  const frame = useCurrentFrame()
  const {fps} = useVideoConfig()
  return frame / fps >= t0
}

/**
 * A spring 0→1 that starts at `t0` seconds. The standard entrance for anything
 * that pops: the popup, menus, toasts.
 */
export const useEnter = (t0: number, opts?: {damping?: number; stiffness?: number}) => {
  const frame = useCurrentFrame()
  const {fps} = useVideoConfig()
  return spring({
    frame: frame - t0 * fps,
    fps,
    config: {damping: opts?.damping ?? 22, stiffness: opts?.stiffness ?? 190},
  })
}
