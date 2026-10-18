import { describe, it, expect } from 'vitest'
import { stateAt, runEnd, stopTime, timeToReach, stoppingDistance, ROAD_LENGTH, MAX_TIME } from './motion'

describe('motion engine', () => {
  it('matches s = ut + ½at² and v = u + at while moving', () => {
    const st = stateAt(3, 10, 2)
    expect(st.s).toBeCloseTo(10 * 3 + 0.5 * 2 * 9, 12)
    expect(st.v).toBeCloseTo(16, 12)
    expect(st.a).toBe(2)
  })

  it('satisfies v² = u² + 2as at every moment', () => {
    for (const t of [0.5, 1.7, 2.9, 4.2]) {
      const st = stateAt(t, 8, 1.5)
      expect(st.v * st.v).toBeCloseTo(64 + 2 * 1.5 * st.s, 9)
    }
  })

  it('stops a braking car at u²/2|a| and keeps it there', () => {
    const u = 20
    const a = -5
    expect(stopTime(u, a)).toBe(4)
    expect(stoppingDistance(u, a)).toBe(40)
    const st = stateAt(10, u, a)
    expect(st.stopped).toBe(true)
    expect(st.v).toBe(0)
    expect(st.s).toBeCloseTo(40, 12)
    expect(st.t).toBe(4) // run ended at the stop
    expect(runEnd(u, a).reason).toBe('stopped')
  })

  it('ends when the car reaches the end of the road', () => {
    const end = runEnd(20, 0)
    expect(end).toEqual({ t: 5, reason: 'finished' })
    expect(stateAt(99, 20, 0).s).toBe(ROAD_LENGTH)
    // From rest: t = √(2L/a)
    expect(timeToReach(100, 0, 2)).toBeCloseTo(10, 12)
  })

  it('reports a braking car that stops short as never reaching the end', () => {
    expect(timeToReach(100, 20, -5)).toBe(Infinity)
  })

  it('handles a car that never moves', () => {
    const st = stateAt(5, 0, 0)
    expect(st.s).toBe(0)
    expect(st.v).toBe(0)
    expect(runEnd(0, 0).reason).toBe('stopped')
  })

  it('times out for very slow cars', () => {
    expect(runEnd(1, 0)).toEqual({ t: MAX_TIME, reason: 'timeout' })
  })

  it('stays exact for tiny accelerations', () => {
    expect(timeToReach(100, 10, 1e-12)).toBeCloseTo(10, 9)
  })
})
