/**
 * VISIORA — App.jsx
 * Root layout: scene selector, 3D canvas, variable sidebar, formula/graph/tutor panels.
 * Responsive: desktop sidebar / mobile bottom sheet.
 * Error boundaries around every major section.
 */
import React, { Suspense, useEffect, useCallback, useRef, useState } from 'react'
import { motion, useAnimation } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Physics } from '@react-three/rapier'
import { OrbitControls, Environment } from '@react-three/drei'
import { PCFShadowMap } from 'three'
import { usePhysicsStore } from '../store/usePhysicsStore'
import { useUIStore } from '../store/useUIStore'
import { useAnalyticsStore } from '../store/useAnalyticsStore'
import { logSession } from '../api/client'
import { SCENE_VARIABLES, SCENE_META } from '../config/physics'
import { ErrorBoundary } from '../components/ui/ErrorBoundary'

import VariableSlider from '../components/controls/VariableSlider'
import SimControls from '../components/controls/SimControls'
import FormulaPanel from '../components/formula/FormulaPanel'
import GraphTabs from '../components/graph/GraphTabs'
import { useMediaQuery } from '../hooks/useMediaQuery'
import TutorPanel from '../components/tutor/TutorPanel'
import UserBadge from '../components/auth/UserBadge'
import KnowledgeGraph from '../components/knowledge/KnowledgeGraph'
import CameraUI from '../components/ui/CameraUI'
import DiagramView from '../components/diagrams/DiagramView'
import Canvas2DPanel from '../components/canvas2d/Canvas2DPanel'
import { useIdleDetection } from '../hooks/useIdleDetection'


// Lazy scene loading
const GravityScene        = React.lazy(() => import('../scenes/GravityScene'))
const ProjectileScene     = React.lazy(() => import('../scenes/ProjectileScene'))
const PendulumScene       = React.lazy(() => import('../scenes/PendulumScene'))
const CollisionScene      = React.lazy(() => import('../scenes/CollisionScene'))
const AngularMomentumScene= React.lazy(() => import('../scenes/AngularMomentumScene'))
const CreateScreen        = React.lazy(() => import('./CreateScreen'))

// Shared canvas gravity (overridden per-scene via gravityScale on RigidBodies)
const BASE_GRAVITY = [0, -9.81, 0]

function SceneFallback() {
  return (
    <mesh position={[0, 1, 0]}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#9FB3C8" />
    </mesh>
  )
}

function SceneRouter({ scene }) {
  switch (scene) {
    case 'gravity':    return <GravityScene />
    case 'projectile': return <ProjectileScene />
    case 'pendulum':   return <PendulumScene />
    case 'collision':  return <CollisionScene />
    case 'angular':    return <AngularMomentumScene />
    default:           return null
  }
}

