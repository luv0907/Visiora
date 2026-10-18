/**
 * VISIORA — Force Lab (Class 9: Force and Laws of Motion)
 * Push a crate across ice, wood or carpet. Change the push while it moves and watch
 * friction, the net force, the acceleration and the velocity respond — F = ma, live.
 * The box only moves by engine/forces.js, which solves each step exactly.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Play, Pause, RotateCcw, CheckCircle2, Circle, Lightbulb, Hand } from 'lucide-react'
import BoxScene from '../components/force/BoxScene'
import LiveGraph from '../components/motion/LiveGraph'
import { FORCE_COLORS } from '../components/force/colors'
import { SURFACES, G, step, forcesAt, insight } from '../engine/forces'
import { niceStep } from '../engine/formula'
import { useLabChallenges } from '../store/useLabStore'
import '../components/motion/motion.css'

const MAX_TIME = 60

const CHALLENGES = [
  {
    id: 'budge',
    title: 'Get a 10 kg box moving on carpet.',
    hint: 'Friction can grip with up to μs × m × g = 0.8 × 10 × 9.8 N. Your push has to be bigger than that.',
  },
  {
    id: 'steady',
    title: 'Keep the box sliding at a steady speed (zero acceleration) for 2 seconds.',
    hint: 'Get it moving, then make your push exactly equal to sliding friction. On wood with 10 kg that is 0.25 × 10 × 9.8 = 24.5 N.',
  },
  {
    id: 'glide',
    title: 'On ice, push and then let go so the box ends up more than 20 m from the start.',
    hint: 'After you let go it slides v² ÷ (2 × 0.05 × 9.8) metres. Build up speed first, then press “Let go”.',
  },
]

const n1 = v => (Math.abs(v) < 0.05 ? 0 : v).toFixed(1)
const n2 = v => (Math.abs(v) < 0.005 ? 0 : v).toFixed(2)
const sgn = v => (v < 0 ? `(−${n1(-v)})` : n1(v))

function niceCeil(v) {
  if (v <= 0) return 1
  const s = niceStep(v, 4)
  return Math.ceil(v / s - 1e-9) * s
}

export default function ForceLabScreen() {
  const navigate = useNavigate()
  const [F, setF] = useState(0)
  const [m, setM] = useState(10)
  const [surfaceId, setSurfaceId] = useState('wood')
  const [playing, setPlaying] = useState(true)
  const [rate, setRate] = useState(1)
  const [showForces, setShowForces] = useState(true)
  const [sim, setSim] = useState({ t: 0, x: 0, v: 0 })
  const [won, setWon] = useLabChallenges('force')
  const [toast, setToast] = useState(null)
  const [openHint, setOpenHint] = useState(null)

  const surface = SURFACES.find(s => s.id === surfaceId)
  const forces = forcesAt(sim, F, m, surface)

  // Recorded run: velocity is linear between entries (acceleration is constant
  // within each step), so interpolating it is exact. `net` is the net force over
  // the interval that ends at that entry.
  const historyRef = useRef([{ t: 0, v: 0, net: 0 }])
  const steadyRef = useRef(0)
  const liveRef = useRef({})
  liveRef.current = { F, m, surface, rate }

  // The live state lives in a ref so each frame steps exactly once (a state
  // updater may run twice in development and would double-record history).
  const simRef = useRef({ t: 0, x: 0, v: 0 })

  const reset = useCallback(() => {
    simRef.current = { t: 0, x: 0, v: 0 }
    historyRef.current = [{ t: 0, v: 0, net: 0 }]
    steadyRef.current = 0
    setSim(simRef.current)
  }, [])

  useEffect(() => {
    if (!playing) return
    let raf
    let last = performance.now()
    const tick = now => {
      const { F: f, m: mass, surface: surf, rate: r } = liveRef.current
      const dt = Math.min(0.05, (now - last) / 1000) * r
      last = now
      const prev = simRef.current
      const fr = forcesAt(prev, f, mass, surf)
      // The clock waits until the box first moves, and stops at MAX_TIME.
      if (!(prev.t === 0 && !fr.moving) && prev.t < MAX_TIME) {
        const { state, events } = step(prev, Math.min(dt, MAX_TIME - prev.t), f, mass, surf)
        const h = historyRef.current
        for (const e of events) h.push({ t: e.t, v: 0, net: fr.net })
        const after = forcesAt(state, f, mass, surf)
        h.push({ t: state.t, v: state.v, net: events.length ? after.net : fr.net })
        steadyRef.current = fr.moving && state.v !== 0 && Math.abs(fr.a) < 0.02 ? steadyRef.current + (state.t - prev.t) : 0
        simRef.current = state
        setSim(state)
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [playing])

  // Challenges.
  useEffect(() => {
    const done = []
    if (surfaceId === 'carpet' && m === 10 && sim.v !== 0) done.push('budge')
    if (steadyRef.current >= 2) done.push('steady')
    if (surfaceId === 'ice' && F === 0 && sim.v === 0 && sim.x > 20) done.push('glide')
    const fresh = done.filter(id => !won.has(id))
    if (!fresh.length) return
    setWon(prev => new Set([...prev, ...fresh]))
    setToast(CHALLENGES.find(c => c.id === fresh[0]).title)
  }, [sim, surfaceId, m, F, won, setWon])

  useEffect(() => {
    if (!toast) return
    const id = setTimeout(() => setToast(null), 3200)
    return () => clearTimeout(id)
  }, [toast])

  // Graph data from the recorded run (read from the ref so a reset is never stale).
  const findIdx = (h, tt) => {
    let lo = 0
    let hi = h.length - 1
    while (lo < hi) {
      const mid = (lo + hi) >> 1
      if (h[mid].t < tt) lo = mid + 1
      else hi = mid
    }
    return lo
  }
  const velocityAt = useCallback(tt => {
    const h = historyRef.current
    if (tt <= 0) return h[0].v
    const i = findIdx(h, tt)
    const b = h[i]
    const a = h[Math.max(0, i - 1)]
    if (b.t === a.t) return b.v
    return a.v + ((b.v - a.v) * (tt - a.t)) / (b.t - a.t)
  }, [sim]) // eslint-disable-line react-hooks/exhaustive-deps
  const netAt = useCallback(tt => {
    const h = historyRef.current
    return tt <= 0 ? forces.net : h[findIdx(h, tt)].net
  }, [sim, forces.net]) // eslint-disable-line react-hooks/exhaustive-deps

  const hist = historyRef.current
  const tAxis = Math.max(10, niceCeil(sim.t * 1.1))
  const vExtent = useMemo(() => hist.reduce((acc, e) => [Math.min(acc[0], e.v), Math.max(acc[1], e.v)], [0, 0]), [sim]) // eslint-disable-line react-hooks/exhaustive-deps
  const vMax = Math.max(2, niceCeil(vExtent[1]))
  const vMin = vExtent[0] < 0 ? -niceCeil(-vExtent[0]) : 0
  const netExtent = Math.max(20, niceCeil(Math.max(Math.abs(forces.net), ...hist.slice(-400).map(e => Math.abs(e.net)))))

  const changeMass = value => { setM(value); reset() }

  return (
    <div className="ml-root">
      <main className="ml-main">
        <section className="ml-scene">
          <BoxScene x={sim.x} m={m} surfaceId={surfaceId} forces={forces} showForces={showForces} pushing={F} />
          <button className="ml-back" onClick={() => navigate(-1)} aria-label="Back">
            <ArrowLeft size={18} strokeWidth={2.5} />
          </button>
          <div className="ml-hud" aria-live="polite">
            <div><small>time</small><b>{n1(sim.t)} s</b></div>
            <div style={{ color: '#1251B8' }}><small>speed</small><b>{n2(Math.abs(sim.v))} m/s</b></div>
            <div style={{ color: FORCE_COLORS.net }}><small>accel.</small><b>{n2(forces.a)}</b></div>
          </div>
          {sim.t === 0 && sim.v === 0 && (
            <p className="ml-endnote">{F === 0 ? 'Drag the push slider to push the box →' : 'Not moving yet — push harder!'}</p>
          )}
        </section>

        <div className="ml-playbar">
          <button className="ml-play" onClick={() => setPlaying(p => !p)} aria-label={playing ? 'Pause' : 'Play'}>
            {playing ? <Pause size={20} strokeWidth={2.75} /> : <Play size={20} strokeWidth={2.75} />}
          </button>
          <button className="ml-iconbtn" onClick={() => { reset(); setF(0) }} aria-label="Start again">
            <RotateCcw size={17} strokeWidth={2.5} />
          </button>
          <div className="fl-push">
            <div className="ml-slider-head">
              <span>Push <i>F</i></span>
              <b style={{ color: FORCE_COLORS.applied }}>{F.toFixed(1)} <small>N</small></b>
            </div>
            <input
              className="ml-range"
              type="range"
              min={-150}
              max={150}
              step={0.5}
              value={F}
              onChange={e => setF(Number(e.target.value))}
              aria-label="Push force in newtons (negative pushes left)"
              style={{ '--pct': `${((F + 150) / 300) * 100}%`, '--c': FORCE_COLORS.applied }}
            />
          </div>
          <button className="ml-chip ml-chip-sm fl-letgo" onClick={() => setF(0)} disabled={F === 0}>
            <Hand size={14} strokeWidth={2.5} /> Let go
          </button>
        </div>

        <section className="ml-graphs">
          <LiveGraph
            title="Velocity–time"
            yName="velocity (m/s)"
            unit="m/s"
            color="#1251B8"
            valueAt={velocityAt}
            t={sim.t}
            tAxis={tAxis}
            yMin={vMin}
            yMax={vMax}
            note="Slope of this line = acceleration."
          />
          <LiveGraph
            title="Net force–time"
            yName="net force (N)"
            unit="N"
            color={FORCE_COLORS.net}
            valueAt={netAt}
            t={sim.t}
            tAxis={tAxis}
            yMin={-netExtent}
            yMax={netExtent}
            note={`Net force ÷ mass = acceleration (÷ ${m} kg).`}
          />
        </section>
      </main>

      <aside className="ml-panel">
        <header className="ml-head">
          <p className="ml-kicker">Class 9 · Force and Laws of Motion</p>
          <h1>Push the box</h1>
          <p>Push, let go, change the floor. See how friction fights back and how the net force decides the motion.</p>
        </header>

        <section className="ml-section ml-sec-controls">
          <div className="ml-chips" role="radiogroup" aria-label="Floor">
            {SURFACES.map(s => (
              <button key={s.id} role="radio" aria-checked={surfaceId === s.id} className={`ml-chip ${surfaceId === s.id ? 'is-on' : ''}`} onClick={() => setSurfaceId(s.id)}>
                {s.label}<small>μ = {s.muk}</small>
              </button>
            ))}
          </div>
          <div className="ml-slider">
            <div className="ml-slider-head">
              <span>Mass of the box <i>m</i></span>
              <b style={{ color: '#8A5A2B' }}>{m} <small>kg</small></b>
            </div>
            <input
              className="ml-range"
              type="range"
              min={1}
              max={50}
              step={1}
              value={m}
              onChange={e => changeMass(Number(e.target.value))}
              aria-label="Mass in kilograms (starts again)"
              style={{ '--pct': `${((m - 1) / 49) * 100}%`, '--c': '#8A5A2B' }}
            />
          </div>
          <div className="ml-seg lt-seg" role="radiogroup" aria-label="Playback speed">
            {[0.5, 1].map(r => (
              <button key={r} role="radio" aria-checked={rate === r} className={rate === r ? 'is-on' : ''} onClick={() => setRate(r)}>{r}× speed</button>
            ))}
          </div>
          <label className="ml-check">
            <input type="checkbox" checked={showForces} onChange={e => setShowForces(e.target.checked)} />
            Show force arrows
          </label>
        </section>

        <section className="ml-section ml-sec-insight">
          <p className="ml-insight"><Lightbulb size={16} strokeWidth={2.5} /> {insight(sim, forces, F, surface, m)}</p>
        </section>

        <section className="ml-section ml-sec-maths">
          <h2>The maths, right now</h2>
          <div className="ml-work">
            <p><span className="ml-eq">Weight = m × g (the floor pushes back equally)</span>= {m} × {G} = <b>{n1(forces.weight)} N</b></p>
            <p>
              <span className="ml-eq">Friction on {surface.label.toLowerCase()}</span>
              max grip = μs × N = {surface.mus} × {n1(forces.normal)} = {n1(forces.maxStatic)} N{'\n'}
              sliding = μk × N = {surface.muk} × {n1(forces.normal)} = {n1(forces.sliding)} N
            </p>
            {!forces.moving ? (
              <p>
                <span className="ml-eq">Not moving</span>
                push {n1(Math.abs(F))} N ≤ grip {n1(forces.maxStatic)} N → friction = {n1(Math.abs(F))} N back{'\n'}
                F_net = <b style={{ color: FORCE_COLORS.net }}>0 N</b> → a = 0
              </p>
            ) : (
              <>
                <p><span className="ml-eq">F_net = push + friction</span>= {sgn(F)} + {sgn(forces.friction)} = <b style={{ color: FORCE_COLORS.net }}>{n1(forces.net)} N</b></p>
                <p><span className="ml-eq">a = F_net ÷ m</span>= {n1(forces.net)} ÷ {m} = <b style={{ color: FORCE_COLORS.net }}>{n2(forces.a)} m/s²</b></p>
              </>
            )}
            <p className="ml-note">Velocity now {n2(sim.v)} m/s · distance {n1(sim.x)} m</p>
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
