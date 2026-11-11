/**
 * VISIORA — a ray-optics bench (Class 10: Light). Rays are traced through glass blocks, prisms,
 * lenses, water and mirrors drawn on a sheet of paper, in millimetres with y pointing down.
 *   Refraction: Snell's law in vector form, n₁ sin i = n₂ sin r, at every surface.
 *   Reflection: how much light reflects and how much passes comes from the Fresnel equations
 *   for unpolarised light, so faint reflections are as faint as on a real block (4 % off glass).
 *   Total internal reflection when sin r would exceed 1.
 *   Dispersion: each material's index follows Cauchy's formula n(λ) = A + B/λ², fitted to the
 *   catalogue values at the hydrogen F (486 nm) and C (656 nm) lines, so white light splits.
 * The surrounding medium is air (n = 1); shapes must not overlap.
 */

/** Cauchy coefficients, λ in micrometres. nd is the catalogue index at 589 nm (sodium D). */
export const MATERIALS = {
  crown: { label: 'Crown glass', A: 1.50452, B: 0.004219, nd: 1.5168 },
  flint: { label: 'Flint glass', A: 1.59431, B: 0.008925, nd: 1.6200 },
  acrylic: { label: 'Acrylic (Perspex)', A: 1.47936, B: 0.004240, nd: 1.4916 },
  water: { label: 'Water', A: 1.32446, B: 0.002994, nd: 1.3331 },
  diamond: { label: 'Diamond', A: 2.37912, B: 0.013300, nd: 2.4174 },
}

/** Refractive index of a material for light of wavelength lam (nm). */
export function indexOf(mat, lam = 589) {
  const m = MATERIALS[mat]
  if (!m) return 1
  const um = lam / 1000
  return m.A + m.B / (um * um)
}

/** Light sources a ray box can hold: one colour (nm) or white, sampled across the spectrum. */
export const LIGHTS = {
  red: { label: 'Red laser', lams: [650] },
  green: { label: 'Green laser', lams: [532] },
  blue: { label: 'Blue laser', lams: [450] },
  white: { label: 'White light', lams: [410, 440, 470, 500, 530, 560, 590, 620, 650, 690] },
}

/** The colour of a wavelength (nm) as [r, g, b] 0–255, dimmed towards the ends of vision. */
export function spectrumRGB(lam) {
  let r = 0, g = 0, b = 0
  if (lam < 440) { r = (440 - lam) / 60; b = 1 } else if (lam < 490) { g = (lam - 440) / 50; b = 1 } else if (lam < 510) { g = 1; b = (510 - lam) / 20 } else if (lam < 580) { r = (lam - 510) / 70; g = 1 } else if (lam < 645) { r = 1; g = (645 - lam) / 65 } else { r = 1 }
  const f = lam < 420 ? 0.3 + (0.7 * (lam - 380)) / 40 : lam > 700 ? 0.3 + (0.7 * (780 - lam)) / 80 : 1
  return [r, g, b].map(c => Math.round(255 * Math.pow(c * f, 0.8)))
}

const D2R = Math.PI / 180
const EPS = 1e-7
const wrap = a => Math.atan2(Math.sin(a), Math.cos(a))
const dot = (a, b) => a[0] * b[0] + a[1] * b[1]
const cross = (a, b) => a[0] * b[1] - a[1] * b[0]
const sub = (a, b) => [a[0] - b[0], a[1] - b[1]]
const add = (a, b, s = 1) => [a[0] + s * b[0], a[1] + s * b[1]]
const unit = v => { const l = Math.hypot(v[0], v[1]) || 1; return [v[0] / l, v[1] / l] }
export const dirOf = deg => [Math.cos(deg * D2R), Math.sin(deg * D2R)]
export const angleOf = v => Math.atan2(v[1], v[0]) / D2R

// ——— shapes ———
/** Default sizes (mm). A slab is w × h; a prism is equilateral with side s; a semicircular block has radius r. */
export const SHAPES = {
  slab: { label: 'Glass slab', w: 80, h: 50, mat: 'crown' },
  prism: { label: 'Prism', s: 60, mat: 'crown' },
  semi: { label: 'Semicircular block', r: 40, mat: 'crown' },
  lens: { label: 'Convex lens', R: 100, a: 30, mat: 'crown' },
  concave: { label: 'Concave lens', R: 90, a: 30, t: 4, mat: 'crown' },
  tank: { label: 'Water tank', w: 90, h: 60, mat: 'water' },
  mirror: { label: 'Plane mirror', len: 70 },
}

