import { describe, it, expect } from 'vitest'
import { BENCH, G, HAND, makePull, reading, simulatePull, steady, stepPull } from './pull'

describe('pulling a block with a spring balance', () => {
  it('the block stays still while the pull grows, until it reaches μs·N', () => {
    const s = makePull(0.5)
    stepPull(s, 0.5)
    expect(s.xb).toBe(0)
    expect(s.sliding).toBe(false)
    expect(reading(s)).toBeGreaterThan(0)
  })
  it('the reading peaks at μs·N, the moment it slips', () => {
    for (const m of [0.5, 0.9, 1.3]) {
      const s = simulatePull(m, 8)
      expect(s.slippedAt).not.toBeNull()
      expect(s.peak).toBeCloseTo(BENCH.mus * m * G, 1)
    }
  })
  it('then it settles lower, at about μk·N, with the block following the hand', () => {
    for (const m of [0.5, 0.9, 1.3]) {
      const s = makePull(m)
      let sum = 0, n = 0
      while (s.t < 10) { stepPull(s, 0.01); if (steady(s)) { sum += reading(s); n++ } }
      expect(n).toBeGreaterThan(100)
      expect(sum / n / (BENCH.muk * m * G)).toBeCloseTo(1, 1)
      expect(s.vb).toBeCloseTo(HAND, 2)
    }
  })
  it('never sticks again once it is going', () => {
    const s = makePull(1.3)
    let stuck = false
    while (s.t < 10) { stepPull(s, 0.01); if (s.slippedAt && !s.sliding) stuck = true }
    expect(stuck).toBe(false)
  })
  it('does not depend on the frame size', () => {
    const a = makePull(0.7), b = makePull(0.7)
    for (let t = 0; t < 5; t += 0.05) stepPull(a, 0.05)
    for (let t = 0; t < 5; t += 0.007) stepPull(b, 0.007)
    stepPull(b, a.t - b.t)
    expect(a.xb).toBeCloseTo(b.xb, 4); expect(reading(a)).toBeCloseTo(reading(b), 2)
  })
})
