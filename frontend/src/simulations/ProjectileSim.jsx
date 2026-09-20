import React, { useState, useRef, useEffect, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Text, Line } from '@react-three/drei'
import * as THREE from 'three'
import { Play, RotateCcw, Target, Sparkles, Navigation, Gauge, SlidersHorizontal, CheckCircle2 } from 'lucide-react'

// ── 3D CANNON & PROJECTILE SCENE ─────────────────────────────────────────────
function CannonField({
  angleDeg,
  velocity,
  cliffHeight,
  gravity,
  targetDistance,
  isPlaying,
  timeScale,
  onTelemetryUpdate,
  simKey
}) {
  const [flightTrail, setFlightTrail] = useState([])
  const [impactPos, setImpactPos] = useState(null)
  const [hasHitTarget, setHasHitTarget] = useState(false)

  const rad = (angleDeg * Math.PI) / 180
  const v0x = velocity * Math.cos(rad)
  const v0y = velocity * Math.sin(rad)

  // Theoretical calculations
  const theoreticalMaxH = cliffHeight + Math.pow(v0y, 2) / (2 * gravity)
  const timeToGround = (v0y + Math.sqrt(Math.pow(v0y, 2) + 2 * gravity * cliffHeight)) / gravity
  const theoreticalRange = v0x * timeToGround

  // Dynamic state
  const physRef = useRef({
    t: 0,
    x: 0,
    y: cliffHeight,
    vx: v0x,
    vy: v0y,
    inFlight: false,
    landed: false,
    trail: []
  })

  // Precomputed parabolic curve for guide
  const guidePoints = useMemo(() => {
    const pts = []
    const step = timeToGround / 50
    for (let ct = 0; ct <= timeToGround; ct += step) {
      const px = v0x * ct
      const py = cliffHeight + v0y * ct - 0.5 * gravity * Math.pow(ct, 2)
      pts.push(new THREE.Vector3(px, Math.max(0, py), 0))
    }
    return pts
  }, [v0x, v0y, cliffHeight, gravity, timeToGround])

  // Reset when key changes
  useEffect(() => {
    physRef.current = {
      t: 0,
      x: 0,
      y: cliffHeight,
      vx: v0x,
      vy: v0y,
      inFlight: isPlaying,
      landed: false,
      trail: []
    }
    setFlightTrail([])
    setImpactPos(null)
    setHasHitTarget(false)
  }, [simKey, cliffHeight, angleDeg, velocity, gravity])

  useEffect(() => {
    if (isPlaying) {
      physRef.current.inFlight = true
    }
  }, [isPlaying])

  const projectileMeshRef = useRef()
  const barrelGroupRef = useRef()

  useFrame((_, delta) => {
    if (!isPlaying) return
    const state = physRef.current
    if (state.landed) return

    const dt = Math.min(delta, 0.05) * timeScale
    state.t += dt

    // Kinematic propagation
    state.x = v0x * state.t
    state.vy = v0y - gravity * state.t
    state.y = cliffHeight + v0y * state.t - 0.5 * gravity * Math.pow(state.t, 2)

    if (state.y <= 0) {
      state.y = 0
      state.landed = true
      state.inFlight = false
      setImpactPos(state.x)

      // Target hit threshold (within 2m radius)
      if (Math.abs(state.x - targetDistance) < 2.0) {
        setHasHitTarget(true)
      }
    }

    if (projectileMeshRef.current) {
      projectileMeshRef.current.position.set(state.x, state.y, 0)
    }

    // Add trail point
    if (state.t % 0.04 < 0.02 && !state.landed) {
      setFlightTrail(prev => [...prev.slice(-80), new THREE.Vector3(state.x, state.y, 0)])
    }

    onTelemetryUpdate({
      t: state.t,
      x: state.x,
      y: state.y,
      vx: v0x,
      vy: state.vy,
      vTotal: Math.sqrt(Math.pow(v0x, 2) + Math.pow(state.vy, 2)),
      theoreticalRange,
      theoreticalMaxH,
      landed: state.landed
    })
  })

  return (
    <group>
      {/* Studio Floor */}
      <gridHelper args={[200, 100, '#CBA358', '#E2D6C3']} position={[50, 0, 0]} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[50, -0.02, 0]} receiveShadow>
        <planeGeometry args={[220, 80]} />
        <meshStandardMaterial color="#F4EFE6" roughness={0.8} />
      </mesh>

      {/* Distance Markers along ground */}
      {Array.from({ length: 15 }).map((_, i) => {
        const d = (i + 1) * 10
        return (
          <group key={d} position={[d, 0.01, 0]}>
            <mesh rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[0.2, 4]} />
              <meshBasicMaterial color="#C5B79F" />
            </mesh>
            <Text
              position={[0, 0.1, 2.8]}
              rotation={[-Math.PI / 2, 0, 0]}
              fontSize={1.2}
              color="#8F8578"
              anchorX="center"
              anchorY="middle"
            >
              {`${d}m`}
            </Text>
          </group>
        )
      })}

      {/* Cliff / Platform Pedestal */}
      {cliffHeight > 0 && (
        <group position={[-2, cliffHeight / 2, 0]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[8, cliffHeight, 6]} />
            <meshStandardMaterial color="#2B2520" roughness={0.6} metalness={0.3} />
          </mesh>
          <mesh position={[0, cliffHeight / 2 + 0.05, 0]}>
            <boxGeometry args={[8.4, 0.15, 6.4]} />
            <meshStandardMaterial color="#CBA358" metalness={0.7} roughness={0.3} />
          </mesh>
        </group>
      )}

      {/* Cannon Base & Barrel */}
      <group position={[0, cliffHeight, 0]}>
        {/* Carriage Wheels */}
        <mesh position={[0, 0.6, -1]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.6, 0.6, 0.2, 24]} />
          <meshStandardMaterial color="#8A6D3B" metalness={0.4} roughness={0.5} />
        </mesh>
        <mesh position={[0, 0.6, 1]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.6, 0.6, 0.2, 24]} />
          <meshStandardMaterial color="#8A6D3B" metalness={0.4} roughness={0.5} />
        </mesh>
        <mesh position={[0, 0.6, 0]}>
          <boxGeometry args={[1.2, 0.4, 1.8]} />
          <meshStandardMaterial color="#1C1713" metalness={0.7} roughness={0.3} />
        </mesh>

        {/* Rotatable Cannon Barrel */}
        <group ref={barrelGroupRef} position={[0, 0.8, 0]} rotation={[0, 0, rad]}>
          <mesh position={[1.4, 0, 0]} rotation={[0, 0, -Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.25, 0.35, 2.8, 24]} />
            <meshStandardMaterial color="#D4AF37" metalness={0.85} roughness={0.2} />
          </mesh>
          {/* Muzzle Ring */}
          <mesh position={[2.8, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
            <torusGeometry args={[0.27, 0.06, 16, 24]} />
            <meshStandardMaterial color="#F3D59B" metalness={0.9} roughness={0.15} />
          </mesh>
        </group>
      </group>

      {/* Theoretical Parabolic Trajectory Guide Line */}
      {guidePoints.length > 1 && (
        <Line
          points={guidePoints}
          color="#CBA358"
          lineWidth={2.2}
          dashed
          dashScale={30}
          dashSize={0.8}
          gapSize={0.5}
          opacity={0.65}
          transparent
        />
      )}

      {/* Target Bullseye Ring */}
      <group position={[targetDistance, 0.02, 0]}>
        {/* Outer Ring */}
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.2, 1.8, 32]} />
          <meshBasicMaterial color="#C23B30" opacity={0.8} transparent />
        </mesh>
        {/* White Ring */}
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.6, 1.2, 32]} />
          <meshBasicMaterial color="#FAF3E6" />
        </mesh>
        {/* Red Center */}
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.6, 32]} />
          <meshBasicMaterial color="#C23B30" />
        </mesh>
        {/* Target Flag / Stand */}
        <mesh position={[0, 1.5, 0]}>
          <cylinderGeometry args={[0.04, 0.04, 3, 12]} />
          <meshStandardMaterial color="#6D6254" />
        </mesh>
        <mesh position={[0.6, 2.6, 0]}>
          <boxGeometry args={[1.2, 0.7, 0.02]} />
          <meshBasicMaterial color={hasHitTarget ? '#1B7F53' : '#C23B30'} />
        </mesh>
        <Text
          position={[0.6, 2.6, 0.05]}
          fontSize={0.4}
          color="#FFFFFF"
          anchorX="center"
          anchorY="middle"
        >
          {hasHitTarget ? 'HIT!' : `${targetDistance}m`}
        </Text>
      </group>

      {/* Active 3D Projectile Cannonball */}
      <mesh ref={projectileMeshRef} position={[0, cliffHeight + 0.8, 0]} castShadow>
        <sphereGeometry args={[0.35, 32, 32]} />
        <meshStandardMaterial color="#1C1713" metalness={0.9} roughness={0.15} />
      </mesh>

      {/* Flight Particle Trail */}
      {flightTrail.map((pt, idx) => (
        <mesh key={`trail-${idx}`} position={pt}>
          <sphereGeometry args={[0.12, 12, 12]} />
          <meshBasicMaterial color="#E2C17D" transparent opacity={0.5} />
        </mesh>
      ))}

      {/* Impact Ring */}
      {impactPos !== null && (
        <mesh position={[impactPos, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.2, 1.5, 32]} />
          <meshBasicMaterial color="#CBA358" transparent opacity={0.8} />
        </mesh>
      )}
    </group>
  )
}

