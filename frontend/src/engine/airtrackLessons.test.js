import { describe, it, expect } from 'vitest'
import { TRACK_LESSONS } from './airtrackLessons'

const answer = id => { const L = TRACK_LESSONS.find(l => l.id === id); return L.outcome(L) }

describe('air track ideas are judged by the simulation', () => {
  it('equal masses, springy: A stops and B moves off', () => expect(answer('equal')).toBe('stop'))
  it('heavy into light: the light one goes off faster', () => expect(answer('heavy')).toBe('faster'))
  it('velcro, equal masses: they move off at half speed', () => expect(answer('stick')).toBe('half'))
  it('every idea’s true answer is an option, with one right reply per explain step', () => {
    for (const L of TRACK_LESSONS) {
      expect(L.options.map(o => o.id)).toContain(L.outcome(L))
      for (const s of L.explain) expect(s.answers.filter(a => a.right)).toHaveLength(1)
    }
  })
})
