/**
 * VISIORA — walk-in Physics Lab (first playable).
 *
 * The hall is modelled in Blender (blender/physics_lab_hall.blend) and exported to
 * public/models/physics_lab.glb. Students walk around in first person and use the
 * stations; the Free Fall Tower is the first working one (see freeFallTower.js).
 */
import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Environment, PointerLockControls, useGLTF, useProgress } from '@react-three/drei'
import * as THREE from 'three'
import { moveWithCollisions, toFloorRects } from './collision'
import { createTower, startPump, letAirIn, release, reset, stepTower, OBJECTS, DROP_HEIGHT } from './freeFallTower'
import { vacuumFallTime } from '../engine/dropTower'
import './physicsLab.css'

const MODEL_URL = '/models/physics_lab.glb'
const COLLIDERS_URL = '/models/physics_lab_colliders.json'
const HDRI_URL = '/hdri/sunny_rose_garden_1k.hdr'
const LIGHTMAP_DIR = '/models/lightmaps/'
// Blender renders the lab with AgX at +1.1 stops; match it so the baked light reads the same.
const EXPOSURE = 2 ** 1.1
const TOWER = { x: 18.9, z: 0 } // browser floor coordinates of the tower plinth
const PLINTH_TOP = 0.6
const USE_DISTANCE = 3.4
const WALK = 3.0
const RUN = 5.2
useGLTF.preload(MODEL_URL)

const isTouch = () => typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches

// ── keyboard state ───────────────────────────────────────────────────────────
function useKeys() {
  const keys = useRef({})
  useEffect(() => {
    const down = e => { keys.current[e.code] = true }
    const up = e => { keys.current[e.code] = false }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up) }
  }, [])
  return keys
}

// ── the hall ─────────────────────────────────────────────────────────────────
// The scenery's light (sun, sky, lamps, bounce light) is baked in Blender into one lightmap
// per area (blender/scripts/build_web_lab.py). Here each surface shows texture × baked light,
// so the browser matches the Cycles renders without lighting the room in real time.
function useLightmaps() {
  const [maps, setMaps] = useState(null)
  useEffect(() => {
    let alive = true
    fetch(LIGHTMAP_DIR + 'manifest.json').then(r => r.json()).then(man => {
      const loader = new THREE.TextureLoader()
      const out = { scale: man.scale, textures: {} }
      Promise.all(Object.entries(man.maps).map(([name, file]) => loader.loadAsync(LIGHTMAP_DIR + file).then(tex => {
        tex.flipY = false            // glTF UV convention
        tex.channel = 1              // TEXCOORD_1 = the lightmap UVs
        tex.colorSpace = THREE.SRGBColorSpace
        tex.anisotropy = 4
        out.textures[name] = tex
      }))).then(() => { if (alive) setMaps(out) })
    })
    return () => { alive = false }
  }, [])
  return maps
}

const ownerName = o => {
  for (let p = o; p; p = p.parent) if (p.name?.startsWith('Static_')) return p.name
  return null
}

function bakedMaterial(m, lightMap, scale) {
  const glow = m.emissive && (m.emissive.r + m.emissive.g + m.emissive.b) > 0.05 && (m.emissiveIntensity ?? 1) > 0
  if (glow) {
    // lamps, LEDs, the timer screen: stay bright, no baked shading
    const c = m.emissive.clone().multiplyScalar(Math.min(4, m.emissiveIntensity ?? 1))
    return new THREE.MeshBasicMaterial({ color: c, toneMapped: true })
  }
  if (m.metalness > 0.5) {
    // Metals have no diffuse colour, so a diffuse light bake is black for them.
    // Brass, steel and aluminium are shown by reflecting the sky instead.
    const r = m.clone()
    r.envMapIntensity = 1.4
    r.roughness = Math.max(0.25, m.roughness)
    r.vertexColors = false
    return r
  }
  if (m.transmission > 0 || (m.transparent && m.opacity < 0.6)) {
    return new THREE.MeshBasicMaterial({ color: m.color, transparent: true, opacity: 0.18, depthWrite: false })
  }
  return new THREE.MeshBasicMaterial({
    map: m.map, color: m.color, lightMap, lightMapIntensity: scale,
    transparent: m.transparent, opacity: m.opacity, alphaTest: m.alphaTest || (m.map && m.transparent ? 0.4 : 0),
    side: m.side, vertexColors: false,
  })
}

