/**
 * VISIORA — the breadboard behind the Circuits experiment (Class 10 Electricity).
 *
 * Parts sit on the edges of a grid of connection dots. The board becomes a netlist for the exact
 * nodal solver in engine/circuit.js, and the physics in engine/components.js makes it behave like
 * real apparatus over time:
 *   · a cold bulb filament has about 1/14 of its hot resistance, so it takes a surge of current at
 *     switch-on and lights in a few hundredths of a second; under-run, it glows dull red
 *   · cells have an EMF that falls as they run down, and an internal resistance that grows
 *   · resistors, rheostats, coils and wires warm up as I²R heats them, and can burn out
 *   · fuses melt after a delay that shrinks as the overload grows (a short melts them at once)
 *   · ammeters and voltmeters have real resistances, + and − terminals, ranges and needles with
 *     inertia; overloaded, their coils burn out
 *   · a fan's back-EMF grows as it speeds up; a bell's armature opens its own contact
 *
 * A board is { [edgeKey]: part }. Every part has an `id` (its temperature, charge and so on are
 * kept in a separate sim state by id, so they travel with the part when it is moved).
 *   wire | switch { closed } | key { closed } | push { closed }
 *   battery  { cells, soc? }        alkaline cells in a holder; soc = share of charge left
 *   supply   { volts }              battery eliminator, 0–12 V, limits at 2 A
 *   mains    { }                    220 V house supply
 *   bulb | lamp                     tungsten filaments (3 V 0.3 A torch bulb; 60 W 220 V lamp)
 *   resistor { R } | coil { R } | rheostat { R, Rmax? }
 *   fuse     { rating, wire? }      tin–lead fuse wire (wire: 'copper' = the unsafe thick wire)
 *   ammeter  { range, zero?, flip? } | voltmeter { range, zero?, flip? }
 *   fan | heater | bell             household appliances
 * Broken parts carry `blown: true` (a fuse: `melted: true`) and conduct nothing.
 * + ends: a battery's at the higher-numbered dot unless flipped; a meter's at the lower-numbered
 * dot unless flipped. Currents are signed along the edge from its lower-numbered dot.
 */
import { solve } from './circuit'
import {
  BELL, CELL, COIL, DMM, FAN, FUSE, HEATER, MAINS, MAINS_LAMP, METER, RESISTOR, RHEOSTAT, SUPPLY, T_ROOM, TORCH_BULB, WIRE,
  fuseTheta, meterHeat, rheostatTheta,
} from './components'

export const COLS = 7, ROWS = 4
export const CELL_V = 1.5 // what is printed on a cell
export const RESISTOR_VALUES = [5, 10, 20]
export const CONTACT_R = 0.005
/** Household appliances: power P at voltage V. */
export const APPLIANCES = {
  lamp: { label: '60 W lamp', P: 60, V: 220 },
  fan: { label: 'Ceiling fan', P: 75, V: 220 },
  heater: { label: '2000 W heater', P: 2000, V: 220 },
  bell: { label: 'Doorbell', P: BELL.V ** 2 / BELL.R, V: BELL.V },
}
const SOURCES = ['battery', 'mains', 'supply']
export const isSource = p => SOURCES.includes(p.type)
export const isMeter = p => p.type === 'ammeter' || p.type === 'voltmeter'
export const FILAMENTS = { bulb: TORCH_BULB, lamp: MAINS_LAMP }

let seq = 0
const uid = () => `p${(++seq).toString(36)}${Math.random().toString(36).slice(2, 6)}`
/** Give every part an id (boards written by hand in code have none yet). */
export function withIds(board) {
  if (Object.values(board).every(p => p.id)) return board
  return Object.fromEntries(Object.entries(board).map(([k, p]) => [k, p.id ? p : { ...p, id: uid() }]))
}

