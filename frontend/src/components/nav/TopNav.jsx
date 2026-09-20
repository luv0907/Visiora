/**
 * VISIORA — TopNav
 * Desktop top navigation bar in creamy luxury editorial style.
 * All menu buttons provide floating dropdown menus showing all visualizations,
 * quizzes, and mastery dashboards with sharp architectural corners.
 */
import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useProgressStore } from '../../store/useProgressStore'
import { useAuthStore } from '../../store/useAuthStore'
import { useUIStore } from '../../store/useUIStore'
import LabIcon from '../common/LabIcon'
import { 
  Flame, 
  Sparkles, 
  User, 
  ChevronDown, 
  ArrowUpRight, 
  Award, 
  Target, 
  Compass, 
  BookOpen, 
  HelpCircle,
  ShieldCheck,
  Globe,
  ExternalLink,
  Zap,
  Activity,
  Sliders
} from 'lucide-react'
import { useAdminStore } from '../../store/useAdminStore'

// ── 3D SIMULATOR VISUALIZATIONS ──────────────────────────────────────
const SIM_VISUALIZATIONS = [
  {
    id: 'ohmslaw',
    label: "Ohm's Law Virtual Lab",
    badge: 'Unity 3D Lab',
    formula: 'V = I · R',
    icon: 'ohmslaw',
    desc: 'Interactive 3D laboratory bench with analog meters, rheostat & V-I graph',
    isVirtualLab: true
  },
  {
    id: 'projectile',
    label: 'Projectile Motion',
    badge: '2D Kinematics',
    formula: 'R = (v₀² sin 2θ)/g',
    icon: 'projectile',
    desc: 'Parabolic trajectories, air drag, and velocity vectors'
  },
  {
    id: 'gravity',
    label: 'Free Fall & Orbits',
    badge: 'Galileo Principle',
    formula: 'y(t) = h₀ - ½gt²',
    icon: 'gravity',
    desc: 'Mass-independent acceleration and Keplerian gravitational orbits'
  },
  {
    id: 'pendulum',
    label: 'Pendulum Mechanics',
    badge: 'Harmonics & Chaos',
    formula: 'T = 2π√(L/g)',
    icon: 'pendulum',
    desc: 'Harmonic oscillation, phase space trajectories, and double pendulum'
  },
  {
    id: 'buoyancy',
    label: 'Fluid Buoyancy',
    badge: 'Archimedes Law',
    formula: 'F_b = ρ_f · V_sub · g',
    icon: 'buoyancy',
    desc: 'Fluid displacement, density thresholds, and Archimedes force'
  },
  {
    id: 'collision',
    label: 'Elastic Collisions',
    badge: 'Momentum & Energy',
    formula: 'p = m₁v₁ + m₂v₂',
    icon: 'collision',
    desc: 'Conservation of linear momentum and kinetic energy exchange'
  }
]

// ── QUIZ CONCEPTS ──────────────────────────────────────────────────
const QUIZ_TOPICS = [
  {
    id: 'projectile',
    label: 'Projectile Kinematics Quiz',
    badge: '5 Questions',
    icon: 'projectile',
    desc: 'Test your grasp on launch angles, range, and velocity'
  },
  {
    id: 'gravity',
    label: 'Free Fall & Gravitation Quiz',
    badge: '5 Questions',
    icon: 'gravity',
    desc: 'Vacuum acceleration, mass independence, and g variations'
  },
  {
    id: 'pendulum',
    label: 'Pendulum Dynamics Quiz',
    badge: '5 Questions',
    icon: 'pendulum',
    desc: 'Oscillation periods, string length, and restoring force'
  },
  {
    id: 'buoyancy',
    label: 'Buoyancy & Fluids Quiz',
    badge: '5 Questions',
    icon: 'buoyancy',
    desc: 'Displacement, floating conditions, and fluid pressure'
  },
  {
    id: 'collision',
    label: 'Collision & Momentum Quiz',
    badge: '5 Questions',
    icon: 'collision',
    desc: 'Elastic vs inelastic impacts and kinetic energy preservation'
  }
]

