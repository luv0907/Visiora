import React, { useState, useRef, useEffect, useMemo, useLayoutEffect, Suspense } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Text, Float, useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { Play, Pause, RotateCcw, Eye, ShieldAlert, Sparkles, Gauge, Compass, SlidersHorizontal, CheckCircle2 } from 'lucide-react'

// ── 3D DROP SCENE ────────────────────────────────────────────────────────────
// Storybook vacuum-tube stage modelled in Blender (blender/freefall_pilot.blend).
// The model is built for a 10 m drop; tubes, rings and the ruler are re-fitted
// to the chosen height here, and the physics below moves the two balls.
const STAGE_URL = '/models/freefall.glb'
const MODEL_HEIGHT = 10
useGLTF.preload(STAGE_URL)

function useFreeFallStage(height, airResistance) {
  const { scene } = useGLTF(STAGE_URL)
  const stage = useMemo(() => scene.clone(true), [scene])

  // Remember each part's authored transform so re-fitting is repeatable.
  const parts = useMemo(() => {
    const byName = name => stage.getObjectByName(name)
    const base = new Map()
    stage.traverse(o => {
      base.set(o, { y: o.position.y, sy: o.scale.y, rz: o.rotation.z })
      if (o.isMesh) {
        // Parts with several materials load as a group of meshes; use the part's name.
        const part = o.name.startsWith('FF_') ? o.name : o.parent?.name || ''
        o.castShadow = !/Glass|Cloud/.test(part)
        o.receiveShadow = /Platform|Pad/.test(part)
        // No reflections to pick up in this scene, so keep surfaces matte like the storybook renders.
        if (o.material && o.material.metalness > 0.15) {
          o.material = o.material.clone()
          o.material.metalness = 0.1
          o.material.roughness = Math.max(o.material.roughness, 0.45)
        }
        // Blender's glass alpha is tuned for its renderer; make it readable here.
        if (o.material?.name === 'FF_Glass') {
          o.material = o.material.clone()
          o.material.opacity = 0.2
          o.material.depthWrite = false
        }
      }
    })
    const pick = re => { const out = []; stage.traverse(o => { if (re.test(o.name)) out.push(o) }); return out }
    return {
      base,
      glass: pick(/^FF_Glass_[LR]$/),
      lifted: pick(/^FF_(Cap|CapKnob|FlagPole|Flag)_[LR]$/),
      rings: pick(/^FF_Ring_[LR]\d$/),
      ruler: byName('FF_Ruler'),
      clouds: pick(/^FF_Cloud_/),
      needle: byName('FF_GaugeNeedle'),
      ball1: byName('FF_Ball_Light'),
      ball2: byName('FF_Ball_Heavy'),
    }
  }, [stage])

  useLayoutEffect(() => {
    const { base } = parts
    const dy = height - MODEL_HEIGHT
    // Glass spans from just above the pad to just under the cap.
    const glassLen = height + 1.13
    for (const g of parts.glass) {
      g.scale.y = base.get(g).sy * (glassLen / (MODEL_HEIGHT + 0.9))
      g.position.y = 0.02 + glassLen / 2
    }
    for (const o of parts.lifted) o.position.y = base.get(o).y + dy
    for (const r of parts.rings) r.position.y = base.get(r).y * (height / MODEL_HEIGHT)
    // The ruler's pivot is at ground level, so stretching it keeps its foot on the ground.
    if (parts.ruler) parts.ruler.scale.y = base.get(parts.ruler).sy * ((height + 1) / (MODEL_HEIGHT + 1))
    // Clouds rise with the tower so they never float in front of it.
    for (const c of parts.clouds) c.position.y = base.get(c).y + Math.max(0, dy) * 0.9
  }, [parts, height])

  // Pump gauge: needle drops to "vacuum" when air is pumped out.
  useLayoutEffect(() => {
    if (parts.needle) parts.needle.rotation.z = parts.base.get(parts.needle).rz + (airResistance ? -1.6 : 0)
  }, [parts, airResistance])

  return { stage, parts }
}

