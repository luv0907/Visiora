/**
 * VISIORA Studio — Speed & acceleration, in the new layout.
 * A car on a 100 m road, a dot for every second it has driven, and its distance–time and
 * speed–time graphs drawing live. All numbers come from engine/motion.js.
 * Mission: a guided bus-and-cow lesson (BusMission.jsx). Drive: brake the bus yourself, four
 * levels with stars (DriveGame.jsx). Intro: steady speed only.
 * Explore: acceleration and the worked maths. Challenge: three goals.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import LiveGraph from '../components/motion/LiveGraph'
import { useCanvas } from '../components/motion/useCanvas'
import { stateAt, runEnd, stopTime, stoppingDistance, insight, ROAD_LENGTH } from '../engine/motion'
import { niceStep } from '../engine/formula'
import { useLabChallenges } from '../store/useLabStore'
import { rememberExperiment } from './catalog'
import { ACCENT, DATA, INK, SOFT } from './drawings'
import { ExperimentShell, Group, Icon, Slider, Toggle } from './Shell'
import BusMission from './BusMission'
import DriveGame from './DriveGame'

const TABS = [['mission', 'Mission'], ['drive', 'Drive'], ['intro', 'Steady speed'], ['explore', 'Explore'], ['challenge', 'Challenge']]
const FLAG_AT = 60
const SPEED_UP = '#1E7F4F'
const SLOW_DOWN = '#B63A16'
const FONTS = { mono: '"IBM Plex Mono", monospace', sans: '"Instrument Sans", sans-serif' }

// The same three goals as the classic Motion Lab, so progress carries over.
export const CHALLENGES = [
  {
    id: 'line',
    title: 'Make the distance–time graph a straight line',
    hint: 'A straight line means equal distance every second. What must the acceleration be for the speed to stay the same?',
    check: ({ u, a, st }) => st.done && a === 0 && u > 0,
  },
  {
    id: 'flag',
    title: `Brake so the car stops at the flag (${FLAG_AT} m)`,
    hint: `Stopping distance = u² ÷ (2 × braking). With u = 20 m/s you need 400 ÷ (2 × braking) = ${FLAG_AT}. Work out the braking, then set acceleration to minus that.`,
    check: ({ st }) => st.done && st.end.reason === 'stopped' && Math.abs(st.s - FLAG_AT) <= 1,
  },
  {
    id: 'race',
    title: 'Start from rest and reach 100 m in exactly 5 s',
    hint: 'From rest, s = ½ a t². Put s = 100 and t = 5, then solve for a.',
    check: ({ u, st }) => st.done && u === 0 && st.end.reason === 'finished' && Math.abs(st.t - 5) <= 0.05,
  },
]

const n1 = v => v.toFixed(1)
const fmtT = v => (Math.abs(v * 10 - Math.round(v * 10)) < 1e-9 ? v.toFixed(1) : v.toFixed(2))
const snap = v => Math.round(v * 10) / 10
const signed = v => (v < 0 ? `(−${Math.abs(v).toFixed(1)})` : v.toFixed(1))
const niceCeil = v => { if (v <= 0) return 1; const step = niceStep(v, 4); return Math.ceil(v / step - 1e-9) * step }

/** The road, drawn like a technical figure: a scale in metres, the car, and one dot per second. */
function Road({ u, a, st, showFlag }) {
  const { ref } = useCanvas((ctx, w, h) => {
    ctx.clearRect(0, 0, w, h)
    // The car's front marks its position, so the road starts a car-length before 0 m.
    const carW = 54, left = 40 + carW, right = 56, roadY = h * 0.66
    const X = s => left + (s / ROAD_LENGTH) * (w - left - right)
    // road and scale
    ctx.strokeStyle = INK; ctx.lineWidth = 2
    ctx.beginPath(); ctx.moveTo(X(0) - carW - 10, roadY); ctx.lineTo(X(ROAD_LENGTH), roadY); ctx.stroke()
    ctx.strokeStyle = SOFT; ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(X(0) + 0.5, roadY - 104); ctx.lineTo(X(0) + 0.5, roadY); ctx.stroke()
    ctx.fillStyle = '#82868F'; ctx.font = `600 10.5px ${FONTS.sans}`; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'
    ctx.fillText('START', X(0), roadY - 108)
    ctx.font = `500 11px ${FONTS.mono}`; ctx.fillStyle = '#82868F'; ctx.textAlign = 'center'; ctx.textBaseline = 'top'
    for (let m = 0; m <= ROAD_LENGTH; m += 10) {
      ctx.fillStyle = INK; ctx.fillRect(Math.round(X(m)) - 0.5, roadY, 1, m % 50 ? 6 : 10)
      ctx.fillStyle = '#82868F'; ctx.fillText(m === 0 ? '0 m' : String(m), X(m), roadY + 14)
    }
    // the flag for the braking challenge
    if (showFlag) {
      const fx = X(FLAG_AT)
      ctx.strokeStyle = INK; ctx.lineWidth = 1.5
      ctx.beginPath(); ctx.moveTo(fx, roadY); ctx.lineTo(fx, roadY - 70); ctx.stroke()
      ctx.fillStyle = ACCENT; ctx.beginPath(); ctx.moveTo(fx, roadY - 70); ctx.lineTo(fx + 26, roadY - 61); ctx.lineTo(fx, roadY - 52); ctx.fill()
    }
    // one dot for each whole second: equal gaps mean steady speed
    ctx.textBaseline = 'bottom'
    for (let k = 1; k <= Math.floor(st.t + 1e-9); k++) {
      const x = X(stateAt(k, u, a).s)
      ctx.fillStyle = DATA; ctx.beginPath(); ctx.arc(x, roadY - 8, 4, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = '#82868F'; ctx.font = `500 10px ${FONTS.mono}`; ctx.fillText(`${k}s`, x, roadY - 15)
    }
    // the car (its front is at the distance travelled)
    const front = X(st.s), carH = 22, top = roadY - 34 - carH
    ctx.fillStyle = '#fff'; ctx.strokeStyle = INK; ctx.lineWidth = 2
    ctx.beginPath(); ctx.rect(front - carW, top, carW, carH); ctx.fill(); ctx.stroke()
    ctx.fillStyle = ACCENT; ctx.fillRect(front - carW + 4, top + 4, carW - 8, 6)
    for (const wx of [front - carW + 12, front - 12]) { ctx.beginPath(); ctx.arc(wx, top + carH + 6, 6, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.fill(); ctx.stroke() }
    // a pointer from the car's front to the scale, so its distance can be read off
    ctx.fillStyle = INK; ctx.beginPath(); ctx.moveTo(front, roadY - 2); ctx.lineTo(front - 5, roadY - 10); ctx.lineTo(front + 5, roadY - 10); ctx.fill()
    // velocity arrow
    if (st.v > 0.05) {
      const len = Math.min(220, st.v * 7), y = top - 14, x0 = front + 6
      ctx.strokeStyle = ACCENT; ctx.fillStyle = ACCENT; ctx.lineWidth = 3
      ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x0 + len, y); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(x0 + len + 8, y); ctx.lineTo(x0 + len - 2, y - 6); ctx.lineTo(x0 + len - 2, y + 6); ctx.fill()
      ctx.font = `500 11px ${FONTS.mono}`; ctx.textAlign = 'left'; ctx.textBaseline = 'bottom'
      ctx.fillText(`v = ${n1(st.v)} m/s`, x0, y - 6)
    }
    // where the dots end: the rest line
    ctx.strokeStyle = SOFT; ctx.setLineDash([4, 6]); ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(X(0), roadY - 34); ctx.lineTo(X(ROAD_LENGTH), roadY - 34); ctx.stroke(); ctx.setLineDash([])
  }, [u, a, st, showFlag])
  return <canvas ref={ref} className="st-road" role="img" aria-label={`Car at ${n1(st.s)} m, moving at ${n1(st.v)} m/s.`} />
}

export default function MotionExperiment() {
  const [tab, setTab] = useState('mission')
  const [u, setU] = useState(10)
  const [a, setA] = useState(0)
  const [t, setT] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [rate, setRate] = useState(1)
  const [showPrediction, setShowPrediction] = useState(false)
  const [won, setWon] = useLabChallenges('motion')
  const [openHint, setOpenHint] = useState(null)

  useEffect(() => { rememberExperiment('motion') }, [])

  const end = useMemo(() => runEnd(u, a), [u, a])
  const st = useMemo(() => stateAt(t, u, a), [t, u, a])
  const tAxis = Math.max(4, niceCeil(end.t))
  const vAxis = Math.max(10, niceCeil(Math.max(u, stateAt(end.t, u, a).v)))
  const distanceAt = useCallback(tt => stateAt(tt, u, a).s, [u, a])
  const speedAt = useCallback(tt => stateAt(tt, u, a).v, [u, a])
  const areaLabel = useCallback(tt => `area = ${stateAt(tt, u, a).s.toFixed(1)} m`, [u, a])

  // Playback in real seconds × rate; only runs while playing.
  const raf = useRef(0)
  useEffect(() => {
    if (!playing) return undefined
    let last = performance.now()
    const tick = now => {
      // Up to half a second per frame: a slow computer skips frames but keeps real time.
      const dt = Math.min(0.5, (now - last) / 1000) * rate
      last = now
      setT(prev => {
        const next = prev + dt
        if (next >= end.t) { setPlaying(false); return end.t }
        return next
      })
      raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf.current)
  }, [playing, rate, end.t])

  const [justWon, setJustWon] = useState(null)
  useEffect(() => {
    if (!st.done) return
    for (const c of CHALLENGES) {
      if (!won.has(c.id) && c.check({ u, a, st })) { setWon(prev => new Set(prev).add(c.id)); setJustWon(c.id) }
    }
  }, [st, u, a, won, setWon])

  const change = setter => value => { setter(value); setPlaying(false); setT(0) }
  const togglePlay = () => {
    if (playing) { setPlaying(false); setT(prev => Math.min(end.t, snap(prev))); return }
    if (st.done) setT(0)
    setPlaying(true)
  }
  const scrub = value => { setPlaying(false); setT(value >= end.t - 0.05 ? end.t : Math.min(snap(value), end.t)) }
  const resetAll = () => { setPlaying(false); setT(0); setU(10); setA(tab === 'intro' ? 0 : 2); setRate(1); setShowPrediction(false) }
  const switchTab = next => {
    setTab(next); setPlaying(false); setT(0); setJustWon(null)
    if (next === 'intro' || next === 'mission' || next === 'drive') setA(0)
    else if (a === 0 && next === 'explore') setA(2)
  }

  // space bar plays and pauses
  useEffect(() => {
    const key = e => {
      if (tab === 'mission' || tab === 'drive' || e.code !== 'Space' || ['INPUT', 'BUTTON'].includes(e.target.tagName)) return
      e.preventDefault(); togglePlay()
    }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  })

  if (tab === 'mission') return <BusMission tabs={TABS} onTab={switchTab} />
  if (tab === 'drive') return <DriveGame tabs={TABS} onTab={switchTab} />

  const ts = stopTime(u, a)
  const accelColor = a > 0 ? SPEED_UP : a < 0 ? SLOW_DOWN : undefined
  const endNote = !st.done ? null
    : end.reason === 'finished' ? `Reached the end of the road in ${n1(end.t)} s.`
      : end.reason === 'stopped' ? (st.t === 0 ? 'The car is not moving.' : `Stopped after ${n1(end.t)} s, ${n1(st.s)} m from the start.`)
        : `Still going after ${n1(end.t)} s.`

  const panel = (
    <>
      {tab === 'intro' && (
        <div className="st-intro">
          <p>Set a speed and press <strong>play</strong>. Watch the dots under the car: one for every second. What do equal gaps tell you?</p>
        </div>
      )}
      {tab === 'challenge' && (
        <Group label={`Challenges · ${won.size} of ${CHALLENGES.length}`}>
          <div className="st-missions">
            {CHALLENGES.map(c => (
              <div key={c.id}>
                <div className={`st-mission-item ${won.has(c.id) ? 'is-done' : ''} ${justWon === c.id ? 'is-on' : ''}`}>
                  <span className="st-tick">{won.has(c.id) && <Icon name="check" style={{ width: 12, height: 12 }} />}</span>{c.title}
                </div>
                {!won.has(c.id) && (openHint === c.id
                  ? <p className="st-hint-text">{c.hint}</p>
                  : <button className="st-linkbtn" onClick={() => setOpenHint(c.id)}>Show a hint</button>)}
              </div>
            ))}
          </div>
        </Group>
      )}
      <Group label="Car">
        <Slider label="Starting speed (u)" value={u} display={`${n1(u)} m/s`} min={0} max={30} step={0.5} scale={['0', '30']} onChange={change(setU)} />
        {tab !== 'intro' && (
          <label className="st-slider">
            <span className="st-slider-head"><span>{a < 0 ? 'Acceleration (braking)' : 'Acceleration (a)'}</span><span className="st-num" style={{ color: accelColor }}>{n1(a)} m/s²</span></span>
            <input type="range" min={-10} max={10} step={0.1} value={a} onChange={e => change(setA)(Number(e.target.value))} aria-valuetext={`${n1(a)} metres per second squared`} />
            <span className="st-scale"><span>brake −10</span><span>0</span><span>+10 speed up</span></span>
          </label>
        )}
      </Group>
      <Group label="Show">
        <Toggle label="Whole graph before it happens" checked={showPrediction} onChange={setShowPrediction} />
      </Group>
      {tab !== 'intro' && (
        <Group label="The maths, right now">
          <div className="st-work">
            {st.stopped && st.t > 0 ? (
              <>
                <p>Stopped at t = {fmtT(ts)} s, so now v = <b style={{ color: ACCENT }}>0 m/s</b>.</p>
                <p>Stopping distance = u² ÷ (2 × {n1(-a)}) = <b style={{ color: DATA }}>{n1(stoppingDistance(u, a))} m</b></p>
              </>
            ) : (
              <>
                <p className="st-label">At t = {fmtT(st.t)} s</p>
                <p><span className="st-eq">v = u + a·t</span> = {n1(u)} + {signed(st.a)} × {fmtT(st.t)} = <b style={{ color: ACCENT }}>{n1(st.v)} m/s</b></p>
                <p><span className="st-eq">s = u·t + ½·a·t²</span> = <b style={{ color: DATA }}>{n1(st.s)} m</b></p>
              </>
            )}
          </div>
        </Group>
      )}
      <p className="st-note">{insight(u, a, st)}</p>
    </>
  )

  return (
    <ExperimentShell code="Class 9 · Motion" title="Speed & acceleration" tabs={TABS} tab={tab} onTab={switchTab} panel={panel}>
      <div className="st-motion">
        <div className="st-motion-road">
          <Road u={u} a={a} st={st} showFlag={tab === 'challenge'} />
          <div className="st-float st-readouts">
            <div><span className="st-label">Time</span><b>{n1(st.t)} s</b></div>
            <div><span className="st-label">Distance</span><b style={{ color: DATA }}>{n1(st.s)} m</b></div>
            <div><span className="st-label">Speed</span><b style={{ color: ACCENT }}>{n1(st.v)} m/s</b></div>
          </div>
          {endNote && <p className="st-endnote">{endNote}</p>}
          {justWon && <p className="st-endnote is-ok"><Icon name="check" />Challenge complete: {CHALLENGES.find(c => c.id === justWon).title}</p>}
        </div>

        <div className="st-playbar" aria-label="Time controls">
          <button className="st-play" onClick={togglePlay} aria-label={playing ? 'Pause' : 'Play'}><Icon name={playing ? 'pause' : 'play'} /></button>
          <button className="st-ctl" onClick={() => { setPlaying(false); setT(0) }} aria-label="Back to the start" title="Back to the start"><Icon name="reset" /></button>
          <input type="range" className="st-scrub" min={0} max={end.t} step="any" value={st.t} onChange={e => scrub(Number(e.target.value))} aria-label="Time" />
          <span className="st-num st-scrub-time">{n1(st.t)} / {n1(end.t)} s</span>
          <div className="st-speed" role="radiogroup" aria-label="Speed">
            {[[1, '1×'], [0.5, '½×']].map(([v, l]) => (
              <button key={v} role="radio" aria-checked={rate === v} className={rate === v ? 'is-on' : ''} onClick={() => setRate(v)}>{l}</button>
            ))}
          </div>
          <span className="st-divider" />
          <button className="st-btn st-btn-secondary st-reset-inline" onClick={resetAll}><Icon name="reset" />Reset all</button>
        </div>

        <div className="st-graphs">
          <LiveGraph title="Distance–time" yName="distance (m)" unit="m" color={DATA} valueAt={distanceAt} t={st.t} tAxis={tAxis} yMax={ROAD_LENGTH} showPrediction={showPrediction} onScrub={scrub} fonts={FONTS} />
          <LiveGraph title="Speed–time" yName="speed (m/s)" unit="m/s" color={ACCENT} valueAt={speedAt} t={st.t} tAxis={tAxis} yMax={vAxis} showPrediction={showPrediction} areaLabel={areaLabel} onScrub={scrub} fonts={FONTS} />
        </div>
      </div>
    </ExperimentShell>
  )
}
