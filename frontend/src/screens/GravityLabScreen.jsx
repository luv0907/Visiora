/**
 * VISIORA — Gravity Lab (Class 9: Gravitation · free fall, and throwing)
 * Drop or throw a ball from a cliff on Earth, the Moon, Mars or Jupiter.
 * The scene, strobe balls, height–time and vertical-speed–time graphs and the
 * worked maths all come from the exact equations in engine/projectile.js.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Play, Pause, RotateCcw, CheckCircle2, Circle, Lightbulb } from 'lucide-react'
import CliffScene from '../components/motion/CliffScene'
import LiveGraph from '../components/motion/LiveGraph'
import { MOTION_COLORS } from '../components/motion/colors'
import { PLANETS, stateAt, flightTime, apex, components, insight } from '../engine/projectile'
import { niceStep } from '../engine/formula'
import { useLabChallenges } from '../store/useLabStore'
import '../components/motion/motion.css'

const TARGET = 30

const PRESETS = [
  { label: 'Drop it', set: { u: 0, theta: 0 } },
  { label: 'Throw sideways', set: { u: 10, theta: 0 } },
  { label: 'Throw up', set: { u: 15, theta: 90 } },
  { label: 'Throw at 45°', set: { u: 15, theta: 45 } },
]

const CHALLENGES = [
  {
    id: 'mass',
    title: 'Does a heavier ball fall faster? Drop a light ball and a heavy one (5 kg apart) from the same height.',
    hint: 'Run it, change only the mass, then run it again. Compare the landing times.',
  },
  {
    id: 'basket',
    title: `Throw the ball into the basket ${TARGET} m from the cliff.`,
    hint: 'From a 20 m cliff on Earth, any ball takes about 2 s to fall. How fast sideways must it go to cover 30 m in 2 s?',
  },
  {
    id: 'moon',
    title: 'Find the planet where a drop from 20 m takes about 5 seconds.',
    hint: 'Fall time = √(2h ÷ g). For 5 s from 20 m you need g = 2 × 20 ÷ 5² — which planet has that?',
  },
]

const n1 = v => v.toFixed(1)
const n2 = v => v.toFixed(2)
const fmtT = v => (Math.abs(v * 10 - Math.round(v * 10)) < 1e-9 ? v.toFixed(1) : v.toFixed(2))
const snap = v => Math.round(v * 10) / 10
const signed = v => (v < 0 ? `(−${n2(Math.abs(v))})` : n2(v))
const vyText = vy => (Math.abs(vy) < 0.05 ? '0.0' : `${vy > 0 ? '↑' : '↓'} ${n1(Math.abs(vy))}`)

function niceCeil(v) {
  if (v <= 0) return 1
  const step = niceStep(v, 4)
  return Math.ceil(v / step - 1e-9) * step
}

export default function GravityLabScreen() {
  const navigate = useNavigate()
  const [h, setH] = useState(20)
  const [u, setU] = useState(0)
  const [theta, setTheta] = useState(0)
  const [planetId, setPlanetId] = useState('earth')
  const [mass, setMass] = useState(1)
  const [t, setT] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [rate, setRate] = useState(1)
  const [showPath, setShowPath] = useState(false)
  const [won, setWon] = useLabChallenges('gravity')
  const [runs, setRuns] = useState([])
  const [toast, setToast] = useState(null)
  const [openHint, setOpenHint] = useState(null)

  const planet = PLANETS.find(p => p.id === planetId)
  const params = useMemo(() => ({ h, u, theta, g: planet.g }), [h, u, theta, planet.g])
  const T = flightTime(params)
  const st = useMemo(() => stateAt(t, params), [t, params])
  const { ux, uy } = components(u, theta)
  const top = apex(params)
  const land = stateAt(T, params)
  const tAxis = Math.max(2, niceCeil(T))
  const yAxis = Math.max(5, niceCeil(top.y))
  const vyMax = Math.max(5, niceCeil(Math.max(0, uy)))
  const vyMin = -Math.max(5, niceCeil(Math.max(0, -land.vy)))

  const heightAt = useCallback(tt => stateAt(tt, params).y, [params])
  const vyAt = useCallback(tt => stateAt(tt, params).vy, [params])

  // Playback.
  const rafRef = useRef(0)
  useEffect(() => {
    if (!playing) return
    let last = performance.now()
    const tick = now => {
      const dt = Math.min(0.1, (now - last) / 1000) * rate
      last = now
      setT(prev => {
        const next = prev + dt
        if (next >= T) {
          setPlaying(false)
          return T
        }
        return next
      })
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [playing, rate, T])

  // When a ball lands, log the run and check challenges.
  useEffect(() => {
    if (!st.landed || T === 0) return
    const run = { h, u, theta, g: planet.g, mass, T, x: st.x }
    const key = r => `${r.h}|${r.u}|${r.theta}|${r.g}|${r.mass}`
    if (runs.some(r => key(r) === key(run))) return
    const nextRuns = [...runs.slice(-19), run]
    setRuns(nextRuns)

    const done = []
    const same = nextRuns.filter(r => r.h === h && r.u === u && r.theta === theta && r.g === planet.g)
    if (same.some(r => Math.abs(r.mass - mass) >= 5)) done.push(['mass', `Both took ${n2(T)} s. Mass makes no difference!`])
    if (Math.abs(st.x - TARGET) <= 0.6) done.push(['basket', 'Into the basket!'])
    if (u === 0 && h === 20 && Math.abs(T - 5) <= 0.1) done.push(['moon', `The Moon: ${n2(T)} s.`])
    const fresh = done.filter(([id]) => !won.has(id))
    if (fresh.length) {
      setWon(prev => new Set([...prev, ...fresh.map(([id]) => id)]))
      setToast(fresh[0][1])
    }
  }, [st.landed, st.x, T, h, u, theta, planet.g, mass, runs, won, setWon])

  useEffect(() => {
    if (!toast) return
    const id = setTimeout(() => setToast(null), 3400)
    return () => clearTimeout(id)
  }, [toast])

  const reset = () => { setPlaying(false); setT(0) }
  const change = setter => value => { setter(value); reset() }

  const togglePlay = () => {
    if (playing) {
      setPlaying(false)
      setT(prev => Math.min(T, snap(prev)))
      return
    }
    if (st.landed) setT(0)
    setPlaying(true)
  }

  const scrub = value => {
    setPlaying(false)
    // Dragging to the end lands exactly on the end time (e.g. 2.02 s), not the nearest 0.1 s.
    setT(value >= T - 0.05 ? T : Math.min(snap(value), T))
  }

  const lastSameRun = runs.filter(r => r.h === h && r.u === u && r.theta === theta && r.g === planet.g && r.mass !== mass).slice(-1)[0]

  return (
    <div className="ml-root">
      <main className="ml-main">
        <section className="ml-scene">
          <CliffScene params={params} planet={planetId} mass={mass} t={st.t} target={TARGET} showPath={showPath} />
          <button className="ml-back" onClick={() => navigate(-1)} aria-label="Back">
            <ArrowLeft size={18} strokeWidth={2.5} />
          </button>
          <div className="ml-hud" aria-live="polite">
            <div><small>time</small><b>{n1(st.t)} s</b></div>
            <div style={{ color: '#0D9488' }}><small>height</small><b>{n1(st.y)} m</b></div>
            <div style={{ color: MOTION_COLORS.speed }}><small>up–down</small><b>{vyText(st.vy)}</b></div>
          </div>
          {st.landed && T > 0 && (
            <p className="ml-endnote">
              Landed after {n2(T)} s, {n1(st.x)} m away
              {lastSameRun && ` · the ${lastSameRun.mass} kg ball took ${n2(lastSameRun.T)} s`}
            </p>
          )}
        </section>

        <div className="ml-playbar">
          <button className="ml-play" onClick={togglePlay} aria-label={playing ? 'Pause' : 'Play'} disabled={T === 0}>
            {playing ? <Pause size={20} strokeWidth={2.75} /> : <Play size={20} strokeWidth={2.75} />}
          </button>
          <button className="ml-iconbtn" onClick={reset} aria-label="Back to start">
            <RotateCcw size={17} strokeWidth={2.5} />
          </button>
          <input
            className="ml-range ml-scrub"
            type="range"
            min={0}
            max={T}
            step="any"
            value={st.t}
            onChange={e => scrub(Number(e.target.value))}
            aria-label="Time"
            style={{ '--pct': `${T ? (st.t / T) * 100 : 0}%`, '--c': '#1C1713' }}
          />
          <div className="ml-seg" role="radiogroup" aria-label="Playback speed">
            {[0.25, 0.5, 1].map(r => (
              <button key={r} role="radio" aria-checked={rate === r} className={rate === r ? 'is-on' : ''} onClick={() => setRate(r)}>
                {r}×
              </button>
            ))}
          </div>
        </div>

        <section className="ml-graphs">
          <LiveGraph
            title="Height–time"
            yName="height (m)"
            unit="m"
            color="#0D9488"
            valueAt={heightAt}
            t={st.t}
            tAxis={tAxis}
            yMax={yAxis}
            showPrediction={showPath}
            onScrub={scrub}
          />
          <LiveGraph
            title="Up–down speed–time"
            yName="speed (m/s, + is up)"
            unit="m/s"
            color={MOTION_COLORS.speed}
            valueAt={vyAt}
            t={st.t}
            tAxis={tAxis}
            yMin={vyMin}
            yMax={vyMax}
            showPrediction={showPath}
            note={`Straight line: it drops by g = ${planet.g} m/s every second.`}
            onScrub={scrub}
          />
        </section>
      </main>

      <aside className="ml-panel">
        <header className="ml-head">
          <p className="ml-kicker">Class 9 · Gravitation</p>
          <h1>Falling &amp; throwing</h1>
          <p>Drop or throw a ball off a cliff. Change the planet, the mass, the push — and watch what gravity does.</p>
        </header>

        <section className="ml-section ml-sec-controls">
          <div className="ml-chips" role="radiogroup" aria-label="Planet">
            {PLANETS.map(p => (
              <button key={p.id} role="radio" aria-checked={planetId === p.id} className={`ml-chip ${planetId === p.id ? 'is-on' : ''}`} onClick={() => change(setPlanetId)(p.id)}>
                {p.label}<small>g = {p.g}</small>
              </button>
            ))}
          </div>
          <div className="ml-chips ml-chips-row">
            {PRESETS.map(pr => (
              <button key={pr.label} className="ml-chip ml-chip-sm" onClick={() => { setU(pr.set.u); setTheta(pr.set.theta); reset() }}>
                {pr.label}
              </button>
            ))}
          </div>
          <Slider label="Cliff height" symbol="h" unit="m" min={0} max={50} step={1} value={h} color="#0D9488" onChange={change(setH)} />
          <Slider label="Throw speed" symbol="u" unit="m/s" min={0} max={30} step={0.5} value={u} color={MOTION_COLORS.distance} onChange={change(setU)} />
          <Slider label="Throw angle" symbol="θ" unit="°" min={-90} max={90} step={1} value={theta} color={MOTION_COLORS.distance} ends={['Down', 'Sideways', 'Up']} disabled={u === 0} onChange={change(setTheta)} />
          <Slider label="Mass of the ball" symbol="m" unit="kg" min={0.5} max={10} step={0.5} value={mass} color="#4F46E5" onChange={change(setMass)} />
          <label className="ml-check">
            <input type="checkbox" checked={showPath} onChange={e => setShowPath(e.target.checked)} />
            Show the path and graphs before it happens
          </label>
        </section>

        <section className="ml-section ml-sec-insight">
          <p className="ml-insight"><Lightbulb size={16} strokeWidth={2.5} /> {insight(params, st)}</p>
        </section>

        <section className="ml-section ml-sec-maths">
          <h2>The maths, right now</h2>
          <div className="ml-work">
            {u > 0 && (
              <p>
                <span className="ml-eq">Split the throw</span>
                sideways uₓ = {n1(u)} × cos {theta}° = {n2(ux)} m/s<br />
                up uᵧ = {n1(u)} × sin {theta}° = {n2(uy)} m/s
              </p>
            )}
            <p className="ml-at">At t = {fmtT(st.t)} s{st.landed && T > 0 ? ' (landed)' : ''}</p>
            <p>
              <span className="ml-eq">up–down speed = uᵧ − g·t</span>
              = {n2(uy)} − {planet.g} × {fmtT(st.t)} = <b style={{ color: MOTION_COLORS.speed }}>{n2(st.vy)} m/s</b>
            </p>
            <p>
              <span className="ml-eq">height = h + uᵧ·t − ½·g·t²</span>
              = {h} + {signed(uy)} × {fmtT(st.t)} − ½ × {planet.g} × {fmtT(st.t)}² = <b style={{ color: '#0D9488' }}>{n2(st.y)} m</b>
            </p>
            {u > 0 && ux > 0 && (
              <p>
                <span className="ml-eq">distance = uₓ·t</span>
                = {n2(ux)} × {fmtT(st.t)} = <b style={{ color: MOTION_COLORS.distance }}>{n2(st.x)} m</b>
              </p>
            )}
            {u === 0 && h > 0 && (
              <p className="ml-note">A drop takes √(2h ÷ g) = √(2 × {h} ÷ {planet.g}) = {n2(T)} s. Mass is not in this formula.</p>
            )}
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
          <CheckCircle2 size={18} strokeWidth={2.75} /> {toast}
        </div>
      )}
    </div>
  )
}

function Slider({ label, symbol, unit, min, max, step, value, color, ends, disabled, onChange }) {
  const pct = ((value - min) / (max - min)) * 100
  return (
    <div className={`ml-slider ${disabled ? 'is-disabled' : ''}`}>
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
        disabled={disabled}
        onChange={e => onChange(Number(e.target.value))}
        aria-label={`${label} in ${unit}`}
        style={{ '--pct': `${pct}%`, '--c': color }}
      />
      {ends && <div className="ml-ends">{ends.map(e => <span key={e}>{e}</span>)}</div>}
    </div>
  )
}
