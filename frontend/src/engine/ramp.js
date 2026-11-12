/**
 * VISIORA — a block on a ramp you can tilt (Class 9: friction · resolving forces).
 * Along the slope the weight pulls down with m·g·sin θ; into the slope it presses with
 * m·g·cos θ, and the ramp pushes back with that normal force N.
 *   held still   static friction matches the pull, up to μs·N: the block stays while tan θ ≤ μs
 *   sliding      a = g·(sin θ − μk·cos θ) down the slope. μk < μs, so once it is going it keeps
 *                going even below the angle it slipped at, and only slows (and sticks) when
 *                tan θ < μk
 *   the bottom   a wooden stop catches it
 * No two tries are quite alike: the grip differs a little from try to try (a speck of dust,
 * a slightly different spot), so the slipping angle scatters by about a degree, as it does on a
 * real bench. Steps are 1 ms; the moment it stops is found exactly inside its step.
 */
export const G = 9.8
export const RAMP = { length: 1.2, start: 0.1 } // m along the slope, from the top
export const BLOCKS = {
  wood: { label: 'Wood on wood', mus: 0.45, muk: 0.32, colour: '#C8925B' },
  rubber: { label: 'Rubber on wood', mus: 0.8, muk: 0.6, colour: '#4A4668' },
  ice: { label: 'Ice on wood', mus: 0.12, muk: 0.06, colour: '#BFE3F2' },
  none: { label: 'No friction', mus: 0, muk: 0, colour: '#9C9AAE' },
}
const STEP = 0.001
const rad = d => (d * Math.PI) / 180

/** This try's grip: within about ±3 % of the surface's, the same for the same try number. */
export function gripFor(kind, trial = 0) {
  const b = BLOCKS[kind]
  if (!trial) return { mus: b.mus, muk: b.muk }
  const wobble = Math.sin(trial * 12.9898 + b.mus * 78.233) * 0.03
  return { mus: b.mus * (1 + wobble), muk: b.muk * (1 + wobble * 0.5) }
}

export function makeBlock(kind, { m = 0.5, angle = 0, trial = 0, v0 = 0 } = {}) {
  return { kind, m, angle, ...gripFor(kind, trial), s: RAMP.start, v: v0, sliding: v0 > 0, slipAngle: null, atBottom: false, t: 0 }
}

/** All the forces on the block right now (newtons; + is down the slope). */
export function rampForces(b) {
  const th = rad(b.angle), W = b.m * G
  const along = W * Math.sin(th), N = W * Math.cos(th)
  let friction
  if (b.atBottom) friction = 0
  else if (!b.sliding) friction = -Math.min(along, b.mus * N)
  else friction = -b.muk * N
  const stop = b.atBottom ? -along : 0 // the stop at the bottom holds it
  return { W, along, N, friction, stop, net: along + friction + stop, grip: b.mus * N }
}

/** Advance by dt seconds with the ramp at b.angle (degrees). Mutates and returns it. */
export function stepBlock(b, dt) {
  let left = dt
  while (left > 1e-12) {
    const h = Math.min(STEP, left)
    const th = rad(b.angle)
    if (b.atBottom) { b.t += left; break }
    if (!b.sliding) {
      if (Math.tan(th) > b.mus) { b.sliding = true; b.slipAngle = b.angle } else { b.t += left; break }
    }
    const a = G * (Math.sin(th) - b.muk * Math.cos(th))
    let used = h
    if (a < 0 && b.v + a * h <= 0) {
      // friction brings it to rest inside this step: it sticks if the grip can hold it there
      used = -b.v / a
      b.s += b.v * used + 0.5 * a * used * used; b.v = 0
      b.sliding = Math.tan(th) > b.mus
    } else {
      b.s += b.v * h + 0.5 * a * h * h; b.v += a * h
    }
    if (b.s >= RAMP.length) { b.s = RAMP.length; b.v = 0; b.sliding = false; b.atBottom = true }
    b.t += used; left -= used
    if (!b.sliding && !b.atBottom) { b.t += left; break }
  }
  return b
}

/** Tilt the ramp up from `from` degrees at `rate` °/s until the block slips (or maxAngle). */
export function tiltUntilSlip(kind, { m = 0.5, trial = 0, rate = 2, from = 0, maxAngle = 60 } = {}) {
  const b = makeBlock(kind, { m, trial, angle: from })
  while (!b.sliding && b.angle < maxAngle) { b.angle = Math.min(maxAngle, b.angle + rate * 0.01); stepBlock(b, 0.01) }
  return b
}

/** Release from rest at a fixed angle; time to slide `dist` metres (or null if it never gets there). */
export function slideTime(kind, angle, { m = 0.5, trial = 0, dist = 1.0, tMax = 20 } = {}) {
  const b = makeBlock(kind, { m, trial, angle })
  while (b.s - RAMP.start < dist && b.t < tMax && (b.sliding || b.t === 0)) {
    const s0 = b.s, t0 = b.t
    stepBlock(b, 0.001)
    if (b.s - RAMP.start >= dist) return t0 + (b.t - t0) * (RAMP.start + dist - s0) / (b.s - s0)
  }
  return null
}
