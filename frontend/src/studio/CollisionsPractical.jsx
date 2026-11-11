/**
 * VISIORA Studio — Practical tab of Air track collisions: conservation of momentum.
 * Glider A is pushed through light gate 1 into glider B, which waits between the gates; what
 * moves off goes through gate 2. Each glider carries a 10 cm card, so speed = 0.100 m ÷ the
 * time the gate was blocked. Three runs: springy with equal masses, velcro with equal masses,
 * velcro with A twice as heavy. Work out momentum before and after each and compare. Air drag
 * between the gates takes a little off, so "after" comes out a touch low: an error to discuss.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useCanvas } from '../components/motion/useCanvas'
import { BUMPERS, TRACK } from '../engine/airtrack'
import { Stars } from './CircuitBoard'
import { ExperimentShell, Group, Icon } from './Shell'
import { paintTrack, useTrack } from './trackScene'

const GATES = [0.55, 1.3]
const DONE_KEY = 'visiora.collisions.practical'
const STEPS = ['Aim', 'Measure', 'Calculate', 'Result', 'Viva']
const TITLES = { Aim: 'What we will find out', Measure: 'Three runs through the gates', Calculate: 'Speeds and momentum', Result: 'Your result', Viva: 'Check your understanding' }
const RUNS = [
  { label: 'Springy, equal masses', bumper: 'spring', mA: 0.2, mB: 0.2, u: 0.42 },
  { label: 'Velcro, equal masses', bumper: 'velcro', mA: 0.2, mB: 0.2, u: 0.5 },
  { label: 'Velcro, A twice as heavy', bumper: 'velcro', mA: 0.4, mB: 0.2, u: 0.36 },
]
const ok = (typed, actual, rel) => typed !== '' && Number.isFinite(Number(typed)) && Math.abs(Number(typed) - actual) <= rel * Math.abs(actual) + 0.0005
const ms = t => Math.round(t * 1000) / 1000 // the timer reads to 1 ms
/** What moves off through gate 2: B alone after a springy hit (A is left almost still), both stuck together after velcro. */
const massAfter = r => (r.bumper === 'velcro' ? r.mA + r.mB : r.mB)

const VIVA = [
  { q: 'Why do the gliders ride on an air track?', options: ['It looks good', 'The air cushion removes almost all friction, so the only sideways forces are the ones between the gliders', 'To make them go faster', 'To keep them cool'], a: 1, why: 'Momentum is conserved only when no outside force acts. Friction is an outside force; the air track all but removes it.' },
  { q: 'In the velcro runs, momentum was kept. What about kinetic energy?', options: ['It was kept too', 'Some was lost, turned into heat and sound as the velcro squashed', 'It went up', 'It turned into momentum'], a: 1, why: 'With equal masses half of it goes. Momentum is always conserved in a collision; kinetic energy only in a perfectly springy one.' },
  { q: 'Why must you take readings before a glider reaches an end stop?', options: ['The stop is in the way of the gates', 'The stop pushes the glider back: an outside force, so the total momentum changes there', 'Gliders go faster near the end', 'It does not matter'], a: 1, why: 'Conservation of momentum is about a closed system. The end stop is outside the two gliders.' },
  { q: 'Your "after" momentum came out slightly smaller every time. Why?', options: ['Momentum is not quite conserved', 'Air drag slows the gliders a little between gate 1 and gate 2', 'The cards are too long', 'The timer is fast'], a: 1, why: 'The gliders lose about 1 % of their speed each second to the air. Putting the gates closer together shrinks this error.' },
]

