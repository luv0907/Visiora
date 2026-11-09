/**
 * VISIORA — the physics of the benches in the walk-in lab, in metres, seconds and
 * Blender-model positions along each bench. No drawing here. Closed-form wherever the
 * equations allow, so results never depend on frame rate.
 */
import { stateAt as motionAt, timeToReach } from './motion'
import { buildCircuit, solve } from './circuit'

export const G = 9.81

// ── Motion track: a cart running past two light gates ────────────────────────
export const TRACK = { start: -2.1, end: -0.31, gates: [-1.705, -0.8] }
const trackLength = TRACK.end - TRACK.start

export function cartAt(t, u, a) {
  const s = motionAt(t, u, a, trackLength)
  return { ...s, x: TRACK.start + s.s }
}

/** When the cart reaches each gate, and its average speed between them (null if it never does). */
export function gateReadings(u, a) {
  const [t1, t2] = TRACK.gates.map(g => timeToReach(g - TRACK.start, u, a))
  if (!Number.isFinite(t2)) return { t1: Number.isFinite(t1) ? t1 : null, t2: null, between: null, speed: null }
  return { t1, t2, between: t2 - t1, speed: (TRACK.gates[1] - TRACK.gates[0]) / (t2 - t1) }
}

// ── Friction ramp: a block on one of three strips, at the ramp's fixed angle ─
export const RAMP = { angle: Math.atan(0.38 / 1.5), high: { x: 2.45, y: 1.345 }, length: 1.4 }
export const RAMP_SURFACES = [
  { id: 'polished', label: 'Polished board', mus: 0.1, muk: 0.05, z: 1.42 },
  { id: 'wood', label: 'Wood', mus: 0.4, muk: 0.25, z: 1.68 },
  { id: 'rubber', label: 'Rubber', mus: 0.8, muk: 0.5, z: 1.55 },
]

/** A block starts sliding only if tan θ is more than the static friction coefficient. */
export function rampRun(surface) {
  const slides = Math.tan(RAMP.angle) > surface.mus
  const a = slides ? G * (Math.sin(RAMP.angle) - surface.muk * Math.cos(RAMP.angle)) : 0
  const time = slides ? Math.sqrt((2 * RAMP.length) / a) : null
  return { slides, a, time, endSpeed: slides ? a * time : 0 }
}

export function blockAt(t, surface) {
  const run = rampRun(surface)
  const tc = run.slides ? Math.min(t, run.time) : 0
  const s = 0.5 * run.a * tc * tc
  return {
    s, v: run.a * tc, done: run.slides ? t >= run.time : true,
    x: RAMP.high.x - s * Math.cos(RAMP.angle),
    y: RAMP.high.y - s * Math.sin(RAMP.angle),
  }
}

// ── Air track: two gliders on a straight line, with no friction ──────────────
export const AIR_TRACK = { a0: -7.45, b0: -6.65, width: 0.2, min: -8.1, max: -5.9 }

/** Velocities after a collision. e = 1 bounces with no energy lost; e = 0 sticks together. */
export function collide(ma, mb, ua, ub, e) {
  const p = ma * ua + mb * ub
  return { va: (p - mb * e * (ua - ub)) / (ma + mb), vb: (p + ma * e * (ua - ub)) / (ma + mb) }
}

export function glidersRun({ ma, mb, ua, ub = 0, e }) {
  const gap = AIR_TRACK.b0 - AIR_TRACK.a0 - AIR_TRACK.width
  const closing = ua - ub
  const hit = closing > 0 ? gap / closing : null
  const after = hit == null ? null : collide(ma, mb, ua, ub, e)
  const a1 = hit == null ? AIR_TRACK.a0 : AIR_TRACK.a0 + ua * hit
  const b1 = hit == null ? AIR_TRACK.b0 : AIR_TRACK.b0 + ub * hit
  // The run ends the moment either glider reaches an end of the track.
  const untilEnd = (x, v) => (v > 0 ? (AIR_TRACK.max - x) / v : v < 0 ? (AIR_TRACK.min - x) / v : Infinity)
  const end = hit == null
    ? Math.min(untilEnd(a1, ua), untilEnd(b1, ub))
    : hit + Math.min(untilEnd(a1, after.va), untilEnd(b1, after.vb))
  const totals = (va, vb) => ({ momentum: ma * va + mb * vb, energy: 0.5 * ma * va * va + 0.5 * mb * vb * vb })
  return { ma, mb, ua, ub, e, hit, after, a1, b1, end, before: totals(ua, ub), final: after ? totals(after.va, after.vb) : null }
}

