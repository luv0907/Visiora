import { describe, it, expect } from 'vitest'
import { MATERIALS, indexOf, makeShape, mainPath, traceBeam, sightings, criticalAngle, dirOf, angleOf, lineAngle, rayAngle, distanceToLine, spectrumRGB } from './raybench'

const D2R = Math.PI / 180
const sinD = a => Math.sin(a * D2R)
/** A ray hitting the top face of a slab at angle i from the normal, from the upper left. */
const into = i => ({ p: [-15 - 50 * sinD(i), -25 - 50 * Math.cos(i * D2R)], d: [sinD(i), Math.cos(i * D2R)] })

describe('materials', () => {
  it('match the catalogue index at the sodium D line', () => {
    for (const m of Object.values(MATERIALS)) expect(Math.abs(m.A + m.B / 0.5893 ** 2 - m.nd)).toBeLessThan(0.002)
  })
  it('bend blue more than red (normal dispersion)', () => {
    for (const k of Object.keys(MATERIALS)) expect(indexOf(k, 450)).toBeGreaterThan(indexOf(k, 650))
  })
  it('give crown glass the textbook dispersion n_F − n_C ≈ 0.008', () => {
    expect(indexOf('crown', 486.1) - indexOf('crown', 656.3)).toBeCloseTo(0.00806, 4)
  })
  it('colour the spectrum sensibly', () => {
    const [r, , b] = spectrumRGB(650), [r2, , b2] = spectrumRGB(450)
    expect(r).toBeGreaterThan(200); expect(b).toBe(0); expect(b2).toBeGreaterThan(200); expect(r2).toBeLessThan(80)
  })
})

describe('glass slab', () => {
  const slab = makeShape('slab', 0, 0)
  for (const i of [30, 45, 60]) {
    it(`obeys Snell’s law and leaves parallel to the incident ray at i = ${i}°`, () => {
      const { p, d } = into(i)
      const path = mainPath([slab], p, d, { lam: 589 })
      const [enter, leave] = path.events
      const n = indexOf('crown', 589)
      expect(sinD(enter.i) / sinD(enter.r)).toBeCloseTo(n, 6)
      expect(enter.i).toBeCloseTo(i, 6)
      expect(leave.r).toBeCloseTo(i, 6) // e = i
      expect(rayAngle(path.dir, d)).toBeLessThan(1e-6)
    })
  }
  it('shifts the ray sideways by t·sin(i − r)/cos r', () => {
    const i = 45, { p, d } = into(i)
    const path = mainPath([slab], p, d, { lam: 589 })
    const r = path.events[0].r
    const shift = distanceToLine(path.points[2], p, d)
    expect(shift).toBeCloseTo((50 * sinD(i - r)) / Math.cos(r * D2R), 6)
  })
  it('reflects about 4 % at the first face at normal incidence', () => {
    const segs = traceBeam([slab], [0, -100], [0, 1], { lams: [589], minI: 0.001 })
    const back = segs.filter(s => s.b[1] < s.a[1] - 1 && s.a[1] === -25)
    expect(Math.max(...back.map(s => s.I))).toBeCloseTo(((1.5168 - 1) / (1.5168 + 1)) ** 2, 3)
  })
  it('conserves energy: the faint branches add up to what went in', () => {
    const { p, d } = into(40)
    const segs = traceBeam([slab], p, d, { lams: [589], minI: 1e-9 })
    const escaping = segs.filter(s => Math.hypot(s.b[0] - s.a[0], s.b[1] - s.a[1]) > 2000)
    expect(escaping.reduce((t, s) => t + s.I, 0)).toBeCloseTo(1, 4)
  })
})