// ── Scene Selector Tabs ───────────────────────────────────────────
function SceneTabs() {
  const { activeScene, setScene } = usePhysicsStore()
  const { trackSceneLeave, trackSceneEnter } = useAnalyticsStore()

  const handleSwitch = (id) => {
    if (id === activeScene) return
    trackSceneLeave(activeScene)
    setScene(id)
    trackSceneEnter(id)
  }

  return (
    <div style={{
      display: 'flex',
      gap: 'var(--space-1)',
      padding: 'var(--space-1)',
      background: 'rgba(255,255,255,0.7)',
      backdropFilter: 'blur(20px)',
      borderRadius: 'var(--radius-full)',
      border: '1px solid var(--color-border)',
      boxShadow: 'var(--shadow-md)',
      overflowX: 'auto',
      flexShrink: 0,
    }}>
      {Object.values(SCENE_META).map(({ id, label, icon }) => (
        <button
          key={id}
          onClick={() => handleSwitch(id)}
          style={{
            padding: 'var(--space-2) var(--space-4)',
            borderRadius: 'var(--radius-full)',
            border: 'none',
            cursor: 'pointer',
            fontFamily: 'var(--font-body)',
            fontSize: 'var(--text-sm)',
            fontWeight: 'var(--weight-medium)',
            whiteSpace: 'nowrap',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            transition: 'background-color var(--duration-fast), color var(--duration-fast), box-shadow var(--duration-fast)',
            background: activeScene === id ? 'var(--color-primary)' : 'transparent',
            color: activeScene === id ? 'white' : 'var(--color-text-muted)',
            boxShadow: activeScene === id ? 'var(--shadow-navy)' : 'none',
          }}
        >
          <span>{icon}</span>
          <span style={{ '@media(maxWidth:640px)': { display: 'none' } }}>{label}</span>
        </button>
      ))}

      {/* The Wave/SHM Tab — only shown in 2d/split mode */}
      <button
        onClick={() => handleSwitch('wave')}
        style={{
          padding: 'var(--space-2) var(--space-4)',
          borderRadius: 'var(--radius-full)',
          border: 'none',
          cursor: 'pointer',
          fontFamily: 'var(--font-body)',
          fontSize: 'var(--text-sm)',
          fontWeight: 'var(--weight-medium)',
          whiteSpace: 'nowrap',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-2)',
          transition: 'background-color var(--duration-fast), color var(--duration-fast), box-shadow var(--duration-fast)',
          background: activeScene === 'wave' ? 'var(--color-primary)' : 'transparent',
          color: activeScene === 'wave' ? 'white' : 'var(--color-text-muted)',
          boxShadow: activeScene === 'wave' ? 'var(--shadow-navy)' : 'none',
        }}
      >
        <span>〰️</span>
        <span>Wave / SHM</span>
      </button>

      {/* The Generative Create Tab */}
      <button
        onClick={() => handleSwitch('create')}
        style={{
          padding: 'var(--space-2) var(--space-4)',
          borderRadius: 'var(--radius-full)',
          border: 'none',
          cursor: 'pointer',
          fontFamily: 'var(--font-body)',
          fontSize: 'var(--text-sm)',
          fontWeight: 'var(--weight-bold)',
          whiteSpace: 'nowrap',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-2)',
          transition: 'all var(--duration-fast)',
          background: activeScene === 'create' ? 'var(--color-accent)' : 'linear-gradient(135deg, rgba(139,92,246,0.1), rgba(236,72,153,0.1))',
          color: activeScene === 'create' ? 'white' : 'var(--color-accent)',
          boxShadow: activeScene === 'create' ? '0 4px 12px rgba(139,92,246,0.4)' : 'none',
        }}
      >
        <span>🪄</span>
        <span style={{ '@media(maxWidth:640px)': { display: 'none' } }}>Create</span>
      </button>
    </div>
  )
}

// ── View Mode Toggle ──────────────────────────────────────────────
function ViewModeToggle() {
  const { viewMode, setViewMode } = usePhysicsStore()
  const modes = [
    { id: '3d',    label: '3D' },
    { id: 'split', label: 'Split' },
    { id: '2d',    label: '2D' },
  ]
  return (
    <div style={{
      display: 'flex',
      background: 'rgba(255,255,255,0.7)',
      backdropFilter: 'blur(20px)',
      borderRadius: 'var(--radius-full)',
      border: '1px solid var(--color-border)',
      padding: 'var(--space-1)',
      boxShadow: 'var(--shadow-sm)',
    }}>
      {modes.map(m => (
        <button
          key={m.id}
          onClick={() => setViewMode(m.id)}
          style={{
            padding: 'var(--space-2) var(--space-3)',
            borderRadius: 'var(--radius-full)',
            border: 'none',
            cursor: 'pointer',
            fontFamily: 'var(--font-body)',
            fontSize: 'var(--text-xs)',
            fontWeight: 'var(--weight-semibold)',
            transition: 'background-color var(--duration-fast), color var(--duration-fast)',
            background: viewMode === m.id ? 'var(--color-primary)' : 'transparent',
            color: viewMode === m.id ? 'white' : 'var(--color-text-muted)',
          }}
        >
          {m.label}
        </button>
      ))}
    </div>
  )
}

