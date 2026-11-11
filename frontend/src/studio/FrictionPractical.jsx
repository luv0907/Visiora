/**
 * VISIORA Studio — Practical tab of Push a box: the coefficient of friction.
 * Pull a 0.5 kg wooden block along a wooden bench with a spring balance, with 0 to 800 g of
 * slotted masses on top. Note the highest reading just before it slips (static friction) and
 * the steady reading while it slides (sliding friction). Work out the normal force N = m·g and
 * plot both against N: two straight lines through the origin, whose slopes are μs and μk.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useCanvas } from '../components/motion/useCanvas'
import { BALANCE, BENCH, G, shown, steady } from '../engine/pull'
import { Stars } from './CircuitBoard'
import { paintPull, usePull } from './pullScene'
import { ExperimentShell, Group, Icon } from './Shell'

const BLOCK = 0.5 // kg
const ADDED = [0, 0.2, 0.4, 0.6, 0.8]
const NEED = 5
const DONE_KEY = 'visiora.force.practical'
const STEPS = ['Aim', 'Measure', 'Calculate', 'Graph', 'Result', 'Viva']
const TITLES = { Aim: 'What we will find out', Measure: 'Pull and read the balance', Calculate: 'The normal force', Graph: 'Friction against normal force', Result: 'Your result', Viva: 'Check your understanding' }
const ok = (typed, actual, rel, abs = 0) => typed !== '' && Number.isFinite(Number(typed)) && Math.abs(Number(typed) - actual) <= rel * Math.abs(actual) + abs
const round1 = v => Math.round(v * 10) / 10
const slopeOf = pts => { const sxy = pts.reduce((s, [x, y]) => s + x * y, 0), sxx = pts.reduce((s, [x]) => s + x * x, 0); return sxx ? sxy / sxx : null }

const VIVA = [
  { q: 'Why is the reading highest just before the block starts to move?', options: ['The spring is new', 'Static friction can grip harder than sliding friction, so it takes more pull to start it than to keep it going', 'The block is heavier at rest', 'The hand pulls harder at first'], a: 1, why: 'μs is bigger than μk. That is why a heavy cupboard is hardest to get moving, and easier once it slides.' },
  { q: 'Why must the block slide at a steady speed when you read the sliding friction?', options: ['So the reading is easy to see', 'Then the net force is zero, so the pull equals the friction exactly', 'Friction only acts at steady speed', 'To protect the balance'], a: 1, why: 'If it were speeding up, part of the pull would be accelerating the block, and the reading would be more than the friction.' },
  { q: 'Why plot friction against the normal force?', options: ['It is a rule', 'Friction = μ × N, so the graph is a straight line through the origin whose slope is μ', 'To use graph paper', 'Because N is bigger'], a: 1, why: 'Then one slope uses all five readings at once, which is more reliable than any one of them.' },
  { q: 'Which change would NOT change μk for this block?', options: ['Waxing the bench', 'Adding more slotted masses', 'Using sandpaper instead of wood', 'Wetting the bench'], a: 1, why: 'Adding mass changes N and so the friction, but not the ratio friction ÷ N. μ depends on the two surfaces, not on how hard they are pressed.' },
]

function FGraph({ rows, mus, muk }) {
  const { ref } = useCanvas((ctx, w, h) => {
    ctx.clearRect(0, 0, w, h)
    const L = 54, R = w - 16, T = 24, B = h - 36
    const XMAX = 14, YMAX = 7
    const X = v => L + (v / XMAX) * (R - L), Y = v => B - (v / YMAX) * (B - T)
    for (let i = 0; i <= 28; i++) { ctx.fillStyle = i % 2 ? 'rgba(32,81,200,.05)' : 'rgba(32,81,200,.12)'; ctx.fillRect(X(i / 2), T, 1, B - T) }
    for (let i = 0; i <= 14; i++) { ctx.fillStyle = i % 2 ? 'rgba(32,81,200,.05)' : 'rgba(32,81,200,.12)'; ctx.fillRect(L, Y(i / 2), R - L, 1) }
    ctx.fillStyle = '#6B6888'; ctx.font = '500 11px "IBM Plex Mono", monospace'; ctx.textBaseline = 'middle'
    for (let v = 0; v <= XMAX; v += 2) { ctx.textAlign = 'center'; ctx.fillText(String(v), X(v), B + 14) }
    for (let v = 0; v <= YMAX; v += 1) { ctx.textAlign = 'right'; ctx.fillText(String(v), L - 8, Y(v)) }
    ctx.textAlign = 'center'; ctx.fillText('normal force N (newtons)', (L + R) / 2, B + 29)
    ctx.save(); ctx.translate(14, (T + B) / 2); ctx.rotate(-Math.PI / 2); ctx.fillText('friction (N)', 0, 0); ctx.restore()
    ctx.fillStyle = '#1B1340'; ctx.fillRect(L, T, 1.5, B - T); ctx.fillRect(L, B, R - L, 1.5)
    const line = (s, c) => { if (!s) return; ctx.strokeStyle = c; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(X(0), Y(0)); ctx.lineTo(X(XMAX), Y(s * XMAX)); ctx.stroke() }
    line(mus, '#D6336C'); line(muk, '#2051C8')
    const mark = (x, y, c) => { ctx.strokeStyle = c; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(X(x) - 5, Y(y) - 5); ctx.lineTo(X(x) + 5, Y(y) + 5); ctx.moveTo(X(x) - 5, Y(y) + 5); ctx.lineTo(X(x) + 5, Y(y) - 5); ctx.stroke() }
    rows.forEach(r => { mark(r.N, r.peak, '#D6336C'); mark(r.N, r.slide, '#2051C8') })
    ctx.font = '600 11px "Instrument Sans", sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'
    ctx.fillStyle = '#D6336C'; ctx.fillRect(L + 8, 8, 10, 10); ctx.fillStyle = '#1B1340'; ctx.fillText('peak (static)', L + 22, 13)
    ctx.fillStyle = '#2051C8'; ctx.fillRect(L + 118, 8, 10, 10); ctx.fillStyle = '#1B1340'; ctx.fillText('sliding', L + 132, 13)
  }, [rows, mus, muk])
  return <canvas ref={ref} className="st-fill" role="img" aria-label="Graph of friction against normal force" />
}

export default function FrictionPractical({ tabs, onTab }) {
  const [step, setStep] = useState(0)
  const [added, setAdded] = useState(0)
  const [rows, setRows] = useState([]) // { added, m, peak, slide, N: typed }
  const [checked, setChecked] = useState(false)
  const [mu, setMu] = useState({ s: '', k: '' })
  const [muChecked, setMuChecked] = useState(false)
  const [viva, setViva] = useState({})
  const [wrong, setWrong] = useState(0)
  const [done, setDone] = useState(() => { try { return Number(localStorage.getItem(DONE_KEY)) || 0 } catch { return 0 } })
  const stage = STEPS[step]
  const m = BLOCK + added
  const { sim, start } = usePull(m)
  const already = rows.some(r => r.added === added)
  const canRecord = steady(sim) && !already
  const record = () => setRows(rs => [...rs, { added, m, peak: round1(sim.peak), slide: shown(sim), N: '' }].sort((a, b) => a.added - b.added))
  const nOk = r => ok(r.N, r.m * G, 0.005, 0.02)
  const allN = rows.length >= NEED && rows.every(nOk)
  const pts = useMemo(() => rows.map(r => ({ N: r.m * G, peak: r.peak, slide: r.slide })), [rows])
  const mus = useMemo(() => slopeOf(pts.map(p => [p.N, p.peak])), [pts])
  const muk = useMemo(() => slopeOf(pts.map(p => [p.N, p.slide])), [pts])
  const sOk = mus && ok(mu.s, mus, 0.04), kOk = muk && ok(mu.k, muk, 0.04)
  const stars = (wrong === 0 ? 1 : 0) + (rows.length >= NEED ? 1 : 0) + (sOk && kOk ? 1 : 0)
  const vivaDone = VIVA.every((_, i) => viva[i] != null)
  useEffect(() => { if (vivaDone && stars > done) { setDone(stars); try { localStorage.setItem(DONE_KEY, String(stars)) } catch { /* private mode */ } } }, [vivaDone, stars, done])
  const topRef = useRef(null)
  useEffect(() => { topRef.current?.closest('.st-panel-scroll')?.scrollTo({ top: 0 }) }, [step])

  let body
  if (stage === 'Aim') {
    body = (
      <>
        <p><b>Aim.</b> To find the coefficients of static and sliding friction between a wooden block and a wooden bench.</p>
        <p><b>Apparatus.</b> A 0.5 kg wooden block with a hook, 200 g slotted masses, a 10 N spring balance reading to 0.1 N, a string and a level wooden bench.</p>
        <p className="st-muted">Pull the balance slowly and steadily, keeping it level. Read it just before the block moves, and again while it slides at a steady speed.</p>
        <button className="st-btn st-btn-primary st-btn-wide" onClick={() => setStep(1)}>Start the practical</button>
      </>
    )
  } else if (stage === 'Measure') {
    body = (
      <>
        <Group label="Slotted masses on the block">
          <div className="st-chipset">{ADDED.map(a => <button key={a} className={`st-chip ${a === added ? 'is-on' : ''}`} onClick={() => setAdded(a)}>{rows.some(r => r.added === a) ? '✓ ' : ''}{a * 1000} g</button>)}</div>
        </Group>
        <div className="st-row">
          <button className="st-btn st-btn-primary" onClick={start} disabled={sim.running && !steady(sim)}><Icon name="play" />{sim.t > 0 ? 'Pull again' : 'Pull'}</button>
          <button className="st-btn st-btn-secondary" onClick={record} disabled={!canRecord}>{already ? 'Recorded' : 'Record'}</button>
        </div>
        <div className="st-idea-readings">
          <div><span>balance reads</span><b className="st-num">{shown(sim).toFixed(1)} N</b></div>
          <div><span>highest so far</span><b className="st-num">{round1(sim.peak).toFixed(1)} N</b></div>
        </div>
        <p className="st-muted st-small">{sim.slippedAt == null ? 'Watch the reading climb while the block is still held.' : steady(sim) ? 'Sliding steadily: record now.' : 'It slipped! Let it settle to a steady pull…'}</p>
        {rows.length > 0 && (
          <table className="st-table">
            <thead><tr><th>mass</th><th>peak (N)</th><th>sliding (N)</th></tr></thead>
            <tbody>{rows.map(r => <tr key={r.added}><td className="st-num">{r.m.toFixed(1)} kg</td><td className="st-num">{r.peak.toFixed(1)}</td><td className="st-num">{r.slide.toFixed(1)}</td></tr>)}</tbody>
          </table>
        )}
        {rows.length >= NEED
          ? <button className="st-btn st-btn-primary st-btn-wide" onClick={() => setStep(2)}>Next: the normal force</button>
          : <p className="st-muted st-small">{rows.length} of {NEED} masses done.</p>}
      </>
    )
  } else if (stage === 'Calculate') {
    body = (
      <>
        <p>On a level bench the bench pushes up as hard as the block and masses weigh: <b>N = m × g</b>, with g = 9.8 m/s².</p>
        <table className="st-table">
          <thead><tr><th>mass</th><th>N (newtons)</th></tr></thead>
          <tbody>{rows.map((r, i) => (
            <tr key={r.added}><td className="st-num">{r.m.toFixed(1)} kg</td>
              <td><input className={`st-answer ${checked ? (nOk(r) ? 'is-right' : 'is-wrong') : ''}`} inputMode="decimal" placeholder="?" value={r.N} aria-label={`N for ${r.m.toFixed(1)} kg`}
                onChange={e => { const v = e.target.value; setRows(rs => rs.map((x, j) => (j === i ? { ...x, N: v } : x))); setChecked(false) }} /></td></tr>
          ))}</tbody>
        </table>
        <button className="st-btn st-btn-secondary" onClick={() => { setChecked(true); if (!allN) setWrong(w => w + 1) }}>Check</button>
        {checked && !allN && <p className="st-callout">One or more are off. Multiply the mass in kilograms by 9.8: for 0.5 kg, N = 4.9 N.</p>}
        {checked && allN && <button className="st-btn st-btn-primary st-btn-wide" onClick={() => setStep(3)}>Next: plot the graph</button>}
      </>
    )
  } else if (stage === 'Graph') {
    body = (
      <>
        <p>Friction = μ × N, so each slope is a coefficient. Read them from the best lines: <b>μ = friction ÷ N</b>.</p>
        <label className="st-field"><span>μs (peak line)</span>
          <input className={`st-answer ${muChecked ? (sOk ? 'is-right' : 'is-wrong') : ''}`} value={mu.s} inputMode="decimal" placeholder="?" onChange={e => { setMu(x => ({ ...x, s: e.target.value })); setMuChecked(false) }} /></label>
        <label className="st-field"><span>μk (sliding line)</span>
          <input className={`st-answer ${muChecked ? (kOk ? 'is-right' : 'is-wrong') : ''}`} value={mu.k} inputMode="decimal" placeholder="?" onChange={e => { setMu(x => ({ ...x, k: e.target.value })); setMuChecked(false) }} /></label>
        <p className="st-muted st-small">Pick a point far along each line, say at N = 12 N, and divide its friction by 12.</p>
        <button className="st-btn st-btn-secondary" onClick={() => { setMuChecked(true); if (!(sOk && kOk)) setWrong(w => w + 1) }}>Check</button>
        {muChecked && !(sOk && kOk) && <p className="st-callout">Not quite. Read the friction where the line crosses N = 12 N, then divide by 12. Two decimal places is enough.</p>}
        {muChecked && sOk && kOk && <button className="st-btn st-btn-primary st-btn-wide" onClick={() => setStep(4)}>See the result</button>}
      </>
    )
  } else if (stage === 'Result') {
    const es = Math.abs(Number(mu.s) - BENCH.mus) / BENCH.mus * 100, ek = Math.abs(Number(mu.k) - BENCH.muk) / BENCH.muk * 100
    body = (
      <>
        <p className="st-truth">You found <b>μs = {Number(mu.s).toFixed(2)}</b> and <b>μk = {Number(mu.k).toFixed(2)}</b>. For this wood on wood they really are {BENCH.mus.toFixed(2)} and {BENCH.muk.toFixed(2)}: you are {es.toFixed(0)} % and {ek.toFixed(0)} % out.</p>
        <p>μs is bigger than μk: it takes more force to <b>start</b> something sliding than to keep it sliding.</p>
        <Group label="Sources of error">
          <ul className="st-howto">
            <li>The balance reads to {BALANCE.leastCount} N; on a 1.6 N reading that is 6 %.</li>
            <li>The bench is not equally rough all along, so the sliding reading flickers.</li>
            <li>The peak is easy to miss by eye: it lasts only an instant.</li>
            <li>Pulling at a slight angle lifts the block a little and reduces N.</li>
          </ul>
        </Group>
        <button className="st-btn st-btn-primary" onClick={() => setStep(5)}>Viva questions</button>
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
        {vivaDone && (<><p className="st-done"><Icon name="check" />Practical complete</p><Stars n={Math.max(1, stars)} /><p className="st-muted st-small">Stars: right first time · {NEED} masses · both μ from the graph.</p></>)}
      </>
    )
  }

  const panel = (
    <>
      <div className="st-stephead" ref={topRef}>
        <div className="st-stephead-top"><span className="st-label">Coefficient of friction{done ? ' · completed' : ''}</span><span className="st-num">Step {step + 1} of {STEPS.length}</span></div>
        <div className="st-progress" aria-hidden="true">{STEPS.map((s, i) => <span key={s} className={i < step ? 'is-done' : i === step ? 'is-on' : ''} />)}</div>
        <h2 className="st-step-title">{TITLES[stage]}</h2>
        {step > 0 && <button className="st-back-step" onClick={() => setStep(step - 1)}><Icon name="back" />Back</button>}
      </div>
      <div className="st-step-body">{body}</div>
    </>
  )
  const graph = stage === 'Graph' || stage === 'Result'
  return (
    <ExperimentShell code="Class 9 · Force and laws of motion" title="Push a box" tabs={tabs} tab="practical" onTab={onTab} panel={panel}>
      <div className={`st-circ ${graph ? 'st-lab has-graph' : 'is-bare'}`}>
        <div><PullCanvas sim={sim} added={added} /></div>
        {graph && <div className="st-bus-graph st-vi"><span className="st-label">Friction against normal force</span><FGraph rows={pts} mus={mus} muk={muk} /></div>}
      </div>
    </ExperimentShell>
  )
}

function PullCanvas({ sim, added }) {
  const { ref } = useCanvas((ctx, w, h) => paintPull(ctx, w, h, { sim, added }), [sim, sim.t, added])
  return <canvas ref={ref} className="st-fill" role="img" aria-label={`A ${(BLOCK + added).toFixed(1)} kg block pulled along a bench by a spring balance`} />
}