// ——— the grid ———
export const node = (c, r) => r * COLS + c
export const nodeAt = n => ({ c: n % COLS, r: Math.floor(n / COLS) })
export const edgeKey = (a, b) => (a < b ? `${a}-${b}` : `${b}-${a}`)
export const edgeEnds = key => key.split('-').map(Number)
export function adjacent(a, b) {
  const p = nodeAt(a), q = nodeAt(b)
  return Math.abs(p.c - q.c) + Math.abs(p.r - q.r) === 1
}
export function allEdges() {
  const out = []
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    if (c + 1 < COLS) out.push(edgeKey(node(c, r), node(c + 1, r)))
    if (r + 1 < ROWS) out.push(edgeKey(node(c, r), node(c, r + 1)))
  }
  return out
}

/** Which dot is the + end of a supply on this edge. */
export function batteryPlus(key, part) {
  const [a, b] = edgeEnds(key)
  return part.flip ? a : b
}
/** Which dot is the + terminal of a meter on this edge. */
export function meterPlus(key, part) {
  const [a, b] = edgeEnds(key)
  return part.flip ? b : a
}

// ——— sim state ———
/** Everything that changes with time, kept by part id. */
export function newState() { return { parts: {}, t: 0, dmm: { shown: null, at: -1 } } }
export function partState(state, part) {
  let s = state.parts[part.id]
  if (!s) {
    s = state.parts[part.id] = { T: T_ROOM, soc: part.soc ?? 1, w: 0, phase: 0, x: (part.zero ?? 0) / METER.divisions, v: 0, dir: 1, on: false }
  }
  return s
}
const cloneState = st => ({ ...st, parts: Object.fromEntries(Object.entries(st.parts).map(([k, v]) => [k, { ...v }])), dmm: { ...st.dmm } })

/** EMF and internal resistance of a supply right now. */
export function sourceOf(part, s) {
  if (part.type === 'mains') return { emf: MAINS.V, r: MAINS.R }
  if (part.type === 'supply') return { emf: part.volts ?? 6, r: SUPPLY.R, limit: SUPPLY.limit }
  const n = part.cells ?? 2, soc = s?.soc ?? part.soc ?? 1
  return { emf: n * CELL.emf(soc), r: n * CELL.r(soc) + 0.02 }
}
/** Label voltage of a supply (what is printed on it or set on its knob). */
export const sourceVolts = p => (p.type === 'mains' ? MAINS.V : p.type === 'supply' ? p.volts ?? 6 : CELL_V * (p.cells ?? 2))

/** Resistance of a part right now, or null for a gap (open switch, blown bulb, melted fuse). */
export function resistanceOf(p, s) {
  if (p.blown || p.melted) return null
  const T = s?.T ?? T_ROOM, dT = T - T_ROOM
  switch (p.type) {
    case 'wire': return WIRE.R * (1 + WIRE.alpha * dT)
    case 'switch': case 'key': case 'push': return p.closed ? CONTACT_R : null
    case 'bulb': case 'lamp': return FILAMENTS[p.type].R(T)
    case 'resistor': return p.R * (1 + RESISTOR.alpha * dT)
    case 'coil': return p.R * (1 + COIL.alpha * dT)
    case 'rheostat': return Math.max(0.02, p.R) * (1 + RHEOSTAT.alpha * dT)
    case 'fuse': return p.wire === 'copper' ? FUSE.COPPER.R : FUSE.R
    case 'ammeter': return METER.burden / p.range
    case 'voltmeter': return METER.ohmsPerVolt * p.range
    case 'heater': return HEATER.R0 * (1 + HEATER.alpha * dT)
    case 'fan': return FAN.R(s?.w ?? 0)
    case 'bell': return s?.contactOpen ? null : BELL.R
    default: return null
  }
}

/**
 * The board as solver elements. Each supply and the fan add a hidden node.
 * opts.probes: { plus, minus } dots for the digital multimeter. opts.cc: supplies in current-limit mode.
 * opts.without: leave this edge out (to find the circuit as that part sees it).
 */
