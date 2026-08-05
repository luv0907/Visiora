/**
 * VISIORA — Variable Slider
 * Dual-mode control: slider track + numeric input, fully synchronized.
 * Min 44px touch target everywhere. Spring animation on value change.
 */
import React, { useState, useRef, useCallback } from 'react'
import { usePhysicsStore } from '../../store/usePhysicsStore'
import { useAnalyticsStore } from '../../store/useAnalyticsStore'

const SETTLE_DELAY = 600  // ms before logging analytics event (debounce)

export default function VariableSlider({ variable, compact = false }) {
  const { name, label, min, max, step, unit } = variable
  const { activeScene, variables, setVariable } = usePhysicsStore()
  const { trackVariableChange } = useAnalyticsStore()
  const value = variables[activeScene]?.[name] ?? variable.default

  const [localInput, setLocalInput] = useState(null)  // null = display store value
  const [isHovered, setIsHovered] = useState(false)
  const [isActive, setIsActive] = useState(false)
  const settleTimer = useRef(null)

  // Format display value sensibly based on magnitude
  function fmt(v) {
    if (Math.abs(v) >= 100) return v.toFixed(1)
    if (Math.abs(v) >= 10)  return v.toFixed(2)
    return v.toFixed(3)
  }

  const handleSliderChange = useCallback((e) => {
    const v = parseFloat(e.target.value)
    setVariable(name, v)
    setLocalInput(null)

    clearTimeout(settleTimer.current)
    settleTimer.current = setTimeout(() => {
      trackVariableChange(activeScene, name, v)
    }, SETTLE_DELAY)
  }, [name, activeScene, setVariable, trackVariableChange])

  const handleInputChange = useCallback((e) => {
    setLocalInput(e.target.value)
  }, [])

  const handleInputBlur = useCallback(() => {
    if (localInput === null) return
    const v = parseFloat(localInput)
    if (!isNaN(v)) {
      setVariable(name, v)
      trackVariableChange(activeScene, name, v)
    }
    setLocalInput(null)
  }, [localInput, name, activeScene, setVariable, trackVariableChange])

  const handleInputKeyDown = useCallback((e) => {
    if (e.key === 'Enter') e.target.blur()
    if (e.key === 'Escape') setLocalInput(null)
  }, [])

  // Percentage for custom slider track fill
  const percent = ((value - min) / (max - min)) * 100

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: compact ? 'var(--space-1)' : 'var(--space-2)',
        padding: compact ? 'var(--space-2) 0' : 'var(--space-3) 0',
      }}
    >
      {/* Label + value row */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 'var(--space-2)',
      }}>
        <label
          htmlFor={`slider-${name}`}
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: compact ? 'var(--text-xs)' : 'var(--text-sm)',
            fontWeight: 'var(--weight-medium)',
            color: 'var(--color-text)',
            cursor: 'default',
            flexShrink: 0,
          }}
        >
          {label}
        </label>

        {/* Numeric input */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '2px',
          background: 'var(--color-bg)',
          border: '1.5px solid var(--color-border-md)',
          borderRadius: 'var(--radius-sm)',
          padding: '2px 6px',
          minWidth: compact ? '64px' : '80px',
          transition: 'border-color var(--duration-fast) var(--ease-standard)',
        }}
        onFocus={(e) => e.currentTarget.style.borderColor = 'var(--color-primary)'}
        onBlur={(e) => e.currentTarget.style.borderColor = 'var(--color-border-md)'}
        >
          <input
            id={`input-${name}`}
            type="number"
            min={min}
            max={max}
            step={step}
            value={localInput ?? fmt(value)}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            onKeyDown={handleInputKeyDown}
            aria-label={`${label} value`}
            style={{
              width: '100%',
              background: 'transparent',
              border: 'none',
              outline: 'none',
              fontFamily: 'var(--font-mono)',
              fontSize: compact ? 'var(--text-xs)' : 'var(--text-sm)',
              fontWeight: 'var(--weight-medium)',
              color: 'var(--color-text)',
              textAlign: 'right',
              // Hide spinners
              MozAppearance: 'textfield',
            }}
          />
          {unit && (
            <span style={{
              fontSize: 'var(--text-xs)',
              color: 'var(--color-text-muted)',
              flexShrink: 0,
              marginLeft: '2px',
            }}>
              {unit}
            </span>
          )}
        </div>
      </div>

      {/* Slider track */}
      <div 
        style={{ position: 'relative', height: '44px', display: 'flex', alignItems: 'center' }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => { setIsHovered(false); setIsActive(false); }}
      >
        {/* Custom track fill */}
        <div style={{
          position: 'absolute',
          left: 0,
          right: 0,
          height: '4px',
          background: 'var(--color-border)',
          borderRadius: 'var(--radius-full)',
          overflow: 'hidden',
        }}>
          <div style={{
            width: `${percent}%`,
            height: '100%',
            background: 'linear-gradient(90deg, var(--pink-300), var(--pink-400))',
            borderRadius: 'var(--radius-full)',
            transition: 'width var(--duration-instant) linear',
          }} />
        </div>

        {/* Native input (transparent, on top for interaction) */}
        <input
          id={`slider-${name}`}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={handleSliderChange}
          onMouseDown={() => setIsActive(true)}
          onMouseUp={() => setIsActive(false)}
          onTouchStart={() => setIsActive(true)}
          onTouchEnd={() => setIsActive(false)}
          aria-label={label}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={value}
          aria-valuetext={`${fmt(value)} ${unit}`}
          style={{
            position: 'absolute',
            width: '100%',
            height: '44px',
            opacity: 0,
            cursor: 'grab',
            margin: 0,
            zIndex: 1,
          }}
        />

        {/* Custom thumb (visual only) */}
        <div style={{
          position: 'absolute',
          left: `calc(${percent}% - 10px)`,
          width: '20px',
          height: '20px',
          background: 'white',
          border: '2.5px solid var(--color-primary)',
          borderRadius: '50%',
          boxShadow: isActive ? 'var(--shadow-glow)' : 'var(--shadow-sm)',
          transform: isActive ? 'scale(1.25)' : isHovered ? 'scale(1.15)' : 'scale(1)',
          pointerEvents: 'none',
          transition: 'left var(--duration-instant) linear, box-shadow var(--transition-fast), transform var(--transition-smooth) var(--ease-spring)',
          zIndex: 0,
        }} />
      </div>

      {/* Min / Max hints */}
      {!compact && (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 'var(--text-xs)',
          color: 'var(--color-text-faint)',
          marginTop: '-var(--space-1)',
        }}>
          <span>{min}{unit}</span>
          <span>{max}{unit}</span>
        </div>
      )}
    </div>
  )
}
