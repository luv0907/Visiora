/**
 * VISIORA — Planet Gravity Bar
 * One-click gravity presets for Earth, Moon, Mars, Jupiter.
 * Used across all 2D simulations.
 */
import React from 'react'
import { usePhysicsStore } from '../../store/usePhysicsStore'
import { GRAVITY_PRESETS } from '../../config/physics'

export default function PlanetGravityBar() {
  const { variables, activeScene, setVariable } = usePhysicsStore()
  const currentG = variables[activeScene]?.gravity ?? 9.81

  const isActive = (value) => Math.abs(currentG - value) < 0.05

  return (
    <div className="planet-bar">
      <span style={{ fontSize: 10, color: 'var(--color-text-muted)', fontFamily: 'var(--font-body)', marginRight: 4 }}>
        Planet:
      </span>
      {GRAVITY_PRESETS.map(p => (
        <button
          key={p.label}
          className={`planet-btn${isActive(p.value) ? ' active' : ''}`}
          title={`${p.label}: g = ${p.value} m/s²`}
          onClick={() => setVariable('gravity', p.value)}
        >
          <span style={{ fontSize: 14 }}>{p.emoji}</span>
          <span>{p.label}</span>
        </button>
      ))}
    </div>
  )
}