let nextId = 1
export function makeShape(kind, x = 0, y = 0, rot = 0, extra = {}) {
  return { id: `s${nextId++}`, kind, x, y, rot, ...SHAPES[kind], label: undefined, ...extra }
}

/** Local outline points of a polygonal shape (before rotation), or null for curved ones. */
function polygon(s) {
  if (s.kind === 'slab' || s.kind === 'tank') return [[-s.w / 2, -s.h / 2], [s.w / 2, -s.h / 2], [s.w / 2, s.h / 2], [-s.w / 2, s.h / 2]]
  if (s.kind === 'prism') { const h = (s.s * Math.sqrt(3)) / 2; return [[0, (-2 * h) / 3], [s.s / 2, h / 3], [-s.s / 2, h / 3]] }
  return null
}

/**
 * The surfaces of a shape in paper coordinates. Lines are { type:'line', a, b, n }, arcs are
 * { type:'arc', c, r, mid, half, sign } (sign +1: the outward normal points away from c).
 * Every surface carries its outward normal so we know whether a ray is entering or leaving.
 */
export function surfaces(s) {
  const c = Math.cos(s.rot * D2R), sn = Math.sin(s.rot * D2R)
  const T = ([x, y]) => [s.x + x * c - y * sn, s.y + x * sn + y * c]
  const R = a => a + s.rot * D2R
  const line = (a, b, centre, extra) => {
    const A = T(a), B = T(b), mid = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2]
    let n = unit([B[1] - A[1], A[0] - B[0]])
    if (centre && dot(n, sub(mid, centre)) < 0) n = [-n[0], -n[1]]
    return { type: 'line', a: A, b: B, n, ...extra }
  }
  const poly = polygon(s)
  if (poly) {
    const centre = T([poly.reduce((m, p) => m + p[0], 0) / poly.length, poly.reduce((m, p) => m + p[1], 0) / poly.length])
    return poly.map((p, i) => line(p, poly[(i + 1) % poly.length], centre, { face: i }))
  }
  if (s.kind === 'mirror') return [line([-s.len / 2, 0], [s.len / 2, 0], null, { mirror: true })] // silvered face looks towards −y (local)
  if (s.kind === 'semi') {
    return [line([s.r, 0], [-s.r, 0], T([0, -s.r / 2]), { face: 0 }), { type: 'arc', c: T([0, 0]), r: s.r, mid: R(-Math.PI / 2), half: Math.PI / 2, sign: 1, face: 1 }]
  }
  if (s.kind === 'lens') {
    const h = Math.asin(s.a / s.R), off = Math.sqrt(s.R * s.R - s.a * s.a)
    return [{ type: 'arc', c: T([off, 0]), r: s.R, mid: R(Math.PI), half: h, sign: 1, face: 0 }, { type: 'arc', c: T([-off, 0]), r: s.R, mid: R(0), half: h, sign: 1, face: 1 }]
  }
  if (s.kind === 'concave') {
    // two hollow faces t apart at the centre, joined by flat rims at ±a
    const h = Math.asin(s.a / s.R), sag = s.R - Math.sqrt(s.R * s.R - s.a * s.a), edge = s.t / 2 + sag
    return [
      { type: 'arc', c: T([-s.t / 2 - s.R, 0]), r: s.R, mid: R(0), half: h, sign: -1, face: 0 },
      { type: 'arc', c: T([s.t / 2 + s.R, 0]), r: s.R, mid: R(Math.PI), half: h, sign: -1, face: 1 },
      line([-edge, -s.a], [edge, -s.a], T([0, 0]), { face: 2 }),
      line([edge, s.a], [-edge, s.a], T([0, 0]), { face: 3 }),
    ]
  }
  return []
}

/** Nearest crossing of the ray p + t·d (t > 0) with one surface: { t, n (outward) } or null. */
function hit(e, p, d) {
  if (e.type === 'line') {
    const E = sub(e.b, e.a), den = cross(d, E)
    if (Math.abs(den) < 1e-12) return null
    const A = sub(e.a, p), t = cross(A, E) / den, u = cross(A, d) / den
    return t > EPS && u >= 0 && u <= 1 ? { t, n: e.n } : null
  }
  const o = sub(p, e.c), b = dot(d, o), disc = b * b - (dot(o, o) - e.r * e.r)
  if (disc < 0) return null
  const q = Math.sqrt(disc)
  for (const t of [-b - q, -b + q]) {
    if (t <= EPS) continue
    const x = add(o, d, t)
    if (Math.abs(wrap(Math.atan2(x[1], x[0]) - e.mid)) <= e.half + 1e-9) return { t, n: [(e.sign * x[0]) / e.r, (e.sign * x[1]) / e.r] }
  }
  return null
}

