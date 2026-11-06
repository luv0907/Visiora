/**
 * VISIORA — school preview of the Free Fall Tower.
 *
 * Same Blender hall and same engine as the walk-in lab, but with no walking: it opens
 * in front of the tower, the camera moves between fixed views, and every control works
 * the same with a mouse, a finger or a smartboard. No sign-in, no keyboard.
 */
import React, { Suspense, useCallback, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Environment, Html, useProgress } from '@react-three/drei'
import * as THREE from 'three'
import { EXPOSURE, HDRI_URL, LabModel, Lights, TowerAnimator } from './PhysicsLab'
import { createTower, letAirIn, release, replay, reset, startPump, DROP_HEIGHT } from './freeFallTower'
import { vacuumFallTime } from '../engine/dropTower'
import './physicsLab.css'

const G = 9.81
const SLOW = 0.25
const TOWER_X = 18.9
const TUBE_CENTRE_Y = 5.1
const PUMP = [18.33, 0.75, 1.3]

export const VIEWS = {
  // From one side: a clock and roof beam hang on the tower's centre line and would hide the top of the tubes.
  full: { label: 'Whole tower', pos: [11.5, 4.9, 3.6], look: [TOWER_X, 4.6, 0] },
  top: { label: 'Top', pos: [17.2, 7.9, 1.2], look: [TOWER_X, 9.1, 0] },
  landing: { label: 'Landing', pos: [15.6, 1.7, 0], look: [TOWER_X, 1, 0] },
  pump: { label: 'Pump', pos: [15.8, 1.6, 2.6], look: PUMP },
}

const target = new THREE.Vector3()

function CameraRig({ view }) {
  const { camera } = useThree()
  const look = useRef(null)
  useFrame((_, delta) => {
    const v = VIEWS[view]
    if (!look.current) {
      camera.position.set(...v.pos)
      look.current = new THREE.Vector3(...v.look)
    }
    const k = 1 - Math.exp(-Math.min(delta, 0.1) * 4)
    camera.position.lerp(target.set(...v.pos), k)
    look.current.lerp(target.set(...v.look), k)
    camera.lookAt(look.current)
  })
  return null
}

// An invisible area over a real object, so tapping the object itself works.
function TapArea({ position, size, label, onTap, enabled }) {
  const setCursor = c => { document.body.style.cursor = c }
  return (
    <mesh
      position={position}
      name={`tap-${label}`}
      onClick={e => { e.stopPropagation(); if (enabled) onTap() }}
      onPointerOver={() => { if (enabled) setCursor('pointer') }}
      onPointerOut={() => setCursor('')}
    >
      <boxGeometry args={size} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>
  )
}

function Marker({ position, children, onClick }) {
  return (
    <Html position={position} center zIndexRange={[4, 0]}>
      <button className="pv-marker" onClick={onClick}>{children}</button>
    </Html>
  )
}

// The ball and feather are small from far away, so a name tag travels with each one.
function FollowTag({ part, side, children }) {
  const group = useRef(null)
  useFrame(() => { if (part && group.current) group.current.position.copy(part.position) })
  if (!part) return null
  return (
    <group ref={group}>
      <Html position={[0, 0, side * 0.75]} center zIndexRange={[3, 0]} style={{ pointerEvents: 'none' }}>
        <span className="pv-tag">{children}</span>
      </Html>
    </group>
  )
}

// Stays up until the room is really ready: the lightmaps load after the model, so the
// progress bar alone can reach 100% or stop while the stage is still blank.
function Opening() {
  const { progress } = useProgress()
  return (
    <div className="pl-loading">
      <div className="pl-loading-card">
        <p className="pl-script">opening the lab…</p>
        <div className="pl-bar"><span style={{ width: `${Math.round(progress)}%` }} /></div>
      </div>
    </div>
  )
}

const secs = v => (v == null ? '—' : `${v.toFixed(2)} s`)

function resultLine(s) {
  if (s.air === 'pumping') return 'Pumping the air out…'
  if (s.air === 'venting') return 'Letting the air back in…'
  if (s.phase === 'ready') return s.air === 'vacuum' ? 'All the air is out. Which one will land first now?' : 'Which one will land first?'
  const ball = s.ball?.firstImpact?.t
  const feather = s.feather?.firstImpact?.t
  if (ball == null || feather == null) {
    return ball == null ? 'Falling…' : 'The ball has landed. The feather is still drifting down…'
  }
  if (Math.abs(ball - feather) < 0.01) return `They landed together, at ${secs(ball)}. Without air, weight makes no difference.`
  return `The ball landed ${(feather - ball).toFixed(1)} s before the feather. Air slows the light feather far more.`
}

