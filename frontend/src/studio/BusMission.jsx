/**
 * VISIORA Studio — Mission tab of Speed & acceleration: "The bus and the cow".
 * Learn by doing, in order: read the situation, sketch a prediction, watch the real run
 * over it, measure a ticker tape, explain the pattern, then apply it to a harder case.
 * The formulas only appear after the student has done the work. Physics: engine/busMission.js.
 * Art in public/images/studio: bus.svg is ours; cow.svg is Microsoft Fluent Emoji (MIT).
 */
import React, { useEffect, useMemo, useState } from 'react'
import { useCanvas } from '../components/motion/useCanvas'
import { BUS, busAt, busRunEnd, minBraking, predictionScore, sketchStopTime, tickerGaps } from '../engine/busMission'
import { ACCENT, DATA, INK } from './drawings'
import { ExperimentShell, Group, Icon, Slider } from './Shell'

const STEPS = ['Situation', 'Predict', 'Run', 'Measure', 'Explain', 'Apply']
const ROAD_M = 70 // metres shown on the road
const BUS_M = 12 // a real bus is about 12 m long
const T_AXIS = 8, V_AXIS = 25
const MONO = '"IBM Plex Mono", monospace', SANS = '"Instrument Sans", sans-serif'
const MUTED = '#82868F'
const DONE_KEY = 'visiora.motion.busMission'
const n1 = v => v.toFixed(1)

// Each picture's viewBox size (vw × vh) and its drawn area: left x, top y, width w, height h.
// The cow is Microsoft Fluent Emoji (MIT) and faces left; the bus is our own drawing and faces right.
const ART_BOX = {
  cow: { vw: 32, vh: 32, x: 2, y: 3.5, w: 28, h: 26.5 },
  bus: { vw: 240, vh: 84, x: 8, y: 6, w: 230, h: 76 },
}
const ART = Object.fromEntries(Object.keys(ART_BOX).map(k => {
  const img = new Image()
  img.src = `/images/studio/${k}.svg`
  return [k, img]
}))
const artLoaded = Promise.all(Object.values(ART).map(img => img.decode().catch(() => {})))
function useArt() {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    let live = true
    artLoaded.then(() => live && setReady(true))
    return () => { live = false }
  }, [])
  return ready && Object.values(ART).every(img => img.complete && img.naturalWidth > 0)
}

/** Road and tape share one scale so the tape lines up under the bus. */
const roadScale = w => {
  const left = 24, right = 28, k = (w - left - right) / (ROAD_M + BUS_M)
  return { X: s => left + (s + BUS_M) * k, S: s => (s - left) / k - BUS_M, k }
}

function Road({ t, u, a, cowAt, artReady }) {
  const { ref } = useCanvas((ctx, w, h) => {
    ctx.clearRect(0, 0, w, h)
    const { X, k } = roadScale(w)
    const top = Math.round(h * 0.6), lane = top + 22
    ctx.fillStyle = '#E9E7DF'; ctx.fillRect(0, top, w, 36)
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.setLineDash([18, 14])
    ctx.beginPath(); ctx.moveTo(0, top + 18); ctx.lineTo(w, top + 18); ctx.stroke(); ctx.setLineDash([])
    ctx.font = `500 11px ${MONO}`; ctx.textAlign = 'center'; ctx.textBaseline = 'top'
    for (let m = 0; m <= ROAD_M; m += 10) {
      ctx.fillStyle = INK; ctx.fillRect(Math.round(X(m)) - 0.5, top + 36, 1, 6)
      ctx.fillStyle = MUTED; ctx.fillText(m ? `${m}` : '0 m', X(m), top + 46)
    }
    // the cow, drawn a little larger than life so it reads at a glance
    const cowH = Math.min(64, h * 0.3), c = ART_BOX.cow, cs = cowH / c.h, cx = X(cowAt)
    if (artReady) ctx.drawImage(ART.cow, cx - c.x * cs, lane - (c.y + c.h) * cs, c.vw * cs, c.vh * cs)
    ctx.fillStyle = INK; ctx.font = `600 12px ${SANS}`; ctx.textBaseline = 'bottom'
    ctx.fillText(`cow · ${cowAt} m`, cx + (c.w * cs) / 2, lane - cowH - 10)
    // the bus, true to scale, its front at the distance travelled
    const { s } = busAt(t, u, a), bx = X(s), b = ART_BOX.bus, bs = (BUS_M * k) / b.w
    if (artReady) ctx.drawImage(ART.bus, bx - (b.x + b.w) * bs, lane - (b.y + b.h) * bs, b.vw * bs, b.vh * bs)
    ctx.fillStyle = INK; ctx.beginPath(); ctx.moveTo(bx, top + 30); ctx.lineTo(bx - 5, top + 38); ctx.lineTo(bx + 5, top + 38); ctx.fill()
  }, [t, u, a, cowAt, artReady])
  return <canvas ref={ref} className="st-fill" role="img" aria-label={`Bus ${n1(busAt(t, u, a).s)} m along, cow at ${cowAt} m.`} />
}

