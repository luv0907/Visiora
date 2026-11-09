/**
 * VISIORA Studio — Practical tab of Circuits: the board practicals done as in the school lab.
 * Note the least count and zero error of the meters, wire the circuit from its diagram (any
 * correct circuit works; a wrong one behaves as it would on the bench), then, for each rheostat
 * setting, put the plug key in, wait for the needles, read the dials, and take the key out.
 * Ohm's law ends with a V–I graph and its slope; series and parallel compare the measured
 * equivalent resistance with the formula. Viva questions close it. Marks: careful work earns stars.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useCanvas } from '../components/motion/useCanvas'
import { allEdges, analyze, countOf, movePart, repaired, updatePart } from '../engine/board'
import { leastCount } from '../engine/components'
import {
  PRACTICALS, bench, apparatus, benchPart, checkWiring, demoBoard, fitThroughOrigin, mean, meterKeys, nominalResistance, readingOk, zeroError,
} from '../engine/practicals'
import { CircuitBoard, DragGhost, Meter, Palette, Stars, TOOL_NAMES, ViewSwitches, useLab } from './CircuitBoard'
import { ACCENT, DATA, INK } from './drawings'
import { ExperimentShell, Group, Icon, Options, Slider } from './Shell'
import { Term } from './Term'

const MONO = '"IBM Plex Mono", monospace', SANS = '"Instrument Sans", sans-serif'
const MUTED = '#82868F'
const DONE_KEY = 'visiora.circuits.practicals'
const STEP_TITLES = { Aim: 'What we will find out', Meters: 'Get to know the meters', wire: 'Build the circuit', read: 'Take readings', Graph: 'Draw the graph', Result: 'Your result', Viva: 'Check your understanding' }
const sub = s => s.replace('R1', 'R₁').replace('R2', 'R₂')
const fmt = (v, d = 2) => (v == null || !Number.isFinite(v) ? '—' : v.toFixed(d))
/** Decimal places that suit a least count (0.02 → 2, 0.2 → 1). */
const places = range => Math.max(0, Math.ceil(-Math.log10(leastCount(range)) - 1e-9))

function loadDone() { try { return JSON.parse(localStorage.getItem(DONE_KEY)) || {} } catch { return {} } }

/** The circuit diagram the student wires from, in textbook symbols. */
function Diagram({ run }) {
  const s = INK, combo = run.combo
  const R = (x, y, label) => (
    <g>
      <rect x={x} y={y - 7} width="44" height="14" fill="#fff" stroke={s} strokeWidth="1.6" />
      <text x={x + 22} y={y + 20} textAnchor="middle" fontSize="11" fontFamily={SANS}>{label}</text>
    </g>
  )
  const meter = (x, y, l) => (<g><circle cx={x} cy={y} r="11" fill="#fff" stroke={s} strokeWidth="1.6" /><text x={x} y={y + 4} textAnchor="middle" fontSize="12" fontWeight="700" fontFamily={SANS}>{l}</text></g>)
  return (
    <svg viewBox="0 0 260 150" className="st-diagram" role="img" aria-label="Circuit diagram">
      <g fill="none" stroke={s} strokeWidth="1.6">
        {/* main loop */}
        <path d="M20 75 V30 H62 M86 30 H106 M128 30 H150 M210 30 H240 V120 H160 M110 120 H20 V95" />
        {combo === 'parallel' && <path d="M150 30 V60 H160 M204 60 H210 V30" />}
        {/* voltmeter across the resistor(s) */}
        <path d={combo === 'series' ? 'M150 30 V8 H170 M192 8 H210 V30' : 'M156 30 V8 H170 M192 8 H206 V30'} />
      </g>
      {/* cells: long plate + */}
      <g stroke={s}><line x1="10" y1="78" x2="30" y2="78" strokeWidth="1.6" /><line x1="14" y1="86" x2="26" y2="86" strokeWidth="4" /><line x1="20" y1="86" x2="20" y2="95" strokeWidth="1.6" /></g>
      <text x="34" y="82" fontSize="11" fontFamily={SANS}>+</text>
      {/* plug key */}
      <g fill="none" stroke={s} strokeWidth="1.6"><path d="M66 22 a8 8 0 0 0 0 16 M82 22 a8 8 0 0 1 0 16" /><circle cx="74" cy="30" r="2.5" fill={s} /></g>
      <text x="74" y="52" textAnchor="middle" fontSize="10" fill={MUTED} fontFamily={SANS}>K</text>
      {meter(117, 30, 'A')}
      {combo === 'series' ? <>{R(150, 30, 'R₁')}{R(194, 30, 'R₂')}</>
        : combo === 'parallel' ? <>{R(160, 30, 'R₁')}{R(160, 60, 'R₂')}<path d="M150 30 H160 M204 30 H210" stroke={s} strokeWidth="1.6" /></>
          : <>{R(160, 30, run.coils[0] === 'R' ? 'R' : sub(run.coils[0]))}<path d="M150 30 H160 M204 30 H210" stroke={s} strokeWidth="1.6" /></>}
      {meter(181, 8, 'V')}
      {/* rheostat */}
      <rect x="110" y="113" width="50" height="14" fill="#fff" stroke={s} strokeWidth="1.6" />
      <path d="M112 136 L158 104 M158 104 l-8 1 m8 -1 l-3 7" stroke={s} strokeWidth="1.4" fill="none" />
      <text x="135" y="146" textAnchor="middle" fontSize="10" fill={MUTED} fontFamily={SANS}>Rh</text>
    </svg>
  )
}