describe('prism', () => {
  const prism = makeShape('prism', 0, 0)
  const hitLeft = i => {
    // the left face of an apex-up equilateral prism has its outward normal at 210° (pointing down-left… rotated)
    const path0 = mainPath([prism], [-200, 0], [1, 0])
    const face = path0.events[0]
    const nIn = [-Math.cos(-150 * D2R), -Math.sin(-150 * D2R)] // into the glass
    const nOut = [-nIn[0], -nIn[1]]
    // incoming direction at angle i to the normal, coming from below the normal (towards the base)
    const c = Math.cos(i * D2R), s = Math.sin(i * D2R)
    const d = [nIn[0] * c - nIn[1] * s, nIn[0] * s + nIn[1] * c]
    return { p: [face.at[0] - 100 * d[0] + 0 * nOut[0], face.at[1] - 100 * d[1]], d }
  }
  it('obeys i + e = A + D and r₁ + r₂ = A', () => {
    const { p, d } = hitLeft(45)
    const path = mainPath([prism], p, d, { lam: 589 })
    expect(path.events).toHaveLength(2)
    const [a, b] = path.events
    expect(a.r + b.i).toBeCloseTo(60, 6)
    const D = rayAngle(d, path.dir)
    expect(a.i + b.r).toBeCloseTo(60 + D, 6)
  })
  it('deviates least at symmetric passage: n = sin((A + Dm)/2) / sin(A/2)', () => {
    let best = { D: 999 }
    for (let i = 35; i <= 65; i += 0.05) {
      const { p, d } = hitLeft(i), path = mainPath([prism], p, d, { lam: 589 })
      if (path.events.length !== 2) continue
      const D = rayAngle(d, path.dir)
      if (D < best.D) best = { D, i, e: path.events[1].r }
    }
    expect(best.i).toBeCloseTo(best.e, 0)
    expect(sinD((60 + best.D) / 2) / sinD(30)).toBeCloseTo(indexOf('crown', 589), 3)
  })
  it('spreads white light into a spectrum with violet bent most', () => {
    const { p, d } = hitLeft(50)
    const Dred = rayAngle(d, mainPath([prism], p, d, { lam: 690 }).dir)
    const Dviolet = rayAngle(d, mainPath([prism], p, d, { lam: 410 }).dir)
    expect(Dviolet - Dred).toBeGreaterThan(1)
    expect(Dviolet - Dred).toBeLessThan(3)
  })
})

describe('semicircular block', () => {
  const semi = makeShape('semi', 0, 0, 0, { mat: 'crown' })
  /** Aim at the centre of the flat face from inside the glass, through the curved side, at angle a. */
  const at = a => {
    const d = [Math.sin(a * D2R), Math.cos(a * D2R)] // heading down towards the flat face
    return mainPath([semi], [-120 * d[0], -120 * d[1]], d, { lam: 589 })
  }
  it('lets light through the curved face without bending (it meets it along a radius)', () => {
    const path = at(20)
    expect(path.events[0].i).toBeLessThan(1e-4)
  })
  it('totally internally reflects just past the critical angle and not before', () => {
    const c = criticalAngle('crown', 589)
    expect(c).toBeCloseTo(41.24, 1)
    expect(at(c - 0.3).events[1].tir).toBe(false)
    expect(at(c + 0.3).events[1].tir).toBe(true)
  })
})

describe('convex lens', () => {
  it('brings parallel rays near the axis to a focus at about R / 2(n − 1)', () => {
    const lens = makeShape('lens', 0, 0)
    const n = indexOf('crown', 589)
    const cross = h => { const path = mainPath([lens], [-200, h], [1, 0], { lam: 589 }); const p = path.points[2], d = path.dir; return p[0] - (p[1] * d[0]) / d[1] }
    const f = cross(2) // paraxial ray, measured from the lens centre
    const thick = 100 - Math.sqrt(100 ** 2 - 30 ** 2)
    // thick-lens focal length from the back surface plus half the thickness
    const fThick = 1 / ((n - 1) * (2 / 100 - ((n - 1) * 2 * thick) / (n * 100 * 100)))
    expect(f).toBeGreaterThan(fThick * 0.9)
    expect(f).toBeLessThan(fThick * 1.05)
    expect(cross(25)).toBeLessThan(f) // spherical aberration: edge rays focus closer
  })
  it('a concave lens spreads parallel rays out', () => {
    const lens = makeShape('concave', 0, 0)
    const path = mainPath([lens], [-200, 10], [1, 0], { lam: 589 })
    expect(path.dir[1]).toBeGreaterThan(0.01) // bent away from the axis
  })
})

describe('mirror', () => {
  it('reflects at the same angle from the silvered side and blocks from the back', () => {
    const m = makeShape('mirror', 0, 0)
    const front = mainPath([m], [-50, -50], [Math.SQRT1_2, Math.SQRT1_2])
    expect(angleOf(front.dir)).toBeCloseTo(-45, 6)
    expect(mainPath([m], [-50, 50], [Math.SQRT1_2, -Math.SQRT1_2]).dir).toBeNull()
  })
})

describe('pin sighting', () => {
  const slab = makeShape('slab', 0, 0)
  it('sees a pin through the slab along the emergent ray', () => {
    const { p, d } = into(45)
    const path = mainPath([slab], p, d, { lam: 550 })
    const exit = path.points[2]
    const eye = [exit[0] + 150 * path.dir[0], exit[1] + 150 * path.dir[1]]
    const views = sightings([slab], eye, p, { lam: 550 })
    const through = views.find(v => v.through)
    expect(through).toBeTruthy()
    // the eye looks back up the emergent ray
    expect(lineAngle(dirOf(through.angle), path.dir)).toBeLessThan(0.01)
  })
  it('sees a pin straight on when nothing is in the way', () => {
    const views = sightings([slab], [100, 100], [100, 40])
    expect(views).toHaveLength(1)
    expect(views[0].through).toBe(false)
    expect(views[0].angle).toBeCloseTo(-90, 3)
  })
})
