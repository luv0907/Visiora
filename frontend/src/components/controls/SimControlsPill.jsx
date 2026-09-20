/**
 * VISIORA — Floating Sim Controls Pill
 * Play | Pause | Step | Reset | Speed + Time display
 * Keyboard: Space = play/pause, R = reset, F = fullscreen
 */
import React, { useEffect, useRef } from 'react'
import { usePhysicsStore } from '../../store/usePhysicsStore'
import { Play, Pause, RotateCcw, SkipForward, Maximize2 } from 'lucide-react'

const SPEED_OPTIONS = [0.25, 0.5, 1, 2]

export default function SimControlsPill({ canvasRef }) {
  const { isPlaying, isPaused, simSpeed, simTime, formulaState,
          play, pause, resume, reset, stepFrame, setSimSpeed } = usePhysicsStore()

  const maxT = formulaState?.values?.T ?? formulaState?.values?.t ?? 10
  const displayT = simTime.toFixed(2)

  // ── Keyboard Shortcuts ───────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      // Don't fire when user is typing in an input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return

      if (e.code === 'Space') {
        e.preventDefault()
        isPlaying ? pause() : (isPaused ? resume() : play())
      }
      if (e.code === 'KeyR') {
        e.preventDefault()
        reset()
      }
      if (e.code === 'KeyF') {
        e.preventDefault()
        const el = canvasRef?.current || document.documentElement
        if (!document.fullscreenElement) {
          el.requestFullscreen?.()
        } else {
          document.exitFullscreen?.()
        }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isPlaying, isPaused, play, pause, resume, reset, canvasRef])

  const btnStyle = (active = false) => ({
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: 36, height: 36,
    borderRadius: '50%',
    border: 'none',
    cursor: 'pointer',
    transition: 'background var(--duration-fast), transform var(--duration-fast)',
    background: active ? 'var(--color-primary)' : 'transparent',
    color: active ? 'white' : 'var(--color-text-muted)',
    flexShrink: 0,
    minHeight: 'unset',
  })

  return (
    <div
      className="sim-controls-pill"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        padding: '6px 12px',
      }}
      role="toolbar"
      aria-label="Simulation playback controls"
    >
      {/* Time display */}
      <span style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 12,
        color: 'var(--color-text-muted)',
        minWidth: 44,
        textAlign: 'right',
        userSelect: 'none',
      }}>
        {displayT}s
      </span>

      {/* Divider */}
      <div style={{ width: 1, height: 20, background: 'var(--color-border)', margin: '0 4px' }} />

      {/* Play/Pause */}
      <button
        style={btnStyle(isPlaying)}
        onClick={() => isPlaying ? pause() : (isPaused ? resume() : play())}
        title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
        aria-label={isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying ? <Pause size={15} /> : <Play size={15} />}
      </button>

      {/* Step (only when paused) */}
      {!isPlaying && (
        <button
          style={btnStyle()}
          onClick={stepFrame}
          title="Step one frame"
          aria-label="Step frame"
        >
          <SkipForward size={14} />
        </button>
      )}

      {/* Reset */}
      <button
        style={btnStyle()}
        onClick={reset}
        title="Reset (R)"
        aria-label="Reset simulation"
      >
        <RotateCcw size={14} />
      </button>

      {/* Divider */}
      <div style={{ width: 1, height: 20, background: 'var(--color-border)', margin: '0 4px' }} />

      {/* Speed selector */}
      {SPEED_OPTIONS.map(s => (
        <button
          key={s}
          onClick={() => setSimSpeed(s)}
          title={`${s}× speed`}
          style={{
            padding: '3px 7px',
            borderRadius: 6,
            border: 'none',
            cursor: 'pointer',
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            fontWeight: 600,
            background: simSpeed === s ? 'var(--color-primary)' : 'transparent',
            color: simSpeed === s ? 'white' : 'var(--color-text-muted)',
            transition: 'all var(--duration-fast)',
            minHeight: 'unset',
          }}
        >
          {s}×
        </button>
      ))}

      {/* Divider */}
      <div style={{ width: 1, height: 20, background: 'var(--color-border)', margin: '0 4px' }} />

      {/* Fullscreen */}
      <button
        style={btnStyle()}
        onClick={() => {
          const el = canvasRef?.current || document.documentElement
          if (!document.fullscreenElement) el.requestFullscreen?.()
          else document.exitFullscreen?.()
        }}
        title="Fullscreen (F)"
        aria-label="Toggle fullscreen"
      >
        <Maximize2 size={13} />
      </button>
    </div>
  )
}