/** V against I with the best straight line through the origin. */
function VIGraph({ points, slope }) {
  const { ref } = useCanvas((ctx, w, h) => {
    ctx.clearRect(0, 0, w, h)
    const L = 54, R = w - 24, T = 14, B = h - 36
    const IMAX = Math.max(0.2, Math.ceil(Math.max(...points.map(p => p[0]), 0.1) * 10 + 0.5) / 10)
    const VMAX = Math.max(1, Math.ceil(Math.max(...points.map(p => p[1]), 1) + 0.5))
    const X = i => L + (i / IMAX) * (R - L), Y = v => B - (v / VMAX) * (B - T)
    ctx.font = `500 11px ${MONO}`; ctx.textBaseline = 'middle'
    // graph paper: fine squares, darker every fifth
    for (let i = 0; i <= 50; i++) {
      const x = L + (i / 50) * (R - L), y = B - (i / 50) * (B - T)
      ctx.fillStyle = i % 5 ? 'rgba(32,81,200,.05)' : 'rgba(32,81,200,.12)'
      ctx.fillRect(x, T, 1, B - T); ctx.fillRect(L, y, R - L, 1)
    }
    ctx.fillStyle = MUTED
    for (let k = 0; k <= 5; k++) { const i = (IMAX * k) / 5; ctx.textAlign = 'center'; ctx.fillText(i.toFixed(2), X(i), B + 14) }
    for (let k = 0; k <= 5; k++) { const v = (VMAX * k) / 5; ctx.textAlign = 'right'; ctx.fillText(v.toFixed(1), L - 8, Y(v)) }
    ctx.textAlign = 'center'; ctx.fillText('current I (A)', (L + R) / 2, B + 29)
    ctx.save(); ctx.translate(14, (T + B) / 2); ctx.rotate(-Math.PI / 2); ctx.fillText('potential difference V (V)', 0, 0); ctx.restore()
    ctx.fillStyle = INK; ctx.fillRect(L, T, 1.5, B - T); ctx.fillRect(L, B, R - L, 1.5)
    if (slope) {
      const iEnd = Math.min(IMAX, VMAX / slope)
      ctx.strokeStyle = ACCENT; ctx.lineWidth = 2
      ctx.beginPath(); ctx.moveTo(X(0), Y(0)); ctx.lineTo(X(iEnd), Y(slope * iEnd)); ctx.stroke()
      // the slope triangle
      const i1 = iEnd * 0.3, i2 = iEnd * 0.85
      ctx.setLineDash([4, 4]); ctx.strokeStyle = INK; ctx.lineWidth = 1
      ctx.beginPath(); ctx.moveTo(X(i1), Y(slope * i1)); ctx.lineTo(X(i2), Y(slope * i1)); ctx.lineTo(X(i2), Y(slope * i2)); ctx.stroke(); ctx.setLineDash([])
      ctx.fillStyle = INK; ctx.font = `600 11px ${SANS}`; ctx.textAlign = 'center'
      ctx.fillText(`ΔI = ${(i2 - i1).toFixed(3)} A`, X((i1 + i2) / 2), Y(slope * i1) + 12)
      ctx.textAlign = 'left'; ctx.fillText(`ΔV = ${(slope * (i2 - i1)).toFixed(2)} V`, X(i2) + 6, Y(slope * (i1 + i2) / 2))
    }
    for (const [i, v] of points) { ctx.strokeStyle = DATA; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(X(i) - 5, Y(v) - 5); ctx.lineTo(X(i) + 5, Y(v) + 5); ctx.moveTo(X(i) - 5, Y(v) + 5); ctx.lineTo(X(i) + 5, Y(v) - 5); ctx.stroke() }
  }, [points, slope])
  return <canvas ref={ref} className="st-fill" role="img" aria-label="Graph of potential difference against current" />
}

const VIVA = {
  common: [
    { q: 'Why is the plug key taken out between readings?', options: ['So the meters can rest', 'So the wire does not heat up, which would change its resistance, and the cells do not run down', 'To reset the zero error', 'It is not needed'], a: 1,
      why: 'Current heats the wire (I²R). A hotter nichrome wire has a slightly higher resistance, so the readings drift. The cells also run down.' },
    { q: 'How is an ammeter connected, and why?', options: ['In parallel, because it has a high resistance', 'In series, because it has a very low resistance', 'In series, because it has a high resistance', 'Either way'], a: 1,
      why: 'All the current must pass through it, and its tiny resistance hardly changes that current. Across a resistor or the cells, it would carry a huge current and burn out.' },
    { q: 'How is a voltmeter connected, and why?', options: ['In series, because it has a low resistance', 'In parallel, because it has a very high resistance', 'In parallel, because it has a low resistance', 'Either way'], a: 1,
      why: 'Across the resistor it takes almost no current, so it does not disturb the circuit. In series its high resistance would stop the current.' },
    { q: 'What is the rheostat for?', options: ['To measure the resistance', 'To change the current in the circuit by changing the total resistance', 'To protect the ammeter from zero error', 'To store charge'], a: 1,
      why: 'Sliding its contact puts more or less of its coil in the circuit, so you get several different readings from the same cells.' },
  ],
  ohm: { q: 'Your V–I graph is a straight line through the origin. What does that show?', options: ['V is proportional to I, so V ÷ I (the resistance) is constant', 'The resistance increases with current', 'The wire is a superconductor', 'The cells are flat'], a: 0,
    why: 'That is Ohm’s law: at a steady temperature, the current through a conductor is proportional to the potential difference across it.' },
  series: { q: 'In series, how does the equivalent resistance compare with R₁ and R₂?', options: ['Less than either', 'Between them', 'Equal to their sum, so more than either', 'Equal to their product'], a: 2,
    why: 'The same current must push through both in turn, so their resistances add: Rₛ = R₁ + R₂.' },
  parallel: { q: 'In parallel, how does the equivalent resistance compare with R₁ and R₂?', options: ['More than either', 'Less than the smaller of the two', 'Equal to their sum', 'Between them'], a: 1,
    why: 'Each resistor is an extra path for current, so together they let more through: 1/Rₚ = 1/R₁ + 1/R₂, smaller than either.' },
}

/** A short to-do list that ticks itself off as the student works. items: [[done, text], …] */
function Todo({ items }) {
  return (
    <ul className="st-todo">
      {items.map(([done, text], i) => (
        <li key={i} className={done ? 'is-done' : ''}><span className="st-tick" aria-hidden="true">{done && <Icon name="check" />}</span><span>{text}</span>{done && <span className="st-sr">done</span>}</li>
      ))}
    </ul>
  )
}

