import React, { useEffect, useRef, useState } from 'react'
import { usePhysicsStore } from '../../store/usePhysicsStore'

export default function ProjectileDiagram({ formulaState }) {
  if (!formulaState) return null

  const { values, graphSeries } = formulaState
  const R = values.R || 10
  const H_max = values.H_max || 5
  
  // Coordinate system bounds
  const margin = 40
  const xMax = Math.max(R * 1.2, 10)
  const yMax = Math.max(H_max * 1.5, 10)
  const yMin = -yMax * 0.1 // a bit below ground

  // SVG viewport
  const width = 800
  const height = 400

  // Mapping functions from Physics coords to SVG coords
  const mapX = (x) => margin + (x / xMax) * (width - margin * 2)
  const mapY = (y) => height - margin - ((y - yMin) / (yMax - yMin)) * (height - margin * 2)

  // Generate Trajectory Path
  const trajectory = graphSeries?.trajectory || []
  let pathD = ''
  if (trajectory.length > 0) {
    pathD = `M ${mapX(trajectory[0].x)} ${mapY(trajectory[0].y)} `
    for (let i = 1; i < trajectory.length; i++) {
      pathD += `L ${mapX(trajectory[i].x)} ${mapY(trajectory[i].y)} `
    }
  }

  // Animation State
  const [ballPos, setBallPos] = useState({ x: 0, y: 0 })
  const reqRef = useRef()

  useEffect(() => {
    const renderLoop = () => {
      const state = usePhysicsStore.getState()
      const t = Math.min(state.simTime, values.T || 0)
      
      // Calculate current position kinematically
      const g = values.g || 9.81
      const rad = (values.θ_deg || 45) * Math.PI / 180
      const v0 = values.v0 || 20
      const h0 = values.h0 || 0
      
      const x = v0 * Math.cos(rad) * t
      const y = h0 + v0 * Math.sin(rad) * t - 0.5 * g * t * t
      
      setBallPos({ x, y })
      reqRef.current = requestAnimationFrame(renderLoop)
    }
    reqRef.current = requestAnimationFrame(renderLoop)
    return () => cancelAnimationFrame(reqRef.current)
  }, [values])

  // Vector Arrow for initial velocity
  const rad = (values.θ_deg || 45) * Math.PI / 180
  const vScale = (width / xMax) * 0.2 // arbitrary scale for vector visual
  const vx = (values.v0 || 20) * Math.cos(rad) * vScale
  const vy = (values.v0 || 20) * Math.sin(rad) * vScale

  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: '100%', display: 'block' }}>
      <defs>
        <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#FF5E5E" />
        </marker>
        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#e0e0e0" strokeWidth="1"/>
        </pattern>
      </defs>

      {/* Sky Background */}
      <rect x="0" y="0" width={width} height={mapY(0)} fill="#F0F8FF" />
      
      {/* Ground Background */}
      <rect x="0" y={mapY(0)} width={width} height={height - mapY(0)} fill="#E8F5E9" />

      {/* Grid Overlay */}
      <rect x="0" y="0" width={width} height={height} fill="url(#grid)" />

      {/* Ground Line */}
      <line x1={0} y1={mapY(0)} x2={width} y2={mapY(0)} stroke="#4CAF50" strokeWidth="3" />

      {/* Trajectory Arc */}
      {pathD && (
        <path d={pathD} fill="none" stroke="#FFB6C9" strokeWidth="2" strokeDasharray="6 4" />
      )}

      {/* Velocity Vector (only show when time is 0 or close to 0) */}
      <g transform={`translate(${mapX(0)}, ${mapY(values.h0 || 0)})`}>
        <line x1="0" y1="0" x2={vx} y2={-vy} stroke="#FF5E5E" strokeWidth="3" markerEnd="url(#arrow)" />
        <text x={vx + 10} y={-vy} fill="#FF5E5E" fontSize="14" fontWeight="bold" fontFamily="sans-serif">
          v₀ = {(values.v0 || 20).toFixed(1)} m/s
        </text>
        <text x={vx/2 + 10} y={-vy/2 + 20} fill="#FF5E5E" fontSize="12" fontFamily="sans-serif">
          θ = {values.θ_deg || 45}°
        </text>
      </g>

      {/* Live Formula Substitution Chip Card (Top Left) */}
      <g transform="translate(20, 20)">
        <rect x="0" y="0" width="380" height="42" fill="#FAF6EF" rx="8" stroke="#E5DFD3" strokeWidth="1" />
        <text x="12" y="18" fill="#1B2A41" fontSize="11" fontWeight="600" fontFamily="var(--font-mono)">
          y(t) = h₀ + v₀sin(θ)t - ½gt²
        </text>
        <text x="12" y="32" fill="#6B7280" fontSize="11" fontFamily="var(--font-mono)">
          = {(values.h0 || 0).toFixed(1)} + ({(values.v0y || 0).toFixed(1)})({(usePhysicsStore.getState().simTime || 0).toFixed(2)}) - ½({(values.g || 9.81).toFixed(2)})({(usePhysicsStore.getState().simTime || 0).toFixed(2)})² = {ballPos.y.toFixed(2)} m
        </text>
      </g>

      {/* Range Label */}
      <line x1={mapX(0)} y1={mapY(0) + 20} x2={mapX(R)} y2={mapY(0) + 20} stroke="#1B2A41" strokeWidth="1" strokeDasharray="2 2" />
      <text x={mapX(R / 2)} y={mapY(0) + 35} fill="#1B2A41" fontSize="12" fontWeight="600" textAnchor="middle" fontFamily="var(--font-mono)">
        R = {R.toFixed(1)} m
      </text>
      
      {/* Landing Point Marker */}
      <circle cx={mapX(R)} cy={mapY(0)} r="4" fill="#2F855A" />

      {/* Live Ball */}
      <circle cx={mapX(ballPos.x)} cy={mapY(ballPos.y)} r="12" fill="#1B2A41" stroke="#FFF" strokeWidth="2" />
      
      {/* Live Ball Telemetry Chip */}
      <g transform={`translate(${mapX(ballPos.x) + 16}, ${mapY(ballPos.y) - 24})`}>
        <rect x="0" y="0" width="96" height="40" fill="#FAF6EF" rx="6" stroke="#E5DFD3" strokeWidth="1" />
        <text x="8" y="16" fill="#1B2A41" fontSize="11" fontWeight="600" fontFamily="var(--font-mono)">x: {ballPos.x.toFixed(1)} m</text>
        <text x="8" y="32" fill="#1B2A41" fontSize="11" fontWeight="600" fontFamily="var(--font-mono)">y: {ballPos.y.toFixed(1)} m</text>
      </g>
    </svg>
  )
}