// ── Variable Sidebar (desktop) ────────────────────────────────────
function VariableSidebar() {
  const { activeScene } = usePhysicsStore()
  const vars = SCENE_VARIABLES[activeScene] ?? []
  const meta = SCENE_META[activeScene]

  return (
    <div style={{
      height: '100%',
      background: 'var(--color-surface)',
      borderRadius: 'var(--radius-lg)',
      border: '1px solid var(--color-border)',
      boxShadow: 'var(--shadow-md)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Scene info */}
      <div style={{
        padding: 'var(--space-4)',
        borderBottom: '1px solid var(--color-border)',
        flexShrink: 0,
      }}>
        <div style={{ fontSize: '1.4rem', marginBottom: 'var(--space-1)' }}>{meta?.icon}</div>
        <h3 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'var(--text-md)',
          fontWeight: 'var(--weight-bold)',
          margin: '0 0 var(--space-1) 0',
        }}>
          {meta?.label}
        </h3>
        <p style={{
          margin: 0,
          fontSize: 'var(--text-xs)',
          color: 'var(--color-text-muted)',
          lineHeight: 'var(--leading-relaxed)',
        }}>
          {meta?.description}
        </p>
      </div>

      {/* Sliders */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: 'var(--space-3) var(--space-4)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-3)',
      }}>
        {vars.map(v => (
          <ErrorBoundary key={v.name} section={`slider-${v.name}`} minHeight="60px">
            <VariableSlider variable={v} />
          </ErrorBoundary>
        ))}
      </div>

      {/* Sim controls */}
      <div style={{
        padding: 'var(--space-3) var(--space-4)',
        borderTop: '1px solid var(--color-border)',
        flexShrink: 0,
      }}>
        <ErrorBoundary section="sim-controls" minHeight="44px">
          <SimControls />
        </ErrorBoundary>
      </div>
    </div>
  )
}

// ── Right Panel (formula + graph) ────────────────────────
function RightPanel() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-3)',
      overflow: 'hidden',
      height: '100%',
    }}>
      {/* Formula Panel */}
      <div style={{
        background: 'var(--color-surface)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--color-border)',
        boxShadow: 'var(--shadow-md)',
        padding: 'var(--space-4)',
        flexShrink: 0,
      }}>
        <ErrorBoundary section="formula-panel" minHeight="100px">
          <FormulaPanel />
        </ErrorBoundary>
      </div>

      {/* Graph Panel */}
      <div style={{
        background: 'var(--color-surface)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--color-border)',
        boxShadow: 'var(--shadow-md)',
        padding: 'var(--space-3)',
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
      }}>
        <ErrorBoundary section="graph-panel" minHeight="150px">
          <GraphTabs />
        </ErrorBoundary>
      </div>
    </div>
  )
}

// ── Global Ticker (Runs outside WebGL) ───────────────────────────
function SimulationTicker() {
  const { isPlaying, tickSimTime } = usePhysicsStore()
  const lastTimeRef = useRef(performance.now())
  const reqRef = useRef()

  useEffect(() => {
    const loop = (time) => {
      if (isPlaying) {
        const delta = (time - lastTimeRef.current) / 1000
        const dt = Math.min(delta, 0.1) // Cap dt
        tickSimTime(dt)
      }
      lastTimeRef.current = time
      reqRef.current = requestAnimationFrame(loop)
    }
    reqRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(reqRef.current)
  }, [isPlaying, tickSimTime])

  // Reset lastTimeRef when play toggles to avoid huge jumps
  useEffect(() => {
    if (isPlaying) {
      lastTimeRef.current = performance.now()
    }
  }, [isPlaying])

  return null
}

// ── Canvas Disposer — runs inside R3F context, disposes GL on unmount ──
function CanvasDisposer() {
  const { gl } = useThree()
  useEffect(() => {
    return () => {
      // Properly release the WebGL context on unmount to prevent context leak.
      // forceContextLoss() is NOT called here — that is what the browser does
      // involuntarily. We simply dispose the renderer's resources and let the
      // canvas element be GC'd naturally.
      gl.dispose()
    }
  }, [gl])
  return null
}

