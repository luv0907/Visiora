/**
 * VISIORA — Angular Momentum Scene (3D)
 * 
 * Spinning figure — pulling arms in increases angular speed.
 * Formula Engine computes ω₂ from conservation law.
 * Rapier used for the spinning disk, arms animated procedurally.
 */
import React, { useRef, useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { RigidBody } from '@react-three/rapier'
import { Cylinder, Sphere, Html } from '@react-three/drei'
import { usePhysicsStore } from '../store/usePhysicsStore'
import SceneGrid from './shared/SceneGrid'

export default function AngularMomentumScene() {
  const { variables, activeScene, isPlaying, simKey, formulaState } = usePhysicsStore()
  const vars = variables[activeScene] ?? {}

  const ω0  = vars.angularVelocity ?? 3
  const r1  = vars.armRadius       ?? 1.5
  const M   = vars.mass1           ?? 60

  const ω2  = formulaState?.values?.ω2  ?? ω0
  const L   = formulaState?.values?.L   ?? 0

  // Current angular velocity — interpolates toward ω2 as user changes arm radius
  const currentOmega = useRef(ω0)
  const currentRadius = useRef(r1)
  const angle = useRef(0)
  const groupRef = useRef()
  const leftArmRef = useRef()
  const rightArmRef = useRef()

  useEffect(() => {
    angle.current = 0
    currentOmega.current = ω0
    currentRadius.current = r1
  }, [simKey])

  useFrame(() => {
    if (!groupRef.current) return
    const t = usePhysicsStore.getState().simTime
    
    // Position arms and rotation deterministically based on t
    const curR = r1
    const curOmega = formulaState?.values?.ω0 ?? ω0
    groupRef.current.rotation.y = curOmega * t

    if (leftArmRef.current)  leftArmRef.current.position.x  = -curR
    if (rightArmRef.current) rightArmRef.current.position.x = curR
  })

  const bodyRadius = 0.25
  const bodyHeight = 1.2

  return (
    <group>
      <ambientLight intensity={0.65} color="#FFFFFF" />
      <directionalLight position={[10, 15, 10]} intensity={1.8} castShadow color="#FFF5EA" />
      <directionalLight position={[-8, 6, -6]} intensity={0.5} color="#D9E2EC" />

      <SceneGrid y={0} size={24} />

      {/* Surface Floor */}
      <RigidBody type="fixed">
        <mesh position={[0, -0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[20, 20]} />
          <meshStandardMaterial color="#EAE2D5" roughness={0.8} metalness={0.1} />
        </mesh>
      </RigidBody>

      {/* Spinning body group */}
      <group ref={groupRef} position={[0, bodyHeight / 2 + 0.05, 0]}>
        {/* Core body (cylinder) */}
        <Cylinder args={[bodyRadius, bodyRadius, bodyHeight, 16]} castShadow receiveShadow>
          <meshStandardMaterial
            color="#1B2A41"
            roughness={0.2}
            metalness={0.5}
          />
        </Cylinder>

        {/* Head */}
        <Sphere args={[bodyRadius * 0.9, 16, 16]} position={[0, bodyHeight / 2 + 0.2, 0]} castShadow receiveShadow>
          <meshStandardMaterial
            color="#3D6B8C"
            roughness={0.3}
            metalness={0.4}
          />
        </Sphere>

        {/* Left arm */}
        <group ref={leftArmRef} position={[-r1, 0.2, 0]}>
          <Cylinder
            args={[0.07, 0.07, r1 + 0.1, 8]}
            rotation={[0, 0, Math.PI / 2]}
            position={[-(r1 / 2 - 0.05), 0, 0]}
            castShadow
          >
            <meshStandardMaterial color="#3D6B8C" roughness={0.3} metalness={0.4} />
          </Cylinder>
          {/* Hand/weight */}
          <Sphere args={[0.15, 16, 16]} castShadow receiveShadow>
            <meshStandardMaterial color="#C53030" roughness={0.2} metalness={0.5} />
          </Sphere>
        </group>

        {/* Right arm */}
        <group 
          ref={rightArmRef} 
          position={[r1, 0.2, 0]}
          onPointerOver={() => { document.body.style.cursor = 'grab' }}
          onPointerOut={() => { document.body.style.cursor = 'auto' }}
          onPointerDown={(e) => {
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
            // In this scene, the disk is spinning around Y. We drag the arms in the XZ plane.
            const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
            e.ray.intersectPlane(plane, intersect)
            
            if (intersect) {
              // Calculate distance from center (0,0) in XZ plane
              const dist = Math.sqrt(intersect.x * intersect.x + intersect.z * intersect.z)
              usePhysicsStore.getState().setVariable('armRadius', dist)
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
          <Cylinder
            args={[0.07, 0.07, r1 + 0.1, 8]}
            rotation={[0, 0, Math.PI / 2]}
            position={[(r1 / 2 - 0.05), 0, 0]}
            castShadow
          >
            <meshPhysicalMaterial color="#E4D9F7" roughness={0.3} metalness={0.4} />
          </Cylinder>
          <Sphere args={[0.12, 12, 12]} castShadow>
            <meshPhysicalMaterial color="#A48FD8" roughness={0.2} metalness={0.6} clearcoat={0.8} />
          </Sphere>
        </group>
      </group>

      {/* Live readout overlay */}
      <Html position={[2.5, 3, 0]} distanceFactor={10}>
        <div style={{
          background: 'rgba(255,255,255,0.92)',
          backdropFilter: 'blur(12px)',
          padding: '10px 14px',
          borderRadius: '14px',
          fontFamily: 'var(--font-mono)',
          fontSize: '11px',
          boxShadow: 'var(--shadow-md)',
          border: '1px solid var(--color-border)',
          minWidth: '140px',
        }}>
          <div style={{ color: '#D94F84', fontWeight: '700', marginBottom: '4px' }}>Angular Momentum</div>
          <div style={{ color: '#5A5459' }}>ω₁ = {ω0.toFixed(2)} rad/s</div>
          <div style={{ color: '#5A5459' }}>ω₂ = {ω2.toFixed(3)} rad/s</div>
          <div style={{ color: '#A48FD8', marginTop: '4px', fontWeight: '600' }}>
            L = {L.toFixed(3)} kg·m²/s
          </div>
        </div>
      </Html>
    </group>
  )
}
