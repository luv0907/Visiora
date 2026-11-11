/**
 * VISIORA Studio — Practical tab of Falling on other planets: find g on a mystery planet.
 * A steel ball hangs from an electromagnet; switching it off drops the ball and starts an
 * electronic timer, and a light gate on the floor stops it. Drop from five heights, work out t²
 * for each, plot h against t², and read g from the slope: h = ½·g·t², so g = 2 × slope.
 * The planet has no air, so the line is straight; the timer reads to a millisecond.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useCanvas } from '../components/motion/useCanvas'
import { simulateDrop } from '../engine/fall'
import { Stars } from './CircuitBoard'
import { useDrops } from './useDrops'
import { paintFall } from './fallScene'
import { ExperimentShell, Group, Icon, Slider } from './Shell'

const MYSTERY = { id: 'x', label: 'Planet X', g: 5.92, rho: 0, sky: ['#2A1F4F', '#5B4A8C'], ground: '#6F6A86', air: 'no air' }
const WORLD = { g: MYSTERY.g, rho: 0 }
const NEED = 5
const DONE_KEY = 'visiora.planets.practical'
const STEPS = ['Aim', 'Measure', 'Graph', 'Result', 'Viva']
const TITLES = { Aim: 'What we will find out', Measure: 'Drop and time it', Graph: 'Plot h against t²', Result: 'Your result', Viva: 'Check your understanding' }
/** The timer shows whole milliseconds. */
const timerReading = h => Math.round(simulateDrop('steel', h, WORLD).landed.t * 1000) / 1000
const ok = (typed, actual, tol) => typed !== '' && Number.isFinite(Number(typed)) && Math.abs(Number(typed) - actual) <= tol

const VIVA = [
  { q: 'Why plot h against t², not h against t?', options: ['It looks neater', 'h = ½gt², so h against t² is a straight line through the origin and its slope is g ÷ 2', 'Because t is too small', 'It doesn’t matter'], a: 1, why: 'A straight line is easy to fit and read: its slope gives g directly, and readings off the line stand out as mistakes.' },
  { q: 'Why use a light gate instead of a stopwatch?', options: ['It is cheaper', 'Human reaction time (about 0.2 s) is as long as the fall itself', 'Stopwatches are not allowed', 'Light makes the ball fall straight'], a: 1, why: 'A 1 m drop on Earth takes only 0.45 s; a 0.2 s reaction error would be nearly half of it.' },
  { q: 'Why drop the steel ball and not a feather?', options: ['Feathers are hard to hold', 'The steel ball is dense, so even where there is air, air resistance hardly affects it', 'Feathers fall faster', 'Steel is magnetic, that is the only reason'], a: 1, why: 'Both reasons help: it is magnetic for the release, and its weight is so large compared with its drag that it falls almost as in a vacuum.' },
  { q: 'Your graph passes through the origin. What does that tell you?', options: ['The timer started late', 'h is proportional to t²: it falls with constant acceleration', 'g is zero', 'The ball bounced'], a: 1, why: 'Constant acceleration from rest gives h = ½at². A line that missed the origin would point to a timing delay, such as the magnet letting go late.' },
]

