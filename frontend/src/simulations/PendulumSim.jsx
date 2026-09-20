import React, { useState, useRef, useEffect, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Text, Line } from '@react-three/drei'
import * as THREE from 'three'
import { Play, Pause, RotateCcw, Activity, Zap, Sparkles, SlidersHorizontal } from 'lucide-react'

// ── 3D PENDULUM SCENE ────────────────────────────────────────────────────────
function PendulumRig({
  length,
  mass,
  initAngleDeg,
  gravity,
  damping,
  isDoublePendulum,
  isPlaying,
  timeScale,
  onTelemetryUpdate,
  simKey
}) {
  const [trailPoints, setTrailPoints] = useState([])
  const arm1Ref = useRef()
  const arm2Ref = useRef()
  const bob1MeshRef = useRef()
  const bob2MeshRef = useRef()

  const rod1Len = isDoublePendulum ? length * 0.6 : length
  const rod2Len = length * 0.6
  const bobRadius = 0.35 + Math.min(mass * 0.05, 0.25)

  // Physical dynamic integration state
  const physRef = useRef({
    theta1: (initAngleDeg * Math.PI) / 180,
    omega1: 0,
    theta2: (initAngleDeg * Math.PI) / 180,
    omega2: 0,
    t: 0
  })

  // Reset state on simKey or parameter changes
  useEffect(() => {
    physRef.current = {
      theta1: (initAngleDeg * Math.PI) / 180,
      omega1: 0,
      theta2: (initAngleDeg * Math.PI) / 180,
      omega2: 0,
      t: 0
    }
    setTrailPoints([])
    if (arm1Ref.current) {
      arm1Ref.current.rotation.z = -(initAngleDeg * Math.PI) / 180
    }
    if (arm2Ref.current) {
      arm2Ref.current.rotation.z = 0
    }
  }, [simKey, length, mass, initAngleDeg, gravity, isDoublePendulum])

  useFrame((_, delta) => {
    if (!isPlaying) return
    const dt = Math.min(delta, 0.04) * timeScale
    const s = physRef.current
    s.t += dt

    if (!isDoublePendulum) {
      // High-precision RK4 / Euler-Cromer for simple pendulum
      // theta'' = - (g / L) * sin(theta) - damping * theta'
      const alpha = -(gravity / length) * Math.sin(s.theta1) - damping * s.omega1
      s.omega1 += alpha * dt
      s.theta1 += s.omega1 * dt

      // Rotate pivot arm group: guarantees rod & bob never disconnect!
      if (arm1Ref.current) {
        arm1Ref.current.rotation.z = -s.theta1
      }

      // Energy calculation
      const h = length * (1 - Math.cos(s.theta1))
      const PE = mass * gravity * h
      const v = length * s.omega1
      const KE = 0.5 * mass * Math.pow(v, 2)
      const totalE = PE + KE

      // Trail using world coordinates
      if (s.t % 0.04 < 0.02 && bob1MeshRef.current) {
        const wp = new THREE.Vector3()
        bob1MeshRef.current.getWorldPosition(wp)
        setTrailPoints(prev => [...prev.slice(-70), new THREE.Vector3(wp.x, wp.y - 4, wp.z)])
      }

      const theoreticalT = 2 * Math.PI * Math.sqrt(length / gravity)
      onTelemetryUpdate({
        thetaDeg: (s.theta1 * 180) / Math.PI,
        omega: s.omega1,
        PE,
        KE,
        totalE,
        period: theoreticalT
      })
    } else {
      // Double Pendulum Equations of Motion (Lagrangian)
      const l1 = rod1Len
      const l2 = rod2Len
      const m1 = mass
      const m2 = mass * 0.8
      const g = gravity

      const dTheta = s.theta1 - s.theta2
      const num1 = -g * (2 * m1 + m2) * Math.sin(s.theta1) - m2 * g * Math.sin(s.theta1 - 2 * s.theta2) - 2 * Math.sin(dTheta) * m2 * (Math.pow(s.omega2, 2) * l2 + Math.pow(s.omega1, 2) * l1 * Math.cos(dTheta))
      const den1 = l1 * (2 * m1 + m2 - m2 * Math.cos(2 * s.theta1 - 2 * s.theta2))
      const alpha1 = (num1 / den1) - damping * s.omega1

      const num2 = 2 * Math.sin(dTheta) * (Math.pow(s.omega1, 2) * l1 * (m1 + m2) + g * (m1 + m2) * Math.cos(s.theta1) + Math.pow(s.omega2, 2) * l2 * m2 * Math.cos(dTheta))
      const den2 = l2 * (2 * m1 + m2 - m2 * Math.cos(2 * s.theta1 - 2 * s.theta2))
      const alpha2 = (num2 / den2) - damping * s.omega2

      s.omega1 += alpha1 * dt
      s.theta1 += s.omega1 * dt
      s.omega2 += alpha2 * dt
      s.theta2 += s.omega2 * dt

      if (arm1Ref.current) {
        arm1Ref.current.rotation.z = -s.theta1
      }
      if (arm2Ref.current) {
        arm2Ref.current.rotation.z = -(s.theta2 - s.theta1)
      }

      if (s.t % 0.03 < 0.02 && bob2MeshRef.current) {
        const wp = new THREE.Vector3()
        bob2MeshRef.current.getWorldPosition(wp)
        setTrailPoints(prev => [...prev.slice(-120), new THREE.Vector3(wp.x, wp.y - 4, wp.z)])
      }

      onTelemetryUpdate({
        thetaDeg: (s.theta1 * 180) / Math.PI,
        omega: s.omega1,
        PE: 0,
        KE: 0,
        totalE: 0,
        period: 2 * Math.PI * Math.sqrt(length / gravity)
      })
    }
  })

  return (
    <group position={[0, 4, 0]}>
      {/* Studio Floor */}
      <gridHelper args={[40, 40, '#CBA358', '#E2D6C3']} position={[0, -8, 0]} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -8.02, 0]} receiveShadow>
        <planeGeometry args={[60, 60]} />
        <meshStandardMaterial color="#F4EFE6" roughness={0.8} />
      </mesh>

      {/* Ceiling Mounting Bracket */}
      <mesh position={[0, 0.4, 0]} castShadow>
        <boxGeometry args={[4, 0.4, 1.6]} />
        <meshStandardMaterial color="#221C18" metalness={0.7} roughness={0.3} />
      </mesh>

      {/* Brass Pivot Bearing Hub */}
      <mesh position={[0, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.3, 0.3, 0.8, 24]} />
        <meshStandardMaterial color="#D4AF37" metalness={0.9} roughness={0.15} />
      </mesh>

      {/* ── ARMED PIVOT GROUP 1 (Guaranteed 100% attached to pivot hub) ── */}
      <group ref={arm1Ref} position={[0, 0, 0]}>
        {/* Rod 1 */}
        <mesh position={[0, -rod1Len / 2, 0]} castShadow>
          <cylinderGeometry args={[0.04, 0.04, rod1Len, 16]} />
          <meshStandardMaterial color="#CBA358" metalness={0.85} roughness={0.2} />
        </mesh>

        {/* Bob 1 */}
        <mesh ref={bob1MeshRef} position={[0, -rod1Len, 0]} castShadow>
          <sphereGeometry args={[bobRadius, 32, 32]} />
          <meshStandardMaterial color="#D4AF37" metalness={0.9} roughness={0.15} />
        </mesh>

        {/* Arm 2 (Child of Arm 1, attached at Bob 1) */}
        {isDoublePendulum && (
          <group ref={arm2Ref} position={[0, -rod1Len, 0]}>
            {/* Rod 2 */}
            <mesh position={[0, -rod2Len / 2, 0]} castShadow>
              <cylinderGeometry args={[0.035, 0.035, rod2Len, 16]} />
              <meshStandardMaterial color="#926F2D" metalness={0.8} roughness={0.2} />
            </mesh>

            {/* Bob 2 */}
            <mesh ref={bob2MeshRef} position={[0, -rod2Len, 0]} castShadow>
              <sphereGeometry args={[0.3, 32, 32]} />
              <meshStandardMaterial color="#1C1713" metalness={0.6} roughness={0.3} />
            </mesh>
          </group>
        )}
      </group>

      {/* Dynamic Motion Arc / Ribbon Trail */}
      {trailPoints.length > 2 && (
        <Line
          points={trailPoints}
          color={isDoublePendulum ? '#C23B30' : '#CBA358'}
          lineWidth={2.5}
          opacity={0.75}
          transparent
        />
      )}
    </group>
  )
}

