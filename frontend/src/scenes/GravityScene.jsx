/**
 * VISIORA — Gravity / Free Fall Scene (3D)
 * 
 * Rapier seeded by Formula Engine. Two balls of different mass fall simultaneously.
 * Demonstrates equal acceleration regardless of mass.
 */
import React, { useRef, useEffect, useMemo, useCallback } from 'react'
import { useFrame } from '@react-three/fiber'
import { RigidBody, useRapier } from '@react-three/rapier'
import { Html, Sphere } from '@react-three/drei'
import { usePhysicsStore } from '../store/usePhysicsStore'
import { getSeedSimulation } from '../engine/formulaEngine'
import VectorArrow from './shared/VectorArrow'
import { LiveTrajectoryTrace } from './shared/TrajectoryTrace'
import SceneGrid from './shared/SceneGrid'
import VariableChip from './shared/VariableChip'

export default function GravityScene() {
  const { variables, activeScene, isPlaying, simKey, formulaState } = usePhysicsStore()
  const vars = variables[activeScene] ?? {}
  const seed = useMemo(() => getSeedSimulation('gravity', vars), [vars])

  const ball1Ref = useRef()
  const ball2Ref = useRef()
  const hasDropped = useRef(false)

  const { rapier, world } = useRapier()

  const r1 = seed?.bodies?.[0]?.radius ?? 0.3
  const r2 = seed?.bodies?.[1]?.radius ?? 0.9

  // Reset on simKey change
  useEffect(() => {
    hasDropped.current = false
    const h = vars.height ?? 20
    const resetBall = (ref, x, r) => {
      if (!ref.current) return
      ref.current.setNextKinematicTranslation({ x, y: h * 0.4 + r, z: 0 })
      ref.current.setLinvel({ x: 0, y: 0, z: 0 }, true)
      ref.current.setAngvel({ x: 0, y: 0, z: 0 }, true)
    }
    resetBall(ball1Ref, -2.5, r1)
    resetBall(ball2Ref,  2.5, r2)
  }, [simKey, vars.height, r1, r2])

  // Kinematic playback driven exactly by simTime
  useFrame(() => {
    const values = formulaState?.values
    if (!values) return
    const { T, h, g } = values
    const t = usePhysicsStore.getState().simTime
    
    // Clamp time to time-of-fall T
    const currentT = Math.min(Math.max(0, t), T)
    const y = Math.max(0, h - 0.5 * g * currentT * currentT)
    
    if (ball1Ref.current) {
      ball1Ref.current.setNextKinematicTranslation({ x: -2.5, y: y * 0.4 + r1, z: 0 })
    }
    if (ball2Ref.current) {
      ball2Ref.current.setNextKinematicTranslation({ x: 2.5, y: y * 0.4 + r2, z: 0 })
    }

    // Auto-pause when hitting the ground
    if (t >= T && isPlaying) {
      usePhysicsStore.getState().pause()
    }
  })

  const h = vars.height ?? 20
  const g = vars.gravity ?? 9.81
  const m1 = vars.mass1 ?? 1
  const m2 = vars.mass2 ?? 50


  return (
    <group>
      {/* Lighting for high contrast Cream + Navy palette */}
      <ambientLight intensity={0.65} color="#FFFFFF" />
      <directionalLight
        position={[10, 15, 10]}
        intensity={1.8}
        castShadow
        shadow-mapSize={[1024, 1024]}
        color="#FFF5EA"
      />
      <directionalLight position={[-8, 6, -6]} intensity={0.5} color="#D9E2EC" />

      <SceneGrid y={0} size={30} />

      {/* Ground Floor */}
      <RigidBody type="fixed" friction={0.8} restitution={0.3}>
        <mesh position={[0, -0.01, 0]} receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[40, 40]} />
          <meshStandardMaterial color="#EAE2D5" roughness={0.8} metalness={0.1} />
        </mesh>
      </RigidBody>

      {/* Ball 1 (light mass - Deep Navy) */}
      <RigidBody
        ref={ball1Ref}
        type="kinematicPosition"
        position={[-2.5, h * 0.4 + r1, 0]}
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
          <VariableChip>m₁ = {m1} kg</VariableChip>
        </Html>
      </RigidBody>

      {/* Ball 2 (heavy mass - Crimson Accent) */}
      <RigidBody
        ref={ball2Ref}
        type="kinematicPosition"
        position={[2.5, h * 0.4 + r2, 0]}
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
          <VariableChip>m₂ = {m2} kg</VariableChip>
        </Html>
      </RigidBody>

      {/* Gravity vector arrows */}
      <VectorArrow
        origin={[-2.5, h * 0.4 + r1, 0]}
        direction={[0, -1, 0]}
        magnitude={g * 0.15}
        color="#A48FD8"
        label="g"
        scale={1}
        visible={isPlaying}
      />
      <VectorArrow
        origin={[2.5, h * 0.4 + r2, 0]}
        direction={[0, -1, 0]}
        magnitude={g * 0.15}
        color="#F896B8"
        label="g"
        scale={1}
        visible={isPlaying}
      />

      {/* Height indicator */}
      <Html position={[0, (h * 0.4) / 2, 0]} center distanceFactor={12}>
        <div style={{
          writing: 'vertical-lr',
          fontFamily: 'var(--font-mono)',
          fontSize: '10px',
          color: 'var(--color-text-muted)',
          background: 'rgba(255,255,255,0.7)',
          padding: '2px 4px',
          borderRadius: '4px',
          whiteSpace: 'nowrap',
        }}>
          h = {(vars.height ?? 20).toFixed(1)} m
        </div>
      </Html>
    </group>
  )
}