export function toNetlist(board, state, opts = {}) {
  let nodes = COLS * ROWS
  const elements = []
  for (const [key, p] of Object.entries(board)) {
    if (key === opts.without) continue
    const [a, b] = edgeEnds(key)
    const s = state ? partState(state, p) : null
    if (isSource(p)) {
      if (p.blown) continue
      const plus = batteryPlus(key, p), minus = plus === a ? b : a, inside = nodes++
      const src = sourceOf(p, s)
      if (opts.cc?.[key]) elements.push({ id: `${key}:v`, type: 'I', p: inside, n: minus, I: src.limit })
      else elements.push({ id: `${key}:v`, type: 'V', p: inside, n: minus, V: src.emf })
      elements.push({ id: `${key}:r`, type: 'R', a: inside, b: plus, R: src.r })
      continue
    }
    if (p.type === 'bell' && opts.average && !p.blown) {
      // averaged over many strokes: the contact is closed for `duty` of each one
      elements.push({ id: key, type: 'R', a, b, R: BELL.R / BELL.duty })
      continue
    }
    const R = resistanceOf(p, s)
    if (R !== null) elements.push({ id: key, type: 'R', a, b, R })
  }
  if (opts.probes && opts.probes.plus != null && opts.probes.minus != null && opts.probes.plus !== opts.probes.minus) {
    elements.push({ id: 'dmm', type: 'R', a: opts.probes.plus, b: opts.probes.minus, R: DMM.R })
  }
  if (opts.test) elements.push({ id: 'test', type: 'I', p: opts.test[0], n: opts.test[1], I: 1 })
  return { nodes, elements }
}

function solveBoard(board, state, opts) {
  let cc = {}
  for (let i = 0; i < 3; i++) {
    const { nodes, elements } = toNetlist(board, state, { ...opts, cc })
    const sol = solve(nodes, elements)
    let again = false
    for (const [key, p] of Object.entries(board)) {
      if (p.type !== 'supply' || p.blown || cc[key]) continue
      if (Math.abs(sol.current(`${key}:v`)) > SUPPLY.limit) { cc = { ...cc, [key]: true }; again = true }
    }
    if (!again) return { sol, cc }
  }
  const { nodes, elements } = toNetlist(board, state, { ...opts, cc })
  return { sol: solve(nodes, elements), cc }
}

/**
 * Current, voltage, power and temperature of every part at this instant, plus dot voltages,
 * the multimeter reading and warnings. state: the sim state (omit for everything cold and new).
 */
export function analyze(board, state = null, opts = {}) {
  board = withIds(board)
  const st = state ?? newState()
  const { sol, cc } = solveBoard(board, st, opts)
  const parts = {}
  let short = false
  for (const [key, p] of Object.entries(board)) {
    const [a, b] = edgeEnds(key)
    const s = partState(st, p)
    let I = 0, V = sol.across(a, b), P = 0
    if (isSource(p)) {
      const out = sol.current(`${key}:v`) // pushed out of its + end
      I = batteryPlus(key, p) === b ? out : -out
      const src = sourceOf(p, s)
      P = Math.abs(out) * Math.abs(V)
      // shorted: most of the voltage is lost inside the source itself
      if (Math.abs(out) > 0.5 && Math.abs(V) < 0.3 * src.emf) short = true
      parts[key] = { I, V, P, T: s.T, emf: src.emf, r: src.r, cc: !!cc[key], soc: s.soc, heat: src.r * out * out }
      continue
    }
    I = sol.current(key)
    const R = resistanceOf(p, s)
    if (R !== null) P = I * I * R
    const info = { I, V, P, T: s.T, R }
    if (FILAMENTS[p.type]) info.light = p.blown ? 0 : FILAMENTS[p.type].light(s.T)
    if (p.type === 'fan') info.w = s.w
    if (p.type === 'bell') info.ringing = s.on
    if (isMeter(p)) {
      const plusA = meterPlus(key, p) === a
      info.reading = p.type === 'ammeter' ? (plusA ? I : -I) : plusA ? V : -V
      info.needle = s.x
    }
    parts[key] = info
  }
  const probe = opts.probes && opts.probes.plus != null && opts.probes.minus != null ? sol.across(opts.probes.plus, opts.probes.minus) : null
  return { parts, voltage: n => sol.voltage(n), short, probe }
}

