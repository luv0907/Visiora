/**
 * VISIORA — Formula Engine Unit Tests
 * Verified against textbook values and known physics results.
 * Run with: npx vitest run
 */
import { describe, it, expect } from 'vitest'
import { computeFormulaState, isValidScene } from '../formulaEngine'

const TOLERANCE = 0.01  // 1% relative tolerance

function approxEqual(a, b, tol = TOLERANCE) {
  if (b === 0) return Math.abs(a) < 0.001
  return Math.abs((a - b) / b) < tol
}

// ── Scene Registry ────────────────────────────────────────────────
describe('Formula Engine Registry', () => {
  it('recognizes all 5 scenes', () => {
    expect(isValidScene('gravity')).toBe(true)
    expect(isValidScene('projectile')).toBe(true)
    expect(isValidScene('pendulum')).toBe(true)
    expect(isValidScene('collision')).toBe(true)
    expect(isValidScene('angular')).toBe(true)
    expect(isValidScene('unknown')).toBe(false)
  })

  it('returns null for invalid scene', () => {
    expect(computeFormulaState('nonexistent', {})).toBeNull()
  })
})

// ── Free Fall ─────────────────────────────────────────────────────
describe('Gravity / Free Fall', () => {
  it('computes fall time: h=20m, g=9.81 → t≈2.019s', () => {
    const result = computeFormulaState('gravity', { height: 20, mass1: 1, mass2: 50, gravity: 9.81 })
    expect(result).not.toBeNull()
    expect(approxEqual(result.values.t, 2.019)).toBe(true)
  })

  it('computes impact velocity: h=20m, g=9.81 → v≈19.81m/s', () => {
    const result = computeFormulaState('gravity', { height: 20, mass1: 1, mass2: 1, gravity: 9.81 })
    expect(approxEqual(result.values.v, 19.81)).toBe(true)
  })

  it('fall time is same for different masses (Galileo)', () => {
    const r1 = computeFormulaState('gravity', { height: 15, mass1: 1,   mass2: 1,   gravity: 9.81 })
    const r2 = computeFormulaState('gravity', { height: 15, mass1: 100, mass2: 100, gravity: 9.81 })
    expect(r1.values.t).toBeCloseTo(r2.values.t, 5)
    expect(r1.values.v).toBeCloseTo(r2.values.v, 5)
  })

  it('KE = PE at impact (energy conservation)', () => {
    const result = computeFormulaState('gravity', { height: 20, mass1: 5, mass2: 5, gravity: 9.81 })
    // KE1 ≈ PE1 (within float precision)
    expect(Math.abs(result.values.KE1 - result.values.PE1)).toBeLessThan(0.01)
  })

  it('moon gravity gives longer fall time', () => {
    const earth = computeFormulaState('gravity', { height: 20, mass1: 1, mass2: 1, gravity: 9.81 })
    const moon  = computeFormulaState('gravity', { height: 20, mass1: 1, mass2: 1, gravity: 1.62 })
    expect(moon.values.t).toBeGreaterThan(earth.values.t)
  })

  it('returns step-by-step breakdown', () => {
    const result = computeFormulaState('gravity', { height: 20, mass1: 1, mass2: 1, gravity: 9.81 })
    expect(Array.isArray(result.steps)).toBe(true)
    expect(result.steps.length).toBeGreaterThanOrEqual(3)
    result.steps.forEach(step => {
      expect(step).toHaveProperty('formula')
      expect(step).toHaveProperty('result')
    })
  })
})

// ── Projectile Motion ─────────────────────────────────────────────
describe('Projectile Motion', () => {
  it('max range at 45°: v=20m/s → R≈40.77m', () => {
    const result = computeFormulaState('projectile', { velocity: 20, angle: 45, height: 0, gravity: 9.81 })
    expect(approxEqual(result.values.R, 40.77)).toBe(true)
  })

  it('30° and 60° give same range (complementary angles)', () => {
    const r30 = computeFormulaState('projectile', { velocity: 20, angle: 30, height: 0, gravity: 9.81 })
    const r60 = computeFormulaState('projectile', { velocity: 20, angle: 60, height: 0, gravity: 9.81 })
    expect(approxEqual(r30.values.R, r60.values.R)).toBe(true)
  })

  it('90° angle: horizontal range ≈ 0', () => {
    const result = computeFormulaState('projectile', { velocity: 20, angle: 90, height: 0, gravity: 9.81 })
    expect(result.values.R).toBeLessThan(0.01)
  })

  it('max height at 45°: v=20m/s → H≈10.19m', () => {
    const result = computeFormulaState('projectile', { velocity: 20, angle: 45, height: 0, gravity: 9.81 })
    expect(approxEqual(result.values.H_max, 10.19)).toBe(true)
  })

  it('trajectory series is monotone in x', () => {
    const result = computeFormulaState('projectile', { velocity: 15, angle: 45, height: 0, gravity: 9.81 })
    const traj = result.graphSeries.trajectory
    for (let i = 1; i < traj.length; i++) {
      expect(traj[i].x).toBeGreaterThanOrEqual(traj[i - 1].x)
    }
  })
})