// ── 3D Canvas ────────────────────────────────────────────────────
function SceneCanvas({ visible }) {
  const { activeScene, simKey } = usePhysicsStore()
  const controlsRef = useRef()
  const canvasDivRef = useRef()

  if (!visible) return null

  return (
    <div
      ref={canvasDivRef}
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 0,
        overflow: 'hidden',
        background: 'linear-gradient(135deg, var(--scene-bg-start), var(--scene-bg-end))',
      }}
    >
      <ErrorBoundary
        section="3d-canvas"
        title="3D simulation failed to load"
        message="The WebGL scene encountered an error. Try refreshing."
        minHeight="300px"
      >
        {/* No key on Canvas — destroying/recreating the Canvas on scene switch
            creates a new WebGL context each time and leaks the old one.
            Scene switching is handled by keying Physics + SceneRouter instead. */}
        <Canvas
          shadows={{ type: PCFShadowMap }}
          camera={{ position: [2, 8, 24], fov: 50 }}
          gl={{ antialias: true, alpha: true }}
          style={{ width: '100%', height: '100%' }}
        >
          <CanvasDisposer />
          <color attach="background" args={['#F9F5F0']} />
          <fog attach="fog" args={['#F9F5F0', 35, 80]} />
          
          <Suspense fallback={<SceneFallback />}>
            <Physics gravity={BASE_GRAVITY} key={`physics-${activeScene}-${simKey}`}>
              <SceneRouter scene={activeScene} />
            </Physics>
          </Suspense>

          <OrbitControls
            ref={controlsRef}
            makeDefault
            enableDamping
            dampingFactor={0.08}
            maxPolarAngle={Math.PI / 1.9}
            minDistance={3}
            maxDistance={200}
            touches={{ ONE: 1, TWO: 2 }}
          />
        </Canvas>
        
        <CameraUI controlsRef={controlsRef} canvasRef={canvasDivRef} />
      </ErrorBoundary>
    </div>
  )
}