// ——— heating ———
/** Heat capacity, heat input and loss for the parts that warm up. Null for parts that do not. */
function heatModel(p, info, s) {
  const I = info.I
  switch (p.type) {
    case 'wire': return { C: WIRE.C, P: info.P, loss: WIRE.loss(s.T), slope: 1 / WIRE.theta, Tfail: WIRE.Tfail }
    case 'bulb': case 'lamp': {
      const F = FILAMENTS[p.type]
      return { C: F.C, P: info.P, loss: F.loss(s.T), slope: F.slope(s.T) * 1.4, Tfail: F.BLOW }
    }
    case 'resistor': return { C: RESISTOR.C, P: info.P, loss: RESISTOR.loss(s.T), slope: 1 / RESISTOR.theta, Tfail: RESISTOR.Tfail }
    case 'coil': return { C: COIL.C, P: info.P, loss: COIL.loss(s.T), slope: 1 / COIL.theta, Tfail: COIL.Tfail }
    case 'rheostat': {
      const th = rheostatTheta(p.R, p.Rmax)
      return { C: RHEOSTAT.tau / th, P: info.P, loss: (s.T - T_ROOM) / th, slope: 1 / th, Tfail: RHEOSTAT.Tfail }
    }
    case 'heater': return { C: HEATER.tau / HEATER.theta, P: info.P, loss: (s.T - T_ROOM) / HEATER.theta, slope: 1 / HEATER.theta, Tfail: HEATER.Tfail }
    case 'fuse': {
      if (p.wire === 'copper') {
        const c = FUSE.COPPER
        return { C: c.C, P: I * I * c.R, loss: (s.T - T_ROOM) / c.theta, slope: 1 / c.theta, Tfail: 1356 }
      }
      const th = fuseTheta(p.rating)
      return { C: FUSE.tau / th, P: I * I * FUSE.R, loss: (s.T - T_ROOM) / th, slope: 1 / th, Tfail: FUSE.T_MELT }
    }
    case 'ammeter': case 'voltmeter': {
      const frac = (p.type === 'ammeter' ? I : info.V) / p.range
      return { C: METER.C, P: meterHeat(frac), loss: METER.loss(s.T), slope: 1 / METER.theta, Tfail: METER.Tfail }
    }
    case 'battery': {
      const th = CELL.theta / (p.cells ?? 2)
      return { C: CELL.tau / th, P: info.heat, loss: (s.T - T_ROOM) / th, slope: 1 / th, Tfail: 383 }
    }
    case 'bell': return { C: 2, P: info.P, loss: (s.T - T_ROOM) / 25, slope: 1 / 25, Tfail: 480 }
    default: return null
  }
}

/** Effective capacity of a cell drawn at I amps per cell (heavy drains get less out of it). */
const cellCapacity = I => CELL.capacity * Math.min(1, (0.1 / Math.max(1e-6, Math.abs(I))) ** 0.24)

/**
 * Advance the board by dt seconds (mutating `state`). Returns the analysis at the end and the
 * edges of any parts that failed (burnt out, blew, melted) — the caller marks them on the board.
 * opts: { probes }. Steps are split finely while things change fast (a filament lighting up).
 */
