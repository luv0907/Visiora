/**
 * VISIORA — the Class 10 electricity practicals, done the way the lab manual does them.
 *   1. Ohm's law: V against I for a resistance wire; R from the slope of the graph.
 *   2. Resistors in series: R₁, R₂, then both in series; is Rₛ = R₁ + R₂?
 *   3. Resistors in parallel: R₁, R₂, then both in parallel; is 1/Rₚ = 1/R₁ + 1/R₂?
 * The apparatus is real: cells, a plug key, a rheostat, coils of nichrome wire whose values the
 * student does not know, and analog meters with two ranges each, a least count and (the ammeter)
 * a zero error. Wiring is checked electrically, by what the meters would actually read, so any
 * correct circuit is accepted and every mistake gets the reason it is wrong.
 */
import { analyze, edgeKey, isMeter, meterPlus, node, settle, updatePart, withIds } from './board'
import { leastCount } from './components'

const E = (c1, r1, c2, r2) => edgeKey(node(c1, r1), node(c2, r2))

export const PRACTICALS = [
  {
    id: 'ohm', title: 'Ohm’s law', short: 'V against I',
    aim: 'To study how the potential difference V across a resistor depends on the current I through it, and to find its resistance from a V–I graph.',
    cells: 4, coils: { R: 9.6 }, rheostat: 50, ranges: { A: [0.5, 1], V: [5, 10] },
    runs: [{ id: 'R', label: 'the resistance wire', coils: ['R'], need: 5 }],
    graph: true,
  },
  {
    id: 'series', title: 'Resistors in series', short: 'R₁ + R₂',
    aim: 'To find the equivalent resistance of two resistors connected in series, and compare it with R₁ + R₂.',
    cells: 2, coils: { R1: 4.3, R2: 6.8 }, rheostat: 20, ranges: { A: [0.5, 1], V: [2.5, 5] },
    runs: [
      { id: 'R1', label: 'R₁ alone', coils: ['R1'], need: 3 },
      { id: 'R2', label: 'R₂ alone', coils: ['R2'], need: 3 },
      { id: 'S', label: 'R₁ and R₂ in series', coils: ['R1', 'R2'], combo: 'series', need: 3 },
    ],
  },
  {
    id: 'parallel', title: 'Resistors in parallel', short: '1/R₁ + 1/R₂',
    aim: 'To find the equivalent resistance of two resistors connected in parallel, and compare it with 1/Rₚ = 1/R₁ + 1/R₂.',
    cells: 2, coils: { R1: 6.2, R2: 9.1 }, rheostat: 20, ranges: { A: [0.5, 1], V: [2.5, 5] },
    runs: [
      { id: 'R1', label: 'R₁ alone', coils: ['R1'], need: 3 },
      { id: 'R2', label: 'R₂ alone', coils: ['R2'], need: 3 },
      { id: 'P', label: 'R₁ and R₂ in parallel', coils: ['R1', 'R2'], combo: 'parallel', need: 3 },
    ],
  },
]

/**
 * The apparatus on the bench for a practical. Each meter starts on its higher range (the safe
 * habit); the ammeter's needle rests one division above zero. The rheostat suits the coils: a
 * big one would make the smallest readings too small to read well.
 */
export const bench = spec => ({
  ammeter: { range: Math.max(...spec.ranges.A), zero: 1 },
  voltmeter: { range: Math.max(...spec.ranges.V), zero: 0 },
  rheostatMax: spec.rheostat,
})
export const zeroError = meter => ((meter.zero ?? 0) * leastCount(meter.range))

/** The apparatus to hand out for a practical (how many of each part). */
export function apparatus(spec) {
  return { battery: 1, key: 1, ammeter: 1, voltmeter: 1, rheostat: 1, coil: Object.keys(spec.coils).length, wire: 18 }
}
/** A part from the practical's bin. Coils come out in order R, or R₁ then R₂. */
export function benchPart(spec, type, board) {
  if (type === 'battery') return { type, cells: spec.cells, flip: true }
  if (type === 'key') return { type, closed: false }
  const B = bench(spec)
  if (type === 'ammeter') return { type, ...B.ammeter }
  if (type === 'voltmeter') return { type, ...B.voltmeter }
  if (type === 'rheostat') return { type, R: B.rheostatMax, Rmax: B.rheostatMax }
  if (type === 'coil') {
    const have = new Set(Object.values(board).filter(p => p.type === 'coil').map(p => p.name))
    const name = Object.keys(spec.coils).find(n => !have.has(n))
    return name ? { type, R: spec.coils[name], name, mystery: name === 'R' ? true : name.replace('R', '') } : null
  }
  return { type }
}

const find = (board, pred) => Object.keys(board).find(k => pred(board[k]))
const coilKey = (board, name) => find(board, p => p.type === 'coil' && p.name === name)