// ── 2D Graph View ────────────────────────────────────────────────
function GraphCanvas({ visible }) {
  if (!visible) return null
  return (
    <div style={{
      flex: 1,
      minWidth: 0,
      background: 'rgba(255,255,255,0.7)',
      backdropFilter: 'blur(20px)',
      borderRadius: 'var(--radius-lg)',
      border: '1px solid var(--color-border)',
      boxShadow: 'var(--shadow-md)',
      padding: 'var(--space-4)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      <ErrorBoundary section="graph-2d" minHeight="200px">
        <GraphTabs />
      </ErrorBoundary>
    </div>
  )
}

// ── Mobile Bottom Sheet ───────────────────────────────────────────
function MobileBottomSheet() {
  const { activeScene } = usePhysicsStore()
  const { bottomSheetOpen, bottomSheetTab, setBottomSheetTab, setBottomSheetOpen } = useUIStore()
  const vars = SCENE_VARIABLES[activeScene] ?? []
  
  // 'collapsed' | 'half' | 'full'
  const [sheetState, setSheetState] = useState('collapsed')

  // When tab changes, ensure sheet is visible if it was already open
  useEffect(() => {
    if (bottomSheetOpen && sheetState === 'collapsed') {
      setSheetState('half')
    }
  }, [bottomSheetTab])

  const tabs = [
    { id: 'variables', label: '⚙️ Variables' },
    { id: 'formula',   label: '🔢 Formula' },
    { id: 'graph',     label: '📊 Graph' },
    { id: 'tutor',     label: '🤖 Tutor' },
  ]

  return (
    <>
      {/* Persistent SimControls strip — sits above tab row, always visible */}
      <div style={{
        position: 'fixed',
        bottom: 'calc(var(--bottom-nav-height) + var(--bottom-nav-safe) + 56px)',
        left: 0,
        right: 0,
        zIndex: 'calc(var(--z-sheet) - 1)',
        background: 'rgba(255,255,255,0.95)',
        backdropFilter: 'blur(16px)',
        borderTop: '1px solid var(--color-border)',
        padding: '6px 12px',
      }}>
        <ErrorBoundary section="sim-controls-mobile" minHeight="44px">
          <SimControls compact />
        </ErrorBoundary>
      </div>

      {/* Tab bar at bottom (above global BottomNav) */}
      <div style={{
        position: 'fixed',
        bottom: 'calc(var(--bottom-nav-height) + var(--bottom-nav-safe))',
        left: 0,
        right: 0,
        zIndex: 'var(--z-sheet)',
        display: 'flex',
        background: 'rgba(255,255,255,0.95)',
        backdropFilter: 'blur(20px)',
        borderTop: '1px solid var(--color-border)',
        boxShadow: 'var(--shadow-md)',
      }}>
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => {
              if (bottomSheetTab === t.id && bottomSheetOpen && sheetState !== 'collapsed') {
                setSheetState('collapsed')
              } else {
                setBottomSheetTab(t.id)
                setBottomSheetOpen(true)
                if (sheetState === 'collapsed') setSheetState('half')
              }
            }}
            style={{
              flex: 1,
              padding: 'var(--space-3) var(--space-1)',
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'var(--font-body)',
              fontSize: '11px',
              fontWeight: 'var(--weight-medium)',
              background: 'transparent',
              color: bottomSheetTab === t.id && bottomSheetOpen && sheetState !== 'collapsed' ? 'var(--color-primary)' : 'var(--color-text-muted)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '2px',
              minHeight: '56px',
            }}
          >
            <span style={{ fontSize: '16px' }}>{t.label.split(' ')[0]}</span>
            <span>{t.label.split(' ')[1]}</span>
          </button>
        ))}
      </div>

      {/* Draggable Sliding Sheet — sits above SimControls strip + tab row */}
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ 
          height: bottomSheetOpen 
            ? (sheetState === 'collapsed' ? '40px' : sheetState === 'half' ? '50vh' : '85vh') 
            : 0,
          opacity: bottomSheetOpen ? 1 : 0,
          y: bottomSheetOpen ? 0 : 50 
        }}
        transition={{ type: 'spring', damping: 25, stiffness: 220 }}
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={0.2}
        onDragEnd={(e, info) => {
          if (!bottomSheetOpen) return;
          const velocity = info.velocity.y;
          const offset = info.offset.y;

          if (offset > 40 || velocity > 400) {
            if (sheetState === 'full') setSheetState('half')
            else if (sheetState === 'half') setSheetState('collapsed')
            else if (sheetState === 'collapsed') setBottomSheetOpen(false)
          } else if (offset < -40 || velocity < -400) {
            if (sheetState === 'collapsed') setSheetState('half')
            else if (sheetState === 'half') setSheetState('full')
          }
        }}
        style={{
          position: 'fixed',
          // SimControls strip (≈58px) + tab row (56px) + global BottomNav (64px) + safe area
          bottom: 'calc(var(--bottom-nav-height) + var(--bottom-nav-safe) + 56px + 58px)',
          left: 0,
          right: 0,
          background: 'rgba(255,255,255,0.97)',
          backdropFilter: 'blur(24px)',
          borderTop: '1px solid var(--color-border)',
          boxShadow: 'var(--shadow-lg)',
          zIndex: 'var(--z-sheet)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0',
          touchAction: 'none',
        }}
      >
        {/* Drag handle */}
        <div style={{ padding: 'var(--space-3)', display: 'flex', justifyContent: 'center', cursor: 'grab', touchAction: 'none' }}>
          <div style={{ width: '40px', height: '5px', background: 'var(--color-border-md)', borderRadius: 'var(--radius-full)' }} />
        </div>

        {/* Content area */}
        <div style={{ 
          flex: 1, 
          overflowY: sheetState === 'collapsed' ? 'hidden' : 'auto', 
          padding: '0 var(--space-4) var(--space-4)',
          opacity: sheetState === 'collapsed' ? 0 : 1,
          transition: 'opacity 0.2s ease',
          pointerEvents: sheetState === 'collapsed' ? 'none' : 'auto'
        }}>
          {/* Variables tab — sliders only, SimControls moved to persistent strip */}
          {bottomSheetTab === 'variables' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {vars.map(v => <VariableSlider key={v.name} variable={v} compact />)}
            </div>
          )}
          {bottomSheetTab === 'formula' && <FormulaPanel />}
          {bottomSheetTab === 'graph'   && <GraphTabs />}
          {bottomSheetTab === 'tutor'   && <TutorPanel />}
        </div>
      </motion.div>
    </>
  )
}

