import React from 'react'
import { usePhysicsStore } from '../../store/usePhysicsStore'
import { SCENE_VARIABLES } from '../../config/physics'
import SimControls from '../controls/SimControls'
import VariableSlider from '../controls/VariableSlider'
import { ErrorBoundary } from '../ui/ErrorBoundary'

import PendulumDiagram from './PendulumDiagram'
import ProjectileDiagram from './ProjectileDiagram'
import GravityDiagram from './GravityDiagram'
import CollisionDiagram from './CollisionDiagram'
import AngularDiagram from './AngularDiagram'

export default function DiagramView({ visible }) {
  if (!visible) return null
  return <DiagramViewContent />
}

function DiagramViewContent() {
  const { activeScene, formulaState } = usePhysicsStore()
  const vars = SCENE_VARIABLES[activeScene] ?? []

  let DiagramComponent = null
  let stats = []

  if (activeScene === 'pendulum') {
    DiagramComponent = PendulumDiagram
    stats = [
      { label: 'Period (T)', value: formulaState?.values?.T_corrected?.toFixed(2) || '0.00', unit: 's' },
      { label: 'Max Speed', value: formulaState?.values?.v_max?.toFixed(2) || '0.00', unit: 'm/s' },
    ]
  } else if (activeScene === 'projectile') {
    DiagramComponent = ProjectileDiagram
    stats = [
      { label: 'Range', value: formulaState?.values?.R?.toFixed(2) || '0.00', unit: 'm' },
      { label: 'Max height', value: formulaState?.values?.H_max?.toFixed(2) || '0.00', unit: 'm' },
      { label: 'Flight time', value: formulaState?.values?.T?.toFixed(2) || '0.00', unit: 's' },
    ]
  } else if (activeScene === 'gravity') {
    DiagramComponent = GravityDiagram
    stats = [
      { label: 'Impact Velocity', value: formulaState?.values?.v?.toFixed(2) || '0.00', unit: 'm/s' },
      { label: 'Fall Time', value: formulaState?.values?.t?.toFixed(2) || '0.00', unit: 's' },
    ]
  } else if (activeScene === 'collision') {
    DiagramComponent = CollisionDiagram
    stats = [
      { label: 'Momentum Before', value: formulaState?.values?.p_before?.toFixed(2) || '0.00', unit: 'kg·m/s' },
      { label: 'Momentum After', value: formulaState?.values?.p_after?.toFixed(2) || '0.00', unit: 'kg·m/s' },
    ]
  } else if (activeScene === 'angular') {
    DiagramComponent = AngularDiagram
    stats = [
      { label: 'Moment of Inertia', value: formulaState?.values?.I1?.toFixed(2) || '0.00', unit: 'kg·m²' },
      { label: 'Angular Vel', value: formulaState?.values?.ω2?.toFixed(2) || '0.00', unit: 'rad/s' },
    ]
  }

  return (
    <div style={{
      flex: 1,
      minWidth: 0,
      background: 'rgba(255,255,255,1)',
      borderRadius: 'var(--radius-lg)',
      border: '1px solid var(--color-border)',
      boxShadow: 'var(--shadow-md)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      <ErrorBoundary section="diagram-2d" minHeight="200px">
        {/* Main Diagram Canvas */}
        <div style={{
          flex: 1,
          minHeight: 0,
          position: 'relative',
          background: '#f8f9fa' // subtle off-white for diagram background
        }}>
          {DiagramComponent && <DiagramComponent formulaState={formulaState} />}
        </div>

        {/* Controls & Stats Strip */}
        <div style={{
          padding: '16px',
          background: '#ffffff',
          borderTop: '1px solid var(--color-border)',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
          {/* Top row: Sliders and Playback */}
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: '16px',
            justifyContent: 'center'
          }}>
            {vars.map(v => (
              <div key={v.name} style={{ flex: '1 1 200px', maxWidth: '300px' }}>
                <VariableSlider variable={v} compact />
              </div>
            ))}
            <div style={{ flexShrink: 0 }}>
              <SimControls compact />
            </div>
          </div>

          {/* Bottom row: Live Readouts */}
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '24px',
            justifyContent: 'center',
            paddingTop: '8px',
            borderTop: '1px dashed var(--color-border-md)'
          }}>
            {stats.map(s => (
              <div key={s.label} style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                <span style={{ fontSize: '14px', color: 'var(--color-text-muted)' }}>{s.label}:</span>
                <span style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--color-text)', fontFamily: 'var(--font-mono)' }}>
                  {s.value} <span style={{ fontSize: '12px', fontWeight: 'normal', color: 'var(--color-text-muted)' }}>{s.unit}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </ErrorBoundary>
    </div>
  )
}
