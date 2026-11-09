import { describe, it, expect } from 'vitest'
import { BUS, busAt, busRunEnd, minBraking, predictionScore, sketchStopTime, stoppingDistance, tickerGaps } from './busMission'

const { u, a } = BUS

describe('bus and cow mission', () => {
  it('the bus stops after 5 s, 50 m along, 10 m short of the cow', () => {
    const end = busRunEnd(u, a, BUS.cowAt)
    expect(end.reason).toBe('stopped')
    expect(end.t).toBeCloseTo(5, 9)
    expect(busAt(end.t, u, a).s).toBeCloseTo(50, 9)
  })

  it('stays stopped instead of reversing', () => {
    expect(busAt(9, u, a)).toEqual({ s: 50, v: 0 })
  })

  it('the ticker-tape gaps shrink by 4 m each second', () => {
    expect(tickerGaps(u, a).map(g => +g.toFixed(6))).toEqual([18, 14, 10, 6, 2])
  })

  it('with the cow 40 m away, 5 m/s² is the gentlest braking that works', () => {
    expect(minBraking(u, BUS.applyCowAt)).toBe(5)
    expect(busRunEnd(u, -5, BUS.applyCowAt).reason).toBe('stopped')
    expect(stoppingDistance(u, -5)).toBeCloseTo(40, 9)
    const hit = busRunEnd(u, -3, BUS.applyCowAt)
    expect(hit.reason).toBe('hit')
    expect(busAt(hit.t, u, -3).s).toBeCloseTo(40, 6)
  })

  it('scores a perfect sketch 100 and a "never slows down" sketch low', () => {
    expect(predictionScore([[0, 20], [5, 0], [8, 0]], u, a)).toBe(100)
    expect(predictionScore([[0, 20], [8, 20]], u, a)).toBeLessThan(30)
  })

  it('reads when the sketch reaches zero', () => {
    expect(sketchStopTime([[0, 20], [3.4, 0.5], [5, 0]])).toBe(3.4)
    expect(sketchStopTime([[0, 20], [8, 12]])).toBeNull()
  })
})