function LabModel({ onParts }) {
  const { scene } = useGLTF(MODEL_URL)
  const maps = useLightmaps()
  useEffect(() => {
    if (!maps) return
    scene.traverse(o => {
      if (!o.isMesh) return
      o.castShadow = false
      o.receiveShadow = false
      const owner = ownerName(o)
      const lm = owner && maps.textures[owner]
      if (lm) {
        // replace once; keep the original so a remount doesn't re-wrap
        o.userData.original = o.userData.original || o.material
        const orig = o.userData.original
        o.material = Array.isArray(orig) ? orig.map(m => bakedMaterial(m, lm, maps.scale)) : bakedMaterial(orig, lm, maps.scale)
      } else {
        // moving parts keep real-time materials; glass stays light and cheap
        const mats = Array.isArray(o.material) ? o.material : [o.material]
        for (const m of mats) {
          if (m.transmission > 0) {
            m.transmission = 0; m.transparent = true; m.opacity = 0.2; m.roughness = 0.05; m.depthWrite = false
          }
        }
      }
    })
    const get = n => scene.getObjectByName(n)
    const parts = { ball: get('FF_SteelBall'), feather: get('FF_Feather'), needle: get('FF_GaugeNeedle') }
    for (const p of Object.values(parts)) if (p && !p.userData.base) p.userData.base = { pos: p.position.clone(), rot: p.rotation.clone() }
    onParts(parts)
  }, [scene, maps, onParts])
  return <primitive object={scene} />
}

function Lights() {
  // Only the moving parts (ball, feather, gauge needle) are lit live; the room's light is baked.
  return (
    <>
      <directionalLight position={[-20, 25, 35]} intensity={1.6} color="#FFE2B8" />
      <hemisphereLight args={['#FFF3E2', '#8A6A4A', 0.6]} />
    </>
  )
}

// ── first-person player ──────────────────────────────────────────────────────
function Player({ rects, spawn, active, touch, onMove }) {
  const { camera } = useThree()
  const keys = useKeys()
  const bob = useRef(0)
  useEffect(() => {
    if (import.meta.env.DEV) window.__physicsLab = { camera } // test hook (dev builds only)
    camera.rotation.order = 'YXZ'
    camera.position.set(spawn.x, spawn.eye, -spawn.y)
    camera.rotation.set(0, THREE.MathUtils.degToRad(-90 + (spawn.yaw ?? 0)), 0)
  }, [camera, spawn])

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05)
    const k = keys.current
    let f = 0, s = 0
    if (active) {
      if (k.KeyW || k.ArrowUp) f += 1
      if (k.KeyS || k.ArrowDown) f -= 1
      if (k.KeyD || k.ArrowRight) s += 1
      if (k.KeyA || k.ArrowLeft) s -= 1
    }
    if (touch.current) { f += touch.current.f; s += touch.current.s }
    const len = Math.hypot(f, s)
    if (len > 0) {
      const speed = (k.ShiftLeft || k.ShiftRight ? RUN : WALK) * Math.min(1, len)
      const yaw = camera.rotation.y
      const fx = -Math.sin(yaw), fz = -Math.cos(yaw) // forward on the floor
      const rx = Math.cos(yaw), rz = -Math.sin(yaw)  // right
      const mx = ((fx * f + rx * s) / Math.max(1, len)) * speed * dt
      const mz = ((fz * f + rz * s) / Math.max(1, len)) * speed * dt
      const p = moveWithCollisions(camera.position.x, camera.position.z, mx, mz, spawn.radius, rects)
      bob.current += Math.hypot(p.x - camera.position.x, p.z - camera.position.z) * 7
      camera.position.x = p.x
      camera.position.z = p.z
    }
    camera.position.y = spawn.eye + Math.sin(bob.current) * 0.025 // gentle step bob
    onMove(camera.position)
  })
  return null
}

