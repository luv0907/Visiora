import { describe, it, expect } from 'vitest'
import { OBJECTS, acceleration, simulateDrop, terminalSpeed, vacuumTime, floats, dropObject, stepObject } from './fall'
import { planet } from './planets'

const world = id => ({ g: planet(id).g, rho: planet(id).rho })

describe('falling on other worlds', () => {
  it('on the Moon the hammer and the feather land together, after √(2h/g)', () => {
    const h = 1.6
    const a = simulateDrop('hammer', h, world('moon')), b = simulateDrop('feather', h, world('moon'))
    expect(a.landed.t).toBeCloseTo(vacuumTime(h, 1.62), 3)
    expect(Math.abs(a.landed.t - b.landed.t)).toBeLessThan(1e-6)
  })
  it('on Earth the hammer wins easily, and the feather drifts down near its terminal speed', () => {
    const a = simulateDrop('hammer', 1.6, world('earth')), b = simulateDrop('feather', 1.6, world('earth'))
    expect(a.landed.t).toBeLessThan(0.6)
    expect(b.landed.t).toBeGreaterThan(1.3)
    const vt = terminalSpeed('feather', world('earth'))
    expect(vt).toBeGreaterThan(0.8); expect(vt).toBeLessThan(1.6)
    expect(b.landed.speed).toBeCloseTo(vt, 1)
  })
  it('the helium balloon rises on Earth, but falls like a stone on the Moon', () => {
    expect(floats('balloon', 1.225)).toBe(true)
    const up = simulateDrop('balloon', 2, world('earth'), { ceiling: 10 })
    expect(up.stuck).toBeTruthy(); expect(up.landed).toBeNull()
    const down = simulateDrop('balloon', 2, world('moon'))
    expect(down.landed.t).toBeCloseTo(vacuumTime(2, 1.62), 3)
    expect(floats('balloon', 0.020)).toBe(false) // Mars' air is too thin to hold it up
  })
  it('a beach ball feels the air push up on it (buoyancy) but still falls, because it is full of air', () => {
    const o = OBJECTS.beach
    const a0 = acceleration(o, 0, 9.81, 1.225)
    // released from rest: net pull is the shell's weight, shared with the inner air and the air it shoves
    const expected = -(0.15 * 9.81) / (o.mass + 0.5 * 1.225 * o.volume)
    expect(a0).toBeCloseTo(expected, 6)
    expect(a0).toBeGreaterThan(-9.81 * 0.75)
  })
  it('thick Venus air slows even a steel ball: terminal speed about 1/7 of Earth’s', () => {
    const ratio = terminalSpeed('steel', world('venus')) / terminalSpeed('steel', world('earth'))
    expect(ratio).toBeGreaterThan(0.1); expect(ratio).toBeLessThan(0.18)
  })
  it('bounces back with e·v and settles, and the result does not depend on the frame size', () => {
    const coarse = dropObject('steel', 2), fine = dropObject('steel', 2)
    for (let t = 0; t < 3; t += 0.05) stepObject(coarse, 0.05, world('moon'))
    for (let t = 0; t < 3; t += 0.005) stepObject(fine, 0.005, world('moon'))
    expect(coarse.landed.t).toBeCloseTo(fine.landed.t, 6)
    expect(coarse.bounces).toBe(fine.bounces)
    const s = simulateDrop('steel', 2, world('moon'))
    expect(s.rest).toBe(true); expect(s.bounces).toBeGreaterThan(1)
  })
  it('heavier does not mean faster when there is no air', () => {
    const a = simulateDrop('steel', 5, world('mars')), b = simulateDrop('paper', 5, world('mars'))
    expect(Math.abs(a.landed.t - b.landed.t)).toBeLessThan(0.02) // thin Martian air barely matters
  })
})