/** Every surface in the scene, tagged with its shape, ready for tracing. */
export function sceneSurfaces(shapes) {
  return shapes.flatMap(s => surfaces(s).map(e => ({ ...e, shape: s })))
}

function nearest(all, p, d) {
  let best = null
  for (const e of all) {
    const h = hit(e, p, d)
    if (h && (!best || h.t < best.t)) best = { ...h, e }
  }
  return best
}

/**
 * What happens where a ray meets a surface. d is the ray's direction, nOut the outward normal,
 * nShape the shape's index. Returns { entering, n1, n2, i, r (null if TIR), R, T, refl, refr }.
 */
export function meet(d, nOut, nShape) {
  const entering = dot(d, nOut) < 0
  const n = entering ? nOut : [-nOut[0], -nOut[1]] // facing the incoming ray
  const n1 = entering ? 1 : nShape, n2 = entering ? nShape : 1
  const cosi = Math.min(1, -dot(d, n)), eta = n1 / n2
  const sin2t = eta * eta * (1 - cosi * cosi)
  const refl = unit(add(d, n, 2 * cosi))
  const i = Math.acos(cosi) / D2R
  if (sin2t > 1) return { entering, n1, n2, i, r: null, R: 1, T: 0, refl, refr: null, tir: true }
  const cost = Math.sqrt(1 - sin2t)
  const rs = (n1 * cosi - n2 * cost) / (n1 * cosi + n2 * cost)
  const rp = (n2 * cosi - n1 * cost) / (n2 * cosi + n1 * cost)
  const R = (rs * rs + rp * rp) / 2
  const refr = unit(add([eta * d[0], eta * d[1]], n, eta * cosi - cost))
  return { entering, n1, n2, i, r: Math.acos(cost) / D2R, R, T: 1 - R, refl, refr, tir: false }
}

const MIRROR_R = 0.92 // a silvered glass mirror; the rest is absorbed
const FAR = 3000

/**
 * Trace a beam from point p in direction d (unit) through the shapes. Every branch is followed
 * (the reflected part and the refracted part at each surface) until it is too faint to see.
 * Returns segments [{ a, b, I, lam }] in paper coordinates.
 */
export function traceBeam(shapes, p, d, { lams = [650], I = 1, minI = 0.01, maxSegments = 600, all = sceneSurfaces(shapes) } = {}) {
  const out = []
  for (const lam of lams) {
    const stack = [{ p, d, I: I / lams.length, depth: 0 }]
    while (stack.length && out.length < maxSegments * lams.length) {
      const ray = stack.pop()
      const h = nearest(all, ray.p, ray.d)
      if (!h) { out.push({ a: ray.p, b: add(ray.p, ray.d, FAR), I: ray.I, lam }); continue }
      const at = add(ray.p, ray.d, h.t)
      out.push({ a: ray.p, b: at, I: ray.I, lam })
      if (ray.depth > 40) continue
      const next = (dir, I) => { if (I * lams.length >= minI) stack.push({ p: at, d: dir, I, depth: ray.depth + 1 }) }
      if (h.e.mirror) {
        if (dot(ray.d, h.n) < 0) next(unit(add(ray.d, h.n, -2 * dot(ray.d, h.n))), ray.I * MIRROR_R)
        continue // the painted back absorbs
      }
      const m = meet(ray.d, h.n, indexOf(h.e.shape.mat, lam))
      next(m.refl, ray.I * m.R)
      if (m.refr) next(m.refr, ray.I * m.T)
    }
  }
  return out
}

/**
 * The main path of a single-colour ray: at each surface it carries on through (or bounces, when
 * that is all it can do). Returns { points, events: [{ at, shape, face, ...meet }], dir }.
 * Pins, protractor readings and the eye's view are worked out along this path.
 */
