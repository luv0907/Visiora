import { describe, it, expect } from 'vitest'
import { flightTime, apex, stateAt, levelRange, components } from './projectile'

const p = (o = {}) => ({ h: 0, u: 0, theta: 0, g: 9.8, ...o })

describe('projectile engine', () => {
  it('drops from h in √(2h/g) and lands at √(2gh)', () => {
    const q = p({ h: 20 })
    expect(flightTime(q)).toBeCloseTo(Math.sqrt(40 / 9.8), 12)
    const st = stateAt(99, q)
    expect(st.landed).toBe(true)
    expect(st.y).toBe(0)
    expect(Math.abs(st.vy)).toBeCloseTo(Math.sqrt(2 * 9.8 * 20), 10)
  })

  it('matches the level-ground range u²·sin2θ/g', () => {
    for (const theta of [15, 30, 45, 60, 75]) {
      const q = p({ u: 20, theta })
      const st = stateAt(flightTime(q), q)
      expect(st.x).toBeCloseTo(levelRange(20, theta, 9.8), 10)
    }
  })

  it('reaches max height u²sin²θ/2g at t = u·sinθ/g', () => {
    const q = p({ u: 20, theta: 60, h: 5 })
    const { uy } = components(20, 60)
    const top = apex(q)
    expect(top.t).toBeCloseTo(uy / 9.8, 12)
    expect(top.y).toBeCloseTo(5 + (uy * uy) / (2 * 9.8), 10)
    expect(stateAt(top.t, q).vy).toBe(0)
  })

  it('a sideways throw takes exactly as long to fall as a drop', () => {
    expect(flightTime(p({ h: 30, u: 15, theta: 0 }))).toBeCloseTo(flightTime(p({ h: 30 })), 12)
  })

  it('handles downward throws without cancellation error', () => {
    const q = p({ h: 10, u: 12, theta: -90 })
    const T = flightTime(q)
    // 10 = 12T + 4.9T²
    expect(12 * T + 4.9 * T * T).toBeCloseTo(10, 10)
  })

  it('keeps speed² = ux² + vy² and energy ½v² + gy constant', () => {
    const q = p({ h: 12, u: 18, theta: 35 })
    const e0 = 0.5 * 18 * 18 + 9.8 * 12
    for (const t of [0.3, 1.1, 2.0, 2.9]) {
      const st = stateAt(t, q)
      if (st.landed) continue
      expect(0.5 * st.speed * st.speed + 9.8 * st.y).toBeCloseTo(e0, 9)
    }
  })

  it('does nothing when there is no height and no upward speed', () => {
    expect(flightTime(p({ h: 0, u: 5, theta: -30 }))).toBe(0)
  })

  it('uses the Moon value g = 1.62 for a 20 m drop ≈ 4.97 s', () => {
    expect(flightTime(p({ h: 20, g: 1.62 }))).toBeCloseTo(4.969, 3)
  })
})
