/**
 * VISIORA — a simple pendulum, solved exactly enough at any swing size:
 *   θ'' = −(g/L)·sin θ − b·θ'
 * b is air friction (per second); 0 is the ideal pendulum that swings forever.
 * Stepped with fixed 2 ms RK4 sub-steps, so results don't depend on frame rate.
 */

export const FRICTION = [
  { id: 'none', label: 'None', b: 0 },
  { id: 'some', label: 'Some', b: 0.05 },
  { id: 'lots', label: 'Lots', b: 0.3 },
]

export const PLANETS = [
  { id: 'moon', label: 'Moon', g: 1.62 },
  { id: 'earth', label: 'Earth', g: 9.81 },
  { id: 'jupiter', label: 'Jupiter', g: 24.79 },
]

const SUB_STEP = 0.002

/** Advance { theta, omega } by dt seconds. Mutates and returns the state. */
export function stepPendulum(s, dt, L, g, friction = 0) {
  const acc = (th, om) => -(g / L) * Math.sin(th) - friction * om
  let { theta, omega } = s
  for (let left = dt; left > 1e-12; left -= SUB_STEP) {
    const h = Math.min(SUB_STEP, left)
    const k1t = omega, k1w = acc(theta, omega)
    const k2t = omega + (h / 2) * k1w, k2w = acc(theta + (h / 2) * k1t, k2t)
    const k3t = omega + (h / 2) * k2w, k3w = acc(theta + (h / 2) * k2t, k3t)
    const k4t = omega + h * k3w, k4w = acc(theta + h * k3t, k4t)
    theta += (h / 6) * (k1t + 2 * k2t + 2 * k3t + k4t)
    omega += (h / 6) * (k1w + 2 * k2w + 2 * k3w + k4w)
  }
  s.theta = theta
  s.omega = omega
  return s
}

export const smallAnglePeriod = (L, g) => 2 * Math.PI * Math.sqrt(L / g)

/** The true time for one full swing from a release at theta0 (radians). */
export function swingTime(L, g, theta0) {
  const start = Math.abs(theta0)
  if (start < 1e-6) return smallAnglePeriod(L, g)
  const s = { theta: start, omega: 0 }
  let t = 0
  while (s.theta > 0) {
    const before = s.theta
    stepPendulum(s, SUB_STEP, L, g)
    if (s.theta <= 0) return 4 * (t + SUB_STEP * (before / (before - s.theta)))
    t += SUB_STEP
  }
  return 4 * t
}

/** Kinetic and potential energy (J), with the lowest point as zero height. */
export function energy(s, L, g, m) {
  const v = s.omega * L
  return { kinetic: 0.5 * m * v * v, potential: m * g * L * (1 - Math.cos(s.theta)) }
}
