import { describe, it, expect } from 'vitest'
import { PLANETS, energy, smallAnglePeriod, stepPendulum, swingTime } from './pendulum'

const g = PLANETS.find(p => p.id === 'earth').g

describe('pendulum', () => {
  it('matches T = 2π√(L/g) for small swings', () => {
    expect(swingTime(1, g, 0.01)).toBeCloseTo(smallAnglePeriod(1, g), 3)
  })

  it('a 1 m pendulum on Earth takes about 2.0 s per swing', () => {
    expect(swingTime(1, g, 0.05)).toBeCloseTo(2.006, 2)
  })

  it('big swings are slower, as T ≈ T₀(1 + θ²/16) predicts', () => {
    const big = 0.35
    expect(swingTime(1, g, big) / smallAnglePeriod(1, g)).toBeCloseTo(1 + big * big / 16, 3)
  })

  it('weaker gravity means slower swings: the Moon is about 2.5× slower', () => {
    const moon = PLANETS.find(p => p.id === 'moon').g
    expect(swingTime(1, moon, 0.1) / swingTime(1, g, 0.1)).toBeCloseTo(Math.sqrt(g / moon), 3)
  })

  it('keeps its energy: total stays the same as it swings', () => {
    const s = { theta: 0.4, omega: 0 }
    const total = st => { const e = energy(st, 1.2, g, 2); return e.kinetic + e.potential }
    const start = total(s)
    for (let i = 0; i < 500; i++) stepPendulum(s, 0.013, 1.2, g)
    expect(total(s)).toBeCloseTo(start, 6)
  })

  it('gives the same answer however the time is cut up', () => {
    const one = stepPendulum({ theta: 0.3, omega: 0 }, 3, 1, g)
    const many = { theta: 0.3, omega: 0 }
    for (let i = 0; i < 150; i++) stepPendulum(many, 0.02, 1, g)
    expect(many.theta).toBeCloseTo(one.theta, 8)
  })

  it('with air friction the swings die down, and more friction stops it sooner', () => {
    const total = st => { const e = energy(st, 1, g, 1); return e.kinetic + e.potential }
    const some = { theta: 0.4, omega: 0 }, lots = { theta: 0.4, omega: 0 }
    const start = total(some)
    stepPendulum(some, 20, 1, g, 0.05)
    stepPendulum(lots, 20, 1, g, 0.3)
    expect(total(some)).toBeLessThan(start)
    expect(total(lots)).toBeLessThan(total(some))
    // energy falls as e^(−b·t): after 20 s with b = 0.05, about e^(−1) ≈ 37% is left
    expect(total(some) / start).toBeCloseTo(Math.exp(-0.05 * 20), 1)
  })

  it('mass is not part of the motion at all', () => {
    expect(stepPendulum.length).toBe(4) // state, dt, L, g: no mass
  })
})
