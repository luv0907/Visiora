/**
 * VISIORA — Electricity Lab (Class 10: Electricity · Ohm's law, series and parallel)
 * A battery, resistors, an ammeter, a switch and a movable voltmeter. Every reading
 * comes from an exact nodal-analysis solve of the circuit (engine/circuit.js), and the
 * worked maths uses the textbook formulas, so both always agree.
 */
import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, Circle, Lightbulb } from 'lucide-react'
import CircuitScene from '../components/circuit/CircuitScene'
import { layoutFor } from '../components/circuit/layouts'
import { solve, buildCircuit, equivalentResistance, insight } from '../engine/circuit'
import '../components/motion/motion.css'

const KINDS = [
  { id: 'series', label: 'Series' },
  { id: 'parallel', label: 'Parallel' },
  { id: 'mixed', label: 'Mixed' },
]

const CHALLENGES = [
  {
    id: 'half',
    title: 'Make the ammeter read exactly 0.50 A.',
    hint: 'Ohm’s law: R = V ÷ I. With a 6 V battery you need a total resistance of 12 Ω.',
    check: ({ closed, I }) => closed && Math.abs(I - 0.5) < 0.005,
  },
  {
    id: 'share',
    title: 'In series, make R1 get exactly half of the battery voltage.',
    hint: 'In series the voltage is shared in proportion to resistance. R1 must equal all the others added together.',
    check: ({ kind, closed, sol, ends, V }) => kind === 'series' && closed && Math.abs(sol.across(...ends.R1) - V / 2) < V * 0.005,
  },
  {
    id: 'double',
    title: 'In parallel, make R1 carry exactly twice the current of R2.',
    hint: 'Each branch gets the same voltage, so I = V ÷ R. Twice the current needs half the resistance.',
    check: ({ kind, closed, sol }) => kind === 'parallel' && closed && sol.current('R2') > 0 && Math.abs(sol.current('R1') / sol.current('R2') - 2) < 0.005,
  },
]

// Round away float noise first, so an exact 0.375 A always shows as 0.38 (not 0.37).
const f2 = v => {
  const c = Math.round(v * 1e9) / 1e9
  return (Math.abs(c) < 0.005 ? 0 : c).toFixed(2)
}

