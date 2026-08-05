import React from 'react'

export default function VariableChip({ children }) {
  return (
    <div style={{
      background: 'var(--color-bg)',
      padding: '4px 8px',
      borderRadius: 'var(--radius-sm)',
      boxShadow: 'var(--shadow-sm)',
      border: '1px solid var(--color-border)',
      fontFamily: 'var(--font-mono)',
      fontSize: '11px',
      fontWeight: 'var(--weight-semibold)',
      color: 'var(--color-text)',
      whiteSpace: 'nowrap',
      pointerEvents: 'none',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      {children}
    </div>
  )
}
