/**
 * VISIORA Studio — Pendulum Lab, the first experiment in the new layout.
 * Intro: just length and the swing. Explore: mass, gravity, tools and energy.
 * Challenge: hit a target swing time on three worlds.
 * Physics: engine/pendulum.js. The canvas only draws; it never decides a number.
 */
import React, { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { PLANETS, energy, stepPendulum, swingTime } from '../engine/pendulum'
import { INK, ACCENT, SOFT, DATA } from './drawings'
import { rememberExperiment } from './catalog'
import { ExperimentShell, Group, Icon, Options, ResetAll, Slider, Stopwatch, TimeControls, Toggle, Toolbox } from './Shell'

const DEG = Math.PI / 180
const START_ANGLE = 20 * DEG
const MAX_ANGLE = 70 * DEG
const TABS = [['intro', 'Intro'], ['explore', 'Explore'], ['challenge', 'Challenge']]
const TOLERANCE = 0.01 // within 1% counts as on target

export const MISSIONS = [
  { id: 'earth-2', planet: 'earth', target: 2, text: 'On Earth, make one swing take 2.00 s' },
  { id: 'moon-4', planet: 'moon', target: 4, text: 'On the Moon, make one swing take 4.00 s' },
  { id: 'jupiter-1', planet: 'jupiter', target: 1, text: 'On Jupiter, make one swing take 1.00 s' },
]
const DONE_KEY = 'visiora.pendulum.missions'
const loadDone = () => { try { return JSON.parse(localStorage.getItem(DONE_KEY)) || [] } catch { return [] } }
const saveDone = ids => { try { localStorage.setItem(DONE_KEY, JSON.stringify(ids)) } catch { /* nothing to save to */ } }

const fresh = () => ({ L: 1, m: 1, planet: 'earth', theta: START_ANGLE, omega: 0, release: START_ANGLE })

export default function PendulumExperiment() {
  const [tab, setTab] = useState('intro')
  const [s, setS] = useState(fresh)            // settings the controls show
  const sim = useRef({ theta: START_ANGLE, omega: 0 }) // the moving state, updated every frame
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [show, setShow] = useState({ time: true, velocity: false, energy: false })
  const [tools, setTools] = useState({ watch: false, ruler: false, path: false })
  const [watch, setWatch] = useState({ t: 0, running: false })
  const [mission, setMission] = useState(MISSIONS[0].id)
  const [done, setDone] = useState(loadDone)
  const [moved, setMoved] = useState(false)
  const [, redraw] = useReducer(x => x + 1, 0)

  useEffect(() => { rememberExperiment('pendulum') }, [])

  const g = PLANETS.find(p => p.id === s.planet).g
  const period = swingTime(s.L, g, s.release)
  const current = MISSIONS.find(m => m.id === mission)
  const missionOff = tab === 'challenge' ? (period - current.target) / current.target : null
  const onTarget = missionOff != null && Math.abs(missionOff) <= TOLERANCE

  useEffect(() => {
    if (onTarget && !done.includes(current.id)) { const next = [...done, current.id]; setDone(next); saveDone(next) }
  }, [onTarget, current.id, done])

  // In the challenge, each mission sets its world.
  useEffect(() => {
    if (tab === 'challenge') setS(prev => ({ ...prev, planet: current.planet }))
  }, [tab, current.planet])

  const stop = () => { setPlaying(false); sim.current = { theta: s.release, omega: 0 }; setLive({ angle: s.release }) }
  const set = patch => { setS(prev => ({ ...prev, ...patch })); stop(); redraw() }
  const resetAll = () => {
    setS(fresh()); sim.current = { theta: START_ANGLE, omega: 0 }; setPlaying(false); setSpeed(1)
    setTools({ watch: false, ruler: false, path: false }); setWatch({ t: 0, running: false }); setMoved(false); trail.current = []
  }

  // ── drawing ────────────────────────────────────────────
  const canvas = useRef(null)
  const geo = useRef({ W: 0, H: 0, px: 200, pivot: { x: 0, y: 0 } })
  const trail = useRef([])
  const bobRadius = 10 + Math.sqrt(s.m) * 9
  const bobAt = th => {
    const { px, pivot } = geo.current
    return { x: pivot.x + Math.sin(th) * s.L * px, y: pivot.y + Math.cos(th) * s.L * px }
  }

  const draw = useCallback(() => {
    const cv = canvas.current
    if (!cv) return
    const ctx = cv.getContext('2d'), { W, H, px, pivot } = geo.current
    const { theta, omega } = sim.current
    ctx.clearRect(0, 0, W, H)
    // ceiling mount
    ctx.fillStyle = INK; ctx.fillRect(pivot.x - 80, pivot.y - 8, 160, 8)
    ctx.strokeStyle = SOFT; ctx.lineWidth = 1.5
    for (let x = pivot.x - 76; x < pivot.x + 80; x += 12) { ctx.beginPath(); ctx.moveTo(x, pivot.y - 8); ctx.lineTo(x + 8, pivot.y - 16); ctx.stroke() }
    // rest line and swing arc
    ctx.setLineDash([5, 7]); ctx.strokeStyle = SOFT
    ctx.beginPath(); ctx.moveTo(pivot.x, pivot.y); ctx.lineTo(pivot.x, pivot.y + s.L * px + 30); ctx.stroke()
    ctx.beginPath(); ctx.arc(pivot.x, pivot.y, s.L * px, Math.PI / 2 - Math.abs(s.release) - 0.1, Math.PI / 2 + Math.abs(s.release) + 0.1); ctx.stroke(); ctx.setLineDash([])
    // angle
    if (Math.abs(theta) > 0.02) {
      ctx.strokeStyle = DATA; ctx.lineWidth = 1.5; ctx.beginPath()
      ctx.arc(pivot.x, pivot.y, 46, Math.PI / 2, Math.PI / 2 - theta, theta > 0); ctx.stroke()
    }
    // ruler, beside the swing
    if (tools.ruler) {
      ctx.save(); ctx.translate(pivot.x - Math.sin(MAX_ANGLE) * s.L * px - 70, pivot.y)
      const len = 2 * px
      ctx.fillStyle = '#fff'; ctx.strokeStyle = INK; ctx.lineWidth = 1; ctx.fillRect(0, 0, 40, len); ctx.strokeRect(0.5, 0.5, 40, len)
      ctx.fillStyle = INK; ctx.font = '500 10px "IBM Plex Mono", monospace'
      for (let i = 0; i <= 20; i++) { const y = (i * px) / 10; ctx.fillRect(0, y, i % 5 ? 7 : 14, 1); if (i % 5 === 0) ctx.fillText((i / 10).toFixed(1), 17, y + 3.5) }
      ctx.fillText('m', 17, len + 14)
      ctx.restore()
    }
    const b = bobAt(theta)
    if (tools.path && trail.current.length > 1) {
      ctx.strokeStyle = 'rgba(228,83,42,.5)'; ctx.lineWidth = 2; ctx.beginPath()
      trail.current.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.stroke()
    }
    ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(pivot.x, pivot.y); ctx.lineTo(b.x, b.y); ctx.stroke()
    if (show.velocity) {
      const len = omega * s.L * 40
      if (Math.abs(len) > 3) {
        const ex = b.x + Math.cos(theta) * len, ey = b.y - Math.sin(theta) * len, a = Math.atan2(ey - b.y, ex - b.x)
        ctx.strokeStyle = DATA; ctx.fillStyle = DATA; ctx.lineWidth = 3
        ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(ex, ey); ctx.stroke()
        ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(ex - 12 * Math.cos(a - 0.45), ey - 12 * Math.sin(a - 0.45)); ctx.lineTo(ex - 12 * Math.cos(a + 0.45), ey - 12 * Math.sin(a + 0.45)); ctx.fill()
      }
    }
    ctx.fillStyle = ACCENT; ctx.beginPath(); ctx.arc(b.x, b.y, bobRadius, 0, Math.PI * 2); ctx.fill()
    ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.stroke()
    ctx.fillStyle = INK; ctx.font = '500 12px "IBM Plex Mono", monospace'; ctx.textAlign = 'left'
    ctx.fillText(`${s.m.toFixed(1)} kg`, b.x + bobRadius + 8, b.y + 4)
    if (show.energy && tab !== 'intro') {
      const e = energy(sim.current, s.L, g, s.m), total = e.kinetic + e.potential || 1
      const top = energy({ theta: s.release, omega: 0 }, s.L, g, s.m).potential || total
      const bx = W - 200, by = H - 96
      ctx.fillStyle = '#fff'; ctx.strokeStyle = '#E2E0D8'; ctx.lineWidth = 1
      ctx.fillRect(bx - 12, by - 150, 192, 168); ctx.strokeRect(bx - 11.5, by - 149.5, 191, 167)
      ctx.fillStyle = '#82868F'; ctx.font = '600 10.5px "Instrument Sans", sans-serif'; ctx.fillText('ENERGY', bx, by - 132)
      ;[['Kinetic', e.kinetic, DATA], ['Potential', e.potential, ACCENT], ['Total', total, INK]].forEach(([name, v, col], i) => {
        const h = (96 * v) / (top * 1.02)
        ctx.fillStyle = col; ctx.fillRect(bx + 6 + i * 56, by - h, 36, h)
        ctx.fillStyle = '#4A4E57'; ctx.font = '500 11px "Instrument Sans", sans-serif'; ctx.textAlign = 'center'
        ctx.fillText(name, bx + 24 + i * 56, by + 14); ctx.textAlign = 'left'
      })
    }
  }, [s, g, tools, show, tab, bobRadius]) // eslint-disable-line react-hooks/exhaustive-deps

  // size the canvas to the stage
  useEffect(() => {
    const cv = canvas.current
    const fit = () => {
      const r = cv.getBoundingClientRect(), d = window.devicePixelRatio || 1
      cv.width = r.width * d; cv.height = r.height * d
      cv.getContext('2d').setTransform(d, 0, 0, d, 0, 0)
      geo.current = { W: r.width, H: r.height, px: Math.min(r.height * 0.3, 220), pivot: { x: r.width * 0.5, y: r.height * 0.17 } }
      draw()
    }
    const ro = new ResizeObserver(fit)
    ro.observe(cv)
    return () => ro.disconnect()
  }, [draw])

  useEffect(() => { draw() }, [draw])

  // the clock: runs only while something moves
  const readout = useRef({ last: 0 })
  const [live, setLive] = useState({ angle: START_ANGLE })
  useEffect(() => {
    if (!playing && !watch.running) return undefined
    let raf, last = performance.now()
    const tick = now => {
      const dt = Math.min(0.1, (now - last) / 1000) * speed
      last = now
      if (playing) {
        stepPendulum(sim.current, dt, s.L, g)
        if (tools.path) { trail.current.push(bobAt(sim.current.theta)); if (trail.current.length > 240) trail.current.shift() }
        draw()
      }
      if (watch.running) setWatch(w => ({ ...w, t: w.t + dt }))
      if (now - readout.current.last > 100) { readout.current.last = now; setLive({ angle: sim.current.theta }) }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [playing, watch.running, speed, s.L, g, tools.path, draw]) // eslint-disable-line react-hooks/exhaustive-deps

  // drag the bob to choose where it is let go from
  const dragging = useRef(false)
  const pointer = e => { const r = canvas.current.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top } }
  const nearBob = p => { const b = bobAt(sim.current.theta); return Math.hypot(p.x - b.x, p.y - b.y) < bobRadius + 14 }
  const onDown = e => {
    if (!nearBob(pointer(e))) return
    dragging.current = true; setPlaying(false); canvas.current.setPointerCapture(e.pointerId)
  }
  const onMove = e => {
    const p = pointer(e)
    canvas.current.style.cursor = dragging.current ? 'grabbing' : nearBob(p) ? 'grab' : 'default'
    if (!dragging.current) return
    const { pivot } = geo.current
    const th = Math.max(-MAX_ANGLE, Math.min(MAX_ANGLE, Math.atan2(p.x - pivot.x, p.y - pivot.y)))
    sim.current = { theta: th, omega: 0 }; trail.current = []
    setS(prev => ({ ...prev, release: th })); setLive({ angle: th }); setMoved(true); draw()
  }
  const onUp = () => { dragging.current = false }

  // space bar plays and pauses
  useEffect(() => {
    const key = e => {
      if (e.code !== 'Space' || ['INPUT', 'BUTTON'].includes(e.target.tagName)) return
      e.preventDefault(); setPlaying(p => !p); setMoved(true)
    }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [])

  const togglePlay = () => { if (!playing) sim.current.omega = sim.current.omega || 0; setPlaying(p => !p); setMoved(true) }
  const stepOnce = () => { setPlaying(false); stepPendulum(sim.current, 1 / 30, s.L, g); setLive({ angle: sim.current.theta }); draw() }

  const planets = useMemo(() => PLANETS.map(p => ({ id: p.id, label: p.label, sub: `${p.g} m/s²` })), [])
  const lockedPlanet = tab === 'challenge'

  const panel = (
    <>
      {tab === 'intro' && (
        <div className="st-intro">
          <p>Drag the orange bob to one side and press <strong>play</strong>. Then change the length and see what happens to the swing time.</p>
        </div>
      )}
      {tab === 'challenge' && (
        <Group label="Missions">
          <div className="st-missions">
            {MISSIONS.map(m => (
              <button key={m.id} className={`st-mission-item ${mission === m.id ? 'is-on' : ''} ${done.includes(m.id) ? 'is-done' : ''}`} onClick={() => { setMission(m.id); stop() }}>
                <span className="st-tick">{done.includes(m.id) && <Icon name="check" style={{ width: 12, height: 12 }} />}</span>{m.text}
              </button>
            ))}
          </div>
        </Group>
      )}
      <Group label="Pendulum">
        <Slider label="Length" value={s.L} display={`${s.L.toFixed(2)} m`} min={0.3} max={2} step={0.01} scale={['0.30', '2.00']} onChange={L => { set({ L }); trail.current = [] }} />
        {tab !== 'intro' && <Slider label="Mass" value={s.m} display={`${s.m.toFixed(1)} kg`} min={0.2} max={3} step={0.1} scale={['0.2', '3.0']} onChange={m => set({ m })} />}
        <Slider label="Release angle" value={Math.round(Math.abs(s.release) / DEG)} display={`${Math.round(Math.abs(s.release) / DEG)}°`} min={2} max={70} step={1} scale={['2°', '70°']}
          onChange={deg => { const th = Math.sign(s.release || 1) * deg * DEG; set({ release: th }); sim.current = { theta: th, omega: 0 }; setLive({ angle: th }) }} />
      </Group>
      {tab !== 'intro' && (
        <Group label="Gravity">
          <Options label="Gravity" options={planets} value={s.planet} disabled={lockedPlanet} onChange={planet => set({ planet })} />
        </Group>
      )}
      <Group label="Show">
        <Toggle label="Swing time" checked={show.time} onChange={time => setShow(v => ({ ...v, time }))} />
        {tab !== 'intro' && <Toggle label="Velocity arrow" checked={show.velocity} onChange={velocity => { setShow(v => ({ ...v, velocity })); }} />}
        {tab !== 'intro' && <Toggle label="Energy" checked={show.energy} onChange={en => setShow(v => ({ ...v, energy: en }))} />}
      </Group>
      <p className="st-note">Swing time is worked out exactly for the release angle, not with the small-angle formula, so big swings take a little longer.</p>
    </>
  )

  return (
    <ExperimentShell code="Class 9 · Motion" title="Pendulum Lab" tabs={TABS} tab={tab} onTab={t => { setTab(t); stop(); redraw() }} panel={panel}>
      <canvas ref={canvas} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} aria-label="Pendulum. Drag the bob to choose the release angle." />

      {tab === 'challenge' && (
        <div className="st-float st-mission">
          <Icon name="target" style={{ color: 'var(--accent)', width: 22, height: 22 }} />
          <div><div className="st-label">Mission</div><div className="st-goal">{current.text}</div></div>
          <div className="st-score">
            <div className="st-label">Your swing</div>
            <div className={`st-num ${onTarget ? 'is-ok' : ''}`}>
              {onTarget ? 'On target' : `${missionOff > 0 ? '+' : '−'}${Math.abs(missionOff * 100).toFixed(1)}%`}
            </div>
          </div>
        </div>
      )}

      <div className="st-float st-readouts">
        {show.time && <div><span className="st-label">Swing time</span><b>{period.toFixed(2)} s</b></div>}
        <div><span className="st-label">Angle</span><b>{Math.round(Math.abs(live.angle) / DEG)}°</b></div>
      </div>

      {!moved && <div className="st-hint">Drag the bob, then press play</div>}
      {tools.watch && <Stopwatch time={watch.t} running={watch.running} onStartStop={() => setWatch(w => ({ ...w, running: !w.running }))} onReset={() => setWatch({ t: 0, running: false })} />}

      {tab !== 'intro' && (
        <Toolbox tools={[['watch', 'Stopwatch', 'watch'], ['ruler', 'Ruler', 'ruler'], ['path', 'Path', 'path']]} on={tools}
          onToggle={id => { setTools(t => ({ ...t, [id]: !t[id] })); trail.current = [] }} />
      )}
      <TimeControls playing={playing} onPlay={togglePlay} onStep={stepOnce} speed={speed} onSpeed={setSpeed} />
      <ResetAll onClick={resetAll} />
    </ExperimentShell>
  )
}
