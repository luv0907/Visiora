/**
 * VISIORA — VirtualLabScreen.jsx
 * 
 * 3D Unity Laboratory Under Active Construction Screen.
 * Elegantly displays the engineering progress of the 3D Unity WebGL apparatus,
 * showcasing upcoming 3D spatial simulations and directing users to 2D laboratories
 * and the AI Visual Tutor.
 */

import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Wrench,
  Sparkles,
  Zap,
  Orbit,
  Crosshair,
  Layers,
  Bot,
  ExternalLink,
  ChevronRight,
  Maximize2,
  Minimize2,
  Cpu,
  Clock
} from 'lucide-react'

export default function VirtualLabScreen() {
  const navigate = useNavigate()
  const [isFullscreen, setIsFullscreen] = useState(false)

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {})
      setIsFullscreen(true)
    } else {
      document.exitFullscreen().catch(() => {})
      setIsFullscreen(false)
    }
  }

  const UPCOMING_MODULES = [
    {
      id: 'ohmslaw',
      title: "3D Ohm's Law & DC Bench",
      desc: 'Interactive breadboard wiring, sliding contact rheostat, precision galvanometer, and Joule heating visualization.',
      icon: Zap,
      status: 'Final Assembly',
      progress: '85%'
    },
    {
      id: 'orbit',
      title: '3D Gravitational Chamber',
      desc: 'N-body planetary kinematics, spacetime curvature grid, Keplerian orbits, and gravitational slingshot mechanics.',
      icon: Orbit,
      status: 'Physics Calibration',
      progress: '70%'
    },
    {
      id: 'ballistics',
      title: '3D Spatial Ballistics Range',
      desc: 'Wind-tunnel projectile chamber with variable azimuth angles, aerodynamic drag vectors, and high-speed telemetry.',
      icon: Crosshair,
      status: 'Shader Modeling',
      progress: '60%'
    }
  ]

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100dvh',
        width: '100vw',
        background: '#FAF8F5',
        overflow: 'hidden',
        fontFamily: 'var(--font-body, Inter, sans-serif)'
      }}
    >
      {/* ── Top Architectural Navigation ── */}
      <header
        style={{
          height: 56,
          background: '#FFFFFF',
          borderBottom: '1px solid rgba(0, 43, 102, 0.12)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
          flexShrink: 0,
          zIndex: 20
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button
            onClick={() => navigate('/')}
            style={{
              background: '#002B66',
              border: 'none',
              color: '#FFFFFF',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 12px',
              borderRadius: 0,
              fontSize: 12.5,
              fontWeight: 700,
              boxShadow: '0 2px 6px rgba(0, 43, 102, 0.18)',
              transition: 'background 0.15s ease'
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#0A192F'}
            onMouseLeave={e => e.currentTarget.style.background = '#002B66'}
          >
            <ArrowLeft size={15} />
            <span>Back to VISIORA</span>
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span
              style={{
                fontSize: 14,
                fontWeight: 800,
                color: '#002B66',
                letterSpacing: '0.03em',
                fontFamily: 'var(--font-display, serif)'
              }}
            >
              VISIORA 3D Virtual Lab
            </span>
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: '#D97706',
                background: '#FEF3C7',
                border: '1px solid rgba(217, 119, 6, 0.25)',
                padding: '2px 8px',
                letterSpacing: '0.04em',
                textTransform: 'uppercase'
              }}
            >
              Unity 3D Engine
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 12,
              fontWeight: 700,
              color: '#D97706',
              background: 'rgba(217, 119, 6, 0.08)',
              padding: '4px 10px',
              border: '1px solid rgba(217, 119, 6, 0.2)'
            }}
          >
            <Clock size={13} />
            <span>Under Active Development</span>
          </span>

          <button
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
            style={{
              background: '#FFFFFF',
              border: '1px solid rgba(0, 43, 102, 0.2)',
              color: '#002B66',
              cursor: 'pointer',
              padding: '6px 10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </button>
        </div>
      </header>

      {/* ── Main Blueprint Content ── */}
      <main
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '40px 24px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative'
        }}
      >
        {/* Subtle grid background */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: 'radial-gradient(rgba(0, 43, 102, 0.08) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
            pointerEvents: 'none',
            zIndex: 0
          }}
        />

        <div
          style={{
            maxWidth: 820,
            width: '100%',
            position: 'relative',
            zIndex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center'
          }}
        >
          {/* Engineering Hologram Badge */}
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #002B66 0%, #0A192F 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 24px rgba(0, 43, 102, 0.25)',
              marginBottom: 20,
              border: '2px solid rgba(255, 255, 255, 0.2)'
            }}
          >
            <Cpu size={32} color="#F59E0B" />
          </div>

          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: '#FEF3C7',
              color: '#92400E',
              border: '1px solid #FDE68A',
              padding: '4px 14px',
              fontSize: 11.5,
              fontWeight: 700,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              marginBottom: 14
            }}
          >
            <Wrench size={13} color="#D97706" />
            <span>3D Interactive Engineering In Progress</span>
          </div>

          <h1
            style={{
              fontFamily: 'var(--font-display, serif)',
              fontSize: 'clamp(24px, 4vw, 36px)',
              fontWeight: 850,
              color: '#002B66',
              margin: '0 0 14px 0',
              letterSpacing: '-0.01em',
              lineHeight: 1.2
            }}
          >
            3D Virtual Physics Laboratory Bench
          </h1>

          <p
            style={{
              fontSize: 15,
              color: '#4A5568',
              lineHeight: 1.65,
              maxWidth: 640,
              margin: '0 0 28px 0'
            }}
          >
            Our physics engineering and 3D modeling team is actively building this Unity WebGL apparatus.
            Soon, students will be able to assemble circuit components, manipulate orbital mechanics, and test
            ballistic trajectories in a fully spatial 3D interactive laboratory environment.
          </p>

          {/* Action Callouts */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexWrap: 'wrap',
              gap: 12,
              marginBottom: 36
            }}
          >
            <button
              onClick={() => navigate('/sim-2d')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '12px 22px',
                background: '#002B66',
                color: '#FFFFFF',
                border: 'none',
                fontWeight: 700,
                fontSize: 13.5,
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(0, 43, 102, 0.25)',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#0A192F'}
              onMouseLeave={e => e.currentTarget.style.background = '#002B66'}
            >
              <Layers size={16} />
              <span>Explore 2D Research Laboratories</span>
            </button>

            <button
              onClick={() => navigate('/ai-tutor')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '12px 22px',
                background: '#FFFFFF',
                color: '#002B66',
                border: '1.5px solid rgba(0, 43, 102, 0.25)',
                fontWeight: 700,
                fontSize: 13.5,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#F4EFE6'}
              onMouseLeave={e => e.currentTarget.style.background = '#FFFFFF'}
            >
              <Bot size={16} color="#D97706" />
              <span>Ask AI Visual Physics Tutor</span>
            </button>

            <button
              onClick={() => navigate('/sim')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '12px 18px',
                background: 'transparent',
                color: '#64748B',
                border: 'none',
                fontWeight: 600,
                fontSize: 13,
                cursor: 'pointer',
                textDecoration: 'underline'
              }}
            >
              <span>View 3D Canvas Simulator</span>
              <ChevronRight size={14} />
            </button>
          </div>

          {/* Upcoming 3D Apparatus Grid */}
          <div style={{ width: '100%', textAlign: 'left' }}>
            <div
              style={{
                fontSize: 12,
                fontWeight: 800,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                color: '#64748B',
                marginBottom: 14,
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}
            >
              <Sparkles size={14} color="#D97706" />
              <span>Upcoming 3D Apparatus In Pipeline</span>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: 16
              }}
            >
              {UPCOMING_MODULES.map(m => {
                const Icon = m.icon
                return (
                  <div
                    key={m.id}
                    style={{
                      background: '#FFFFFF',
                      border: '1px solid rgba(0, 43, 102, 0.12)',
                      padding: 20,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 10,
                      boxShadow: '0 2px 10px rgba(0, 43, 102, 0.04)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div
                        style={{
                          width: 34,
                          height: 34,
                          background: 'rgba(0, 43, 102, 0.06)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#002B66'
                        }}
                      >
                        <Icon size={18} />
                      </div>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          color: '#166534',
                          background: '#DCFCE7',
                          padding: '2px 8px',
                          border: '1px solid #BBF7D0'
                        }}
                      >
                        {m.progress}
                      </span>
                    </div>

                    <div>
                      <h3 style={{ margin: '0 0 4px 0', fontSize: 14.5, fontWeight: 700, color: '#002B66' }}>
                        {m.title}
                      </h3>
                      <p style={{ margin: 0, fontSize: 12, color: '#64748B', lineHeight: 1.5 }}>
                        {m.desc}
                      </p>
                    </div>

                    <div
                      style={{
                        marginTop: 'auto',
                        paddingTop: 8,
                        fontSize: 10.5,
                        fontWeight: 600,
                        color: '#D97706',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5
                      }}
                    >
                      <Clock size={11} />
                      <span>Stage: {m.status}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