// Ruler ticks and numbers drawn in code so they stay correct for any height.
function RulerMarks({ height }) {
  const label = height <= 12 ? 2 : height <= 30 ? 5 : 10
  const minor = label >= 5 ? label / 5 : 1
  const font = Math.min(1.3, Math.max(0.42, height * 0.034))
  const marks = []
  for (let m = 0; m <= height + 1e-6; m += minor) marks.push(Math.round(m * 100) / 100)
  return (
    <group position={[0, 0, -1.62]}>
      {marks.map(m => {
        const major = Math.abs(m / label - Math.round(m / label)) < 1e-6
        const w = major ? 0.55 : 0.32
        return (
          <group key={m} position={[0, m, 0]}>
            <mesh position={[-0.45 + w / 2, 0, 0]}>
              <boxGeometry args={[w, 0.07, 0.04]} />
              <meshBasicMaterial color="#3B2A1A" />
            </mesh>
            {major && (
              <Text position={[0.55, 0, 0]} fontSize={font} color="#3B2A1A" anchorX="left" anchorY="middle" outlineWidth={font * 0.06} outlineColor="#FFFDF8">
                {`${m} m`}
              </Text>
            )}
          </group>
        )
      })}
    </group>
  )
}

// Pull the camera back to fit the whole tower whenever the drop height changes.
function FrameTower({ height }) {
  const camera = useThree(s => s.camera)
  const controls = useThree(s => s.controls)
  useEffect(() => {
    camera.position.set(4, height * 0.5 + 5, 16 + height * 1.05)
    if (controls) {
      controls.target.set(0, height * 0.45, 0)
      controls.update()
    }
  }, [camera, controls, height])
  return null
}

