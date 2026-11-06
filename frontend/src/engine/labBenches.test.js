import { describe, it, expect } from 'vitest'
import {
  AIR_TRACK, G, OHM_RANGE, PENDULUM_LENGTHS, RAMP, RAMP_SURFACES, TRACK,
  blockAt, cartAt, collide, gateReadings, glidersAt, glidersRun, lensImage, needleAngle, ohmBench, opticsState, rampRun, smallAnglePeriod, stepSwing, swingPeriod,
} from './labBenches'

const surface = id => RAMP_SURFACES.find(s => s.id === id)

describe('motion track', () => {
  it('a steady cart has the same speed between the gates as its push', () => {
    expect(gateReadings(0.5, 0).speed).toBeCloseTo(0.5, 10)
  })
  it('an accelerating cart moves faster between gates than its starting push', () => {
    expect(gateReadings(0.3, 0.2).speed).toBeGreaterThan(0.3)
  })
  it('a cart that brakes too hard never reaches the second gate', () => {
    const r = gateReadings(0.6, -0.3) // stops after 0.6 m: past the first gate, short of the second
    expect(r.t1).not.toBeNull()
    expect(r.t2).toBeNull()
  })
  it('stops at the end of the track', () => {
    expect(cartAt(30, 0.5, 0).x).toBeCloseTo(TRACK.end, 10)
  })
})

describe('friction ramp', () => {
  it('slides only where tan θ beats static friction', () => {
    expect(Math.tan(RAMP.angle)).toBeCloseTo(0.2533, 3)
    expect(rampRun(surface('polished')).slides).toBe(true)
    expect(rampRun(surface('wood')).slides).toBe(false)
    expect(rampRun(surface('rubber')).slides).toBe(false)
  })
  it('acceleration is g(sin θ − μk cos θ), and the end speed matches v² = 2as', () => {
    const s = surface('polished')
    const r = rampRun(s)
    expect(r.a).toBeCloseTo(G * (Math.sin(RAMP.angle) - s.muk * Math.cos(RAMP.angle)), 10)
    expect(r.endSpeed ** 2).toBeCloseTo(2 * r.a * RAMP.length, 8)
  })
  it('a block that does not slide stays at the top', () => {
    expect(blockAt(5, surface('rubber')).s).toBe(0)
  })
  it('the block travels exactly the ramp length, down the ramp', () => {
    const s = surface('polished')
    const end = blockAt(100, s)
    expect(end.s).toBeCloseTo(RAMP.length, 8)
    expect(end.x).toBeLessThan(RAMP.high.x)
    expect(end.y).toBeLessThan(RAMP.high.y)
  })
})

describe('air track', () => {
  it('equal masses, elastic: the moving glider stops and the other takes its speed', () => {
    const { va, vb } = collide(1, 1, 0.4, 0, 1)
    expect(va).toBeCloseTo(0, 10)
    expect(vb).toBeCloseTo(0.4, 10)
  })
  it('sticking together: both share one speed', () => {
    const { va, vb } = collide(1, 3, 0.4, 0, 0)
    expect(va).toBeCloseTo(0.1, 10)
    expect(vb).toBeCloseTo(0.1, 10)
  })
  it.each([[1], [0], [0.5]])('momentum is conserved for any bounce (e = %s)', e => {
    const run = glidersRun({ ma: 0.2, mb: 0.6, ua: 0.5, e })
    expect(run.final.momentum).toBeCloseTo(run.before.momentum, 10)
  })
  it('kinetic energy is kept when elastic and lost when they stick', () => {
    expect(glidersRun({ ma: 0.2, mb: 0.6, ua: 0.5, e: 1 }).final.energy).toBeCloseTo(0.5 * 0.2 * 0.25, 10)
    expect(glidersRun({ ma: 0.2, mb: 0.6, ua: 0.5, e: 0 }).final.energy).toBeLessThan(0.5 * 0.2 * 0.25)
  })
  it('the gliders touch at the collision and never pass through each other', () => {
    const run = glidersRun({ ma: 0.2, mb: 0.2, ua: 0.5, e: 1 })
    const at = glidersAt(run.hit, run)
    expect(at.b - at.a).toBeCloseTo(AIR_TRACK.width, 8)
    for (let t = 0; t <= run.end; t += 0.01) {
      const s = glidersAt(t, run)
      expect(s.b - s.a).toBeGreaterThanOrEqual(AIR_TRACK.width - 1e-9)
      expect(s.a).toBeGreaterThanOrEqual(AIR_TRACK.min - 1e-9)
      expect(s.b).toBeLessThanOrEqual(AIR_TRACK.max + 1e-9)
    }
  })
})

