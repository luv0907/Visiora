/**
 * VISIORA — the Class 10 light practicals done with pins, as in the school lab.
 *   Glass slab: trace the path of a ray through a rectangular slab for three angles of
 *   incidence, measure i, r and e, check that e = i, find n = sin i / sin r and the
 *   lateral displacement.
 *   Prism: trace the path through a triangular prism, measure i, e and the angle of
 *   deviation D, and check that i + e = A + D.
 * Everything is in millimetres on the drawing sheet, with y pointing down. The block is a
 * crown glass block and pins are sighted by eye in daylight, so the index is the one at 550 nm.
 */
import { makeShape, mainPath, sightings, lineCross, lineAngle, rayAngle, distanceToLine, indexOf, vec, dirOf } from './raybench'

const D2R = Math.PI / 180
export const SIGHT_LAM = 550 // the middle of daylight, where the eye is most sensitive
export const ANGLE_TOLERANCE = 1 // a protractor reads to 1°
export const PIN_TOLERANCE = 1.2 // mm off the true ray before the angles go visibly wrong

export const LIGHT_PRACTICALS = [
  {
    id: 'slab',
    title: 'Refraction through a glass slab',
    short: 'i, r, e and n',
    aim: 'To trace the path of a ray of light through a rectangular glass slab for different angles of incidence, measure the angle of incidence, angle of refraction and angle of emergence, and interpret the result.',
    apparatus: 'A rectangular glass slab (80 mm × 50 mm), a drawing board, a white sheet of paper, drawing pins, four office pins, a protractor, a scale and a sharp pencil.',
    shape: () => makeShape('slab', 0, 0, 0, { id: 'block' }),
    entryFace: 0, exitFace: 2,
    entry: [-15, -25],
    outward: [0, -1], // the entry face's outward normal
    exitOutward: [0, 1],
    angles: [30, 45, 60],
    need: 3,
    eye: i => [40 + 25 * Math.sin(i * D2R), 150],
  },
  {
    id: 'prism',
    title: 'Refraction through a prism',
    short: 'i, e and deviation',
    aim: 'To trace the path of a ray of light through a glass prism, measure the angle of incidence, angle of emergence and angle of deviation, and see how the deviation changes with the angle of incidence.',
    apparatus: 'An equilateral glass prism (sides 60 mm, A = 60°), a drawing board, a white sheet of paper, drawing pins, four office pins, a protractor, a scale and a sharp pencil.',
    shape: () => makeShape('prism', 0, 0, 0, { id: 'block' }),
    entryFace: 2, exitFace: 0,
    entry: [-15, -8.660254],
    outward: [-Math.cos(30 * D2R), -Math.sin(30 * D2R)],
    exitOutward: [Math.cos(30 * D2R), -Math.sin(30 * D2R)],
    angles: [35, 45, 55],
    need: 3,
    A: 60,
    eye: () => [150, 40],
  },
]

const neg = v => [-v[0], -v[1]]
/** Rotate v by deg (positive turns +x towards +y, i.e. clockwise on the page). */
const turn = (v, deg) => { const c = Math.cos(deg * D2R), s = Math.sin(deg * D2R); return [v[0] * c - v[1] * s, v[0] * s + v[1] * c] }

/**
 * The incident ray drawn at angle i: from the entry point O back up the line. For the slab it
 * comes from the upper left; for the prism from the lower left, below the normal, so it bends
 * towards the base as in the textbook figure.
 */
export function incident(spec, i) {
  const inward = neg(spec.outward)
  return { O: spec.entry, d: turn(inward, -i), inward }
}

/** Pins P1 and P2 stuck on the incident line, 80 mm and 30 mm before O: 5 cm apart, as the manual asks. */
export function firstPins(spec, i) {
  const { O, d } = incident(spec, i)
  return [vec.add(O, d, -80), vec.add(O, d, -30)]
}

/** Where the student's eye can go: on an arc round the middle of the exit face. */
export const EYE = {
  slab: { C: [0, 25], R: 140, min: 15, max: 165, start: 100 },
  prism: { C: [15, -8.660254], R: 140, min: -60, max: 70, start: -25 },
}
export const eyeAt = (spec, theta) => vec.add(EYE[spec.id].C, dirOf(theta), EYE[spec.id].R)
/** P3 and P4 go 15 mm and 65 mm in front of the glass, again 5 cm apart. */
export const PIN_GAPS = { P3: 15, P4: 65 }