function Tape({ t, u, a, labelled, hover, onHover }) {
  const { ref } = useCanvas((ctx, w, h) => {
    ctx.clearRect(0, 0, w, h)
    const { X } = roadScale(w)
    ctx.fillStyle = '#FBF6E4'; ctx.strokeStyle = '#E2DCC4'
    ctx.fillRect(X(0) - 10, 8, X(ROAD_M) - X(0) + 20, 34); ctx.strokeRect(X(0) - 10.5, 8.5, X(ROAD_M) - X(0) + 20, 34)
    ctx.font = `500 10.5px ${MONO}`; ctx.textAlign = 'center'; ctx.textBaseline = 'top'
    for (let m = 0; m <= ROAD_M; m += 2) {
      const big = m % 10 === 0
      ctx.fillStyle = big ? INK : MUTED; ctx.fillRect(Math.round(X(m)) - 0.5, 44, 1, big ? 11 : 5)
      if (big) ctx.fillText(m, X(m), 58)
    }
    const n = Math.floor(Math.min(t, busRunEnd(u, a, Infinity).t) + 1e-9)
    if (hover != null && hover < n) {
      ctx.fillStyle = 'rgba(32, 81, 200, .14)'
      ctx.fillRect(X(busAt(hover, u, a).s), 8, X(busAt(hover + 1, u, a).s) - X(busAt(hover, u, a).s), 34)
    }
    for (let i = 0; i <= n; i++) {
      const x = X(busAt(i, u, a).s)
      ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(x, 25, 3.5, 0, Math.PI * 2); ctx.fill()
      if (labelled) { ctx.fillStyle = DATA; ctx.fillText(`${i}s`, x, 74) }
    }
  }, [t, u, a, labelled, hover])
  const move = e => {
    if (!onHover) return
    const r = e.currentTarget.getBoundingClientRect(), s = roadScale(r.width).S(e.clientX - r.left)
    const gap = tickerGaps(u, a).findIndex((_, i) => s >= busAt(i, u, a).s && s < busAt(i + 1, u, a).s)
    onHover(gap < 0 ? null : gap)
  }
  return <canvas ref={ref} className="st-fill" onPointerMove={move} onPointerLeave={() => onHover?.(null)} role="img" aria-label="Ticker tape with one dot per second" />
}