export default function ElectricityLabScreen() {
  const navigate = useNavigate()
  const [kind, setKind] = useState('series')
  const [count, setCount] = useState(2)
  const [V, setV] = useState(6)
  // Defaults chosen so no challenge is already solved on arrival.
  const [Rs, setRs] = useState([6, 10, 15])
  const [closed, setClosed] = useState(true)
  const [electrons, setElectrons] = useState(false)
  const [meterOn, setMeterOn] = useState('R1')
  const [won, setWon] = useState(() => new Set())
  const [toast, setToast] = useState(null)
  const [openHint, setOpenHint] = useState(null)

  const n = kind === 'mixed' ? 3 : count
  const used = Rs.slice(0, n)
  const layout = useMemo(() => layoutFor(kind, n), [kind, n])
  const { sol, ends } = useMemo(() => {
    const c = buildCircuit(kind, V, used, closed)
    return { sol: solve(c.nodes, c.elements), ends: c.ends }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, V, used.join(','), closed])
  const I = sol.current('A')
  const Req = equivalentResistance(kind, used)

  useEffect(() => {
    if (!ends[meterOn]) setMeterOn('R1')
  }, [ends, meterOn])

  useEffect(() => {
    const ctx = { kind, closed, I, sol, ends, V }
    const fresh = CHALLENGES.filter(c => !won.has(c.id) && c.check(ctx))
    if (!fresh.length) return
    setWon(prev => new Set([...prev, ...fresh.map(c => c.id)]))
    setToast(fresh[0].title)
  }, [kind, closed, I, sol, ends, V, won])

  useEffect(() => {
    if (!toast) return
    const id = setTimeout(() => setToast(null), 3000)
    return () => clearTimeout(id)
  }, [toast])

  const setR = (i, value) => setRs(prev => prev.map((r, k) => (k === i ? value : r)))
  const meterLabel = { B: 'the battery', A: 'the ammeter', S: 'the switch' }[meterOn] || meterOn

  return (
    <div className="ml-root">
      <main className="ml-main ml-main-static">
        <section className="ml-scene">
          <CircuitScene
            layout={layout}
            sol={sol}
            ends={ends}
            V={V}
            Rs={Rs}
            closed={closed}
            electrons={electrons}
            meterOn={meterOn}
            onToggleSwitch={() => setClosed(c => !c)}
            onPickMeter={setMeterOn}
          />
          <button className="ml-back" onClick={() => navigate(-1)} aria-label="Back">
            <ArrowLeft size={18} strokeWidth={2.5} />
          </button>
        </section>

        <section className="ml-graphs">
          <div className="lt-readings el-readings" aria-live="polite">
            <div style={{ color: '#D97706' }}><small>current (ammeter)</small><b>{f2(I)} A</b></div>
            <div style={{ color: '#4F46E5' }}><small>voltage across {meterOn}</small><b>{f2(Math.abs(sol.across(...(ends[meterOn] || [0, 0]))))} V</b><em>Tap any part in the circuit to move the voltmeter</em></div>
            <div><small>total resistance</small><b>{f2(Req)} Ω</b></div>
            <div style={{ color: '#E11D48' }}><small>power (heat)</small><b>{f2(V * sol.current('B'))} W</b></div>
          </div>
          <div className="lt-readings el-table">
            <table>
              <thead>
                <tr><th>Part</th><th>R (Ω)</th><th>I (A)</th><th>V (V)</th><th>P (W)</th></tr>
              </thead>
              <tbody>
                {used.map((R, i) => {
                  const id = `R${i + 1}`
                  const Ii = sol.current(id)
                  const Vi = sol.across(...ends[id])
                  return (
                    <tr key={id} className={meterOn === id ? 'is-on' : ''} onClick={() => setMeterOn(id)}>
                      <td>{id}</td><td>{R}</td><td>{f2(Ii)}</td><td>{f2(Vi)}</td><td>{f2(Ii * Ii * R)}</td>
                    </tr>
                  )
                })}
                <tr className="el-total"><td>Total</td><td>{f2(Req)}</td><td>{f2(I)}</td><td>{f2(closed ? V : 0)}</td><td>{f2(V * sol.current('B'))}</td></tr>
              </tbody>
            </table>
          </div>
        </section>
      </main>

      <aside className="ml-panel">
        <header className="ml-head">
          <p className="ml-kicker">Class 10 · Electricity</p>
          <h1>Ohm’s law circuits</h1>
          <p>Build series and parallel circuits. Watch the current split and the voltage share.</p>
        </header>

        <section className="ml-section ml-sec-controls">
          <div className="ml-seg lt-seg" role="radiogroup" aria-label="Circuit type">
            {KINDS.map(k => (
              <button key={k.id} role="radio" aria-checked={kind === k.id} className={kind === k.id ? 'is-on' : ''} onClick={() => setKind(k.id)}>{k.label}</button>
            ))}
          </div>
          {kind !== 'mixed' && (
            <div className="ml-seg lt-seg" role="radiogroup" aria-label="Number of resistors">
              {[2, 3].map(c => (
                <button key={c} role="radio" aria-checked={count === c} className={count === c ? 'is-on' : ''} onClick={() => setCount(c)}>{c} resistors</button>
              ))}
            </div>
          )}
          <Slider label="Battery" symbol="V" unit="V" min={1.5} max={12} step={0.5} value={V} color="#1C1713" onChange={setV} />
          {used.map((R, i) => (
            <Slider key={i} label={`Resistor ${i + 1}`} symbol={`R${i + 1}`} unit="Ω" min={1} max={30} step={1} value={R} color="#E11D48" onChange={v => setR(i, v)} />
          ))}
          <label className="ml-check">
            <input type="checkbox" checked={closed} onChange={e => setClosed(e.target.checked)} />
            Switch closed (current can flow)
          </label>
          <label className="ml-check">
            <input type="checkbox" checked={electrons} onChange={e => setElectrons(e.target.checked)} />
            Show electrons instead of conventional current
          </label>
        </section>

        <section className="ml-section ml-sec-insight">
          <p className="ml-insight"><Lightbulb size={16} strokeWidth={2.5} /> {insight(kind, closed, used)}</p>
          {electrons && <p className="ml-note">Electrons (blue) move from − to +, the opposite way to conventional current.</p>}
        </section>

        <section className="ml-section ml-sec-maths">
          <h2>The maths, right now</h2>
          <Maths kind={kind} V={V} Rs={used} Req={Req} I={I} closed={closed} sol={sol} ends={ends} />
          <p className="ml-note">The voltmeter is across {meterLabel}: it reads {f2(Math.abs(sol.across(...(ends[meterOn] || [0, 0]))))} V.</p>
        </section>

        <section className="ml-section ml-sec-challenges">
          <h2>Challenges <span className="ml-count">{won.size}/{CHALLENGES.length}</span></h2>
          <ul className="ml-challenges">
            {CHALLENGES.map(c => (
              <li key={c.id} className={won.has(c.id) ? 'is-won' : ''}>
                {won.has(c.id) ? <CheckCircle2 size={20} strokeWidth={2.5} /> : <Circle size={20} strokeWidth={2.5} />}
                <div>
                  <p>{c.title}</p>
                  {!won.has(c.id) && (
                    openHint === c.id
                      ? <p className="ml-hint">{c.hint}</p>
                      : <button className="ml-link" onClick={() => setOpenHint(c.id)}>Need a hint?</button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      </aside>

      {toast && (
        <div className="ml-toast" role="status">
          <CheckCircle2 size={18} strokeWidth={2.75} /> Challenge complete! {toast}
        </div>
      )}
    </div>
  )
}

function Maths({ kind, V, Rs, Req, I, closed, sol, ends }) {
  if (!closed) {
    return (
      <div className="ml-work">
        <p>Switch open → the circuit is broken → <b>I = 0 A</b>.</p>
        <p>With no current, V = I × R = 0 across every resistor.</p>
      </div>
    )
  }
  const Iexpected = V / Req
  if (kind === 'series') {
    return (
      <div className="ml-work">
        <p><span className="ml-eq">Series: R = R1 + R2{Rs.length === 3 ? ' + R3' : ''}</span>= {Rs.join(' + ')} = <b>{f2(Req)} Ω</b></p>
        <p><span className="ml-eq">Ohm’s law: I = V ÷ R</span>= {V} ÷ {f2(Req)} = <b style={{ color: '#D97706' }}>{f2(Iexpected)} A</b></p>
        <p><span className="ml-eq">Each resistor: V = I × R</span>{Rs.map((R, i) => `V${i + 1} = ${f2(I)} × ${R} = ${f2(sol.across(...ends[`R${i + 1}`]))} V`).join('\n')}</p>
      </div>
    )
  }
  if (kind === 'parallel') {
    return (
      <div className="ml-work">
        <p><span className="ml-eq">Parallel: 1/R = {Rs.map((_, i) => `1/R${i + 1}`).join(' + ')}</span>= {Rs.map(R => `1/${R}`).join(' + ')} = {Rs.reduce((s, R) => s + 1 / R, 0).toFixed(4)}<br />R = <b>{f2(Req)} Ω</b></p>
        <p><span className="ml-eq">Each branch gets V = {V} V, so I = V ÷ R</span>{Rs.map((R, i) => `I${i + 1} = ${V} ÷ ${R} = ${f2(sol.current(`R${i + 1}`))} A`).join('\n')}</p>
        <p><span className="ml-eq">Total: I = {Rs.map((_, i) => `I${i + 1}`).join(' + ')}</span>= <b style={{ color: '#D97706' }}>{f2(I)} A</b> (= {V} ÷ {f2(Req)})</p>
      </div>
    )
  }
  const R23 = 1 / (1 / Rs[1] + 1 / Rs[2])
  return (
    <div className="ml-work">
      <p><span className="ml-eq">R2 ∥ R3 = (R2 × R3) ÷ (R2 + R3)</span>= ({Rs[1]} × {Rs[2]}) ÷ ({Rs[1]} + {Rs[2]}) = {f2(R23)} Ω</p>
      <p><span className="ml-eq">Total: R = R1 + R23</span>= {Rs[0]} + {f2(R23)} = <b>{f2(Req)} Ω</b></p>
      <p><span className="ml-eq">I = V ÷ R</span>= {V} ÷ {f2(Req)} = <b style={{ color: '#D97706' }}>{f2(Iexpected)} A</b></p>
      <p><span className="ml-eq">R1 takes V1 = I × R1, the pair shares the rest</span>V1 = {f2(sol.across(...ends.R1))} V, V23 = {f2(sol.across(...ends.R2))} V{'\n'}I2 = {f2(sol.current('R2'))} A, I3 = {f2(sol.current('R3'))} A</p>
    </div>
  )
}

function Slider({ label, symbol, unit, min, max, step, value, color, onChange }) {
  const pct = ((value - min) / (max - min)) * 100
  return (
    <div className="ml-slider">
      <div className="ml-slider-head">
        <span>{label} <i>{symbol}</i></span>
        <b style={{ color }}>{step < 1 ? value.toFixed(1) : value} <small>{unit}</small></b>
      </div>
      <input
        className="ml-range"
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        aria-label={`${label} in ${unit}`}
        style={{ '--pct': `${pct}%`, '--c': color }}
      />
    </div>
  )
}
