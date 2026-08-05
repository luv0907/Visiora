import React, { useEffect, useRef, useState } from 'react'
import { usePhysicsStore } from '../../store/usePhysicsStore'

export default function CollisionDiagram({ formulaState }) {
  if (!formulaState) return null

  const { values } = formulaState
  const { m1, m2, u1, u2, v1, v2, p_before, p_after } = values

  const r1 = Math.max(20, Math.min(60, 20 + Math.sqrt(m1) * 10))
  const r2 = Math.max(20, Math.min(60, 20 + Math.sqrt(m2) * 10))

  const width = 800
  const height = 400
  const trackY = height / 2 + 50

  // We simulate the collision happening at x = 400
  // Initial positions
  const startX1 = 200
  const startX2 = 600

  // Calculate when they collide
  // Distance = 400 - (r1 + r2). Relative speed = u1 - u2
  // But wait, they might not collide if u1 <= u2.
  const distance = startX2 - startX1 - r1 - r2
  const relSpeed = u1 - u2
  const tCollide = relSpeed > 0 ? distance / relSpeed : Infinity

  const [pos1, setPos1] = useState(startX1)
  const [pos2, setPos2] = useState(startX2)
  const [hasCollided, setHasCollided] = useState(false)
  const reqRef = useRef()

  useEffect(() => {
    const renderLoop = () => {
      const state = usePhysicsStore.getState()
      const t = state.simTime

      let currentX1 = startX1
      let currentX2 = startX2
      let collided = false

      if (t < tCollide) {
        currentX1 = startX1 + u1 * t
        currentX2 = startX2 + u2 * t
      } else {
        collided = true
        const impactX1 = startX1 + u1 * tCollide
        const impactX2 = startX2 + u2 * tCollide
        const timeAfter = t - tCollide
        currentX1 = impactX1 + v1 * timeAfter
        currentX2 = impactX2 + v2 * timeAfter
      }

      setPos1(currentX1)
      setPos2(currentX2)
      setHasCollided(collided)

      reqRef.current = requestAnimationFrame(renderLoop)
    }
    reqRef.current = requestAnimationFrame(renderLoop)
    return () => cancelAnimationFrame(reqRef.current)
  }, [u1, u2, v1, v2, tCollide])

  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: '100%', display: 'block' }}>
      <rect width="100%" height="100%" fill="#F8F9FA" />

      {/* Grid overlay */}
      <defs>
        <pattern id="grid-ang" width="50" height="50" patternUnits="userSpaceOnUse">
          <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#e0e0e0" strokeWidth="1"/>
        </pattern>
        <marker id="arrow-red" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#FF5E5E" />
        </marker>
        <marker id="arrow-blue" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#2196F3" />
        </marker>
        <pattern id="hatch-track" width="10" height="10" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
          <line x1="0" y1="0" x2="0" y2="10" stroke="#ccc" strokeWidth="2" />
        </pattern>
      </defs>
      <rect x="0" y="0" width={width} height={height} fill="url(#grid-ang)" />

      {/* Horizontal Track */}
      <line x1={0} y1={trackY} x2={width} y2={trackY} stroke="#999" strokeWidth="4" />
      <pattern id="hatch-track" width="10" height="10" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
        <line x1="0" y1="0" x2="0" y2="10" stroke="#ccc" strokeWidth="2" />
      </pattern>
      <rect x={0} y={trackY} width={width} height="20" fill="url(#hatch-track)" />

      {/* Ball 1 */}
      <circle cx={pos1} cy={trackY - r1} r={r1} fill="#FF5E5E" stroke="#fff" strokeWidth="2" />
      <text x={pos1} y={trackY - r1 + 5} fill="#fff" fontSize="16" fontWeight="bold" textAnchor="middle" fontFamily="sans-serif">
        {m1}kg
      </text>

      {/* Ball 2 */}
      <circle cx={pos2} cy={trackY - r2} r={r2} fill="#2196F3" stroke="#fff" strokeWidth="2" />
      <text x={pos2} y={trackY - r2 + 5} fill="#fff" fontSize="16" fontWeight="bold" textAnchor="middle" fontFamily="sans-serif">
        {m2}kg
      </text>

      {/* Velocity Vectors */}
      {(!hasCollided ? u1 !== 0 : v1 !== 0) && (
        <g transform={`translate(${pos1}, ${trackY - r1 * 2 - 10})`}>
          <line x1="0" y1="0" x2={(!hasCollided ? u1 : v1) * 10} y2="0" stroke="#FF5E5E" strokeWidth="3" markerEnd="url(#arrow-red)" />
          <text x={((!hasCollided ? u1 : v1) * 10) / 2} y="-10" fill="#FF5E5E" fontSize="14" textAnchor="middle" fontFamily="sans-serif">
            v = {(!hasCollided ? u1 : v1).toFixed(1)}
          </text>
        </g>
      )}

      {(!hasCollided ? u2 !== 0 : v2 !== 0) && (
        <g transform={`translate(${pos2}, ${trackY - r2 * 2 - 10})`}>
          <line x1="0" y1="0" x2={(!hasCollided ? u2 : v2) * 10} y2="0" stroke="#2196F3" strokeWidth="3" markerEnd="url(#arrow-blue)" />
          <text x={((!hasCollided ? u2 : v2) * 10) / 2} y="-10" fill="#2196F3" fontSize="14" textAnchor="middle" fontFamily="sans-serif">
            v = {(!hasCollided ? u2 : v2).toFixed(1)}
          </text>
        </g>
      )}


      <text x={width / 2} y="50" fill="#333" fontSize="20" fontWeight="bold" textAnchor="middle" fontFamily="sans-serif">
        {hasCollided ? "Post-Collision" : "Pre-Collision"}
      </text>
      <text x={width / 2} y="75" fill="#666" fontSize="16" textAnchor="middle" fontFamily="sans-serif">
        Total Momentum: {hasCollided ? p_after.toFixed(1) : p_before.toFixed(1)} kg·m/s
      </text>
      {/* Live Formula Substitution Chip Card (Top Center) */}
      <g transform="translate(220, 20)">
        <rect x="0" y="0" width="360" height="42" fill="#FAF6EF" rx="8" stroke="#E5DFD3" strokeWidth="1" />
        <text x="12" y="18" fill="#1B2A41" fontSize="11" fontWeight="600" fontFamily="var(--font-mono)">
          p_initial = m₁u₁ + m₂u₂ = p_final
        </text>
        <text x="12" y="32" fill="#6B7280" fontSize="11" fontFamily="var(--font-mono)">
          = {m1}×({u1.toFixed(1)}) + {m2}×({u2.toFixed(1)}) = {p_before.toFixed(2)} kg·m/s
        </text>
      </g>
    </svg>
  )
}