// touch look: drag on the right side of the screen turns the head
function TouchLook({ look }) {
  const { camera } = useThree()
  useFrame(() => {
    const l = look.current
    if (!l.dx && !l.dy) return
    camera.rotation.y -= l.dx * 0.005
    camera.rotation.x = THREE.MathUtils.clamp(camera.rotation.x - l.dy * 0.005, -1.3, 1.3)
    l.dx = 0; l.dy = 0
  })
  return null
}

// ── Free Fall Tower: moves the Blender objects from the engine state ─────────
function TowerAnimator({ parts, tower, onTick }) {
  const flutter = useRef(0)
  useFrame((_, delta) => {
    const t = tower.current
    stepTower(t, Math.min(delta, 0.05))
    const { ball, feather, needle } = parts || {}
    if (ball?.userData.base) {
      const y = t.ball ? PLINTH_TOP + t.ball.y + OBJECTS.ball.radius : PLINTH_TOP + DROP_HEIGHT + OBJECTS.ball.radius
      ball.position.y = y
    }
    if (feather?.userData.base) {
      const base = feather.userData.base
      const fy = t.feather ? t.feather.y : DROP_HEIGHT
      feather.position.y = PLINTH_TOP + fy + 0.012
      // In air a falling feather rocks and drifts; in vacuum it drops straight like the ball.
      const airborne = t.feather && !t.feather.firstImpact && t.air === 'air'
      flutter.current += airborne ? delta : 0
      const a = airborne ? 1 : 0
      feather.position.x = base.pos.x + Math.sin(flutter.current * 2.6) * 0.07 * a
      feather.position.z = base.pos.z + Math.sin(flutter.current * 1.9 + 1) * 0.05 * a
      feather.rotation.z = base.rot.z + Math.sin(flutter.current * 2.6) * 0.35 * a
      feather.rotation.x = base.rot.x + Math.cos(flutter.current * 1.7) * 0.2 * a
    }
    if (needle?.userData.base) needle.rotation.x = needle.userData.base.rot.x + (1 - t.pressure) * 1.9
    onTick(t)
  })
  return null
}

function Loader() {
  const { progress, active } = useProgress()
  if (!active && progress >= 100) return null
  return (
    <div className="pl-loading">
      <div className="pl-loading-card">
        <p className="pl-script">opening the lab…</p>
        <div className="pl-bar"><span style={{ width: `${Math.round(progress)}%` }} /></div>
        <p className="pl-small">{Math.round(progress)}%</p>
      </div>
    </div>
  )
}

const fmt = v => (v == null ? '—' : `${v.toFixed(2)} s`)

function TowerPanel({ state, onPump, onVent, onRelease, onReset, onClose }) {
  const exact = vacuumFallTime(DROP_HEIGHT, 9.81)
  const busy = state.air === 'pumping' || state.air === 'venting'
  const airLabel = { air: 'Air (normal pressure)', pumping: 'Pumping air out…', vacuum: 'Vacuum', venting: 'Letting air in…' }[state.air]
  return (
    <div className="pl-panel" role="dialog" aria-label="Free Fall Tower">
      <div className="pl-panel-head">
        <span className="pl-script">station 7</span>
        <h2>Free Fall Tower</h2>
        <button className="pl-x" onClick={onClose} aria-label="Close">×</button>
      </div>
      <p className="pl-lede">A 24 kg steel ball and a 3 g feather, both dropped from {DROP_HEIGHT.toFixed(2)} m. Which lands first?</p>
      <div className="pl-row">
        <span className="pl-label">Inside the tubes</span>
        <span className={`pl-pill ${state.air}`}>{airLabel}</span>
      </div>
      <div className="pl-gauge"><span style={{ width: `${Math.round(state.pressure * 100)}%` }} /></div>
      <div className="pl-actions">
        {state.air === 'air' || state.air === 'pumping'
          ? <button className="pl-btn" disabled={busy || state.phase === 'falling'} onClick={onPump}>Pump the air out</button>
          : <button className="pl-btn" disabled={busy || state.phase === 'falling'} onClick={onVent}>Let air back in</button>}
        <button className="pl-btn is-go" disabled={busy || state.phase === 'falling'} onClick={onRelease}>Release both</button>
        <button className="pl-btn is-ghost" disabled={state.phase === 'falling'} onClick={onReset}>Reset</button>
      </div>
      <table className="pl-table">
        <tbody>
          <tr><td>Time</td><td>{fmt(state.phase === 'ready' ? 0 : state.t)}</td></tr>
          <tr><td>Steel ball landed</td><td>{fmt(state.ball?.firstImpact?.t)}{state.ball?.bounces ? ` · ${state.ball.bounces} bounces` : ''}</td></tr>
          <tr><td>Feather landed</td><td>{fmt(state.feather?.firstImpact?.t)}</td></tr>
          <tr><td>Vacuum prediction √(2h/g)</td><td>{fmt(exact)}</td></tr>
        </tbody>
      </table>
      <p className="pl-small">Press E or Esc to close · the engine steps every 1 ms and times each landing exactly.</p>
    </div>
  )
}