function SpeedGraph({ t, u, a, sketch, onSketch, showSketch, showReal }) {
  const frame = (w, h) => {
    const L = 46, R = w - 18, T = 16, B = h - 36
    return { L, R, T, B, X: tt => L + (tt / T_AXIS) * (R - L), Y: v => B - (v / V_AXIS) * (B - T), t: px => ((px - L) / (R - L)) * T_AXIS, v: py => ((B - py) / (B - T)) * V_AXIS }
  }
  const { ref, sizeRef } = useCanvas((ctx, w, h) => {
    ctx.clearRect(0, 0, w, h)
    const g = frame(w, h)
    ctx.font = `500 11px ${MONO}`; ctx.textBaseline = 'middle'
    for (let tt = 0; tt <= T_AXIS; tt++) {
      ctx.fillStyle = 'rgba(22,24,29,.06)'; ctx.fillRect(g.X(tt), g.T, 1, g.B - g.T)
      ctx.fillStyle = MUTED; ctx.textAlign = 'center'; ctx.fillText(tt, g.X(tt), g.B + 14)
    }
    for (let v = 0; v <= V_AXIS; v += 5) {
      ctx.fillStyle = 'rgba(22,24,29,.06)'; ctx.fillRect(g.L, g.Y(v), g.R - g.L, 1)
      ctx.fillStyle = MUTED; ctx.textAlign = 'right'; ctx.fillText(v, g.L - 8, g.Y(v))
    }
    ctx.textAlign = 'center'; ctx.fillText('time (s)', (g.L + g.R) / 2, g.B + 29)
    ctx.save(); ctx.translate(13, (g.T + g.B) / 2); ctx.rotate(-Math.PI / 2); ctx.fillText('speed (m/s)', 0, 0); ctx.restore()
    ctx.fillStyle = INK; ctx.fillRect(g.L, g.T, 1.5, g.B - g.T); ctx.fillRect(g.L, g.B, g.R - g.L, 1.5)
    ctx.font = `600 13px ${SANS}`; ctx.textAlign = 'left'; ctx.textBaseline = 'bottom'
    if (showSketch && sketch.length > 1) {
      ctx.strokeStyle = DATA; ctx.lineWidth = 3; ctx.setLineDash([7, 5]); ctx.beginPath()
      sketch.forEach(([tt, v], i) => (i ? ctx.lineTo(g.X(tt), g.Y(v)) : ctx.moveTo(g.X(tt), g.Y(v))))
      ctx.stroke(); ctx.setLineDash([])
      const [lt, lv] = sketch[sketch.length - 1]
      ctx.fillStyle = DATA; ctx.fillText('your guess', Math.min(g.X(lt) + 6, g.R - 80), g.Y(lv) - 6)
    }
    if (showReal && t > 0) {
      ctx.strokeStyle = ACCENT; ctx.lineWidth = 3; ctx.beginPath()
      const end = Math.min(t, T_AXIS)
      for (let i = 0; i <= 200; i++) { const tt = (end * i) / 200; const p = [g.X(tt), g.Y(busAt(tt, u, a).v)]; i ? ctx.lineTo(...p) : ctx.moveTo(...p) }
      ctx.stroke()
      ctx.fillStyle = ACCENT; ctx.fillText('real speed', g.X(Math.min(end, 1)) + 8, g.Y(busAt(Math.min(end, 1), u, a).v) - 10)
    }
    if (onSketch && sketch.length < 2) {
      ctx.fillStyle = MUTED; ctx.font = `500 15px ${SANS}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.fillText('Hold the mouse down and draw how the speed changes', (g.L + g.R) / 2, (g.T + g.B) / 2)
    }
  }, [t, u, a, sketch, showSketch, showReal, !!onSketch])

  const point = e => {
    const r = e.currentTarget.getBoundingClientRect(), g = frame(sizeRef.current.w, sizeRef.current.h)
    return [Math.min(T_AXIS, Math.max(0, g.t(e.clientX - r.left))), Math.min(V_AXIS, Math.max(0, g.v(e.clientY - r.top)))]
  }
  const down = e => { if (!onSketch) return; e.currentTarget.setPointerCapture(e.pointerId); onSketch([point(e)]) }
  const move = e => {
    if (!onSketch || !e.currentTarget.hasPointerCapture(e.pointerId)) return
    const p = point(e)
    onSketch(prev => (prev.length && p[0] <= prev[prev.length - 1][0] ? prev : [...prev, p]))
  }
  return <canvas ref={ref} className={`st-fill ${onSketch ? 'is-drawing' : ''}`} onPointerDown={down} onPointerMove={move} role="img" aria-label="Speed–time graph" />
}

/** A number box that turns green or orange once the table is checked. */
function Answer({ label, value, onChange, right, checked }) {
  return <input type="number" inputMode="decimal" aria-label={label} className={`st-answer ${checked ? (right ? 'is-right' : 'is-wrong') : ''}`} value={value} onChange={e => onChange(e.target.value)} />
}

export default function BusMission({ tabs, onTab }) {
  const artReady = useArt()
  const [step, setStep] = useState(0)
  const [sketch, setSketch] = useState([])
  const [t, setT] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [brake, setBrake] = useState(3)
  const [table, setTable] = useState({})
  const [checked, setChecked] = useState(false)
  const [choice, setChoice] = useState(null)
  const [hover, setHover] = useState(null)
  const [complete, setComplete] = useState(() => { try { return localStorage.getItem(DONE_KEY) === 'done' } catch { return false } })

  const applying = step === 5
  const u = BUS.u, a = applying ? -brake : BUS.a, cowAt = applying ? BUS.applyCowAt : BUS.cowAt
  const end = useMemo(() => busRunEnd(u, a, cowAt), [u, a, cowAt])
  const now = busAt(Math.min(t, end.t), u, a)
  const ran = !playing && t >= end.t && t > 0

  useEffect(() => {
    if (!playing) return undefined
    let last = performance.now(), id = 0
    const tick = time => {
      // up to half a second per frame, so a slow computer keeps real time
      const dt = Math.min(0.5, (time - last) / 1000)
      last = time
      setT(prev => {
        const next = Math.min(end.t, prev + dt)
        if (next >= end.t) setPlaying(false)
        return next
      })
      id = requestAnimationFrame(tick)
    }
    id = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(id)
  }, [playing, end.t])

  const run = () => { setT(0); setPlaying(true) }
  const go = next => { setStep(next); setPlaying(false); setHover(null); if (next === 5) setT(0) }
  const startOver = () => { setStep(0); setSketch([]); setT(0); setPlaying(false); setTable({}); setChecked(false); setChoice(null); setBrake(3) }

  useEffect(() => {
    if (applying && ran && end.reason === 'stopped' && !complete) {
      setComplete(true)
      try { localStorage.setItem(DONE_KEY, 'done') } catch { /* private mode */ }
    }
  }, [applying, ran, end.reason, complete])

  const gaps = tickerGaps(BUS.u, BUS.a).map(g => Math.round(g * 10) / 10)
  const answers = { ...Object.fromEntries(gaps.flatMap((g, i) => [[`d${i}`, g], [`v${i}`, g]])), drop: -BUS.a }
  const isRight = k => table[k] !== undefined && table[k] !== '' && Math.abs(Number(table[k]) - answers[k]) <= 0.5
  const rightCount = Object.keys(answers).filter(isRight).length
  const allRight = rightCount === Object.keys(answers).length

  // a guess counts once it covers at least 2 s of the graph
  const sketchReady = sketch.length > 1 && sketch[sketch.length - 1][0] - sketch[0][0] >= 2
  const score = predictionScore(sketch, BUS.u, BUS.a)
  const guessStop = sketchStopTime(sketch)
  const stopAt = busRunEnd(BUS.u, BUS.a, BUS.cowAt).t

  const body = [
    // 0 · situation
    <>
      <h2 className="st-step-title">A cow on the road</h2>
      <p>A bus is driving at <b>20 m/s</b> (72 km/h). The driver sees a cow <b>60 m</b> ahead and brakes. The brakes slow the bus by <b>4 m/s every second</b>.</p>
      <p>Will the bus stop before it reaches the cow?</p>
      <p className="st-callout">First you'll guess what happens. Guessing before you watch is how you find out what you really understand.</p>
      <button className="st-btn st-btn-primary" onClick={() => go(1)}>I'm ready to guess</button>
    </>,
    // 1 · predict
    <>
      <h2 className="st-step-title">Draw your guess</h2>
      <p>On the graph, draw how you think the bus's <b>speed</b> changes from the moment the driver brakes.</p>
      <p className="st-muted">It starts at 20 m/s. When does it reach 0? A straight line or a curve?</p>
      <div className="st-row">
        <button className="st-btn st-btn-primary" disabled={!sketchReady} onClick={() => { go(2); run() }}>Lock in and run</button>
        <button className="st-btn st-btn-secondary" disabled={!sketch.length} onClick={() => setSketch([])}>Clear</button>
      </div>
    </>,
    // 2 · run
    ran ? (
      <>
        <h2 className="st-step-title">Stopped at {n1(now.s)} m</h2>
        <p>The bus stopped <b>{n1(BUS.cowAt - now.s)} m</b> before the cow, after <b>{n1(stopAt)} s</b>.</p>
        <span className="st-label">Your guess was</span>
        <p className="st-big">{score}% close</p>
        <p className={`st-callout ${guessStop != null && Math.abs(guessStop - stopAt) < 0.4 ? 'is-ok' : ''}`}>
          {guessStop == null ? 'Your line never reached zero, but the bus does stop. '
            : Math.abs(guessStop - stopAt) < 0.4 ? `You had it stopping at ${n1(guessStop)} s. Spot on! `
              : `You had it stopping at ${n1(guessStop)} s. It really took ${n1(stopAt)} s: 20 m/s ÷ 4 m/s per second = 5 s. `}
          The real graph is a <b>straight line</b>, because the speed drops by the same amount every second.
        </p>
        <p>But how do we <i>know</i> it slows by 4 m/s each second? Measure it, like in a real lab.</p>
        <div className="st-row">
          <button className="st-btn st-btn-primary" onClick={() => go(3)}>Measure the tape</button>
          <button className="st-btn st-btn-secondary" onClick={run}>Replay</button>
        </div>
      </>
    ) : (
      <>
        <h2 className="st-step-title">Watch closely…</h2>
        <p>The red line is the real speed. Your guess is the blue dashed line.</p>
      </>
    ),
    // 3 · measure
    <>
      <h2 className="st-step-title">Read the ticker tape</h2>
      <p>The bus pulled a paper tape that got a dot every second. Use the ruler under it to find how far the bus moved in each second. Point at the tape to highlight a gap.</p>
      <table className="st-table">
        <thead><tr><th>Second</th><th>Distance (m)</th><th>Avg speed (m/s)</th></tr></thead>
        <tbody>
          {gaps.map((_, i) => (
            <tr key={i} className={hover === i ? 'is-hover' : ''}>
              <td className="st-num">{i}–{i + 1} s</td>
              {['d', 'v'].map(c => <td key={c}><Answer label={`${c === 'd' ? 'Distance' : 'Average speed'} from ${i} to ${i + 1} s`} value={table[c + i] ?? ''} onChange={v => setTable(p => ({ ...p, [c + i]: v }))} right={isRight(c + i)} checked={checked} /></td>)}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="st-inline">Speed drops each second by <Answer label="Speed drop each second" value={table.drop ?? ''} onChange={v => setTable(p => ({ ...p, drop: v }))} right={isRight('drop')} checked={checked} /> m/s</p>
      <div className="st-row">
        <button className="st-btn st-btn-primary" onClick={() => setChecked(true)}>Check my table</button>
        <button className="st-btn st-btn-secondary" onClick={() => { setTable(Object.fromEntries(Object.entries(answers).map(([k, v]) => [k, String(v)]))); setChecked(true) }}>Show me</button>
      </div>
      {checked && (allRight ? (
        <>
          <p className="st-callout is-ok">All correct! The speed drops by 4 m/s every second, so the <b>acceleration is −4 m/s²</b>. That is uniform deceleration.</p>
          <p className="st-formula">a = (v − u) ÷ t = (0 − 20) ÷ 5 = −4 m/s²</p>
          <button className="st-btn st-btn-primary" onClick={() => go(4)}>Next</button>
        </>
      ) : <p className="st-callout">{rightCount} of {Object.keys(answers).length} right. Tip: in one second, the distance moved equals the average speed during that second.</p>)}
    </>,
    // 4 · explain
    <>
      <h2 className="st-step-title">Why do the dots get closer together?</h2>
      {['The bus slows down, so it covers less distance each second', 'The ticker timer makes dots faster near the end', 'The tape stretches less at the end'].map((o, i) => (
        <button key={o} className={`st-choice ${choice != null && i === 0 ? 'is-right' : ''} ${choice === i && i ? 'is-wrong' : ''}`} disabled={choice != null} onClick={() => setChoice(i)}>{o}</button>
      ))}
      {choice != null && (
        <>
          <p className={`st-callout ${choice === 0 ? 'is-ok' : ''}`}>{choice === 0 ? 'Exactly. ' : 'Not quite. '}The timer always makes one dot per second. The gaps shrink (18, 14, 10, 6, 2 m) because the bus is slower in each second.</p>
          <button className="st-btn st-btn-primary" onClick={() => go(5)}>Try a harder one</button>
        </>
      )}
    </>,
    // 5 · apply
    <>
      <h2 className="st-step-title">Now the cow is only 40 m away</h2>
      <p>The bus is still at 20 m/s. How hard must the driver brake to stop in time?</p>
      <Slider label="Braking" value={brake} display={`${n1(brake)} m/s²`} min={1} max={8} step={0.5} scale={['gentle', 'hard']} disabled={playing} onChange={v => { setBrake(v); setT(0) }} />
      <button className="st-btn st-btn-primary" disabled={playing} onClick={run}>Brake!</button>
      {ran && (end.reason === 'hit' ? (
        <p className="st-callout">The bus reached the cow still doing <b>{n1(now.v)} m/s</b>. At {n1(brake)} m/s² it needs {n1((u * u) / (2 * brake))} m to stop. Brake harder!</p>
      ) : (
        <>
          <p className="st-callout is-ok">Stopped at <b>{n1(now.s)} m</b>, {n1(cowAt - now.s)} m before the cow. {brake === minBraking(u, cowAt) ? 'That is the exact minimum!' : `The gentlest braking that works is ${minBraking(u, cowAt)} m/s²:`}</p>
          <p className="st-formula">v² = u² + 2as<br />0 = 20² + 2 × a × 40<br />a = −400 ÷ 80 = −5 m/s²</p>
          <p className="st-done"><Icon name="check" />Mission complete</p>
          <button className="st-btn st-btn-primary" onClick={() => onTab('explore')}>Explore on your own</button>
        </>
      ))}
    </>,
  ]

  const panel = (
    <>
      <Group label={complete ? 'Mission · completed' : 'Mission'}>
        <ol className="st-steps">
          {STEPS.map((s, i) => <li key={s} className={i === step ? 'is-on' : i < step ? 'is-done' : ''}>{i < step && <Icon name="check" />}{s}</li>)}
        </ol>
      </Group>
      <div className="st-step-body">{body[step]}</div>
      {step > 0 && <button className="st-linkbtn st-startover" onClick={startOver}>Start the mission again</button>}
    </>
  )

  return (
    <ExperimentShell code="Class 9 · Motion" title="Speed & acceleration" tabs={tabs} tab="mission" onTab={onTab} panel={panel}>
      <div className="st-bus">
        <div className="st-bus-road">
          <Road t={step >= 2 ? t : 0} u={u} a={a} cowAt={cowAt} artReady={artReady} />
          <div className="st-float st-readouts">
            <div><span className="st-label">Time</span><b>{n1(step >= 2 ? Math.min(t, end.t) : 0)} s</b></div>
            <div><span className="st-label">Speed</span><b style={{ color: ACCENT }}>{n1(step >= 2 ? now.v : u)} m/s</b></div>
            <div><span className="st-label">Gap to cow</span><b style={{ color: DATA }}>{n1(cowAt - (step >= 2 ? now.s : 0))} m</b></div>
          </div>
        </div>
        <div className="st-bus-tape">
          <span className="st-label">Ticker tape · one dot every second</span>
          <Tape t={step >= 2 ? t : 0} u={u} a={a} labelled={step >= 3} hover={step === 3 ? hover : null} onHover={step === 3 ? setHover : null} />
        </div>
        <div className="st-bus-graph">
          <span className="st-label">Speed–time graph{step === 1 && <em> · draw here</em>}</span>
          <SpeedGraph t={step >= 2 ? Math.min(t, end.t) : 0} u={u} a={a} sketch={sketch} onSketch={step === 1 ? setSketch : null} showSketch={!applying} showReal={step >= 2} />
        </div>
        <p className="st-credit">Cow: <a href="https://github.com/microsoft/fluentui-emoji" target="_blank" rel="noreferrer">Fluent Emoji</a> © Microsoft, MIT License</p>
      </div>
    </ExperimentShell>
  )
}
