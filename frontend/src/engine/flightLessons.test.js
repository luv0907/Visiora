import { describe, it, expect } from 'vitest'
import { FLIGHT_LESSONS } from './flightLessons'

const answer = id => FLIGHT_LESSONS.find(l => l.id === id).outcome()

describe('projectile ideas are judged by the simulation', () => {
  it('no air: 45° is furthest', () => expect(answer('best-angle')).toBe('45'))
  it('with air, a table tennis ball goes furthest at 30°', () => expect(answer('air-angle')).toBe('30'))
  it('dropped and thrown sideways land together', () => expect(answer('drop-throw')).toBe('together'))
  it('every idea’s true answer is an option, with one right reply per explain step', () => {
    for (const L of FLIGHT_LESSONS) {
      expect(L.options.map(o => o.id)).toContain(L.outcome())
      for (const s of L.explain) expect(s.answers.filter(a => a.right)).toHaveLength(1)
    }
  })
})
