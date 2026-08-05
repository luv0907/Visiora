/**
 * VISIORA — Graph Tabs
 * Renders graph selector + Graph2D for the active scene.
 */
import React from 'react'
import { usePhysicsStore } from '../../store/usePhysicsStore'
import { useUIStore } from '../../store/useUIStore'
import { getGraphDefinitions } from '../../engine/formulaEngine'
import Graph2D from './Graph2D'

export default function GraphTabs() {
  const { activeScene } = usePhysicsStore()
  const { activeGraphTab, setActiveGraphTab } = useUIStore()
  const graphs = getGraphDefinitions(activeScene)

  if (!graphs.length) return null

  const safeTab = activeGraphTab < graphs.length ? activeGraphTab : 0
  const activeGraph = graphs[safeTab]

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      gap: 'var(--space-3)',
    }}>
      {/* Tab strip */}
      <div style={{
        display: 'flex',
        gap: 'var(--space-1)',
        padding: 'var(--space-1)',
        background: 'var(--color-bg)',
        borderRadius: 'var(--radius-full)',
        border: '1px solid var(--color-border)',
        flexShrink: 0,
        overflowX: 'auto',
      }}>
        {graphs.map((g, i) => (
          <button
            key={g.id}
            onClick={() => setActiveGraphTab(i)}
            style={{
              padding: 'var(--space-2) var(--space-3)',
              borderRadius: 'var(--radius-full)',
              border: 'none',
              cursor: 'pointer',
              fontSize: 'var(--text-xs)',
              fontFamily: 'var(--font-body)',
              fontWeight: 'var(--weight-medium)',
              whiteSpace: 'nowrap',
              transition: 'all var(--duration-fast) var(--ease-spring)',
              background: safeTab === i ? 'var(--color-primary)' : 'transparent',
              color: safeTab === i ? 'white' : 'var(--color-text-muted)',
              boxShadow: safeTab === i ? 'var(--shadow-pink)' : 'none',
            }}
          >
            {g.label}
          </button>
        ))}
      </div>

      {/* Graph canvas */}
      <div style={{
        flex: 1,
        background: 'var(--color-surface)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--color-border)',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-sm)',
        padding: 'var(--space-2)',
        minHeight: '200px',
      }}>
        <Graph2D graphId={activeGraph?.id} />
      </div>
    </div>
  )
}