export function step(board, state, dt, opts = {}) {
  board = withIds(board)
  let left = dt, n = 0, an = null
  const failed = []
  while (left > 1e-9 && n++ < 600) {
    an = analyze(board, state, opts)
    let h = Math.min(left, 0.02)
    const rates = []
    for (const [key, p] of Object.entries(board)) {
      if (p.blown || p.melted) continue
      const info = an.parts[key], s = partState(state, p)
      const m = heatModel(p, info, s)
      if (m) {
        const rate = (m.P - m.loss) / m.C
        rates.push([key, p, s, m, rate])
        h = Math.min(h, 0.2 * m.C / m.slope, 30 / Math.max(1e-9, Math.abs(rate)) + 1e-5)
      }
      if (isMeter(p)) h = Math.min(h, 0.01)
      if (p.type === 'bell') h = Math.min(h, 0.004)
      if (p.type === 'fan') h = Math.min(h, 0.05)
    }
    h = Math.max(h, Math.min(left, 2e-5))
    for (const [key, p, s, m, rate] of rates) {
      s.T = Math.max(T_ROOM - 1, s.T + rate * h)
      if (s.T >= m.Tfail) failed.push(key)
    }
    for (const [key, p] of Object.entries(board)) {
      if (p.blown || p.melted) continue
      const info = an.parts[key], s = partState(state, p)
      if (p.type === 'battery') {
        const per = Math.abs(info.I)
        s.soc = Math.max(0, s.soc - (per * h) / cellCapacity(per))
      } else if (p.type === 'fan') {
        // bearing friction stops it once the supply is cut
        const torque = FAN.torque(info.I) - FAN.drag * s.w * s.w - (s.w > 0 ? 0.05 : 0)
        s.w = Math.max(0, s.w + (torque / FAN.J) * h)
      } else if (p.type === 'bell') {
        // powered when the supply's voltage reaches it (across the coil, or across its open contact)
        const v = Math.abs(info.V)
        s.on = v > 0.35 * BELL.V
        if (s.on) {
          s.phase += BELL.hz * Math.sqrt(Math.min(1.4, v / BELL.V)) * h
          const was = s.contactOpen
          s.contactOpen = s.phase % 1 > BELL.duty
          if (s.contactOpen && !was) s.breaks = (s.breaks ?? 0) + 1
        } else { s.phase = 0; s.contactOpen = false }
      } else if (isMeter(p)) {
        const target = info.reading / p.range + (p.zero ?? 0) / METER.divisions
        const w0 = 2 * Math.PI * METER.f0
        s.v += (w0 * w0 * (target - s.x) - 2 * METER.zeta * w0 * s.v) * h
        s.x += s.v * h
        // the needle hits its end stops and bounces a little
        if (s.x < -0.03) { s.x = -0.03; s.v = Math.abs(s.v) * 0.25 }
        if (s.x > 1.07) { s.x = 1.07; s.v = -Math.abs(s.v) * 0.25 }
      }
    }
    state.t += h
    left -= h
    if (failed.length) break
  }
  // the multimeter's display only changes a few times a second
  if (an && opts.probes) {
    if (state.t - state.dmm.at >= 1 / DMM.hz || state.dmm.shown == null) { state.dmm.shown = an.probe; state.dmm.at = state.t }
  }
  const final = analyze(board, state, opts)
  return { an: final, failed: [...new Set(failed)] }
}

/** How fast things are still changing: 0 when everything has settled. */
export function activity(board, state, an) {
  let a = 0
  for (const [key, p] of Object.entries(board)) {
    if (p.blown || p.melted) continue
    const s = partState(state, p), info = an.parts[key]
    const m = heatModel(p, info, s)
    if (m && m.C) a = Math.max(a, Math.abs((m.P - m.loss) / m.C) / 0.3)
    if (isMeter(p)) a = Math.max(a, Math.abs(s.v) * 200, Math.abs(info.reading / p.range + (p.zero ?? 0) / METER.divisions - s.x) * 400)
    if (p.type === 'bell' && s.on) a = Math.max(a, 1)
    if (p.type === 'fan') {
      const torque = FAN.torque(info.I) - FAN.drag * s.w * s.w - (s.w > 0 ? 0.05 : 0)
      if (s.w > 0 || torque > 0) a = Math.max(a, Math.abs(torque / FAN.J) * 5)
    }
    if (p.type === 'battery' && Math.abs(info.I) > 1e-4) a = Math.max(a, 0.001)
  }
  return a
}

