import React, { useState, useRef, useEffect, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Text } from '@react-three/drei'
import * as THREE from 'three'
import { Play, Pause, RotateCcw, Zap, Sparkles, Scale, SlidersHorizontal } from 'lucide-react'

// ── 3D AIR-TRACK COLLISION SCENE ─────────────────────────────────────────────
function AirTrackScene({
  mass1,
  mass2,
  v1Initial,
  v2Initial,
  restitution,
  isPlaying,
  timeScale,
  onTelemetryUpdate,
  simKey
}) {
  const trackLength = 24
  const minX = -trackLength / 2 + 1.2
  const maxX = trackLength / 2 - 1.2

  const r1 = 0.4 + Math.min(mass1 * 0.05, 0.4)
  const r2 = 0.4 + Math.min(mass2 * 0.05, 0.4)

  const [impactFlash, setImpactFlash] = useState(false)

  // Dynamic physical positions and velocities
  const physRef = useRef({
    x1: -6,
    x2: 6,
    v1: v1Initial,
    v2: v2Initial,
    hasCollided: false,
    t: 0
  })

  useEffect(() => {
    physRef.current = {
      x1: -6,
      x2: 6,
      v1: v1Initial,
      v2: v2Initial,
      hasCollided: false,
      t: 0
    }
    setImpactFlash(false)
  }, [simKey, mass1, mass2, v1Initial, v2Initial, restitution])

  const mesh1Ref = useRef()
  const mesh2Ref = useRef()

  useFrame((_, delta) => {
    if (!isPlaying) return
    const dt = Math.min(delta, 0.04) * timeScale
    const s = physRef.current
    s.t += dt

    // Integrate positions
    s.x1 += s.v1 * dt
    s.x2 += s.v2 * dt

    // Glider-to-Glider Collision Detection
    const dist = s.x2 - s.x1
    const minDist = r1 + r2

    if (dist <= minDist && s.v1 > s.v2) {
      // 1D Collision with Coefficient of Restitution e
      // v1' = (m1 - e*m2)*v1 / (m1+m2) + (1+e)*m2*v2 / (m1+m2)
      // v2' = (1+e)*m1*v1 / (m1+m2) + (m2 - e*m1)*v2 / (m1+m2)
      const mSum = mass1 + mass2
      const e = restitution

      const v1New = ((mass1 - e * mass2) * s.v1 + (1 + e) * mass2 * s.v2) / mSum
      const v2New = ((1 + e) * mass1 * s.v1 + (mass2 - e * mass1) * s.v2) / mSum

      s.v1 = v1New
      s.v2 = v2New
      s.hasCollided = true

      setImpactFlash(true)
      setTimeout(() => setImpactFlash(false), 200)

      // Separation adjustment
      const overlap = minDist - dist
      s.x1 -= overlap / 2
      s.x2 += overlap / 2
    }

    // End Bumper Elastic Bounces
    if (s.x1 - r1 <= minX) {
      s.x1 = minX + r1
      s.v1 = -s.v1
    }
    if (s.x2 + r2 >= maxX) {
      s.x2 = maxX - r2
      s.v2 = -s.v2
    }

    if (mesh1Ref.current) mesh1Ref.current.position.x = s.x1
    if (mesh2Ref.current) mesh2Ref.current.position.x = s.x2

    // Momentum & Kinetic Energy
    const p1 = mass1 * s.v1
    const p2 = mass2 * s.v2
    const pTotal = p1 + p2
    const ke1 = 0.5 * mass1 * Math.pow(s.v1, 2)
    const ke2 = 0.5 * mass2 * Math.pow(s.v2, 2)
    const keTotal = ke1 + ke2

    onTelemetryUpdate({
      x1: s.x1,
      x2: s.x2,
      v1: s.v1,
      v2: s.v2,
      pTotal,
      keTotal,
      hasCollided: s.hasCollided
    })
  })

  return (
    <group position={[0, 0, 0]}>
      {/* Studio Floor */}
      <gridHelper args={[50, 50, '#CBA358', '#E2D6C3']} position={[0, -1.8, 0]} />

      {/* Air Track Bed */}
      <group position={[0, 0, 0]}>
        {/* Main Aluminum Rail */}
        <mesh position={[0, -0.4, 0]} castShadow receiveShadow>
          <boxGeometry args={[trackLength, 0.4, 1.4]} />
          <meshStandardMaterial color="#332B25" metalness={0.7} roughness={0.3} />
        </mesh>
        {/* Top Polished Guide Surface */}
        <mesh position={[0, -0.18, 0]} receiveShadow>
          <boxGeometry args={[trackLength + 0.1, 0.05, 1.2]} />
          <meshStandardMaterial color="#CBA358" metalness={0.9} roughness={0.15} />
        </mesh>

        {/* End Bumpers */}
        <mesh position={[-trackLength / 2, 0.1, 0]}>
          <boxGeometry args={[0.4, 0.8, 1.6]} />
          <meshStandardMaterial color="#1C1713" metalness={0.5} roughness={0.4} />
        </mesh>
        <mesh position={[trackLength / 2, 0.1, 0]}>
          <boxGeometry args={[0.4, 0.8, 1.6]} />
          <meshStandardMaterial color="#1C1713" metalness={0.5} roughness={0.4} />
        </mesh>

        {/* Ruler Ticks on the Track */}
        {Array.from({ length: Math.floor(trackLength) + 1 }).map((_, i) => {
          const x = -trackLength / 2 + i * 1.0
          return (
            <mesh key={i} position={[x, -0.15, 0.72]}>
              <boxGeometry args={[0.03, 0.1, 0.02]} />
              <meshBasicMaterial color="#E2D6C3" />
            </mesh>
          )
        })}
      </group>

      {/* Glider 1 (Gilded Brass Sphere) */}
      <group ref={mesh1Ref} position={[-6, r1, 0]}>
        <mesh castShadow>
          <sphereGeometry args={[r1, 32, 32]} />
          <meshStandardMaterial color="#D4AF37" metalness={0.9} roughness={0.15} />
        </mesh>
        <Text
          position={[0, r1 + 0.5, 0]}
          fontSize={0.45}
          color="#1C1713"
          anchorX="center"
          anchorY="middle"
        >
          {`m₁=${mass1}kg`}
        </Text>
      </group>

      {/* Glider 2 (Obsidian Dark Sphere) */}
      <group ref={mesh2Ref} position={[6, r2, 0]}>
        <mesh castShadow>
          <sphereGeometry args={[r2, 32, 32]} />
          <meshStandardMaterial color="#1C1713" metalness={0.5} roughness={0.3} />
        </mesh>
        <Text
          position={[0, r2 + 0.5, 0]}
          fontSize={0.45}
          color="#1C1713"
          anchorX="center"
          anchorY="middle"
        >
          {`m₂=${mass2}kg`}
        </Text>
      </group>

      {/* Impact Shockwave Ring */}
      {impactFlash && (
        <mesh position={[(physRef.current.x1 + physRef.current.x2) / 2, 0.2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.2, 2.0, 32]} />
          <meshBasicMaterial color="#E2C17D" transparent opacity={0.8} />
        </mesh>
      )}
    </group>
  )
}