/** True resistance of what is being measured in a run, from the coils as they are now. */
export function trueResistance(spec, run, an, board) {
  const Rs = run.coils.map(n => an.parts[coilKey(board, n)]?.R ?? spec.coils[n])
  if (run.combo === 'parallel') return 1 / Rs.reduce((s, R) => s + 1 / R, 0)
  return Rs.reduce((s, R) => s + R, 0)
}
export function nominalResistance(spec, run) {
  const Rs = run.coils.map(n => spec.coils[n])
  if (run.combo === 'parallel') return 1 / Rs.reduce((s, R) => s + 1 / R, 0)
  return Rs.reduce((s, R) => s + R, 0)
}

const NAMES = { battery: 'the cells', key: 'the plug key', ammeter: 'the ammeter', voltmeter: 'the voltmeter', rheostat: 'the rheostat' }

/**
 * Is the circuit wired correctly for this run? Judged as if the plug key were put in, by what
 * would flow. Returns { ok, problems: [text], danger } — danger: what would happen if the key
 * went in now (an ammeter burning out, a short).
 */
export function checkWiring(spec, run, board) {
  board = withIds(board)
  const problems = []
  for (const type of ['battery', 'key', 'ammeter', 'voltmeter', 'rheostat']) {
    if (!find(board, p => p.type === type)) problems.push(`Put ${NAMES[type]} in the circuit.`)
  }
  for (const n of run.coils) if (!coilKey(board, n)) problems.push(`Put ${n === 'R' ? 'the resistance wire' : n === 'R1' ? 'R₁' : 'R₂'} in the circuit.`)
  if (problems.length) return { ok: false, problems }
  const AM = find(board, p => p.type === 'ammeter'), VM = find(board, p => p.type === 'voltmeter')
  const KEY = find(board, p => p.type === 'key'), RH = find(board, p => p.type === 'rheostat')
  if (board[AM].blown || board[VM].blown) return { ok: false, problems: ['A meter has burnt out. Get a new one from the bench first.'] }
  const keyIn = updatePart(board, KEY, { closed: true })
  const an = analyze(keyIn)
  const Iam = an.parts[AM].reading, Vvm = an.parts[VM].reading
  const danger = []
  if (an.short) danger.push('There is a short circuit: something joins the battery’s terminals almost directly.')
  if (Math.abs(Iam) > 3 * board[AM].range) danger.push(`The ammeter would carry ${Math.abs(Iam).toFixed(1)} A — far beyond its ${board[AM].range} A range. An ammeter has almost no resistance, so it must never be joined across the cells or across a resistor.`)
  if (danger.length) return { ok: false, problems: danger, danger: true }

  const coils = run.coils.map(n => an.parts[coilKey(board, n)])
  const others = Object.keys(board).filter(k => board[k].type === 'coil' && !run.coils.includes(board[k].name))
  if (coils.some(c => Math.abs(c.I) < 0.01)) {
    if (Math.abs(an.parts[VM].I) > 1e-4 && Math.abs(Iam) < 0.01) problems.push('Almost no current flows: the voltmeter is in series. A voltmeter has a very high resistance, so it goes across (parallel to) what it measures, never in the loop.')
    else problems.push(`No current flows through ${run.label}. Follow the loop from the + of the cells, through the key, ammeter, rheostat and ${run.label}, back to the −. Every joint must connect.`)
    return { ok: false, problems }
  }
  for (const k of others) if (Math.abs(an.parts[k].I) > 1e-3) problems.push(`Only ${run.label} should carry current in this part of the practical. Take the other coil out of the circuit.`)

  // what is being measured
  const Vtrue = run.combo === 'series' ? coils.reduce((s, c) => s + Math.abs(c.V), 0) : Math.abs(coils[0].V)
  const Itrue = run.combo === 'parallel' ? coils.reduce((s, c) => s + Math.abs(c.I), 0) : Math.abs(coils[0].I)
  if (run.combo === 'series' && Math.abs(Math.abs(coils[0].I) - Math.abs(coils[1].I)) > 0.01 * Itrue) problems.push('R₁ and R₂ must be in series: one after the other, with nothing branching off between them.')
  if (run.combo === 'parallel' && Math.abs(Math.abs(coils[0].V) - Math.abs(coils[1].V)) > 0.01 * Vtrue) problems.push('R₁ and R₂ must be in parallel: their left ends joined together, and their right ends joined together.')
  if (Math.abs(Math.abs(Iam) - Itrue) > 0.02 * Itrue + 0.002) problems.push(`The ammeter must carry all the current that goes through ${run.label}, and nothing else: put it in series, in the main loop.`)
  if (Math.abs(Math.abs(Vvm) - Vtrue) > 0.02 * Vtrue + 0.01) problems.push(`The voltmeter must be joined across ${run.label} — one lead at each end${run.combo === 'series' ? ' of the pair' : ''}, and nothing else between its leads.`)
  if (problems.length) return { ok: false, problems }
  if (Iam < 0) problems.push('The ammeter needle would kick backwards against its stop. Its + terminal must be on the side the current comes in from (the side towards the + of the cells). Select it and swap its leads.')
  if (Vvm < 0) problems.push('The voltmeter needle would kick backwards. Its + terminal must go to the end of the resistor nearer the + of the cells. Select it and swap its leads.')
  // the key and rheostat must control the current
  if (Math.abs(analyze(board).parts[AM].I) > 1e-4) problems.push('With the plug key taken out, current still flows. The key must be in series, so that taking it out breaks the whole circuit.')
  const slid = analyze(updatePart(keyIn, RH, { R: board[RH].R > 10 ? 2 : 40 }))
  if (Math.abs(Math.abs(slid.parts[AM].I) - Math.abs(an.parts[AM].I)) < 0.002) problems.push('Sliding the rheostat does not change the current. The rheostat must be in series in the main loop.')
  return { ok: problems.length === 0, problems }
}

