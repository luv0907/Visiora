import { describe, it, expect } from 'vitest'
import { moveWithCollisions, blocked, toFloorRects } from './collision'

const bench = { x0: 0, x1: 2, z0: 0, z1: 1 }
const R = 0.3

describe('lab walking collision', () => {
  it('walks freely in open space', () => {
    expect(moveWithCollisions(-5, -5, 1, 0.5, R, [bench])).toEqual({ x: -4, z: -4.5 })
  })

  it('stops at a bench instead of walking into it', () => {
    const p = moveWithCollisions(-1, 0.5, 2, 0, R, [bench])
    expect(p.x).toBeLessThanOrEqual(-R + 1e-9)
    expect(blocked(p.x, p.z, R, [bench])).toBe(false)
  })

  it('slides along a bench when walking at an angle', () => {
    const p = moveWithCollisions(1, -1, 0.5, 0.9, R, [bench])
    expect(p.x).toBeCloseTo(1.5)         // sideways motion kept
    expect(p.z).toBeLessThan(0 - R + 0.2) // but not pushed into the bench
    expect(blocked(p.x, p.z, R, [bench])).toBe(false)
  })

  it('cannot tunnel through a thin wall in one big step', () => {
    const wall = { x0: 0, x1: 0.1, z0: -10, z1: 10 }
    const p = moveWithCollisions(-1, 0, 5, 0, R, [wall])
    expect(p.x).toBeLessThan(0)
  })

  it('maps Blender footprints to the browser floor (z = −y)', () => {
    expect(toFloorRects([{ name: 'b', x0: 1, x1: 2, y0: -3, y1: -1 }])[0]).toEqual({ name: 'b', x0: 1, x1: 2, z0: 1, z1: 3 })
  })
})