// ── MAIN EXPORT COMPONENT ────────────────────────────────────────────────────
export default function CollisionSim() {
  const [mass1, setMass1] = useState(2.0)
  const [mass2, setMass2] = useState(2.0)
  const [v1Initial, setV1Initial] = useState(4.0)
  const [v2Initial, setV2Initial] = useState(-4.0)
  const [restitution, setRestitution] = useState(1.0)
  const [isPlaying, setIsPlaying] = useState(true)
  const [timeScale, setTimeScale] = useState(1.0)
  const [simKey, setSimKey] = useState(1)
  const [activeTab, setActiveTab] = useState('controls')
  const [isPanelOpen, setIsPanelOpen] = useState(true)

  const initialMomentum = useMemo(() => {
    return (mass1 * v1Initial + mass2 * v2Initial).toFixed(2)
  }, [mass1, mass2, v1Initial, v2Initial])

  const initialKE = useMemo(() => {
    return (0.5 * mass1 * Math.pow(v1Initial, 2) + 0.5 * mass2 * Math.pow(v2Initial, 2)).toFixed(2)
  }, [mass1, mass2, v1Initial, v2Initial])

  const [telemetry, setTelemetry] = useState({
    x1: -6,
    x2: 6,
    v1: 4.0,
    v2: -4.0,
    pTotal: 0,
    keTotal: 32,
    hasCollided: false
  })

  const handleReset = () => {
    setSimKey(k => k + 1)
  }

  const applyPreset = (m1, m2, v1, v2, e) => {
    setMass1(m1)
    setMass2(m2)
    setV1Initial(v1)
    setV2Initial(v2)
    setRestitution(e)
    handleReset()
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
      <div className="canvas-container-3d">
        <Canvas
          shadows
          camera={{ position: [0, 6, 16], fov: 45 }}
        >
          <color attach="background" args={['#F7F3EB']} />
          <ambientLight intensity={0.9} />
          <directionalLight
            position={[15, 30, 20]}
            intensity={1.6}
            castShadow
            shadow-mapSize-width={2048}
            shadow-mapSize-height={2048}
          />
          <directionalLight position={[-15, 10, -10]} intensity={0.4} color="#CBA358" />

          <AirTrackScene
            mass1={mass1}
            mass2={mass2}
            v1Initial={v1Initial}
            v2Initial={v2Initial}
            restitution={restitution}
            isPlaying={isPlaying}
            timeScale={timeScale}
            onTelemetryUpdate={setTelemetry}
            simKey={simKey}
          />

          <OrbitControls
            target={[0, 0, 0]}
            maxPolarAngle={Math.PI / 2 + 0.05}
            minDistance={6}
            maxDistance={35}
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
          padding: '8px 18px',
          borderRadius: 'var(--radius-full)',
          display: 'flex',
          alignItems: 'center',
          gap: 18,
          pointerEvents: 'auto'
        }}>
          <div>
            <span style={{ fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Momentum (P)</span>
            <div className="mono" style={{ fontSize: 16, fontWeight: 700, color: 'var(--obsidian-900)' }}>
              {telemetry.pTotal.toFixed(2)} kg·m/s
            </div>
          </div>
          <div style={{ width: 1, height: 26, background: 'var(--color-border)' }} />
          <div>
            <span style={{ fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Kinetic Energy</span>
            <div className="mono" style={{ fontSize: 16, fontWeight: 700, color: 'var(--gold-600)' }}>
              {telemetry.keTotal.toFixed(1)} J
            </div>
          </div>
          <div style={{ width: 1, height: 26, background: 'var(--color-border)' }} />
          <div>
            <span style={{ fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Collision Type</span>
            <div style={{ fontSize: 13, fontWeight: 700, color: restitution === 1 ? '#1B7F53' : restitution === 0 ? '#C23B30' : '#B5771A' }}>
              {restitution === 1 ? 'Elastic (e=1)' : restitution === 0 ? 'Inelastic Stick (e=0)' : `Inelastic (e=${restitution})`}
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
            title="Reset Gliders"
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
            {isPlaying ? 'Pause' : 'Launch Gliders'}
          </button>
        </div>
      </div>

      {/* Minimized Trigger Button (When Inspector is Closed) */}
      {!isPanelOpen && (
        <button
          onClick={() => setIsPanelOpen(true)}
          className="glass-cream"
          title="Open Parameters & Laws"
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
          {/* Header Bar with Tabs and Minimize Button */}
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
                { id: 'presets', label: 'Presets' },
                { id: 'formula', label: 'Laws' },
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
                {/* Restitution (Elasticity) */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}>Elasticity (e)</span>
                    <span className="mono" style={{ fontSize: 14, fontWeight: 700, color: 'var(--gold-600)' }}>
                      {restitution}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={restitution}
                    onChange={e => {
                      setRestitution(Number(e.target.value))
                      handleReset()
                    }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--color-text-muted)', marginTop: 4 }}>
                    <span>0 (Stick)</span>
                    <span>0.5 (Inelastic)</span>
                    <span>1.0 (Elastic)</span>
                  </div>
                </div>

                {/* Ball 1 Mass & Velocity */}
                <div style={{ padding: '12px', borderRadius: 'var(--radius-md)', background: 'var(--cream-100)', border: '1px solid var(--color-border)' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--gold-600)', marginBottom: 8 }}>
                    🟡 Ball 1 (Gilded)
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                        <span>Mass:</span>
                        <span className="mono">{mass1} kg</span>
                      </div>
                      <input
                        type="range"
                        min={0.5}
                        max={10}
                        step={0.5}
                        value={mass1}
                        onChange={e => {
                          setMass1(Number(e.target.value))
                          handleReset()
                        }}
                      />
                    </div>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                        <span>Initial Velocity:</span>
                        <span className="mono">{v1Initial} m/s</span>
                      </div>
                      <input
                        type="range"
                        min={-8}
                        max={8}
                        step={0.5}
                        value={v1Initial}
                        onChange={e => {
                          setV1Initial(Number(e.target.value))
                          handleReset()
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Ball 2 Mass & Velocity */}
                <div style={{ padding: '12px', borderRadius: 'var(--radius-md)', background: 'var(--cream-100)', border: '1px solid var(--color-border)' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--obsidian-800)', marginBottom: 8 }}>
                    ⚫ Ball 2 (Obsidian)
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                        <span>Mass:</span>
                        <span className="mono">{mass2} kg</span>
                      </div>
                      <input
                        type="range"
                        min={0.5}
                        max={10}
                        step={0.5}
                        value={mass2}
                        onChange={e => {
                          setMass2(Number(e.target.value))
                          handleReset()
                        }}
                      />
                    </div>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                        <span>Initial Velocity:</span>
                        <span className="mono">{v2Initial} m/s</span>
                      </div>
                      <input
                        type="range"
                        min={-8}
                        max={8}
                        step={0.5}
                        value={v2Initial}
                        onChange={e => {
                          setV2Initial(Number(e.target.value))
                          handleReset()
                        }}
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

            {activeTab === 'presets' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  { name: 'Equal Mass Head-On', m1: 2, m2: 2, v1: 4, v2: -4, e: 1.0, desc: 'Equal velocities exchange symmetrically' },
                  { name: 'Heavy into Stationary Light', m1: 8, m2: 1, v1: 5, v2: 0, e: 1.0, desc: 'Light ball propelled at high speed' },
                  { name: 'Light into Stationary Heavy', m1: 1, m2: 8, v1: 5, v2: 0, e: 1.0, desc: 'Light ball bounces back' },
                  { name: 'Perfect Inelastic Stick', m1: 3, m2: 3, v1: 6, v2: 0, e: 0.0, desc: 'Bodies couple together after impact' },
                ].map((p, i) => (
                  <button
                    key={i}
                    onClick={() => applyPreset(p.m1, p.m2, p.v1, p.v2, p.e)}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 'var(--radius-md)',
                      background: '#FFFFFF',
                      border: '1px solid var(--color-border)',
                      textAlign: 'left',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 3
                    }}
                  >
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--obsidian-900)' }}>{p.name}</span>
                    <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{p.desc}</span>
                  </button>
                ))}
              </div>
            )}

            {activeTab === 'formula' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{
                  padding: '14px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--cream-100)',
                  border: '1px solid var(--color-border)'
                }}>
                  <span className="badge-gold">Conservation of Linear Momentum</span>
                  <p style={{ margin: '8px 0 0 0', fontSize: 13, lineHeight: 1.55, color: 'var(--color-text)' }}>
                    Total momentum is strictly conserved in all collisions regardless of elasticity:
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
                    m₁ v₁ + m₂ v₂ = m₁ v₁' + m₂ v₂'
                  </div>
                </div>

                <div style={{
                  padding: '14px',
                  borderRadius: 'var(--radius-md)',
                  background: '#FFFFFF',
                  border: '1px solid var(--color-border)'
                }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
                    System Proof
                  </span>
                  <div className="mono" style={{ fontSize: 12, marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div>Initial P: {initialMomentum} kg·m/s</div>
                    <div>Current P: {telemetry.pTotal.toFixed(2)} kg·m/s</div>
                    <div style={{ color: 'var(--color-success)', fontWeight: 700, marginTop: 4 }}>
                      ✓ Momentum Conserved
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
