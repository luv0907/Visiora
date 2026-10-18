import { describe, it, expect } from 'vitest'
import { solve, buildCircuit, equivalentResistance } from './circuit'

const run = (kind, V, Rs, closed = true) => {
  const c = buildCircuit(kind, V, Rs, closed)
  return { ...c, sol: solve(c.nodes, c.elements) }
}

describe('circuit solver', () => {
  it('series: I = V / (R1 + R2 + R3), same current everywhere', () => {
    const { sol } = run('series', 12, [2, 4, 6])
    expect(sol.current('B')).toBeCloseTo(1, 10)
    expect(sol.current('A')).toBeCloseTo(1, 10)
    for (const id of ['R1', 'R2', 'R3']) expect(sol.current(id)).toBeCloseTo(1, 10)
  })

  it('series: voltages add up to the battery (KVL) and follow V = IR', () => {
    const { sol, ends } = run('series', 9, [1, 2, 6])
    const vs = ['R1', 'R2', 'R3'].map(id => sol.across(...ends[id]))
    expect(vs[0]).toBeCloseTo(1, 10)
    expect(vs[1]).toBeCloseTo(2, 10)
    expect(vs[2]).toBeCloseTo(6, 10)
    expect(vs.reduce((a, b) => a + b)).toBeCloseTo(9, 10)
  })

  it('parallel: each branch gets the full voltage, currents add (KCL)', () => {
    const { sol, ends } = run('parallel', 6, [2, 3, 6])
    expect(sol.across(...ends.R1)).toBeCloseTo(6, 10)
    expect(sol.current('R1')).toBeCloseTo(3, 10)
    expect(sol.current('R2')).toBeCloseTo(2, 10)
    expect(sol.current('R3')).toBeCloseTo(1, 10)
    expect(sol.current('A')).toBeCloseTo(6, 10)
    // 1/R = 1/2 + 1/3 + 1/6 = 1 → R = 1 Ω
    expect(equivalentResistance('parallel', [2, 3, 6])).toBeCloseTo(1, 12)
  })

  it('mixed: R1 + (R2 ∥ R3)', () => {
    const { sol, ends } = run('mixed', 10, [3, 4, 4])
    // R = 3 + 2 = 5 Ω → I = 2 A, splits 1 A + 1 A
    expect(sol.current('A')).toBeCloseTo(2, 10)
    expect(sol.current('R2')).toBeCloseTo(1, 10)
    expect(sol.current('R3')).toBeCloseTo(1, 10)
    expect(sol.across(...ends.R1)).toBeCloseTo(6, 10)
    expect(sol.across(...ends.R2)).toBeCloseTo(4, 10)
  })

  it('agrees with the textbook equivalent resistance for every circuit', () => {
    const cases = [['series', [5, 7]], ['series', [1, 2, 3]], ['parallel', [4, 12]], ['parallel', [5, 10, 20]], ['mixed', [6, 3, 7]]]
    for (const [kind, Rs] of cases) {
      const { sol } = run(kind, 12, Rs)
      expect(12 / sol.current('B')).toBeCloseTo(equivalentResistance(kind, Rs), 9)
    }
  })

  it('conserves power: battery power = Σ I²R', () => {
    const { sol } = run('mixed', 12, [2, 5, 9])
    const pBattery = 12 * sol.current('B')
    const pHeat = ['R1', 'R2', 'R3'].reduce((s, id) => s + sol.current(id) ** 2 * { R1: 2, R2: 5, R3: 9 }[id], 0)
    expect(pBattery).toBeCloseTo(pHeat, 9)
  })

  it('open switch: no current, and the switch gap reads the full battery voltage', () => {
    const { sol, ends } = run('series', 6, [2, 4], false)
    expect(sol.current('A')).toBe(0)
    expect(sol.current('R1')).toBe(0)
    expect(sol.across(...ends.S)).toBeCloseTo(6, 6)
    expect(sol.across(...ends.R1)).toBeCloseTo(0, 6)
  })
})
