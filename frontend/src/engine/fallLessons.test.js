import { describe, it, expect } from 'vitest'
import { FALL_LESSONS, runFall } from './fallLessons'

describe('falling ideas are judged by the simulation', () => {
  const answer = id => { const L = FALL_LESSONS.find(l => l.id === id); return L.outcome(runFall(L)) }
  it('Moon: hammer and feather together', () => expect(answer('moon-hammer')).toBe('together'))
  it('Earth: the hammer first', () => expect(answer('earth-hammer')).toBe('a'))
  it('helium balloon on Earth goes up', () => expect(answer('balloon')).toBe('up'))
  it('every idea has its true answer among the options, and one right reply per explain step', () => {
    for (const L of FALL_LESSONS) {
      expect(L.options.map(o => o.id)).toContain(L.outcome(runFall(L)))
      for (const s of L.explain) expect(s.answers.filter(a => a.right)).toHaveLength(1)
    }
  })
})
