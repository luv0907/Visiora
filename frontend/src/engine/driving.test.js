import { describe, it, expect } from 'vitest'
import { LEVELS, SURFACES, brakingDistance, driveResult, newDrive, stepDrive } from './driving'

const level = id => LEVELS.find(l => l.id === id)
/** Drive with frames of dt, holding the brake while hold(state) is true. */
function play(lv, hold, { dt = 1 / 60, rand = () => 0.5 } = {}) {
  let st = newDrive(lv, rand)
  for (let i = 0; i < 10000 && !st.end; i++) st = stepDrive(st, dt, hold(st), lv)
  return st
}

describe('drive game', () => {
  it('cruises at a steady speed until the brake is pressed', () => {
    const lv = level('dry')
    const st = stepDrive(newDrive(lv), 2, false, lv)
    expect(st.s).toBeCloseTo(30, 9)
    expect(st.v).toBe(15)
  })

  it('braking from 15 m/s on a dry road takes 15² ÷ (2 × 7) ≈ 16.1 m', () => {
    const lv = level('dry')
    const st = play(lv, s => s.s >= 40)
    expect(st.end.reason).toBe('stopped')
    expect(st.s - st.brakeS).toBeCloseTo(brakingDistance(15, SURFACES.dry.a), 6)
  })

  it('braking just in time stops within 2 m of the cow for 3 stars', () => {
    const lv = level('dry')
    const st = play(lv, s => s.s >= lv.cowAt - brakingDistance(15, 7) - 1)
    const r = driveResult(st, lv)
    expect(r.reason).toBe('stopped')
    expect(r.gap).toBeGreaterThan(0)
    expect(r.gap).toBeLessThanOrEqual(2)
    expect(r.stars).toBe(3)
  })

  it('finds the exact moment of a hit, even with big frames', () => {
    const lv = level('dry')
    const st = play(lv, () => false, { dt: 0.5 })
    expect(st.end.reason).toBe('hit')
    expect(st.s).toBe(lv.cowAt)
    expect(st.t).toBeCloseTo(4, 9)
    expect(driveResult(st, lv).stars).toBe(0)
  })

  it('the result does not depend on the frame rate', () => {
    const lv = level('rain')
    const a = play(lv, s => s.s >= 40, { dt: 1 / 30 })
    const b = play(lv, s => s.s >= 40, { dt: 1 / 144 })
    expect(a.s - a.brakeS).toBeCloseTo(b.s - b.brakeS, 6)
  })

  it('measures reaction time and thinking distance when the cow steps out', () => {
    const lv = level('stepout')
    const st = play(lv, s => s.t >= s.appearT + 0.7)
    const r = driveResult(st, lv)
    expect(r.reaction).toBeCloseTo(0.7, 1)
    expect(r.thinking).toBeCloseTo(15 * r.reaction, 9)
    expect(r.braking).toBeCloseTo(brakingDistance(15, 7), 6)
    expect(r.stars).toBe(2)
  })

  it('braking before the cow steps out earns no stars', () => {
    const lv = level('stepout')
    const st = play(lv, s => s.t >= 0.5)
    const r = driveResult(st, lv)
    expect(r.early).toBe(true)
    expect(r.stars).toBe(0)
  })

  it('every level can be won by a quick driver', () => {
    for (const lv of LEVELS) {
      const hold = lv.kind === 'judge'
        ? s => s.s >= lv.cowAt - brakingDistance(lv.u, SURFACES[lv.surface].a) - 1.5
        : s => s.t >= s.appearT + 0.5
      expect(driveResult(play(lv, hold), lv).stars).toBe(3)
    }
  })
})
