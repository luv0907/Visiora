/**
 * VISIORA — Exact free fall and projectile motion (no air resistance) for the Gravity Lab.
 * A ball leaves a cliff of height h with speed u at angle θ above the horizontal.
 *   x = u·cosθ·t                 (sideways speed never changes)
 *   y = h + u·sinθ·t − ½·g·t²    vy = u·sinθ − g·t
 * Mass does not appear anywhere: that is the point the lab makes.
 */

export const PLANETS = [
  { id: 'earth', label: 'Earth', g: 9.8 },
  { id: 'moon', label: 'Moon', g: 1.62 },
  { id: 'mars', label: 'Mars', g: 3.71 },
  { id: 'jupiter', label: 'Jupiter', g: 24.79 },
]

const D2R = Math.PI / 180

export function components(u, thetaDeg) {
  const clean = n => (Math.abs(n) < 1e-12 ? 0 : n)
  return { ux: clean(u * Math.cos(thetaDeg * D2R)), uy: clean(u * Math.sin(thetaDeg * D2R)) }
}

/** Time the ball hits the ground (y = 0). */
export function flightTime({ h, u, theta, g }) {
  const { uy } = components(u, theta)
  if (h <= 0 && uy <= 0) return 0
  // Positive root of ½gt² − uy·t − h = 0, written to avoid cancellation.
  const disc = Math.sqrt(uy * uy + 2 * g * h)
  return uy >= 0 ? (uy + disc) / g : (2 * h) / (disc - uy)
}

/** Highest point reached (t, y); for downward throws it is the launch point. */
export function apex({ h, u, theta, g }) {
  const { uy } = components(u, theta)
  if (uy <= 0) return { t: 0, y: h }
  return { t: uy / g, y: h + (uy * uy) / (2 * g) }
}

/** Exact state at time t (clamped to the landing time). */
export function stateAt(t, p) {
  const T = flightTime(p)
  const tc = Math.min(Math.max(0, t), T)
  const { ux, uy } = components(p.u, p.theta)
  const landed = tc >= T
  const y = landed ? 0 : p.h + uy * tc - 0.5 * p.g * tc * tc
  const vy = uy - p.g * tc
  return {
    t: tc,
    x: ux * tc,
    y: Math.max(0, y),
    vx: ux,
    vy: Math.abs(vy) < 1e-12 ? 0 : vy,
    speed: Math.hypot(ux, vy),
    landed,
    T,
  }
}

/** Range on level ground (h = 0): u²·sin2θ / g — the textbook formula, for checking. */
export function levelRange(u, theta, g) {
  return (u * u * Math.sin(2 * theta * D2R)) / g
}

export function insight(p, st) {
  const { ux, uy } = components(p.u, p.theta)
  const planet = PLANETS.find(pl => pl.g === p.g)?.label || 'this planet'
  if (st.landed && st.t > 0) return `Landed after ${st.t.toFixed(2)} s, ${st.x.toFixed(1)} m from the cliff. Try another planet or angle.`
  if (p.u === 0) return `Dropped: on ${planet} gravity adds ${p.g} m/s of downward speed every second, so the speed–time line drops at a steady slope.`
  if (Math.abs(ux) < 1e-9) return `Thrown straight ${uy > 0 ? 'up' : 'down'}: it slows, stops for an instant at the top, then falls — the speed line crosses zero at the top.`
  if (uy === 0) return 'Thrown sideways: the sideways speed never changes, but the falling part is exactly the same as a drop. Compare the fall times!'
  return 'Sideways speed stays the same; only the up–down speed changes, by the same amount every second. That makes the path a parabola.'
}