// ── page ─────────────────────────────────────────────────────────────────────
export default function PhysicsLab({ onExit }) {
  const [colliders, setColliders] = useState(null)
  const [locked, setLocked] = useState(false)
  const [near, setNear] = useState(false)
  const [panel, setPanel] = useState(false)
  const [parts, setParts] = useState(null)
  const [ui, setUi] = useState(() => ({ ...createTower() }))
  const tower = useRef(createTower())
  const controls = useRef(null)
  const touchMove = useRef(null)
  const look = useRef({ dx: 0, dy: 0 })
  const touch = useMemo(isTouch, [])
  const nearRef = useRef(false)
  // Some school browsers and embedded frames block mouse capture; then look by dragging instead.
  const [dragLook, setDragLook] = useState(touch)
  const [entered, setEntered] = useState(false)
  useEffect(() => {
    const fail = () => { setDragLook(true); setEntered(true) }
    document.addEventListener('pointerlockerror', fail)
    return () => document.removeEventListener('pointerlockerror', fail)
  }, [])
  const dragging = useRef(null)
  useEffect(() => {
    if (!dragLook || touch) return
    const down = e => { if (e.button === 0 && e.target.tagName === 'CANVAS') dragging.current = { x: e.clientX, y: e.clientY } }
    const move = e => {
      const d = dragging.current; if (!d) return
      look.current.dx += e.clientX - d.x; look.current.dy += e.clientY - d.y
      dragging.current = { x: e.clientX, y: e.clientY }
    }
    const up = () => { dragging.current = null }
    window.addEventListener('mousedown', down); window.addEventListener('mousemove', move); window.addEventListener('mouseup', up)
    return () => { window.removeEventListener('mousedown', down); window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up) }
  }, [dragLook, touch])

  useEffect(() => {
    let alive = true
    fetch(COLLIDERS_URL).then(r => r.json()).then(j => { if (alive) setColliders(j) })
    return () => { alive = false }
  }, [])
  const rects = useMemo(() => (colliders ? toFloorRects(colliders.rects) : []), [colliders])
  const spawn = useMemo(() => colliders && {
    x: colliders.spawn.x, y: colliders.spawn.y, yaw: colliders.spawn.yaw_deg, eye: colliders.eye_height, radius: colliders.player_radius,
  }, [colliders])

  const openPanel = () => { setPanel(true); controls.current?.unlock?.() }
  const closePanel = () => setPanel(false)

  useEffect(() => {
    const onKey = e => {
      if (e.code === 'KeyE') {
        if (panel) closePanel()
        else if (nearRef.current) openPanel()
      }
      if (e.code === 'Escape' && panel) closePanel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [panel])

  const onMove = pos => {
    const isNear = Math.hypot(pos.x - TOWER.x, pos.z - TOWER.z) < USE_DISTANCE
    if (isNear !== nearRef.current) { nearRef.current = isNear; setNear(isNear) }
  }
  const lastUi = useRef(0)
  const onTick = t => {
    const now = performance.now()
    if (now - lastUi.current > 100) { lastUi.current = now; setUi({ ...t }) }
  }
  const act = fn => () => { fn(tower.current); setUi({ ...tower.current }) }

  // touch joystick (left) and look pad (right)
  const stick = useRef(null)
  const onStick = e => {
    const r = stick.current.getBoundingClientRect()
    const t = e.touches[0]
    const dx = (t.clientX - (r.left + r.width / 2)) / (r.width / 2)
    const dy = (t.clientY - (r.top + r.height / 2)) / (r.height / 2)
    touchMove.current = { s: THREE.MathUtils.clamp(dx, -1, 1), f: THREE.MathUtils.clamp(-dy, -1, 1) }
  }
  const lookStart = useRef(null)

  return (
    <div className="pl-root">
      {spawn && (
        <Canvas
          dpr={[1, 1.5]}
          camera={{ fov: 70, near: 0.05, far: 200 }}
          gl={{ antialias: true, toneMapping: THREE.AgXToneMapping, toneMappingExposure: EXPOSURE }}
        >
          <Suspense fallback={null}>
            <Environment files={HDRI_URL} background backgroundIntensity={0.45} environmentIntensity={0.55} backgroundRotation={[0, Math.PI * 0.9, 0]} environmentRotation={[0, Math.PI * 0.9, 0]} />
            <Lights />
            <LabModel onParts={setParts} />
            <TowerAnimator parts={parts} tower={tower} onTick={onTick} />
          </Suspense>
          <Player rects={rects} spawn={spawn} active={(locked || (dragLook && entered)) && !panel} touch={touchMove} onMove={onMove} />
          {dragLook ? <TouchLook look={look} /> : (
            <PointerLockControls ref={controls} selector="#pl-enter" onLock={() => { setLocked(true); setEntered(true) }} onUnlock={() => setLocked(false)} />
          )}
        </Canvas>
      )}
      <Loader />

      <div className="pl-hud-top">
        <button className="pl-back" onClick={onExit}>← Leave the lab</button>
        <span className="pl-title">Visiora Physics Lab</span>
      </div>
      {!dragLook && <div className="pl-crosshair" aria-hidden="true" />}

      {((!dragLook && !locked) || (dragLook && !entered)) && !panel && (
        <div className="pl-enter-wrap">
          <button id="pl-enter" className="pl-enter" onClick={() => {
            if (dragLook) { setEntered(true); return }
            // If the browser quietly refuses mouse capture, fall back to drag-to-look.
            setTimeout(() => { if (!document.pointerLockElement) { setDragLook(true); setEntered(true) } }, 700)
          }}>
            <span className="pl-script">welcome in</span>
            <strong>{touch ? 'Tap to walk around' : 'Click to walk around'}</strong>
            <span className="pl-small">{touch
              ? 'Left thumb to walk · drag on the right to look · tap Use near a station'
              : dragLook
                ? 'W A S D to walk · Shift to run · drag with the mouse to look · E to use a station'
                : 'W A S D to walk · Shift to run · mouse to look · E to use a station · Esc to free the mouse'}</span>
          </button>
        </div>
      )}
      {dragLook && !touch && entered && !panel && <div className="pl-hint">Drag with the mouse to look around</div>}

      {near && !panel && (
        <div className="pl-prompt">
          {touch ? <button className="pl-btn is-go" onClick={openPanel}>Use the Free Fall Tower</button>
            : <span><kbd>E</kbd> Use the Free Fall Tower</span>}
        </div>
      )}

      {panel && (
        <TowerPanel state={ui} onClose={closePanel}
          onPump={act(startPump)} onVent={act(letAirIn)} onRelease={act(release)} onReset={act(reset)} />
      )}

      {touch && (
        <>
          <div className="pl-stick" ref={stick}
            onTouchStart={onStick} onTouchMove={onStick} onTouchEnd={() => { touchMove.current = null }}>
            <span />
          </div>
          <div className="pl-lookpad"
            onTouchStart={e => { lookStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY } }}
            onTouchMove={e => {
              const t = e.touches[0], s = lookStart.current
              if (!s) return
              look.current.dx += t.clientX - s.x; look.current.dy += t.clientY - s.y
              lookStart.current = { x: t.clientX, y: t.clientY }
            }}
            onTouchEnd={() => { lookStart.current = null }} />
        </>
      )}
    </div>
  )
}
