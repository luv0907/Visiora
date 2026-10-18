import { describe, it, expect } from 'vitest'
import { interact, criticalAngle, brewsterAngle } from './optics'

const sin = d => Math.sin((d * Math.PI) / 180)

describe('optics engine', () => {
  it('obeys Snell’s law n₁ sin θ₁ = n₂ sin θ₂', () => {
    for (const [n1, n2] of [[1, 1.33], [1, 1.5], [1.5, 1], [1.33, 2.42]]) {
      for (const th of [5, 20, 35, 40]) {
        const r = interact(th, n1, n2)
        if (r.tir) continue
        expect(n1 * sin(th)).toBeCloseTo(n2 * sin(r.theta2), 12)
      }
    }
  })

  it('reflects at the same angle', () => {
    expect(interact(37, 1, 1.5).thetaR).toBe(37)
  })

  it('gives the textbook critical angles', () => {
    expect(criticalAngle(1.33, 1)).toBeCloseTo(48.75, 2)
    expect(criticalAngle(1.5, 1)).toBeCloseTo(41.81, 2)
    expect(criticalAngle(1, 1.5)).toBeNull()
  })

  it('switches to total internal reflection just past the critical angle', () => {
    const c = criticalAngle(1.5, 1)
    expect(interact(c - 0.01, 1.5, 1).tir).toBe(false)
    const past = interact(c + 0.01, 1.5, 1)
    expect(past.tir).toBe(true)
    expect(past.R).toBe(1)
  })

  it('reflects ((n₁−n₂)/(n₁+n₂))² at normal incidence — 4% for air to glass', () => {
    expect(interact(0, 1, 1.5).R).toBeCloseTo(0.04, 12)
    expect(interact(0, 1, 1.5).theta2).toBe(0)
  })

  it('conserves energy: R + T = 1', () => {
    for (const th of [0, 15, 45, 70, 89]) {
      const r = interact(th, 1, 1.33)
      expect(r.R + r.T).toBeCloseTo(1, 12)
    }
  })

  it('puts reflected and refracted rays at 90° at Brewster’s angle', () => {
    const b = brewsterAngle(1, 1.5)
    expect(b).toBeCloseTo(56.31, 2)
    const r = interact(b, 1, 1.5)
    // At Brewster, θ₁ + θ₂ = 90°
    expect(b + r.theta2).toBeCloseTo(90, 9)
  })

  it('does not bend when both sides are the same', () => {
    const r = interact(50, 1.33, 1.33)
    expect(r.theta2).toBeCloseTo(50, 12)
    expect(r.R).toBeCloseTo(0, 12)
  })
})
