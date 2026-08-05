/**
 * VISIORA — Trajectory Trace
 * Draws a line-geometry trail following a moving object.
 */
import React, { useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

export default function TrajectoryTrace({
  points = [],          // array of [x, y, z] — driven by Formula Engine (2D) or Rapier (3D)
  color = '#F896B8',
  opacity = 0.7,
  lineWidth = 2,
  maxPoints = 500,
}) {
  const lineRef = useRef()
  const posArray = useRef(new Float32Array(maxPoints * 3))
  const count = useRef(0)

  useEffect(() => {
    // When points array is provided (formula-driven trajectory)
    if (points.length > 0) {
      count.current = Math.min(points.length, maxPoints)
      for (let i = 0; i < count.current; i++) {
        posArray.current[i * 3]     = points[i][0] ?? 0
        posArray.current[i * 3 + 1] = points[i][1] ?? 0
        posArray.current[i * 3 + 2] = points[i][2] ?? 0
      }
      if (lineRef.current) {
        lineRef.current.geometry.attributes.position.needsUpdate = true
        lineRef.current.geometry.setDrawRange(0, count.current)
      }
    }
  }, [points, maxPoints])

  if (points.length < 2) return null

  return (
    <line ref={lineRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          array={posArray.current}
          count={maxPoints}
          itemSize={3}
        />
      </bufferGeometry>
      <lineBasicMaterial
        color={color}
        transparent
        opacity={opacity}
        linewidth={lineWidth}
        depthTest={false}
      />
    </line>
  )
}

/**
 * LiveTrajectoryTrace — accumulates positions from a tracked object each frame.
 * Used for Rapier-driven live trace.
 */
export function LiveTrajectoryTrace({ rigidBodyRef, color = '#F896B8', maxPoints = 500 }) {
  const posArray = useRef(new Float32Array(maxPoints * 3))
  const count = useRef(0)
  const lineRef = useRef()

  useFrame(() => {
    if (!rigidBodyRef.current) return
    const pos = rigidBodyRef.current.translation()
    if (!pos) return

    // Append new position
    const idx = count.current % maxPoints
    posArray.current[idx * 3]     = pos.x
    posArray.current[idx * 3 + 1] = pos.y
    posArray.current[idx * 3 + 2] = pos.z
    count.current++

    if (lineRef.current) {
      lineRef.current.geometry.attributes.position.needsUpdate = true
      lineRef.current.geometry.setDrawRange(0, Math.min(count.current, maxPoints))
    }
  })

  return (
    <line ref={lineRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          array={posArray.current}
          count={maxPoints}
          itemSize={3}
        />
      </bufferGeometry>
      <lineBasicMaterial color={color} transparent opacity={0.6} linewidth={2} />
    </line>
  )
}
