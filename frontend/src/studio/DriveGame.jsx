/**
 * VISIORA Studio — Drive tab of Speed & acceleration: you brake the bus.
 * Four levels unlock one by one (dry road, cow steps out, rain, gravel), each scored with
 * up to three stars. The speed–time graph is drawn from your own braking, and after each
 * run the road shows your thinking and braking distances. Physics: engine/driving.js.
 */
import React, { useEffect, useRef, useState } from 'react'
import { useCanvas } from '../components/motion/useCanvas'
import { LEVELS, SURFACES, brakingDistance, driveResult, newDrive, stepDrive } from '../engine/driving'
import { ACCENT, DATA, INK } from './drawings'
import { ExperimentShell, Group, Icon } from './Shell'
import { BusRoad } from './BusScene'

const STARS_KEY = 'visiora.motion.drive'
const V_AXIS = 25
const MONO = '"IBM Plex Mono", monospace', SANS = '"Instrument Sans", sans-serif'
const MUTED = '#82868F'
const n1 = v => v.toFixed(1)
const n2 = v => v.toFixed(2)

function loadStars() {
  try { return JSON.parse(localStorage.getItem(STARS_KEY)) || {} } catch { return {} }
}

function Stars({ n, of = 3 }) {
  return <span className="st-stars" aria-label={`${n} of ${of} stars`}>{Array.from({ length: of }, (_, i) => <span key={i} className={i < n ? 'is-on' : ''}>★</span>)}</span>
}

/** Speed against time, from the samples of this run, with the cow and the brake marked. */
function DriveGraph({ samples, appearT, pressT, surprise }) {
  const last = samples.length ? samples[samples.length - 1][0] : 0
  const tAxis = Math.max(6, Math.ceil(last + 0.5))
  const { ref } = useCanvas((ctx, w, h) => {
    ctx.clearRect(0, 0, w, h)
    const L = 46, R = w - 18, T = 16, B = h - 36
    const X = t => L + (t / tAxis) * (R - L), Y = v => B - (v / V_AXIS) * (B - T)
    ctx.font = `500 11px ${MONO}`; ctx.textBaseline = 'middle'
    for (let t = 0; t <= tAxis; t++) {
      ctx.fillStyle = 'rgba(22,24,29,.06)'; ctx.fillRect(X(t), T, 1, B - T)
      ctx.fillStyle = MUTED; ctx.textAlign = 'center'; ctx.fillText(t, X(t), B + 14)
    }
    for (let v = 0; v <= V_AXIS; v += 5) {
      ctx.fillStyle = 'rgba(22,24,29,.06)'; ctx.fillRect(L, Y(v), R - L, 1)
      ctx.fillStyle = MUTED; ctx.textAlign = 'right'; ctx.fillText(v, L - 8, Y(v))
    }
    ctx.textAlign = 'center'; ctx.fillText('time (s)', (L + R) / 2, B + 29)
    ctx.save(); ctx.translate(13, (T + B) / 2); ctx.rotate(-Math.PI / 2); ctx.fillText('speed (m/s)', 0, 0); ctx.restore()
    ctx.fillStyle = INK; ctx.fillRect(L, T, 1.5, B - T); ctx.fillRect(L, B, R - L, 1.5)
    // the thinking time: the cow is out but the brakes are not on yet
    const shown = t => t != null && t <= last
    if (surprise && shown(appearT) && !(pressT != null && pressT < appearT)) {
      const until = shown(pressT) ? pressT : last
      ctx.fillStyle = 'rgba(32, 81, 200, .1)'; ctx.fillRect(X(appearT), T, X(until) - X(appearT), B - T)
    }
    ctx.font = `600 12px ${SANS}`; ctx.textAlign = 'left'; ctx.textBaseline = 'top'
    const marker = (t, color, label) => {
      ctx.strokeStyle = color; ctx.lineWidth = 1.5; ctx.setLineDash([4, 4])
      ctx.beginPath(); ctx.moveTo(X(t), T); ctx.lineTo(X(t), B); ctx.stroke(); ctx.setLineDash([])
      ctx.fillStyle = color; ctx.fillText(label, X(t) + 5, T + 2)
    }
    if (surprise && shown(appearT)) marker(appearT, DATA, 'cow steps out')
    if (shown(pressT)) marker(pressT, ACCENT, 'you braked')
    if (samples.length > 1) {
      ctx.strokeStyle = ACCENT; ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.beginPath()
      samples.forEach(([t, v], i) => (i ? ctx.lineTo(X(t), Y(v)) : ctx.moveTo(X(t), Y(v))))
      ctx.stroke()
    }
  }, [samples, appearT, pressT, surprise, tAxis])
  return <canvas ref={ref} className="st-fill" role="img" aria-label="Your speed–time graph" />
}