function DropChamber({ 
  height, 
  ball1Props, 
  ball2Props, 
  gravity, 
  airResistance, 
  isPlaying, 
  timeScale,
  onTelemetryUpdate,
  simKey
}) {
  const [t, setT] = useState(0)
  const [trail1, setTrail1] = useState([])
  const [trail2, setTrail2] = useState([])
  const [impact1, setImpact1] = useState(null)
  const [impact2, setImpact2] = useState(null)

  // Physical dynamic states
  const physRef = useRef({
    t: 0,
    y1: height,
    y2: height,
    v1: 0,
    v2: 0,
    impactTime1: null,
    impactTime2: null,
    done: false,
    trailTimer: 0
  })

  // Reset physics when simKey or height changes
  useEffect(() => {
    physRef.current = {
      t: 0,
      y1: height,
      y2: height,
      v1: 0,
      v2: 0,
      impactTime1: null,
      impactTime2: null,
      done: false,
      trailTimer: 0
    }
    setT(0)
    setTrail1([])
    setTrail2([])
    setImpact1(null)
    setImpact2(null)
  }, [simKey, height, gravity, airResistance, ball1Props.mass, ball2Props.mass])

  // Ball nodes come from the Blender stage; the physics below moves them.
  const { stage, parts } = useFreeFallStage(height, airResistance)
  const mesh1Ref = useRef(null)
  const mesh2Ref = useRef(null)
  mesh1Ref.current = parts.ball1
  mesh2Ref.current = parts.ball2

  // Put both balls back at the top whenever the run is reset or the height changes.
  useLayoutEffect(() => {
    if (parts.ball1) parts.ball1.position.y = height + ball1Props.radius
    if (parts.ball2) parts.ball2.position.y = height + ball2Props.radius
  }, [parts, height, simKey, ball1Props.radius, ball2Props.radius])

  useFrame((_, delta) => {
    if (!isPlaying) return
    const dt = Math.min(delta, 0.05) * timeScale
    const state = physRef.current
    if (state.done) return

    state.t += dt
    state.trailTimer += dt

    const rho = airResistance ? 1.225 : 0 // Air density kg/m^3
    const Cd = 0.47 // Sphere drag coefficient

    // Ball 1 Physics
    if (state.y1 > 0) {
      const A1 = Math.PI * Math.pow(ball1Props.radius, 2)
      const Fd1 = 0.5 * rho * Math.pow(state.v1, 2) * Cd * A1
      const a1 = gravity - (Fd1 / ball1Props.mass)
      state.v1 += a1 * dt
      state.y1 -= state.v1 * dt
      if (state.y1 <= 0) {
        state.y1 = 0
        state.impactTime1 = state.t
        setImpact1(state.t)
      }
    }

    // Ball 2 Physics
    if (state.y2 > 0) {
      const A2 = Math.PI * Math.pow(ball2Props.radius, 2)
      const Fd2 = 0.5 * rho * Math.pow(state.v2, 2) * Cd * A2
      const a2 = gravity - (Fd2 / ball2Props.mass)
      state.v2 += a2 * dt
      state.y2 -= state.v2 * dt
      if (state.y2 <= 0) {
        state.y2 = 0
        state.impactTime2 = state.t
        setImpact2(state.t)
      }
    }

    // Update 3D meshes
    if (mesh1Ref.current) {
      mesh1Ref.current.position.y = state.y1 + ball1Props.radius
    }
    if (mesh2Ref.current) {
      mesh2Ref.current.position.y = state.y2 + ball2Props.radius
    }

    // Ghost trail positions at regular intervals
    if (state.trailTimer >= 0.15) {
      state.trailTimer = 0
      if (state.y1 > 0) setTrail1(prev => [...prev.slice(-30), state.y1 + ball1Props.radius])
      if (state.y2 > 0) setTrail2(prev => [...prev.slice(-30), state.y2 + ball2Props.radius])
    }

    if (state.y1 === 0 && state.y2 === 0) {
      state.done = true
    }

    setT(state.t)
    onTelemetryUpdate({
      t: state.t,
      y1: state.y1,
      y2: state.y2,
      v1: state.v1,
      v2: state.v2,
      impact1: state.impactTime1,
      impact2: state.impactTime2
    })
  })

  return (
    <group position={[0, 0, 0]}>
      <primitive object={stage} />
      <RulerMarks height={height} />

      {/* Strobe trail: where each ball was every 0.15 s */}
      {trail1.map((py, idx) => (
        <mesh key={`trail1-${idx}`} position={[-3, py, 0]}>
          <sphereGeometry args={[ball1Props.radius * 0.45, 12, 12]} />
          <meshBasicMaterial color="#F08A3C" transparent opacity={0.35} />
        </mesh>
      ))}
      {trail2.map((py, idx) => (
        <mesh key={`trail2-${idx}`} position={[3, py, 0]}>
          <sphereGeometry args={[ball2Props.radius * 0.45, 12, 12]} />
          <meshBasicMaterial color="#3A4148" transparent opacity={0.3} />
        </mesh>
      ))}

      {/* Landing splash rings */}
      {impact1 && (
        <mesh position={[-3, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.0, 1.9, 40]} />
          <meshBasicMaterial color="#E3B53A" transparent opacity={0.7} />
        </mesh>
      )}
      {impact2 && (
        <mesh position={[3, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.0, 1.9, 40]} />
          <meshBasicMaterial color="#E3B53A" transparent opacity={0.7} />
        </mesh>
      )}
    </group>
  )
}