export function mainPath(shapes, p, d, { lam = 550, maxLen = FAR, all = sceneSurfaces(shapes) } = {}) {
  const points = [p], events = []
  let q = p, dir = d
  for (let k = 0; k < 20; k++) {
    const h = nearest(all, q, dir)
    if (!h) break
    const at = add(q, dir, h.t)
    points.push(at)
    if (h.e.mirror) {
      if (dot(dir, h.n) >= 0) return { points, events, dir: null }
      dir = unit(add(dir, h.n, -2 * dot(dir, h.n)))
      events.push({ at, shape: h.e.shape, face: h.e.face, mirror: true })
    } else {
      const m = meet(dir, h.n, indexOf(h.e.shape.mat, lam))
      events.push({ at, shape: h.e.shape, face: h.e.face, normal: h.n, ...m })
      dir = m.tir ? m.refl : m.refr
    }
    q = at
  }
  points.push(add(q, dir, maxLen))
  return { points, events, dir }
}

/**
 * Where an eye at `eye` sees a pin standing at `pin`, looking through whatever is in between:
 * the directions (degrees, as angleOf) of every image. A ray traced backwards from the eye in
 * that direction passes through the pin. `through` says whether that view passes through glass,
 * `bounced` whether it was reflected on the way (a second, fainter-looking image).
 */
export function sightings(shapes, eye, pin, { lam = 550, span = 75, stepDeg = 0.25 } = {}) {
  const all = sceneSurfaces(shapes)
  const base = angleOf(sub(pin, eye))
  const probe = deg => {
    const path = mainPath(shapes, eye, dirOf(deg), { lam, all })
    // the stretch of the path that passes the pin (it may be before, between or after surfaces)
    let best = null
    for (let k = 0; k + 1 < path.points.length; k++) {
      const s = path.points[k], seg = sub(path.points[k + 1], s), len = Math.hypot(seg[0], seg[1]), u = unit(seg)
      const along = dot(u, sub(pin, s))
      if (along < 0 || along > len) continue
      const miss = cross(u, sub(pin, s))
      if (!best || Math.abs(miss) < Math.abs(best.miss)) best = { miss, k }
    }
    if (!best) return null
    const crossed = path.events.slice(0, best.k)
    return { miss: best.miss, sig: `${best.k}:${crossed.map(e => `${e.shape.id}.${e.face}`).join(' ')}`, through: crossed.length > 0, bounced: crossed.some(e => e.tir || e.mirror) }
  }
  const found = []
  let prevDeg = base - span, prev = probe(prevDeg)
  for (let deg = base - span + stepDeg; deg <= base + span; deg += stepDeg) {
    const cur = probe(deg)
    if (prev && cur && prev.sig === cur.sig && Math.sign(prev.miss) !== Math.sign(cur.miss)) {
      let lo = prevDeg, hi = deg, flo = prev.miss
      for (let k = 0; k < 40; k++) {
        const mid = (lo + hi) / 2, m = probe(mid)
        if (!m || m.sig !== cur.sig) break
        if (Math.sign(m.miss) === Math.sign(flo)) { lo = mid; flo = m.miss } else hi = mid
      }
      const at = (lo + hi) / 2, m = probe(at)
      if (m && Math.abs(m.miss) < 0.05) found.push({ angle: at, through: m.through, bounced: m.bounced })
    }
    prev = cur; prevDeg = deg
  }
  return found
}

/** Critical angle (degrees) for light inside a material trying to get out into air. */
export function criticalAngle(mat, lam = 589) {
  return Math.asin(1 / indexOf(mat, lam)) / D2R
}

// ——— small geometry for drawing and measuring ———
/** Where two infinite lines (point + direction) cross, or null if parallel. */
export function lineCross(p, d, q, e) {
  const den = cross(d, e)
  if (Math.abs(den) < 1e-12) return null
  return add(p, d, cross(sub(q, p), e) / den)
}
/** Angle between two directions, 0–90° (lines, not rays: the sense does not matter). */
export function lineAngle(d, e) {
  const c = Math.abs(dot(unit(d), unit(e)))
  return Math.acos(Math.min(1, c)) / D2R
}
/** Angle between two directions, 0–180° (rays: the sense matters). */
export function rayAngle(d, e) {
  return Math.acos(Math.max(-1, Math.min(1, dot(unit(d), unit(e))))) / D2R
}
/** Perpendicular distance of point q from the line through p along d. */
export function distanceToLine(q, p, d) {
  return Math.abs(cross(unit(d), sub(q, p)))
}
export const vec = { dot, cross, sub, add, unit }