// ── MAIN EXPORT COMPONENT ────────────────────────────────────────────────────
export default function PendulumSim() {
  const [length, setLength] = useState(2.5)
  const [mass, setMass] = useState(1.5)
  const [initAngleDeg, setInitAngleDeg] = useState(35)
  const [gravity, setGravity] = useState(9.81)
  const [damping, setDamping] = useState(0.04)
  const [isDoublePendulum, setIsDoublePendulum] = useState(false)
  const [isPlaying, setIsPlaying] = useState(true)
  const [timeScale, setTimeScale] = useState(1.0)
  const [simKey, setSimKey] = useState(1)
  const [activeTab, setActiveTab] = useState('controls')
  const [isPanelOpen, setIsPanelOpen] = useState(true)

  const [telemetry, setTelemetry] = useState({
    thetaDeg: 35,
    omega: 0,
    PE: 3.5,
    KE: 0,
    totalE: 3.5,
    period: 3.17
  })

  const handleReset = () => {
    setSimKey(k => k + 1)
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
      <div className="canvas-container-3d">
        <Canvas
          shadows
          camera={{ position: [0, 1, 9], fov: 48 }}
        >
          <color attach="background" args={['#F7F3EB']} />
          <ambientLight intensity={0.9} />
          <directionalLight
            position={[10, 20, 15]}
            intensity={1.6}
            castShadow
            shadow-mapSize-width={2048}
            shadow-mapSize-height={2048}
          />
          <directionalLight position={[-10, 10, -10]} intensity={0.4} color="#CBA358" />

          <PendulumRig
            length={length}
            mass={mass}
            initAngleDeg={initAngleDeg}
            gravity={gravity}
            damping={damping}
            isDoublePendulum={isDoublePendulum}
            isPlaying={isPlaying}
            timeScale={timeScale}
            onTelemetryUpdate={setTelemetry}
            simKey={simKey}
          />

          <OrbitControls
            target={[0, 1.5, 0]}
            maxPolarAngle={Math.PI / 2 + 0.05}
            minDistance={4}
            maxDistance={25}
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
            <span style={{ fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Oscillation Angle</span>
            <div className="mono" style={{ fontSize: 16, fontWeight: 700, color: 'var(--obsidian-900)' }}>
              {telemetry.thetaDeg.toFixed(1)}°
            </div>
          </div>
          <div style={{ width: 1, height: 26, background: 'var(--color-border)' }} />
          <div>
            <span style={{ fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Period (T)</span>
            <div className="mono" style={{ fontSize: 16, fontWeight: 700, color: 'var(--gold-600)' }}>
              {telemetry.period.toFixed(2)}s
            </div>
          </div>
          <div style={{ width: 1, height: 26, background: 'var(--color-border)' }} />
          <div>
            <span style={{ fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>System Mode</span>
            <div style={{ fontSize: 13, fontWeight: 700, color: isDoublePendulum ? '#C23B30' : '#1B7F53' }}>
              {isDoublePendulum ? 'Chaotic Double' : 'Simple Harmonic'}
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
            title="Reset to Initial Angle"
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
            {isPlaying ? 'Pause' : 'Release Bob'}
          </button>

          <div style={{ width: 1, height: 22, background: 'rgba(255,255,255,0.12)', margin: '0 4px' }} />

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
          title="Open Parameters & Harmonics"
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
                { id: 'formula', label: 'Harmonics' },
                { id: 'energy', label: 'Energy' },
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
                {/* Double Pendulum Toggle */}
                <div style={{
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-md)',
                  background: isDoublePendulum ? 'rgba(194, 59, 48, 0.08)' : 'var(--cream-100)',
                  border: `1px solid ${isDoublePendulum ? '#C23B30' : 'var(--color-border)'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>
                      Double Pendulum (Chaos)
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                      {isDoublePendulum ? 'Chaotic nonlinear motion' : 'Single harmonic pendulum'}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setIsDoublePendulum(!isDoublePendulum)
                      handleReset()
                    }}
                    style={{
                      width: 44,
                      height: 24,
                      borderRadius: 12,
                      background: isDoublePendulum ? '#C23B30' : 'var(--cream-400)',
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
                      left: isDoublePendulum ? 23 : 3,
                      transition: 'left 0.2s ease'
                    }} />
                  </button>
                </div>

                {/* Rod Length */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}>Rod Length (L)</span>
                    <span className="mono" style={{ fontSize: 14, fontWeight: 700, color: 'var(--gold-600)' }}>
                      {length} m
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0.8}
                    max={4.0}
                    step={0.1}
                    value={length}
                    onChange={e => {
                      setLength(Number(e.target.value))
                      handleReset()
                    }}
                  />
                </div>

                {/* Bob Mass */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}>Bob Mass (m)</span>
                    <span className="mono" style={{ fontSize: 14, fontWeight: 700, color: 'var(--obsidian-800)' }}>
                      {mass} kg
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0.2}
                    max={5.0}
                    step={0.1}
                    value={mass}
                    onChange={e => {
                      setMass(Number(e.target.value))
                      handleReset()
                    }}
                  />
                </div>

                {/* Initial Angle */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}>Initial Angle (θ₀)</span>
                    <span className="mono" style={{ fontSize: 14, fontWeight: 700, color: 'var(--gold-600)' }}>
                      {initAngleDeg}°
                    </span>
                  </div>
                  <input
                    type="range"
                    min={5}
                    max={80}
                    step={1}
                    value={initAngleDeg}
                    onChange={e => {
                      setInitAngleDeg(Number(e.target.value))
                      handleReset()
                    }}
                  />
                </div>

                {/* Damping */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}>Air Damping (b)</span>
                    <span className="mono" style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text-muted)' }}>
                      {damping}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={0.15}
                    step={0.01}
                    value={damping}
                    onChange={e => {
                      setDamping(Number(e.target.value))
                      handleReset()
                    }}
                  />
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
                  <span className="badge-gold">Harmonic Period Law</span>
                  <p style={{ margin: '8px 0 0 0', fontSize: 13, lineHeight: 1.55, color: 'var(--color-text)' }}>
                    For small oscillations, the period depends exclusively on rod length and gravity:
                  </p>
                  <div className="mono" style={{
                    margin: '10px 0',
                    padding: '8px',
                    background: '#FFFFFF',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: 13,
                    fontWeight: 700,
                    textAlign: 'center'
                  }}>
                    T = 2π √(L / g)
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                    Notice that mass <em>m</em> does not appear in the formula! Changing the bob mass has zero effect on the period.
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'energy' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{
                  padding: '14px',
                  borderRadius: 'var(--radius-md)',
                  background: '#FFFFFF',
                  border: '1px solid var(--color-border)'
                }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--obsidian-900)' }}>
                    Energy Conservation Bar
                  </span>
                  
                  {/* Energy Bar */}
                  <div style={{
                    height: 20,
                    background: 'var(--cream-200)',
                    borderRadius: 'var(--radius-full)',
                    overflow: 'hidden',
                    display: 'flex',
                    marginTop: 10
                  }}>
                    <div
                      style={{
                        width: `${Math.min(100, Math.max(0, (telemetry.KE / (telemetry.totalE || 1)) * 100))}%`,
                        background: 'var(--gold-500)',
                        transition: 'width 0.05s linear'
                      }}
                      title="Kinetic Energy"
                    />
                    <div
                      style={{
                        width: `${Math.min(100, Math.max(0, (telemetry.PE / (telemetry.totalE || 1)) * 100))}%`,
                        background: '#0D9488',
                        transition: 'width 0.05s linear'
                      }}
                      title="Potential Energy"
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--gold-500)' }} />
                      <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Kinetic:</span>
                      <span className="mono" style={{ fontSize: 13, fontWeight: 700 }}>{telemetry.KE.toFixed(1)} J</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#0D9488' }} />
                      <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Potential:</span>
                      <span className="mono" style={{ fontSize: 13, fontWeight: 700 }}>{telemetry.PE.toFixed(1)} J</span>
                    </div>
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