/** The textbook layout of a run, for “Show me how to wire it”. */
export function demoBoard(spec, run) {
  const coil = name => ({ type: 'coil', R: spec.coils[name], name, mystery: name === 'R' ? true : name.replace('R', '') })
  const w = () => ({ type: 'wire' })
  const B = bench(spec)
  const b = {
    [E(0, 1, 0, 2)]: { type: 'battery', cells: spec.cells, flip: true },
    [E(0, 1, 1, 1)]: w(),
    [E(1, 1, 2, 1)]: { type: 'key', closed: false },
    [E(2, 1, 3, 1)]: { type: 'ammeter', ...B.ammeter },
    [E(3, 1, 4, 1)]: w(),
    [E(5, 1, 6, 1)]: w(),
    [E(6, 1, 6, 2)]: w(),
    [E(6, 2, 6, 3)]: w(),
    [E(5, 3, 6, 3)]: { type: 'rheostat', R: B.rheostatMax, Rmax: B.rheostatMax },
    ...Object.fromEntries([0, 1, 2, 3, 4].map(c => [E(c, 3, c + 1, 3), w()])),
    [E(0, 2, 0, 3)]: w(),
  }
  const vm = { type: 'voltmeter', ...B.voltmeter }
  if (run.combo === 'series') {
    // R₁ and R₂ one after the other along the top; the voltmeter spans both
    Object.assign(b, { [E(3, 1, 4, 1)]: coil('R1'), [E(4, 1, 5, 1)]: coil('R2'), [E(3, 1, 3, 0)]: w(), [E(3, 0, 4, 0)]: vm, [E(4, 0, 5, 0)]: w(), [E(5, 0, 5, 1)]: w() })
  } else if (run.combo === 'parallel') {
    Object.assign(b, {
      [E(4, 1, 5, 1)]: coil('R1'), [E(4, 2, 5, 2)]: coil('R2'), [E(4, 1, 4, 2)]: w(), [E(5, 1, 5, 2)]: w(),
      [E(4, 1, 4, 0)]: w(), [E(4, 0, 5, 0)]: vm, [E(5, 0, 5, 1)]: w(),
    })
  } else {
    Object.assign(b, { [E(4, 1, 5, 1)]: coil(run.coils[0]), [E(4, 1, 4, 0)]: w(), [E(4, 0, 5, 0)]: vm, [E(5, 0, 5, 1)]: w() })
  }
  return withIds(b)
}

/** Meter keys on a board. */
export const meterKeys = board => ({
  AM: find(board, p => p.type === 'ammeter'),
  VM: find(board, p => p.type === 'voltmeter'),
  KEY: find(board, p => p.type === 'key'),
  RH: find(board, p => p.type === 'rheostat'),
})

/** What a needle position reads, in units: fraction of full scale × range. */
export const indicated = (meter, x) => x * meter.range

/** Is a reading typed by the student what the needle showed? Within about half a division. */
export const readingOk = (typed, shown, range) => typed !== '' && typed != null && Number.isFinite(Number(typed)) && Math.abs(Number(typed) - shown) <= 0.6 * leastCount(range) + 1e-9

/** Straight line through the origin that best fits the points (least squares): slope = Σxy ÷ Σx². */
export function fitThroughOrigin(points) {
  const sxy = points.reduce((s, [x, y]) => s + x * y, 0), sxx = points.reduce((s, [x]) => s + x * x, 0)
  return sxx ? sxy / sxx : null
}
export const mean = xs => xs.reduce((s, x) => s + x, 0) / xs.length

/** What the practical's coils are really like after warming in use (for the result). */
export function steadyCheck(spec, run) {
  return settle(updatePart(demoBoard(spec, run), meterKeys(demoBoard(spec, run)).KEY, { closed: true }))
}

export { isMeter, meterPlus }
