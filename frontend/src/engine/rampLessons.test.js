import { describe, it, expect } from 'vitest'
import { RAMP_LESSONS } from './rampLessons'

const answer = id => { const L = RAMP_LESSONS.find(l => l.id === id); return L.outcome(L) }

describe('friction ramp ideas are judged by the simulation', () => {
  it('heavy and light blocks slip at the same angle', () => expect(answer('mass')).toBe('together'))
  it('lowered below the slip angle, a sliding block keeps going', () => expect(answer('keep')).toBe('keeps'))
  it('a flicked block on a 15° ramp stops', () => expect(answer('nudge')).toBe('stops'))
  it('every idea’s true answer is an option, with one right reply per explain step', () => {
    for (const L of RAMP_LESSONS) {
      expect(L.options.map(o => o.id)).toContain(L.outcome(L))
      for (const s of L.explain) expect(s.answers.filter(a => a.right)).toHaveLength(1)
    }
  })
})