// ——— the long-run steady state ———
/** Bisection for the x in [lo, hi] where f changes sign (f decreasing). */
function root(f, lo, hi, it = 60) {
  if (f(lo) <= 0) return lo
  if (f(hi) >= 0) return hi
  for (let i = 0; i < it; i++) { const m = (lo + hi) / 2; if (f(m) > 0) lo = m; else hi = m }
  return (lo + hi) / 2
}

/** The circuit as one part sees it: open-circuit voltage and resistance between its ends. */
function thevenin(board, state, key, opts) {
  const [a, b] = edgeEnds(key)
  const n0 = toNetlist(board, state, { ...opts, without: key, average: true })
  const voc = solve(n0.nodes, n0.elements).across(a, b)
  const n1 = toNetlist(board, state, { ...opts, without: key, average: true, test: [a, b] })
  return { voc, rth: Math.max(0, solve(n1.nodes, n1.elements).across(a, b) - voc) }
}

/** Temperature (and fan speed) each part settles at, holding the rest of the circuit as it is. */
function relax(board, state, opts) {
  let change = 0
  for (const [key, p] of Object.entries(board)) {
    if (p.blown || p.melted || p.type === 'wire' || p.type === 'battery') continue
    const s = partState(state, p)
    if (p.type === 'fan') {
      const { voc, rth } = thevenin(board, state, key, opts)
      const V = Math.abs(voc)
      const w = root(w => FAN.torque(V / (rth + FAN.R(w))) - FAN.drag * w * w - 0.05, 0, 3 * FAN.wRun)
      change = Math.max(change, Math.abs(w - s.w) / FAN.wRun)
      s.w = w
      continue
    }
    const probe = { ...p, blown: false }
    const R = T => resistanceOf(probe, { T })
    if (R(T_ROOM) == null) continue
    const m0 = heatModel(p, { I: 0, V: 0, P: 0 }, s)
    if (!m0) continue
    const { voc, rth } = thevenin(board, state, key, opts)
    const net = T => {
      const r = R(T), I = voc / (rth + r)
      const m = heatModel(p, { I, V: I * r, P: I * I * r }, { ...s, T })
      return m.P - m.loss
    }
    const T = root(net, T_ROOM, 4200)
    change = Math.max(change, Math.abs(T - s.T))
    s.T = T
  }
  // wires and cells: no feedback worth iterating, just their heat at the present currents
  const an = analyze(board, state, { ...opts, average: true })
  for (const [key, p] of Object.entries(board)) {
    if (p.blown || (p.type !== 'wire' && p.type !== 'battery')) continue
    const s = partState(state, p), m = heatModel(p, an.parts[key], s)
    s.T = T_ROOM + m.P / m.slope
  }
  return change
}

/** Time (s) for an overheating part to reach its failure temperature, from the state it is in. */
function timeToFail(p, info, s) {
  const m = heatModel(p, info, s)
  if (!m) return Infinity
  return (m.C * Math.max(0, m.Tfail - s.T)) / Math.max(1e-9, m.P)
}

/**
 * Leave the circuit on until nothing changes any more: everything warms to its working
 * temperature, and whatever cannot survive fails (the part that would fail first goes first).
 * Returns { board, an, state }. opts: { state (to start from), probes }.
 */
export function settle(board, opts = {}) {
  let b = withIds(board)
  const state = opts.state ? cloneState(opts.state) : newState()
  for (let round = 0; round < 8; round++) {
    // start from the cold circuit, so the first failure is judged from the switch-on surge
    const cold = analyze(b, state, opts)
    for (let i = 0; i < 25; i++) if (relax(b, state, opts) < 0.05) break
    const an = analyze(b, state, { ...opts, average: true })
    const over = Object.entries(b).filter(([k, p]) => {
      if (p.blown || p.melted) return false
      const m = heatModel(p, an.parts[k], partState(state, p))
      return m && partState(state, p).T >= m.Tfail - 0.5
    })
    if (!over.length) return { board: b, an: analyze(b, state, opts), state }
    // the part that fails first, judged at switch-on (for a filament that is the surge)
    let first = null, best = Infinity
    for (const [k, p] of over) {
      const t = timeToFail(p, cold.parts[k], { ...partState(state, p), T: T_ROOM })
      if (t < best) { best = t; first = k }
    }
    b = { ...b, [first]: fail(b[first]) }
    for (const s of Object.values(state.parts)) { s.T = T_ROOM; s.w = 0 }
  }
  return { board: b, an: analyze(b, state, opts), state }
}