// ── MAIN EXPORT COMPONENT ────────────────────────────────────────────────────
export default function GravitySim() {
  const [height, setHeight] = useState(30)
  const [gravityPreset, setGravityPreset] = useState('earth')
  const [gravityVal, setGravityVal] = useState(9.81)
  const [mass1, setMass1] = useState(1.0)
  const [mass2, setMass2] = useState(50.0)
  const [airResistance, setAirResistance] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [timeScale, setTimeScale] = useState(1.0)
  const [simKey, setSimKey] = useState(1)
  const [activeTab, setActiveTab] = useState('controls') // controls | formula | telemetry
  const [isPanelOpen, setIsPanelOpen] = useState(true)

  const [telemetry, setTelemetry] = useState({
    t: 0,
    y1: 30,
    y2: 30,
    v1: 0,
    v2: 0,
    impact1: null,
    impact2: null
  })

  const presets = [
    { id: 'earth', name: 'Earth', g: 9.81, color: '#3B82F6' },
    { id: 'moon', name: 'Moon', g: 1.62, color: '#94A3B8' },
    { id: 'mars', name: 'Mars', g: 3.72, color: '#EF4444' },
    { id: 'jupiter', name: 'Jupiter', g: 24.79, color: '#F59E0B' },
  ]

  const handleSelectPreset = (p) => {
    setGravityPreset(p.id)
    setGravityVal(p.g)
    handleReset()
  }

  const handleReset = () => {
    setIsPlaying(false)
    setSimKey(k => k + 1)
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
      {/* 3D Canvas Viewport */}
      <div className="canvas-container-3d">
        <Canvas
          shadows
          camera={{ position: [0, 16, 36], fov: 48 }}
        >
          {/* Storybook sky + warm sun, matching the Blender renders */}
          <color attach="background" args={['#A8D8DE']} />
          <hemisphereLight args={['#FFF6EA', '#B98A5E', 1.15]} />
          <directionalLight
            position={[14, 30, 18]}
            intensity={2.1}
            color="#FFF1DC"
            castShadow
            shadow-mapSize-width={2048}
            shadow-mapSize-height={2048}
            shadow-camera-left={-14}
            shadow-camera-right={14}
            shadow-camera-top={56}
            shadow-camera-bottom={-4}
            shadow-camera-near={1}
            shadow-camera-far={120}
            shadow-bias={-0.0004}
          />
          <directionalLight position={[-16, 14, 10]} intensity={0.45} color="#DCEBFF" />

          <Suspense fallback={null}>
          <DropChamber
            height={height}
            ball1Props={{ mass: mass1, radius: 0.6 }}
            ball2Props={{ mass: mass2, radius: 0.9 }}
            gravity={gravityVal}
            airResistance={airResistance}
            isPlaying={isPlaying}
            timeScale={timeScale}
            onTelemetryUpdate={setTelemetry}
            simKey={simKey}
          />
          </Suspense>

          <FrameTower height={height} />
          <OrbitControls 
            makeDefault
            target={[0, height / 2, 0]} 
            maxPolarAngle={Math.PI / 2 + 0.05} 
            minDistance={8} 
            maxDistance={80} 
            enableDamping
          />
        </Canvas>
      </div>

      {/* Top Floating Telemetry Bar — Positioned below the breadcrumb */}
      <div style={{
        position: 'absolute',
        top: 66,
        left: 20,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        zIndex: 20,
        pointerEvents: 'none'
      }}>
        <div className="glass-cream" style={{
          padding: '8px 16px',
          borderRadius: 'var(--radius-full)',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          pointerEvents: 'auto'
        }}>
          <div>
            <span style={{ fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Time Elapsed</span>
            <div className="mono" style={{ fontSize: 16, fontWeight: 700, color: 'var(--obsidian-900)' }}>
              {telemetry.t.toFixed(2)}s
            </div>
          </div>
          <div style={{ width: 1, height: 26, background: 'var(--color-border)' }} />
          <div>
            <span style={{ fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Gravity</span>
            <div className="mono" style={{ fontSize: 16, fontWeight: 700, color: 'var(--gold-600)' }}>
              {gravityVal.toFixed(2)} m/s²
            </div>
          </div>
          <div style={{ width: 1, height: 26, background: 'var(--color-border)' }} />
          <div>
            <span style={{ fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Medium</span>
            <div style={{ fontSize: 13, fontWeight: 700, color: airResistance ? '#C23B30' : '#1B7F53' }}>
              {airResistance ? 'Air Drag' : 'Pure Vacuum'}
            </div>
          </div>
        </div>
      </div>

      {/* Floating Bottom Playback Controls */}
      <div style={{
        position: 'absolute',
        bottom: 24,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 15,
        display: 'flex',
        alignItems: 'center',
        gap: 10
      }}>
        <div className="glass-dark" style={{
          padding: '6px 14px',
          borderRadius: 'var(--radius-full)',
          display: 'flex',
          alignItems: 'center',
          gap: 10
        }}>
          <button
            onClick={handleReset}
            title="Reset Simulation"
            style={{
              width: 38,
              height: 38,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.08)',
              color: '#F7F3EB'
            }}
          >
            <RotateCcw size={17} />
          </button>

          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={!isPlaying ? "btn-navy-primary" : ""}
            style={{
              padding: '8px 22px',
              borderRadius: 0,
              background: isPlaying ? 'rgba(255,255,255,0.15)' : '#002B66',
              color: isPlaying ? '#F7F3EB' : '#FFFFFF',
              fontWeight: 700,
              fontSize: 14,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              boxShadow: isPlaying ? 'none' : '0 4px 14px rgba(0, 43, 102, 0.4)'
            }}
          >
            {isPlaying ? <Pause size={17} /> : <Play size={17} fill="currentColor" />}
            {isPlaying ? 'Pause' : 'Release Drop'}
          </button>

          <div style={{ width: 1, height: 22, background: 'rgba(255,255,255,0.12)', margin: '0 4px' }} />

          {/* Speed selector */}
          <div style={{ display: 'flex', gap: 4 }}>
            {[1.0, 0.5, 0.25].map(scale => (
              <button
                key={scale}
                onClick={() => setTimeScale(scale)}
                style={{
                  padding: '4px 8px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: 11,
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 600,
                  background: timeScale === scale ? 'rgba(203, 163, 88, 0.25)' : 'transparent',
                  color: timeScale === scale ? 'var(--gold-400)' : '#8F8578'
                }}
              >
                {scale}x
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Minimized Trigger Button (When Inspector is Closed) */}
      {!isPanelOpen && (
        <button
          onClick={() => setIsPanelOpen(true)}
          className="glass-cream"
          title="Open Parameters & Variables"
          style={{
            position: 'absolute',
            top: 20,
            right: 20,
            zIndex: 30,
            padding: '10px 16px',
            borderRadius: 'var(--radius-full)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontWeight: 700,
            fontSize: 13,
            color: 'var(--obsidian-900)',
            cursor: 'pointer',
            boxShadow: 'var(--shadow-md)',
            border: '1px solid var(--color-border)',
            transition: 'all var(--transition-fast)'
          }}
        >
          <SlidersHorizontal size={15} color="var(--gold-600)" strokeWidth={2.2} />
          <span>Controls &amp; Variables</span>
          <span style={{ fontSize: 12, color: 'var(--gold-600)', fontWeight: 800 }}>◀</span>
        </button>
      )}

      {/* Floating Right Parameter / Inspector Panel (Collapsible to right) */}
      <div style={{
        position: 'absolute',
        top: 20,
        right: 20,
        bottom: 24,
        width: 340,
        zIndex: 25,
        display: 'flex',
        flexDirection: 'column',
        pointerEvents: isPanelOpen ? 'auto' : 'none',
        transform: isPanelOpen ? 'translateX(0)' : 'translateX(calc(100% + 40px))',
        opacity: isPanelOpen ? 1 : 0,
        transition: 'transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.25s ease'
      }}>
        <div className="glass-cream" style={{
          flex: 1,
          borderRadius: 'var(--radius-xl)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: 'var(--shadow-lg)'
        }}>
          {/* Tabs with Minimize Button */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            borderBottom: '1px solid var(--color-border)',
            padding: '4px',
            background: 'rgba(247, 243, 235, 0.6)'
          }}>
            <div style={{ display: 'flex', flex: 1, gap: 4 }}>
              {[
                { id: 'controls', label: 'Variables' },
                { id: 'formula', label: 'Principle' },
                { id: 'telemetry', label: 'Telemetry' },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    flex: 1,
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-md)',
                    fontSize: 13,
                    fontWeight: 600,
                    color: activeTab === tab.id ? 'var(--obsidian-900)' : 'var(--color-text-muted)',
                    background: activeTab === tab.id ? '#FFFFFF' : 'transparent',
                    boxShadow: activeTab === tab.id ? 'var(--shadow-xs)' : 'none'
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Minimize / Collapse Button */}
            <button
              onClick={() => setIsPanelOpen(false)}
              title="Minimize panel to right"
              style={{
                width: 34,
                height: 34,
                borderRadius: 'var(--radius-md)',
                background: 'rgba(0,0,0,0.04)',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--color-text-muted)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginLeft: 4,
                fontSize: 13,
                fontWeight: 700
              }}
            >
              ▶
            </button>
          </div>

          {/* Tab Content */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px 18px', display: 'flex', flexDirection: 'column', gap: 20 }}>
            {activeTab === 'controls' && (
              <>
                {/* Planet Gravity Presets */}
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Celestial Gravity
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginTop: 8 }}>
                    {presets.map(p => (
                      <button
                        key={p.id}
                        onClick={() => handleSelectPreset(p)}
                        style={{
                          padding: '8px 10px',
                          borderRadius: 'var(--radius-md)',
                          border: `1.5px solid ${gravityPreset === p.id ? 'var(--gold-500)' : 'var(--color-border)'}`,
                          background: gravityPreset === p.id ? 'var(--color-accent-light)' : '#FFFFFF',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          fontSize: 13,
                          fontWeight: 600,
                          color: 'var(--color-text)'
                        }}
                      >
                        <span style={{ 
                          width: 8, 
                          height: 8, 
                          borderRadius: '50%', 
                          background: p.color, 
                          boxShadow: `0 0 6px ${p.color}90`,
                          display: 'inline-block'
                        }} />
                        <span>{p.name}</span>
                        <span className="mono" style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--color-text-muted)' }}>
                          {p.g}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Drop Height Slider */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}>Drop Height</span>
                    <span className="mono" style={{ fontSize: 13, fontWeight: 700, color: 'var(--gold-600)' }}>
                      {height} m
                    </span>
                  </div>
                  <input
                    type="range"
                    min={5}
                    max={50}
                    step={1}
                    value={height}
                    onChange={e => {
                      setHeight(Number(e.target.value))
                      handleReset()
                    }}
                  />
                </div>

                {/* Ball 1 Mass (Gilded) */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}>
                      🟠 Ball 1 Mass (Light)
                    </span>
                    <span className="mono" style={{ fontSize: 13, fontWeight: 700, color: 'var(--gold-600)' }}>
                      {mass1} kg
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0.1}
                    max={10}
                    step={0.1}
                    value={mass1}
                    onChange={e => {
                      setMass1(Number(e.target.value))
                      handleReset()
                    }}
                  />
                </div>

                {/* Ball 2 Mass (Obsidian) */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}>
                      ⚫ Ball 2 Mass (Heavy)
                    </span>
                    <span className="mono" style={{ fontSize: 13, fontWeight: 700, color: 'var(--obsidian-800)' }}>
                      {mass2} kg
                    </span>
                  </div>
                  <input
                    type="range"
                    min={5}
                    max={200}
                    step={5}
                    value={mass2}
                    onChange={e => {
                      setMass2(Number(e.target.value))
                      handleReset()
                    }}
                  />
                </div>

                {/* Air Resistance Toggle */}
                <div style={{
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--cream-100)',
                  border: '1px solid var(--color-border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>Air Resistance</div>
                    <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                      {airResistance ? 'Aerodynamic drag enabled' : 'Pure Galileo vacuum'}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setAirResistance(!airResistance)
                      handleReset()
                    }}
                    style={{
                      width: 44,
                      height: 24,
                      borderRadius: 12,
                      background: airResistance ? 'var(--gold-500)' : 'var(--cream-400)',
                      position: 'relative',
                      transition: 'background 0.2s ease'
                    }}
                  >
                    <div style={{
                      width: 18,
                      height: 18,
                      borderRadius: '50%',
                      background: '#FFFFFF',
                      position: 'absolute',
                      top: 3,
                      left: airResistance ? 23 : 3,
                      transition: 'left 0.2s ease'
                    }} />
                  </button>
                </div>
              </>
            )}

            {activeTab === 'formula' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{
                  padding: '14px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--cream-100)',
                  border: '1px solid var(--color-border)'
                }}>
                  <span className="badge-gold">Galileo's Law of Free Fall</span>
                  <p style={{ margin: '10px 0 0 0', fontSize: 13, lineHeight: 1.6, color: 'var(--color-text)' }}>
                    In a vacuum, the gravitational acceleration <em>g</em> is identical for all masses because inertial mass equals gravitational mass:
                  </p>
                  <div className="mono" style={{
                    margin: '12px 0',
                    padding: '10px',
                    background: '#FFFFFF',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: 13,
                    fontWeight: 700,
                    textAlign: 'center',
                    color: 'var(--obsidian-900)'
                  }}>
                    F = m · a &nbsp; &amp; &nbsp; F_g = m · g <br />
                    ⟹ a = g (Mass cancels out!)
                  </div>
                </div>

                <div style={{
                  padding: '14px',
                  borderRadius: 'var(--radius-md)',
                  background: '#FFFFFF',
                  border: '1px solid var(--color-border)'
                }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
                    Equations of Motion
                  </span>
                  <div className="mono" style={{ fontSize: 12, marginTop: 8, color: 'var(--color-text)', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div>y(t) = h₀ - ½ g t²</div>
                    <div>v(t) = - g t</div>
                    <div>t_impact = √(2 h₀ / g)</div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'telemetry' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{
                  padding: '14px',
                  borderRadius: 'var(--radius-md)',
                  background: '#FFFFFF',
                  border: '1px solid var(--color-border)'
                }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--gold-600)', marginBottom: 8 }}>
                    🟠 Ball 1 ({mass1} kg)
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <div>
                      <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Height</span>
                      <div className="mono" style={{ fontSize: 15, fontWeight: 700 }}>{telemetry.y1.toFixed(2)} m</div>
                    </div>
                    <div>
                      <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Velocity</span>
                      <div className="mono" style={{ fontSize: 15, fontWeight: 700 }}>{telemetry.v1.toFixed(2)} m/s</div>
                    </div>
                  </div>
                  {telemetry.impact1 && (
                    <div style={{ marginTop: 8, fontSize: 12, color: 'var(--color-success)', fontWeight: 600 }}>
                      ✓ Landed at {telemetry.impact1.toFixed(3)}s
                    </div>
                  )}
                </div>

                <div style={{
                  padding: '14px',
                  borderRadius: 'var(--radius-md)',
                  background: '#FFFFFF',
                  border: '1px solid var(--color-border)'
                }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--obsidian-800)', marginBottom: 8 }}>
                    ⚫ Ball 2 ({mass2} kg)
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <div>
                      <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Height</span>
                      <div className="mono" style={{ fontSize: 15, fontWeight: 700 }}>{telemetry.y2.toFixed(2)} m</div>
                    </div>
                    <div>
                      <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Velocity</span>
                      <div className="mono" style={{ fontSize: 15, fontWeight: 700 }}>{telemetry.v2.toFixed(2)} m/s</div>
                    </div>
                  </div>
                  {telemetry.impact2 && (
                    <div style={{ marginTop: 8, fontSize: 12, color: 'var(--color-success)', fontWeight: 600 }}>
                      ✓ Landed at {telemetry.impact2.toFixed(3)}s
                    </div>
                  )}
                </div>

                {telemetry.impact1 && telemetry.impact2 && (
                  <div style={{
                    padding: '12px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--color-success-bg)',
                    border: '1px solid var(--color-success)',
                    fontSize: 12,
                    color: 'var(--color-success)',
                    fontWeight: 600
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <CheckCircle2 size={15} />
                      <span>Galileo Principle Verified! Time difference Δt: {Math.abs(telemetry.impact1 - telemetry.impact2).toFixed(4)}s</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
