import React, { useEffect, useCallback, useRef, useState } from 'react'
import { ZoomIn, ZoomOut, Maximize } from 'lucide-react'
import { usePhysicsStore } from '../../store/usePhysicsStore'

// ── Per-scene static default camera positions ───────────────────────────────
// Practical comfortable positions for typical variable defaults.
// Camera NEVER moves automatically on variable change.
// All scenes use a 3/4 perspective (elevated, slightly to the side).
const SCENE_CAMERA = {
  gravity: {
    // Balls drop near X=0. See them from slightly above/right.
    position: [4, 14, 22],
    target:   [0, 8, 0],
  },
  projectile: {
    // Cannon at X=-8. Center view at X=2 so cannon is visible on left,
    // typical landing zone (X~8-12) visible on right.
    position: [2, 8, 24],
    target:   [2, 2, 0],
  },
  pendulum: {
    position: [2, 5, 16],
    target:   [0, 3, 0],
  },
  collision: {
    position: [0, 5, 18],
    target:   [0, 1, 0],
  },
  angular: {
    position: [4, 6, 12],
    target:   [0, 1, 0],
  },
}

export default function CameraUI({ controlsRef, canvasRef }) {
  const { activeScene } = usePhysicsStore()
  const activeSceneRef = useRef(activeScene)
  activeSceneRef.current = activeScene

  const doFrame = useCallback(() => {
    const c = controlsRef.current
    if (!c || !c.object) return
    const camera = c.object

    const cfg = SCENE_CAMERA[activeSceneRef.current] || SCENE_CAMERA.gravity
    const [px, py, pz] = cfg.position
    const [tx, ty, tz] = cfg.target

    camera.position.set(px, py, pz)
    c.target.set(tx, ty, tz)
    c.update()
  }, [controlsRef])

  // Frame ONLY when scene changes — NEVER on variable change
  useEffect(() => {
    // Small delay to ensure canvas + controls are ready after scene mount
    const t = setTimeout(() => doFrame(), 80)
    return () => clearTimeout(t)
  }, [activeScene, doFrame])

  // Re-frame on canvas resize (e.g. sidebar toggled) — keeps cannon in view
  useEffect(() => {
    if (!canvasRef?.current) return
    const ro = new ResizeObserver(() => {
      doFrame()
    })
    ro.observe(canvasRef.current)
    return () => ro.disconnect()
  }, [canvasRef, doFrame])

  const handleZoomIn = () => {
    const c = controlsRef.current
    if (c && c.object) {
      const dir = c.object.position.clone().sub(c.target).normalize()
      c.object.position.sub(dir.multiplyScalar(c.object.position.distanceTo(c.target) * 0.2))
      c.update()
    }
  }

  const handleZoomOut = () => {
    const c = controlsRef.current
    if (c && c.object) {
      const dir = c.object.position.clone().sub(c.target).normalize()
      c.object.position.add(dir.multiplyScalar(c.object.position.distanceTo(c.target) * 0.2))
      c.update()
    }
  }

  const handleReset = () => {
    doFrame()
  }

  // X-axis pan scroll — slides the camera & orbit target left/right
  const [xScroll, setXScroll] = useState(30)

  const handleXScroll = (e) => {
    const val = parseFloat(e.target.value)
    setXScroll(val)

    const c = controlsRef.current
    if (!c || !c.object) return

    // Map 0..100 → scene X range [-8 .. +22]  (cannon to far landing zone)
    const minX = -8
    const maxX = 22
    const newTargetX = minX + (val / 100) * (maxX - minX)

    // Shift both target and camera by same delta so view direction stays fixed
    const delta = newTargetX - c.target.x
    c.target.x += delta
    c.object.position.x += delta
    c.update()
  }

  return (
    // Outer wrapper fills the full canvas so we can position both the zoom
    // buttons (top-right) and the scroll bar (bottom-center) as absolute children.
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>

      {/* ── Zoom / Reset buttons (top-right) ── */}
      <div style={{
        position: 'absolute',
        right: '16px',
        top: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        background: '#FAF6EF',
        padding: '6px',
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-sm)',
        border: '1px solid #E5DFD3',
        pointerEvents: 'auto',
        zIndex: 10,
      }}>
        <button
          onClick={handleZoomIn}
          style={{ background: '#FFFFFF', border: '1px solid #E5DFD3', color: '#1B2A41', cursor: 'pointer', padding: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'var(--radius-sm)', transition: 'transform 0.15s ease' }}
          onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
          title="Zoom In"
        >
          <ZoomIn size={18} />
        </button>
        <button
          onClick={handleZoomOut}
          style={{ background: '#FFFFFF', border: '1px solid #E5DFD3', color: '#1B2A41', cursor: 'pointer', padding: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'var(--radius-sm)', transition: 'transform 0.15s ease' }}
          onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
          title="Zoom Out"
        >
          <ZoomOut size={18} />
        </button>
        <button
          onClick={handleReset}
          style={{ background: '#FFFFFF', border: '1px solid #E5DFD3', color: '#1B2A41', cursor: 'pointer', padding: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'var(--radius-sm)', transition: 'transform 0.15s ease' }}
          onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
          title="Reset View"
        >
          <Maximize size={18} />
        </button>
      </div>

      {/* ── X-axis pan scroll bar (bottom-center) ── */}
      <div style={{
        position: 'absolute',
        bottom: '16px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'min(420px, 70%)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        background: 'rgba(255, 255, 255, 0.9)',
        backdropFilter: 'blur(12px)',
        padding: '8px 16px',
        borderRadius: 'var(--radius-full)',
        boxShadow: 'var(--shadow-sm)',
        border: '1px solid var(--color-border)',
        pointerEvents: 'auto',
        zIndex: 10,
      }}>
        {/* ← arrow */}
        <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', userSelect: 'none' }}>◀</span>

        {/* Custom styled range input */}
        <div style={{ flex: 1, position: 'relative', height: '20px', display: 'flex', alignItems: 'center' }}>
          {/* Track background */}
          <div style={{
            position: 'absolute', left: 0, right: 0, height: '4px',
            background: 'var(--color-border)', borderRadius: '999px',
          }} />
          {/* Native range (transparent, on top) */}
          <input
            type="range"
            min={0} max={100} step={0.5}
            defaultValue={30}
            onChange={handleXScroll}
            title="Scroll scene left / right"
            style={{
              position: 'absolute', width: '100%', height: '20px',
              opacity: 0, cursor: 'ew-resize', margin: 0, zIndex: 2,
            }}
          />
          {/* Filled track */}
          <div style={{
            position: 'absolute',
            left: 0,
            width: `${xScroll}%`,
            height: '4px',
            background: 'linear-gradient(90deg, var(--pink-300), var(--pink-400))',
            borderRadius: '999px',
            pointerEvents: 'none',
          }} />
        </div>

        {/* → arrow */}
        <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', userSelect: 'none' }}>▶</span>
        <span style={{
          fontSize: '10px', color: 'var(--color-text-muted)',
          fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap',
        }}>X pan</span>
      </div>

    </div>
  )
}

const btnStyle = {
  background: 'transparent', border: 'none', borderRadius: '6px',
  width: '44px', height: '44px', display: 'flex', alignItems: 'center',
  justifyContent: 'center', cursor: 'pointer', color: 'var(--color-primary)',
  transition: 'background 0.2s'
}