// ── MAIN EXPORT COMPONENT ────────────────────────────────────────────────────
export default function ProjectileSim() {
  const [angleDeg, setAngleDeg] = useState(45)
  const [velocity, setVelocity] = useState(25)
  const [cliffHeight, setCliffHeight] = useState(10)
  const [gravity, setGravity] = useState(9.81)
  const [targetDistance, setTargetDistance] = useState(65)
  const [isPlaying, setIsPlaying] = useState(false)
  const [timeScale, setTimeScale] = useState(1.0)
  const [simKey, setSimKey] = useState(1)
  const [activeTab, setActiveTab] = useState('controls')
  const [isPanelOpen, setIsPanelOpen] = useState(true)

  const [telemetry, setTelemetry] = useState({
    t: 0,
    x: 0,
    y: 10,
    vx: 17.68,
    vy: 17.68,
    vTotal: 25,
    theoreticalRange: 65,
    theoreticalMaxH: 25.9,
    landed: false
  })

  const handleFire = () => {
    setSimKey(k => k + 1)
    setIsPlaying(true)
  }

  const handleReset = () => {
    setIsPlaying(false)
    setSimKey(k => k + 1)
  }

  // Pre-calculate theoretical maximum range for standard 45°
  const optimumRange = useMemo(() => {
    const rad = (45 * Math.PI) / 180
    const v0x = velocity * Math.cos(rad)
    const v0y = velocity * Math.sin(rad)
    const tFlight = (v0y + Math.sqrt(Math.pow(v0y, 2) + 2 * gravity * cliffHeight)) / gravity
    return (v0x * tFlight).toFixed(1)
  }, [velocity, gravity, cliffHeight])

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
      {/* 3D Canvas */}
      <div className="canvas-container-3d">
        <Canvas
          shadows
          camera={{ position: [30, 20, 50], fov: 45 }}
        >
          <color attach="background" args={['#F7F3EB']} />
          <ambientLight intensity={0.85} />
          <directionalLight
            position={[25, 50, 30]}
            intensity={1.6}
            castShadow
            shadow-mapSize-width={2048}
            shadow-mapSize-height={2048}
          />
          <directionalLight position={[-20, 20, -15]} intensity={0.4} color="#CBA358" />

          <CannonField
            angleDeg={angleDeg}
            velocity={velocity}
            cliffHeight={cliffHeight}
            gravity={gravity}
            targetDistance={targetDistance}
            isPlaying={isPlaying}
            timeScale={timeScale}
            onTelemetryUpdate={setTelemetry}
            simKey={simKey}
          />

          <OrbitControls
            target={[30, 8, 0]}
            maxPolarAngle={Math.PI / 2 + 0.02}
            minDistance={10}
            maxDistance={140}
            enableDamping
          />
        </Canvas>
      </div>

      {/* Top Floating Telemetry Bar — Positioned below breadcrumb */}
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
          padding: '8px 18px',
          borderRadius: 'var(--radius-full)',
          display: 'flex',
          alignItems: 'center',
          gap: 18,
          pointerEvents: 'auto'
        }}>
          <div>
            <span style={{ fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Range (X)</span>
            <div className="mono" style={{ fontSize: 16, fontWeight: 700, color: 'var(--obsidian-900)' }}>
              {telemetry.x.toFixed(1)} m
            </div>
          </div>
          <div style={{ width: 1, height: 26, background: 'var(--color-border)' }} />
          <div>
            <span style={{ fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Altitude (Y)</span>
            <div className="mono" style={{ fontSize: 16, fontWeight: 700, color: 'var(--gold-600)' }}>
              {telemetry.y.toFixed(1)} m
            </div>
          </div>
          <div style={{ width: 1, height: 26, background: 'var(--color-border)' }} />
          <div>
            <span style={{ fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Velocity Vector</span>
            <div className="mono" style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text)' }}>
              {telemetry.vTotal.toFixed(1)} m/s
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Floating Playback Bar */}
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
          gap: 12
        }}>
          <button
            onClick={handleReset}
            title="Reset Cannon"
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
            onClick={handleFire}
            className="btn-navy-primary"
            style={{
              padding: '8px 24px',
              borderRadius: 0,
              background: '#002B66',
              color: '#FFFFFF',
              fontWeight: 700,
              fontSize: 14,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              boxShadow: '0 4px 14px rgba(0, 43, 102, 0.4)'
            }}
          >
            <Sparkles size={17} />
            Fire Cannon
          </button>

          <div style={{ width: 1, height: 22, background: 'rgba(255,255,255,0.12)', margin: '0 4px' }} />

          {/* Time scale */}
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
          title="Open Parameters & Kinematics"
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

      {/* Floating Right Inspector Panel (Collapsible to right) */}
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
                { id: 'formula', label: 'Kinematics' },
                { id: 'telemetry', label: 'Targets' },
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

          <div style={{ flex: 1, overflowY: 'auto', padding: '20px 18px', display: 'flex', flexDirection: 'column', gap: 18 }}>
            {activeTab === 'controls' && (
              <>
                {/* Elevation Angle */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}>Launch Angle (θ)</span>
                    <span className="mono" style={{ fontSize: 14, fontWeight: 700, color: 'var(--gold-600)' }}>
                      {angleDeg}°
                    </span>
                  </div>
                  <input
                    type="range"
                    min={5}
                    max={85}
                    step={1}
                    value={angleDeg}
                    onChange={e => {
                      setAngleDeg(Number(e.target.value))
                      handleReset()
                    }}
                  />
                  <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                    {[30, 45, 60].map(deg => (
                      <button
                        key={deg}
                        onClick={() => {
                          setAngleDeg(deg)
                          handleReset()
                        }}
                        style={{
                          padding: '3px 8px',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: 11,
                          border: '1px solid var(--color-border)',
                          background: angleDeg === deg ? 'var(--color-accent-light)' : '#FFFFFF',
                          color: angleDeg === deg ? 'var(--gold-700)' : 'var(--color-text-muted)',
                          fontWeight: 600
                        }}
                      >
                        {deg}°
                      </button>
                    ))}
                  </div>
                </div>

                {/* Launch Speed */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}>Launch Speed (v₀)</span>
                    <span className="mono" style={{ fontSize: 14, fontWeight: 700, color: 'var(--gold-600)' }}>
                      {velocity} m/s
                    </span>
                  </div>
                  <input
                    type="range"
                    min={5}
                    max={50}
                    step={1}
                    value={velocity}
                    onChange={e => {
                      setVelocity(Number(e.target.value))
                      handleReset()
                    }}
                  />
                </div>

                {/* Cliff Height */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}>Cliff Height (h₀)</span>
                    <span className="mono" style={{ fontSize: 14, fontWeight: 700, color: 'var(--obsidian-800)' }}>
                      {cliffHeight} m
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={30}
                    step={1}
                    value={cliffHeight}
                    onChange={e => {
                      setCliffHeight(Number(e.target.value))
                      handleReset()
                    }}
                  />
                </div>

                {/* Target Distance Slider */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}>Target Distance</span>
                    <span className="mono" style={{ fontSize: 14, fontWeight: 700, color: '#C23B30' }}>
                      {targetDistance} m
                    </span>
                  </div>
                  <input
                    type="range"
                    min={20}
                    max={120}
                    step={2}
                    value={targetDistance}
                    onChange={e => setTargetDistance(Number(e.target.value))}
                  />
                  <button
                    onClick={() => setTargetDistance(Math.round(telemetry.theoreticalRange))}
                    style={{
                      marginTop: 6,
                      fontSize: 11,
                      color: 'var(--gold-700)',
                      fontWeight: 600,
                      textDecoration: 'underline'
                    }}
                  >
                    Snap target to theoretical range ({Math.round(telemetry.theoreticalRange)}m)
                  </button>
                </div>
              </>
            )}

            {activeTab === 'formula' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{
                  padding: '14px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--cream-100)',
                  border: '1px solid var(--color-border)'
                }}>
                  <span className="badge-gold">Orthogonal Independence</span>
                  <p style={{ margin: '8px 0 0 0', fontSize: 13, lineHeight: 1.55, color: 'var(--color-text)' }}>
                    Horizontal velocity remains constant while vertical velocity is uniformly accelerated by gravity:
                  </p>
                  <div className="mono" style={{
                    margin: '10px 0',
                    padding: '8px',
                    background: '#FFFFFF',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: 12,
                    lineHeight: 1.6
                  }}>
                    v_x = v₀ · cos(θ)<br />
                    v_y(t) = v₀ · sin(θ) - g · t
                  </div>
                </div>

                <div style={{
                  padding: '14px',
                  borderRadius: 'var(--radius-md)',
                  background: '#FFFFFF',
                  border: '1px solid var(--color-border)'
                }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
                    Theoretical Peak & Range
                  </span>
                  <div className="mono" style={{ fontSize: 12, marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div>Max Height: <strong>{telemetry.theoreticalMaxH.toFixed(2)}m</strong></div>
                    <div>Total Range: <strong>{telemetry.theoreticalRange.toFixed(2)}m</strong></div>
                    <div>Max 45° Range: <strong>{optimumRange}m</strong></div>
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
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--obsidian-800)', marginBottom: 8 }}>
                    Current Vectors
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <div>
                      <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Horizontal (vx)</span>
                      <div className="mono" style={{ fontSize: 15, fontWeight: 700 }}>{telemetry.vx.toFixed(1)} m/s</div>
                    </div>
                    <div>
                      <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Vertical (vy)</span>
                      <div className="mono" style={{ fontSize: 15, fontWeight: 700 }}>{telemetry.vy.toFixed(1)} m/s</div>
                    </div>
                  </div>
                </div>

                <div style={{
                  padding: '14px',
                  borderRadius: 'var(--radius-md)',
                  background: telemetry.landed && Math.abs(telemetry.x - targetDistance) < 2.0 ? 'var(--color-success-bg)' : '#FFFFFF',
                  border: `1px solid ${telemetry.landed && Math.abs(telemetry.x - targetDistance) < 2.0 ? 'var(--color-success)' : 'var(--color-border)'}`
                }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
                    Target Proximity
                  </span>
                  <div className="mono" style={{ fontSize: 14, fontWeight: 700, marginTop: 6 }}>
                    {telemetry.landed 
                      ? Math.abs(telemetry.x - targetDistance) < 2.0
                        ? '✓ DIRECT BULLSEYE HIT!'
                        : `Missed by ${(Math.abs(telemetry.x - targetDistance)).toFixed(1)}m`
                      : 'Cannonball In Flight...'}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
