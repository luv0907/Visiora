import { describe, it, expect } from 'vitest'
import { bestAngle, launch, rangeOf, simulateFlight, stepFlight } from './flight'
import { flightTime, levelRange, apex } from './projectile'

const vacuum = { g: 9.81, rho: 0 }
const air = { g: 9.81, rho: 1.225 }

describe('a thrown ball', () => {
  it('with no air it matches the exact formulas: range, flight time, highest point', () => {
    for (const theta of [20, 45, 70]) {
      const s = simulateFlight('cricket', { u: 15, theta }, vacuum, { untilLanded: true })
      expect(s.landed.x).toBeCloseTo(levelRange(15, theta, 9.81), 3)
      expect(s.landed.t).toBeCloseTo(flightTime({ h: 0, u: 15, theta, g: 9.81 }), 3)
      expect(s.top.y).toBeCloseTo(apex({ h: 0, u: 15, theta, g: 9.81 }).y, 3)
    }
  })
  it('from a height, a sideways throw lands at the same time as a drop', () => {
    const thrown = simulateFlight('cricket', { u: 12, theta: 0, h: 5 }, vacuum, { untilLanded: true })
    const dropped = simulateFlight('cricket', { u: 0, theta: 0, h: 5 }, vacuum, { untilLanded: true })
    expect(thrown.landed.t).toBeCloseTo(dropped.landed.t, 6)
    expect(thrown.landed.t).toBeCloseTo(Math.sqrt(10 / 9.81), 3)
  })
  it('with no air, 45° throws furthest on level ground', () => {
    expect(bestAngle('cricket', { u: 15 }, vacuum).theta).toBe(45)
  })
  it('with air, the best angle drops below 45°, and much more for a light ball', () => {
    const cricket = bestAngle('cricket', { u: 30 }, air).theta
    const pingpong = bestAngle('pingpong', { u: 30 }, air).theta
    expect(cricket).toBeLessThan(45); expect(cricket).toBeGreaterThan(35)
    expect(pingpong).toBeLessThan(cricket)
  })
  it('air shortens a table tennis ball’s flight far more than a shot put’s', () => {
    const shot = rangeOf('shot', { u: 13, theta: 40 }, air) / rangeOf('shot', { u: 13, theta: 40 }, vacuum)
    const ping = rangeOf('pingpong', { u: 13, theta: 40 }, air) / rangeOf('pingpong', { u: 13, theta: 40 }, vacuum)
    expect(shot).toBeGreaterThan(0.99)
    expect(ping).toBeLessThan(0.6)
  })
  it('bounces back with e times the down speed, then rolls to a stop', () => {
    const s = launch('football', { u: 10, theta: 60 })
    let first = null
    while (!s.rest && s.t < 30) { stepFlight(s, 0.01, vacuum); if (s.bounces === 1 && first == null) first = s.vy }
    const vyHit = 10 * Math.sin(Math.PI / 3)
    expect(first).toBeCloseTo(0.7 * vyHit, 1)
    expect(s.rest).toBe(true)
    expect(s.x).toBeGreaterThan(levelRange(10, 60, 9.81))
  })
  it('does not depend on the frame size', () => {
    const a = launch('cricket', { u: 20, theta: 35 }), b = launch('cricket', { u: 20, theta: 35 })
    for (let t = 0; t < 3; t += 0.05) stepFlight(a, 0.05, air)
    for (let t = 0; t < 3; t += 0.004) stepFlight(b, 0.004, air)
    expect(a.landed.x).toBeCloseTo(b.landed.x, 6)
  })
})