// ── MASTERY SECTIONS ───────────────────────────────────────────────
const MASTERY_SECTIONS = [
  {
    id: 'overview',
    label: 'Mastery Dashboard',
    badge: 'Overview',
    icon: 'target',
    path: '/progress',
    desc: 'Comprehensive score analytics, learning streak, and activity'
  },
  {
    id: 'concepts',
    label: 'Concept Proficiency',
    badge: '5 Concepts',
    icon: 'compass',
    path: '/progress',
    desc: 'Deep breakdown across Kinematics, Gravity, and Fluid Dynamics'
  },
  {
    id: 'badges',
    label: 'Physicist Badges Shelf',
    badge: 'Honors',
    icon: 'award',
    path: '/progress',
    desc: 'Inspect unlocked medals, streaks, and milestone credentials'
  }
]

const TABS = [
  { id: 'home', label: 'Home', path: '/', hasDropdown: false },
  { id: 'sim', label: '3D Simulator', path: '/sim', hasDropdown: true },
  { id: 'sim2d', label: '2D Labs', path: '/sim-2d', hasDropdown: true },
  { id: 'progress', label: 'Mastery', path: '/progress', hasDropdown: true },
  { id: 'quiz', label: 'Quiz', path: '/quiz/projectile', hasDropdown: true },
]

