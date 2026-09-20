import React, { useState, useRef, useEffect, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Text, Float } from '@react-three/drei'
import * as THREE from 'three'
import { Play, Pause, RotateCcw, Eye, ShieldAlert, Sparkles, Gauge, Compass, SlidersHorizontal, CheckCircle2 } from 'lucide-react'

// ── 3D DROP SCENE ────────────────────────────────────────────────────────────
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

  // Sphere meshes refs
  const mesh1Ref = useRef()
  const mesh2Ref = useRef()
  const trapdoorLeftRef = useRef()
  const trapdoorRightRef = useRef()

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

    // Animate trapdoors opening
    if (trapdoorLeftRef.current && trapdoorRightRef.current) {
      const openAngle = Math.min(Math.PI * 0.45, state.t * 8)
      trapdoorLeftRef.current.rotation.z = -openAngle
      trapdoorRightRef.current.rotation.z = openAngle
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
      {/* Studio Grid Floor */}
      <gridHelper args={[60, 60, '#CBA358', '#E2D6C3']} position={[0, 0, 0]} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial color="#F4EFE6" roughness={0.7} metalness={0.1} />
      </mesh>

      {/* Target Landing Pads */}
      <group position={[-3, 0.02, 0]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.3, 1.8, 32]} />
          <meshBasicMaterial color="#B38B40" opacity={0.35} transparent />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.25, 32]} />
          <meshBasicMaterial color="#B38B40" />
        </mesh>
      </group>

      <group position={[3, 0.02, 0]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.3, 1.8, 32]} />
          <meshBasicMaterial color="#1C1713" opacity={0.3} transparent />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.25, 32]} />
          <meshBasicMaterial color="#1C1713" />
        </mesh>
      </group>

      {/* Galileo Drop Gantry / Measurement Tower */}
      <group position={[0, 0, -2]}>
        {/* Main Pillar */}
        <mesh position={[0, height / 2, 0]} castShadow>
          <cylinderGeometry args={[0.2, 0.25, height, 16]} />
          <meshStandardMaterial color="#2E2721" metalness={0.6} roughness={0.3} />
        </mesh>

        {/* Height Rungs & Ticks */}
        {Array.from({ length: Math.floor(height / 5) + 1 }).map((_, i) => {
          const y = i * 5
          return (
            <group key={y} position={[0, y, 0]}>
              <mesh position={[0, 0, 0.25]}>
                <boxGeometry args={[1.2, 0.08, 0.08]} />
                <meshStandardMaterial color="#CBA358" metalness={0.8} roughness={0.2} />
              </mesh>
              <Text
                position={[1.2, 0, 0.25]}
                fontSize={0.8}
                color="#6D6254"
                anchorX="left"
                anchorY="middle"
              >
                {`${y}m`}
              </Text>
            </group>
          )
        })}

        {/* Top Drop Platform */}
        <mesh position={[0, height, 1]} castShadow>
          <boxGeometry args={[8, 0.3, 2.5]} />
          <meshStandardMaterial color="#1C1713" metalness={0.5} roughness={0.4} />
        </mesh>

        {/* Trapdoors */}
        <mesh ref={trapdoorLeftRef} position={[-3, height - 0.15, 2]}>
          <boxGeometry args={[1.6, 0.08, 1.2]} />
          <meshStandardMaterial color="#CBA358" metalness={0.8} roughness={0.3} />
        </mesh>
        <mesh ref={trapdoorRightRef} position={[3, height - 0.15, 2]}>
          <boxGeometry args={[1.6, 0.08, 1.2]} />
          <meshStandardMaterial color="#926F2D" metalness={0.8} roughness={0.3} />
        </mesh>
      </group>

      {/* Ball 1 (Gilded Gold Sphere) */}
      <mesh ref={mesh1Ref} position={[-3, height + ball1Props.radius, 0]} castShadow>
        <sphereGeometry args={[ball1Props.radius, 32, 32]} />
        <meshStandardMaterial 
          color="#D4AF37" 
          metalness={0.85} 
          roughness={0.15} 
          envMapIntensity={1.2}
        />
      </mesh>

      {/* Ball 1 Ghost Trail */}
      {trail1.map((py, idx) => (
        <mesh key={`trail1-${idx}`} position={[-3, py, 0]}>
          <sphereGeometry args={[ball1Props.radius * 0.45, 12, 12]} />
          <meshBasicMaterial color="#E2C17D" transparent opacity={0.3} />
        </mesh>
      ))}

      {/* Ball 2 (Obsidian / Heavy Sphere) */}
      <mesh ref={mesh2Ref} position={[3, height + ball2Props.radius, 0]} castShadow>
        <sphereGeometry args={[ball2Props.radius, 32, 32]} />
        <meshStandardMaterial 
          color="#1F1B17" 
          metalness={0.4} 
          roughness={0.3} 
        />
      </mesh>

      {/* Ball 2 Ghost Trail */}
      {trail2.map((py, idx) => (
        <mesh key={`trail2-${idx}`} position={[3, py, 0]}>
          <sphereGeometry args={[ball2Props.radius * 0.45, 12, 12]} />
          <meshBasicMaterial color="#483E36" transparent opacity={0.35} />
        </mesh>
      ))}

      {/* Ground Impact Rings if landed */}
      {impact1 && (
        <mesh position={[-3, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.1, 2.2, 32]} />
          <meshBasicMaterial color="#CBA358" transparent opacity={0.6} />
        </mesh>
      )}
      {impact2 && (
        <mesh position={[3, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.1, 2.2, 32]} />
          <meshBasicMaterial color="#CBA358" transparent opacity={0.6} />
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
          <color attach="background" args={['#F7F3EB']} />
          <ambientLight intensity={0.8} />
          <directionalLight
            position={[15, 40, 20]}
            intensity={1.5}
            castShadow
            shadow-mapSize-width={2048}
            shadow-mapSize-height={2048}
          />
          <directionalLight position={[-15, 20, -10]} intensity={0.4} color="#CBA358" />

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

          <OrbitControls 
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
                      🟡 Ball 1 Mass (Light)
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
                    🟡 Ball 1 ({mass1} kg)
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
