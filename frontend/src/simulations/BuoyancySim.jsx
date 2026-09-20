import React, { useState, useRef, useEffect, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Text } from '@react-three/drei'
import * as THREE from 'three'
import { Play, Pause, RotateCcw, Droplets, Anchor, ArrowUp, ArrowDown, SlidersHorizontal } from 'lucide-react'
import { MATERIAL_PRESETS, FLUID_PRESETS } from '../config/physics'

// ── 3D FLOTATION TANK SCENE ──────────────────────────────────────────────────
function TankScene({
  objectDensity,
  fluidDensity,
  volumeL,
  gravity,
  appliedPush,
  isPlaying,
  timeScale,
  onTelemetryUpdate,
  simKey
}) {
  const tankWidth = 6
  const tankHeight = 7
  const tankDepth = 6
  const waterHeight = 4.5
  const waterSurfaceY = -tankHeight / 2 + waterHeight

  // Block dimensions
  const volumeM3 = volumeL / 1000
  const sideLength = Math.cbrt(volumeM3) * 2.8 // Visual scale factor
  const totalMass = objectDensity * volumeM3

  // Physical simulation dynamic state
  const physRef = useRef({
    y: waterSurfaceY + 1.2, // Initial drop position above water
    vy: 0,
    t: 0
  })

  useEffect(() => {
    physRef.current = {
      y: waterSurfaceY + 1.2,
      vy: 0,
      t: 0
    }
  }, [simKey, objectDensity, fluidDensity, volumeL, gravity])

  const blockMeshRef = useRef()
  const waterMeshRef = useRef()
  const arrowUpRef = useRef()
  const arrowDownRef = useRef()

  useFrame((_, delta) => {
    if (!isPlaying) return
    const dt = Math.min(delta, 0.04) * timeScale
    const s = physRef.current
    s.t += dt

    const currentY = s.y
    const blockBottom = currentY - sideLength / 2
    const blockTop = currentY + sideLength / 2

    // Submerged calculation
    let submergedFraction = 0
    if (blockTop <= waterSurfaceY) {
      submergedFraction = 1.0 // Fully submerged
    } else if (blockBottom >= waterSurfaceY) {
      submergedFraction = 0.0 // Completely in air
    } else {
      submergedFraction = (waterSurfaceY - blockBottom) / sideLength
    }

    const V_sub = volumeM3 * submergedFraction
    const Fb = fluidDensity * V_sub * gravity
    const Fg = totalMass * gravity
    const Fnet = Fb - Fg - appliedPush

    // Viscous fluid drag damping
    const fluidDamping = submergedFraction > 0 ? 8.0 * (fluidDensity / 1000) * submergedFraction : 0.2
    const a = (Fnet / totalMass) - (fluidDamping * s.vy)

    s.vy += a * dt
    s.y += s.vy * dt

    // Floor of the tank collision
    const floorY = -tankHeight / 2 + sideLength / 2 + 0.1
    if (s.y < floorY) {
      s.y = floorY
      s.vy = -s.vy * 0.2 // Bounded bounce
    }

    if (blockMeshRef.current) {
      blockMeshRef.current.position.y = s.y
    }

    onTelemetryUpdate({
      submergedPct: Math.min(100, Math.max(0, submergedFraction * 100)),
      Fb,
      Fg,
      Fnet,
      status: objectDensity < fluidDensity ? 'Floating' : objectDensity === fluidDensity ? 'Neutral' : 'Sinking'
    })
  })

  // Material appearance color
  const blockColor = useMemo(() => {
    if (objectDensity < 600) return '#C4A35A' // Wood
    if (objectDensity < 1000) return '#B3D9F7' // Ice
    if (objectDensity < 1500) return '#CBA358' // Plastic/Resin
    if (objectDensity < 4000) return '#8D8176' // Stone
    return '#5A626A' // Steel/Metal
  }, [objectDensity])

  return (
    <group position={[0, 0, 0]}>
      {/* Studio Floor */}
      <gridHelper args={[40, 40, '#CBA358', '#E2D6C3']} position={[0, -tankHeight / 2 - 0.2, 0]} />

      {/* Glass Tank Container */}
      <group position={[0, 0, 0]}>
        {/* Tank Base */}
        <mesh position={[0, -tankHeight / 2, 0]} receiveShadow>
          <boxGeometry args={[tankWidth + 0.6, 0.4, tankDepth + 0.6]} />
          <meshStandardMaterial color="#221C18" metalness={0.7} roughness={0.3} />
        </mesh>

        {/* Transparent Glass Walls */}
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[tankWidth, tankHeight, tankDepth]} />
          <meshPhysicalMaterial
            color="#FFFFFF"
            transparent
            opacity={0.18}
            roughness={0.05}
            metalness={0.1}
            transmission={0.9}
            thickness={0.8}
            depthWrite={false}
          />
        </mesh>

        {/* Tank Corner Framing Posts */}
        {[
          [-tankWidth / 2, -tankDepth / 2],
          [tankWidth / 2, -tankDepth / 2],
          [-tankWidth / 2, tankDepth / 2],
          [tankWidth / 2, tankDepth / 2]
        ].map(([cx, cz], i) => (
          <mesh key={i} position={[cx, 0, cz]}>
            <cylinderGeometry args={[0.08, 0.08, tankHeight, 16]} />
            <meshStandardMaterial color="#CBA358" metalness={0.85} roughness={0.2} />
          </mesh>
        ))}

        {/* Height Scale Markings on Glass */}
        {Array.from({ length: 7 }).map((_, i) => {
          const sy = -tankHeight / 2 + i * 1.0 + 0.5
          return (
            <group key={i} position={[-tankWidth / 2 + 0.02, sy, 0]}>
              <mesh>
                <boxGeometry args={[0.02, 0.04, 0.8]} />
                <meshBasicMaterial color="#CBA358" />
              </mesh>
              <Text
                position={[0.2, 0, 0]}
                rotation={[0, Math.PI / 2, 0]}
                fontSize={0.3}
                color="#6D6254"
              >
                {`${i + 1}m`}
              </Text>
            </group>
          )
        })}
      </group>

      {/* Volumetric Liquid */}
      <mesh position={[0, -tankHeight / 2 + waterHeight / 2, 0]}>
        <boxGeometry args={[tankWidth - 0.1, waterHeight, tankDepth - 0.1]} />
        <meshPhysicalMaterial
          color={fluidDensity > 13000 ? '#B0B0B8' : fluidDensity > 1200 ? '#E5A93C' : fluidDensity < 900 ? '#E2C765' : '#4BA3E3'}
          transparent
          opacity={fluidDensity > 13000 ? 0.95 : 0.55}
          roughness={0.1}
          transmission={fluidDensity > 13000 ? 0 : 0.6}
          depthWrite={false}
        />
      </mesh>

      {/* Submerged Solid Object */}
      <mesh ref={blockMeshRef} position={[0, waterSurfaceY + 0.5, 0]} castShadow>
        <boxGeometry args={[sideLength, sideLength, sideLength]} />
        <meshStandardMaterial
          color={blockColor}
          roughness={0.3}
          metalness={objectDensity > 5000 ? 0.8 : 0.1}
        />
      </mesh>
    </group>
  )
}

