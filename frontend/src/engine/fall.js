/**
 * VISIORA — dropping things on other worlds (Class 9: Gravitation · free fall).
 * One object at a time, released from rest at height h above the ground (y up, metres):
 *   weight      −m·g               (m is everything that moves: shell and the gas inside)
 *   buoyancy    +ρ·V·g             the air it pushes aside (Archimedes)
 *   drag        −½·ρ·Cd·A·v·|v|    always against the motion
 *   inertia     m + ½·ρ·V          the air it has to push aside moves too ("added mass")
 * In a vacuum (the Moon) the last three vanish and everything falls together, √(2h/g).
 * On the ground a bounce returns e·v; on a ceiling (a balloon rising) it stops there.
 * Stepped with fixed 1 ms RK4 sub-steps, so the result never depends on the frame rate; the
 * moment of landing is found inside the step, to well under a millisecond.
 */
export const STEP = 0.001 // s

const sphere = r => (4 / 3) * Math.PI * r ** 3

/**
 * Things to drop. mass is the total moving mass (a beach ball's shell plus the air inside it, a
 * balloon's rubber plus its helium); volume is what it displaces; area and Cd set its drag.
 */
export const OBJECTS = {
  hammer: { label: 'Hammer', mass: 1.32, volume: 0.00025, area: 0.0035, cd: 1.0, e: 0.1, size: 0.3 }, // Apollo 15's geology hammer
  feather: { label: 'Feather', mass: 0.0015, volume: 0.000002, area: 0.012, cd: 1.5, e: 0, size: 0.28 },
  steel: { label: 'Steel ball', mass: 0.263, volume: sphere(0.02), area: Math.PI * 0.02 ** 2, cd: 0.47, e: 0.55, size: 0.04 },
  beach: { label: 'Beach ball', mass: 0.15 + 1.225 * sphere(0.2), volume: sphere(0.2), area: Math.PI * 0.2 ** 2, cd: 0.47, e: 0.75, size: 0.4 },
  balloon: { label: 'Helium balloon', mass: 0.004 + 0.1786 * sphere(0.15), volume: sphere(0.15), area: Math.PI * 0.15 ** 2, cd: 0.47, e: 0.6, size: 0.3 },
  paper: { label: 'Paper ball', mass: 0.005, volume: sphere(0.03), area: Math.PI * 0.03 ** 2, cd: 0.6, e: 0.2, size: 0.06 },
}

/** Acceleration (m/s², up positive) of an object moving at v in air of density rho. */
export function acceleration(o, v, g, rho) {
  const inertia = o.mass + 0.5 * rho * o.volume
  const force = -o.mass * g + rho * o.volume * g - 0.5 * rho * o.cd * o.area * v * Math.abs(v)
  return force / inertia
}

const REST = 0.05 // m/s: a bounce smaller than this is too small to see, so it settles

export function dropObject(kind, height, { ceiling = Infinity } = {}) {
  return { kind, o: OBJECTS[kind], y: height, v: 0, t: 0, top: height, ceiling, landed: null, stuck: null, bounces: 0, rest: false, vMax: 0 }
}

/** Advance one dropped object by dt seconds in a world { g, rho }. Mutates and returns it. */
export function stepObject(s, dt, { g, rho }) {
  let left = dt
  const f = v => acceleration(s.o, v, g, rho)
  while (left > 1e-12 && !s.rest) {
    const h = Math.min(STEP, left)
    // RK4 on (y, v)
    const k1v = f(s.v), k1y = s.v
    const k2v = f(s.v + (h / 2) * k1v), k2y = s.v + (h / 2) * k1v
    const k3v = f(s.v + (h / 2) * k2v), k3y = s.v + (h / 2) * k2v
    const k4v = f(s.v + h * k3v), k4y = s.v + h * k3v
    const vNext = s.v + (h / 6) * (k1v + 2 * k2v + 2 * k3v + k4v)
    const yNext = s.y + (h / 6) * (k1y + 2 * k2y + 2 * k3y + k4y)
    if (yNext <= 0 && s.v <= 0) {
      // the exact moment it touches the ground, by linear interpolation inside this 1 ms step
      const frac = s.y / Math.max(1e-12, s.y - yNext)
      const vHit = s.v + frac * (vNext - s.v)
      s.t += frac * h
      if (!s.landed) s.landed = { t: s.t, speed: -vHit }
      s.y = 0
      const back = -vHit * s.o.e
      if (back < REST) { s.v = 0; s.rest = true } else { s.v = back; s.bounces += 1 }
      left -= frac * h
      continue
    }
    if (yNext >= s.ceiling && vNext > 0) {
      s.t += h; s.y = s.ceiling; s.v = 0; s.rest = true
      if (!s.stuck) s.stuck = { t: s.t }
      break
    }
    s.y = yNext; s.v = vNext; s.t += h; left -= h
    s.top = Math.max(s.top, s.y)
    s.vMax = Math.max(s.vMax, Math.abs(s.v))
  }
  if (s.rest && s.y === 0 && s.v === 0 && left > 0) s.t += left // time keeps running while it lies there
  return s
}

/** Run a drop to the end (landed and settled, or stuck on the ceiling, or tMax). */
export function simulateDrop(kind, height, world, { tMax = 120, ceiling } = {}) {
  const s = dropObject(kind, height, { ceiling })
  while (!s.rest && s.t < tMax) stepObject(s, 0.01, world)
  return s
}

/** Terminal speed √(2(m − ρV)g / (ρ·Cd·A)), or null when it would not fall (or no air). */
export function terminalSpeed(kind, { g, rho }) {
  const o = OBJECTS[kind]
  const net = (o.mass - rho * o.volume) * g
  if (!rho || net <= 0) return null
  return Math.sqrt((2 * net) / (rho * o.cd * o.area))
}

/** Fall time with no air at all. */
export const vacuumTime = (h, g) => Math.sqrt((2 * h) / g)
/** Does it rise instead of fall? */
export const floats = (kind, rho) => OBJECTS[kind].mass < rho * OBJECTS[kind].volume