// ── HUD Overlay ────────────────────────────────────────────────
function HUDOverlay({ sceneColor }) {
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 5, overflow: 'hidden' }}>
      {/* Top Left Bracket */}
      <svg width="40" height="40" style={{ position: 'absolute', top: 24, left: 24 }} viewBox="0 0 40 40" fill="none">
        <path d="M40 2H2V40" stroke={sceneColor || 'var(--color-primary)'} strokeWidth="2" strokeOpacity="0.5" />
      </svg>
      {/* Top Right Bracket */}
      <svg width="40" height="40" style={{ position: 'absolute', top: 24, right: 24 }} viewBox="0 0 40 40" fill="none">
        <path d="M0 2H38V40" stroke={sceneColor || 'var(--color-primary)'} strokeWidth="2" strokeOpacity="0.5" />
      </svg>
      {/* Bottom Left Bracket */}
      <svg width="40" height="40" style={{ position: 'absolute', bottom: 'calc(var(--bottom-nav-height) + var(--bottom-nav-safe) + 80px)', left: 24 }} viewBox="0 0 40 40" fill="none">
        <path d="M40 38H2V0" stroke={sceneColor || 'var(--color-primary)'} strokeWidth="2" strokeOpacity="0.5" />
      </svg>
      {/* Bottom Right Bracket */}
      <svg width="40" height="40" style={{ position: 'absolute', bottom: 'calc(var(--bottom-nav-height) + var(--bottom-nav-safe) + 80px)', right: 24 }} viewBox="0 0 40 40" fill="none">
        <path d="M0 38H38V0" stroke={sceneColor || 'var(--color-primary)'} strokeWidth="2" strokeOpacity="0.5" />
      </svg>
      {/* Telemetry Dots */}
      <div style={{ position: 'absolute', top: '50%', left: 16, transform: 'translateY(-50%)', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ width: 4, height: 4, borderRadius: '50%', background: sceneColor || 'var(--color-primary)', opacity: 0.5 }} />
        <div style={{ width: 4, height: 24, borderRadius: 2, background: sceneColor || 'var(--color-primary)', opacity: 0.3 }} />
        <div style={{ width: 4, height: 4, borderRadius: '50%', background: sceneColor || 'var(--color-primary)', opacity: 0.5 }} />
      </div>
    </div>
  )
}