function MomentumBars({ rows }) {
  const { ref } = useCanvas((ctx, w, h) => {
    ctx.clearRect(0, 0, w, h)
    const L = 60, R = w - 12, T = 26, B = h - 40
    const top = Math.max(0.05, ...rows.flatMap(r => [r.pb, r.pa])) * 1.15
    const tick = [0.01, 0.02, 0.05, 0.1, 0.2].find(t => top / t <= 5) ?? 0.5
    const YMAX = Math.ceil(top / tick) * tick
    const Y = v => B - (v / YMAX) * (B - T)
    ctx.fillStyle = '#6B6888'; ctx.font = '500 11px "IBM Plex Mono", monospace'; ctx.textBaseline = 'middle'; ctx.textAlign = 'right'
    for (let v = 0; v <= YMAX + 1e-9; v += tick) { ctx.fillStyle = 'rgba(32,81,200,.08)'; ctx.fillRect(L, Y(v), R - L, 1); ctx.fillStyle = '#6B6888'; ctx.fillText(v.toFixed(2), L - 6, Y(v)) }
    ctx.save(); ctx.translate(12, (T + B) / 2); ctx.rotate(-Math.PI / 2); ctx.textAlign = 'center'; ctx.fillText('p (kg·m/s)', 0, 0); ctx.restore()
    const gw = (R - L) / rows.length, bw = Math.min(34, gw * 0.3)
    rows.forEach((r, i) => {
      const cx = L + gw * (i + 0.5)
      ;[[r.pb, '#D6336C', -1], [r.pa, '#2051C8', 1]].forEach(([p, c, side]) => {
        const x = cx + side * (bw / 2 + 2) - bw / 2
        ctx.fillStyle = c; ctx.fillRect(x, Y(p), bw, B - Y(p))
        ctx.fillStyle = '#1B1340'; ctx.font = '600 10px "IBM Plex Mono", monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.fillText(p.toFixed(3), x + bw / 2, Y(p) - 3)
      })
      ctx.fillStyle = '#1B1340'; ctx.font = '600 11px "Instrument Sans", sans-serif'; ctx.textBaseline = 'top'; ctx.fillText(`Run ${i + 1}`, cx, B + 8)
    })
    ctx.fillStyle = '#1B1340'; ctx.fillRect(L, B, R - L, 1.5)
    ctx.font = '600 11px "Instrument Sans", sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'
    ctx.fillStyle = '#D6336C'; ctx.fillRect(L, 8, 10, 10); ctx.fillStyle = '#1B1340'; ctx.fillText('before', L + 14, 13)
    ctx.fillStyle = '#2051C8'; ctx.fillRect(L + 70, 8, 10, 10); ctx.fillStyle = '#1B1340'; ctx.fillText('after', L + 84, 13)
  }, [rows])
  return <canvas ref={ref} className="st-fill" role="img" aria-label="Bar chart of momentum before and after each run" />
}

function Field({ label, unit, value, onChange, state }) {
  return (
    <label className="st-field"><span>{label}</span>
      <input className={`st-answer ${state ?? ''}`} value={value} inputMode="decimal" placeholder="?" onChange={e => onChange(e.target.value)} /><em>{unit}</em>
    </label>
  )
}

