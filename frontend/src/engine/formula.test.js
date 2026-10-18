import { describe, it, expect } from 'vitest'
import { parseFormula, sampleSegments, findKeyPoints, niceStep, formatNumber, formatTick } from './formula'
import { magnitude, angleDeg, fromPolar, add, angleBetween } from './vectors'

describe('parseFormula', () => {
  it('reads y = 2x + 3 with implicit multiplication', () => {
    const f = parseFormula('y = 2x + 3')
    expect(f.ok).toBe(true)
    expect(f.independent).toBe('x')
    expect(f.params).toEqual([])
    expect(f.evaluate(4)).toBe(11)
  })

  it('picks t for kinematics and turns the rest into sliders', () => {
    const f = parseFormula('s = u*t + 1/2*a*t^2')
    expect(f.output).toBe('s')
    expect(f.independent).toBe('t')
    expect(f.params.sort()).toEqual(['a', 'u'])
    expect(f.evaluate(2, { u: 10, a: 4 })).toBe(28)
  })

  it('uses the argument of f(x) as the variable', () => {
    const f = parseFormula('h(t) = 20 - 4.9t^2')
    expect(f.independent).toBe('t')
    expect(f.evaluate(2)).toBeCloseTo(0.4, 12)
  })

  it('accepts phone symbols: π, √, ², ×, θ', () => {
    const f = parseFormula('y = √x × π + θ²')
    expect(f.ok).toBe(true)
    expect(f.params).toEqual(['theta'])
    expect(f.evaluate(4, { theta: 3 })).toBeCloseTo(2 * Math.PI + 9, 12)
  })

  it('switches trig to degrees when asked', () => {
    const f = parseFormula('y = sin(x)')
    expect(f.evaluate(30, {}, { degrees: true })).toBeCloseTo(0.5, 12)
    expect(f.evaluate(Math.PI / 6)).toBeCloseTo(0.5, 12)
  })

  it('returns NaN for non-real results instead of a complex number', () => {
    expect(parseFormula('y = sqrt(x)').evaluate(-1)).toBeNaN()
  })

  it('reads a(x + 1) as multiplication', () => {
    const f = parseFormula('y = a(x+1)')
    expect(f.params).toEqual(['a'])
    expect(f.evaluate(2, { a: 3 })).toBe(9)
  })

  it('gives friendly errors', () => {
    expect(parseFormula('').ok).toBe(false)
    expect(parseFormula('y = (x + 2').error).toMatch(/bracket/)
    expect(parseFormula('y = x +').error).toMatch(/early/)
    expect(parseFormula('x + y = 3').ok).toBe(false)
  })
})

describe('sampleSegments', () => {
  it('keeps a continuous curve in one segment', () => {
    const f = parseFormula('y = x^3')
    const segs = sampleSegments(x => f.evaluate(x), -5, 5, 400, 20)
    expect(segs).toHaveLength(1)
  })

  it('splits 1/x at its asymptote', () => {
    const f = parseFormula('y = 1/x')
    const segs = sampleSegments(x => f.evaluate(x), -5, 5, 401, 10)
    expect(segs).toHaveLength(2)
  })

  it('splits tan at every asymptote in view', () => {
    const f = parseFormula('y = tan(x)')
    const segs = sampleSegments(x => f.evaluate(x), -5, 5, 1000, 10)
    // asymptotes at ±π/2, ±3π/2 → 5 pieces
    expect(segs).toHaveLength(5)
  })

  it('drops gaps where the function is undefined', () => {
    const f = parseFormula('y = sqrt(x)')
    const segs = sampleSegments(x => f.evaluate(x), -5, 5, 100, 10)
    expect(segs).toHaveLength(1)
    expect(segs[0][0][0]).toBeGreaterThanOrEqual(0)
  })
})

describe('findKeyPoints', () => {
  it('finds both roots and the vertex of a parabola exactly', () => {
    const f = parseFormula('y = x^2 - 2')
    const pts = findKeyPoints(x => f.evaluate(x), -5, 5, 800, 10)
    const roots = pts.filter(p => p.kind === 'root').map(p => p.x).sort((a, b) => a - b)
    expect(roots[0]).toBeCloseTo(-Math.SQRT2, 10)
    expect(roots[1]).toBeCloseTo(Math.SQRT2, 10)
    const min = pts.find(p => p.kind === 'min')
    expect(min.x).toBeCloseTo(0, 6)
    expect(min.y).toBeCloseTo(-2, 10)
    expect(pts.find(p => p.kind === 'intercept').y).toBe(-2)
  })

  it('matches the projectile formulas: max height u²/2g and range 2u²sinθcosθ/g… via time of flight', () => {
    const u = 20
    const g = 9.8
    const f = parseFormula('y = u*t - 1/2*g*t^2')
    const pts = findKeyPoints(t => f.evaluate(t, { u, g }), 0.1, 10, 800, 40)
    const max = pts.find(p => p.kind === 'max')
    expect(max.y).toBeCloseTo((u * u) / (2 * g), 9)
    const land = pts.find(p => p.kind === 'root')
    expect(land.x).toBeCloseTo((2 * u) / g, 10)
  })

  it('does not report fake roots at tan asymptotes', () => {
    const f = parseFormula('y = tan(x)')
    const roots = findKeyPoints(x => f.evaluate(x), -2, 2, 800, 10).filter(p => p.kind === 'root')
    expect(roots).toHaveLength(1)
    expect(roots[0].x).toBeCloseTo(0, 10)
  })
})

describe('axis helpers', () => {
  it('picks 1-2-5 steps', () => {
    expect(niceStep(10, 10)).toBe(1)
    expect(niceStep(20, 10)).toBe(2)
    expect(niceStep(50, 10)).toBe(5)
    expect(niceStep(1, 10)).toBeCloseTo(0.1, 15)
  })

  it('formats without float noise', () => {
    expect(formatNumber(0.1 + 0.2)).toBe('0.3')
    expect(formatNumber(2)).toBe('2')
    expect(formatTick(0.30000000000000004, 0.1)).toBe('0.3')
    expect(formatTick(-1.5e-17, 0.1)).toBe('0')
  })
})

describe('vectors', () => {
  it('converts between components and magnitude/angle', () => {
    expect(magnitude({ x: 3, y: 4 })).toBe(5)
    expect(angleDeg({ x: 0, y: -2 })).toBe(-90)
    expect(angleDeg({ x: -1, y: 0 })).toBe(180)
    expect(fromPolar(10, 90)).toEqual({ x: 0, y: 10 })
    const v = fromPolar(10, 30)
    expect(v.x).toBeCloseTo(10 * Math.cos(Math.PI / 6), 12)
  })

  it('adds and measures angles between vectors', () => {
    expect(add({ x: 1, y: 2 }, { x: 3, y: -1 })).toEqual({ x: 4, y: 1 })
    expect(angleBetween({ x: 1, y: 0 }, { x: 0, y: 5 })).toBeCloseTo(90, 12)
  })
})
