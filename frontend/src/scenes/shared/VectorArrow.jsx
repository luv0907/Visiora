/**
 * VISIORA — Vector Arrow (3D)
 * Renders a 3D velocity/force/acceleration arrow.
 * Origin + direction + magnitude → visual arrow with label.
 */
import React, { useMemo } from 'react'
import { Html } from '@react-three/drei'
import * as THREE from 'three'

const SHAFT_SEGMENTS = 8

export default function VectorArrow({
  origin = [0, 0, 0],
  direction = [0, 1, 0],
  magnitude = 1,
  color = '#F896B8',
  label = '',
  scale = 1,
  visible = true,
}) {
  if (!visible || magnitude < 0.01) return null

  const length = Math.min(magnitude * scale, 8)  // cap visual length
  const dir = useMemo(() => new THREE.Vector3(...direction).normalize(), [direction])

  // Quaternion to rotate Y-axis (default cylinder axis) to the direction
  const quat = useMemo(() => {
    const q = new THREE.Quaternion()
    q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir)
    return q
  }, [dir])

  const shaftLength = Math.max(0.01, length * 0.8)
  const headLength  = length * 0.2
  const shaftRadius = 0.04
  const headRadius  = 0.1

  // Shaft midpoint in world space
  const shaftPos = useMemo(() => {
    const v = dir.clone().multiplyScalar(shaftLength / 2)
    return [origin[0] + v.x, origin[1] + v.y, origin[2] + v.z]
  }, [origin, dir, shaftLength])

  // Head position
  const headPos = useMemo(() => {
    const v = dir.clone().multiplyScalar(shaftLength + headLength / 2)
    return [origin[0] + v.x, origin[1] + v.y, origin[2] + v.z]
  }, [origin, dir, shaftLength, headLength])

  // Label position (tip)
  const tipPos = useMemo(() => {
    const v = dir.clone().multiplyScalar(length + 0.3)
    return [origin[0] + v.x, origin[1] + v.y, origin[2] + v.z]
  }, [origin, dir, length])

  return (
    <group>
      {/* Shaft */}
      <mesh position={shaftPos} quaternion={[quat.x, quat.y, quat.z, quat.w]}>
        <cylinderGeometry args={[shaftRadius, shaftRadius, shaftLength, SHAFT_SEGMENTS]} />
        <meshStandardMaterial color={color} roughness={0.4} metalness={0.2} />
      </mesh>

      {/* Arrowhead */}
      <mesh position={headPos} quaternion={[quat.x, quat.y, quat.z, quat.w]}>
        <coneGeometry args={[headRadius, headLength, SHAFT_SEGMENTS]} />
        <meshStandardMaterial color={color} roughness={0.3} metalness={0.3} />
      </mesh>

      {/* Label */}
      {label && (
        <Html position={tipPos} center distanceFactor={10} occlude>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            fontWeight: '600',
            color,
            background: 'rgba(255,255,255,0.85)',
            backdropFilter: 'blur(6px)',
            padding: '2px 6px',
            borderRadius: '4px',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
          }}>
            {label}
          </div>
        </Html>
      )}
    </group>
  )
}
