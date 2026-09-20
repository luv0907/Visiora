/**
 * VISIORA — Energy Bar
 * Kinetic (orange) + Potential (blue) = Total (dark) visualization.
 * Appears below 2D simulations.
 */
import React from 'react'

export default function EnergyBar({ ke = 0, pe = 0, maxEnergy = 1 }) {
  const total = ke + pe
  const safeMax = maxEnergy > 0 ? maxEnergy : 1
  const kePct = Math.min(100, (ke / safeMax) * 100)
  const pePct = Math.min(100, (pe / safeMax) * 100)

  return (
    <div className="energy-bar-container">
      <span style={{ color: '#F97316', minWidth: 20, textAlign: 'right' }}>KE</span>
      <div className="energy-bar-track">
        <div className="energy-bar-ke" style={{ width: `${kePct}%` }} />
        <div className="energy-bar-pe" style={{ width: `${pePct}%` }} />
      </div>
      <span style={{ color: '#3B82F6', minWidth: 20 }}>PE</span>
      <span style={{
        minWidth: 56, textAlign: 'right',
        color: 'var(--color-text-muted)',
        fontSize: 10,
      }}>
        {total.toFixed(2)} J
      </span>
    </div>
  )
}
