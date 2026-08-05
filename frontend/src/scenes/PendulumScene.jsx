/**
 * VISIORA — Pendulum Scene (3D)
 * 
 * Uses Rapier revolute joint for the pendulum simulation.
 * Formula Engine provides authoritative values displayed in the UI.
 */
import React, { useRef, useEffect, useMemo, useState } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { RigidBody, useRevoluteJoint, BallCollider } from '@react-three/rapier'
import { Sphere, Line } from '@react-three/drei'
import { usePhysicsStore } from '../store/usePhysicsStore'
import { getSeedSimulation } from '../engine/formulaEngine'
import VectorArrow from './shared/VectorArrow'
import SceneGrid from './shared/SceneGrid'

const PIVOT_Y = 6

export default function PendulumScene() {
  const { variables, activeScene, isPlaying, isPaused, simKey, formulaState } = usePhysicsStore()
  const vars = variables[activeScene] ?? {}

  const L     = vars.length  ?? 2
  const m     = vars.mass1   ?? 1
  const θdeg  = vars.angle   ?? 30
  const g     = vars.gravity ?? 9.81
  const θ0    = (θdeg * Math.PI) / 180

  // Visual scale — real L maps to 3D scene length
  const SCALE = Math.min(1, 4 / L)

  const scaledL = L * SCALE

  // Initial bob position (displaced by θ0 from vertical)
  const initBx = Math.sin(θ0) * scaledL
  const initBy = PIVOT_Y - Math.cos(θ0) * scaledL

  const pivotRef = useRef()
  const bobRef   = useRef()

  // Bob position for rod drawing
  const bobPos   = useRef([initBx, initBy, 0])

  useEffect(() => {
    if (!bobRef.current) return
    bobRef.current.setNextKinematicTranslation({ x: initBx, y: initBy, z: 0 })
    bobRef.current.setLinvel({ x: 0, y: 0, z: 0 }, true)
    bobRef.current.setAngvel({ x: 0, y: 0, z: 0 }, true)
    bobPos.current = [initBx, initBy, 0]
  }, [simKey, initBx, initBy])

  const bobRadius = useMemo(() =>
    Math.max(0.12, Math.min(0.45, 0.12 + Math.log(m + 1) * 0.08))
  , [m])

  // Dynamic refs for visual updates
  const vVectorRef = useRef({ origin: [0,0,0], direction: [1,0,0], magnitude: 0, vStr: '0.00' })
  const [, forceRender] = useState(0)

  // Track bob position for the rod line and drive kinematic motion
  useFrame(() => {
    if (bobRef.current && formulaState?.values) {
      const t = usePhysicsStore.getState().simTime
      const omega = formulaState.values.ω
      // theta = θ0 * cos(ωt)
      const theta = θ0 * Math.cos(omega * t)
      
      const newX = Math.sin(theta) * scaledL
      const newY = PIVOT_Y - Math.cos(theta) * scaledL
      
      bobRef.current.setNextKinematicTranslation({ x: newX, y: newY, z: 0 })

      // Calculate instantaneous tangential velocity
      // v(t) = L * d(theta)/dt = -L * θ0 * ω * sin(ωt)
      const v_angular = -θ0 * omega * Math.sin(omega * t)
      const v_linear = L * v_angular // actual physical velocity (m/s)
      
      // Tangent vector
      const tx = Math.cos(theta)
      const ty = Math.sin(theta)
      
      // Update vector ref (don't trigger React state every frame to avoid lag)
      vVectorRef.current = {
        origin: [newX, newY, 0],
        direction: Math.sign(v_linear) >= 0 ? [tx, ty, 0] : [-tx, -ty, 0],
        magnitude: Math.abs(v_linear) * 0.2, // scale down visually
        vStr: Math.abs(v_linear).toFixed(2)
      }
      
      // Force a re-render of the arrow occasionally or use a ref-based approach.
      // Actually, since VectorArrow is a React component, let's just trigger a lightweight frame update for it.
      forceRender(prev => prev + 1)
    }

    if (bobRef.current) {
      const t = bobRef.current.translation()
      bobPos.current = [t.x, t.y, t.z]
    }
  })

  const v_max = formulaState?.values?.v_max?.toFixed(3) ?? '—'
  const T = formulaState?.values?.T_corrected?.toFixed(4) ?? '—'

  return (
    <group>
      <ambientLight intensity={0.65} color="#FFFFFF" />
      <directionalLight position={[10, 15, 10]} intensity={1.8} castShadow color="#FFF5EA" />
      <directionalLight position={[-8, 6, -6]} intensity={0.5} color="#D9E2EC" />

      <SceneGrid y={0} size={30} />

      {/* Premium Pivot mount */}
      <mesh position={[0, PIVOT_Y, 0]} castShadow>
        <cylinderGeometry args={[0.18, 0.18, 0.6]} />
        <meshStandardMaterial color="#1B2A41" metalness={0.7} roughness={0.2} />
      </mesh>

      {/* Invisible static pivot anchor */}
      <RigidBody ref={pivotRef} type="fixed" position={[0, PIVOT_Y, 0]}>
        <BallCollider args={[0.05]} sensor />
      </RigidBody>

      {/* Premium 3D Rod (updates via ref) */}
      <PremiumRod pivotPos={[0, PIVOT_Y, 0]} bobPosRef={bobPos} />

      {/* Bob (pendulum mass) */}
      <RigidBody
        ref={bobRef}
        type="kinematicPosition"
        position={[initBx, initBy, 0]}
        colliders="ball"
      >
        <Sphere 
          args={[bobRadius, 32, 32]} 
          castShadow
          receiveShadow
          onPointerOver={() => { document.body.style.cursor = 'grab' }}
          onPointerOut={() => { document.body.style.cursor = 'auto' }}
          onPointerDown={(e) => {
            if (!window.matchMedia('(pointer: fine)').matches) return
            e.stopPropagation()
            e.target.setPointerCapture(e.pointerId)
            usePhysicsStore.getState().pause()
            
            // In R3F, orbit controls are accessible via the default controls manager
            // Or we can just let use-gesture handle it. But the easiest way to disable OrbitControls globally is via CSS pointer-events or finding the controls.
            // Wait, R3F passes the scene state to pointer events.
            const controls = e.camera?.userData?.controls || (window.__visiora_controls)
            if (controls) controls.enabled = false
            
            document.body.style.cursor = 'grabbing'
            // Store initial click state
            bobRef.current.__isDragging = true
          }}
          onPointerMove={(e) => {
            if (!bobRef.current?.__isDragging) return
            e.stopPropagation()
            
            // Map the ray intersection on the Z=0 plane
            const intersect = new THREE.Vector3()
            const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0)
            e.ray.intersectPlane(plane, intersect)
            
            if (intersect) {
              const dx = intersect.x - 0
              const dy = PIVOT_Y - intersect.y
              
              // New Length L (distance from pivot)
              const newScaledL = Math.sqrt(dx*dx + dy*dy)
              const newL = newScaledL / SCALE
              
              // New Angle theta (angle from vertical)
              let newTheta = Math.atan2(dx, dy) * (180 / Math.PI)
              
              // Update Zustand store!
              usePhysicsStore.getState().setVariable('angle', newTheta)
              usePhysicsStore.getState().setVariable('length', newL)
            }
          }}
          onPointerUp={(e) => {
            e.stopPropagation()
            e.target.releasePointerCapture(e.pointerId)
            bobRef.current.__isDragging = false
            document.body.style.cursor = 'grab'
            const controls = e.camera?.userData?.controls || (window.__visiora_controls)
            if (controls) controls.enabled = true
          }}
        >
          <meshStandardMaterial
            color="#C53030"
            roughness={0.2}
            metalness={0.4}
          />
        </Sphere>
      </RigidBody>

      {/* Equilibrium line (dashed vertical) */}
      <TraceVertical x={0} yBottom={0} yTop={PIVOT_Y} />

      {/* Amplitude Arc Trace */}
      <AmplitudeArc pivotY={PIVOT_Y} L={scaledL} theta0={θ0} />

      {/* Dynamic Velocity vector at bob */}
      {isPlaying && (
        <VectorArrow
          origin={vVectorRef.current.origin}
          direction={vVectorRef.current.direction}
          magnitude={vVectorRef.current.magnitude}
          color="#7CC8AB"
          label={`v = ${vVectorRef.current.vStr} m/s`}
          visible={vVectorRef.current.magnitude > 0.01}
        />
      )}
    </group>
  )
}

