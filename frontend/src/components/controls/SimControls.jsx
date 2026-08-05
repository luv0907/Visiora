/**
 * VISIORA — Simulation Controls
 * Play, Pause, Resume, Reset, Slow-Mo, Step-Frame
 */
import React from 'react'
import { usePhysicsStore } from '../../store/usePhysicsStore'
import { useAnalyticsStore } from '../../store/useAnalyticsStore'
import {
  Play, Pause, RotateCcw, SkipForward,
  ChevronsRight, Gauge
} from 'lucide-react'

const SPEED_OPTIONS = [0.25, 0.5, 1.0, 2.0]

export default function SimControls({ compact = false }) {
  const {
    isPlaying, isPaused, simSpeed, simTime, setSimTime, formulaState,
    play, pause, resume, reset, stepFrame, setSimSpeed
  } = usePhysicsStore()
  const { activeScene, trackReset } = useAnalyticsStore()

  const maxT = formulaState?.values?.T || formulaState?.values?.t || 10
  const currentT = Math.min(simTime, maxT)

  const handleReset = () => {
    reset()
    trackReset(activeScene)
  }

  const btnStyle = (active = false, danger = false) => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: compact ? '32px' : '36px',
    height: compact ? '32px' : '36px',
    borderRadius: 'var(--radius-md)',
    border: 'none',
    cursor: 'pointer',
    transition: 'background-color var(--duration-fast), color var(--duration-fast), box-shadow var(--duration-fast), transform var(--duration-fast)',
    background: active
      ? 'var(--color-primary)'
      : 'var(--color-surface)',
    color: active
      ? 'white'
      : danger ? '#E53E3E' : 'var(--color-text-muted)',
    boxShadow: active ? 'var(--shadow-navy)' : 'var(--shadow-xs)',
    transform: 'scale(1)',
  })

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      padding: compact ? '8px 12px' : '12px 16px',
      background: 'var(--color-surface)',
      borderRadius: 'var(--radius-lg)',
      border: '1px solid var(--color-border)',
      boxShadow: 'var(--shadow-sm)',
      width: '100%',
      maxWidth: '600px',
      margin: '0 auto',
    }}>
      {/* Top Row: Timeline Scrubber Slider */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%' }}>
        <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)', minWidth: '45px' }}>
          {currentT.toFixed(2)}s
        </span>

        <input
          type="range"
          min="0"
          max={maxT}
          step="0.01"
          value={currentT}
          onChange={(e) => {
            pause()
            setSimTime(e.target.value)
          }}
          style={{
            flex: 1,
            height: '6px',
            accentColor: 'var(--color-primary)',
            cursor: 'pointer',
          }}
        />

        <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)', minWidth: '45px', textAlign: 'right' }}>
          {maxT.toFixed(2)}s
        </span>
      </div>

      {/* Bottom Row: Playback Controls & Speed */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Play/Pause */}
          {!isPlaying ? (
            <button
              title={isPaused ? 'Resume' : 'Play'}
              style={btnStyle(true)}
              onClick={isPaused ? resume : play}
            >
              <Play size={compact ? 14 : 16} />
            </button>
          ) : (
            <button
              title="Pause"
              style={btnStyle(false)}
              onClick={pause}
            >
              <Pause size={compact ? 14 : 16} />
            </button>
          )}

          {/* Step frame */}
          {!isPlaying && (
            <button
              title="Step frame"
              style={btnStyle(false)}
              onClick={stepFrame}
            >
              <SkipForward size={compact ? 14 : 16} />
            </button>
          )}

          {/* Reset */}
          <button
            title="Reset"
            style={btnStyle(false)}
            onClick={handleReset}
          >
            <RotateCcw size={compact ? 14 : 16} />
          </button>
        </div>

        {/* Speed selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Gauge size={13} style={{ color: 'var(--color-text-muted)' }} />
          {SPEED_OPTIONS.map(s => (
            <button
              key={s}
              title={`${s}× speed`}
              onClick={() => setSimSpeed(s)}
              style={{
                fontSize: '11px',
                fontFamily: 'var(--font-mono)',
                fontWeight: '500',
                padding: '3px 6px',
                borderRadius: 'var(--radius-xs)',
                border: 'none',
                cursor: 'pointer',
                background: simSpeed === s ? 'var(--color-primary-bg)' : 'transparent',
                color: simSpeed === s ? 'var(--color-primary)' : 'var(--color-text-muted)',
              }}
            >
              {s}×
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
