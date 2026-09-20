/**
 * VISIORA — Live Readout Panel
 * Displays real-time physics values below 2D simulations.
 * Items: array of { label, value, unit }
 */
import React from 'react'

export default function LiveReadout({ items = [] }) {
  return (
    <div className="live-readout">
      {items.map((item, i) => (
        <div key={i} className="readout-item">
          <span className="readout-label">{item.label}</span>
          <span className="readout-value">
            {typeof item.value === 'number' ? item.value.toFixed(item.decimals ?? 3) : item.value}
          </span>
          {item.unit && (
            <span style={{ fontSize: 9, color: 'var(--color-text-faint)', fontFamily: 'var(--font-body)' }}>
              {item.unit}
            </span>
          )}
        </div>
      ))}
    </div>
  )
}
