import React, { useEffect, useRef, useState } from 'react'
import { usePhysicsStore } from '../../store/usePhysicsStore'

export default function PendulumDiagram({ formulaState }) {
  if (!formulaState) return null

  const { values } = formulaState
  const { L = 2, θ0 = Math.PI / 6, T_corrected = 2, m = 1 } = values
  
  const width = 800
  const height = 400
  const pivotX = width / 2
  const pivotY = 50

  // We want L = 2 to roughly map to 200px
  const scale = 100
  const lenPx = L * scale

  const [angle, setAngle] = useState(θ0)
  const reqRef = useRef()

  useEffect(() => {
    const renderLoop = () => {
      const state = usePhysicsStore.getState()
      const t = state.simTime
      // Angle: theta(t) = theta0 * cos(2pi/T * t)
      const currentTheta = θ0 * Math.cos((2 * Math.PI / T_corrected) * t)
      setAngle(currentTheta)
      reqRef.current = requestAnimationFrame(renderLoop)
    }
    reqRef.current = requestAnimationFrame(renderLoop)
    return () => cancelAnimationFrame(reqRef.current)
  }, [T_corrected, θ0])

  const bobX = pivotX + lenPx * Math.sin(angle)
  const bobY = pivotY + lenPx * Math.cos(angle)

  // Max swing points
  const leftX = pivotX + lenPx * Math.sin(-θ0)
  const leftY = pivotY + lenPx * Math.cos(-θ0)
  const rightX = pivotX + lenPx * Math.sin(θ0)
  const rightY = pivotY + lenPx * Math.cos(θ0)

  // Energy Calculation (for live bars)
  const g = values.g || 9.81
  const h = L * (1 - Math.cos(angle))
  const h_max = L * (1 - Math.cos(θ0))
  const PE = m * g * h
  const PE_max = m * g * h_max
  const KE = PE_max - PE
  const barMax = 150

  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: '100%', display: 'block' }}>
      <rect width="100%" height="100%" fill="#F8F9FA" />

      {/* Grid overlay */}
      <defs>
        <pattern id="grid-ang" width="50" height="50" patternUnits="userSpaceOnUse">
          <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#e0e0e0" strokeWidth="1"/>
        </pattern>
        <pattern id="hatch" width="10" height="10" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
          <line x1="0" y1="0" x2="0" y2="10" stroke="#ccc" strokeWidth="2" />
        </pattern>
      </defs>
      <rect x="0" y="0" width={width} height={height} fill="url(#grid-ang)" />

      {/* Ceiling Mount */}
      <rect x={pivotX - 50} y={pivotY - 20} width="100" height="20" fill="url(#hatch)" stroke="#666" strokeWidth="2" />
      <line x1={pivotX - 50} y1={pivotY} x2={pivotX + 50} y2={pivotY} stroke="#333" strokeWidth="3" />

      {/* Pivot Point */}
      <circle cx={pivotX} cy={pivotY} r="4" fill="#333" />

      {/* Dashed Arc (Max Swing Path) */}
      <path 
        d={`M ${leftX} ${leftY} A ${lenPx} ${lenPx} 0 0 0 ${rightX} ${rightY}`} 
        fill="none" 
        stroke="#FFB6C9" 
        strokeWidth="2" 
        strokeDasharray="6 4" 
      />

      {/* Max Angle Label */}
      <text x={rightX + 10} y={rightY + 10} fill="#666" fontSize="14" fontFamily="sans-serif">
        θ = {(θ0 * 180 / Math.PI).toFixed(1)}°
      </text>

      {/* String */}
      <line x1={pivotX} y1={pivotY} x2={bobX} y2={bobY} stroke="#333" strokeWidth="2" />

      {/* Bob */}
      <circle cx={bobX} cy={bobY} r="16" fill="#FF5E5E" stroke="#fff" strokeWidth="2" />

      {/* Energy Bars */}
      <g transform="translate(50, 50)">
        <text x="0" y="-10" fontSize="12" fontWeight="600" fill="#1B2A41" fontFamily="var(--font-mono)">Energy (J)</text>
        
        {/* PE Bar Container */}
        <rect x="0" y="0" width="30" height={barMax} fill="#E5DFD3" rx="4" />
        {/* PE Fill */}
        <rect x="0" y={barMax - (PE_max > 0 ? (PE / PE_max) * barMax : 0)} width="30" height={PE_max > 0 ? (PE / PE_max) * barMax : 0} fill="#2F855A" rx="4" />
        <text x="15" y={barMax + 20} fontSize="11" fill="#6B7280" textAnchor="middle" fontFamily="var(--font-mono)">PE</text>

        {/* KE Bar Container */}
        <rect x="50" y="0" width="30" height={barMax} fill="#E5DFD3" rx="4" />
        {/* KE Fill */}
        <rect x="50" y={barMax - (PE_max > 0 ? (KE / PE_max) * barMax : 0)} width="30" height={PE_max > 0 ? (KE / PE_max) * barMax : 0} fill="#3D6B8C" rx="4" />
        <text x="65" y={barMax + 20} fontSize="11" fill="#6B7280" textAnchor="middle" fontFamily="var(--font-mono)">KE</text>
      </g>

      {/* Live Formula Substitution Chip Card (Top Right) */}
      <g transform="translate(420, 20)">
        <rect x="0" y="0" width="360" height="42" fill="#FAF6EF" rx="8" stroke="#E5DFD3" strokeWidth="1" />
        <text x="12" y="18" fill="#1B2A41" fontSize="11" fontWeight="600" fontFamily="var(--font-mono)">
          θ(t) = θ₀ cos(ωt)
        </text>
        <text x="12" y="32" fill="#6B7280" fontSize="11" fontFamily="var(--font-mono)">
          = {(θ0 * 180 / Math.PI).toFixed(1)}° × cos({(values.ω || 0).toFixed(2)} × {(usePhysicsStore.getState().simTime || 0).toFixed(2)}) = {(angle * 180 / Math.PI).toFixed(1)}°
        </text>
      </g>
    </svg>
  )
}
