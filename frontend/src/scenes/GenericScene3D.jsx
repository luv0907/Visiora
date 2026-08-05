import React, { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RigidBody } from '@react-three/rapier'
import { Text, Trail } from '@react-three/drei'
import * as THREE from 'three'

// Orbit path calculator
function computeOrbitPosition(t, center, semiMajorAxis, eccentricity) {
  const meanAnomaly = t // assume fast orbit
  const E = meanAnomaly + eccentricity * Math.sin(meanAnomaly)
  
  const x = semiMajorAxis * (Math.cos(E) - eccentricity)
  const z = semiMajorAxis * Math.sqrt(1 - eccentricity * eccentricity) * Math.sin(E)
  
  return [center[0] + x, center[1], center[2] + z]
}

export default function GenericScene3D({ concept }) {
  if (!concept || !concept.objects_3d) return null

  return (
    <group>
      {/* Textbook Grid & Axes */}
      <gridHelper args={[40, 40, '#829AB1', '#D5CBBF']} position={[0, -1.99, 0]} opacity={0.6} transparent />
      <axesHelper args={[5]} position={[0, -1.98, 0]} />

      {concept.objects_3d.map((obj) => (
        <GenerativeObject key={obj.id} obj={obj} />
      ))}
      
      {/* Floor */}
      <RigidBody type="fixed" position={[0, -2.5, 0]}>
        <mesh receiveShadow>
          <boxGeometry args={[40, 1, 40]} />
          <meshStandardMaterial color="#FAF6EF" opacity={0.9} transparent />
        </mesh>
      </RigidBody>
    </group>
  )
}

function GenerativeObject({ obj }) {
  const meshRef = useRef()
  const rbRef = useRef()
  
  useFrame((state) => {
    if (!meshRef.current) return
    const t = state.clock.elapsedTime
    
    switch (obj.motion_type) {
      case 'oscillate_y':
        meshRef.current.position.y = obj.position[1] + Math.sin(t * 2) * 2
        break
      case 'decay_oscillate':
        meshRef.current.position.y = obj.position[1] + Math.sin(t * 5) * 2 * Math.exp(-t * 0.2)
        break
      case 'orbit_path':
        if (obj.orbit_path) {
          const { center, semi_major_axis, eccentricity } = obj.orbit_path
          const pos = computeOrbitPosition(t, center, semi_major_axis, eccentricity)
          meshRef.current.position.set(pos[0], pos[1], pos[2])
        }
        break
      case 'rotate_y':
        meshRef.current.rotation.y = t
        break
      default:
        break
    }
  })

  // 1. Render Vector Arrow
  if (obj.type === 'arrow') {
    const dir = new THREE.Vector3(...(obj.direction || [0, 1, 0])).normalize()
    const origin = new THREE.Vector3(...obj.position)
    const length = obj.length || 2
    const color = obj.color || '#EF4444'
    
    // Position label slightly past the tip of the arrow
    const labelPos = origin.clone().add(dir.clone().multiplyScalar(length + 0.4))
    
    return (
      <group>
        <arrowHelper args={[dir, origin, length, color, 0.4, 0.2]} />
        <Text position={labelPos.toArray()} fontSize={0.4} color={color} anchorX="center" anchorY="middle">
          {obj.label}
        </Text>
      </group>
    )
  }

  // 2. Render Physics Falling Object
  if (obj.motion_type === 'fall') {
    const mesh = (
      <mesh castShadow receiveShadow>
        {obj.type === 'box' ? <boxGeometry args={[1, 1, 1]} /> : <sphereGeometry args={[1, 32, 32]} />}
        <meshStandardMaterial color={obj.color || '#3B82F6'} />
        <Text position={[0, 1.5, 0]} fontSize={0.5} color="#1E293B" anchorX="center" anchorY="bottom">
          {obj.label}
        </Text>
      </mesh>
    )

    return (
      <RigidBody ref={rbRef} position={obj.position} colliders="hull" mass={obj.mass || 1}>
        {obj.trail ? (
          <Trail width={1.5} color={obj.color || '#3B82F6'} length={12} decay={1}>
            {mesh}
          </Trail>
        ) : mesh}
      </RigidBody>
    )
  }

  // 3. Render Kinematic/Static Object
  const mainMesh = (
    <mesh ref={meshRef} position={obj.position} castShadow receiveShadow>
      {obj.type === 'box' ? <boxGeometry args={[1.5, 1.5, 1.5]} /> : <sphereGeometry args={[1, 32, 32]} />}
      <meshStandardMaterial color={obj.color || '#8B5CF6'} />
      <Text position={[0, 1.5, 0]} fontSize={0.5} color="#1E293B" anchorX="center" anchorY="bottom">
        {obj.label}
      </Text>
    </mesh>
  )

  if (obj.trail) {
    return (
      <Trail width={1.5} color={obj.color || '#8B5CF6'} length={12} decay={1}>
        {mainMesh}
      </Trail>
    )
  }

  return mainMesh
}