export function glidersAt(t, run) {
  const tc = Math.min(t, run.end)
  if (run.hit == null || tc < run.hit) return { a: AIR_TRACK.a0 + run.ua * tc, b: AIR_TRACK.b0 + run.ub * tc, hasHit: false, done: t >= run.end }
  const dt = tc - run.hit
  return { a: run.a1 + run.after.va * dt, b: run.b1 + run.after.vb * dt, hasHit: true, done: t >= run.end }
}

// ── Pendulums: the three real string lengths in the model, hook to bob centre ─
export const PENDULUM_LENGTHS = [4.68, 4.08, 3.48]
const SWING_STEP = 0.002

export const smallAnglePeriod = L => 2 * Math.PI * Math.sqrt(L / G)

/** Advance { theta, omega } by dt, solving θ'' = −(g/L)·sin θ. Accurate at any swing size. */
export function stepSwing(s, dt, L) {
  const acc = th => -(G / L) * Math.sin(th)
  let { theta, omega } = s
  for (let left = dt; left > 1e-12; left -= SWING_STEP) {
    const h = Math.min(SWING_STEP, left)
    const k1t = omega, k1w = acc(theta)
    const k2t = omega + (h / 2) * k1w, k2w = acc(theta + (h / 2) * k1t)
    const k3t = omega + (h / 2) * k2w, k3w = acc(theta + (h / 2) * k2t)
    const k4t = omega + h * k3w, k4w = acc(theta + h * k3t)
    theta += (h / 6) * (k1t + 2 * k2t + 2 * k3t + k4t)
    omega += (h / 6) * (k1w + 2 * k2w + 2 * k3w + k4w)
  }
  s.theta = theta
  s.omega = omega
  return s
}

/** The true period from a release at theta0: four times the fall from the release to the lowest point. */
export function swingPeriod(L, theta0) {
  const s = { theta: theta0, omega: 0 }
  let t = 0
  while (s.theta > 0) {
    const before = s.theta
    stepSwing(s, SWING_STEP, L)
    if (s.theta <= 0) return 4 * (t + SWING_STEP * (before / (before - s.theta)))
    t += SWING_STEP
  }
  return 0
}

// ── Optics bench: a thin convex lens ─────────────────────────────────────────
export const OPTICS = { object: 8.7, lensMin: 8.95, lensMax: 10.55, screenMin: 9.3, screenMax: 11.05, objectHeight: 0.05 }
const FOCUS_TOLERANCE = 0.03

/** Where the image forms for an object u in front of a lens of focal length f. */
export function lensImage(u, f) {
  if (u <= f) return { real: false, v: null, magnification: null }
  const v = (u * f) / (u - f)
  return { real: true, v, magnification: v / u }
}

export function opticsState(lensX, screenX, f) {
  const u = lensX - OPTICS.object
  const image = lensImage(u, f)
  const screenDistance = screenX - lensX
  const miss = image.real ? screenDistance - image.v : null
  return { u, f, screenDistance, ...image, miss, sharp: screenDistance > 0 && image.real && Math.abs(miss) <= FOCUS_TOLERANCE, height: image.real ? OPTICS.objectHeight * image.magnification : 0 }
}

// ── Ohm's law bench: power supply, rheostat and two bulbs in series ──────────
export const BULB_OHMS = 10
export const OHM_RANGE = { ammeter: 0.5, voltmeter: 10, volts: [2, 12], rheostat: [5, 50] }
const NEEDLE_SWEEP = (50 * Math.PI) / 180

export function ohmBench(V, R) {
  const c = buildCircuit('series', V, [R, BULB_OHMS, BULB_OHMS], true)
  const sol = solve(c.nodes, c.elements)
  const I = sol.current('A')
  return { V, R, I, rheostatVolts: sol.across(...c.ends.R1), bulbWatts: I * I * BULB_OHMS, total: R + 2 * BULB_OHMS }
}

/** Needle angle for a reading on a meter: full left at zero, full right at the top of the scale. */
export const needleAngle = (value, max) => NEEDLE_SWEEP * (2 * Math.min(1, Math.max(0, value / max)) - 1)
