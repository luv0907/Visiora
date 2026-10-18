/**
 * VISIORA — Motion Lab (Class 9: Motion in a straight line)
 * A car on a road with its distance–time and speed–time graphs drawing live.
 * Everything comes from the exact equations in engine/motion.js, so the car,
 * the dots, the graphs and the worked numbers always agree.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Play, Pause, RotateCcw, CheckCircle2, Circle, Lightbulb } from 'lucide-react'
import RoadScene from '../components/motion/RoadScene'
import LiveGraph from '../components/motion/LiveGraph'
import { MOTION_COLORS } from '../components/motion/colors'
import { stateAt, runEnd, stopTime, stoppingDistance, insight, ROAD_LENGTH } from '../engine/motion'
import { niceStep } from '../engine/formula'
import { useLabChallenges } from '../store/useLabStore'
import '../components/motion/motion.css'

const FLAG_AT = 60

const CHALLENGES = [
  {
    id: 'line',
    title: 'Make the distance–time graph a straight line',
    hint: 'A straight line means equal distance every second. What must the acceleration be for the speed to stay the same?',
    check: ({ u, a, st }) => st.done && a === 0 && u > 0,
  },
  {
    id: 'flag',
    title: `Brake so the car stops at the flag (${FLAG_AT} m)`,
    hint: `Stopping distance = u² ÷ (2 × braking). With u = 20 m/s you need 400 ÷ (2 × braking) = ${FLAG_AT}. Work out the braking, then set a to minus that.`,
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
// Paused times sit on 0.1 s steps so the worked maths can be checked by hand;
// run ends (e.g. stopping at 6.06 s) keep their exact time and show 2 decimals.
const fmtT = v => (Math.abs(v * 10 - Math.round(v * 10)) < 1e-9 ? v.toFixed(1) : v.toFixed(2))
const snap = v => Math.round(v * 10) / 10
const signed = v => (v < 0 ? `(−${Math.abs(v).toFixed(1)})` : v.toFixed(1))

function niceCeil(v) {
  if (v <= 0) return 1
  const step = niceStep(v, 4)
  return Math.ceil(v / step - 1e-9) * step
}

export default function MotionLabScreen() {
  const navigate = useNavigate()
  const [u, setU] = useState(10)
  const [a, setA] = useState(2)
  const [t, setT] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [rate, setRate] = useState(1)
  const [showPrediction, setShowPrediction] = useState(false)
  const [won, setWon] = useLabChallenges('motion')
  const [toast, setToast] = useState(null)
  const [openHint, setOpenHint] = useState(null)

  const end = useMemo(() => runEnd(u, a), [u, a])
  const st = useMemo(() => stateAt(t, u, a), [t, u, a])
  const tAxis = Math.max(4, niceCeil(end.t))
  // Speed is largest at the start (braking) or the end (speeding up).
  const vAxis = Math.max(10, niceCeil(Math.max(u, stateAt(end.t, u, a).v)))

  const distanceAt = useCallback(tt => stateAt(tt, u, a).s, [u, a])
  const speedAt = useCallback(tt => stateAt(tt, u, a).v, [u, a])
  const areaLabel = useCallback(tt => `area = ${stateAt(tt, u, a).s.toFixed(1)} m`, [u, a])

  // Playback: real seconds × rate.
  const rafRef = useRef(0)
  useEffect(() => {
    if (!playing) return
    let last = performance.now()
    const tick = now => {
      const dt = Math.min(0.1, (now - last) / 1000) * rate
      last = now
      setT(prev => {
        const next = prev + dt
        if (next >= end.t) {
          setPlaying(false)
          return end.t
        }
        return next
      })
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [playing, rate, end.t])

  // Check challenges whenever a run finishes.
  useEffect(() => {
    if (!st.done) return
    for (const c of CHALLENGES) {
      if (!won.has(c.id) && c.check({ u, a, st })) {
        setWon(prev => new Set(prev).add(c.id))
        setToast(c.title)
      }
    }
  }, [st, u, a, won, setWon])

  useEffect(() => {
    if (!toast) return
    const id = setTimeout(() => setToast(null), 3200)
    return () => clearTimeout(id)
  }, [toast])

  const changeParam = setter => value => {
    setter(value)
    setPlaying(false)
    setT(0)
  }

  const togglePlay = () => {
    if (playing) {
      setPlaying(false)
      setT(prev => Math.min(end.t, snap(prev)))
      return
    }
    if (st.done) setT(0)
    setPlaying(true)
  }

  const scrub = value => {
    setPlaying(false)
    // Dragging to the end lands exactly on the end time (e.g. 6.06 s), not the nearest 0.1 s.
    setT(value >= end.t - 0.05 ? end.t : Math.min(snap(value), end.t))
  }

  const ts = stopTime(u, a)
  const accelColor = a > 0 ? MOTION_COLORS.speedUp : a < 0 ? MOTION_COLORS.slowDown : MOTION_COLORS.muted

  return (
    <div className="ml-root">
      <main className="ml-main">
        <section className="ml-scene">
          <RoadScene u={u} a={a} state={st} flagAt={FLAG_AT} />
          <button className="ml-back" onClick={() => navigate(-1)} aria-label="Back">
            <ArrowLeft size={18} strokeWidth={2.5} />
          </button>
          <div className="ml-hud" aria-live="polite">
            <div><small>time</small><b>{n1(st.t)} s</b></div>
            <div style={{ color: MOTION_COLORS.distance }}><small>distance</small><b>{n1(st.s)} m</b></div>
            <div style={{ color: MOTION_COLORS.speed }}><small>speed</small><b>{n1(st.v)} m/s</b></div>
          </div>
          {st.done && (
            <p className="ml-endnote">
              {end.reason === 'finished' && `Reached the end of the road in ${n1(end.t)} s.`}
              {end.reason === 'stopped' && (st.t === 0 ? 'The car is not moving.' : `Stopped after ${n1(end.t)} s, ${n1(st.s)} m from the start.`)}
              {end.reason === 'timeout' && `Still going after ${n1(end.t)} s.`}
            </p>
          )}
        </section>

        <div className="ml-playbar">
          <button className="ml-play" onClick={togglePlay} aria-label={playing ? 'Pause' : 'Play'}>
            {playing ? <Pause size={20} strokeWidth={2.75} /> : <Play size={20} strokeWidth={2.75} />}
          </button>
          <button className="ml-iconbtn" onClick={() => { setPlaying(false); setT(0) }} aria-label="Back to start">
            <RotateCcw size={17} strokeWidth={2.5} />
          </button>
          <input
            className="ml-range ml-scrub"
            type="range"
            min={0}
            max={end.t}
            step="any"
            value={st.t}
            onChange={e => scrub(Number(e.target.value))}
            aria-label="Time"
            style={{ '--pct': `${end.t ? (st.t / end.t) * 100 : 0}%`, '--c': '#1C1713' }}
          />
          <div className="ml-seg" role="radiogroup" aria-label="Playback speed">
            {[0.5, 1].map(r => (
              <button key={r} role="radio" aria-checked={rate === r} className={rate === r ? 'is-on' : ''} onClick={() => setRate(r)}>
                {r}×
              </button>
            ))}
          </div>
        </div>

        <section className="ml-graphs">
          <LiveGraph
            title="Distance–time"
            yName="distance (m)"
            unit="m"
            color={MOTION_COLORS.distance}
            valueAt={distanceAt}
            t={st.t}
            tAxis={tAxis}
            yMax={ROAD_LENGTH}
            showPrediction={showPrediction}
            onScrub={scrub}
          />
          <LiveGraph
            title="Speed–time"
            yName="speed (m/s)"
            unit="m/s"
            color={MOTION_COLORS.speed}
            valueAt={speedAt}
            t={st.t}
            tAxis={tAxis}
            yMax={vAxis}
            showPrediction={showPrediction}
            areaLabel={areaLabel}
            onScrub={scrub}
          />
        </section>
      </main>

      <aside className="ml-panel">
        <header className="ml-head">
          <p className="ml-kicker">Class 9 · Motion</p>
          <h1>Speeding up &amp; slowing down</h1>
          <p>Set the car going, then watch how the dots and both graphs change together.</p>
        </header>

        <section className="ml-section ml-sec-controls">
          <Slider
            label="Starting speed"
            symbol="u"
            unit="m/s"
            min={0}
            max={30}
            step={0.5}
            value={u}
            color={MOTION_COLORS.speed}
            onChange={changeParam(setU)}
          />
          <Slider
            label={a < 0 ? 'Acceleration (braking)' : 'Acceleration'}
            symbol="a"
            unit="m/s²"
            min={-10}
            max={10}
            step={0.1}
            value={a}
            color={accelColor}
            ends={['Brake', 'Speed up']}
            onChange={changeParam(setA)}
          />
          <label className="ml-check">
            <input type="checkbox" checked={showPrediction} onChange={e => setShowPrediction(e.target.checked)} />
            Show the whole graph before it happens
          </label>
        </section>

        <section className="ml-section ml-sec-insight">
          <p className="ml-insight"><Lightbulb size={16} strokeWidth={2.5} /> {insight(u, a, st)}</p>
        </section>

        <section className="ml-section ml-sec-maths">
          <h2>The maths, right now</h2>
          <div className="ml-work">
            {st.stopped && st.t > 0 ? (
              <>
                <p>The car stopped at t = {fmtT(ts)} s, so now v = <b style={{ color: MOTION_COLORS.speed }}>0 m/s</b>.</p>
                <p>Stopping distance = u² ÷ (2 × {n1(-a)}) = {n1(u)}² ÷ {n1(-2 * a)} = <b style={{ color: MOTION_COLORS.distance }}>{n1(stoppingDistance(u, a))} m</b></p>
              </>
            ) : (
              <>
                <p className="ml-at">At t = {fmtT(st.t)} s</p>
                <p>
                  <span className="ml-eq">v = u + a·t</span>
                  = {n1(u)} + {signed(st.a)} × {fmtT(st.t)} = <b style={{ color: MOTION_COLORS.speed }}>{n1(st.v)} m/s</b>
                </p>
                <p>
                  <span className="ml-eq">s = u·t + ½·a·t²</span>
                  = {n1(u)} × {fmtT(st.t)} + ½ × {signed(st.a)} × {fmtT(st.t)}² = <b style={{ color: MOTION_COLORS.distance }}>{n1(st.s)} m</b>
                </p>
              </>
            )}
            <p className="ml-note">On the speed–time graph, the shaded area also equals {n1(st.s)} m.</p>
          </div>
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

function Slider({ label, symbol, unit, min, max, step, value, color, ends, onChange }) {
  const pct = ((value - min) / (max - min)) * 100
  return (
    <div className="ml-slider">
      <div className="ml-slider-head">
        <span>{label} <i>{symbol}</i></span>
        <b style={{ color }}>{value.toFixed(1)} <small>{unit}</small></b>
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
      {ends && (
        <div className="ml-ends"><span>{ends[0]}</span><span>0</span><span>{ends[1]}</span></div>
      )}
    </div>
  )
}