export default function TowerPreview() {
  const tower = useRef(createTower())
  const timeScale = useRef(1)
  const [ui, setUi] = useState(() => ({ ...createTower() }))
  const [parts, setParts] = useState(null)
  const [view, setView] = useState('full')
  const [slow, setSlow] = useState(false)
  const lastUi = useRef(0)

  const onTick = useCallback(t => {
    const now = performance.now()
    if (now - lastUi.current > 100) { lastUi.current = now; setUi({ ...t }) }
  }, [])
  const act = fn => { fn(tower.current); setUi({ ...tower.current }) }
  const setSpeed = isSlow => { timeScale.current = isSlow ? SLOW : 1; setSlow(isSlow) }

  const busy = ui.air === 'pumping' || ui.air === 'venting'
  const falling = ui.phase === 'falling'
  const canRelease = !busy && !falling
  const canChangeAir = !busy && !falling
  const hasAirOut = ui.air === 'vacuum' || ui.air === 'venting'

  const drop = () => { setView('full'); act(release) }
  const changeAir = () => act(hasAirOut ? letAirIn : startPump)
  const airLabel = hasAirOut ? 'Let air back in' : 'Pump the air out'
  const slowReplay = () => { setSpeed(true); setView('full'); act(replay) }
  const startOver = () => act(reset)

  const showAnswer = ui.phase === 'done' && ui.air === 'vacuum'

  return (
    <div className="pl-root pv-root">
      <div className="pv-stage">
        <Canvas
          dpr={[1, 1.5]}
          camera={{ fov: 70, near: 0.05, far: 200, position: VIEWS.full.pos }}
          gl={{ antialias: true, toneMapping: THREE.AgXToneMapping, toneMappingExposure: EXPOSURE }}
        >
          <Suspense fallback={null}>
            <Environment files={HDRI_URL} background backgroundIntensity={0.45} environmentIntensity={0.55} backgroundRotation={[0, Math.PI * 0.9, 0]} environmentRotation={[0, Math.PI * 0.9, 0]} />
            <Lights />
            <LabModel onParts={setParts} />
            {/* A slow school laptop must not slow the experiment down; the engine times landings exactly at any step. */}
            <TowerAnimator parts={parts} tower={tower} onTick={onTick} timeScale={timeScale} maxFrameStep={1} />
            <TapArea position={[TOWER_X, TUBE_CENTRE_Y, 0]} size={[1.2, 9, 2]} label="tower" onTap={drop} enabled={canRelease} />
            <TapArea position={PUMP} size={[1.2, 1.2, 1.2]} label="pump" onTap={changeAir} enabled={canChangeAir} />
            <FollowTag part={parts?.ball} side={1}>Steel ball</FollowTag>
            <FollowTag part={parts?.feather} side={-1}>Feather</FollowTag>
            {canRelease && view !== 'pump' &&<Marker position={[TOWER_X, 8.6, -2.1]} onClick={drop}>Release both</Marker>}
            {canChangeAir && view !== 'top' && <Marker position={[PUMP[0], 2.2, PUMP[2] + 1.2]} onClick={changeAir}>{airLabel}</Marker>}
          </Suspense>
          <CameraRig view={view} />
        </Canvas>
        {!parts && <Opening />}
        <div className="pv-views" role="group" aria-label="Choose a view">
          {Object.entries(VIEWS).map(([key, v]) => (
            <button key={key} className={`pv-chip ${view === key ? 'is-on' : ''}`} aria-pressed={view === key} onClick={() => setView(key)}>{v.label}</button>
          ))}
        </div>
      </div>

      <section className="pv-panel" aria-label="Free Fall Tower controls">
        <h1 className="pv-title">Free Fall Tower</h1>
        <p className="pv-lede">A 24 kg steel ball and a 3 g feather drop from {DROP_HEIGHT.toFixed(2)} m.</p>
        <p className="pv-result" aria-live="polite">{resultLine(ui)}</p>

        <div className="pl-row">
          <span className="pl-label">Inside the tubes</span>
          <span className={`pl-pill ${ui.air}`}>{{ air: 'Air', pumping: 'Pumping…', vacuum: 'Vacuum', venting: 'Air coming in…' }[ui.air]}</span>
        </div>
        <div className="pl-gauge"><span style={{ width: `${Math.round(ui.pressure * 100)}%` }} /></div>

        <div className="pl-actions">
          <button className="pl-btn is-go" disabled={!canRelease} onClick={drop}>Release both</button>
          <button className="pl-btn" disabled={!canChangeAir} onClick={changeAir}>{airLabel}</button>
          {ui.phase === 'done' && <button className="pl-btn" onClick={slowReplay}>Replay slowly</button>}
          <button className="pl-btn is-ghost" disabled={ui.phase === 'ready'} onClick={startOver}>{falling ? 'Stop' : 'Start again'}</button>
        </div>

        <div className="pl-row pv-speed">
          <span className="pl-label">Speed</span>
          <div className="pv-seg" role="group" aria-label="Playback speed">
            <button className={`pv-chip ${!slow ? 'is-on' : ''}`} aria-pressed={!slow} onClick={() => setSpeed(false)}>Normal</button>
            <button className={`pv-chip ${slow ? 'is-on' : ''}`} aria-pressed={slow} onClick={() => setSpeed(true)}>Slow (¼)</button>
          </div>
        </div>

        <table className="pl-table">
          <tbody>
            <tr><td>Time</td><td>{secs(ui.phase === 'ready' ? 0 : ui.t)}</td></tr>
            <tr><td>Steel ball landed</td><td>{secs(ui.ball?.firstImpact?.t)}</td></tr>
            <tr><td>Feather landed</td><td>{secs(ui.feather?.firstImpact?.t)}</td></tr>
            {showAnswer && <tr><td>Formula √(2h/g)</td><td>{secs(vacuumFallTime(DROP_HEIGHT, G))}</td></tr>}
          </tbody>
        </table>
      </section>
    </div>
  )
}
