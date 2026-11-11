/**
 * VISIORA — a thrown ball in two dimensions (x along the ground, y up, metres), with air.
 *   gravity   −m·g (down)
 *   drag      −½·ρ·Cd·A·|v|·v   along the velocity, so it slows the sideways motion too
 * Launched from height h at speed u and angle θ. On the ground it bounces: the up-down speed
 * reverses as e·v, and friction during the bounce takes some of the sideways speed. When the
 * bounces are too small to see it rolls, slowed by rolling resistance, until it stops.
 * 1 ms RK4 steps; the first landing is found inside its step. With ρ = 0 it reproduces the exact
 * vacuum formulas of engine/projectile.js.
 */
export const STEP = 0.001

const area = r => Math.PI * r * r

/** Balls to throw: mass (kg), radius (m), drag coefficient, bounce e, bounce friction μ, rolling resistance. */
export const BALLS = {
  cricket: { label: 'Cricket ball', mass: 0.16, r: 0.036, cd: 0.5, e: 0.5, mu: 0.4, roll: 0.05 },
  football: { label: 'Football', mass: 0.43, r: 0.11, cd: 0.25, e: 0.7, mu: 0.3, roll: 0.06 },
  pingpong: { label: 'Table tennis ball', mass: 0.0027, r: 0.02, cd: 0.5, e: 0.85, mu: 0.25, roll: 0.03 },
  shot: { label: 'Shot put', mass: 7.26, r: 0.06, cd: 0.47, e: 0.05, mu: 0.8, roll: 0.3 },
}

export function launch(kind, { u, theta, h = 0 }) {
  const a = (theta * Math.PI) / 180
  return { kind, b: BALLS[kind], x: 0, y: h, vx: u * Math.cos(a), vy: u * Math.sin(a), t: 0, top: { x: 0, y: h }, landed: null, bounces: 0, rolling: false, rest: false }
}

function accel(b, vx, vy, g, rho) {
  const k = rho ? (0.5 * rho * b.cd * area(b.r)) / b.mass : 0
  const s = Math.hypot(vx, vy)
  return [-k * s * vx, -g - k * s * vy]
}

const SETTLE = 0.3 // m/s: bounces smaller than this are too small to see; it rolls from then on

/** Advance a thrown ball by dt in a world { g, rho }. Mutates and returns it. */
export function stepFlight(s, dt, { g, rho }) {
  let left = dt
  while (left > 1e-12 && !s.rest) {
    const h = Math.min(STEP, left)
    if (s.rolling) {
      // rolling: slowed by rolling resistance (and by the air, a little)
      const dec = s.b.roll * g + (rho ? (0.5 * rho * s.b.cd * area(s.b.r) * s.vx * s.vx) / s.b.mass : 0)
      const v = Math.max(0, Math.abs(s.vx) - dec * h)
      s.x += Math.sign(s.vx) * (Math.abs(s.vx) + v) / 2 * h
      s.vx = Math.sign(s.vx) * v
      s.t += h; left -= h
      if (v === 0) s.rest = true
      continue
    }
    const f = (vx, vy) => accel(s.b, vx, vy, g, rho)
    const [a1x, a1y] = f(s.vx, s.vy)
    const [a2x, a2y] = f(s.vx + (h / 2) * a1x, s.vy + (h / 2) * a1y)
    const [a3x, a3y] = f(s.vx + (h / 2) * a2x, s.vy + (h / 2) * a2y)
    const [a4x, a4y] = f(s.vx + h * a3x, s.vy + h * a3y)
    const vx = s.vx + (h / 6) * (a1x + 2 * a2x + 2 * a3x + a4x)
    const vy = s.vy + (h / 6) * (a1y + 2 * a2y + 2 * a3y + a4y)
    const x = s.x + (h / 6) * (s.vx + 2 * (s.vx + (h / 2) * a1x) + 2 * (s.vx + (h / 2) * a2x) + (s.vx + h * a3x))
    const y = s.y + (h / 6) * (s.vy + 2 * (s.vy + (h / 2) * a1y) + 2 * (s.vy + (h / 2) * a2y) + (s.vy + h * a3y))
    if (y <= 0 && vy < 0) {
      // the moment it touches the ground, found inside this 1 ms step
      const frac = s.y / Math.max(1e-12, s.y - y)
      s.x += frac * (x - s.x); s.t += frac * h; left -= frac * h
      const vyHit = s.vy + frac * (vy - s.vy), vxHit = s.vx + frac * (vx - s.vx)
      if (!s.landed) s.landed = { t: s.t, x: s.x, speed: Math.hypot(vxHit, vyHit) }
      s.y = 0
      const up = -vyHit * s.b.e
      // friction while it touches takes sideways speed, at most enough to stop it skidding
      const loss = Math.min(Math.abs(vxHit), s.b.mu * (1 + s.b.e) * -vyHit)
      s.vx = Math.sign(vxHit) * (Math.abs(vxHit) - loss)
      if (up < SETTLE) { s.vy = 0; s.rolling = true; if (Math.abs(s.vx) < 0.01) s.rest = true } else { s.vy = up; s.bounces += 1 }
      continue
    }
    s.x = x; s.y = y; s.vx = vx; s.vy = vy; s.t += h; left -= h
    if (y > s.top.y) s.top = { x, y }
  }
  return s
}

/** Throw to the end (or tMax) and return the state. */
export function simulateFlight(kind, shot, world, { tMax = 60, untilLanded = false } = {}) {
  const s = launch(kind, shot)
  while (!s.rest && s.t < tMax && !(untilLanded && s.landed)) stepFlight(s, 0.01, world)
  return s
}

/** Where it first lands, x (m). */
export const rangeOf = (kind, shot, world) => simulateFlight(kind, shot, world, { untilLanded: true }).landed?.x ?? 0

/** The launch angle (whole degrees) that throws furthest, from trying them all. */
export function bestAngle(kind, { u, h = 0 }, world) {
  let best = { theta: 0, x: -Infinity }
  for (let theta = 1; theta <= 89; theta++) {
    const x = rangeOf(kind, { u, theta, h }, world)
    if (x > best.x) best = { theta, x }
  }
  return best
}
