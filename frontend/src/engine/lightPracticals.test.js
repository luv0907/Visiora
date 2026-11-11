import { describe, it, expect } from 'vitest'
import { LIGHT_PRACTICALS, incident, firstPins, truePath, pinOnSight, eyeView, pinError, drawing, angleOk, ratio, trueIndex } from './lightPracticals'
import { angleOf, vec } from './raybench'

const [SLAB, PRISM] = LIGHT_PRACTICALS

/** Do it the way a careful student would: eye on the emergent ray, P3 and P4 on the sight line. */
function careful(spec, i) {
  const block = spec.shape()
  const t = truePath(spec, block, i)
  const eye = vec.add(t.exit, t.dir, 140)
  const [P1, P2] = firstPins(spec, i)
  const view = eyeView(block, eye, { P1, P2 })
  const look = view.P1.feet.find(f => f.through && !f.bounced).angle
  const P3 = pinOnSight(spec, block, eye, look, 15)
  const P4 = pinOnSight(spec, block, eye, look, 65)
  return { block, t, eye, P1, P2, P3, P4, view, look }
}

describe('glass slab practical', () => {
  it('puts P1 and P2 on the incident line at angle i to the normal', () => {
    const [P1, P2] = firstPins(SLAB, 45)
    const { O } = incident(SLAB, 45)
    expect(Math.abs(angleOf(vec.sub(O, P1)) - 45)).toBeLessThan(1e-9) // 45° from the downward normal is 45° below +x
    expect(Math.hypot(...vec.sub(O, P2))).toBeCloseTo(30, 9)
  })
  it('lines up the images of P1 and P2 when the eye is on the emergent ray', () => {
    const { view } = careful(SLAB, 45)
    const a1 = view.P1.feet.find(f => f.through).angle, a2 = view.P2.feet.find(f => f.through).angle
    expect(Math.abs(a1 - a2)).toBeLessThan(0.01)
  })
  it('a careful student finds e = i, n ≈ 1.52 and the right lateral shift', () => {
    for (const i of SLAB.angles) {
      const { block, P3, P4 } = careful(SLAB, i)
      const err = pinError(SLAB, block, i, P3, P4)
      expect(Math.max(...err)).toBeLessThan(0.05)
      const dr = drawing(SLAB, block, i, P3, P4)
      expect(dr.e).toBeCloseTo(i, 1)
      expect(ratio(i, dr.r)).toBeCloseTo(trueIndex(), 2)
      const r = dr.r * Math.PI / 180, ii = i * Math.PI / 180
      expect(dr.shift).toBeCloseTo((50 * Math.sin(ii - r)) / Math.cos(r), 1)
    }
  })
  it('a pin pushed 2 mm off the line gives angles that are visibly off', () => {
    const { block, P3, P4 } = careful(SLAB, 45)
    const off = vec.add(P3, [2, 0])
    const dr = drawing(SLAB, block, 45, off, P4)
    expect(Math.abs(dr.e - 45)).toBeGreaterThan(1.5)
    expect(pinError(SLAB, block, 45, off, P4)[0]).toBeGreaterThan(1.3)
  })
  it('sees the pin heads over the glass in a different direction from their feet through it', () => {
    const { view } = careful(SLAB, 45)
    const foot = view.P1.feet.find(f => f.through).angle
    expect(Math.abs(view.P1.head - foot)).toBeGreaterThan(2)
  })
  it('checks protractor readings to within a degree', () => {
    expect(angleOk('45', 45.6)).toBe(true)
    expect(angleOk('47', 45.6)).toBe(false)
    expect(angleOk('', 45)).toBe(false)
  })
})

describe('prism practical', () => {
  it('a careful student finds i + e = A + D at each angle', () => {
    for (const i of PRISM.angles) {
      const { block, t, P3, P4 } = careful(PRISM, i)
      expect(t.tir).toBe(false)
      const dr = drawing(PRISM, block, i, P3, P4)
      expect(i + dr.e).toBeCloseTo(60 + dr.D, 1)
      expect(dr.D).toBeGreaterThan(37)
      expect(dr.D).toBeLessThan(50)
    }
  })
  it('deviation dips to a minimum between the angles tried', () => {
    const D = PRISM.angles.map(i => { const c = careful(PRISM, i); return drawing(PRISM, c.block, i, c.P3, c.P4).D })
    expect(D[1]).toBeLessThan(D[0])
    expect(D[1]).toBeLessThan(D[2] + 0.5)
  })
})
