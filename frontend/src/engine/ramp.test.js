import { describe, it, expect } from 'vitest'
import { BLOCKS, G, makeBlock, rampForces, slideTime, stepBlock, tiltUntilSlip } from './ramp'

const deg = r => (r * 180) / Math.PI

describe('a block on a tilting ramp', () => {
  it('stays still below the slipping angle, with friction exactly matching the pull', () => {
    const b = makeBlock('wood', { angle: 20 })
    stepBlock(b, 2)
    expect(b.s).toBe(0.1); expect(b.sliding).toBe(false)
    const f = rampForces(b)
    expect(f.net).toBeCloseTo(0, 9)
  })
  it('slips when tan θ passes μs, whatever the mass', () => {
    for (const m of [0.1, 0.5, 2]) expect(tiltUntilSlip('wood', { m }).slipAngle).toBeCloseTo(deg(Math.atan(BLOCKS.wood.mus)), 1)
  })
  it('slides with a = g(sin θ − μk cos θ): from rest, 1 m takes √(2/a)', () => {
    const th = (35 * Math.PI) / 180, a = G * (Math.sin(th) - BLOCKS.wood.muk * Math.cos(th))
    expect(slideTime('wood', 35)).toBeCloseTo(Math.sqrt(2 / a), 3)
  })
  it('once sliding, it keeps going below the slipping angle, while tan θ > μk', () => {
    const b = tiltUntilSlip('wood')
    b.angle = 20 // tan 20° = 0.36: below μs = 0.45, above μk = 0.32
    const v0 = b.v
    stepBlock(b, 0.3)
    expect(b.sliding).toBe(true); expect(b.v).toBeGreaterThan(v0)
  })
  it('below the μk angle a moving block slows down and sticks', () => {
    const b = makeBlock('wood', { angle: 15, v0: 0.5 })
    for (let t = 0; t < 2; t += 0.01) stepBlock(b, 0.01)
    expect(b.v).toBe(0); expect(b.sliding).toBe(false); expect(b.atBottom).toBe(false)
  })
  it('the stop at the bottom catches it', () => {
    const b = makeBlock('ice', { angle: 30 })
    for (let t = 0; t < 3; t += 0.01) stepBlock(b, 0.01)
    expect(b.atBottom).toBe(true); expect(rampForces(b).net).toBeCloseTo(0, 9)
  })
  it('the slipping angle scatters by about a degree from try to try', () => {
    const angles = [1, 2, 3, 4, 5].map(trial => tiltUntilSlip('wood', { trial }).slipAngle)
    const spread = Math.max(...angles) - Math.min(...angles)
    expect(spread).toBeGreaterThan(0.3); expect(spread).toBeLessThan(2.5)
  })
  it('does not depend on the frame size', () => {
    const a = makeBlock('wood', { angle: 40 }), b = makeBlock('wood', { angle: 40 })
    for (let i = 0; i < 10; i++) stepBlock(a, 0.05)
    for (let i = 0; i < 100; i++) stepBlock(b, 0.005)
    expect(a.s).toBeCloseTo(b.s, 6)
  })
})
