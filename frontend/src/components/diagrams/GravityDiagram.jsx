import React, { useEffect, useRef, useState } from 'react'
import { usePhysicsStore } from '../../store/usePhysicsStore'

export default function GravityDiagram({ formulaState }) {
  if (!formulaState) return null

  const { values } = formulaState
  const H = values.height || 20
  const T = values.t || 2
  const g = values.gravity || 9.81
  
  const width = 800
  const height = 400
  const marginY = 40
  
  // Mapping
  const yMax = H * 1.1
  const mapY = (y) => height - marginY - (y / yMax) * (height - marginY * 2)
  const groundY = mapY(0)
  const dropY = mapY(H)
  const colX = width / 2

  const [ballY, setBallY] = useState(H)
  const [vel, setVel] = useState(0)
  const reqRef = useRef()

  useEffect(() => {
    const renderLoop = () => {
      const state = usePhysicsStore.getState()
      const t = Math.min(state.simTime, T)
      
      const currentY = H - 0.5 * g * t * t
      const currentV = g * t
      
      setBallY(Math.max(0, currentY))
      setVel(currentV)
      
      reqRef.current = requestAnimationFrame(renderLoop)
    }
    reqRef.current = requestAnimationFrame(renderLoop)
    return () => cancelAnimationFrame(reqRef.current)
  }, [H, T, g])

  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: '100%', display: 'block' }}>
      {/* Background */}
      <rect x="0" y="0" width={width} height={height} fill="#F8F9FA" />
      
      {/* Grid overlay */}
      <defs>
        <pattern id="grid-ang" width="50" height="50" patternUnits="userSpaceOnUse">
          <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#e0e0e0" strokeWidth="1"/>
        </pattern>
        <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#FF5E5E" />
        </marker>
        <pattern id="hatch-ground" width="10" height="10" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
          <line x1="0" y1="0" x2="0" y2="10" stroke="#4CAF50" strokeWidth="2" opacity="0.3"/>
        </pattern>
      </defs>
      <rect x="0" y="0" width={width} height={height} fill="url(#grid-ang)" />

      {/* Ground Line */}
      <line x1={colX - 100} y1={groundY} x2={colX + 100} y2={groundY} stroke="#4CAF50" strokeWidth="4" />
      <pattern id="hatch-ground" width="10" height="10" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
        <line x1="0" y1="0" x2="0" y2="10" stroke="#4CAF50" strokeWidth="2" opacity="0.3"/>
      </pattern>
      <rect x={colX - 100} y={groundY} width="200" height="20" fill="url(#hatch-ground)" />

      {/* Grid / Ruler on the left */}
      <line x1={colX - 60} y1={dropY} x2={colX - 60} y2={groundY} stroke="#999" strokeWidth="2" />
      
      {[0, 0.25, 0.5, 0.75, 1].map(frac => {
        const markH = H * frac
        const my = mapY(markH)
        return (
          <g key={frac}>
            <line x1={colX - 65} y1={my} x2={colX - 55} y2={my} stroke="#999" strokeWidth="2" />
            <text x={colX - 75} y={my + 4} fill="#666" fontSize="12" textAnchor="end" fontFamily="sans-serif">
              {markH.toFixed(1)}m
            </text>
          </g>
        )
      })}

      {/* Ball */}
      <circle cx={colX} cy={mapY(ballY)} r="16" fill="#2196F3" stroke="#fff" strokeWidth="2" />
      
      {/* Velocity Vector (shows speed) */}
      {vel > 0.1 && (
        <g transform={`translate(${colX}, ${mapY(ballY) + 16})`}>
          <line x1="0" y1="0" x2="0" y2={Math.min(vel * 2, 80)} stroke="#FF5E5E" strokeWidth="3" markerEnd="url(#arrow)" />
        </g>
      )}

      {/* Live Formula Substitution Chip Card (Top Left) */}
      <g transform="translate(20, 20)">
        <rect x="0" y="0" width="340" height="42" fill="#FAF6EF" rx="8" stroke="#E5DFD3" strokeWidth="1" />
        <text x="12" y="18" fill="#1B2A41" fontSize="11" fontWeight="600" fontFamily="var(--font-mono)">
          h(t) = h₀ - ½gt²
        </text>
        <text x="12" y="32" fill="#6B7280" fontSize="11" fontFamily="var(--font-mono)">
          = {H.toFixed(1)} - ½({g.toFixed(2)})({(usePhysicsStore.getState().simTime || 0).toFixed(2)})² = {ballY.toFixed(2)} m
        </text>
      </g>

      {/* Live Readout overlay in SVG */}
      <g transform={`translate(${colX + 30}, ${mapY(ballY)})`}>
        <rect x="0" y="-12" width="110" height="44" fill="#FAF6EF" rx="6" stroke="#E5DFD3" strokeWidth="1" />
        <text x="8" y="4" fill="#1B2A41" fontSize="11" fontWeight="600" fontFamily="var(--font-mono)">y = {ballY.toFixed(2)} m</text>
        <text x="8" y="22" fill="#C53030" fontSize="11" fontWeight="600" fontFamily="var(--font-mono)">v = {vel.toFixed(2)} m/s</text>
      </g>
    </svg>
  )
}
