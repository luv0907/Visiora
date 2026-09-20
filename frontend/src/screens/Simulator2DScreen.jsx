/**
 * VISIORA — Simulator2DScreen
 * 100% Full-Screen Dedicated Laboratory View.
 * Guidance drawer removed; clean Option B floating top bar with VISIORA Atelier branding,
 * simulation controls, and 100% viewport allocation for the physical experiment.
 */

import React, { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import EnergyWorkbenchCanvas from '../components/sim2d/EnergyWorkbenchCanvas'
import { toggleAudioMute, isAudioMuted } from '../utils/audioEffects'

export default function Simulator2DScreen() {
  const navigate = useNavigate()

  // Simulation Controls
  const [isPaused, setIsPaused] = useState(false)
  const [simSpeed, setSimSpeed] = useState(1.0)
  const [showEnergySymbols, setShowEnergySymbols] = useState(true)
  const [linkHeaters, setLinkHeaters] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [soundMuted, setSoundMuted] = useState(false)

  // Live Telemetry
  const [telemetry, setTelemetry] = useState({
    ironTemp: '20.0',
    brickTemp: '20.0',
    waterTemp: '20.0',
    oilTemp: '20.0',
    burner1Power: '0',
    burner2Power: '0'
  })

  const studioRef = useRef(null)

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      studioRef.current?.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {})
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {})
    }
  }

  const handleReset = () => {
    if (window.__visiora_reset_workbench) {
      window.__visiora_reset_workbench()
    }
  }

  return (
    <div
      ref={studioRef}
      style={{
        width: '100vw',
        height: '100vh',
        background: '#FAF6F0',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        position: 'relative',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
      }}
    >
      {/* ── Minimal Option B Floating Studio Header (44px) ── */}
      <header
        style={{
          height: 44,
          minHeight: 44,
          background: 'rgba(255, 255, 255, 0.94)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(18, 14, 11, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
          zIndex: 30,
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
        }}
      >
        {/* Left: Brand & Back */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button
            onClick={() => navigate('/')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: '#002B66',
              fontWeight: 700,
              fontSize: 13,
              letterSpacing: '0.04em'
            }}
          >
            <span style={{ fontSize: 16 }}>←</span>
            <span>VISIORA ATELIER</span>
          </button>
          <span style={{ color: '#D4D4D8' }}>|</span>
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: '#52525B',
              letterSpacing: '0.02em',
              textTransform: 'uppercase'
            }}
          >
            Thermal Energy & Calorimetry Laboratory
          </span>
        </div>

        {/* Center/Right: Simulation Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Energy Symbols Checkbox */}
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 12,
              fontWeight: 600,
              color: '#27272A',
              cursor: 'pointer',
              padding: '4px 10px',
              borderRadius: 6,
              background: showEnergySymbols ? '#FEF3C7' : '#F4F4F5',
              border: showEnergySymbols ? '1px solid #F59E0B' : '1px solid #E4E4E7',
              transition: 'all 0.15s ease'
            }}
          >
            <input
              type="checkbox"
              checked={showEnergySymbols}
              onChange={e => setShowEnergySymbols(e.target.checked)}
              style={{ cursor: 'pointer', accentColor: '#D97706' }}
            />
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 14,
                height: 14,
                background: '#D97706',
                color: '#fff',
                fontSize: 9,
                fontWeight: 800,
                borderRadius: 2
              }}
            >
              E
            </span>
            <span>Energy Symbols</span>
          </label>

          {/* Link Heaters */}
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              fontSize: 12,
              fontWeight: 600,
              color: '#3F3F46',
              cursor: 'pointer',
              padding: '4px 8px',
              borderRadius: 6,
              background: linkHeaters ? '#EFF6FF' : '#F4F4F5',
              border: linkHeaters ? '1px solid #3B82F6' : '1px solid #E4E4E7'
            }}
          >
            <input
              type="checkbox"
              checked={linkHeaters}
              onChange={e => setLinkHeaters(e.target.checked)}
              style={{ cursor: 'pointer', accentColor: '#002B66' }}
            />
            <span>Link Heaters</span>
          </label>

          {/* Play / Pause */}
          <button
            onClick={() => setIsPaused(!isPaused)}
            style={{
              padding: '4px 10px',
              borderRadius: 6,
              border: '1px solid #E4E4E7',
              background: isPaused ? '#FEF3C7' : '#FFFFFF',
              color: isPaused ? '#B45309' : '#27272A',
              fontWeight: 600,
              fontSize: 12,
              cursor: 'pointer'
            }}
          >
            {isPaused ? '▶ Resume' : '⏸ Pause'}
          </button>

          {/* Reset Bench */}
          <button
            onClick={handleReset}
            style={{
              padding: '4px 12px',
              borderRadius: 6,
              border: '1px solid #E4E4E7',
              background: '#FFFFFF',
              color: '#002B66',
              fontWeight: 700,
              fontSize: 12,
              cursor: 'pointer'
            }}
          >
            ↺ Reset Bench
          </button>

          {/* Sound Toggle */}
          <button
            onClick={() => {
              const muted = toggleAudioMute()
              setSoundMuted(muted)
            }}
            style={{
              padding: '4px 10px',
              borderRadius: 6,
              border: '1px solid #E4E4E7',
              background: soundMuted ? '#FEE2E2' : '#FFFFFF',
              color: soundMuted ? '#DC2626' : '#27272A',
              fontWeight: 600,
              fontSize: 12,
              cursor: 'pointer'
            }}
          >
            {soundMuted ? '🔇 Muted' : '🔊 Sound ON'}
          </button>

          {/* Fullscreen */}
          <button
            onClick={toggleFullscreen}
            style={{
              padding: '4px 10px',
              borderRadius: 6,
              border: '1px solid #E4E4E7',
              background: '#FFFFFF',
              color: '#27272A',
              fontWeight: 600,
              fontSize: 12,
              cursor: 'pointer'
            }}
          >
            {isFullscreen ? '⊡ Exit' : '⛶ Fullscreen'}
          </button>
        </div>
      </header>

      {/* ── 100% Full-Viewport Experiment Workspace (No sidebar, pure laboratory) ── */}
      <main
        style={{
          flex: 1,
          width: '100%',
          height: 'calc(100vh - 44px)',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#FAF6F0',
          overflow: 'hidden'
        }}
      >
        <EnergyWorkbenchCanvas
          showEnergySymbols={showEnergySymbols}
          linkHeaters={linkHeaters}
          isPaused={isPaused}
          simSpeed={simSpeed}
          onTelemetryUpdate={setTelemetry}
        />

        {/* Floating Minimal Telemetry Strip at Bottom Center */}
        <div
          style={{
            position: 'absolute',
            bottom: 12,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(18, 14, 11, 0.88)',
            backdropFilter: 'blur(8px)',
            color: '#FFFFFF',
            padding: '6px 18px',
            borderRadius: 20,
            fontSize: 11,
            fontFamily: 'monospace',
            display: 'flex',
            gap: 16,
            alignItems: 'center',
            boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
            pointerEvents: 'none',
            zIndex: 10
          }}
        >
          <span>
            IRON: <strong style={{ color: '#E2C17D' }}>{telemetry.ironTemp}°C</strong>
          </span>
          <span>
            BRICK: <strong style={{ color: '#F97316' }}>{telemetry.brickTemp}°C</strong>
          </span>
          <span>
            WATER: <strong style={{ color: '#38BDF8' }}>{telemetry.waterTemp}°C</strong>
          </span>
          <span>
            OIL: <strong style={{ color: '#FACC15' }}>{telemetry.oilTemp}°C</strong>
          </span>
          <span>
            HEATER 1: <strong>{telemetry.burner1Power}W</strong>
          </span>
          <span>
            HEATER 2: <strong>{telemetry.burner2Power}W</strong>
          </span>
        </div>
      </main>
    </div>
  )
}
