/**
 * VISIORA — Drop-tower physics for the 3D Free Fall lab.
 *
 * A ball of mass m and radius r falls from rest at height h (y = height of the
 * ball's lowest point above the pad, v = vertical velocity, positive upward).
 *
 *   Gravity:  a = −g
 *   Drag:     F = ½·ρ·Cd·A·v², always opposing the motion (up or down)
 *   Impact:   v_after = −e·v_before   (e = coefficient of restitution)
 *
 * Without air, each rebound rises to e² of the previous height, so the ball
 * bounces lower and lower and comes to rest. The first impact time is the
 * number the lab compares between the two balls (Galileo's experiment), so it is
 * found to the sub-millisecond, not to the nearest animation frame.
 */

export const AIR_DENSITY = 1.225 // kg/m³ at sea level
export const SPHERE_CD = 0.47 // drag coefficient of a smooth sphere
export const STEP = 0.001 // s, internal integration step
const REST_SPEED = 0.12 // m/s: slower rebounds than this are too small to see, so the ball settles

/** Typical coefficients of restitution against a hard pad. */
export const RESTITUTION = {
  beachBall: 0.7, // inflated vinyl ball: lively bounce
  heavyBall: 0.15, // solid bowling-type ball: barely leaves the ground
}

export function createBall({ height, mass, radius, restitution }) {
  return {
    y: height,
    v: 0,
    mass,
    radius,
    restitution,
    firstImpact: null, // { t, speed } of the first touch-down
    lastImpact: null, // { t, speed } of the most recent touch-down
    bounces: 0,
    atRest: height <= 0,
  }
}

function acceleration(ball, v, g, rho) {
  if (!rho) return -g
  const area = Math.PI * ball.radius * ball.radius
  const drag = 0.5 * rho * SPHERE_CD * area * v * Math.abs(v) / ball.mass
  return -g - drag
}

/**
 * Advance a ball by dt seconds (any size). `t0` is the simulation time at the
 * start of the step, used to time-stamp impacts. Mutates and returns the ball.
 */
export function stepBall(ball, dt, { g, air = false, t0 = 0 }) {
  if (ball.atRest || dt <= 0) return ball
  const rho = air ? AIR_DENSITY : 0
  let t = t0
  let left = dt
  while (left > 1e-12 && !ball.atRest) {
    const h = Math.min(STEP, left)
    // Midpoint (RK2) step: accurate for the smooth flight between impacts.
    const a1 = acceleration(ball, ball.v, g, rho)
    const vMid = ball.v + a1 * h / 2
    const a2 = acceleration(ball, vMid, g, rho)
    const vNext = ball.v + a2 * h
    const yNext = ball.y + vMid * h

    if (yNext > 0) {
      ball.y = yNext
      ball.v = vNext
    } else {
      // Touch-down inside this step: solve y + v·τ + ½·a·τ² = 0 for the exact moment.
      const a = a2
      let tau
      if (Math.abs(a) < 1e-12) tau = -ball.y / ball.v
      else {
        const disc = Math.max(0, ball.v * ball.v - 2 * a * ball.y)
        tau = (-ball.v - Math.sqrt(disc)) / a
        if (!(tau >= 0 && tau <= h)) tau = (-ball.v + Math.sqrt(disc)) / a
        if (!(tau >= 0 && tau <= h)) tau = h
      }
      const vImpact = ball.v + a * tau
      const speed = Math.abs(vImpact)
      const impact = { t: t + tau, speed }
      if (!ball.firstImpact) ball.firstImpact = impact
      ball.lastImpact = impact
      ball.y = 0
      const rebound = ball.restitution * speed
      if (rebound < REST_SPEED) {
        ball.v = 0
        ball.atRest = true
      } else {
        ball.v = rebound
        ball.bounces += 1
        // Continue the remainder of this step on the way back up.
        const rest = h - tau
        ball.y = Math.max(0, ball.v * rest - 0.5 * g * rest * rest)
        ball.v = ball.v - g * rest
      }
    }
    t += h
    left -= h
  }
  return ball
}

/** Exact vacuum first-impact time, √(2h/g). */
export const vacuumFallTime = (h, g) => Math.sqrt((2 * h) / g)

/** Terminal speed in air, √(2mg / (ρ·Cd·A)). */
export const terminalSpeed = (mass, radius, g) =>
  Math.sqrt((2 * mass * g) / (AIR_DENSITY * SPHERE_CD * Math.PI * radius * radius))
