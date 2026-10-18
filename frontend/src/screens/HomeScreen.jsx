import React, { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Sparkles, 
  ArrowUpRight, 
  Play, 
  BookOpen, 
  Compass, 
  ChevronRight, 
  TrendingUp, 
  Layers, 
  CheckCircle2,
  Globe,
  ExternalLink,
  ShieldCheck,
  LineChart,
  Gauge,
  Orbit,
  Flashlight,
  Zap
} from 'lucide-react'
import { useProgressStore } from '../store/useProgressStore'
import { useUIStore } from '../store/useUIStore'
import { useAuthStore } from '../store/useAuthStore'
import { useAdminStore } from '../store/useAdminStore'
import { SCENE_META } from '../config/physics'
import LabIcon from '../components/common/LabIcon'
import PeriodicParallaxSection from '../components/home/PeriodicParallaxSection'
import KinematicsLivePreview from '../components/home/KinematicsLivePreview'
import TopicSearchBar from '../components/home/TopicSearchBar'

export default function HomeScreen() {
  const navigate = useNavigate()
  const progressPayload = useProgressStore(state => state.profile)
  const user = useAuthStore(state => state.user)

  const [greeting, setGreeting] = useState('Welcome')
  const [hoveredCard, setHoveredCard] = useState(null)
  const [hovered2dCard, setHovered2dCard] = useState(null)
  const [topicSearchQuery, setTopicSearchQuery] = useState('')

  const experiments = useAdminStore(state => state.experiments)
  const visualizations = useAdminStore(state => state.visualizations)
  const trackVisualizationClick = useAdminStore(state => state.trackVisualizationClick)
  const [currentDateTime, setCurrentDateTime] = useState({
    time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    date: new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
  })

  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date()
      const hour = now.getHours()
      if (hour < 12) setGreeting('Good morning')
      else if (hour < 17) setGreeting('Good afternoon')
      else setGreeting('Good evening')

      setCurrentDateTime({
        time: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        date: now.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
      })
    }

    updateDateTime()
    const timer = setInterval(updateDateTime, 1000)
    return () => clearInterval(timer)
  }, [])

  const displayName = progressPayload?.profile?.name || user?.displayName || 'Physicist'
  const mastery = progressPayload?.mastery || {}
  const labs = Object.values(SCENE_META)

  // Dynamically merge custom 3D labs added by admin
  const custom3DLabs = useMemo(() => {
    const coreLabIds = new Set(['projectile', 'gravity', 'pendulum', 'buoyancy', 'collision', 'ohmslaw'])
    return (experiments || [])
      .filter(e => e.type === '3d' && !coreLabIds.has(e.id) && e.isActive !== false)
      .map(e => ({
        id: e.id,
        label: e.title,
        badge: e.badge || '3D Lab',
        description: e.subtitle || e.category,
        formula: e.formula || '',
        isCustom: true
      }))
  }, [experiments])

  const all3DLabs = useMemo(() => {
    return [...labs, ...custom3DLabs]
  }, [labs, custom3DLabs])

  const avgMastery = Math.round(
    all3DLabs.reduce((acc, lab) => acc + (mastery[lab.id]?.score || 0), 0) / (all3DLabs.length || 1)
  )

  const filteredLabs = useMemo(() => {
    const q = topicSearchQuery.trim().toLowerCase()
    if (!q) return all3DLabs
    return all3DLabs.filter(lab => {
      const matchLabel = (lab.label || '').toLowerCase().includes(q)
      const matchBadge = (lab.badge || '').toLowerCase().includes(q)
      const matchDesc = (lab.description || '').toLowerCase().includes(q)
      const matchFormula = (lab.formula || '').toLowerCase().includes(q)
      return matchLabel || matchBadge || matchDesc || matchFormula
    })
  }, [all3DLabs, topicSearchQuery])

  const active2dVisualizations = useMemo(() => {
    return (visualizations || []).filter(v => v.isActive !== false)
  }, [visualizations])

  const filtered2dVisualizations = useMemo(() => {
    const q = topicSearchQuery.trim().toLowerCase()
    if (!q) return active2dVisualizations
    return active2dVisualizations.filter(v => {
      const matchTitle = (v.title || '').toLowerCase().includes(q)
      const matchSubtitle = (v.subtitle || '').toLowerCase().includes(q)
      const matchCat = (v.category || '').toLowerCase().includes(q)
      const matchBadge = (v.badge || '').toLowerCase().includes(q)
      return matchTitle || matchSubtitle || matchCat || matchBadge
    })
  }, [active2dVisualizations, topicSearchQuery])

  const showVirtualLabCard = useMemo(() => {
    if (!topicSearchQuery) return true
    const q = topicSearchQuery.trim().toLowerCase()
    return 'ohms law'.includes(q) || 'ohm'.includes(q) || 'electricity'.includes(q) || 
           'circuit'.includes(q) || 'resistor'.includes(q) || 'virtual lab'.includes(q) ||
           'unity'.includes(q) || 'voltage'.includes(q) || 'current'.includes(q) || 'resistance'.includes(q)
  }, [topicSearchQuery])

  const handleLaunchLab = (labId) => {
    const coreLabIds = ['projectile', 'gravity', 'pendulum', 'buoyancy', 'collision']
    if (coreLabIds.includes(labId)) {
      useUIStore.getState().setActiveLab(labId)
      navigate('/sim')
    } else {
      navigate(`/lab/${labId}`)
    }
  }

  return (
    <div style={{
      minHeight: '100dvh',
      background: 'radial-gradient(ellipse at 50% 0%, #FFFDF9 0%, #F6F1E7 60%, #ECE4D6 100%)',
      color: 'var(--color-text)',
      padding: '0 0 80px 0',
      position: 'relative',
      overflowX: 'hidden'
    }}>
      {/* ── 1. FULL-WIDTH PANORAMIC KINEMATICS HERO SHOWCASE AT TOP ──────── */}
      <section
        onClick={() => handleLaunchLab('projectile')}
        onMouseEnter={() => setHoveredCard('hero')}
        onMouseLeave={() => setHoveredCard(null)}
        style={{
          width: '100%',
          position: 'relative',
          backgroundColor: '#FAF5EC',
          backgroundImage: `linear-gradient(180deg, rgba(250, 245, 236, 0.35) 0%, rgba(250, 245, 236, 0.15) 100%), url('/images/minimal_bilateral_banner.jpg')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          borderBottom: '1px solid rgba(203, 163, 88, 0.35)',
          boxShadow: '0 12px 32px rgba(18, 14, 11, 0.08)',
          padding: '24px 0 24px 0',
          cursor: 'pointer',
          overflow: 'hidden',
          transition: 'box-shadow var(--transition-smooth)'
        }}
      >
        {/* Subtle Ambient Radial Highlight */}
        <div style={{
          position: 'absolute',
          top: -80,
          right: '15%',
          width: 500,
          height: 500,
          background: 'radial-gradient(circle, rgba(203, 163, 88, 0.15) 0%, transparent 70%)',
          borderRadius: '50%',
          filter: 'blur(60px)',
          pointerEvents: 'none'
        }} />

        {/* Content Centered in Wide Atelier Container */}
        <div
          style={{
            maxWidth: 1380,
            margin: '0 auto',
            padding: '0 36px',
            boxSizing: 'border-box',
            position: 'relative',
            zIndex: 2,
            display: 'grid',
            gridTemplateColumns: '1.35fr 1fr',
            gap: 40,
            alignItems: 'center'
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center' }}>
            {/* Live Time & Date Atelier Pill */}
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '5px 14px',
              borderRadius: 'var(--radius-full)',
              background: 'rgba(255, 255, 255, 0.72)',
              border: '1px solid rgba(203, 163, 88, 0.35)',
              boxShadow: '0 2px 8px rgba(18, 14, 11, 0.04)',
              backdropFilter: 'blur(8px)',
              marginBottom: 10
            }}>
              <span className="mono" style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--gold-700)', letterSpacing: '0.02em' }}>
                {currentDateTime.time}
              </span>
              <span style={{ color: 'rgba(74, 63, 53, 0.4)', fontSize: 11 }}>•</span>
              <span style={{ fontSize: 12.5, color: '#4A3F35', fontWeight: 600 }}>
                {currentDateTime.date}
              </span>
            </div>

            <h1 style={{
              margin: '0 0 18px 0',
              fontSize: 'clamp(2rem, 2.8vw, 2.6rem)',
              fontFamily: 'var(--font-display)',
              fontWeight: 800,
              color: 'var(--obsidian-950)',
              letterSpacing: '-0.035em',
              lineHeight: 1.15
            }}>
              {greeting}, <span style={{ color: 'var(--gold-600)' }}>{displayName}</span>.
            </h1>

            {/* Quick Hero Action CTAs */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginTop: 4 }}>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  navigate('/sim')
                }}
                style={{
                  padding: '9px 18px',
                  background: '#002B66',
                  color: '#FFFFFF',
                  border: 'none',
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  boxShadow: '0 2px 8px rgba(0, 43, 102, 0.25)'
                }}
              >
                <Play size={14} />
                <span>Launch 3D Simulator</span>
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation()
                  navigate('/ai-tutor')
                }}
                style={{
                  padding: '9px 16px',
                  background: '#FFFFFF',
                  color: '#002B66',
                  border: '1px solid rgba(0, 43, 102, 0.25)',
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  boxShadow: '0 2px 6px rgba(18, 14, 11, 0.05)'
                }}
              >
                <Sparkles size={14} color="#D97706" />
                <span>Ask AI &amp; Generate 2D Visual</span>
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation()
                  navigate('/board')
                }}
                style={{
                  padding: '9px 16px',
                  background: '#FFFFFF',
                  color: '#002B66',
                  border: '1px solid rgba(0, 43, 102, 0.25)',
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  boxShadow: '0 2px 6px rgba(18, 14, 11, 0.05)'
                }}
              >
                <LineChart size={14} color="#059669" />
                <span>Graph Board</span>
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation()
                  navigate('/motion')
                }}
                style={{
                  padding: '9px 16px',
                  background: '#FFFFFF',
                  color: '#002B66',
                  border: '1px solid rgba(0, 43, 102, 0.25)',
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  boxShadow: '0 2px 6px rgba(18, 14, 11, 0.05)'
                }}
              >
                <Gauge size={14} color="#D97706" />
                <span>Motion Lab</span>
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation()
                  navigate('/gravity')
                }}
                style={{
                  padding: '9px 16px',
                  background: '#FFFFFF',
                  color: '#002B66',
                  border: '1px solid rgba(0, 43, 102, 0.25)',
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  boxShadow: '0 2px 6px rgba(18, 14, 11, 0.05)'
                }}
              >
                <Orbit size={14} color="#0D9488" />
                <span>Gravity Lab</span>
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation()
                  navigate('/light')
                }}
                style={{
                  padding: '9px 16px',
                  background: '#FFFFFF',
                  color: '#002B66',
                  border: '1px solid rgba(0, 43, 102, 0.25)',
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  boxShadow: '0 2px 6px rgba(18, 14, 11, 0.05)'
                }}
              >
                <Flashlight size={14} color="#E11D48" />
                <span>Light Lab</span>
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation()
                  navigate('/electricity')
                }}
                style={{
                  padding: '9px 16px',
                  background: '#FFFFFF',
                  color: '#002B66',
                  border: '1px solid rgba(0, 43, 102, 0.25)',
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  boxShadow: '0 2px 6px rgba(18, 14, 11, 0.05)'
                }}
              >
                <Zap size={14} color="#D97706" />
                <span>Electricity Lab</span>
              </button>
            </div>
          </div>

          {/* High-Tech Physics Telemetry & Animated Projectile Trajectory Preview */}
          <KinematicsLivePreview />
        </div>
      </section>

      {/* ── 2. PAGE CONTENT CONTAINER ────────────────────────────────────── */}
      <div style={{ maxWidth: 1240, margin: '0 auto', padding: '40px 24px 48px 24px', boxSizing: 'border-box' }}>
        


        {/* ── 3D LABS TOPICS & SEARCH (LEFT-ALIGNED SEARCH BAR) ──────────────── */}
        <div id="topics-section" style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16
        }}>
          <TopicSearchBar
            searchQuery={topicSearchQuery}
            onSearchChange={setTopicSearchQuery}
            onSelectLab={handleLaunchLab}
          />

          {topicSearchQuery && (
            <div style={{ marginBottom: 24, fontSize: 13, color: 'var(--color-text-muted)', fontWeight: 500 }}>
              Showing <strong>{filteredLabs.length}</strong> of {labs.length} laboratories
            </div>
          )}
        </div>

        {/* ── FEATURED UNITY 3D VIRTUAL SCIENCE LAB ───────────────────────── */}
        {showVirtualLabCard && (
          <div
            onClick={() => navigate('/virtual-lab')}
            onMouseEnter={() => setHoveredCard('ohmslaw-virtual')}
            onMouseLeave={() => setHoveredCard(null)}
            style={{
              marginBottom: 28,
              padding: '28px 32px',
              borderRadius: 16,
              background: 'linear-gradient(135deg, #0A1128 0%, #101F42 50%, #1A2B56 100%)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              boxShadow: hoveredCard === 'ohmslaw-virtual'
                ? '0 20px 40px -15px rgba(10, 25, 60, 0.4), 0 0 24px rgba(59, 130, 246, 0.25)'
                : '0 10px 30px -10px rgba(10, 25, 60, 0.25)',
              cursor: 'pointer',
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 24,
              transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
              transform: hoveredCard === 'ohmslaw-virtual' ? 'translateY(-3px)' : 'none',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            {/* Ambient blue glow accent */}
            <div style={{
              position: 'absolute',
              top: -80,
              right: -80,
              width: 260,
              height: 260,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(59, 130, 246, 0.25) 0%, transparent 70%)',
              pointerEvents: 'none'
            }} />

            <div style={{ flex: '1 1 500px', zIndex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <span style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  padding: '4px 10px',
                  borderRadius: 6,
                  background: 'rgba(59, 130, 246, 0.2)',
                  color: '#60A5FA',
                  border: '1px solid rgba(59, 130, 246, 0.35)'
                }}>
                  ✦ Unity 3D Virtual Science Lab
                </span>
                <span style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: 'rgba(255, 255, 255, 0.6)',
                  fontFamily: 'monospace'
                }}>
                  Class 8 & 9 Standard Curriculum
                </span>
              </div>

              <h2 style={{
                margin: '0 0 8px 0',
                fontSize: 'clamp(1.3rem, 2vw, 1.6rem)',
                fontFamily: 'var(--font-display)',
                fontWeight: 700,
                color: '#FFFFFF',
                letterSpacing: '-0.02em',
                lineHeight: 1.25
              }}>
                Ohm's Law: Verification & Resistance Analysis
              </h2>

              <p style={{
                margin: 0,
                fontSize: 14,
                color: 'rgba(255, 255, 255, 0.7)',
                lineHeight: 1.55,
                maxWidth: 680
              }}>
                Step into an interactive 3D physics laboratory workbench. Operate real-time analog ammeters and voltmeters, slide the rheostat, close the key switch, and verify V = I · R on a dynamic holographic V-I graph.
              </p>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 14 }}>
                {['Analog Needle Meters', 'Smooth Rheostat Slider', 'Real-time V-I Plot', 'First-Person 3D Lab', 'Formula: V = I · R'].map((f) => (
                  <span key={f} style={{
                    fontSize: 11.5,
                    color: 'rgba(255, 255, 255, 0.85)',
                    background: 'rgba(255, 255, 255, 0.08)',
                    padding: '3px 9px',
                    borderRadius: 5,
                    border: '1px solid rgba(255, 255, 255, 0.1)'
                  }}>
                    {f}
                  </span>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, zIndex: 1 }}>
              <button
                style={{
                  background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
                  color: '#FFFFFF',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  padding: '12px 22px',
                  borderRadius: 10,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  boxShadow: '0 4px 14px rgba(37, 99, 235, 0.35)',
                  transition: 'all 0.15s ease'
                }}
              >
                <span>Enter 3D Lab</span>
                <ArrowUpRight size={17} />
              </button>
            </div>
          </div>
        )}

        {/* ── 3D LABS COLLECTION GRID ──────────────────────────────────────── */}

        {filteredLabs.length > 0 ? (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
            gap: 20
          }}>
            {filteredLabs.map((meta, i) => {
            const isHovered = hoveredCard === meta.id
            const currentScore = mastery[meta.id]?.score || 0

            return (
              <div
                key={meta.id}
                onClick={() => handleLaunchLab(meta.id)}
                onMouseEnter={() => setHoveredCard(meta.id)}
                onMouseLeave={() => setHoveredCard(null)}
                className="card-editorial"
                style={{
                  padding: '24px 24px',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 16,
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                {/* Top Badge & Vector Icon */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{
                    width: 48,
                    height: 48,
                    borderRadius: 'var(--radius-md)',
                    background: isHovered ? 'var(--obsidian-900)' : 'var(--cream-100)',
                    border: `1px solid ${isHovered ? 'var(--obsidian-900)' : 'var(--color-border)'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: isHovered ? 'var(--gold-400)' : 'var(--obsidian-900)',
                    boxShadow: 'var(--shadow-xs)',
                    transition: 'all var(--transition-fast)'
                  }}>
                    <LabIcon id={meta.id} size={24} strokeWidth={2} />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                    <span className="badge-gold">
                      {meta.badge}
                    </span>
                    <span className="mono" style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                      3D LAB
                    </span>
                  </div>
                </div>

                {/* Title & Description */}
                <div>
                  <h3 style={{
                    margin: 0,
                    fontSize: 18,
                    fontFamily: 'var(--font-display)',
                    fontWeight: 700,
                    color: 'var(--obsidian-950)',
                    letterSpacing: '-0.02em'
                  }}>
                    {meta.label} Lab
                  </h3>
                  <p style={{
                    margin: '6px 0 0 0',
                    fontSize: 13,
                    color: 'var(--color-text-muted)',
                    lineHeight: 1.55
                  }}>
                    {meta.description}
                  </p>
                </div>

                {/* Mathematical Formula Pill */}
                {meta.formula && (
                  <div className="mono" style={{
                    padding: '6px 12px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--cream-100)',
                    border: '1px solid var(--color-border-subtle)',
                    fontSize: 12,
                    color: 'var(--obsidian-800)',
                    fontWeight: 600
                  }}>
                    {meta.formula}
                  </div>
                )}

                {/* Bottom Mastery & Launch Action */}
                <div style={{
                  marginTop: 'auto',
                  paddingTop: 14,
                  borderTop: '1px solid var(--color-border)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-faint)' }}>Mastery</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
                      <div style={{ width: 70, height: 4, background: 'var(--cream-200)', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ width: `${currentScore}%`, height: '100%', background: 'var(--gold-500)' }} />
                      </div>
                      <span className="mono" style={{ fontSize: 12, fontWeight: 700, color: 'var(--obsidian-800)' }}>
                        {currentScore}%
                      </span>
                    </div>
                  </div>

                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    fontSize: 13,
                    fontWeight: 700,
                    color: isHovered ? 'var(--gold-600)' : 'var(--obsidian-900)',
                    transition: 'color var(--transition-fast)'
                  }}>
                    Enter Lab
                    <ArrowUpRight size={16} />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div style={{
          padding: '48px 24px',
          textAlign: 'center',
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          marginBottom: 32,
          borderRadius: 0
        }}>
          <p style={{ margin: '0 0 12px 0', fontSize: 16, fontWeight: 700, color: 'var(--obsidian-900)' }}>
            No 3D laboratory matched &ldquo;{topicSearchQuery}&rdquo;
          </p>
          <button
            onClick={() => setTopicSearchQuery('')}
            className="btn-navy-primary"
            style={{
              padding: '8px 20px',
              background: '#002B66',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: 0,
              fontWeight: 600,
              fontSize: 13,
              cursor: 'pointer'
            }}
          >
            Show All Laboratories
          </button>
        </div>
      )}

        {/* ── 2D INTERACTIVE LABORATORIES (ADMIN-MANAGED WITH INSTANT REDIRECTION) ── */}
        <div id="2d-labs" style={{ marginTop: 64, marginBottom: 20 }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            marginBottom: 26,
            flexWrap: 'wrap',
            gap: 16
          }}>
            <div>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: 'var(--gold-700)',
                marginBottom: 6
              }}>
                <Globe size={13} color="var(--gold-600)" />
                Curated External Network &bull; Interactive 2D
              </div>
              <h2 style={{
                margin: 0,
                fontSize: 26,
                fontFamily: 'var(--font-display)',
                fontWeight: 700,
                color: 'var(--obsidian-950)',
                letterSpacing: '-0.025em'
              }}>
                Curated 2D Interactive Laboratories
              </h2>
              <p style={{
                margin: '6px 0 0 0',
                fontSize: 14,
                color: 'var(--color-text-muted)',
                maxWidth: 680,
                lineHeight: 1.55
              }}>
                Complementing our real-time 3D computational engines with premier two-dimensional interactive simulations from PhET Interactive Simulations, GeoGebra, and university research ateliers. Click any simulation image box or launch button to jump directly into the live interactive laboratory.
              </p>
            </div>
          </div>

          {filtered2dVisualizations.length > 0 ? (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
              gap: 24
            }}>
              {filtered2dVisualizations.map((vis) => {
                const isHovered = hovered2dCard === vis.id
                const labPath = vis.internalPath || `/sim-2d?lab=${vis.id.replace('vis-', '').replace('phet-', '')}`
                return (
                  <div
                    key={vis.id}
                    onMouseEnter={() => setHovered2dCard(vis.id)}
                    onMouseLeave={() => setHovered2dCard(null)}
                    onClick={() => {
                      trackVisualizationClick(vis.id)
                      navigate(labPath)
                    }}
                    style={{
                      background: '#FFFFFF',
                      border: isHovered ? '1px solid #002B66' : '1px solid var(--color-border)',
                      borderRadius: 0, // Strict sharp corners
                      boxShadow: isHovered
                        ? '0 16px 36px rgba(0, 43, 102, 0.14)'
                        : '0 4px 16px rgba(18, 14, 11, 0.05)',
                      display: 'flex',
                      flexDirection: 'column',
                      cursor: 'pointer',
                      overflow: 'hidden',
                      transform: isHovered ? 'translateY(-3px)' : 'none',
                      transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
                    }}
                  >
                    {/* ── IMAGE BOX CONTAINER ── */}
                    <div
                      title={`Click to launch ${vis.title} in VISIORA 2D Studio`}
                      style={{
                        position: 'relative',
                        width: '100%',
                        height: 205,
                        background: '#FAF4E8',
                        overflow: 'hidden',
                        cursor: 'pointer',
                        borderRadius: 0
                      }}
                    >
                      <img
                        src={vis.imageUrl || 'https://images.unsplash.com/photo-1509228468518-180dd4864904?auto=format&fit=crop&w=800&q=80'}
                        alt={vis.title}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          transform: isHovered ? 'scale(1.06)' : 'scale(1)',
                          transition: 'transform 0.4s ease'
                        }}
                      />

                      {/* Subtle Dark Gradient Overlay for Readability */}
                      <div
                        style={{
                          position: 'absolute',
                          inset: 0,
                          background: 'linear-gradient(180deg, rgba(14, 12, 11, 0.45) 0%, transparent 40%, rgba(14, 12, 11, 0.6) 100%)',
                          pointerEvents: 'none'
                        }}
                      />

                      {/* Top Left: Category Badge */}
                      <div
                        style={{
                          position: 'absolute',
                          top: 12,
                          left: 12,
                          zIndex: 2,
                          background: 'rgba(14, 12, 11, 0.85)',
                          color: '#FFF9F0',
                          padding: '4px 10px',
                          fontSize: 10,
                          fontWeight: 700,
                          letterSpacing: '0.06em',
                          textTransform: 'uppercase',
                          borderRadius: 0,
                          boxShadow: '0 2px 6px rgba(0,0,0,0.3)'
                        }}
                      >
                        {vis.category || '2D Simulation'}
                      </div>

                      {/* Top Right: Custom Badge */}
                      <div
                        style={{
                          position: 'absolute',
                          top: 12,
                          right: 12,
                          zIndex: 2
                        }}
                      >
                        <span
                          className="badge-gold"
                          style={{
                            borderRadius: 0,
                            padding: '4px 10px',
                            fontSize: 10.5,
                            fontWeight: 700,
                            boxShadow: '0 2px 6px rgba(0,0,0,0.2)'
                          }}
                        >
                          {vis.badge || 'Interactive 2D'}
                        </span>
                      </div>

                      {/* Floating Hover Cue inside Image Box */}
                      <div
                        style={{
                          position: 'absolute',
                          bottom: 12,
                          right: 12,
                          zIndex: 2,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '6px 14px',
                          background: isHovered ? '#002B66' : 'rgba(0, 43, 102, 0.85)',
                          color: '#FFFFFF',
                          fontSize: 11.5,
                          fontWeight: 700,
                          borderRadius: 0,
                          boxShadow: '0 4px 12px rgba(0, 43, 102, 0.4)',
                          transform: isHovered ? 'scale(1.03)' : 'scale(1)',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <span>Launch 2D Studio</span>
                        <ArrowUpRight size={13} />
                      </div>
                    </div>

                    {/* Content Section */}
                    <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', flex: 1, gap: 12 }}>
                      <div>
                        <h3
                          style={{
                            margin: 0,
                            fontSize: 17,
                            fontFamily: 'var(--font-display)',
                            fontWeight: 700,
                            color: 'var(--obsidian-950)',
                            letterSpacing: '-0.02em',
                            lineHeight: 1.35
                          }}
                        >
                          {vis.title}
                        </h3>
                        {vis.subtitle && (
                          <p
                            style={{
                              margin: '8px 0 0 0',
                              fontSize: 13,
                              color: 'var(--color-text-muted)',
                              lineHeight: 1.55
                            }}
                          >
                            {vis.subtitle}
                          </p>
                        )}
                      </div>

                      {/* Footer Row */}
                      <div
                        style={{
                          marginTop: 'auto',
                          paddingTop: 14,
                          borderTop: '1px solid var(--color-border)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span className="mono" style={{ fontSize: 11.5, color: 'var(--color-text-faint)', fontWeight: 600 }}>
                            {vis.clicks || 0} launches
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              trackVisualizationClick(vis.id)
                              window.open(vis.targetUrl, '_blank', 'noopener,noreferrer')
                            }}
                            title="Open external simulation in standalone new tab"
                            style={{
                              background: 'transparent',
                              border: '1px solid #D1D5DB',
                              padding: '6px 8px',
                              borderRadius: 0,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#4B5563'
                            }}
                          >
                            <ExternalLink size={13} />
                          </button>

                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              trackVisualizationClick(vis.id)
                              navigate(labPath)
                            }}
                            className="btn-navy-primary"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6,
                              padding: '7px 16px',
                              background: '#002B66',
                              color: '#FFFFFF',
                              border: 'none',
                              borderRadius: 0,
                              fontSize: 12,
                              fontWeight: 700,
                              cursor: 'pointer',
                              boxShadow: '0 2px 8px rgba(0, 43, 102, 0.25)',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            <span>Launch 2D Lab</span>
                            <ArrowUpRight size={13} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div
              style={{
                padding: '36px 24px',
                textAlign: 'center',
                background: '#FFFFFF',
                border: '1px solid var(--color-border)',
                borderRadius: 0
              }}
            >
              <p style={{ margin: '0 0 8px 0', fontSize: 15, fontWeight: 700, color: 'var(--obsidian-900)' }}>
                No 2D simulations match &ldquo;{topicSearchQuery}&rdquo;
              </p>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--color-text-muted)' }}>
                Try searching for electromagnetic, wave mechanics, or ray optics concepts.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── GSAP SCROLLTRIGGER PINNED PARALLAX SHOWCASE (INDRIYA STYLE) ── */}
      <PeriodicParallaxSection onLaunchLab={handleLaunchLab} />


      {/* ── FOOTER ───────────────────────────────────────────────────────── */}
      <footer style={{
        position: 'relative',
        zIndex: 5,
        marginTop: 0,
        padding: '48px 24px 60px 24px',
        borderTop: '1px solid var(--color-border)',
        background: '#F7F3EB',
        textAlign: 'center'
      }}>
        <div style={{ maxWidth: 1240, margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <img 
              src="/images/visiora_lotus_logo.png" 
              alt="VISIORA Lotus Logo" 
              style={{
                width: 34,
                height: 34,
                borderRadius: '50%',
                objectFit: 'cover',
                display: 'block',
                boxShadow: '0 2px 8px rgba(18, 14, 11, 0.1)'
              }} 
            />
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 18, color: 'var(--obsidian-950)', letterSpacing: '0.04em' }}>
              VISIORA
            </span>
          </div>

          <p style={{ margin: 0, fontSize: 14, color: 'var(--color-text-muted)', maxWidth: 500 }}>
            An atelier for physics inquiry and interactive computation. Dedicated to making physical intuition palpable through real-time 3D simulations.
          </p>

          <div style={{ fontSize: 12, color: 'var(--color-text-faint)', marginTop: 8 }}>
            &copy; {new Date().getFullYear()} VISIORA Atelier &bull; Classical &amp; Quantum Mechanics Edition
          </div>
        </div>
      </footer>

    </div>
  )
}