// ── Pendulum ──────────────────────────────────────────────────────
describe('Pendulum', () => {
  it('period: L=1m, g=9.81 → T≈2.006s', () => {
    const result = computeFormulaState('pendulum', { length: 1, mass1: 1, angle: 5, gravity: 9.81 })
    expect(approxEqual(result.values.T_simple, 2.006)).toBe(true)
  })

  it('period is independent of mass', () => {
    const r1 = computeFormulaState('pendulum', { length: 2, mass1: 1,   angle: 10, gravity: 9.81 })
    const r2 = computeFormulaState('pendulum', { length: 2, mass1: 100, angle: 10, gravity: 9.81 })
    expect(r1.values.T_simple).toBeCloseTo(r2.values.T_simple, 6)
  })

  it('longer pendulum has longer period', () => {
    const r1 = computeFormulaState('pendulum', { length: 1, mass1: 1, angle: 10, gravity: 9.81 })
    const r2 = computeFormulaState('pendulum', { length: 4, mass1: 1, angle: 10, gravity: 9.81 })
    expect(r2.values.T_simple).toBeGreaterThan(r1.values.T_simple)
  })

  it('moon gravity gives longer period', () => {
    const earth = computeFormulaState('pendulum', { length: 1, mass1: 1, angle: 10, gravity: 9.81 })
    const moon  = computeFormulaState('pendulum', { length: 1, mass1: 1, angle: 10, gravity: 1.62 })
    expect(moon.values.T_simple).toBeGreaterThan(earth.values.T_simple)
  })

  it('energy conservation: E_total = mgh_max', () => {
    const result = computeFormulaState('pendulum', { length: 2, mass1: 3, angle: 30, gravity: 9.81 })
    const { E_total, m, g, h_max } = result.values
    expect(approxEqual(E_total, m * g * h_max)).toBe(true)
  })
})

// ── Collision ─────────────────────────────────────────────────────
describe('Collisions', () => {
  it('elastic collision (e=1): KE conserved', () => {
    const result = computeFormulaState('collision', { mass1: 2, mass2: 1, velocity1: 5, velocity2: 0, restitution: 1 })
    expect(approxEqual(result.values.KE_before, result.values.KE_after)).toBe(true)
  })

  it('momentum conserved in all collisions', () => {
    for (const e of [0, 0.5, 1]) {
      const r = computeFormulaState('collision', { mass1: 3, mass2: 2, velocity1: 4, velocity2: -1, restitution: e })
      expect(approxEqual(r.values.p_before, r.values.p_after)).toBe(true)
    }
  })

  it('perfectly inelastic: balls have same final velocity', () => {
    const r = computeFormulaState('collision', { mass1: 2, mass2: 2, velocity1: 4, velocity2: 0, restitution: 0 })
    expect(approxEqual(r.values.v1, r.values.v2)).toBe(true)
  })

  it('elastic equal-mass head-on: velocities exchange', () => {
    const r = computeFormulaState('collision', { mass1: 1, mass2: 1, velocity1: 5, velocity2: 0, restitution: 1 })
    expect(approxEqual(r.values.v1, 0)).toBe(true)
    expect(approxEqual(r.values.v2, 5)).toBe(true)
  })
})

// ── Angular Momentum ──────────────────────────────────────────────
describe('Angular Momentum', () => {
  it('L is conserved when arms pulled in', () => {
    const r = computeFormulaState('angular', { angularVelocity: 3, armRadius: 1.5, mass1: 60 })
    const { I1, ω0, I2, ω2, L } = r.values
    expect(approxEqual(I1 * ω0, I2 * ω2)).toBe(true)
    expect(approxEqual(L, I2 * ω2)).toBe(true)
  })

  it('smaller arm radius → larger angular velocity than starting ω₀', () => {
    const r = computeFormulaState('angular', { angularVelocity: 3, armRadius: 1.5, mass1: 60 })
    expect(r.values.ω2).toBeGreaterThan(r.values.ω0)
  })

  it('KE increases when arms pulled in (muscles do work)', () => {
    const r = computeFormulaState('angular', { angularVelocity: 3, armRadius: 1.5, mass1: 60 })
    expect(r.values.KE2).toBeGreaterThan(r.values.KE1)
    expect(r.values.KE_gain).toBeGreaterThan(0)
  })

  it('graph series numerical verification', () => {
    const r = computeFormulaState('angular', { angularVelocity: 3, armRadius: 1.5, mass1: 60 })
    const firstR = r.graphSeries.omegaR[0]
    // The graph sweeps from r2 to r1, so index 0 is r2 (Arms In, max omega)
    expect(approxEqual(firstR.y, r.values.ω2)).toBe(true)
  })
})

describe('Graph Series Numerical Verifications', () => {
  it('gravity heightTime graph ends at y=0 at T', () => {
    const r = computeFormulaState('gravity', { height: 20, gravity: 9.81 })
    const ht = r.graphSeries.heightTime
    expect(ht[ht.length - 1].x).toBeCloseTo(r.values.t, 3)
    expect(ht[ht.length - 1].y).toBeCloseTo(0, 3)
  })

  it('pendulum angleTime graph amplitude matches θ0', () => {
    const r = computeFormulaState('pendulum', { length: 2, angle: 30 })
    const at = r.graphSeries.angleTime
    const max_angle = Math.max(...at.map(p => p.y))
    expect(max_angle).toBeCloseTo(30, 2)
  })

  it('collision momentum graph matches computed p_before/p_after', () => {
    const r = computeFormulaState('collision', { mass1: 2, mass2: 1, velocity1: 5, velocity2: -2, restitution: 1 })
    const p1_before = r.graphSeries.momentum.find(m => m.label === 'Ball 1 Before').value
    expect(approxEqual(p1_before, r.values.m1 * r.values.u1)).toBe(true)
  })
})