// ── Simulator Screen ──────────────────────────────────────────────
export default function SimulatorScreen() {
  const { activeScene, viewMode } = usePhysicsStore()
  const [showGraph, setShowGraph] = useState(false)
  const navigate = useNavigate()
  useIdleDetection(30000)

  // ── Session Logging ───────────────────────────────────────────────
  const lastActiveScene = useRef(activeScene)
  const sceneEntryTime = useRef(Date.now())
  const hasLoggedThisVisit = useRef(false)

  const logBackendSession = useCallback((sceneId, entryTime) => {
    const durationSeconds = Math.round((Date.now() - entryTime) / 1000)
    if (durationSeconds < 5) return // ignore instant bounces

    const state = useAnalyticsStore.getState()
    const questionsAsked = state.events.filter(e => e.type === 'tutor_query' && e.data.sceneId === sceneId).length
    const variablesChanged = Array.from(new Set(
      state.events.filter(e => e.type === 'variable_change' && e.data.sceneId === sceneId).map(e => e.data.varName)
    ))

    // Fire and forget; if the tab is closing, browser will attempt to send it if possible.
    // For a fully robust approach we'd use sendBeacon, but fetch is sufficient for v1
    logSession({
      conceptId: sceneId,
      durationSeconds,
      questionsAsked,
      variablesChanged
    }).catch(() => {})
  }, [])

  // Log on scene switch within the simulator
  useEffect(() => {
    if (lastActiveScene.current !== activeScene) {
      logBackendSession(lastActiveScene.current, sceneEntryTime.current)
      lastActiveScene.current = activeScene
      sceneEntryTime.current = Date.now()
      hasLoggedThisVisit.current = false
    }
  }, [activeScene, logBackendSession])

  // Log on visibility change (tab hidden) and unmount (fallback)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        if (!hasLoggedThisVisit.current) {
          logBackendSession(lastActiveScene.current, sceneEntryTime.current)
          hasLoggedThisVisit.current = true
        }
      } else if (document.visibilityState === 'visible') {
        // Tab is visible again, start a fresh segment
        sceneEntryTime.current = Date.now()
        hasLoggedThisVisit.current = false
      }
    }

    const handleUnload = () => {
      if (!hasLoggedThisVisit.current) {
        logBackendSession(lastActiveScene.current, sceneEntryTime.current)
        hasLoggedThisVisit.current = true
      }
      // Reset entry time so subsequent unmounts (e.g. strict mode) don't re-log large durations
      sceneEntryTime.current = Date.now()
    }
    
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('beforeunload', handleUnload)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('beforeunload', handleUnload)
      handleUnload() // Unmount fallback
    }
  }, [logBackendSession])
  // ──────────────────────────────────────────────────────────────────

  // Reactive breakpoints — re-evaluates on every resize
  const isDesktop = useMediaQuery('(min-width: 1024px)')
  const isMobile = useMediaQuery('(max-width: 1023px)')

  // ── Dark mode ──────────────────────────────────────────────


  const sceneColor = SCENE_META[activeScene]?.color || 'var(--color-primary)'
  const [showMenu, setShowMenu] = useState(false)
  const { tutorPanelOpen, setTutorPanelOpen } = useUIStore()

  const show3d = viewMode === '3d' || viewMode === 'split'
  const show2d = viewMode === '2d' || viewMode === 'split'

  return (
    <div style={{
      width: '100vw',
      height: '100dvh',
      background: 'var(--color-bg)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      position: 'relative',
    }}>
      <SimulationTicker />

      {/* ── TOP NAV HEADER ── */}
      <div style={{
        padding: 'calc(var(--space-2) + env(safe-area-inset-top, 0px)) var(--space-4) var(--space-2)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'var(--color-surface)',
        borderBottom: '1px solid var(--color-border)',
        boxShadow: 'var(--shadow-xs)',
        zIndex: 20,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
          <div style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'var(--text-lg)',
            fontWeight: 'var(--weight-extrabold)',
            color: 'var(--color-text)',
          }}>
            VISIORA
          </div>
          
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            background: 'var(--color-bg)',
            padding: '4px',
            borderRadius: 'var(--radius-full)',
            border: '1px solid var(--color-border)',
          }}>
            <SceneTabs />
            {!isDesktop && <ViewModeToggle />}
          </div>
        </div>

        {!isMobile && (
          <div style={{ 
            fontSize: '10px', 
            fontFamily: 'var(--font-mono)', 
            color: sceneColor, 
            fontWeight: 'var(--weight-bold)',
            letterSpacing: '0.1em',
            background: `${sceneColor}15`,
            padding: '4px 12px',
            borderRadius: 'var(--radius-full)',
            border: `1px solid ${sceneColor}40`,
          }}>
            SIMULATION :: {activeScene.toUpperCase()}
          </div>
        )}

        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowMenu(m => !m)}
            style={{
              width: 44, height: 44,
              borderRadius: '50%',
              background: 'var(--color-bg)',
              border: '1px solid var(--color-border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--color-text)',
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>

          {showMenu && (
            <div style={{
              position: 'absolute',
              top: 'calc(100% + 8px)',
              right: 0,
              width: 220,
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow-lg)',
              padding: 'var(--space-3)',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-3)',
              animation: 'scaleInBounce 0.3s var(--ease-spring)',
              transformOrigin: 'top right',
              zIndex: 50,
            }}>
              {!isDesktop && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-semibold)', color: 'var(--color-text)' }}>View Mode</span>
                    <ViewModeToggle />
                  </div>
                  <div style={{ height: 1, background: 'var(--color-border)' }} />
                </>
              )}

              <button 
                onClick={() => { setShowGraph(true); setShowMenu(false); }}
                style={{
                  background: 'var(--navy-50)',
                  border: '1px solid var(--navy-200)',
                  borderRadius: 'var(--radius-md)',
                  padding: '8px',
                  fontSize: 'var(--text-xs)',
                  fontWeight: 'var(--weight-semibold)',
                  color: 'var(--color-primary)',
                  width: '100%',
                }}
              >
                View Knowledge Graph
              </button>

              <div style={{ height: 1, background: 'var(--color-border)' }} />
              <UserBadge />
            </div>
          )}
        </div>
      </div>

      {/* ── MAIN CONTENT AREA ── */}
      {activeScene === 'create' ? (
        <Suspense fallback={<div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading Generative Engine...</div>}>
          <CreateScreen />
        </Suspense>
      ) : (
      <div style={isDesktop ? {
        flex: 1,
        display: 'grid',
        gridTemplateColumns: '260px minmax(0, 1fr) 320px',
        gap: 'var(--space-4)',
        padding: 'var(--space-4)',
        overflow: 'hidden',
      } : {
        flex: 1,
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>

        {isDesktop ? (
          <>
            {/* Left Column */}
            <VariableSidebar />

            {/* Center Column (Canvas) */}
            <div style={{ 
              position: 'relative', 
              borderRadius: 'var(--radius-lg)', 
              overflow: 'hidden', 
              border: '1px solid var(--color-border)', 
              boxShadow: 'var(--shadow-sm)',
              background: 'var(--scene-bg-start)'
            }}>
              <div style={{
                position: 'absolute',
                inset: 0,
                zIndex: 0,
                display: 'flex',
                gap: 0,
              }}>
                {/* 3D WebGL scene (full width in 3D mode, half in split) */}
                <div style={{
                  flex: show2d && show3d ? '0 0 50%' : '1',
                  position: 'relative',
                  height: '100%',
                }}>
                  <SceneCanvas visible={show3d} />
                </div>
                {/* PhET-style 2D Canvas */}
                {show2d && (
                  <div style={{
                    flex: show3d ? '0 0 50%' : '1',
                    position: 'relative',
                    height: '100%',
                    borderLeft: show3d ? '1px solid var(--color-border)' : 'none',
                  }}>
                    <Canvas2DPanel style={{ position: 'absolute', inset: 0, borderRadius: 0, border: 'none', boxShadow: 'none' }} />
                  </div>
                )}
              </div>
              <HUDOverlay sceneColor={sceneColor} />

              {/* In-Canvas HUD Chips */}
              <div style={{
                position: 'absolute',
                top: 'var(--space-4)',
                left: 'var(--space-4)',
                display: 'flex',
                gap: 'var(--space-2)',
                zIndex: 5,
                pointerEvents: 'none',
              }}>
                <div className="glass-panel" style={{
                  padding: '4px 10px',
                  borderRadius: 'var(--radius-full)',
                  fontSize: '11px',
                  fontWeight: 'var(--weight-bold)',
                  color: 'var(--color-text)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <span style={{ color: sceneColor }}>●</span> LIVE
                </div>
                <div className="glass-panel" style={{
                  padding: '4px 10px',
                  borderRadius: 'var(--radius-full)',
                  fontSize: '11px',
                  fontWeight: 'var(--weight-semibold)',
                  color: 'var(--color-text)',
                  fontFamily: 'var(--font-mono)'
                }}>
                  T = {(usePhysicsStore.getState().t || 0).toFixed(2)}s
                </div>
              </div>

              {/* AI Tutor FAB */}
              <button
                onClick={() => setTutorPanelOpen(!tutorPanelOpen)}
                className="glass-panel"
                style={{
                  position: 'absolute',
                  bottom: 'var(--space-4)',
                  right: 'var(--space-4)',
                  width: 56, height: 56,
                  borderRadius: '50%',
                  zIndex: 20,
                  fontSize: 24,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: tutorPanelOpen ? 'var(--color-primary)' : 'var(--color-text-muted)',
                  border: tutorPanelOpen ? '2px solid var(--color-primary)' : '1px solid rgba(255,255,255,0.4)',
                  transition: 'all 0.2s',
                }}
              >
                🤖
              </button>

              {/* AI Tutor Widget */}
              {tutorPanelOpen && (
                <div className="glass-panel" style={{
                  position: 'absolute',
                  bottom: 'calc(var(--space-4) + 64px)',
                  right: 'var(--space-4)',
                  width: 320,
                  height: 480,
                  maxHeight: 'calc(100% - 100px)',
                  borderRadius: 'var(--radius-lg)',
                  zIndex: 20,
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                  animation: 'slideUp 0.3s var(--ease-spring)',
                }}>
                  <ErrorBoundary section="tutor-widget">
                    <TutorPanel />
                  </ErrorBoundary>
                </div>
              )}
            </div>

            {/* Right Column */}
            <RightPanel />
          </>
        ) : (
          <>
            {/* Mobile Layout */}
            {/* Mobile: 3D or 2D canvas */}
            <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
              <SceneCanvas visible={show3d} />
              {show2d && !show3d && <Canvas2DPanel style={{ position: 'absolute', inset: 0, borderRadius: 0, border: 'none', boxShadow: 'none' }} />}
            </div>
            <HUDOverlay sceneColor={sceneColor} />
            <div style={{ flex: 1, pointerEvents: 'auto', minHeight: 0, display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 10 }}>
              <MobileBottomSheet />
            </div>
          </>
        )}
      </div>
      )}

      {showGraph && <KnowledgeGraph onClose={() => setShowGraph(false)} />}
    </div>
  )
}