export default function TopNav() {
  const navigate = useNavigate()
  const location = useLocation()
  
  const user = useAuthStore(state => state.user)
  const profile = useProgressStore(state => state.profile)
  const visualizations = useAdminStore(state => state.visualizations)
  const trackVisualizationClick = useAdminStore(state => state.trackVisualizationClick)
  const active2dVisualizations = (visualizations || []).filter(v => v.isActive !== false)

  const [isScrolled, setIsScrolled] = useState(false)
  const [openDropdown, setOpenDropdown] = useState(null) // 'sim' | 'progress' | 'quiz' | null
  const navContainerRef = useRef(null)
  const hoverTimeoutRef = useRef(null)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 15)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Close dropdown on outside click or Escape key
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (navContainerRef.current && !navContainerRef.current.contains(e.target)) {
        setOpenDropdown(null)
      }
    }
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setOpenDropdown(null)
    }

    document.addEventListener('mousedown', handleOutsideClick)
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
      window.removeEventListener('keydown', handleKeyDown)
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)
    }
  }, [])

  const handleTabMouseEnter = (tab) => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)
    if (tab.id === 'home') {
      setOpenDropdown(null)
    } else {
      setOpenDropdown(tab.id)
    }
  }

  const handleTabMouseLeave = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)
    hoverTimeoutRef.current = setTimeout(() => {
      setOpenDropdown(null)
    }, 180)
  }

  const getActiveTab = () => {
    const path = location.pathname
    if (path === '/') return 'home'
    if (path.startsWith('/sim-2d')) return 'sim2d'
    if (path.startsWith('/sim')) return 'sim'
    if (path.startsWith('/profile')) return 'profile'
    if (path.startsWith('/progress')) return 'progress'
    if (path.startsWith('/quiz')) return 'quiz'
    return 'home'
  }

  const activeTab = getActiveTab()
  const streak = profile?.streak || 3

  const handleTabClick = (tab) => {
    if (tab.id === 'home') {
      setOpenDropdown(null)
      navigate('/')
      if (location.pathname === '/') {
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }
    } else if (tab.id === 'sim2d' && !openDropdown) {
      setOpenDropdown('sim2d')
    } else {
      // Toggle dropdown menu on click as well
      setOpenDropdown(prev => prev === tab.id ? null : tab.id)
    }
  }

  const handleLaunch2DLab = (path) => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)
    setOpenDropdown(null)
    navigate(path)
  }

  const handleLaunchSim = (labId) => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)
    setOpenDropdown(null)
    if (labId === 'ohmslaw') {
      navigate('/virtual-lab')
      return
    }
    useUIStore.getState().setActiveLab(labId)
    navigate('/sim')
  }

  const handleSelectQuiz = (conceptId) => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)
    setOpenDropdown(null)
    navigate(`/quiz/${conceptId}`)
  }

  const handleSelectMastery = (path) => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)
    setOpenDropdown(null)
    navigate(path)
  }

  return (
    <nav
      role="navigation"
      style={{
        position: 'sticky',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 'var(--z-header)',
        backgroundColor: isScrolled ? 'rgba(250, 245, 236, 0.94)' : 'transparent',
        backdropFilter: isScrolled ? 'blur(16px)' : 'none',
        WebkitBackdropFilter: isScrolled ? 'blur(16px)' : 'none',
        borderBottom: isScrolled ? '1px solid rgba(203, 163, 88, 0.35)' : '1px solid transparent',
        boxShadow: isScrolled ? '0 8px 24px rgba(18, 14, 11, 0.08)' : 'none',
        height: '64px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'background-color 0.35s ease, border-color 0.35s ease, box-shadow 0.35s ease, backdrop-filter 0.35s ease'
      }}
    >
      <div 
        ref={navContainerRef}
        style={{
          width: '100%',
          maxWidth: '1240px',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: '100%',
          boxSizing: 'border-box'
        }}
      >
        {/* Left: Logo */}
        <div 
          onClick={() => {
            setOpenDropdown(null)
            navigate('/')
          }}
          style={{ 
            fontFamily: 'var(--font-serif)', 
            fontSize: 22, 
            fontWeight: 700,
            color: 'var(--obsidian-950)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            letterSpacing: '0.04em'
          }}
        >
          <img 
            src="/images/visiora_lotus_logo.png" 
            alt="VISIORA Lotus Logo" 
            style={{
              width: 34,
              height: 34,
              borderRadius: '50%',
              objectFit: 'cover',
              display: 'block',
              boxShadow: '0 2px 8px rgba(18, 14, 11, 0.12)'
            }} 
          />
          VISIORA
        </div>

        {/* Center: Nav Tabs with Dropdown Anchors */}
        <div style={{
          display: 'flex',
          gap: 6,
          background: 'var(--cream-200)',
          padding: 4,
          borderRadius: 0, // Sharp architectural container
          border: '1px solid var(--color-border-subtle)'
        }}>
          {TABS.map(tab => {
            const active = activeTab === tab.id
            const isOpen = openDropdown === tab.id

            return (
              <div 
                key={tab.id} 
                style={{ position: 'relative' }}
                onMouseEnter={() => handleTabMouseEnter(tab)}
                onMouseLeave={handleTabMouseLeave}
              >
                <button
                  onClick={() => handleTabClick(tab)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '7px 18px',
                    borderRadius: 0, // Sharp architectural edges
                    fontSize: 13,
                    fontWeight: active || isOpen ? 700 : 500,
                    color: active || isOpen ? '#FFFFFF' : 'var(--obsidian-900)',
                    backgroundColor: active || isOpen ? '#002B66' : 'transparent',
                    transition: 'all var(--duration-fast)',
                    boxShadow: active || isOpen ? '0 2px 8px rgba(0, 43, 102, 0.25)' : 'none',
                    cursor: 'pointer',
                    border: 'none'
                  }}
                >
                  <span>{tab.label}</span>
                  {tab.hasDropdown && (
                    <ChevronDown
                      size={13}
                      style={{
                        transform: isOpen ? 'rotate(180deg)' : 'none',
                        transition: 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                        opacity: active || isOpen ? 0.9 : 0.6
                      }}
                    />
                  )}
                </button>

                {/* Invisible hover bridge ensuring smooth cursor transition to dropdown */}
                {isOpen && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: -20,
                      right: -20,
                      height: 12,
                      zIndex: 999
                    }}
                  />
                )}

                {/* ── 3D & 2D SIMULATOR DROPDOWN (ALL VISUALIZATIONS) ── */}
                {isOpen && tab.id === 'sim' && (
                  <div
                    onMouseEnter={() => { if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current) }}
                    onMouseLeave={handleTabMouseLeave}
                    data-lenis-prevent="true"
                    style={{
                      position: 'absolute',
                      top: 'calc(100% + 8px)',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      width: 390,
                      maxHeight: '480px',
                      overflowY: 'auto',
                      overscrollBehavior: 'contain',
                      borderRadius: 0,
                      background: '#FAF8F5',
                      border: '1px solid rgba(0, 43, 102, 0.18)',
                      borderTop: '3px solid #002B66',
                      boxShadow: '0 16px 40px rgba(0, 43, 102, 0.15)',
                      zIndex: 1000,
                      padding: '6px 0',
                      animation: 'fadeIn 0.15s ease-out'
                    }}
                  >
                    {/* Header: 3D Labs */}
                    <div
                      style={{
                        padding: '10px 16px',
                        fontSize: 10.5,
                        fontWeight: 800,
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                        color: '#002B66',
                        borderBottom: '1px solid rgba(0, 43, 102, 0.12)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        background: 'rgba(0, 43, 102, 0.05)'
                      }}
                    >
                      <span>3D Physics Engines</span>
                      <span style={{ fontSize: 10, color: '#002B66', fontWeight: 700, background: 'rgba(0, 43, 102, 0.08)', padding: '2px 6px' }}>
                        {SIM_VISUALIZATIONS.length} Real-Time Labs
                      </span>
                    </div>

                    {/* 3D Simulation List */}
                    <div style={{ padding: '6px' }}>
                      {SIM_VISUALIZATIONS.map(sim => (
                        <div
                          key={sim.id}
                          onClick={() => handleLaunchSim(sim.id)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '10px 12px',
                            borderRadius: 0,
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                            border: '1px solid transparent',
                            marginBottom: 2
                          }}
                          onMouseEnter={e => {
                            e.currentTarget.style.background = '#FFFFFF'
                            e.currentTarget.style.borderColor = 'rgba(0, 43, 102, 0.22)'
                            e.currentTarget.style.transform = 'translateX(3px)'
                            e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 43, 102, 0.08)'
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.background = 'transparent'
                            e.currentTarget.style.borderColor = 'transparent'
                            e.currentTarget.style.transform = 'none'
                            e.currentTarget.style.boxShadow = 'none'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div
                              style={{
                                width: 36,
                                height: 36,
                                borderRadius: 0,
                                background: '#FFFFFF',
                                border: '1px solid rgba(0, 43, 102, 0.2)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#002B66',
                                flexShrink: 0
                              }}
                            >
                              <LabIcon id={sim.id} name={sim.icon} size={18} />
                            </div>
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ fontSize: 13.5, fontWeight: 700, color: '#0A192F' }}>
                                  {sim.label}
                                </span>
                                <span style={{ 
                                  fontSize: 9.5, 
                                  fontWeight: 700, 
                                  color: '#002B66', 
                                  background: 'rgba(0, 43, 102, 0.08)',
                                  border: '1px solid rgba(0, 43, 102, 0.15)',
                                  padding: '1px 6px',
                                  borderRadius: 0
                                }}>
                                  {sim.badge}
                                </span>
                              </div>
                              <div style={{ fontSize: 11, color: '#4A5568', marginTop: 2, fontWeight: 500, lineHeight: 1.25 }}>
                                {sim.desc}
                              </div>
                            </div>
                          </div>

                          <ArrowUpRight size={15} color="#002B66" style={{ flexShrink: 0, marginLeft: 8 }} />
                        </div>
                      ))}
                    </div>

                    {/* Footer Shortcut to 2D Studios */}
                    <div style={{ padding: '8px 12px', borderTop: '1px solid rgba(0, 43, 102, 0.1)', background: '#F4EFE6' }}>
                      <div
                        onClick={() => {
                          setOpenDropdown(null)
                          navigate('/sim-2d')
                        }}
                        style={{
                          fontSize: 11.5,
                          fontWeight: 700,
                          color: '#002B66',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          cursor: 'pointer',
                          padding: '4px 6px'
                        }}
                      >
                        <span>Looking for 2D Interactive Studios?</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          Explore 2D Labs <ArrowUpRight size={13} />
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── 2D LABORATORIES DROPDOWN ── */}
                {isOpen && tab.id === 'sim2d' && (
                  <div
                    onMouseEnter={() => { if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current) }}
                    onMouseLeave={handleTabMouseLeave}
                    data-lenis-prevent="true"
                    style={{
                      position: 'absolute',
                      top: 'calc(100% + 8px)',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      width: 420,
                      maxHeight: '480px',
                      overflowY: 'auto',
                      overscrollBehavior: 'contain',
                      borderRadius: 0,
                      background: '#FAF8F5',
                      border: '1px solid rgba(0, 43, 102, 0.18)',
                      borderTop: '3px solid #002B66',
                      boxShadow: '0 16px 40px rgba(0, 43, 102, 0.15)',
                      zIndex: 1000,
                      padding: '6px 0',
                      animation: 'fadeIn 0.15s ease-out'
                    }}
                  >
                    {/* Header */}
                    <div
                      style={{
                        padding: '10px 16px',
                        fontSize: 10.5,
                        fontWeight: 800,
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                        color: '#002B66',
                        borderBottom: '1px solid rgba(0, 43, 102, 0.12)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        background: 'rgba(0, 43, 102, 0.05)'
                      }}
                    >
                      <span>Native 2D Physics Laboratories</span>
                      <span style={{ fontSize: 10, color: '#002B66', fontWeight: 700, background: 'rgba(0, 43, 102, 0.08)', padding: '2px 6px' }}>
                        Atelier 2D Engine
                      </span>
                    </div>

                    {/* Labs List */}
                    <div style={{ padding: '6px' }}>
                      {active2dVisualizations.map(vis => {
                        const labPath = vis.internalPath || `/sim-2d?lab=${vis.id.replace('vis-', '').replace('phet-', '')}`
                        return (
                          <div
                            key={vis.id}
                            onClick={() => {
                              trackVisualizationClick(vis.id)
                              handleLaunch2DLab(labPath)
                            }}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '10px 12px',
                              borderRadius: 0,
                              cursor: 'pointer',
                              transition: 'all 0.15s ease',
                              border: '1px solid transparent',
                              marginBottom: 2
                            }}
                            onMouseEnter={e => {
                              e.currentTarget.style.background = '#FFFFFF'
                              e.currentTarget.style.borderColor = 'rgba(0, 43, 102, 0.22)'
                              e.currentTarget.style.transform = 'translateX(3px)'
                              e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 43, 102, 0.08)'
                            }}
                            onMouseLeave={e => {
                              e.currentTarget.style.background = 'transparent'
                              e.currentTarget.style.borderColor = 'transparent'
                              e.currentTarget.style.transform = 'none'
                              e.currentTarget.style.boxShadow = 'none'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                              <div
                                style={{
                                  width: 36,
                                  height: 36,
                                  borderRadius: 0,
                                  background: '#002B66',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  color: '#FFFFFF',
                                  flexShrink: 0
                                }}
                              >
                                {vis.id.includes('energy') ? (
                                  <Flame size={17} strokeWidth={2} />
                                ) : vis.id.includes('circuit') ? (
                                  <Zap size={17} strokeWidth={2} />
                                ) : vis.id.includes('wave') ? (
                                  <Activity size={17} strokeWidth={2} />
                                ) : (
                                  <Sliders size={17} strokeWidth={2} />
                                )}
                              </div>
                              <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <span style={{ fontSize: 13.5, fontWeight: 700, color: '#0A192F' }}>
                                    {vis.title.split(':')[0]}
                                  </span>
                                  <span style={{
                                    fontSize: 9.5,
                                    fontWeight: 700,
                                    color: '#002B66',
                                    background: 'rgba(0, 43, 102, 0.08)',
                                    border: '1px solid rgba(0, 43, 102, 0.15)',
                                    padding: '1px 6px',
                                    borderRadius: 0
                                  }}>
                                    {vis.badge || '2D Studio'}
                                  </span>
                                </div>
                                <div style={{ fontSize: 11, color: '#4A5568', marginTop: 2, fontWeight: 500, lineHeight: 1.25 }}>
                                  {vis.category} &bull; Interactive Studio Workbench
                                </div>
                              </div>
                            </div>

                            <ArrowUpRight size={15} color="#002B66" style={{ flexShrink: 0, marginLeft: 8 }} />
                          </div>
                        )
                      })}
                    </div>

                    {/* Footer Launch Atelier Link */}
                    <div style={{ padding: '8px 12px', borderTop: '1px solid rgba(0,43,102,0.1)', background: '#F4EFE6' }}>
                      <button
                        onClick={() => handleLaunch2DLab('/sim-2d?lab=energy-forms-and-changes')}
                        style={{
                          width: '100%',
                          padding: '9px 14px',
                          background: '#002B66',
                          color: '#FFFFFF',
                          border: 'none',
                          borderRadius: 0,
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6,
                          boxShadow: '0 2px 8px rgba(0, 43, 102, 0.25)'
                        }}
                      >
                        <span>Open 2D Atelier Studio</span>
                        <ArrowUpRight size={13} />
                      </button>
                    </div>
                  </div>
                )}

                {/* ── QUIZ DROPDOWN (ALL TOPIC QUIZZES) ── */}
                {isOpen && tab.id === 'quiz' && (
                  <div
                    onMouseEnter={() => { if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current) }}
                    onMouseLeave={handleTabMouseLeave}
                    data-lenis-prevent="true"
                    style={{
                      position: 'absolute',
                      top: 'calc(100% + 8px)',
                      right: 0,
                      width: 370,
                      maxHeight: '480px',
                      overflowY: 'auto',
                      overscrollBehavior: 'contain',
                      borderRadius: 0,
                      background: '#FAF8F5',
                      border: '1px solid rgba(0, 43, 102, 0.18)',
                      borderTop: '3px solid #002B66',
                      boxShadow: '0 16px 40px rgba(0, 43, 102, 0.15)',
                      zIndex: 1000,
                      padding: '6px 0',
                      animation: 'fadeIn 0.15s ease-out'
                    }}
                  >
                    {/* Header */}
                    <div
                      style={{
                        padding: '10px 16px',
                        fontSize: 10.5,
                        fontWeight: 800,
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                        color: '#002B66',
                        borderBottom: '1px solid rgba(0, 43, 102, 0.12)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        background: 'rgba(0, 43, 102, 0.05)'
                      }}
                    >
                      <span>Physics Topic Quizzes</span>
                      <span style={{ fontSize: 10, color: '#002B66', fontWeight: 700, background: 'rgba(0, 43, 102, 0.08)', padding: '2px 6px' }}>
                        {QUIZ_TOPICS.length} Challenges
                      </span>
                    </div>

                    {/* Quiz List */}
                    <div style={{ padding: '6px' }}>
                      {QUIZ_TOPICS.map(quiz => (
                        <div
                          key={quiz.id}
                          onClick={() => handleSelectQuiz(quiz.id)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '10px 12px',
                            borderRadius: 0,
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                            border: '1px solid transparent',
                            marginBottom: 2
                          }}
                          onMouseEnter={e => {
                            e.currentTarget.style.background = '#FFFFFF'
                            e.currentTarget.style.borderColor = 'rgba(0, 43, 102, 0.22)'
                            e.currentTarget.style.transform = 'translateX(3px)'
                            e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 43, 102, 0.08)'
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.background = 'transparent'
                            e.currentTarget.style.borderColor = 'transparent'
                            e.currentTarget.style.transform = 'none'
                            e.currentTarget.style.boxShadow = 'none'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div
                              style={{
                                width: 36,
                                height: 36,
                                borderRadius: 0,
                                background: '#FFFFFF',
                                border: '1px solid rgba(0, 43, 102, 0.2)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#002B66',
                                flexShrink: 0
                              }}
                            >
                              <LabIcon id={quiz.id} name={quiz.icon} size={18} />
                            </div>
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ fontSize: 13.5, fontWeight: 700, color: '#0A192F' }}>
                                  {quiz.label}
                                </span>
                                <span style={{ 
                                  fontSize: 9.5, 
                                  fontWeight: 700, 
                                  color: '#002B66', 
                                  background: 'rgba(0, 43, 102, 0.08)',
                                  border: '1px solid rgba(0, 43, 102, 0.15)',
                                  padding: '1px 6px',
                                  borderRadius: 0
                                }}>
                                  {quiz.badge}
                                </span>
                              </div>
                              <div style={{ fontSize: 11, color: '#4A5568', marginTop: 2, fontWeight: 500, lineHeight: 1.25 }}>
                                {quiz.desc}
                              </div>
                            </div>
                          </div>

                          <ArrowUpRight size={15} color="#002B66" style={{ flexShrink: 0, marginLeft: 8 }} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── MASTERY DROPDOWN (DASHBOARD & BADGES) ── */}
                {isOpen && tab.id === 'progress' && (
                  <div
                    onMouseEnter={() => { if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current) }}
                    onMouseLeave={handleTabMouseLeave}
                    data-lenis-prevent="true"
                    style={{
                      position: 'absolute',
                      top: 'calc(100% + 8px)',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      width: 350,
                      maxHeight: '480px',
                      overflowY: 'auto',
                      overscrollBehavior: 'contain',
                      borderRadius: 0,
                      background: '#FAF8F5',
                      border: '1px solid rgba(0, 43, 102, 0.18)',
                      borderTop: '3px solid #002B66',
                      boxShadow: '0 16px 40px rgba(0, 43, 102, 0.15)',
                      zIndex: 1000,
                      padding: '6px 0',
                      animation: 'fadeIn 0.15s ease-out'
                    }}
                  >
                    {/* Header */}
                    <div
                      style={{
                        padding: '10px 16px',
                        fontSize: 10.5,
                        fontWeight: 800,
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                        color: '#002B66',
                        borderBottom: '1px solid rgba(0, 43, 102, 0.12)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        background: 'rgba(0, 43, 102, 0.05)'
                      }}
                    >
                      <span>Physicist Mastery</span>
                      <span style={{ fontSize: 10, color: '#002B66', fontWeight: 700, background: 'rgba(0, 43, 102, 0.08)', padding: '2px 6px' }}>Overview</span>
                    </div>

                    {/* Mastery Options */}
                    <div style={{ padding: '6px' }}>
                      {MASTERY_SECTIONS.map(item => (
                        <div
                          key={item.id}
                          onClick={() => handleSelectMastery(item.path)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '10px 12px',
                            borderRadius: 0,
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                            border: '1px solid transparent',
                            marginBottom: 2
                          }}
                          onMouseEnter={e => {
                            e.currentTarget.style.background = '#FFFFFF'
                            e.currentTarget.style.borderColor = 'rgba(0, 43, 102, 0.22)'
                            e.currentTarget.style.transform = 'translateX(3px)'
                            e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 43, 102, 0.08)'
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.background = 'transparent'
                            e.currentTarget.style.borderColor = 'transparent'
                            e.currentTarget.style.transform = 'none'
                            e.currentTarget.style.boxShadow = 'none'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div
                              style={{
                                width: 36,
                                height: 36,
                                borderRadius: 0,
                                background: '#FFFFFF',
                                border: '1px solid rgba(0, 43, 102, 0.2)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#002B66',
                                flexShrink: 0
                              }}
                            >
                              {item.id === 'overview' && <Target size={17} />}
                              {item.id === 'concepts' && <Compass size={17} />}
                              {item.id === 'badges' && <Award size={17} />}
                            </div>
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ fontSize: 13.5, fontWeight: 700, color: '#0A192F' }}>
                                  {item.label}
                                </span>
                                <span style={{ 
                                  fontSize: 9.5, 
                                  fontWeight: 700, 
                                  color: '#002B66', 
                                  background: 'rgba(0, 43, 102, 0.08)',
                                  border: '1px solid rgba(0, 43, 102, 0.15)',
                                  padding: '1px 6px',
                                  borderRadius: 0
                                }}>
                                  {item.badge}
                                </span>
                              </div>
                              <div style={{ fontSize: 11, color: '#4A5568', marginTop: 2, fontWeight: 500, lineHeight: 1.25 }}>
                                {item.desc}
                              </div>
                            </div>
                          </div>

                          <ArrowUpRight size={15} color="#002B66" style={{ flexShrink: 0, marginLeft: 8 }} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Right: Stats & Profile & Admin Portal */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={() => {
              setOpenDropdown(null)
              navigate('/admin')
            }}
            title="Atelier Admin Portal (Authorized Google)"
            className="btn-navy-primary"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 14px',
              borderRadius: 0,
              background: '#002B66',
              color: '#FFFFFF',
              border: 'none',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0, 43, 102, 0.25)',
              transition: 'all var(--transition-fast)'
            }}
          >
            <ShieldCheck size={14} />
            <span>Admin</span>
          </button>

          <div style={{ 
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            backgroundColor: 'var(--cream-100)',
            padding: '4px 12px',
            borderRadius: 0, // Sharp corners
            border: '1px solid var(--color-border)'
          }}>
            <Flame size={15} color="#D97706" />
            <span className="mono" style={{ fontSize: 13, fontWeight: 700, color: 'var(--obsidian-900)' }}>
              {streak}d
            </span>
          </div>
          
          <div 
            onClick={() => {
              setOpenDropdown(null)
              navigate('/profile')
            }}
            title="View Physicist Profile"
            style={{
              width: 36,
              height: 36,
              borderRadius: 0,
              background: activeTab === 'profile' ? '#0A192F' : '#002B66',
              border: '1.5px solid #002B66',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0, 43, 102, 0.25)',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-1px)'
              e.currentTarget.style.background = '#0A192F'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'none'
              e.currentTarget.style.background = activeTab === 'profile' ? '#0A192F' : '#002B66'
            }}
          >
            <User size={18} strokeWidth={2.2} />
          </div>
        </div>
      </div>
    </nav>
  )
}