export default function DriveGame({ tabs, onTab }) {
  const [stars, setStars] = useState(loadStars)
  const [index, setIndex] = useState(0)
  const level = LEVELS[index]
  const surface = SURFACES[level.surface]
  const [st, setSt] = useState(() => newDrive(LEVELS[0]))
  const [samples, setSamples] = useState([])
  const [running, setRunning] = useState(false)
  const [holding, setHolding] = useState(false)
  const held = useRef(false)
  const stRef = useRef(st)

  const unlocked = i => i === 0 || (stars[LEVELS[i - 1].id] || 0) > 0
  const reset = lv => { const fresh = newDrive(lv); stRef.current = fresh; setSt(fresh); setSamples([]); setRunning(false) }
  const pick = i => { if (!unlocked(i)) return; setIndex(i); reset(LEVELS[i]) }
  const go = () => {
    const fresh = newDrive(level)
    stRef.current = fresh; setSt(fresh); setSamples([[0, level.u]]); setRunning(true)
  }
  const brake = on => { held.current = on; setHolding(on) }

  // the game loop: exact physics per frame, frames capped so a stall can't skip the cow
  useEffect(() => {
    if (!running) return undefined
    let last = performance.now(), id = 0
    const tick = now => {
      const dt = Math.min(0.1, (now - last) / 1000)
      last = now
      const next = stepDrive(stRef.current, dt, held.current, level)
      stRef.current = next
      setSt(next)
      setSamples(prev => [...prev, [next.t, next.v]])
      if (next.end) {
        setRunning(false)
        const r = driveResult(next, level)
        setStars(prev => {
          if ((prev[level.id] || 0) >= r.stars) return prev
          const best = { ...prev, [level.id]: r.stars }
          try { localStorage.setItem(STARS_KEY, JSON.stringify(best)) } catch { /* private mode */ }
          return best
        })
        return
      }
      id = requestAnimationFrame(tick)
    }
    id = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(id)
  }, [running, level])

  // hold the space bar to brake
  useEffect(() => {
    const key = down => e => {
      if (e.code !== 'Space' || ['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return
      e.preventDefault()
      if (!e.repeat) brake(down)
    }
    const kd = key(true), ku = key(false)
    window.addEventListener('keydown', kd); window.addEventListener('keyup', ku)
    return () => { window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku) }
  }, [])

  const result = driveResult(st, level)
  const surprise = level.kind === 'surprise'
  const cowStep = !surprise ? 1 : Math.max(0, Math.min(1, (st.t - st.appearT) / 0.4))
  const react = result ? (result.reason === 'hit' ? 'hit' : result.gap < 3 ? 'near' : null) : null
  const total = LEVELS.reduce((n, l) => n + (stars[l.id] || 0), 0)
  const bd = brakingDistance(level.u, surface.a)
  const next = LEVELS[index + 1]

  const outcome = result && (
    <div className="st-step-body">
      <h2 className="st-step-title">
        {result.early ? 'Too early!' : result.reason === 'hit' ? 'The bus hit the cow' : `Stopped ${n1(result.gap)} m from the cow`}
      </h2>
      <Stars n={result.stars} />
      {result.early && <p className="st-callout">You braked before the cow stepped out. On a real road you can't know when that will happen, so wait for it.</p>}
      {result.reason === 'hit' && !result.early && <p className="st-callout">It reached the cow still doing <b>{n1(result.hitSpeed)} m/s</b>. {surprise ? 'React faster, the bus keeps moving at full speed while you think.' : `From ${level.u} m/s the bus needs ${n1(bd)} m to stop here, so start braking at least that far from the cow.`}</p>}
      {result.reaction !== null && (
        <p className="st-formula">
          Your reaction time: {n2(result.reaction)} s<br />
          Thinking distance = {level.u} × {n2(result.reaction)} = {n1(result.thinking)} m<br />
          {result.reason === 'stopped' && <>Braking distance = {level.u}² ÷ (2 × {surface.a}) = {n1(bd)} m<br />Stopping distance = {n1(result.thinking + bd)} m</>}
        </p>
      )}
      {!surprise && result.reason === 'stopped' && (
        <p className="st-formula">Braking distance = u² ÷ 2a<br />= {level.u}² ÷ (2 × {surface.a}) = {n1(bd)} m<br />You braked at {n1(st.brakeS)} m</p>
      )}
      {result.stars > 0 && result.stars < 3 && <p className="st-muted">{surprise ? 'React within 0.6 s for three stars.' : 'Stop within 2 m of the cow for three stars.'}</p>}
      <div className="st-row">
        <button className="st-btn st-btn-primary" onClick={go}>Drive again</button>
        {next && result.stars > 0 && <button className="st-btn st-btn-secondary" onClick={() => pick(index + 1)}>Next level</button>}
      </div>
    </div>
  )

  const panel = (
    <>
      <Group label={`Levels · ${total} of ${LEVELS.length * 3} stars`}>
        <div className="st-levels">
          {LEVELS.map((l, i) => (
            <button key={l.id} className={`st-level ${i === index ? 'is-on' : ''}`} disabled={!unlocked(i) || running} onClick={() => pick(i)}>
              <span className="st-num">{i + 1}</span>
              <span className="st-level-name">{l.title}</span>
              {unlocked(i) ? <Stars n={stars[l.id] || 0} /> : <span className="st-locked">locked</span>}
            </button>
          ))}
        </div>
      </Group>
      {outcome || (
        <div className="st-step-body">
          <h2 className="st-step-title">{level.title}</h2>
          <p>{level.goal}</p>
          <dl className="st-facts">
            <div><dt>Bus speed</dt><dd>{level.u} m/s ({Math.round(level.u * 3.6)} km/h)</dd></div>
            <div><dt>Road</dt><dd>{surface.label}</dd></div>
            <div><dt>Brakes slow it by</dt><dd>{surface.a} m/s every second</dd></div>
          </dl>
          <p className="st-muted">Hold the <b>Brake</b> button or the <b>space bar</b> to brake. Let go to stop braking.</p>
        </div>
      )}
    </>
  )

  const stopS = result?.reason === 'stopped' ? st.s : null
  const brakingNow = holding && running && st.v > 0
  return (
    <ExperimentShell code="Class 9 · Motion" title="Speed & acceleration" tabs={tabs} tab="drive" onTab={onTab} panel={panel}>
      <div className="st-drive">
        <div className="st-bus-road">
          <BusRoad roadM={level.roadM} s={st.s} v={st.v} decel={brakingNow ? surface.a : 0} brakeS={st.brakeS}
            cow={{ at: st.cowAt, step: cowStep, react }}
            marks={result && !result.early && stopS !== null ? { appearS: surprise ? st.appearS : null, brakeS: st.brakeS, stopS } : null}>
            <div className="st-float st-readouts">
              <div><span className="st-label">Time</span><b>{n1(st.t)} s</b></div>
              <div><span className="st-label">Speed</span><b style={{ color: ACCENT }}>{n1(st.v)} m/s</b></div>
              <div><span className="st-label">Gap to cow</span><b style={{ color: DATA }}>{surprise && cowStep < 1 ? '—' : `${n1(Math.max(0, st.cowAt - st.s))} m`}</b></div>
            </div>
          </BusRoad>
        </div>
        <div className="st-drivebar">
          {running ? <span className="st-drive-hint">{surprise && cowStep < 1 ? 'Watch the cow…' : 'Brake!'}</span>
            : <button className="st-btn st-btn-primary st-go" onClick={go}><Icon name="play" />{result ? 'Drive again' : 'Start driving'}</button>}
          <button className={`st-brake ${holding ? 'is-on' : ''}`} disabled={!running}
            onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); brake(true) }}
            onPointerUp={() => brake(false)} onPointerCancel={() => brake(false)} onLostPointerCapture={() => brake(false)}>
            Brake <span>hold</span>
          </button>
        </div>
        <div className="st-bus-graph">
          <span className="st-label">Your speed–time graph</span>
          <DriveGraph samples={samples} appearT={st.appearT} pressT={st.pressT} surprise={surprise} />
        </div>
      </div>
    </ExperimentShell>
  )
}
