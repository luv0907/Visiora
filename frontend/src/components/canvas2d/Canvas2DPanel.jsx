/**
 * VISIORA — Canvas2DPanel
 *
 * Routes the active scene to the correct 2D scene module
 * and wraps it in PhysicsCanvas.
 */
import React, { useMemo } from 'react'
import PhysicsCanvas from '../../scenes2d/canvas/PhysicsCanvas'
import ProjectileScene2D from '../../scenes2d/ProjectileCanvas'
import PendulumScene2D   from '../../scenes2d/PendulumCanvas'
import GravityScene2D    from '../../scenes2d/GravityCanvas'
import CollisionScene2D  from '../../scenes2d/CollisionCanvas'
import AngularScene2D    from '../../scenes2d/AngularCanvas'
import WaveScene2D       from '../../scenes2d/WaveCanvas'
import { usePhysicsStore } from '../../store/usePhysicsStore'

const SCENE_MAP = {
  projectile: ProjectileScene2D,
  pendulum:   PendulumScene2D,
  gravity:    GravityScene2D,
  collision:  CollisionScene2D,
  angular:    AngularScene2D,
  wave:       WaveScene2D,
}

export default function Canvas2DPanel({ style }) {
  const { activeScene } = usePhysicsStore()
  const scene = SCENE_MAP[activeScene] ?? GravityScene2D

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      height: '100%',
      background: 'white',
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden',
      border: '1px solid var(--color-border)',
      boxShadow: 'var(--shadow-md)',
      ...style,
    }}>
      {/* PhET Badge */}
      <div style={{
        position: 'absolute',
        top: 10,
        right: 10,
        zIndex: 10,
        background: 'rgba(255,255,255,0.85)',
        backdropFilter: 'blur(8px)',
        border: '1px solid rgba(148,163,184,0.3)',
        borderRadius: '6px',
        padding: '3px 8px',
        fontSize: '10px',
        fontWeight: '600',
        color: 'var(--color-text-muted)',
        letterSpacing: '0.05em',
        pointerEvents: 'none',
      }}>
        2D Interactive
      </div>

      <PhysicsCanvas scene={scene} />
    </div>
  )
}
