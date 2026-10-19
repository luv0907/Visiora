import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Home, 
  Orbit, 
  Crosshair, 
  Compass, 
  Droplets, 
  Zap, 
  RotateCcw, 
  Sliders, 
  HelpCircle,
  Maximize2,
  ChevronRight,
  BookOpen,
  User
} from 'lucide-react'
import { useUIStore } from '../store/useUIStore'
import { SCENE_META } from '../config/physics'

import GravitySim from '../simulations/GravitySim'
import ProjectileSim from '../simulations/ProjectileSim'
import PendulumSim from '../simulations/PendulumSim'
import BuoyancySim from '../simulations/BuoyancySim'
import CollisionSim from '../simulations/CollisionSim'

import LabIcon from '../components/common/LabIcon'

const LABS = [
  { id: 'ohmslaw', label: "Ohm's Law", shortLabel: "Ohm's 3D", sub: 'Unity Bench' },
  { id: 'gravity', label: 'Free Fall', shortLabel: 'Free Fall', sub: 'Galileo Principle' },
  { id: 'projectile', label: 'Projectile', shortLabel: 'Projectile', sub: 'Kinematics' },
  { id: 'pendulum', label: 'Pendulum', shortLabel: 'Pendulum', sub: 'Harmonics & Chaos' },
  { id: 'buoyancy', label: 'Buoyancy', shortLabel: 'Buoyancy', sub: 'Archimedes Law' },
  { id: 'collision', label: 'Collisions', shortLabel: 'Collisions', sub: 'Momentum Exchange' },
]

export default function SimulatorScreen() {
  const navigate = useNavigate()
  const { activeLab, setActiveLab } = useUIStore()
  const [isFullscreen, setIsFullscreen] = useState(false)
  const currentMeta = SCENE_META[activeLab] || SCENE_META.gravity

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {})
      setIsFullscreen(true)
    } else {
      document.exitFullscreen().catch(() => {})
      setIsFullscreen(false)
    }
  }

  const handleSelectLab = (labId) => {
    if (labId === 'ohmslaw') {
      navigate('/virtual-lab')
      return
    }
    setActiveLab(labId)
  }

  return (
    <div style={{
      display: 'flex',
      height: '100dvh',
      width: '100vw',
      background: 'var(--paper)',
      overflow: 'hidden'
    }}>
      {/* ── LEFT NAVY ARCHITECTURAL RAIL ────────────────────────────────────────── */}
      <aside style={{
        width: 'var(--rail-width)',
        height: '100%',
        background: 'var(--ink)',
        borderRight: '3px solid var(--ink)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '16px 0',
        zIndex: 40,
        boxShadow: 'none'
      }}>
        {/* Logo / Home Button */}
        <button
          onClick={() => navigate('/')}
          title="VISIORA Home"
          style={{
            width: 46,
            height: 46,
            borderRadius: '50%',
            background: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 6,
            marginBottom: 20,
            boxShadow: '3px 3px 0 var(--bubblegum)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            cursor: 'pointer'
          }}
        >
          <img 
            src="/images/visiora_lotus_logo.png" 
            alt="VISIORA Lotus Logo" 
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              objectFit: 'cover',
              display: 'block'
            }} 
          />
        </button>

        {/* Lab Switcher Rail Icons */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%', alignItems: 'center' }}>
          {LABS.map(lab => {
            const isActive = activeLab === lab.id
            return (
              <button
                key={lab.id}
                onClick={() => handleSelectLab(lab.id)}
                title={`${lab.label} — ${lab.sub}`}
                style={{
                  width: 54,
                  height: 52,
                  borderRadius: 14,
                  background: isActive ? 'var(--sunflower)' : 'transparent',
                  border: `2.5px solid ${isActive ? 'var(--paper)' : 'transparent'}`,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 2,
                  color: isActive ? 'var(--ink)' : '#C7B2FF',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  boxShadow: isActive ? '3px 3px 0 var(--bubblegum)' : 'none'
                }}
              >
                <LabIcon 
                  id={lab.id} 
                  size={20} 
                  strokeWidth={isActive ? 2.2 : 1.75} 
                  color={isActive ? 'var(--ink)' : '#C7B2FF'} 
                />
                <span style={{
                  fontSize: 8.5,
                  fontWeight: 700,
                  letterSpacing: '0.02em',
                  fontFamily: 'var(--font-display)',
                  color: isActive ? 'var(--ink)' : 'inherit',
                  whiteSpace: 'nowrap'
                }}>
                  {lab.shortLabel}
                </span>
              </button>
            )
          })}
        </nav>

        {/* Bottom Rail Actions */}
        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
          <button
            onClick={() => navigate('/profile')}
            title="Physicist Profile"
            style={{
              width: 42,
              height: 42,
              borderRadius: 14,
              background: 'rgba(255, 255, 255, 0.08)',
              color: '#E2D6FF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <User size={18} />
          </button>
          <button
            onClick={() => navigate('/progress')}
            title="Learning Mastery & Progress"
            style={{
              width: 42,
              height: 42,
              borderRadius: 14,
              background: 'rgba(255, 255, 255, 0.08)',
              color: '#E2D6FF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <BookOpen size={18} />
          </button>
          <button
            onClick={toggleFullscreen}
            title="Toggle Fullscreen"
            style={{
              width: 42,
              height: 42,
              borderRadius: 14,
              background: 'rgba(255, 255, 255, 0.08)',
              color: '#E2D6FF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <Maximize2 size={18} />
          </button>
        </div>
      </aside>

      {/* ── MAIN SIMULATION VIEWPORT ────────────────────────────────────────── */}
      <div style={{
        flex: 1,
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden'
      }}>
        {/* Subtle Top Header Bar */}
        <header style={{
          position: 'absolute',
          top: 16,
          left: 20,
          zIndex: 30,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          pointerEvents: 'none'
        }}>
          <div style={{
            padding: '7px 18px',
            borderRadius: 14,
            background: 'rgba(250, 248, 245, 0.95)',
            border: '3px solid var(--ink)',
            boxShadow: '4px 4px 0 var(--ink)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            pointerEvents: 'auto'
          }}>
            <button
              onClick={() => navigate('/')}
              style={{
                fontSize: 12,
                color: 'var(--ink)',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                background: 'none',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              <Home size={14} />
              Home
            </button>
            <ChevronRight size={13} color="var(--ink-soft)" />
            <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>
              {currentMeta?.label} 3D Lab
            </span>
            <span style={{ 
              fontSize: 10, 
              padding: '2px 8px',
              borderRadius: 14,
              background: 'var(--sunflower)',
              color: 'var(--ink)',
              fontWeight: 700,
              border: '2px solid var(--ink)'
            }}>
              {currentMeta?.badge}
            </span>
          </div>
        </header>

        {/* Active 3D Simulation Canvas */}
        <main style={{ flex: 1, width: '100%', height: '100%', position: 'relative' }}>
          {activeLab === 'gravity' && <GravitySim />}
          {activeLab === 'projectile' && <ProjectileSim />}
          {activeLab === 'pendulum' && <PendulumSim />}
          {activeLab === 'buoyancy' && <BuoyancySim />}
          {activeLab === 'collision' && <CollisionSim />}
          {/* Fallback to gravity if another id is stored in localStorage */}
          {!['gravity', 'projectile', 'pendulum', 'buoyancy', 'collision'].includes(activeLab) && (
            <GravitySim />
          )}
        </main>
      </div>
    </div>
  )
}