// ── MAIN EXPORT COMPONENT ────────────────────────────────────────────────────
export default function BuoyancySim() {
  const [selectedMat, setSelectedMat] = useState(MATERIAL_PRESETS[0]) // Wood
  const [selectedFluid, setSelectedFluid] = useState(FLUID_PRESETS[0]) // Water
  const [volumeL, setVolumeL] = useState(5.0)
  const [appliedPush, setAppliedPush] = useState(0)
  const [gravity, setGravity] = useState(9.81)
  const [isPlaying, setIsPlaying] = useState(true)
  const [timeScale, setTimeScale] = useState(1.0)
  const [simKey, setSimKey] = useState(1)
  const [activeTab, setActiveTab] = useState('controls')
  const [isPanelOpen, setIsPanelOpen] = useState(true)

  const [telemetry, setTelemetry] = useState({
    submergedPct: 50,
    Fb: 49.05,
    Fg: 24.5,
    Fnet: 24.55,
    status: 'Floating'
  })

  const handleReset = () => {
    setSimKey(k => k + 1)
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
      <div className="canvas-container-3d">
        <Canvas
          shadows
          camera={{ position: [0, 2, 12], fov: 46 }}
        >
          <color attach="background" args={['#F7F3EB']} />
          <ambientLight intensity={0.9} />
          <directionalLight
            position={[12, 25, 18]}
            intensity={1.6}
            castShadow
            shadow-mapSize-width={2048}
            shadow-mapSize-height={2048}
          />
          <directionalLight position={[-12, 10, -12]} intensity={0.5} color="#CBA358" />

          <TankScene
            objectDensity={selectedMat.density}
            fluidDensity={selectedFluid.density}
            volumeL={volumeL}
            gravity={gravity}
            appliedPush={appliedPush}
            isPlaying={isPlaying}
            timeScale={timeScale}
            onTelemetryUpdate={setTelemetry}
            simKey={simKey}
          />

          <OrbitControls
            target={[0, 0, 0]}
            maxPolarAngle={Math.PI / 2 + 0.05}
            minDistance={6}
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
            <span style={{ fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Submerged Depth</span>
            <div className="mono" style={{ fontSize: 16, fontWeight: 700, color: 'var(--obsidian-900)' }}>
              {telemetry.submergedPct.toFixed(0)}%
            </div>
          </div>
          <div style={{ width: 1, height: 26, background: 'var(--color-border)' }} />
          <div>
            <span style={{ fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Buoyant Force (Fb)</span>
            <div className="mono" style={{ fontSize: 16, fontWeight: 700, color: '#0D9488' }}>
              {telemetry.Fb.toFixed(1)} N
            </div>
          </div>
          <div style={{ width: 1, height: 26, background: 'var(--color-border)' }} />
          <div>
            <span style={{ fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Flotation Status</span>
            <div style={{ fontSize: 13, fontWeight: 700, color: telemetry.status === 'Floating' ? '#1B7F53' : '#C23B30' }}>
              {telemetry.status}
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
            title="Reset Object Position"
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
            {isPlaying ? 'Pause' : 'Simulate Fluid'}
          </button>
        </div>
      </div>

      {/* Minimized Trigger Button (When Inspector is Closed) */}
      {!isPanelOpen && (
        <button
          onClick={() => setIsPanelOpen(true)}
          className="glass-cream"
          title="Open Materials & Archimedes Controls"
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
                { id: 'controls', label: 'Materials' },
                { id: 'formula', label: 'Archimedes' },
                { id: 'forces', label: 'Forces' },
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
                {/* Solid Object Material Presets */}
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
                    Solid Material Preset
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6, marginTop: 8 }}>
                    {MATERIAL_PRESETS.map(m => (
                      <button
                        key={m.label}
                        onClick={() => {
                          setSelectedMat(m)
                          handleReset()
                        }}
                        style={{
                          padding: '8px 10px',
                          borderRadius: 'var(--radius-md)',
                          border: `1.5px solid ${selectedMat.label === m.label ? 'var(--gold-500)' : 'var(--color-border)'}`,
                          background: selectedMat.label === m.label ? 'var(--color-accent-light)' : '#FFFFFF',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          fontSize: 12,
                          fontWeight: 600,
                          color: 'var(--color-text)'
                        }}
                      >
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: m.color }} />
                        <span>{m.label}</span>
                        <span className="mono" style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--color-text-muted)' }}>
                          {m.density}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Fluid Medium Presets */}
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
                    Immersion Fluid
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6, marginTop: 8 }}>
                    {FLUID_PRESETS.slice(0, 4).map(f => (
                      <button
                        key={f.label}
                        onClick={() => {
                          setSelectedFluid(f)
                          handleReset()
                        }}
                        style={{
                          padding: '8px 10px',
                          borderRadius: 'var(--radius-md)',
                          border: `1.5px solid ${selectedFluid.label === f.label ? 'var(--gold-500)' : 'var(--color-border)'}`,
                          background: selectedFluid.label === f.label ? 'var(--color-accent-light)' : '#FFFFFF',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          fontSize: 12,
                          fontWeight: 600,
                          color: 'var(--color-text)'
                        }}
                      >
                        <span>{f.label}</span>
                        <span className="mono" style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--color-text-muted)' }}>
                          {f.density}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Object Volume */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}>Object Volume</span>
                    <span className="mono" style={{ fontSize: 14, fontWeight: 700, color: 'var(--gold-600)' }}>
                      {volumeL} L
                    </span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={20}
                    step={1}
                    value={volumeL}
                    onChange={e => {
                      setVolumeL(Number(e.target.value))
                      handleReset()
                    }}
                  />
                </div>

                {/* Manual Push-Down Force */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}>Push Down Force</span>
                    <span className="mono" style={{ fontSize: 14, fontWeight: 700, color: '#C23B30' }}>
                      {appliedPush} N
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={appliedPush}
                    onChange={e => setAppliedPush(Number(e.target.value))}
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
                  <span className="badge-gold">Archimedes Principle</span>
                  <p style={{ margin: '8px 0 0 0', fontSize: 13, lineHeight: 1.55, color: 'var(--color-text)' }}>
                    The upward buoyant force equals the weight of displaced fluid:
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
                    F_b = ρ_fluid · V_submerged · g
                  </div>
                </div>

                <div style={{
                  padding: '14px',
                  borderRadius: 'var(--radius-md)',
                  background: '#FFFFFF',
                  border: '1px solid var(--color-border)'
                }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
                    Flotation Ratio
                  </span>
                  <div className="mono" style={{ fontSize: 13, marginTop: 8 }}>
                    V_sub / V_total = ρ_object / ρ_fluid<br />
                    = {selectedMat.density} / {selectedFluid.density} = {(selectedMat.density / selectedFluid.density).toFixed(2)}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'forces' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{
                  padding: '14px',
                  borderRadius: 'var(--radius-md)',
                  background: '#FFFFFF',
                  border: '1px solid var(--color-border)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, color: '#0D9488', fontWeight: 700 }}>
                    <ArrowUp size={16} /> Buoyant Force: {telemetry.Fb.toFixed(1)} N
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#C23B30', fontWeight: 700 }}>
                    <ArrowDown size={16} /> Gravity Force: {telemetry.Fg.toFixed(1)} N
                  </div>
                  <div style={{ width: '100%', height: 1, background: 'var(--color-border)', margin: '10px 0' }} />
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--obsidian-900)' }}>
                    Net Upward Force: {telemetry.Fnet.toFixed(1)} N
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
