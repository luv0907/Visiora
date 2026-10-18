/**
 * VISIORA — Exact straight-line motion (uniform acceleration) for the Motion Lab.
 * Uses the closed-form equations, so the answer never depends on frame rate:
 *   v = u + a·t        s = u·t + ½·a·t²
 * A braking car (a < 0) stops when v reaches 0 and stays stopped — it does not reverse.
 * The run ends when the car stops, crosses the end of the road, or time runs out.
 */

export const ROAD_LENGTH = 100 // m
export const MAX_TIME = 20 // s

/** Time at which a braking car comes to rest, or Infinity. */
export function stopTime(u, a) {
  if (u <= 0 && a <= 0) return 0
  if (a < 0) return -u / a
  return Infinity
}

/** Time at which the car reaches distance L, or Infinity if it never does. */
export function timeToReach(L, u, a) {
  if (L <= 0) return 0
  if (a === 0) return u > 0 ? L / u : Infinity
  const disc = u * u + 2 * a * L
  if (disc < 0) return Infinity
  // Numerically stable root of ½at² + ut − L = 0 (avoids cancellation when a is tiny).
  const t = (2 * L) / (u + Math.sqrt(disc))
  return t > 0 && t <= stopTime(u, a) ? t : Infinity
}

/** When the run ends and why. */
export function runEnd(u, a, L = ROAD_LENGTH) {
  const ts = stopTime(u, a)
  const tf = timeToReach(L, u, a)
  if (tf <= ts && tf <= MAX_TIME) return { t: tf, reason: 'finished' }
  if (ts <= MAX_TIME) return { t: ts, reason: 'stopped' }
  return { t: MAX_TIME, reason: 'timeout' }
}

/** Exact state at time t. */
export function stateAt(t, u, a, L = ROAD_LENGTH) {
  const end = runEnd(u, a, L)
  const ts = stopTime(u, a)
  const tc = Math.min(Math.max(0, t), end.t)
  const moving = tc < ts
  const tm = Math.min(tc, ts)
  const s = u * tm + 0.5 * a * tm * tm
  const v = moving ? u + a * tc : 0
  return {
    t: tc,
    s: end.reason === 'finished' && tc >= end.t ? L : s,
    v: Math.abs(v) < 1e-12 ? 0 : v,
    a: moving ? a : 0,
    stopped: !moving,
    done: tc >= end.t,
    end,
  }
}

/** Stopping distance u² / 2|a| for a braking car. */
export function stoppingDistance(u, a) {
  if (a >= 0) return Infinity
  return (u * u) / (2 * -a)
}

/** Plain-language description of what the student should notice right now. */
export function insight(u, a, st) {
  if (st.stopped && st.t > 0) return 'Speed is 0, so the distance stops growing — the s–t graph goes flat.'
  if (u === 0 && a <= 0) return 'No starting speed and no push forward — the car stays still. Give it some speed or acceleration.'
  if (a === 0) return 'Same speed every second, so equal distances each second. The s–t graph is a straight line and v–t is flat.'
  if (a > 0) return `Speed grows by ${fmt(a)} m/s every second. The dots spread out, the s–t graph curves up and v–t slopes up.`
  return `Speed drops by ${fmt(-a)} m/s every second. The dots bunch up, the s–t graph bends over and v–t slopes down.`
}

function fmt(n) {
  return Number(n.toFixed(2)).toString()
}
