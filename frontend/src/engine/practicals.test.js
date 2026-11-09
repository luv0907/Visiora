import { describe, it, expect } from 'vitest'
import { analyze, edgeKey, newState, node, step, updatePart, withIds } from './board'
import { PRACTICALS, checkWiring, demoBoard, fitThroughOrigin, meterKeys, nominalResistance, readingOk } from './practicals'

const E = (c1, r1, c2, r2) => edgeKey(node(c1, r1), node(c2, r2))
const ohm = PRACTICALS.find(p => p.id === 'ohm')
const run = ohm.runs[0]

describe('practicals: wiring is judged by what would flow', () => {
  it('the textbook layout of every run is accepted', () => {
    for (const spec of PRACTICALS) for (const r of spec.runs) expect(checkWiring(spec, r, demoBoard(spec, r))).toMatchObject({ ok: true })
  })

  it('a missing part is named', () => {
    const b = demoBoard(ohm, run)
    const { KEY } = meterKeys(b)
    const { [KEY]: _, ...rest } = b
    expect(checkWiring(ohm, run, { ...rest, [KEY]: { type: 'wire' } }).problems.join(' ')).toMatch(/plug key/)
  })

  it('an ammeter wired backwards is caught before its needle kicks', () => {
    const b = demoBoard(ohm, run), { AM } = meterKeys(b)
    const r = checkWiring(ohm, run, updatePart(b, AM, { flip: true }))
    expect(r.ok).toBe(false)
    expect(r.problems.join(' ')).toMatch(/\+ terminal/)
  })

  it('an ammeter across the resistance wire would burn out: a danger', () => {
    const b = demoBoard(ohm, run), { AM, VM } = meterKeys(b)
    // swap the two meters: ammeter across the coil, voltmeter in the main loop
    const swapped = withIds({ ...b, [AM]: b[VM], [VM]: b[AM] })
    const r = checkWiring(ohm, run, swapped)
    expect(r.ok).toBe(false)
    expect(r.problems.join(' ')).toMatch(/voltmeter is in series|ammeter/)
  })

  it('a rheostat bypassed by a wire is spotted', () => {
    const b = demoBoard(ohm, run), { RH } = meterKeys(b)
    const r = checkWiring(ohm, run, withIds({ ...b, [E(5, 2, 6, 2)]: { type: 'wire' }, [E(5, 2, 5, 3)]: { type: 'wire' } }))
    expect(RH).toBeTruthy()
    expect(r.ok).toBe(false)
    expect(r.problems.join(' ')).toMatch(/rheostat/)
  })

  it('a voltmeter joined across the wrong thing is spotted', () => {
    const b = { ...demoBoard(ohm, run) }
    const vm = b[E(4, 0, 5, 0)]
    // take the voltmeter off the wire and clip it across the rheostat instead
    for (const k of [E(4, 0, 5, 0), E(4, 0, 4, 1), E(5, 0, 5, 1)]) delete b[k]
    const r = checkWiring(ohm, run, withIds({ ...b, [E(5, 2, 5, 3)]: { type: 'wire' }, [E(5, 2, 6, 2)]: { ...vm, flip: true } }))
    expect(r.ok).toBe(false)
    expect(r.problems.join(' ')).toMatch(/voltmeter must be joined across/)
  })
})

describe('practicals: the measurement itself', () => {
  it('readings at five rheostat settings give V ÷ I close to the wire’s resistance, and a straight line', () => {
    const base = demoBoard(ohm, run), { AM, VM, KEY, RH } = meterKeys(base)
    const points = []
    for (const R of [50, 30, 18, 9, 4]) {
      const b = updatePart(updatePart(base, KEY, { closed: true }), RH, { R })
      const state = newState()
      let an
      for (let t = 0; t < 4; t += 0.05) an = step(b, state, 0.05).an // the needles settle in a few seconds
      const I = an.parts[AM].needle * b[AM].range - 0.02 // corrected for the zero error
      const V = an.parts[VM].needle * b[VM].range
      points.push([I, V])
    }
    const slope = fitThroughOrigin(points)
    expect(slope).toBeGreaterThan(nominalResistance(ohm, run) * 0.95)
    expect(slope).toBeLessThan(nominalResistance(ohm, run) * 1.05)
    expect(points[4][0]).toBeGreaterThan(points[0][0] * 3)
  })

  it('a typed reading counts if it is within about half a division of the needle', () => {
    expect(readingOk('0.36', 0.364, 1)).toBe(true)
    expect(readingOk('0.40', 0.364, 1)).toBe(false)
    expect(readingOk('', 0.364, 1)).toBe(false)
  })

  it('the series and parallel coils combine as the formulas say', () => {
    const s = PRACTICALS.find(p => p.id === 'series'), p = PRACTICALS.find(q => q.id === 'parallel')
    const measure = (spec, r) => {
      const b = demoBoard(spec, r), { AM, VM, KEY, RH } = meterKeys(b)
      const an = analyze(updatePart(updatePart(b, KEY, { closed: true }), RH, { R: 10 }))
      return an.parts[VM].reading / an.parts[AM].reading
    }
    const [r1, r2, rs] = s.runs.map(r => measure(s, r))
    expect(rs).toBeCloseTo(r1 + r2, 1)
    const [p1, p2, rp] = p.runs.map(r => measure(p, r))
    expect(1 / rp).toBeCloseTo(1 / p1 + 1 / p2, 2)
  })
})
