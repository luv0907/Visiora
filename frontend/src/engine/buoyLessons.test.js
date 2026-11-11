import { describe, it, expect } from 'vitest'
import { BUOY_LESSONS, runTanks } from './buoyLessons'

const answer = id => { const L = BUOY_LESSONS.find(l => l.id === id); return L.outcome(runTanks(L)) }

describe('floating ideas are judged by the simulation', () => {
  it('ice is mostly under water', () => expect(answer('ice')).toBe('most'))
  it('steel floats on mercury', () => expect(answer('mercury')).toBe('float'))
  it('wood rides lower in oil than in water', () => expect(answer('oil')).toBe('lower'))
  it('every idea’s true answer is an option, with one right reply per explain step', () => {
    for (const L of BUOY_LESSONS) {
      expect(L.options.map(o => o.id)).toContain(L.outcome(runTanks(L)))
      for (const s of L.explain) expect(s.answers.filter(a => a.right)).toHaveLength(1)
    }
  })
})
