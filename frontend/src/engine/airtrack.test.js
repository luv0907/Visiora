import { describe, it, expect } from 'vitest'
import { collide, makeTrack, stepTrack, totals, gateSpeed, TRACK, AIR_DRAG } from './airtrack'

/** Glider A moving right at u into B at rest, run until just after they meet. */
function oneHit(mA, mB, u, e) {
  const s = makeTrack([{ m: mA, x: 0.3, v: u }, { m: mB, x: 1.0, v: 0 }], { e })
  const before = totals(s)
  while (s.collisions === 0) stepTrack(s, 0.01)
  return { s, before, after: totals(s) }
}

describe('gliders on an air track', () => {
  it('momentum is shared, not lost, in any collision between the gliders', () => {
    for (const e of [0, 0.5, 0.95, 1]) {
      const { before, after, s } = oneHit(0.2, 0.3, 0.5, e)
      // allow for the tiny air drag in the time it took to get there
      expect(after.p).toBeCloseTo(before.p * Math.exp(-AIR_DRAG * s.t), 4)
    }
  })
  it('equal gliders, perfectly springy: the moving one stops and the other carries on', () => {
    const [a, b] = collide(0.2, 0.5, 0.2, 0, 1)
    expect(a).toBeCloseTo(0, 9); expect(b).toBeCloseTo(0.5, 9)
  })
  it('a heavy glider hitting a light one sends it off faster than the heavy one came in', () => {
    const [, b] = collide(0.6, 0.5, 0.2, 0, 0.95)
    expect(b).toBeGreaterThan(0.5)
  })
  it('velcro: they stick and move on together at m1·u ÷ (m1 + m2), and kinetic energy is lost', () => {
    const { s, before, after } = oneHit(0.2, 0.2, 0.6, 0)
    expect(s.stuck).toBe(true)
    expect(s.g[0].v).toBeCloseTo(s.g[1].v, 9)
    expect(s.g[0].v).toBeCloseTo(0.3 * Math.exp(-AIR_DRAG * s.t), 3)
    expect(after.ke).toBeLessThan(0.55 * before.ke)
  })
  it('an end stop throws a glider back with 0.8 of its speed, and that changes the momentum', () => {
    const s = makeTrack([{ m: 0.2, x: 0.1, v: 0 }, { m: 0.2, x: 1.6, v: 0.5 }])
    const p0 = totals(s).p
    let flipped = false
    for (let t = 0; t < 1.5; t += 0.01) { stepTrack(s, 0.01); if (s.g[1].v < 0) flipped = true }
    expect(flipped).toBe(true)
    expect(s.g[1].v).toBeCloseTo(-0.8 * 0.5 * Math.exp(-AIR_DRAG * s.t), 3)
    expect(totals(s).p).toBeLessThan(0) // was +0.1, now negative: the stop pushed it
    expect(p0).toBeGreaterThan(0)
  })
  it('a light gate measures the speed from the time the 10 cm card blocks it', () => {
    const s = makeTrack([{ m: 0.2, x: 0.2, v: 0.4 }, { m: 0.2, x: 1.7, v: 0 }], { gates: [0.6] })
    while (s.gates[0].passes.length === 0) stepTrack(s, 0.01)
    const p = s.gates[0].passes[0]
    // the glider has slowed a little from air drag by then: compare with its speed mid-pass
    const vMid = 0.4 * Math.exp(-AIR_DRAG * (p.start + p.end) / 2)
    expect(p.time).toBeCloseTo(TRACK.card / vMid, 4)
    expect(gateSpeed(p)).toBeCloseTo(vMid, 4)
  })
  it('does not depend on the frame size', () => {
    const a = makeTrack([{ m: 0.3, x: 0.3, v: 0.6 }, { m: 0.2, x: 1.0, v: -0.2 }])
    const b = makeTrack([{ m: 0.3, x: 0.3, v: 0.6 }, { m: 0.2, x: 1.0, v: -0.2 }])
    for (let t = 0; t < 2; t += 0.05) stepTrack(a, 0.05)
    for (let t = 0; t < 2; t += 0.004) stepTrack(b, 0.004)
    expect(a.g[0].v).toBeCloseTo(b.g[0].v, 6); expect(a.g[1].x).toBeCloseTo(b.g[1].x, 4)
  })
})