/** The broken form of a part. */
export const fail = part => (part.type === 'fuse' ? { ...part, melted: true } : { ...part, blown: true })

/**
 * Jump forward a long time (hours of a torch left on): currents and temperatures are taken as
 * steady, and the cells run down by the charge that flows.
 */
export function warp(board, state, seconds, opts = {}) {
  board = withIds(board)
  for (let i = 0; i < 10; i++) if (relax(board, state, opts) < 0.05) break
  const an = analyze(board, state, { ...opts, average: true })
  for (const [key, p] of Object.entries(board)) {
    if (p.type !== 'battery' || p.blown) continue
    const s = partState(state, p), I = Math.abs(an.parts[key].I)
    s.soc = Math.max(0, s.soc - (I * seconds) / cellCapacity(I))
  }
  for (let i = 0; i < 10; i++) if (relax(board, state, opts) < 0.05) break
  const after = analyze(board, state, opts)
  for (const [key, p] of Object.entries(board)) {
    if (!isMeter(p)) continue
    const s = partState(state, p)
    s.x = after.parts[key].reading / p.range + (p.zero ?? 0) / METER.divisions; s.v = 0
  }
  state.t += seconds
  return after
}

// ——— editing ———
/** What clicking an edge does with a tool: place, replace, erase, or (hand) operate a part. */
export function applyTool(board, key, tool) {
  const here = board[key]
  if (tool.type === 'erase') {
    if (!here) return board
    const { [key]: _, ...rest } = board
    return rest
  }
  if (tool.type === 'hand' || (here && here.type === tool.type && tool.type !== 'resistor')) {
    if (!here) return board
    if (here.type === 'switch' || here.type === 'key') return { ...board, [key]: { ...here, closed: !here.closed } }
    if (isSource(here)) return { ...board, [key]: { ...here, flip: !here.flip } }
    if (here.type === 'resistor') {
      const i = RESISTOR_VALUES.indexOf(here.R)
      return { ...board, [key]: { ...here, R: RESISTOR_VALUES[(i + 1) % RESISTOR_VALUES.length] } }
    }
    if (here.blown || here.melted) return { ...board, [key]: repaired(here) } // a fresh bulb or fuse
    return board
  }
  return { ...board, [key]: newPart(tool) }
}

/** A part fresh from the bin. */
export function newPart(tool) {
  const part = { type: tool.type, id: uid() }
  if (tool.type === 'battery') part.cells = tool.cells ?? 2
  if (tool.type === 'supply') part.volts = tool.volts ?? 3
  if (tool.type === 'resistor') part.R = tool.R ?? 10
  if (tool.type === 'coil') part.R = tool.R ?? 10
  if (tool.type === 'rheostat') { part.R = tool.R ?? 20; part.Rmax = RHEOSTAT.Rmax }
  if (tool.type === 'switch' || tool.type === 'key') part.closed = tool.type === 'switch'
  if (tool.type === 'push') part.closed = false
  if (tool.type === 'fuse') part.rating = tool.rating ?? 5
  if (tool.type === 'ammeter') part.range = tool.range ?? 1
  if (tool.type === 'voltmeter') part.range = tool.range ?? 10
  return part
}

/** A fresh one of the same part (a new bulb, a new fuse wire, new cells): it starts cold. */
export function repaired(part) {
  const { blown: _b, melted: _m, soc: _s, ...rest } = part
  return { ...rest, id: uid() }
}

