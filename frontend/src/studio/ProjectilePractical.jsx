/**
 * VISIORA Studio — Practical tab of Projectile motion: find the speed of a spring launcher.
 * The launcher always fires a cricket ball at the same (unknown) speed. Fire it at five angles
 * on level ground, measure each range with a tape, work out sin 2θ, and plot R against sin 2θ:
 * R = (u²/g)·sin 2θ, so the slope is u²/g and u = √(g × slope). Real air takes a little off
 * each range, so the points sit just under the line: a source of error the result discusses.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useCanvas } from '../components/motion/useCanvas'
import { planet } from '../engine/planets'
import { Stars } from './CircuitBoard'
import { fieldSpan, paintFlight, useFlights } from './flightScene'
import { ExperimentShell, Group, Icon, Slider } from './Shell'

const SPEED = 6.0 // m/s, the launcher's real speed: hidden from the student until the end
const EARTH = planet('earth')
const NEED = 5
const DONE_KEY = 'visiora.projectile.practical'
const STEPS = ['Aim', 'Measure', 'Graph', 'Result', 'Viva']
const TITLES = { Aim: 'What we will find out', Measure: 'Fire and measure', Graph: 'Plot R against sin 2θ', Result: 'Your result', Viva: 'Check your understanding' }
const ok = (typed, actual, tol) => typed !== '' && Number.isFinite(Number(typed)) && Math.abs(Number(typed) - actual) <= tol
const s2 = theta => Math.sin((2 * theta * Math.PI) / 180)

const VIVA = [
  { q: 'Why plot R against sin 2θ?', options: ['It is a rule', 'R = (u²/g)·sin 2θ, so the graph is a straight line through the origin whose slope gives u', 'Because θ is in degrees', 'To make the numbers bigger'], a: 1, why: 'Choosing what to plot so the theory predicts a straight line is the trick behind many practicals: then the slope holds the answer.' },
  { q: 'Two angles gave almost the same range. Which pair?', options: ['15° and 30°', '30° and 60°', '45° and 60°', '15° and 45°'], a: 1, why: 'sin 2θ is the same for θ and 90° − θ: sin 60° = sin 120°. So 30° and 60° (and 15° and 75°) should land in the same place.' },
  { q: 'Why do your points sit slightly below the line at long ranges?', options: ['The tape is too short', 'Air resistance takes a little off every flight, more on the longer ones', 'The launcher gets tired', 'Gravity is stronger far away'], a: 1, why: 'The formula assumes no air. A cricket ball is heavy enough that the effect is small, but it is there.' },
  { q: 'How would you make the measurement more accurate?', options: ['Fire once at each angle', 'Repeat each angle several times and take the mean, and mark the landing spot on carbon paper', 'Use a lighter ball', 'Fire from higher up'], a: 1, why: 'Repeats average out small differences; carbon paper or sand shows exactly where the ball first touched down.' },
]

function RGraph({ points, slope }) {
  const { ref } = useCanvas((ctx, w, h) => {
    ctx.clearRect(0, 0, w, h)
    const L = 54, R = w - 20, T = 14, B = h - 36
    const XMAX = 1, YMAX = Math.max(1, Math.ceil(Math.max(...points.map(p => p[1]), 1) + 0.5))
    const X = v => L + (v / XMAX) * (R - L), Y = v => B - (v / YMAX) * (B - T)
    for (let i = 0; i <= 50; i++) { ctx.fillStyle = i % 5 ? 'rgba(32,81,200,.05)' : 'rgba(32,81,200,.12)'; ctx.fillRect(L + (i / 50) * (R - L), T, 1, B - T); ctx.fillRect(L, B - (i / 50) * (B - T), R - L, 1) }
    ctx.fillStyle = '#6B6888'; ctx.font = '500 11px "IBM Plex Mono", monospace'; ctx.textBaseline = 'middle'
    for (let k = 0; k <= 5; k++) { ctx.textAlign = 'center'; ctx.fillText(((XMAX * k) / 5).toFixed(1), X((XMAX * k) / 5), B + 14); ctx.textAlign = 'right'; ctx.fillText(((YMAX * k) / 5).toFixed(1), L - 8, Y((YMAX * k) / 5)) }
    ctx.textAlign = 'center'; ctx.fillText('sin 2θ', (L + R) / 2, B + 29)
    ctx.save(); ctx.translate(14, (T + B) / 2); ctx.rotate(-Math.PI / 2); ctx.fillText('range R (m)', 0, 0); ctx.restore()
    ctx.fillStyle = '#1B1340'; ctx.fillRect(L, T, 1.5, B - T); ctx.fillRect(L, B, R - L, 1.5)
    if (slope) {
      ctx.strokeStyle = '#D6336C'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(X(0), Y(0)); ctx.lineTo(X(1), Y(slope)); ctx.stroke()
      const x1 = 0.2, x2 = 0.9
      ctx.setLineDash([4, 4]); ctx.strokeStyle = '#1B1340'; ctx.lineWidth = 1
      ctx.beginPath(); ctx.moveTo(X(x1), Y(slope * x1)); ctx.lineTo(X(x2), Y(slope * x1)); ctx.lineTo(X(x2), Y(slope * x2)); ctx.stroke(); ctx.setLineDash([])
      ctx.fillStyle = '#1B1340'; ctx.font = '600 11px "Instrument Sans", sans-serif'; ctx.textAlign = 'center'
      ctx.fillText(`Δ(sin 2θ) = ${(x2 - x1).toFixed(2)}`, X((x1 + x2) / 2), Y(slope * x1) + 12)
      ctx.textAlign = 'left'; ctx.fillText(`ΔR = ${(slope * (x2 - x1)).toFixed(3)} m`, X(x2) + 6, Y(slope * (x1 + x2) / 2))
    }
    for (const [x, y] of points) { ctx.strokeStyle = '#2051C8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(X(x) - 5, Y(y) - 5); ctx.lineTo(X(x) + 5, Y(y) + 5); ctx.moveTo(X(x) - 5, Y(y) + 5); ctx.lineTo(X(x) + 5, Y(y) - 5); ctx.stroke() }
  }, [points, slope])
  return <canvas ref={ref} className="st-fill" role="img" aria-label="Graph of range against sin 2θ" />
}

export default function ProjectilePractical({ tabs, onTab }) {
  const [step, setStep] = useState(0)
  const [theta, setTheta] = useState(15)
  const [rows, setRows] = useState([]) // { theta, R, s: typed sin 2θ }
  const [checked, setChecked] = useState(false)
  const [uTyped, setUTyped] = useState('')
  const [uChecked, setUChecked] = useState(false)
  const [viva, setViva] = useState({})
  const [wrong, setWrong] = useState(0)
  const [done, setDone] = useState(() => { try { return Number(localStorage.getItem(DONE_KEY)) || 0 } catch { return 0 } })
  const stage = STEPS[step]
  const shots = useMemo(() => [{ kind: 'cricket', u: SPEED, theta, h: 0 }], [theta])
  const span = useMemo(() => fieldSpan([{ kind: 'cricket', u: SPEED, theta: 45, h: 0 }], EARTH.g), [])
  const { sim, start, reset } = useFlights({ world: EARTH, shots })
  const landed = sim.balls[0].landed
  const tape = landed ? Math.round(landed.x * 100) / 100 : null // read to the nearest centimetre
  const already = rows.some(r => r.theta === theta)
  const record = () => setRows(rs => [...rs, { theta, R: tape, s: '' }].sort((a, b) => a.theta - b.theta))
  const rowOk = r => ok(r.s, s2(r.theta), 0.0021)
  const allOk = rows.length >= NEED && rows.every(rowOk)
  const points = useMemo(() => rows.map(r => [s2(r.theta), r.R]), [rows])
  // best straight line through the origin: slope = Σxy ÷ Σx²
  const slope = useMemo(() => { const sxy = points.reduce((s, [x, y]) => s + x * y, 0), sxx = points.reduce((s, [x]) => s + x * x, 0); return sxx ? sxy / sxx : null }, [points])
  const uFromSlope = slope ? Math.sqrt(EARTH.g * slope) : null
  const uOk = uFromSlope && ok(uTyped, uFromSlope, 0.03 * uFromSlope)
  const stars = (wrong === 0 ? 1 : 0) + (rows.length >= NEED ? 1 : 0) + (uOk ? 1 : 0)
  const vivaDone = VIVA.every((_, i) => viva[i] != null)
  useEffect(() => { if (vivaDone && stars > done) { setDone(stars); try { localStorage.setItem(DONE_KEY, String(stars)) } catch { /* private mode */ } } }, [vivaDone, stars, done])
  const topRef = useRef(null)
  useEffect(() => { topRef.current?.closest('.st-panel-scroll')?.scrollTo({ top: 0 }) }, [step])

  let body
  if (stage === 'Aim') {
    body = (
      <>
        <p><b>Aim.</b> To find the launch speed of a spring launcher by measuring how far it fires a ball at different angles.</p>
        <p><b>Apparatus.</b> A spring launcher with a protractor scale, a cricket ball, a long measuring tape and carbon paper to mark where the ball lands, on level ground.</p>
        <p className="st-muted">The launcher always fires at the same speed. You will work out what it is.</p>
        <button className="st-btn st-btn-primary st-btn-wide" onClick={() => setStep(1)}>Start the practical</button>
      </>
    )
  } else if (stage === 'Measure') {
    body = (
      <>
        <Slider label="Launcher angle" value={theta} display={`${theta}°`} min={10} max={80} step={5} scale={['10°', '80°']} onChange={t => { setTheta(t); reset() }} />
        <div className="st-row">
          <button className="st-btn st-btn-primary" onClick={start} disabled={sim.running}><Icon name="play" />Fire</button>
          <button className="st-btn st-btn-secondary" onClick={record} disabled={tape == null || already}>{already ? 'Done this angle' : 'Record'}</button>
        </div>
        <div className="st-idea-readings"><div><span>tape reads</span><b className="st-num">{tape != null ? `${tape.toFixed(2)} m` : sim.running ? 'in flight…' : '—'}</b></div><div><span>readings</span><b className="st-num">{rows.length} of {NEED}</b></div></div>
        {rows.length > 0 && (
          <table className="st-table">
            <thead><tr><th>θ</th><th>R (m)</th><th>sin 2θ</th></tr></thead>
            <tbody>{rows.map((r, i) => (
              <tr key={r.theta}><td className="st-num">{r.theta}°</td><td className="st-num">{r.R.toFixed(2)}</td>
                <td><input className={`st-answer ${checked ? (rowOk(r) ? 'is-right' : 'is-wrong') : ''}`} inputMode="decimal" placeholder="?" value={r.s} aria-label={`sin 2θ for ${r.theta}°`}
                  onChange={e => { const v = e.target.value; setRows(rs => rs.map((x, j) => (j === i ? { ...x, s: v } : x))); setChecked(false) }} /></td></tr>
            ))}</tbody>
          </table>
        )}
        <p className="st-muted st-small">Use at least {NEED} different angles. Then work out sin 2θ for each to 3 decimal places (for 30°, sin 60° = 0.866).</p>
        {rows.length >= NEED && <button className="st-btn st-btn-secondary" onClick={() => { setChecked(true); if (!rows.every(rowOk)) setWrong(w => w + 1) }}>Check my sin 2θ values</button>}
        {checked && !allOk && <p className="st-callout">One or more are off. Double the angle first, then take the sine: for 15°, sin 30° = 0.500.</p>}
        {allOk && checked && <button className="st-btn st-btn-primary st-btn-wide" onClick={() => setStep(2)}>Next: plot the graph</button>}
      </>
    )
  } else if (stage === 'Graph') {
    body = (
      <>
        <p>R = (u² ÷ g) × sin 2θ, so the <b>slope = u² ÷ g</b>. Read the slope from the triangle, then <b>u = √(g × slope)</b>, with g = 9.81 m/s².</p>
        <label className="st-field"><span>Launch speed u</span>
          <input className={`st-answer ${uChecked ? (uOk ? 'is-right' : 'is-wrong') : ''}`} value={uTyped} inputMode="decimal" placeholder="?" onChange={e => { setUTyped(e.target.value); setUChecked(false) }} /><em>m/s</em>
        </label>
        <button className="st-btn st-btn-secondary" onClick={() => { setUChecked(true); if (!uOk) setWrong(w => w + 1) }}>Check</button>
        {uChecked && !uOk && <p className="st-callout">Not quite. Slope = ΔR ÷ Δ(sin 2θ). Multiply it by 9.81, then take the square root.</p>}
        {uChecked && uOk && <button className="st-btn st-btn-primary st-btn-wide" onClick={() => setStep(3)}>See the result</button>}
      </>
    )
  } else if (stage === 'Result') {
    const err = Math.abs(Number(uTyped) - SPEED) / SPEED * 100
    body = (
      <>
        <p className="st-truth">You found <b>u = {Number(uTyped).toFixed(2)} m/s</b>. The launcher really fires at {SPEED.toFixed(1)} m/s, so you are {err.toFixed(1)} % out.</p>
        <Group label="Sources of error">
          <ul className="st-howto">
            <li>Air resistance takes a little off every range, a little more on the longer ones, so the slope comes out slightly low.</li>
            <li>The tape reads to 1 cm; on a 3 m range that is 0.3 %.</li>
            <li>The angle scale reads to about 1°. Near 45° that hardly matters; near 15° or 75° it matters more.</li>
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
        {vivaDone && (<><p className="st-done"><Icon name="check" />Practical complete</p><Stars n={Math.max(1, stars)} /><p className="st-muted st-small">Stars: right first time · {NEED} readings · u within 3 %.</p></>)}
      </>
    )
  }

  const panel = (
    <>
      <div className="st-stephead" ref={topRef}>
        <div className="st-stephead-top"><span className="st-label">Find the launch speed{done ? ' · completed' : ''}</span><span className="st-num">Step {step + 1} of {STEPS.length}</span></div>
        <div className="st-progress" aria-hidden="true">{STEPS.map((s, i) => <span key={s} className={i < step ? 'is-done' : i === step ? 'is-on' : ''} />)}</div>
        <h2 className="st-step-title">{TITLES[stage]}</h2>
        {step > 0 && <button className="st-back-step" onClick={() => setStep(step - 1)}><Icon name="back" />Back</button>}
      </div>
      <div className="st-step-body">{body}</div>
    </>
  )
  const graph = stage === 'Graph' || stage === 'Result'
  return (
    <ExperimentShell code="Class 9 · Motion" title="Projectile motion" tabs={tabs} tab="practical" onTab={onTab} panel={panel}>
      <div className={`st-circ ${graph ? 'st-lab has-graph' : 'is-bare'}`}>
        <div><FieldCanvas shots={shots} sim={sim} span={span} /></div>
        {graph && <div className="st-bus-graph st-vi"><span className="st-label">Range against sin 2θ</span><RGraph points={points} slope={slope} /></div>}
      </div>
    </ExperimentShell>
  )
}

function FieldCanvas({ shots, sim, span }) {
  const { ref } = useCanvas((ctx, w, h) => paintFlight(ctx, w, h, { world: EARTH, shots, sim, span }), [sim, sim.t, shots, span])
  return <canvas ref={ref} className="st-fill" role="img" aria-label={`A spring launcher set at ${shots[0].theta}°`} />
}
