/**
 * VISIORA — gliders on an air track (Class 9: Force and laws of motion · momentum).
 * Two gliders ride on a cushion of air along a 2 m track (x in metres, to the right).
 *   coasting      a little air drag: each glider loses about 1 % of its speed per second
 *   colliding     momentum is shared by the bumpers between them, with restitution e:
 *                 v1' = ((m1 − e·m2)·v1 + (1 + e)·m2·v2) / (m1 + m2)   and likewise v2'
 *                 e ≈ 0.95 for spring bumpers, 0 for velcro (they stick and move together)
 *   end stops     rubber bands at each end throw a glider back with e = 0.8 of its speed; the
 *                 stop is outside the two gliders, so their total momentum changes there
 * The moment of a collision is found inside its 1 ms step, so the result never depends on the
 * frame rate. Light gates time a 10 cm card on each glider: v = card length ÷ time blocked.
 */
export const TRACK = { length: 2.0, glider: 0.16, card: 0.1 } // m
export const STEP = 0.001
export const AIR_DRAG = 0.01 // 1/s
export const END_E = 0.8
export const BUMPERS = { spring: { label: 'Spring bumpers', e: 0.95 }, velcro: { label: 'Velcro (they stick)', e: 0 } }

/** A track with two gliders: [{ m, x (left edge), v }], gates at fixed places. */
export function makeTrack(gliders, { e = BUMPERS.spring.e, gates = [0.55, 1.3] } = {}) {
  return {
    t: 0, e, stuck: false, collisions: 0, firstHit: null, lastHit: null,
    g: gliders.map(g => ({ m: g.m, x: g.x, v: g.v })),
    gates: gates.map(x => ({ x, passes: [] })), // passes: { glider, start, end, time, dir }
    open: [], // a card currently blocking a gate: { gate, glider, start }
  }
}

const momentum = s => s.g.reduce((p, g) => p + g.m * g.v, 0)
const energy = s => s.g.reduce((k, g) => k + 0.5 * g.m * g.v * g.v, 0)
export const totals = s => ({ p: momentum(s), ke: energy(s) })

/** Velocities just after two gliders meet with restitution e. */
export function collide(m1, v1, m2, v2, e) {
  return [((m1 - e * m2) * v1 + (1 + e) * m2 * v2) / (m1 + m2), ((m2 - e * m1) * v2 + (1 + e) * m1 * v1) / (m1 + m2)]
}

/** Where each glider's card sits: its middle. */
const cardSpan = g => [g.x + TRACK.glider / 2 - TRACK.card / 2, g.x + TRACK.glider / 2 + TRACK.card / 2]

/** When inside the step a card edge crossed the gate (0…1 of the step), else 1. */
function crossing(x, e0, e1) {
  if (e0 === e1 || (x - e0) * (x - e1) > 0) return 1
  return (x - e0) / (e1 - e0)
}

function gateEvents(s, prev, h) {
  const t0 = s.t - h
  s.g.forEach((g, i) => {
    const [a0, b0] = cardSpan(prev[i]), [a1, b1] = cardSpan(g)
    s.gates.forEach((gate, k) => {
      const blockedBefore = gate.x >= a0 && gate.x <= b0, blockedNow = gate.x >= a1 && gate.x <= b1
      const open = s.open.find(o => o.gate === k && o.glider === i)
      const at = t0 + h * Math.min(crossing(gate.x, a0, a1), crossing(gate.x, b0, b1))
      if (!blockedBefore && blockedNow && !open) s.open.push({ gate: k, glider: i, start: at })
      if (blockedBefore && !blockedNow && open) {
        s.open = s.open.filter(o => o !== open)
        gate.passes.push({ glider: i, start: open.start, end: at, time: at - open.start, dir: Math.sign(g.v) })
      }
    })
  })
}

/** Advance the track by dt seconds. Mutates and returns it. */
export function stepTrack(s, dt) {
  let left = dt
  const [A, B] = s.g
  while (left > 1e-12) {
    const h = Math.min(STEP, left)
    const prev = s.g.map(g => ({ ...g }))
    // coast: exact exponential slowdown from air drag over this step
    const decay = Math.exp(-AIR_DRAG * h)
    for (const g of s.g) { g.x += g.v * (1 - decay) / AIR_DRAG; g.v *= decay }
    // the gliders meet: find when inside the step, swap momentum there, carry on
    const gap = B.x - (A.x + TRACK.glider), gap0 = prev[1].x - (prev[0].x + TRACK.glider)
    if (!s.stuck && gap < 0 && gap0 >= -1e-9 && A.v - B.v > 0) {
      const frac = gap0 / Math.max(1e-12, gap0 - gap)
      // rewind to the touch, collide, then use the rest of the step
      A.x = prev[0].x + (A.x - prev[0].x) * frac; B.x = prev[1].x + (B.x - prev[1].x) * frac
      const before = [A.v, B.v]
      ;[A.v, B.v] = collide(A.m, A.v, B.m, B.v, s.e)
      s.collisions += 1
      s.lastHit = { t: s.t + h * frac, before, after: [A.v, B.v] }
      if (!s.firstHit) s.firstHit = s.lastHit
      if (s.e === 0) s.stuck = true
      const rest = h * (1 - frac)
      for (const g of s.g) g.x += g.v * rest
    }
    if (s.stuck) { const v = (A.m * A.v + B.m * B.v) / (A.m + B.m); A.v = v; B.v = v; B.x = A.x + TRACK.glider }
    // the end stops
    for (const g of s.g) {
      if (g.x < 0 && g.v < 0) { g.x = -g.x; g.v = -END_E * g.v }
      const far = TRACK.length - TRACK.glider
      if (g.x > far && g.v > 0) { g.x = 2 * far - g.x; g.v = -END_E * g.v }
    }
    if (s.stuck) { // a stuck pair bounces off the ends together
      if (A.x < 0) A.x = 0
      B.x = A.x + TRACK.glider
      if (B.x > TRACK.length - TRACK.glider) { B.x = TRACK.length - TRACK.glider; A.x = B.x - TRACK.glider }
    }
    s.t += h; left -= h
    gateEvents(s, prev, h)
  }
  return s
}

/** Run until both gliders have been through the collision and cleared the gates (or tMax). */
export function runCollision(gliders, opts = {}, tMax = 6) {
  const s = makeTrack(gliders, opts)
  while (s.t < tMax) {
    stepTrack(s, 0.01)
    if (s.collisions > 0 && s.gates.every(gt => gt.passes.length >= 2 || s.g.every(g => Math.abs(g.v) < 0.005))) break
  }
  return s
}

/** The speed a light gate measures: card length ÷ time it was blocked. */
export const gateSpeed = pass => TRACK.card / pass.time
