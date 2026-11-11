import { describe, it, expect } from 'vitest'
import { LESSONS, runLesson, bendOf, bendingEvent } from './lightLessons'
import { criticalAngle } from './raybench'

const lesson = id => LESSONS.find(l => l.id === id)

describe('light ideas are judged by the ray tracer', () => {
  it('into glass: the ray meets the top face at the angle set, and bends towards the normal', () => {
    const L = lesson('into-glass')
    for (const a of [10, 40, 70]) {
      const run = runLesson(L, a)
      const e = bendingEvent(run.events)
      expect(e.entering).toBe(true)
      expect(e.i).toBeCloseTo(a, 6)
      expect(L.outcome(run)).toBe('towards')
    }
  })
  it('into glass at 0°: straight on, so "straight" is the honest answer there', () => {
    expect(lesson('into-glass').outcome(runLesson(lesson('into-glass'), 0))).toBe('straight')
  })
  it('out of glass: bends away below the critical angle, trapped above it', () => {
    const L = lesson('out-of-glass')
    const c = criticalAngle('crown', 532)
    const below = runLesson(L, c - 2), above = runLesson(L, c + 2)
    expect(bendingEvent(below.events).entering).toBe(false)
    expect(bendingEvent(below.events).i).toBeCloseTo(c - 2, 4)
    expect(L.outcome(below)).toBe('away')
    expect(L.outcome(above)).toBe('trapped')
  })
  it('white light: violet is turned the most, at every angle the slider allows', () => {
    const L = lesson('prism-colours')
    for (const a of [L.angle.min, L.angle.start, L.angle.max]) expect(L.outcome(runLesson(L, a))).toBe('violet')
  })
  it('every idea starts with a ray that actually hits its glass', () => {
    for (const L of LESSONS) expect(runLesson(L, L.angle.start).events.length).toBeGreaterThan(0)
  })
  it('every idea has a right answer among its options, and every explain step has one right reply', () => {
    for (const L of LESSONS) {
      expect(L.options.map(o => o.id)).toContain(L.outcome(runLesson(L, L.angle.start)))
      for (const step of L.explain) expect(step.answers.filter(a => a.right)).toHaveLength(1)
    }
  })
  it('names the bend from the angles', () => {
    expect(bendOf({ i: 40, r: 25 })).toBe('towards')
    expect(bendOf({ i: 30, r: 49 })).toBe('away')
    expect(bendOf({ i: 0, r: 0 })).toBe('straight')
    expect(bendOf({ i: 50, tir: true })).toBe('trapped')
  })
})
