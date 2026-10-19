import React, { useEffect, useRef, useState } from 'react'
import { usePhysicsStore } from '../../store/usePhysicsStore'

export default function AngularDiagram({ formulaState }) {
  if (!formulaState) return null
  return <AngularDiagramContent formulaState={formulaState} />
}

function AngularDiagramContent({ formulaState }) {

  const { values } = formulaState
  const { ω0, ω2, r1, r2, I1, I2, L } = values

  const width = 800
  const height = 400
  const cx = width / 2
  const cy = height / 2

  const maxR = 2
  const scale = 100 // pixels per meter

  // Time in simTime maps to rotation angle
  const [angle, setAngle] = useState(0)
  const [currentR, setCurrentR] = useState(r1)
  const reqRef = useRef()

  useEffect(() => {
    const renderLoop = () => {
      const state = usePhysicsStore.getState()
      const t = state.simTime
      // For simplicity in the diagram, we simulate the "arms pulled in" 
      // over a fixed duration, or just show the final state if t > 2?
      // Actually, AngularMomentumScene uses a simple Lerp over 2 seconds.
      // Let's mimic that here.
      const transitionDuration = 2.0
      let r = r1
      let omega = ω0
      
      if (t <= 0) {
        r = r1
        omega = ω0
      } else if (t < transitionDuration) {
        const progress = t / transitionDuration
        // easing
        const ease = 1 - Math.pow(1 - progress, 3)
        r = r1 + (r2 - r1) * ease
        // L = I * w => w = L / I
        // Approx I
        const m_arms = 60 * 2 * 0.2
        const I_r = I1 - m_arms * (r1 * r1) + m_arms * r * r
        omega = L / I_r
      } else {
        r = r2
        omega = ω2
      }

      // Update angle: d(theta) = omega * dt
      // Actually, we can just use the true integrated angle from the 3D scene, 
      // but simTime alone isn't enough to compute the integral easily without state.
      // We'll just integrate it here in the loop.
      setCurrentR(r)
      setAngle(prev => prev + omega * (1 / 60)) // approximate 60fps
      
      reqRef.current = requestAnimationFrame(renderLoop)
    }
    reqRef.current = requestAnimationFrame(renderLoop)
    return () => cancelAnimationFrame(reqRef.current)
  }, [ω0, ω2, r1, r2, I1, L])

  const armPx = currentR * scale
  const corePx = 0.25 * scale

  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: '100%', display: 'block' }}>
      <rect width="100%" height="100%" fill="#F8F9FA" />

      {/* Grid overlay */}
      <defs>
        <pattern id="grid-ang" width="50" height="50" patternUnits="userSpaceOnUse">
          <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#e0e0e0" strokeWidth="1"/>
        </pattern>
      </defs>
      <rect x="0" y="0" width={width} height={height} fill="url(#grid-ang)" />

      {/* Outer bounds circle (max r) */}
      <circle cx={cx} cy={cy} r={r1 * scale} fill="none" stroke="#ddd" strokeWidth="2" strokeDasharray="5 5" />
      <text x={cx} y={cy - r1 * scale - 10} fill="#999" fontSize="12" textAnchor="middle" fontFamily="sans-serif">
        r_max = {r1.toFixed(1)}m
      </text>

      {/* Rotating Group */}
      <g transform={`translate(${cx}, ${cy}) rotate(${angle * 180 / Math.PI})`}>
        {/* Arms */}
        <line x1={-armPx} y1="0" x2={armPx} y2="0" stroke="#333" strokeWidth="6" strokeLinecap="round" />
        
        {/* Core Body */}
        <circle cx="0" cy="0" r={corePx} fill="#2196F3" stroke="#fff" strokeWidth="3" />
        
        {/* Hand Weights (Point masses) */}
        <circle cx={-armPx} cy="0" r="16" fill="#FF5E5E" />
        <circle cx={armPx} cy="0" r="16" fill="#FF5E5E" />
      </g>

      {/* Live Formula Substitution Chip Card (Top Left) */}
      <g transform="translate(20, 20)">
        <rect x="0" y="0" width="360" height="42" fill="#FAF6EF" rx="8" stroke="#E5DFD3" strokeWidth="1" />
        <text x="12" y="18" fill="#1B2A41" fontSize="11" fontWeight="600" fontFamily="var(--font-mono)">
          L = I₁ω₁ = I₂ω₂ (Conservation of Angular Momentum)
        </text>
        <text x="12" y="32" fill="#6B7280" fontSize="11" fontFamily="var(--font-mono)">
          = {(I1 || 0).toFixed(2)} × {(ω0 || 0).toFixed(1)} = {(L || 0).toFixed(2)} kg·m²/s (Constant)
        </text>
      </g>

      {/* Live Readout overlay */}
      <g transform="translate(40, 40)">
        <rect x="0" y="80" width="160" height="90" fill="rgba(255,255,255,0.9)" rx="8" stroke="#ccc" />
        <text x="15" y="105" fill="#333" fontSize="14" fontWeight="bold" fontFamily="sans-serif">Live Telemetry</text>
        <text x="15" y="130" fill="#666" fontSize="14" fontFamily="sans-serif">Radius: {currentR.toFixed(2)} m</text>
        <text x="15" y="155" fill="#666" fontSize="14" fontFamily="sans-serif">
          ω: {(currentR <= r2 + 0.05 ? ω2 : ω0).toFixed(2)} rad/s
        </text>
      </g>
    </svg>
  )
}