function HTGraph({ points, slope }) {
  const { ref } = useCanvas((ctx, w, h) => {
    ctx.clearRect(0, 0, w, h)
    const L = 54, R = w - 20, T = 14, B = h - 36
    const XMAX = Math.max(0.2, Math.ceil(Math.max(...points.map(p => p[0]), 0.1) * 10 + 0.5) / 10)
    const YMAX = Math.max(0.5, Math.ceil(Math.max(...points.map(p => p[1]), 0.5) * 2 + 0.5) / 2)
    const X = v => L + (v / XMAX) * (R - L), Y = v => B - (v / YMAX) * (B - T)
    for (let i = 0; i <= 50; i++) { ctx.fillStyle = i % 5 ? 'rgba(32,81,200,.05)' : 'rgba(32,81,200,.12)'; ctx.fillRect(L + (i / 50) * (R - L), T, 1, B - T); ctx.fillRect(L, B - (i / 50) * (B - T), R - L, 1) }
    ctx.fillStyle = '#6B6888'; ctx.font = '500 11px "IBM Plex Mono", monospace'; ctx.textBaseline = 'middle'
    for (let k = 0; k <= 5; k++) { ctx.textAlign = 'center'; ctx.fillText(((XMAX * k) / 5).toFixed(2), X((XMAX * k) / 5), B + 14); ctx.textAlign = 'right'; ctx.fillText(((YMAX * k) / 5).toFixed(1), L - 8, Y((YMAX * k) / 5)) }
    ctx.textAlign = 'center'; ctx.fillText('t² (s²)', (L + R) / 2, B + 29)
    ctx.save(); ctx.translate(14, (T + B) / 2); ctx.rotate(-Math.PI / 2); ctx.fillText('height h (m)', 0, 0); ctx.restore()
    ctx.fillStyle = '#1B1340'; ctx.fillRect(L, T, 1.5, B - T); ctx.fillRect(L, B, R - L, 1.5)
    if (slope) {
      const xEnd = Math.min(XMAX, YMAX / slope)
      ctx.strokeStyle = '#D6336C'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(X(0), Y(0)); ctx.lineTo(X(xEnd), Y(slope * xEnd)); ctx.stroke()
      const x1 = xEnd * 0.25, x2 = xEnd * 0.85
      ctx.setLineDash([4, 4]); ctx.strokeStyle = '#1B1340'; ctx.lineWidth = 1
      ctx.beginPath(); ctx.moveTo(X(x1), Y(slope * x1)); ctx.lineTo(X(x2), Y(slope * x1)); ctx.lineTo(X(x2), Y(slope * x2)); ctx.stroke(); ctx.setLineDash([])
      ctx.fillStyle = '#1B1340'; ctx.font = '600 11px "Instrument Sans", sans-serif'; ctx.textAlign = 'center'
      ctx.fillText(`Δ(t²) = ${(x2 - x1).toFixed(3)} s²`, X((x1 + x2) / 2), Y(slope * x1) + 12)
      ctx.textAlign = 'left'; ctx.fillText(`Δh = ${(slope * (x2 - x1)).toFixed(3)} m`, X(x2) + 6, Y(slope * (x1 + x2) / 2))
    }
    for (const [x, y] of points) { ctx.strokeStyle = '#2051C8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(X(x) - 5, Y(y) - 5); ctx.lineTo(X(x) + 5, Y(y) + 5); ctx.moveTo(X(x) - 5, Y(y) + 5); ctx.lineTo(X(x) + 5, Y(y) - 5); ctx.stroke() }
  }, [points, slope])
  return <canvas ref={ref} className="st-fill" role="img" aria-label="Graph of height against time squared" />
}

export default function PlanetsPractical({ tabs, onTab }) {
  const [step, setStep] = useState(0)
  const [height, setHeight] = useState(0.5)
  const [rows, setRows] = useState([]) // { h, t, t2: typed }
  const [checked, setChecked] = useState(false)
  const [gTyped, setGTyped] = useState('')
  const [gChecked, setGChecked] = useState(false)
  const [viva, setViva] = useState({})
  const [wrong, setWrong] = useState(0)
  const [done, setDone] = useState(() => { try { return Number(localStorage.getItem(DONE_KEY)) || 0 } catch { return 0 } })
  const stage = STEPS[step]
  const { sim, start, reset } = useDrops({ world: WORLD, kinds: ['steel'], height })
  const shown = sim.drops[0].landed ? timerReading(height) : null
  const already = rows.some(r => Math.abs(r.h - height) < 0.099)
  const record = () => setRows(rs => [...rs, { h: height, t: shown, t2: '' }].sort((a, b) => a.h - b.h))
  const rowOk = r => ok(r.t2, r.t * r.t, 0.0021)
  const allOk = rows.length >= NEED && rows.every(rowOk)
  const points = useMemo(() => rows.map(r => [r.t * r.t, r.h]), [rows])
  // best straight line through the origin: slope = Σxy ÷ Σx²
  const slope = useMemo(() => { const sxy = points.reduce((s, [x, y]) => s + x * y, 0), sxx = points.reduce((s, [x]) => s + x * x, 0); return sxx ? sxy / sxx : null }, [points])
  const gOk = slope && ok(gTyped, 2 * slope, 0.03 * 2 * slope)
  const stars = (wrong === 0 ? 1 : 0) + (rows.length >= NEED ? 1 : 0) + (gOk ? 1 : 0)
  const vivaDone = VIVA.every((_, i) => viva[i] != null)
  useEffect(() => { if (vivaDone && stars > done) { setDone(stars); try { localStorage.setItem(DONE_KEY, String(stars)) } catch { /* private mode */ } } }, [vivaDone])
  const topRef = useRef(null)
  useEffect(() => { topRef.current?.closest('.st-panel-scroll')?.scrollTo({ top: 0 }) }, [step])

  let body
  if (stage === 'Aim') {
    body = (
      <>
        <p><b>Aim.</b> To find the acceleration due to gravity, g, on Planet X by timing a falling ball from several heights.</p>
        <p><b>Apparatus.</b> A steel ball, an electromagnet to hold and release it, an electronic timer that starts when the magnet lets go, a light gate on the floor that stops the timer, and a metre rule.</p>
        <p className="st-muted">Planet X has no air, so nothing but gravity acts on the ball.</p>
        <button className="st-btn st-btn-primary st-btn-wide" onClick={() => setStep(1)}>Start the practical</button>
      </>
    )
  } else if (stage === 'Measure') {
    body = (
      <>
        <Slider label="Height above the gate" value={height} display={`${height.toFixed(2)} m`} min={0.2} max={2} step={0.05} scale={['0.20 m', '2.00 m']} onChange={h => { setHeight(h); reset() }} />
        <div className="st-row">
          <button className="st-btn st-btn-primary" onClick={start} disabled={sim.running}><Icon name="play" />Switch off the magnet</button>
          <button className="st-btn st-btn-secondary" onClick={record} disabled={shown == null || already}>{already ? 'Done this height' : 'Record'}</button>
        </div>
        <div className="st-idea-readings"><div><span>timer</span><b className="st-num">{shown != null ? `${shown.toFixed(3)} s` : sim.running ? 'timing…' : '0.000 s'}</b></div><div><span>readings</span><b className="st-num">{rows.length} of {NEED}</b></div></div>
        {rows.length > 0 && (
          <table className="st-table">
            <thead><tr><th>h (m)</th><th>t (s)</th><th>t² (s²)</th></tr></thead>
            <tbody>{rows.map((r, i) => (
              <tr key={r.h}><td className="st-num">{r.h.toFixed(2)}</td><td className="st-num">{r.t.toFixed(3)}</td>
                <td><input className={`st-answer ${checked ? (rowOk(r) ? 'is-right' : 'is-wrong') : ''}`} inputMode="decimal" placeholder="?" value={r.t2} aria-label={`t squared for ${r.h.toFixed(2)} m`}
                  onChange={e => { const v = e.target.value; setRows(rs => rs.map((x, j) => (j === i ? { ...x, t2: v } : x))); setChecked(false) }} /></td></tr>
            ))}</tbody>
          </table>
        )}
        <p className="st-muted st-small">Spread your heights out: at least {NEED}, 10 cm or more apart. Then square each time (t × t) to 3 decimal places.</p>
        {rows.length >= NEED && <button className="st-btn st-btn-secondary" onClick={() => { setChecked(true); if (!rows.every(rowOk)) setWrong(w => w + 1) }}>Check my t² values</button>}
        {checked && !allOk && <p className="st-callout">One or more t² values are off. Multiply the time by itself, for example 0.411 × 0.411 = 0.169.</p>}
        {allOk && checked && <button className="st-btn st-btn-primary st-btn-wide" onClick={() => setStep(2)}>Next: plot the graph</button>}
      </>
    )
  } else if (stage === 'Graph') {
    body = (
      <>
        <p>Your points lie on a straight line through the origin. Read the slope from the triangle: <b>slope = Δh ÷ Δ(t²)</b>. Then, since h = ½ g t², <b>g = 2 × slope</b>.</p>
        <label className="st-field"><span>g on Planet X</span>
          <input className={`st-answer ${gChecked ? (gOk ? 'is-right' : 'is-wrong') : ''}`} value={gTyped} inputMode="decimal" placeholder="?" onChange={e => { setGTyped(e.target.value); setGChecked(false) }} /><em>m/s²</em>
        </label>
        <button className="st-btn st-btn-secondary" onClick={() => { setGChecked(true); if (!gOk) setWrong(w => w + 1) }}>Check</button>
        {gChecked && !gOk && <p className="st-callout">Not quite. Divide Δh by Δ(t²) from the triangle, then double it.</p>}
        {gChecked && gOk && <button className="st-btn st-btn-primary st-btn-wide" onClick={() => setStep(3)}>See the result</button>}
      </>
    )
  } else if (stage === 'Result') {
    const err = Math.abs(Number(gTyped) - MYSTERY.g) / MYSTERY.g * 100
    body = (
      <>
        <p className="st-truth">You found <b>g = {Number(gTyped).toFixed(2)} m/s²</b>. Planet X’s real value is {MYSTERY.g} m/s², so you are {err.toFixed(1)} % out.</p>
        <p>That is about {(MYSTERY.g / 9.81 * 100).toFixed(0)} % of Earth’s gravity: you would weigh {(MYSTERY.g / 9.81).toFixed(2)} times what you weigh here.</p>
        <Group label="Sources of error">
          <ul className="st-howto">
            <li>The timer reads to 1 ms. On a 0.26 s drop that is about 0.4 %, doubled when t is squared.</li>
            <li>Measuring the height: 1 cm in 50 cm is 2 %, which is why the taller drops are more accurate.</li>
            <li>On a planet with air, a slow, light ball would fall more slowly than h = ½gt² says, and the line would curve.</li>
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
        {vivaDone && (<><p className="st-done"><Icon name="check" />Practical complete</p><Stars n={Math.max(1, stars)} /><p className="st-muted st-small">Stars: right first time · {NEED} readings · g within 3 %.</p></>)}
      </>
    )
  }

  const panel = (
    <>
      <div className="st-stephead" ref={topRef}>
        <div className="st-stephead-top"><span className="st-label">Find g on Planet X{done ? ' · completed' : ''}</span><span className="st-num">Step {step + 1} of {STEPS.length}</span></div>
        <div className="st-progress" aria-hidden="true">{STEPS.map((s, i) => <span key={s} className={i < step ? 'is-done' : i === step ? 'is-on' : ''} />)}</div>
        <h2 className="st-step-title">{TITLES[stage]}</h2>
        {step > 0 && <button className="st-back-step" onClick={() => setStep(step - 1)}><Icon name="back" />Back</button>}
      </div>
      <div className="st-step-body">{body}</div>
    </>
  )
  return (
    <ExperimentShell code="Class 9 · Gravitation" title="Falling on other planets" tabs={tabs} tab="practical" onTab={onTab} panel={panel}>
      <div className={`st-circ ${stage === 'Graph' || stage === 'Result' ? 'st-lab has-graph' : 'is-bare'}`}>
        <div><DropCanvas sim={sim} height={height} /></div>
        {(stage === 'Graph' || stage === 'Result') && <div className="st-bus-graph st-vi"><span className="st-label">Height against time squared</span><HTGraph points={points} slope={slope} /></div>}
      </div>
    </ExperimentShell>
  )
}

function DropCanvas({ sim, height }) {
  const { ref } = useCanvas((ctx, w, h) => {
    paintFall(ctx, w, h, { world: MYSTERY, height, t: sim.t, gate: 0.02, drops: [{ kind: 'steel', y: sim.drops[0].y, trail: [], landed: sim.drops[0].landed, label: 'Steel ball' }] })
  }, [sim, sim.t, height])
  return <canvas ref={ref} className="st-fill" role="img" aria-label={`A steel ball held ${height.toFixed(2)} m above a light gate on Planet X`} />
}