/** Change one part's settings (a knob or slider), keeping it where it is. */
export function updatePart(board, key, changes) {
  if (!board[key]) return board
  return { ...board, [key]: { ...board[key], ...changes } }
}

/** Pick a part up from one edge and put it on another (swapping if that edge is taken). */
export function movePart(board, from, to) {
  if (from === to || !board[from]) return board
  const next = { ...board }
  const there = next[to]
  next[to] = next[from]
  if (there) next[from] = there
  else delete next[from]
  return next
}

export const countOf = (board, type) => Object.values(board).filter(p => p.type === type).length
const keysOf = (board, type) => Object.keys(board).filter(k => board[k].type === type)

/** Bulbs giving at least `min` of their normal light, once warmed up, with every switch set to `closed`. */
function litWith(board, closed, min = 0.5) {
  const b = Object.fromEntries(Object.entries(board).map(([k, p]) => [k, p.type === 'switch' ? { ...p, closed } : p]))
  const { board: settled, an } = settle(b)
  return keysOf(settled, 'bulb').filter(k => !settled[k].blown && an.parts[k].light >= min)
}

/** Build-tab puzzles. `parts` are what you are given; `par` is the fewest parts that can do it. */
export const LEVELS = [
  { id: 'light', title: 'Light the bulb', par: 4, parts: { battery: 1, bulb: 1, wire: 6 },
    goal: 'Use the battery, the bulb and some wires to make the bulb glow. Current needs a complete loop.',
    check: (b, an) => keysOf(b, 'bulb').some(k => !b[k].blown && an.parts[k].light >= 0.5) },
  { id: 'switch', title: 'Add a switch', par: 4, parts: { battery: 1, bulb: 1, switch: 1, wire: 6 },
    goal: 'The bulb must glow when the switch is closed and go dark when it is open. Use the hand to flip the switch.',
    check: b => countOf(b, 'switch') > 0 && litWith(b, true).length > 0 && litWith(b, false).length === 0 },
  { id: 'parallel', title: 'Two bright bulbs', par: 7, parts: { battery: 1, bulb: 2, wire: 9 },
    goal: 'Make two bulbs glow, each nearly as brightly as one bulb would on its own.',
    check: (b, an) => countOf(b, 'bulb') === 2 && keysOf(b, 'bulb').every(k => !b[k].blown && an.parts[k].light >= 0.75) },
  { id: 'own-switch', title: 'A switch for one bulb', par: 8, parts: { battery: 1, bulb: 2, switch: 1, wire: 10 },
    goal: 'Both bulbs glow brightly. Opening the switch turns off only one of them; the other stays bright.',
    check: b => countOf(b, 'bulb') === 2 && litWith(b, true, 0.75).length === 2 && litWith(b, false, 0.75).length === 1 },
  { id: 'ammeter', title: 'Make it read 0.15 A', par: 4, parts: { battery: 1, ammeter: 1, resistor: 2, bulb: 1, wire: 8 },
    goal: 'Build a circuit in which the ammeter reads 0.15 A. Tip: I = V ÷ R, and the battery gives about 3 V. Select a resistor with the hand to change its value. Watch the + terminal of the ammeter!',
    check: (b, an) => keysOf(b, 'ammeter').some(k => !b[k].blown && Math.abs(an.parts[k].reading - 0.15) <= 0.012) },
  { id: 'safe', title: 'Don’t blow the bulb', par: 4, parts: { battery: 2, bulb: 1, resistor: 1, wire: 8 },
    goal: 'Use both batteries (6 V in all) to light the bulb, which is made for 3 V, without blowing it.',
    check: (b, an) => countOf(b, 'battery') === 2 && keysOf(b, 'battery').every(k => Math.abs(an.parts[k].I) > 0.05)
      && keysOf(b, 'bulb').some(k => !b[k].blown && an.parts[k].light >= 0.6) },
]

/** Stars for a solved puzzle: fewer parts, more stars. */
export const starsFor = (level, used) => (used <= level.par ? 3 : used <= level.par + 2 ? 2 : 1)