function PremiumRod({ pivotPos, bobPosRef }) {
  const meshRef = useRef()

  useFrame(() => {
    if (!meshRef.current) return
    const bp = bobPosRef.current
    
    // Midpoint
    const midX = (pivotPos[0] + bp[0]) / 2
    const midY = (pivotPos[1] + bp[1]) / 2
    
    // Length
    const dx = bp[0] - pivotPos[0]
    const dy = bp[1] - pivotPos[1]
    const len = Math.sqrt(dx*dx + dy*dy)
    
    // Angle
    const angle = Math.atan2(dy, dx)
    
    meshRef.current.position.set(midX, midY, 0)
    meshRef.current.rotation.z = angle - Math.PI / 2 // cylinder defaults to Y axis
    meshRef.current.scale.y = len
  })

  return (
    <mesh ref={meshRef} castShadow>
      <cylinderGeometry args={[0.02, 0.02, 1, 8]} />
      <meshStandardMaterial color="#C9B8EF" metalness={0.4} roughness={0.3} />
    </mesh>
  )
}

function AmplitudeArc({ pivotY, L, theta0 }) {
  const points = []
  const segments = 30
  for (let i = 0; i <= segments; i++) {
    const t = -theta0 + (i / segments) * (2 * theta0)
    points.push(Math.sin(t) * L, pivotY - Math.cos(t) * L, 0)
  }
  return (
    <line>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={points.length / 3} array={new Float32Array(points)} itemSize={3} />
      </bufferGeometry>
      <lineDashedMaterial color="#E4D9F7" dashSize={0.2} gapSize={0.1} transparent opacity={0.6} />
    </line>
  )
}



function TraceVertical({ x, yBottom, yTop }) {
  return (
    <line>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          array={new Float32Array([x, yBottom, 0, x, yTop, 0])}
          count={2}
          itemSize={3}
        />
      </bufferGeometry>
      <lineBasicMaterial color="#FFD6E8" linewidth={1} />
    </line>
  )
}