/** The true path of light from P2 through the block (for checking, never shown before the end). */
export function truePath(spec, block, i) {
  const { O, d } = incident(spec, i)
  const path = mainPath([block], vec.add(O, d, -30), d, { lam: SIGHT_LAM })
  const exit = path.events[1]
  return { O, d, exit: exit?.at, dir: path.dir, r: path.events[0]?.r, e: exit?.r, tir: !!exit?.tir }
}

/**
 * Where P3 should go when the eye has lined up the images: on the eye's line of sight, `gap`
 * mm in front of the glass (from where the sight line leaves the exit face).
 */
export function pinOnSight(spec, block, eye, lookDeg, gap) {
  const d = dirOf(lookDeg)
  const faces = surfaceOf(block, spec.exitFace)
  const at = lineCross(eye, d, faces.a, vec.sub(faces.b, faces.a))
  if (!at) return null
  return vec.add(at, d, -gap)
}

function surfaceOf(block, face) {
  const c = Math.cos(block.rot * D2R), s = Math.sin(block.rot * D2R)
  const pts = block.kind === 'slab'
    ? [[-block.w / 2, -block.h / 2], [block.w / 2, -block.h / 2], [block.w / 2, block.h / 2], [-block.w / 2, block.h / 2]]
    : (() => { const h = (block.s * Math.sqrt(3)) / 2; return [[0, (-2 * h) / 3], [block.s / 2, h / 3], [-block.s / 2, h / 3]] })()
  const T = ([x, y]) => [block.x + x * c - y * s, block.y + x * s + y * c]
  return { a: T(pts[face]), b: T(pts[(face + 1) % pts.length]) }
}
export const faceOf = surfaceOf

/**
 * What the eye sees: for each pin, every direction it appears in. With the block on the sheet,
 * a pin behind it is seen twice: its head over the top of the glass (straight on) and its foot
 * through the glass (bent). Returns { [pinName]: [{ angle, through }] }.
 */
export function eyeView(block, eye, pins, blockIn = true) {
  const shapes = blockIn ? [block] : []
  const out = {}
  for (const [name, p] of Object.entries(pins)) {
    if (!p) continue
    const feet = sightings(shapes, eye, p, { lam: SIGHT_LAM })
    const head = vec.sub(p, eye)
    const headAngle = Math.atan2(head[1], head[0]) / D2R
    out[name] = { feet, head: headAngle }
  }
  return out
}

/** How far each sighted pin is from the true emergent ray, in mm. */
export function pinError(spec, block, i, P3, P4) {
  const t = truePath(spec, block, i)
  if (!t.exit || !t.dir) return null
  return [P3, P4].map(p => (p ? distanceToLine(p, t.exit, t.dir) : null))
}

/**
 * The drawing after the block is lifted off: lines through the pins, where they meet the
 * faces, and the angles a protractor would show. Works from the student's own pins, so a pin
 * placed badly gives angles that are off, exactly as on paper.
 */
export function drawing(spec, block, i, P3, P4) {
  const { O, d } = incident(spec, i)
  const exitFace = surfaceOf(block, spec.exitFace)
  const em = vec.unit(vec.sub(P4, P3)) // from the glass outwards
  const O2 = lineCross(P3, em, exitFace.a, vec.sub(exitFace.b, exitFace.a))
  if (!O2) return null
  const inside = vec.sub(O2, O)
  const r = lineAngle(inside, spec.outward)
  const e = lineAngle(em, spec.exitOutward)
  const out = { O, O2, d, em, i, r, e }
  if (spec.id === 'slab') out.shift = distanceToLine(O2, O, d)
  else {
    out.D = rayAngle(d, em)
    out.meet = lineCross(O, d, O2, em) // where the incident and emergent lines cross, for measuring D
  }
  return out
}

/** A typed protractor reading is right if it is within 1° of what the drawing shows. */
export const angleOk = (typed, actual, tol = ANGLE_TOLERANCE) => typed !== '' && typed != null && Number.isFinite(Number(typed)) && Math.abs(Number(typed) - actual) <= tol + 1e-9
/** A ruler reading in mm is right within half a millimetre. */
export const lengthOk = (typed, actual) => typed !== '' && typed != null && Number.isFinite(Number(typed)) && Math.abs(Number(typed) - actual) <= 0.5 + 1e-9

export const trueIndex = () => indexOf('crown', SIGHT_LAM)
export const ratio = (i, r) => Math.sin(i * D2R) / Math.sin(r * D2R)
export const mean = xs => xs.reduce((a, b) => a + b, 0) / xs.length
