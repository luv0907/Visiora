import { describe, it, expect } from 'vitest'
import { step, forcesAt, SURFACES, G } from './forces'

const wood = SURFACES.find(s => s.id === 'wood')
const ice = SURFACES.find(s => s.id === 'ice')
const none = SURFACES.find(s => s.id === 'none')

// Run with a mix of uneven frame lengths, like a real phone.
function run(state, seconds, F, m, surface) {
  const frames = [0.016, 0.033, 0.007, 0.05, 0.021]
  let s = state
  let left = seconds
  let i = 0
  while (left > 1e-12) {
    const dt = Math.min(left, frames[i++ % frames.length])
    s = step(s, dt, F, m, surface).state
    left -= dt
  }
  return s
}

describe('force and friction engine', () => {
  it('stays still while the push is below maximum static friction', () => {
    const m = 10
    const f = forcesAt({ v: 0 }, 39, m, wood) // max grip 0.4 × 10 × 9.8 = 39.2 N
    expect(f.moving).toBe(false)
    expect(f.friction).toBe(-39)
    expect(run({ t: 0, x: 0, v: 0 }, 3, 39, m, wood)).toEqual({ t: expect.any(Number), x: 0, v: 0 })
  })

  it('obeys a = (F − μk·m·g) / m exactly, whatever the frame lengths', () => {
    const m = 10
    const F = 60
    const a = (F - 0.25 * m * G) / m
    const s = run({ t: 0, x: 0, v: 0 }, 4, F, m, wood)
    expect(s.v).toBeCloseTo(a * 4, 10)
    expect(s.x).toBeCloseTo(0.5 * a * 16, 10)
  })

  it('moves at constant speed when the push equals sliding friction', () => {
    const m = 10
    const s = run({ t: 0, x: 0, v: 3 }, 5, 0.25 * m * G, m, wood)
    expect(s.v).toBeCloseTo(3, 12)
    expect(s.x).toBeCloseTo(15, 10)
  })

  it('after letting go, stops in v/(μk g) seconds over v²/(2 μk g) metres', () => {
    const v0 = 6
    const s = run({ t: 0, x: 0, v: v0 }, 30, 0, 5, ice)
    expect(s.v).toBe(0)
    expect(s.x).toBeCloseTo((v0 * v0) / (2 * 0.05 * G), 10)
    const { events } = step({ t: 0, x: 0, v: v0 }, 30, 0, 5, ice)
    expect(events[0].t).toBeCloseTo(v0 / (0.05 * G), 12)
  })

  it('does not reverse when friction stops it', () => {
    const s = run({ t: 0, x: 0, v: 2 }, 10, 0, 3, wood)
    expect(s.v).toBe(0)
  })

  it('keeps going forever with no friction and no push (first law)', () => {
    const s = run({ t: 0, x: 0, v: 1.5 }, 20, 0, 8, none)
    expect(s.v).toBe(1.5)
    expect(s.x).toBeCloseTo(30, 10)
  })

  it('a heavier box accelerates less for the same net force (a = F/m)', () => {
    const a1 = forcesAt({ v: 1 }, 20, 2, none).a
    const a2 = forcesAt({ v: 1 }, 20, 8, none).a
    expect(a1 / a2).toBeCloseTo(4, 12)
  })
})