export default function Practical({ tabs, onTab }) {
  const [pid, setPid] = useState('ohm')
  const spec = PRACTICALS.find(p => p.id === pid)
  return <PracticalRun key={pid} spec={spec} tabs={tabs} onTab={onTab} onPick={setPid} />
}

function PracticalRun({ spec, tabs, onTab, onPick }) {
  const BENCH = useMemo(() => bench(spec), [spec])
  const steps = useMemo(() => ['Aim', 'Meters', ...spec.runs.flatMap(r => [`Wire ${r.id === 'R' ? '' : sub(r.id === 'S' ? 'R1+R2' : r.id === 'P' ? 'R1∥R2' : r.id)}`.trim(), `Read ${r.id === 'R' ? '' : sub(r.id === 'S' ? 'R1+R2' : r.id === 'P' ? 'R1∥R2' : r.id)}`.trim()]), ...(spec.graph ? ['Graph'] : []), 'Result', 'Viva'], [spec])
  const [step, setStep] = useState(0)
  const runIndex = step >= 2 && step < 2 + spec.runs.length * 2 ? Math.floor((step - 2) / 2) : spec.runs.length - 1
  const run = spec.runs[runIndex]
  const stage = step < 2 ? steps[step] : step < 2 + spec.runs.length * 2 ? ((step - 2) % 2 === 0 ? 'wire' : 'read') : steps[step]

  const { board, setBoard, an, sim } = useLab({})
  const [tool, setTool] = useState('hand')
  const [selected, setSelected] = useState(null)
  const [symbols, setSymbols] = useState(false)
  const [electrons, setElectrons] = useState(false)
  const [ghost, setGhost] = useState(null)
  const boardApi = useRef(null)
  const [meters, setMeters] = useState({ lcA: '', lcV: '', zA: '', zV: '', checked: false })
  const [wiring, setWiring] = useState(null)
  const [rows, setRows] = useState({}) // runId → [{ shownI, shownV, rangeA, rangeV, I, V }]
  const [checked, setChecked] = useState({})
  const [slopeIn, setSlopeIn] = useState('')
  const [slopeChecked, setSlopeChecked] = useState(false)
  const [viva, setViva] = useState({})
  const [marks, setMarks] = useState({ burnt: 0, retries: 0, longKey: 0 })
  const [done, setDone] = useState(loadDone)

  const { AM, VM, KEY, RH } = meterKeys(board)
  const am = AM ? board[AM] : { type: 'ammeter', ...BENCH.ammeter }, vm = VM ? board[VM] : { type: 'voltmeter', ...BENCH.voltmeter }
  const keyIn = !!(KEY && board[KEY].closed)
  const needle = key => () => {
    const p = key && board[key]
    if (!p) return (key === AM ? BENCH.ammeter.zero : 0) / 50
    return sim.current.state.parts[p.id]?.x ?? (p.zero ?? 0) / 50
  }
  const readA = useMemo(() => needle(AM), [AM, board[AM]?.id])
  const readV = useMemo(() => needle(VM), [VM, board[VM]?.id])

  // how long the key has been in (the wire warms meanwhile)
  const [keyTime, setKeyTime] = useState(0)
  useEffect(() => {
    if (!keyIn) { setKeyTime(0); return undefined }
    const t0 = performance.now()
    const id = setInterval(() => setKeyTime((performance.now() - t0) / 1000), 500)
    return () => clearInterval(id)
  }, [keyIn])
  useEffect(() => { if (keyTime > 30 && keyTime < 31) setMarks(m => ({ ...m, longKey: m.longKey + 1 })) }, [Math.floor(keyTime)])
  // count burnt meters
  const burntNow = Object.values(board).filter(p => (p.type === 'ammeter' || p.type === 'voltmeter') && p.blown).length
  const lastBurnt = useRef(0)
  useEffect(() => { if (burntNow > lastBurnt.current) setMarks(m => ({ ...m, burnt: m.burnt + burntNow - lastBurnt.current })); lastBurnt.current = burntNow }, [burntNow])

  const coilKeys = Object.keys(board).filter(k => board[k].type === 'coil')
  const heatRise = coilKeys.length ? Math.max(...coilKeys.map(k => (an.parts[k]?.R ?? board[k].R) / board[k].R - 1)) : 0

  // ——— building ———
  const kit = apparatus(spec)
  const left = Object.fromEntries(Object.entries(kit).map(([t, n]) => [t, n - countOf(board, t)]))
  const place = (key, type) => {
    if (left[type] <= 0) return false
    const part = benchPart(spec, type, board)
    if (!part) return false
    // dropped where the guide shows that part: face it the way the guide does
    if (showGuide && guide[key]?.type === type && 'flip' in guide[key]) part.flip = guide[key].flip
    setBoard(b => ({ ...b, [key]: part }))
    return true
  }
  const onEdge = key => {
    if (stage !== 'wire') { if (board[key]?.type === 'key') setBoard(b => updatePart(b, key, { closed: !b[key].closed })); setSelected(board[key] ? key : null); return }
    if (tool === 'hand') {
      setSelected(board[key] ? key : null)
      if (board[key]?.type === 'key') setBoard(b => updatePart(b, key, { closed: !b[key].closed }))
      return
    }
    if (tool === 'erase') { setBoard(b => { const { [key]: _, ...rest } = b; return rest }); return }
    if (board[key]) return
    if (place(key, tool) && tool !== 'wire') { setSelected(key); setTool('hand') }
    setWiring(null)
  }
  const onMove = (from, to) => {
    if (stage !== 'wire') return
    setBoard(b => (to ? movePart(b, from, to) : (({ [from]: _, ...rest }) => rest)(b)))
    setSelected(to); setWiring(null)
  }
  const onDragPart = (type, x, y, dropped) => {
    if (!dropped) { setGhost({ type, x, y }); boardApi.current?.hoverAt(x, y); return }
    setGhost(null); boardApi.current?.hoverAt(null)
    const key = boardApi.current?.edgeAt(x, y)
    if (key && !board[key] && place(key, type)) { setSelected(key); setTool('hand'); setWiring(null) }
  }
  const change = changes => setBoard(b => updatePart(b, selected, changes))
  // the wiring is judged live, so the to-do list can tick itself off
  const live = useMemo(() => (stage === 'wire' ? checkWiring(spec, run, board) : null), [stage, spec, run, board])
  const [showGuide, setShowGuide] = useState(true)
  const guide = useMemo(() => demoBoard(spec, run), [spec, run])
  const sel = selected && board[selected] ? board[selected] : null

  const go = n => { setStep(n); setSelected(null); setWiring(null); if (KEY) setBoard(b => (b[KEY] ? updatePart(b, KEY, { closed: false }) : b)) }

  // ——— readings ———
  const runRows = rows[run.id] ?? []
  const amShown = readA() * am.range, vmShown = readV() * vm.range
  const settled = AM && VM && Math.abs(sim.current.state.parts[board[AM].id]?.v ?? 0) < 0.01 && Math.abs(sim.current.state.parts[board[VM].id]?.v ?? 0) < 0.01
  const offScale = readA() > 1.0 || readV() > 1.0
  const backwards = readA() < -0.01 || readV() < -0.01
  const distinct = runRows.every(r => Math.abs(r.shownI - amShown) >= 2 * leastCount(am.range))
  const canRecord = keyIn && settled && !offScale && !backwards && !am.blown && !vm.blown && Math.abs(amShown) > 0.02
  const record = () => setRows(r => ({ ...r, [run.id]: [...(r[run.id] ?? []), { shownI: amShown, shownV: vmShown, rangeA: am.range, rangeV: vm.range, zeroA: zeroError(am), zeroV: zeroError(vm), I: '', V: '' }] }))
  const typed = (i, k, v) => setRows(r => ({ ...r, [run.id]: r[run.id].map((row, j) => (j === i ? { ...row, [k]: v } : row)) }))
  const rowOk = r => readingOk(r.I, r.shownI, r.rangeA) && readingOk(r.V, r.shownV, r.rangeV)
  const runDone = id => { const rs = rows[id] ?? []; return rs.length >= spec.runs.find(r => r.id === id).need && rs.every(rowOk) }
  const corrected = r => ({ I: Number(r.I) - r.zeroA, V: Number(r.V) - r.zeroV })
  const resistanceOfRun = id => { const rs = (rows[id] ?? []).filter(rowOk).map(corrected).filter(c => c.I > 0); return rs.length ? mean(rs.map(c => c.V / c.I)) : null }

  // ——— results ———
  const points = (rows[spec.runs[0].id] ?? []).filter(rowOk).map(r => { const c = corrected(r); return [c.I, c.V] })
  const fit = fitThroughOrigin(points)
  const slopeOk = fit && Math.abs(Number(slopeIn) - fit) <= 0.04 * fit
  const stars = (marks.burnt ? 0 : 1) + (marks.retries <= 1 ? 1 : 0) + (marks.longKey ? 0 : 1)
  const vivaQs = [...VIVA.common, VIVA[spec.id]]
  const vivaDone = vivaQs.every((_, i) => viva[i] != null)
  useEffect(() => {
    if (!vivaDone || done[spec.id] >= Math.max(1, stars)) return
    const next = { ...done, [spec.id]: Math.max(1, stars) }
    setDone(next)
    try { localStorage.setItem(DONE_KEY, JSON.stringify(next)) } catch { /* private mode */ }
  }, [vivaDone])

  const startOver = () => { setStep(0); setBoard({}); setRows({}); setChecked({}); setMeters({ lcA: '', lcV: '', zA: '', zV: '', checked: false }); setSlopeIn(''); setSlopeChecked(false); setViva({}); setMarks({ burnt: 0, retries: 0, longKey: 0 }) }

  // ——— panel ———
  const lcOk = { A: Math.abs(Number(meters.lcA) - leastCount(BENCH.ammeter.range)) < 1e-6, V: Math.abs(Number(meters.lcV) - leastCount(BENCH.voltmeter.range)) < 1e-6 }
  const zOk = { A: meters.zA !== '' && Math.abs(Number(meters.zA) - zeroError(BENCH.ammeter)) < 1e-6, V: meters.zV !== '' && Math.abs(Number(meters.zV) - zeroError(BENCH.voltmeter)) < 1e-6 }
  const nextRunStep = 2 + (runIndex + 1) * 2

  let body = null
  if (stage === 'Aim') {
    body = (
      <>
        <Group label="Choose the practical">
          <div className="st-levels">
            {PRACTICALS.map((p, i) => (
              <button key={p.id} className={`st-level ${p.id === spec.id ? 'is-on' : ''}`} onClick={() => onPick(p.id)}>
                <span className="st-num">{i + 1}</span><span className="st-level-name">{p.title}</span>
                {done[p.id] ? <Stars n={done[p.id]} /> : <span className="st-locked">{p.short}</span>}
              </button>
            ))}
          </div>
        </Group>
        <p><b>Aim.</b> {spec.aim}</p>
        <button className="st-btn st-btn-primary st-btn-wide" onClick={() => go(1)}>Start the practical</button>
        <p><b>Apparatus.</b> A battery of {spec.cells} dry cells ({(spec.cells * 1.5).toFixed(1)} V), a plug key, an ammeter (0–0.5 A and 0–1 A), a voltmeter (0–{spec.ranges.V[0]} V and 0–{spec.ranges.V[1]} V), a rheostat (0–{BENCH.rheostatMax} Ω), {Object.keys(spec.coils).length === 1 ? 'a coil of nichrome wire of unknown resistance' : 'two coils of nichrome wire, R₁ and R₂, of unknown resistance'}, and connecting wires.</p>
        <Diagram run={spec.runs[spec.runs.length - 1]} />
      </>
    )
  } else if (stage === 'Meters') {
    const answers = { lcA: leastCount(BENCH.ammeter.range), lcV: leastCount(BENCH.voltmeter.range), zA: zeroError(BENCH.ammeter), zV: zeroError(BENCH.voltmeter) }
    const field = (k, label, unit) => (
      <label className="st-field">
        <span>{label}</span>
        <input className={`st-answer ${meters.checked ? ({ lcA: lcOk.A, lcV: lcOk.V, zA: zOk.A, zV: zOk.V }[k] ? 'is-right' : 'is-wrong') : ''}`} value={meters[k]}
          onChange={e => setMeters(m => ({ ...m, [k]: e.target.value }))} inputMode="decimal" placeholder="?" />
        <em>{unit}</em>
      </label>
    )
    const allOk = lcOk.A && lcOk.V && zOk.A && zOk.V
    body = (
      <>
        <p>Before building, a scientist checks the measuring instruments. Look at the <b>two dials under the board</b> (click one to see it bigger) and fill in four numbers. You build the circuit in the next step.</p>
        <div className="st-form">
          <span className="st-form-head">Ammeter (0–{BENCH.ammeter.range} A)</span>
          {field('lcA', <><Term k="least count">Least count</Term> (one small division)</>, 'A')}
          {field('zA', <><Term k="zero error">Zero error</Term> (where the needle rests)</>, 'A')}
          <span className="st-form-head">Voltmeter (0–{BENCH.voltmeter.range} V)</span>
          {field('lcV', 'Least count (one small division)', 'V')}
          {field('zV', 'Zero error (where the needle rests)', 'V')}
        </div>
        <details className="st-help-more">
          <summary>How do I work these out?</summary>
          <ul className="st-howto">
            <li><b>One small division:</b> divide the full scale by the 50 divisions. For the ammeter, {BENCH.ammeter.range} A ÷ 50.</li>
            <li><b>Where the needle rests:</b> nothing is connected yet, so a perfect needle would sit exactly on 0. Count how many small divisions above 0 it sits, and multiply by one division. If it is on 0, type 0.</li>
          </ul>
        </details>
        {allOk && meters.checked ? (
          <>
            <p className="st-callout is-ok"><b>Right.</b> The ammeter needle rests one division ({zeroError(BENCH.ammeter)} A) above 0, so every current it shows is {zeroError(BENCH.ammeter)} A too high. The table will subtract it for you.</p>
            <button className="st-btn st-btn-primary st-btn-wide" onClick={() => go(2)}>Next: build the circuit</button>
          </>
        ) : (
          <>
            <div className="st-row">
              <button className="st-btn st-btn-primary" onClick={() => setMeters(m => ({ ...m, checked: true }))}>Check my answers</button>
              <button className="st-btn st-btn-secondary" onClick={() => { setMeters({ ...Object.fromEntries(Object.entries(answers).map(([k, v]) => [k, String(+v.toFixed(3))])), checked: true }); setMarks(m => ({ ...m, retries: m.retries + 1 })) }}>Show me the answers</button>
            </div>
            {meters.checked && <p className="st-callout">The boxes in red are not right yet. Open “How do I work these out?” for help, or use “Show me the answers”.</p>}
          </>
        )}
      </>
    )
  } else if (stage === 'wire') {
    const has = type => Object.values(board).some(p => p.type === type)
    const hasCoil = n => Object.values(board).some(p => p.type === 'coil' && p.name === n)
    body = (
      <>
        {runIndex > 0 && <p className="st-callout">Change the circuit to measure {run.combo ? `R₁ and R₂ ${run.combo === 'series' ? 'in series: one after the other' : 'in parallel: side by side'}` : `${run.label}: take the other coil out`}.</p>}
        <p>Build this circuit on the board. Drag each part from the tray below the board onto a gap between two dots.</p>
        <Diagram run={run} />
        <Todo items={[
          [has('battery'), 'Cells'],
          [has('key'), <><Term k="plug key">Plug key</Term> (leave it out)</>],
          [has('ammeter'), <><Term k="ammeter">Ammeter</Term>, in the loop</>],
          ...run.coils.map(n => [hasCoil(n), n === 'R' ? 'The resistance wire' : `Coil ${sub(n)}`]),
          [has('voltmeter'), <><Term k="voltmeter">Voltmeter</Term>, across {run.coils.length > 1 ? 'the coils' : 'the wire'}</>],
          [has('rheostat'), <><Term k="rheostat">Rheostat</Term>, in the loop</>],
          [!!live?.ok, 'Join everything into one complete loop with wires'],
        ]} />
        <label className="st-check"><span>Show where the parts go</span><span className="st-switch"><input type="checkbox" checked={showGuide} onChange={e => setShowGuide(e.target.checked)} /><span /></span></label>
        {live?.ok ? (
          <>
            <p className="st-callout is-ok"><b>The circuit is right.</b> The ammeter is in the loop, the voltmeter is across {run.label}, both red + terminals face the + of the cells, and the key and rheostat control the current.</p>
            <button className="st-btn st-btn-primary st-btn-wide" onClick={() => go(step + 1)}>Next: take readings</button>
          </>
        ) : (
          <>
            <div className="st-row">
              <button className="st-btn st-btn-primary" onClick={() => { setWiring(checkWiring(spec, run, board)); setMarks(m => ({ ...m, retries: m.retries + 1 })) }}>What’s wrong?</button>
              <button className="st-btn st-btn-secondary" onClick={() => { setBoard(demoBoard(spec, run)); setWiring(null); setMarks(m => ({ ...m, retries: m.retries + 2 })) }}>Wire it for me</button>
            </div>
            {wiring && !wiring.ok && <div className={`st-callout ${wiring.danger ? 'is-danger' : ''}`}>{wiring.danger && <b>Do not put the key in! </b>}{wiring.problems.map(p => <p key={p}>{p}</p>)}</div>}
          </>
        )}
        <details className="st-help-more">
          <summary>Tips</summary>
          <ul className="st-howto">
            <li>Each meter’s <b>red</b> terminal is its +. It must face the + of the cells. Click a meter, then “Swap its leads” to turn it round.</li>
            <li>Click a placed part to select it. Drag it to move it; drag it off the board to remove it.</li>
            <li>Pick <b>Wire</b>, then drag across the dots to lay several wires at once.</li>
          </ul>
        </details>
      </>
    )
  } else if (stage === 'read') {
    const rh = RH ? board[RH] : null
    body = (
      <>
        <p>Take at least <b>{run.need}</b> readings, each at a different <Term k="rheostat">rheostat</Term> setting. For each one:</p>
        <Todo items={[
          [keyIn, <>Put the <Term k="plug key">key</Term> in</>],
          [keyIn && settled, 'Wait until both needles stop moving'],
          [false, 'Read both dials, press Record, type what you read'],
          [!keyIn && runRows.length > 0, 'Take the key out, then move the rheostat'],
        ]} />
        {rh && <Slider label="Rheostat" value={rh.R} display={`${rh.R.toFixed(1)} Ω in circuit`} min={0} max={BENCH.rheostatMax} step={0.5} scale={['0 Ω', `${BENCH.rheostatMax} Ω`]} onChange={R => setBoard(b => updatePart(b, RH, { R }))} />}
        <div className="st-row">
          <button className={`st-btn ${keyIn ? 'st-btn-secondary' : 'st-btn-primary'}`} onClick={() => KEY && setBoard(b => updatePart(b, KEY, { closed: !keyIn }))}>{keyIn ? 'Take the key out' : 'Put the key in'}</button>
          <button className="st-btn st-btn-primary" disabled={!canRecord || !distinct} onClick={record}>Record this reading</button>
        </div>
        <Options label="Ammeter range" value={am.range} onChange={range => AM && setBoard(b => updatePart(b, AM, { range }))} options={[0.5, 1].map(r => ({ id: r, label: `0–${r} A`, sub: `${leastCount(r)} A/div` }))} />
        <Options label="Voltmeter range" value={vm.range} onChange={range => VM && setBoard(b => updatePart(b, VM, { range }))} options={spec.ranges.V.map(r => ({ id: r, label: `0–${r} V`, sub: `${leastCount(r)} V/div` }))} />
        {keyIn && !settled && <p className="st-muted st-small">The needles are still moving…</p>}
        {offScale && <p className="st-callout">A needle is past the end of its scale. Take the key out, then put more of the rheostat in the circuit or switch to the higher range.</p>}
        {keyIn && !offScale && settled && !distinct && <p className="st-muted st-small">You already have a reading at this current. Move the rheostat for a different one.</p>}
        {keyIn && am.range === 1 && readA() > 0 && readA() < 0.45 && !offScale && <p className="st-muted st-small">Tip: the reading is under half of the 1 A scale. The 0.5 A range has finer divisions, so it reads more precisely.</p>}
        {keyTime > 20 && <p className="st-callout">The key has been in for {Math.round(keyTime)} s. The current is warming the wire{heatRise > 0.002 ? `: its resistance is already ${(heatRise * 100).toFixed(1)} % higher` : ''}. Take the key out between readings.</p>}
        {(am.blown || vm.blown) && (
          <div className="st-callout is-danger"><p><b>A meter burnt out.</b> {am.blown ? 'Too much current went through the ammeter.' : 'The voltmeter was overloaded.'}</p>
            <button className="st-btn st-btn-secondary" onClick={() => setBoard(b => ({ ...b, ...(am.blown ? { [AM]: repaired(b[AM]) } : {}), ...(vm.blown ? { [VM]: repaired(b[VM]) } : {}), [KEY]: { ...b[KEY], closed: false } }))}>Get a new one from the lab assistant</button></div>
        )}
        <table className="st-table">
          <thead><tr><th>#</th><th>Ammeter (A)</th><th>Voltmeter (V)</th>{checked[run.id] && <><th>I corr.</th><th>V ÷ I (Ω)</th></>}</tr></thead>
          <tbody>
            {runRows.map((r, i) => {
              const c = corrected(r)
              return (
                <tr key={i}>
                  <td className="st-num">{i + 1}</td>
                  <td><input className={`st-answer ${checked[run.id] ? (readingOk(r.I, r.shownI, r.rangeA) ? 'is-right' : 'is-wrong') : ''}`} value={r.I} onChange={e => typed(i, 'I', e.target.value)} inputMode="decimal" aria-label={`Ammeter reading ${i + 1}`} /></td>
                  <td><input className={`st-answer ${checked[run.id] ? (readingOk(r.V, r.shownV, r.rangeV) ? 'is-right' : 'is-wrong') : ''}`} value={r.V} onChange={e => typed(i, 'V', e.target.value)} inputMode="decimal" aria-label={`Voltmeter reading ${i + 1}`} /></td>
                  {checked[run.id] && <><td className="st-num">{rowOk(r) ? fmt(c.I, places(r.rangeA)) : '—'}</td><td className="st-num">{rowOk(r) && c.I > 0 ? fmt(c.V / c.I, 2) : '—'}</td></>}
                </tr>
              )
            })}
          </tbody>
        </table>
        {runRows.length > 0 && (
          <div className="st-row">
            <button className="st-btn st-btn-secondary" onClick={() => { setChecked(c => ({ ...c, [run.id]: true })); if (!runRows.every(rowOk)) setMarks(m => ({ ...m, retries: m.retries + 1 })) }}>Check my readings</button>
            <button className="st-linkbtn" onClick={() => { setRows(rs => ({ ...rs, [run.id]: rs[run.id].map(r => ({ ...r, I: r.shownI.toFixed(places(r.rangeA)), V: r.shownV.toFixed(places(r.rangeV)) })) })); setChecked(c => ({ ...c, [run.id]: true })); setMarks(m => ({ ...m, retries: m.retries + 2 })) }}>Show me what the needles said</button>
          </div>
        )}
        {checked[run.id] && !runRows.every(rowOk) && <p className="st-callout">Some readings do not match the needle. Count the small divisions carefully: on the 0–{am.range} A scale each one is {leastCount(am.range)} A. Look straight at the needle, so it hides its reflection in the mirror strip.</p>}
        <p className="st-muted st-small">{runRows.length} of at least {run.need} readings{runRows.length < run.need ? '. Spread them out across the rheostat.' : '.'}</p>
        {runDone(run.id) && checked[run.id] && (
          <>
            <p className="st-callout is-ok">Readings complete. The mean of V ÷ I is <b>{fmt(resistanceOfRun(run.id), 2)} Ω</b>{run.combo ? ` for ${run.label}` : ''}.</p>
            <button className="st-btn st-btn-primary" onClick={() => go(runIndex + 1 < spec.runs.length ? nextRunStep : step + 1)}>{runIndex + 1 < spec.runs.length ? `Next: ${spec.runs[runIndex + 1].label}` : spec.graph ? 'Plot the graph' : 'Work out the result'}</button>
          </>
        )}
      </>
    )
  } else if (stage === 'Graph') {
    body = (
      <>
        <p>Your corrected readings are plotted, with the best straight line through the origin. Read the <Term k="slope">slope</Term> from the triangle: <b>slope = ΔV ÷ ΔI</b>.</p>
        <p className="st-inline">Slope = <input className={`st-answer ${slopeChecked ? (slopeOk ? 'is-right' : 'is-wrong') : ''}`} value={slopeIn} onChange={e => setSlopeIn(e.target.value)} inputMode="decimal" aria-label="Slope of the graph" /> Ω
          <button className="st-btn st-btn-secondary st-btn-sm" onClick={() => setSlopeChecked(true)}>Check</button></p>
        {slopeChecked && (slopeOk
          ? <><p className="st-callout is-ok">The slope of a V–I graph is V ÷ I: the <b>resistance</b>. A straight line through the origin means V ∝ I, which is <b>Ohm’s law</b>.</p><button className="st-btn st-btn-primary" onClick={() => go(step + 1)}>Result</button></>
          : <p className="st-callout">Divide the ΔV marked on the graph by the ΔI.</p>)}
      </>
    )
  } else if (stage === 'Result') {
    const runs = spec.runs.map(r => ({ r, R: resistanceOfRun(r.id), truth: nominalResistance(spec, r) }))
    const [a, b, c] = runs
    const formula = spec.id === 'series' ? a.R + b.R : spec.id === 'parallel' ? 1 / (1 / a.R + 1 / b.R) : null
    const uncorrected = spec.graph ? mean((rows[spec.runs[0].id] ?? []).filter(rowOk).map(r => Number(r.V) / Number(r.I))) : null
    body = (
      <>
        {spec.graph ? (
          <div className="st-work">
            <p>Mean of V ÷ I = <b>{fmt(a.R)} Ω</b></p>
            <p>Slope of the graph = <b>{fmt(fit)} Ω</b></p>
            <p>The wire’s true resistance at 30 °C: <b>{a.truth} Ω</b> (error {fmt((Math.abs(fit - a.truth) / a.truth) * 100, 1)} %)</p>
          </div>
        ) : (
          <div className="st-work">
            <p>R₁ = <b>{fmt(a.R)} Ω</b>, R₂ = <b>{fmt(b.R)} Ω</b></p>
            <p>Measured {spec.id === 'series' ? 'Rₛ' : 'Rₚ'} = <b>{fmt(c.R)} Ω</b></p>
            <p>{spec.id === 'series' ? 'R₁ + R₂' : 'R₁R₂ ÷ (R₁ + R₂)'} = <b>{fmt(formula)} Ω</b></p>
            <p>Difference: {fmt((Math.abs(c.R - formula) / formula) * 100, 1)} %</p>
            <p className="st-truth">True values: R₁ = {spec.coils.R1} Ω, R₂ = {spec.coils.R2} Ω, so {spec.id === 'series' ? 'Rₛ' : 'Rₚ'} = {fmt(c.truth)} Ω</p>
          </div>
        )}
        <Group label="What affected your result">
          <ul className="st-howto">
            {spec.graph && Number.isFinite(uncorrected) && <li>Without the zero correction you would have got <b>{fmt(uncorrected)} Ω</b>, because every current would be {zeroError(BENCH.ammeter)} A too big.</li>}
            {(() => {
              const r0 = (rows[spec.runs[0].id] ?? []).reduce((m, r) => (!m || r.shownI < m.shownI ? r : m), null)
              const half = r0 && leastCount(r0.rangeA) / 2
              return r0 && <li>Least count: you can read the ammeter to about ±{half} A (half a division on its 0–{r0.rangeA} A range). On your smallest current, {fmt(r0.shownI)} A, that is ±{fmt((half / r0.shownI) * 100, 0)} %; on bigger currents it matters less. Using the 0.5 A range halves it.</li>
            })()}
            <li>{marks.longKey ? 'You left the key in for a long time: the wire warmed and its resistance rose, which makes V ÷ I drift up.' : 'You took the key out between readings, so the wire stayed cool and its resistance steady.'}</li>
            {marks.burnt > 0 && <li>A meter burnt out. In a real lab that is a broken instrument: always check the wiring before the key goes in.</li>}
          </ul>
        </Group>
        <button className="st-btn st-btn-primary" onClick={() => go(step + 1)}>Viva questions</button>
      </>
    )
  } else if (stage === 'Viva') {
    body = (
      <>
        {vivaQs.map((v, i) => (
          <div key={v.q} className="st-viva">
            <p><b>{i + 1}.</b> {v.q}</p>
            {v.options.map((o, j) => (
              <button key={o} className={`st-choice ${viva[i] == null ? '' : j === v.a ? 'is-right' : viva[i] === j ? 'is-wrong' : ''}`} disabled={viva[i] != null} onClick={() => setViva(s => ({ ...s, [i]: j }))}>{o}</button>
            ))}
            {viva[i] != null && <p className="st-muted st-small">{v.why}</p>}
          </div>
        ))}
        {vivaDone && (
          <>
            <p className="st-done"><Icon name="check" />Practical complete</p>
            <Stars n={Math.max(1, stars)} />
            <p className="st-muted st-small">Stars: no meter burnt out · readings right first time · key taken out between readings.</p>
            <div className="st-row">
              {PRACTICALS[PRACTICALS.indexOf(spec) + 1] && <button className="st-btn st-btn-primary" onClick={() => onPick(PRACTICALS[PRACTICALS.indexOf(spec) + 1].id)}>Next practical</button>}
              <button className="st-btn st-btn-secondary" onClick={() => onTab('gadgets')}>Everyday circuits</button>
            </div>
          </>
        )}
      </>
    )
  }

  const panel = (
    <>
      <div className="st-stephead">
        <div className="st-stephead-top">
          <span className="st-label">{spec.title}{done[spec.id] ? ' · completed' : ''}</span>
          <span className="st-num">Step {step + 1} of {steps.length}</span>
        </div>
        <div className="st-progress" aria-hidden="true">{steps.map((s, i) => <span key={s + i} className={i < step ? 'is-done' : i === step ? 'is-on' : ''} title={s} />)}</div>
        <h2 className="st-step-title">{STEP_TITLES[stage] ?? stage}{(stage === 'wire' || stage === 'read') && spec.runs.length > 1 ? ` · ${run.label}` : ''}</h2>
        {step > 0 && <button className="st-back-step" onClick={() => go(step - 1)}><Icon name="back" />Back</button>}
      </div>
      <div className="st-step-body">{body}</div>
      {stage === 'wire' && sel && (
        <Group label={`Selected · ${TOOL_NAMES[sel.type]}${sel.name ? ` ${sub(sel.name === 'R' ? '' : sel.name)}` : ''}`}>
          <div className="st-row st-inspect-actions">
            {(sel.type === 'ammeter' || sel.type === 'voltmeter') && <button className="st-btn st-btn-secondary" onClick={() => change({ flip: !sel.flip })}>Swap its leads</button>}
            {sel.type === 'battery' && <button className="st-btn st-btn-secondary" onClick={() => change({ flip: !sel.flip })}>Turn it round</button>}
            {sel.type === 'key' && <button className="st-btn st-btn-secondary" onClick={() => change({ closed: !sel.closed })}>{sel.closed ? 'Take the key out' : 'Put the key in'}</button>}
            <button className="st-btn st-btn-secondary" onClick={() => { setBoard(b => { const { [selected]: _, ...rest } = b; return rest }); setSelected(null) }}><Icon name="reset" />Remove</button>
          </div>
          {sel.type === 'ammeter' && <Options label="Range" value={sel.range} onChange={range => change({ range })} options={[0.5, 1].map(r => ({ id: r, label: `0–${r} A` }))} />}
          {sel.type === 'voltmeter' && <Options label="Range" value={sel.range} onChange={range => change({ range })} options={spec.ranges.V.map(r => ({ id: r, label: `0–${r} V` }))} />}
          {sel.type === 'rheostat' && <Slider label="Slide the contact" value={sel.R} display={`${sel.R.toFixed(1)} Ω`} min={0} max={BENCH.rheostatMax} step={0.5} scale={['0 Ω', `${BENCH.rheostatMax} Ω`]} onChange={R => change({ R })} />}
        </Group>
      )}
      {step > 0 && <button className="st-linkbtn st-startover" onClick={startOver}>Start this practical again</button>}
    </>
  )

  const showBoard = stage !== 'Aim'
  const finished = useMemo(() => demoBoard(spec, spec.runs[spec.runs.length - 1]), [spec])
  const finishedAn = useMemo(() => analyze(finished), [finished])
  return (
    <ExperimentShell code="Class 10 · Electricity" title="Circuits" tabs={tabs} tab="practical" onTab={onTab} panel={panel}>
      <div className={`st-circ st-lab ${stage === 'Graph' ? 'has-graph' : ''}`}>
        <div className="st-circ-board">
          {showBoard ? (
            <>
              <CircuitBoard ref={boardApi} board={board} an={an} sim={sim} tool={stage === 'wire' ? tool : 'hand'} onEdge={onEdge} onMove={onMove} readings={false}
                locked={stage === 'wire' ? null : new Set(allEdges().filter(k => board[k]?.type !== 'key'))}
                selected={stage === 'wire' ? selected : null} symbols={symbols} electrons={electrons} guide={stage === 'wire' && showGuide ? guide : null} />
              <ViewSwitches symbols={symbols} setSymbols={setSymbols} electrons={electrons} setElectrons={setElectrons} />
              {stage === 'Meters' && (
                <div className="st-stage-note">
                  <b>Step 2: read the meters</b>
                  <p>Look at the two dials below and answer the questions on the right. The parts for building appear in the next step.</p>
                  <span className="st-stage-arrow" aria-hidden="true">↓</span>
                </div>
              )}
              {stage === 'read' && <p className={`st-endnote ${keyIn ? 'is-ok' : ''}`}>{keyIn ? `Key in · ${Math.round(keyTime)} s` : 'Key out'}</p>}
            </>
          ) : (
            <>
              {/* the finished apparatus, to look at before starting: switch between the real parts and their symbols */}
              <CircuitBoard board={finished} an={finishedAn} readings={false} symbols={symbols} electrons={electrons} />
              <ViewSwitches symbols={symbols} setSymbols={setSymbols} electrons={electrons} setElectrons={setElectrons} />
              <p className="st-endnote">The finished circuit. You will wire it yourself.</p>
            </>
          )}
        </div>
        {stage === 'Graph' ? (
          <div className="st-bus-graph st-vi">
            <span className="st-label">Potential difference against current</span>
            <VIGraph points={points} slope={fit} />
          </div>
        ) : (
          <div className="st-bench">
            {stage === 'wire' && <Palette tools={['hand', 'wire', 'battery', 'key', 'ammeter', 'voltmeter', 'rheostat', 'coil', 'erase']} tool={tool} onTool={setTool} left={left} onDragPart={onDragPart} />}
            <div className="st-dials">
              <Meter kind="A" range={am.range} read={readA} burnt={!!am.blown} />
              <Meter kind="V" range={vm.range} read={readV} burnt={!!vm.blown} />
            </div>
          </div>
        )}
      </div>
      <DragGhost ghost={ghost} />
    </ExperimentShell>
  )
}
