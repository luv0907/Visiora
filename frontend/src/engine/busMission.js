/**
 * VISIORA — "The bus and the cow": a guided braking mission for Class 9 Motion.
 * A bus at 20 m/s brakes at 4 m/s² and stops 10 m short of a cow 60 m away.
 * Students predict the speed–time graph, read a ticker tape, then pick the
 * braking needed when the cow is only 40 m away. Closed-form, like engine/motion.js.
 */
import { stopTime, stoppingDistance, timeToReach } from './motion'

export const BUS = { u: 20, a: -4, cowAt: 60, applyCowAt: 40 }

/** Distance and speed of the braking bus at time t. It stays put once stopped. */
export function busAt(t, u, a) {
  const tm = Math.min(Math.max(0, t), stopTime(u, a))
  return { s: u * tm + 0.5 * a * tm * tm, v: u + a * tm }
}

/** When the run ends: the bus stops, or its front reaches the cow. */
export function busRunEnd(u, a, cowAt) {
  const stop = stopTime(u, a)
  const hit = timeToReach(cowAt, u, a)
  return hit < stop ? { t: hit, reason: 'hit' } : { t: stop, reason: 'stopped' }
}

/** Distance covered in each whole second until the bus stops: the gaps on the ticker tape. */
export function tickerGaps(u, a) {
  const gaps = []
  const end = stopTime(u, a)
  for (let k = 0; k < end - 1e-9; k++) gaps.push(busAt(k + 1, u, a).s - busAt(k, u, a).s)
  return gaps
}

/** The student's sketch as [[t, v], …] (t increasing), read at any time. */
export function sketchAt(points, t) {
  if (!points.length) return 0
  if (t <= points[0][0]) return points[0][1]
  for (let i = 1; i < points.length; i++) {
    const [t0, v0] = points[i - 1], [t1, v1] = points[i]
    if (t <= t1) return t1 === t0 ? v1 : v0 + ((v1 - v0) * (t - t0)) / (t1 - t0)
  }
  return points[points.length - 1][1]
}

/** How close a sketched speed–time graph is to the real one, 0–100. */
export function predictionScore(points, u, a, tMax = 7) {
  if (points.length < 2) return 0
  let err = 0, n = 0
  for (let t = 0; t <= tMax + 1e-9; t += 0.1, n++) err += Math.abs(sketchAt(points, t) - busAt(t, u, a).v)
  return Math.max(0, Math.round(100 * (1 - err / n / (u / 2))))
}

/** When the sketch reaches (about) zero speed, or null if it never does. */
export function sketchStopTime(points, below = 1) {
  const p = points.find(([, v]) => v < below)
  return p ? p[0] : null
}

/** The gentlest braking (m/s², positive) that stops from u within d metres. */
export const minBraking = (u, d) => (u * u) / (2 * d)

export { stoppingDistance }
