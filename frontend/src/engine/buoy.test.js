import { describe, it, expect } from 'vitest'
import { settleBlock, placeBlock, stepBlock, floatFraction, sinks, hangBlock, stepHang, balanceForce, hangY, steadyPull, LIQUIDS, SOLIDS, G } from './buoy'

const under = s => Math.max(0, Math.min(s.L, -s.y)) / s.L

describe('floating and sinking', () => {
  it('a floating cube settles with ρ_object ÷ ρ_liquid of it under the surface', () => {
    for (const [solid, liquid] of [['wood', 'water'], ['ice', 'water'], ['cork', 'oil'], ['steel', 'mercury']]) {
      const s = settleBlock(solid, liquid)
      expect(s.rest).toBe(true)
      expect(under(s)).toBeCloseTo(floatFraction(solid, liquid), 2)
    }
    expect(floatFraction('ice', 'water')).toBeCloseTo(0.917, 3)
  })
  it('steel sinks in water but floats in mercury; gold sinks even in mercury', () => {
    expect(sinks('steel', 'water')).toBe(true)
    expect(sinks('steel', 'mercury')).toBe(false)
    expect(sinks('gold', 'mercury')).toBe(true)
    const g = settleBlock('gold', 'mercury')
    expect(g.onFloor).toBe(true)
  })
  it('thick honey slows a small sinking cube far more than water does; mercury is as runny as water', () => {
    // stickiness matters most for small things: a 1.5 cm aluminium cube, like a marble
    const fall = liquid => { const s = placeBlock('aluminium', liquid, { L: 0.015, y: -0.016 }); while (!s.onFloor && s.t < 60) stepBlock(s, 0.01); return s.t }
    const water = fall('water'), honey = fall('honey')
    expect(honey).toBeGreaterThan(5 * water)
    expect(LIQUIDS.mercury.eta / LIQUIDS.water.eta).toBeLessThan(2)
  })
  it('a wooden block pushed under bobs up past its float level, then settles', () => {
    const s = placeBlock('wood', 'water', { y: -0.05 })
    let maxUp = -Infinity
    while (s.t < 6) { stepBlock(s, 0.01); maxUp = Math.max(maxUp, s.y) }
    expect(maxUp).toBeGreaterThan(-0.025 + 0.002) // overshoots the float level (half under)
    expect(under(s)).toBeCloseTo(0.5, 2)
  })
})

describe('the spring balance', () => {
  const L = 0.05
  it('reads the weight in air', () => {
    const s = hangBlock('aluminium', 'water', { L, hook: 0.3 })
    expect(balanceForce(s)).toBeCloseTo(SOLIDS.aluminium.rho * L ** 3 * G, 6)
  })
  it('dipped right in, it settles to weight − weight of liquid displaced (Archimedes)', () => {
    const s = hangBlock('aluminium', 'water', { L, hook: 0.3 })
    s.hook = 0.0 // lower it until the cube is fully under
    for (let t = 0; t < 15; t += 0.01) stepHang(s, 0.01)
    expect(hangY(s) + L).toBeLessThan(0)
    expect(balanceForce(s)).toBeCloseTo(steadyPull('aluminium', 'water', L, 1), 3)
    const loss = SOLIDS.aluminium.rho * L ** 3 * G - balanceForce(s)
    expect(loss).toBeCloseTo(LIQUIDS.water.rho * L ** 3 * G, 3)
    expect(Math.abs(s.v)).toBeLessThan(1e-3)
  })
  it('loses more weight in salty water than in tap water', () => {
    const pull = liquid => { const s = hangBlock('aluminium', liquid, { L, hook: 0 }); for (let t = 0; t < 15; t += 0.01) stepHang(s, 0.01); return balanceForce(s) }
    expect(pull('salt')).toBeLessThan(pull('water') - 0.1)
  })
})

describe('the practical’s starting position', () => {
  it('hangs the cube clear of the liquid when the hook is at 0.2 m', () => {
    const s = hangBlock('aluminium', 'water', { L: 0.05, hook: 0.2 })
    expect(hangY(s)).toBeGreaterThan(0.01)
  })
})
