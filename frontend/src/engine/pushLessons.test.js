import { describe, it, expect } from 'vitest'
import { PUSH_LESSONS } from './pushLessons'

const answer = id => { const L = PUSH_LESSONS.find(l => l.id === id); return L.outcome(L) }

describe('push a box ideas are judged by the simulation', () => {
  it('50 N on 10 kg on carpet: friction holds it', () => expect(answer('grip')).toBe('no'))
  it('push equal to sliding friction: steady speed', () => expect(answer('steady')).toBe('steady'))
  it('twice the mass, same push: half the speed', () => expect(answer('mass')).toBe('half'))
  it('every idea’s true answer is an option, with one right reply per explain step', () => {
    for (const L of PUSH_LESSONS) {
      expect(L.options.map(o => o.id)).toContain(L.outcome(L))
      for (const s of L.explain) expect(s.answers.filter(a => a.right)).toHaveLength(1)
    }
  })
})
