/**
 * VISIORA — Projectile Motion Scene (3D)
 * 
 * Formula Engine computes trajectory. Rapier simulates the ball.
 * Trajectory trace drawn from formula-computed points.
 */
import React, { useRef, useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { RigidBody } from '@react-three/rapier'
import { Sphere, Html } from '@react-three/drei'
import { usePhysicsStore } from '../store/usePhysicsStore'
import { getSeedSimulation } from '../engine/formulaEngine'
import VectorArrow from './shared/VectorArrow'
import TrajectoryTrace from './shared/TrajectoryTrace'
import SceneGrid from './shared/SceneGrid'

export default function ProjectileScene() {
  const { variables, activeScene, isPlaying, simKey, formulaState } = usePhysicsStore()
  const vars = variables[activeScene] ?? {}

  const ballRef = useRef()
  const seed = useMemo(() => getSeedSimulation('projectile', vars), [vars])

  const v0    = vars.velocity ?? 20
  const θdeg  = vars.angle    ?? 45
  const h0    = vars.height   ?? 0
  const g     = vars.gravity  ?? 9.81
  const θ     = (θdeg * Math.PI) / 180
  const v0x   = v0 * Math.cos(θ)
  const v0y   = v0 * Math.sin(θ)

  // Scale factor: formula uses real distances, scene uses compressed 3D space
  const SCALE = 0.4

  // Formula-driven trajectory (for the ghost trace)
  const tracePoints = useMemo(() => {
    const series = formulaState?.graphSeries?.trajectory
    if (!series) return []
    return series.map(p => [
      -8 + p.x * SCALE,
      h0 * SCALE + 0.3 + p.y * SCALE,
      0
    ])
  }, [formulaState, h0])

  // The ball should start at height h0 + ball radius
  const launchPos = useMemo(() => [-8, h0 * SCALE + 0.3, 0], [h0])

  // Reset on simKey
  useEffect(() => {
    if (!ballRef.current) return
    // Restore kinematic type (in case last run switched it to dynamic)
    ballRef.current.setBodyType(2)  // 2 = KinematicPositionBased
    ballRef.current.setGravityScale(0)
    ballRef.current.setNextKinematicTranslation({ x: launchPos[0], y: launchPos[1], z: launchPos[2] })
    ballRef.current.setLinvel({ x: 0, y: 0, z: 0 }, true)
    ballRef.current.setAngvel({ x: 0, y: 0, z: 0 }, true)
    landedRef.current = false
  }, [simKey, launchPos])

  // Track whether we've already transitioned to dynamic physics (post-landing)
  const landedRef = useRef(false)

  // Kinematic playback driven exactly by simTime
  useFrame(() => {
    if (!ballRef.current) return
    const values = formulaState?.values
    if (!values) return
    const { T, v0x, v0y, g } = values
    const t = usePhysicsStore.getState().simTime

    const currentT = Math.min(Math.max(0, t), T)
    const x = v0x * currentT
    const y = Math.max(0, v0y * currentT - 0.5 * g * currentT * currentT)
    ballRef.current.setNextKinematicTranslation({
      x: -8 + x * SCALE,
      y: h0 * SCALE + 0.3 + y * SCALE,
      z: 0
    })

    if (t >= T && isPlaying) {
      usePhysicsStore.getState().pause()
    }
  })

  return (
    <group>
      <ambientLight intensity={0.65} color="#FFFFFF" />
      <directionalLight position={[10, 15, 10]} intensity={1.8} castShadow color="#FFF5EA" />
      <directionalLight position={[-8, 6, -6]} intensity={0.5} color="#D9E2EC" />

      <SceneGrid y={0} size={40} />

      {/* Ground Floor */}
      <RigidBody type="fixed" friction={0.3} restitution={0.2}>
        <mesh position={[0, -0.01, 0]} receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[60, 20]} />
          <meshStandardMaterial color="#EAE2D5" roughness={0.8} metalness={0.1} />
        </mesh>
      </RigidBody>

      {/* Formula-driven trajectory ghost */}
      <TrajectoryTrace
        points={tracePoints}
        color="#C53030"
        opacity={0.6}
      />

      {/* Premium Launch Tower Base */}
      {h0 > 0 && (
        <mesh position={[-8, (h0 * SCALE) / 2, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.6, 0.8, h0 * SCALE, 32]} />
          <meshStandardMaterial color="#3D6B8C" roughness={0.4} metalness={0.3} />
        </mesh>
      )}

      {/* Launcher Turret Joint */}
      <group position={[-8, h0 * SCALE, 0]}>
        {/* Swivel Base */}
        <mesh castShadow receiveShadow>
          <sphereGeometry args={[0.5, 32, 32]} />
          <meshStandardMaterial color="#1B2A41" roughness={0.3} metalness={0.6} />
        </mesh>
        
        {/* Cannon Barrel (rotated by launch angle) */}
        <group 
          rotation={[0, 0, θ]}
          onPointerOver={() => { document.body.style.cursor = 'grab' }}
          onPointerOut={() => { document.body.style.cursor = 'auto' }}
          onPointerDown={(e) => {
            // Only allow drag-to-aim on devices with a fine pointer (mouse).
            // On touch devices, dragging should rotate the camera, not the cannon.
            if (!window.matchMedia('(pointer: fine)').matches) return

            e.stopPropagation()
            e.target.setPointerCapture(e.pointerId)
            usePhysicsStore.getState().pause()
            
            const controls = e.camera?.userData?.controls || (window.__visiora_controls)
            if (controls) controls.enabled = false
            
            document.body.style.cursor = 'grabbing'
            e.object.userData.__isDragging = true
          }}
          onPointerMove={(e) => {
            if (!e.object.userData.__isDragging) return
            e.stopPropagation()
            
            const intersect = new THREE.Vector3()
            const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0)
            e.ray.intersectPlane(plane, intersect)
            
            if (intersect) {
              const dx = intersect.x - (-8)
              const dy = intersect.y - (h0 * SCALE)
              
              let newTheta = Math.atan2(dy, dx) * (180 / Math.PI)
              
              usePhysicsStore.getState().setVariable('angle', newTheta)
            }
          }}
          onPointerUp={(e) => {
            e.stopPropagation()
            e.target.releasePointerCapture(e.pointerId)
            e.object.userData.__isDragging = false
            document.body.style.cursor = 'grab'
            const controls = e.camera?.userData?.controls || (window.__visiora_controls)
            if (controls) controls.enabled = true
          }}
        >
          {/* Invisible hit area for drag-to-aim — no visible geometry */}
          <mesh position={[0.6, 0, 0]} rotation={[0, 0, -Math.PI/2]}>
            <cylinderGeometry args={[0.45, 0.45, 1.4, 8]} />
            <meshBasicMaterial transparent opacity={0} />
          </mesh>
        </group>
      </group>

      {/* Projectile ball */}
      <RigidBody
        ref={ballRef}
        type="kinematicPosition"
        position={launchPos}
        colliders="ball"
        restitution={0.5}
        friction={0.1}
        gravityScale={0}
      >
        <Sphere args={[0.35, 32, 32]} castShadow receiveShadow>
          <meshStandardMaterial
            color="#1B2A41"
            roughness={0.2}
            metalness={0.5}
          />
        </Sphere>
      </RigidBody>

      {/* Target Landing Zone Marker */}
      <mesh position={[-8 + (formulaState?.values?.R || 0) * SCALE, 0.01, 0]} rotation={[-Math.PI/2, 0, 0]} receiveShadow>
        <ringGeometry args={[0.4, 0.8, 32]} />
        <meshStandardMaterial color="#7CC8AB" emissive="#7CC8AB" emissiveIntensity={0.5} transparent opacity={0.8} />
      </mesh>

      {/* Launch velocity vector */}
      <VectorArrow
        origin={launchPos}
        direction={[Math.cos(θ), Math.sin(θ), 0]}
        magnitude={v0 * 0.12}
        color="#A48FD8"
        label={`v₀ = ${v0} m/s`}
        visible={!isPlaying}
      />

      {/* Horizontal component */}
      <VectorArrow
        origin={launchPos}
        direction={[1, 0, 0]}
        magnitude={v0x * 0.12}
        color="#7CC8AB"
        label={`vₓ = ${v0x.toFixed(1)}`}
        visible={!isPlaying}
      />

      {/* Vertical component */}
      <VectorArrow
        origin={launchPos}
        direction={[0, 1, 0]}
        magnitude={v0y * 0.12}
        color="#FFE0C2"
        label={`vᵧ = ${v0y.toFixed(1)}`}
        visible={!isPlaying}
      />

      {/* Angle arc indicator */}
      <AngleArc angle={θ} origin={launchPos} radius={1.2} />

      {/* Live flight stats HUD — disambiguates launch height from max height */}
      <Html position={[0, 5.5, 0]} center distanceFactor={12}>
        <div style={{
          background: 'rgba(27,42,65,0.88)',
          backdropFilter: 'blur(12px)',
          padding: '8px 14px',
          borderRadius: '12px',
          fontFamily: 'var(--font-mono)',
          fontSize: '11px',
          color: '#E4D9F7',
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
          border: '1px solid rgba(255,255,255,0.12)',
          minWidth: '160px',
          pointerEvents: 'none',
        }}>
          <div style={{ color: '#A48FD8', fontWeight: '700', marginBottom: '5px', fontSize: '10px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Flight Stats
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
            <span style={{ color: '#9BBCD4' }}>h₀ launch</span>
            <span style={{ color: '#FFE0C2', fontWeight: '600' }}>{h0.toFixed(1)} m</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
            <span style={{ color: '#9BBCD4' }}>H_max peak</span>
            <span style={{ color: '#7CC8AB', fontWeight: '600' }}>
              {(formulaState?.values?.H_max ?? 0).toFixed(1)} m
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
            <span style={{ color: '#9BBCD4' }}>Range (R)</span>
            <span style={{ color: '#F896B8', fontWeight: '600' }}>
              {(formulaState?.values?.R ?? 0).toFixed(1)} m
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#9BBCD4' }}>Time (T)</span>
            <span style={{ color: '#E4D9F7', fontWeight: '600' }}>
              {(formulaState?.values?.T ?? 0).toFixed(2)} s
            </span>
          </div>
        </div>
      </Html>
    </group>
  )
}

function AngleArc({ angle, origin, radius }) {
  const points = useMemo(() => {
    const pts = []
    const steps = 20
    for (let i = 0; i <= steps; i++) {
      const a = (angle * i) / steps
      pts.push([
        origin[0] + radius * Math.cos(a),
        origin[1] + radius * Math.sin(a),
        origin[2],
      ])
    }
    return pts
  }, [angle, origin, radius])

  if (points.length < 2) return null

  return <TrajectoryTrace points={points} color="#C9B8EF" opacity={0.7} />
}