describe('pendulums', () => {
  it('matches T = 2π√(L/g) at small swings', () => {
    const L = PENDULUM_LENGTHS[0]
    expect(swingPeriod(L, 0.01)).toBeCloseTo(smallAnglePeriod(L), 3)
  })
  it('a longer string swings more slowly', () => {
    const [a, b, c] = PENDULUM_LENGTHS.map(L => swingPeriod(L, 0.1))
    expect(a).toBeGreaterThan(b)
    expect(b).toBeGreaterThan(c)
  })
  it('a big swing is slightly slower than the formula, as real pendulums are', () => {
    const L = PENDULUM_LENGTHS[1]
    const big = (15 * Math.PI) / 180
    expect(swingPeriod(L, big) / smallAnglePeriod(L)).toBeCloseTo(1 + big * big / 16, 3)
  })
  it('keeps swinging to the same height: energy is not lost by the solver', () => {
    const L = PENDULUM_LENGTHS[2]
    const s = { theta: 0.2, omega: 0 }
    stepSwing(s, swingPeriod(L, 0.2) * 5, L)
    expect(s.theta).toBeCloseTo(0.2, 3)
  })
  it('gives the same result however the steps are divided', () => {
    const L = PENDULUM_LENGTHS[0]
    const one = stepSwing({ theta: 0.2, omega: 0 }, 2, L)
    const many = { theta: 0.2, omega: 0 }
    for (let i = 0; i < 100; i++) stepSwing(many, 0.02, L)
    expect(many.theta).toBeCloseTo(one.theta, 6)
  })
})

describe('optics bench', () => {
  it('object at 2f: image at 2f, the same size', () => {
    const r = lensImage(0.6, 0.3)
    expect(r.v).toBeCloseTo(0.6, 10)
    expect(r.magnification).toBeCloseTo(1, 10)
  })
  it('inside the focal length, no image falls on a screen', () => {
    expect(lensImage(0.2, 0.3).real).toBe(false)
  })
  it('is sharp only when the screen is at the image distance', () => {
    const lens = 9.3 // u = 0.6
    expect(opticsState(lens, lens + 0.6, 0.3).sharp).toBe(true)
    expect(opticsState(lens, lens + 0.9, 0.3).sharp).toBe(false)
  })
})

describe("Ohm's law bench", () => {
  it('current is V ÷ total resistance, and V = IR holds across the rheostat', () => {
    const b = ohmBench(12, 20)
    expect(b.I).toBeCloseTo(12 / 40, 10)
    expect(b.rheostatVolts).toBeCloseTo(b.I * 20, 6)
  })
  it('never goes off the meter scales at any setting', () => {
    const [vMax] = [OHM_RANGE.volts[1]]
    const b = ohmBench(vMax, OHM_RANGE.rheostat[0])
    expect(b.I).toBeLessThanOrEqual(OHM_RANGE.ammeter)
    expect(ohmBench(vMax, OHM_RANGE.rheostat[1]).rheostatVolts).toBeLessThanOrEqual(OHM_RANGE.voltmeter)
  })
  it('more resistance means less current and dimmer bulbs', () => {
    expect(ohmBench(12, 50).bulbWatts).toBeLessThan(ohmBench(12, 5).bulbWatts)
  })
  it('needles sweep from one end of the dial to the other', () => {
    expect(needleAngle(0, 1)).toBeCloseTo(-needleAngle(1, 1), 10)
    expect(needleAngle(0.5, 1)).toBeCloseTo(0, 10)
    expect(needleAngle(5, 1)).toBe(needleAngle(1, 1))
  })
})
