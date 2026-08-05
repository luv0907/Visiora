/**
 * VISIORA — Formula Panel
 * Shows symbolic formulas + step-by-step substitution for the active scene.
 * All numbers rendered in JetBrains Mono to prevent layout jitter.
 */
import React, { useState } from 'react'
import { usePhysicsStore } from '../../store/usePhysicsStore'
import { ChevronDown, ChevronUp, FunctionSquare } from 'lucide-react'

function FormulaCard({ formula }) {
  return (
    <div style={{
      padding: 'var(--space-3) var(--space-4)',
      background: 'var(--color-primary-bg)',
      borderRadius: 'var(--radius-md)',
      border: '1px solid var(--pink-200)',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 'var(--space-3)',
    }}>
      <div>
        <div style={{
          fontSize: 'var(--text-xs)',
          color: 'var(--color-text-muted)',
          marginBottom: '2px',
          fontWeight: 'var(--weight-medium)',
        }}>
          {formula.label}
        </div>
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 'var(--text-sm)',
          color: 'var(--color-primary)',
          fontWeight: 'var(--weight-medium)',
        }}>
          {formula.symbol} = {formula.expression}
        </div>
      </div>
      <span style={{
        fontSize: 'var(--text-xs)',
        color: 'var(--color-text-muted)',
        background: 'var(--color-surface)',
        padding: '2px 6px',
        borderRadius: 'var(--radius-sm)',
        fontFamily: 'var(--font-mono)',
        flexShrink: 0,
      }}>
        {formula.unit}
      </span>
    </div>
  )
}

function StepCard({ step, index }) {
  return (
    <div style={{
      position: 'relative',
      paddingLeft: 'var(--space-6)',
    }}>
      {/* Step number indicator */}
      <div style={{
        position: 'absolute',
        left: 0,
        top: '50%',
        transform: 'translateY(-50%)',
        width: '20px',
        height: '20px',
        background: 'var(--pink-200)',
        color: 'var(--pink-600)',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '10px',
        fontWeight: 'var(--weight-bold)',
        fontFamily: 'var(--font-mono)',
        flexShrink: 0,
      }}>
        {index + 1}
      </div>

      <div style={{
        padding: 'var(--space-2) var(--space-3)',
        background: 'var(--color-surface)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--color-border)',
      }}>
        <div style={{
          fontSize: 'var(--text-xs)',
          color: 'var(--color-text-muted)',
          marginBottom: 'var(--space-1)',
          fontWeight: 'var(--weight-medium)',
        }}>
          {step.label}
        </div>
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 'var(--text-xs)',
          color: 'var(--color-text-muted)',
          marginBottom: 'var(--space-1)',
        }}>
          {step.substituted}
        </div>
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 'var(--text-sm)',
          color: 'var(--color-text)',
          fontWeight: 'var(--weight-semibold)',
        }}>
          {step.result}
        </div>
      </div>
    </div>
  )
}

export default function FormulaPanel() {
  const { formulaState } = usePhysicsStore()
  const [showSteps, setShowSteps] = useState(true)

  if (!formulaState) {
    return (
      <div style={{ padding: 'var(--space-4)', textAlign: 'center', color: 'var(--color-text-muted)' }}>
        Loading formulas...
      </div>
    )
  }

  const { formulas = [], steps = [] } = formulaState

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-4)',
      height: '100%',
      overflowY: 'auto',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-2)',
        paddingBottom: 'var(--space-3)',
        borderBottom: '1px solid var(--color-border)',
      }}>
        <div style={{
          width: '28px', height: '28px',
          background: 'var(--color-primary-bg)',
          borderRadius: 'var(--radius-sm)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <FunctionSquare size={14} style={{ color: 'var(--color-primary)' }} />
        </div>
        <h4 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'var(--text-sm)',
          fontWeight: 'var(--weight-semibold)',
          margin: 0,
        }}>
          Key Formulas
        </h4>
      </div>

      {/* Formula cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        {formulas.map((f, i) => <FormulaCard key={i} formula={f} />)}
      </div>

      {/* Step-by-step toggle */}
      <button
        onClick={() => setShowSteps(v => !v)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 'var(--space-2) var(--space-3)',
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          cursor: 'pointer',
          color: 'var(--color-text)',
          fontSize: 'var(--text-sm)',
          fontWeight: 'var(--weight-medium)',
          transition: 'background var(--duration-fast)',
        }}
      >
        <span>Step-by-step calculation</span>
        {showSteps ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {/* Steps */}
      {showSteps && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-3)',
          animation: 'slideDown var(--duration-base) var(--ease-spring)',
        }}>
          {steps.map((s, i) => <StepCard key={i} step={s} index={i} />)}
        </div>
      )}
    </div>
  )
}
