/**
 * VISIORA — Collision Scene (3D)
 * 
 * Two balls approach and collide. Formula Engine computes post-collision velocities.
 * Rapier handles the visual collision, with restitution set from the formula result.
 */
import React, { useRef, useEffect, useMemo, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { RigidBody } from '@react-three/rapier'
import { Sphere, Html } from '@react-three/drei'
import { usePhysicsStore } from '../store/usePhysicsStore'
import { getSeedSimulation } from '../engine/formulaEngine'
import VectorArrow from './shared/VectorArrow'
import SceneGrid from './shared/SceneGrid'
import VariableChip from './shared/VariableChip'

export default function CollisionScene() {
  const { variables, activeScene, isPlaying, simKey, formulaState } = usePhysicsStore()
  const vars = variables[activeScene] ?? {}

  const m1 = vars.mass1       ?? 2
  const m2 = vars.mass2       ?? 1
  const u1 = vars.velocity1   ?? 5
  const u2 = vars.velocity2   ?? -2
  const e  = vars.restitution ?? 1

  const SCALE = 0.6

  const ball1Ref = useRef()
  const ball2Ref = useRef()
  const [hasCollided, setHasCollided] = useState(false)

  const r1 = useMemo(() => Math.max(0.25, Math.min(1.0, 0.25 + Math.sqrt(m1) * 0.1)), [m1])
  const r2 = useMemo(() => Math.max(0.25, Math.min(1.0, 0.25 + Math.sqrt(m2) * 0.1)), [m2])

  // Spawn positions: ensure enough gap
  const startX1 = -4
  const startX2 = 1.5

  const v1Num = formulaState?.values?.v1 ?? 0
  const v2Num = formulaState?.values?.v2 ?? 0

  // Calculate collision time t_col analytically
  const gapInitial = (startX2 - startX1) - (r1 + r2)
  const relVel = (u1 - u2) * SCALE
  const tCol = relVel > 0 ? Math.max(0, gapInitial / relVel) : 0

  useFrame(() => {
    const t = usePhysicsStore.getState().simTime
    let x1, x2
    if (t <= tCol || relVel <= 0) {
      x1 = startX1 + (u1 * SCALE) * t
      x2 = startX2 + (u2 * SCALE) * t
    } else {
      const dt = t - tCol
      const x1Col = startX1 + (u1 * SCALE) * tCol
      const x2Col = startX2 + (u2 * SCALE) * tCol
      x1 = x1Col + (v1Num * SCALE) * dt
      x2 = x2Col + (v2Num * SCALE) * dt
      // BUG-07: trigger post-collision overlay once
      if (!hasCollided) setHasCollided(true)
    }

    if (ball1Ref.current) {
      ball1Ref.current.setNextKinematicTranslation({ x: x1, y: r1, z: 0 })
    }
    if (ball2Ref.current) {
      ball2Ref.current.setNextKinematicTranslation({ x: x2, y: r2, z: 0 })
    }
  })

  const v1Display = v1Num.toFixed(3)
  const v2Display = v2Num.toFixed(3)
  const collisionType = formulaState?.values?.collisionType ?? ''

  return (
    <group>
      <ambientLight intensity={0.65} color="#FFFFFF" />
      <directionalLight position={[10, 15, 10]} intensity={1.8} castShadow color="#FFF5EA" />
      <directionalLight position={[-8, 6, -6]} intensity={0.5} color="#D9E2EC" />

      <SceneGrid y={0} size={28} />

      {/* Surface Floor */}
      <RigidBody type="fixed" friction={0.02} restitution={e}>
        <mesh position={[0, -0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[30, 10]} />
          <meshStandardMaterial color="#EAE2D5" roughness={0.8} metalness={0.1} />
        </mesh>
      </RigidBody>

      {/* Ball 1 (Deep Navy) */}
      <RigidBody
        ref={ball1Ref}
        type="kinematicPosition"
        position={[startX1, r1, 0]}
        colliders="ball"
      >
        <Sphere args={[r1, 32, 32]} castShadow receiveShadow>
          <meshStandardMaterial
            color="#1B2A41"
            roughness={0.2}
            metalness={0.4}
          />
        </Sphere>
        <Html position={[0, r1 + 0.4, 0]} center distanceFactor={8}>
          <VariableChip>m₁ = {m1}kg · u₁ = {u1}m/s</VariableChip>
        </Html>
      </RigidBody>

      {/* Ball 2 (Crimson) */}
      <RigidBody
        ref={ball2Ref}
        type="kinematicPosition"
        position={[startX2, r2, 0]}
        colliders="ball"
      >
        <Sphere args={[r2, 32, 32]} castShadow receiveShadow>
          <meshStandardMaterial
            color="#C53030"
            roughness={0.2}
            metalness={0.3}
          />
        </Sphere>
        <Html position={[0, r2 + 0.4, 0]} center distanceFactor={8}>
          <VariableChip>m₂ = {m2}kg · u₂ = {u2}m/s</VariableChip>
        </Html>
      </RigidBody>

      {/* Pre-collision velocity arrows */}
      {!isPlaying && (
        <>
          <VectorArrow
            origin={[startX1, r1, 0]}
            direction={[u1 >= 0 ? 1 : -1, 0, 0]}
            magnitude={Math.abs(u1) * 0.2}
            color="#A48FD8"
            label={`u₁ = ${u1} m/s`}
          />
          <VectorArrow
            origin={[startX2, r2, 0]}
            direction={[u2 >= 0 ? 1 : -1, 0, 0]}
            magnitude={Math.abs(u2) * 0.2}
            color="#F896B8"
            label={`u₂ = ${u2} m/s`}
          />
        </>
      )}

      {/* Post-collision results overlay */}
      {hasCollided && (
        <Html position={[0, 3.5, 0]} center distanceFactor={10}>
          <div style={{
            background: 'rgba(255,255,255,0.95)',
            backdropFilter: 'blur(12px)',
            padding: '12px 16px',
            borderRadius: '16px',
            fontFamily: 'var(--font-mono)',
            fontSize: '12px',
            boxShadow: 'var(--shadow-md)',
            border: '1px solid var(--color-border)',
            textAlign: 'center',
          }}>
            <div style={{ color: '#D94F84', fontWeight: '700', marginBottom: '4px' }}>
              {collisionType}
            </div>
            <div style={{ color: '#5A5459' }}>v₁ = {v1Display} m/s</div>
            <div style={{ color: '#5A5459' }}>v₂ = {v2Display} m/s</div>
          </div>
        </Html>
      )}
    </group>
  )
}