export default function CollisionsPractical({ tabs, onTab }) {
  const [step, setStep] = useState(0)
  const [run, setRun] = useState(0)
  const [readings, setReadings] = useState({}) // run → { t1, t2 }
  const [typed, setTyped] = useState({}) // run → { u, v, pb, pa }
  const [checked, setChecked] = useState(false)
  const [viva, setViva] = useState({})
  const [wrong, setWrong] = useState(0)
  const [done, setDone] = useState(() => { try { return Number(localStorage.getItem(DONE_KEY)) || 0 } catch { return 0 } })
  const stage = STEPS[step]
  const R = RUNS[run]
  const gliders = useMemo(() => [{ m: R.mA, x: 0.1, v: R.u }, { m: R.mB, x: 0.85, v: 0 }], [R])
  // you catch the gliders once B's card has cleared gate 2, before anything reaches the end stop
  const { sim, start, reset } = useTrack({ gliders, e: BUMPERS[R.bumper].e, gates: GATES, until: s => s.gates[1].passes.some(p => p.glider === 1) })
  const p1 = sim.gates[0].passes.find(p => p.glider === 0), p2 = sim.gates[1].passes.find(p => p.glider === 1)
  const t1 = p1 ? ms(p1.time) : null, t2 = p2 ? ms(p2.time) : null
  const record = () => setReadings(rs => ({ ...rs, [run]: { t1, t2 } }))
  const recorded = Object.keys(readings).length
  // the right answers, worked from the student's own timer readings
  const truth = i => { const r = RUNS[i], t = readings[i]; const u = TRACK.card / t.t1, v = TRACK.card / t.t2; return { u, v, pb: r.mA * u, pa: massAfter(r) * v } }
  const fieldOk = (i, f) => ok(typed[i]?.[f] ?? '', truth(i)[f], f === 'u' || f === 'v' ? 0.01 : 0.02)
  const allOk = recorded === RUNS.length && RUNS.every((_, i) => ['u', 'v', 'pb', 'pa'].every(f => fieldOk(i, f)))
  const rows = useMemo(() => (recorded === RUNS.length ? RUNS.map((_, i) => ({ pb: Number(typed[i]?.pb) || 0, pa: Number(typed[i]?.pa) || 0 })) : []), [typed, recorded]) // eslint-disable-line react-hooks/exhaustive-deps
  const conserved = rows.length > 0 && rows.every(r => r.pb > 0 && Math.abs(r.pa - r.pb) / r.pb < 0.05)
  const stars = (wrong === 0 ? 1 : 0) + (recorded === RUNS.length ? 1 : 0) + (conserved ? 1 : 0)
  const vivaDone = VIVA.every((_, i) => viva[i] != null)
  useEffect(() => { if (vivaDone && stars > done) { setDone(stars); try { localStorage.setItem(DONE_KEY, String(stars)) } catch { /* private mode */ } } }, [vivaDone, stars, done])
  const topRef = useRef(null)
  useEffect(() => { topRef.current?.closest('.st-panel-scroll')?.scrollTo({ top: 0 }) }, [step])
  const set = (i, f, v) => { setTyped(s => ({ ...s, [i]: { ...s[i], [f]: v } })); setChecked(false) }
  const state = (i, f) => (checked ? (fieldOk(i, f) ? 'is-right' : 'is-wrong') : '')

  let body
  if (stage === 'Aim') {
    body = (
      <>
        <p><b>Aim.</b> To show that the total momentum of two gliders is the same just before and just after they collide.</p>
        <p><b>Apparatus.</b> An air track with a blower, two gliders with 10 cm cards, springy and velcro bumpers, 0.1 kg extra weights, two light gates and a timer reading to 1 ms.</p>
        <p className="st-muted">Speed = card length ÷ time the gate is blocked. Momentum = mass × speed.</p>
        <button className="st-btn st-btn-primary st-btn-wide" onClick={() => setStep(1)}>Start the practical</button>
      </>
    )
  } else if (stage === 'Measure') {
    body = (
      <>
        <div className="st-chipset">{RUNS.map((r, i) => <button key={r.label} className={`st-chip ${i === run ? 'is-on' : ''}`} onClick={() => { setRun(i); reset() }}>{readings[i] ? '✓ ' : ''}Run {i + 1}</button>)}</div>
        <p><b>{R.label}.</b> A = {R.mA.toFixed(1)} kg, B = {R.mB.toFixed(1)} kg, waiting between the gates.</p>
        <div className="st-row">
          <button className="st-btn st-btn-primary" onClick={start} disabled={sim.running}><Icon name="play" />Push A</button>
          <button className="st-btn st-btn-secondary" onClick={record} disabled={t2 == null || readings[run] != null}>{readings[run] ? 'Recorded' : 'Record'}</button>
        </div>
        <div className="st-idea-readings">
          <div><span>gate 1 (A before)</span><b className="st-num">{t1 != null ? `${t1.toFixed(3)} s` : '—'}</b></div>
          <div><span>gate 2 ({R.bumper === 'velcro' ? 'A and B together' : 'B after'})</span><b className="st-num">{t2 != null ? `${t2.toFixed(3)} s` : '—'}</b></div>
        </div>
        {R.bumper === 'spring' && <p className="st-muted st-small">After a springy hit between equal masses, A is left almost still, so gate 2 only times B.</p>}
        {recorded === RUNS.length
          ? <button className="st-btn st-btn-primary st-btn-wide" onClick={() => setStep(2)}>Next: work it out</button>
          : <p className="st-muted st-small">{recorded} of {RUNS.length} runs recorded.</p>}
      </>
    )
  } else if (stage === 'Calculate') {
    body = (
      <>
        <p className="st-muted st-small">Card = 0.100 m. Speeds to 3 decimal places, momentum to 4.</p>
        {RUNS.map((r, i) => (
          <Group key={r.label} label={`Run ${i + 1} · ${r.label}`}>
            <p className="st-small st-num">t₁ = {readings[i].t1.toFixed(3)} s · t₂ = {readings[i].t2.toFixed(3)} s</p>
            <Field label="u = 0.100 ÷ t₁" unit="m/s" value={typed[i]?.u ?? ''} onChange={v => set(i, 'u', v)} state={state(i, 'u')} />
            <Field label="v = 0.100 ÷ t₂" unit="m/s" value={typed[i]?.v ?? ''} onChange={v => set(i, 'v', v)} state={state(i, 'v')} />
            <Field label={`p before = ${r.mA.toFixed(1)} × u`} unit="kg·m/s" value={typed[i]?.pb ?? ''} onChange={v => set(i, 'pb', v)} state={state(i, 'pb')} />
            <Field label={`p after = ${massAfter(r).toFixed(1)} × v`} unit="kg·m/s" value={typed[i]?.pa ?? ''} onChange={v => set(i, 'pa', v)} state={state(i, 'pa')} />
          </Group>
        ))}
        <button className="st-btn st-btn-secondary" onClick={() => { setChecked(true); if (!allOk) setWrong(w => w + 1) }}>Check my working</button>
        {checked && !allOk && <p className="st-callout">Some are off (marked red). Speed is 0.100 ÷ time. For "after", use the mass that moves through gate 2: B alone after a springy hit, A + B after velcro.</p>}
        {checked && allOk && <button className="st-btn st-btn-primary st-btn-wide" onClick={() => setStep(3)}>See the result</button>}
      </>
    )
  } else if (stage === 'Result') {
    body = (
      <>
        <table className="st-table">
          <thead><tr><th /><th>p before</th><th>p after</th><th>diff</th></tr></thead>
          <tbody>{rows.map((r, i) => <tr key={i}><td>Run {i + 1}</td><td className="st-num">{r.pb.toFixed(4)}</td><td className="st-num">{r.pa.toFixed(4)}</td><td className="st-num">{(((r.pa - r.pb) / r.pb) * 100).toFixed(1)} %</td></tr>)}</tbody>
        </table>
        <p className="st-truth">In every run the total momentum after is within {Math.max(...rows.map(r => Math.abs(r.pa - r.pb) / r.pb * 100)).toFixed(1)} % of the total before. <b>Momentum is conserved.</b></p>
        <p className="st-muted st-small">Kinetic energy is not: in run 2 the gliders kept only {((0.5 * 0.4 * (TRACK.card / readings[1].t2) ** 2) / (0.5 * 0.2 * (TRACK.card / readings[1].t1) ** 2) * 100).toFixed(0)} % of it.</p>
        <Group label="Sources of error">
          <ul className="st-howto">
            <li>Air drag slows the gliders by about 1 % a second, so "after", timed later, reads a little low.</li>
            <li>The timer reads to 1 ms; on a 0.2 s reading that is 0.5 %.</li>
            <li>After the springy hit A is not quite still; a little momentum stays with it.</li>
          </ul>
        </Group>
        <button className="st-btn st-btn-primary" onClick={() => setStep(4)}>Viva questions</button>
      </>
    )
  } else {
    body = (
      <>
        {VIVA.map((v, i) => (
          <div key={v.q} className="st-viva">
            <p><b>{i + 1}.</b> {v.q}</p>
            {v.options.map((o, j) => <button key={o} className={`st-choice ${viva[i] == null ? '' : j === v.a ? 'is-right' : viva[i] === j ? 'is-wrong' : ''}`} disabled={viva[i] != null} onClick={() => setViva(s => ({ ...s, [i]: j }))}>{o}</button>)}
            {viva[i] != null && <p className="st-muted st-small">{v.why}</p>}
          </div>
        ))}
        {vivaDone && (<><p className="st-done"><Icon name="check" />Practical complete</p><Stars n={Math.max(1, stars)} /><p className="st-muted st-small">Stars: right first time · all three runs · momentum kept within 5 %.</p></>)}
      </>
    )
  }

  const panel = (
    <>
      <div className="st-stephead" ref={topRef}>
        <div className="st-stephead-top"><span className="st-label">Conservation of momentum{done ? ' · completed' : ''}</span><span className="st-num">Step {step + 1} of {STEPS.length}</span></div>
        <div className="st-progress" aria-hidden="true">{STEPS.map((s, i) => <span key={s} className={i < step ? 'is-done' : i === step ? 'is-on' : ''} />)}</div>
        <h2 className="st-step-title">{TITLES[stage]}</h2>
        {step > 0 && <button className="st-back-step" onClick={() => setStep(step - 1)}><Icon name="back" />Back</button>}
      </div>
      <div className="st-step-body">{body}</div>
    </>
  )
  const graph = stage === 'Result'
  return (
    <ExperimentShell code="Class 9 · Force and laws of motion" title="Air track collisions" tabs={tabs} tab="practical" onTab={onTab} panel={panel}>
      <div className={`st-circ ${graph ? 'st-lab has-graph' : 'is-bare'}`}>
        <div><GateCanvas sim={sim} bumper={R.bumper} label={`${R.label}: glider A pushed through two light gates into glider B`} /></div>
        {graph && <div className="st-bus-graph st-vi"><span className="st-label">Momentum before and after</span><MomentumBars rows={rows} /></div>}
      </div>
    </ExperimentShell>
  )
}

function GateCanvas({ sim, bumper, label }) {
  const { ref } = useCanvas((ctx, w, h) => paintTrack(ctx, w, h, { sim, bumper, showGates: true, arrows: false, bars: false }), [sim, sim.t, bumper])
  return <canvas ref={ref} className="st-fill" role="img" aria-label={label} />
}
