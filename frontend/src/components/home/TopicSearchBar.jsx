import React, { useState, useRef, useEffect, useMemo } from 'react'
import { Search, X, ArrowUpRight, Sparkles, BookOpen, Layers, Zap, Globe, ExternalLink } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { SCENE_META } from '../../config/physics'
import { useAdminStore } from '../../store/useAdminStore'

// Comprehensive topics and concept database strictly limited to website content
const WEBSITE_TOPICS = [
  {
    id: 'projectile',
    title: 'Projectile Motion & Ballistics Lab',
    subtitle: 'Parabolic trajectory, elevation angle, muzzle velocity & cliff height',
    keywords: ['projectile', 'motion', 'artillery', 'kinematics', 'parabolic', 'trajectory', 'angle', 'velocity', 'cliff', 'ballistics', 'elevation', 'launch'],
    badge: '2D Kinematics',
    formula: 'R = (v₀² sin 2θ) / g',
    category: '3D Simulation Lab',
    labId: 'projectile',
    type: 'lab'
  },
  {
    id: 'gravity',
    title: 'Free Fall & Gravitational Acceleration Lab',
    subtitle: 'Galileo principle: all masses fall at identical rate in vacuum',
    keywords: ['gravity', 'free fall', 'galileo', 'drop', 'vacuum', 'acceleration', 'earth gravity', '9.81', 'mass', 'height'],
    badge: 'Galileo Principle',
    formula: 'y(t) = h₀ - ½gt²',
    category: '3D Simulation Lab',
    labId: 'gravity',
    type: 'lab'
  },
  {
    id: 'pendulum',
    title: 'Pendulum & Chaotic Dynamics Lab',
    subtitle: 'Simple harmonic motion and chaotic double pendulum attractors',
    keywords: ['pendulum', 'simple pendulum', 'double pendulum', 'chaos', 'harmonic', 'oscillation', 'period', 'damping', 'length', 'frequency'],
    badge: 'Harmonic & Chaos',
    formula: 'T = 2π √(L / g)',
    category: '3D Simulation Lab',
    labId: 'pendulum',
    type: 'lab'
  },
  {
    id: 'buoyancy',
    title: 'Buoyancy & Fluid Mechanics Lab',
    subtitle: 'Archimedes law: buoyant force equals weight of displaced fluid volume',
    keywords: ['buoyancy', 'archimedes', 'fluid', 'fluids', 'density', 'displaced volume', 'floating', 'sinking', 'weight', 'rho'],
    badge: 'Archimedes Law',
    formula: 'F_b = ρ_f · V_sub · g',
    category: '3D Simulation Lab',
    labId: 'buoyancy',
    type: 'lab'
  },
  {
    id: 'collision',
    title: 'Momentum Conservation & Collisions Lab',
    subtitle: 'Elastic and inelastic collisions, kinetic energy exchange & restitution',
    keywords: ['collision', 'collisions', 'momentum', 'elastic', 'inelastic', 'restitution', 'kinetic energy', 'impact', 'conservation'],
    badge: 'Momentum & Energy',
    formula: "p₁ + p₂ = p₁' + p₂'",
    category: '3D Simulation Lab',
    labId: 'collision',
    type: 'lab'
  },
  {
    id: 'mastery',
    title: 'Mastery & Progress Dashboard',
    subtitle: 'Track your overall physics mastery score, day streak, and achievements',
    keywords: ['mastery', 'progress', 'score', 'learning', 'badges', 'streak', 'profile', 'stats'],
    badge: 'Atelier Stats',
    formula: 'Overall Mastery %',
    category: 'Platform Feature',
    path: '/progress',
    type: 'page'
  },
  {
    id: 'quiz',
    title: 'Interactive Physics Quizzes',
    subtitle: 'Test conceptual intuition, formulas, and mechanics problems',
    keywords: ['quiz', 'quizzes', 'test', 'questions', 'challenge', 'assessment', 'concept check'],
    badge: 'Assessment',
    formula: 'Self-Paced Quizzes',
    category: 'Platform Feature',
    path: '/quiz/gravity',
    type: 'page'
  }
]

export default function TopicSearchBar({ onSelectLab, searchQuery, onSearchChange }) {
  const navigate = useNavigate()
  const [isOpen, setIsOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(0)
  const wrapperRef = useRef(null)
  const inputRef = useRef(null)

  const visualizations = useAdminStore(state => state.visualizations)
  const trackVisualizationClick = useAdminStore(state => state.trackVisualizationClick)

  // Combined topics including 3D labs, platform features, and active 2D simulations
  const allTopics = useMemo(() => {
    const active2d = (visualizations || [])
      .filter(v => v.isActive !== false)
      .map(v => ({
        id: v.id,
        title: v.title,
        subtitle: v.subtitle || 'Atelier 2D Interactive Laboratory',
        keywords: [
          '2d',
          'simulation',
          'energy',
          'heat',
          'thermal',
          'temperature',
          'systems',
          'calorimetry',
          'equilibrium',
          ...(v.category || '').toLowerCase().split(/[\s,&]+/),
          ...(v.title || '').toLowerCase().split(/[\s,&:]+/)
        ],
        badge: v.badge || '2D Studio',
        formula: v.category || '2D Simulation',
        category: 'Native 2D Lab',
        internalPath: v.internalPath || `/sim-2d?lab=${v.id.replace('vis-', '').replace('phet-', '')}`,
        targetUrl: v.targetUrl,
        type: 'vis2d'
      }))

    return [...WEBSITE_TOPICS, ...active2d]
  }, [visualizations])

  // Filter recommendations based on user input
  const recommendations = useMemo(() => {
    const q = (searchQuery || '').trim().toLowerCase()
    if (!q) {
      // Default top suggestions when empty (popular topics in website)
      return allTopics.slice(0, 6)
    }

    return allTopics.filter(item => {
      const matchTitle = item.title.toLowerCase().includes(q)
      const matchSubtitle = item.subtitle.toLowerCase().includes(q)
      const matchBadge = item.badge.toLowerCase().includes(q)
      const matchKeywords = item.keywords.some(k => k.includes(q))
      return matchTitle || matchSubtitle || matchBadge || matchKeywords
    })
  }, [allTopics, searchQuery])

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Handle keyboard navigation (Google-like ArrowUp, ArrowDown, Enter, Escape)
  const handleKeyDown = (e) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true)
      }
      return
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightedIndex(prev => (prev + 1) % (recommendations.length || 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightedIndex(prev => (prev - 1 + recommendations.length) % (recommendations.length || 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (recommendations[highlightedIndex]) {
        handleSelectRecommendation(recommendations[highlightedIndex])
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false)
    }
  }

  const handleSelectRecommendation = (item) => {
    setIsOpen(false)
    if (item.type === 'lab') {
      onSelectLab(item.labId)
    } else if (item.type === 'page') {
      navigate(item.path)
    } else if (item.type === 'vis2d') {
      trackVisualizationClick(item.id)
      navigate(item.internalPath || `/sim-2d?lab=${item.id.replace('vis-', '').replace('phet-', '')}`)
    }
  }

  // Google-style bold matching for recommendation titles
  const renderHighlightedTitle = (text, query) => {
    if (!query || !query.trim()) return text
    const q = query.trim()
    const regex = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
    const parts = text.split(regex)
    return parts.map((part, index) =>
      regex.test(part) ? (
        <strong key={index} style={{ color: 'var(--gold-600)', fontWeight: 800 }}>
          {part}
        </strong>
      ) : (
        part
      )
    )
  }

  return (
    <div
      ref={wrapperRef}
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: 460,
        marginBottom: 24,
        zIndex: 30
      }}
    >
      {/* Search Input Bar (Placed on the left side of topics) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          background: '#FFFDF9',
          border: isOpen ? '1.5px solid var(--gold-600)' : '1px solid var(--color-border)',
          borderRadius: 0, // Sharp architectural edges
          boxShadow: isOpen ? '0 8px 24px rgba(18, 14, 11, 0.12)' : '0 2px 8px rgba(18, 14, 11, 0.04)',
          transition: 'all var(--transition-fast)',
          position: 'relative'
        }}
      >
        {/* Magnifying Glass Icon */}
        <div style={{ paddingLeft: 14, display: 'flex', alignItems: 'center', color: isOpen ? 'var(--gold-600)' : 'var(--color-text-muted)' }}>
          <Search size={17} strokeWidth={2.2} />
        </div>

        {/* Input */}
        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => {
            onSearchChange(e.target.value)
            setIsOpen(true)
            setHighlightedIndex(0)
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search topics, laboratories & formulas..."
          style={{
            flex: 1,
            padding: '11px 12px',
            background: 'transparent',
            border: 'none',
            outline: 'none',
            fontSize: 14,
            fontFamily: 'inherit',
            color: 'var(--obsidian-950)',
            fontWeight: 500
          }}
        />

        {/* Clear Button (if query entered) */}
        {searchQuery && (
          <button
            onClick={() => {
              onSearchChange('')
              setHighlightedIndex(0)
              inputRef.current?.focus()
            }}
            style={{
              padding: '6px 8px',
              marginRight: 4,
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--color-text-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title="Clear search"
          >
            <X size={15} />
          </button>
        )}

        {/* Subtle Google-style shortcut cue */}
        {!searchQuery && (
          <div style={{
            marginRight: 12,
            fontSize: 11,
            fontWeight: 600,
            color: 'var(--color-text-faint)',
            padding: '2px 7px',
            background: 'var(--cream-100)',
            border: '1px solid var(--color-border-subtle)',
            borderRadius: 'var(--radius-xs)',
            userSelect: 'none'
          }}>
            Topics
          </div>
        )}
      </div>

      {/* Google-like Recommendations Dropdown */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            background: '#FFFDF9',
            border: '1px solid rgba(203, 163, 88, 0.4)',
            borderRadius: 0, // Sharp architectural edges
            boxShadow: '0 16px 36px rgba(18, 14, 11, 0.16)',
            overflow: 'hidden',
            zIndex: 100,
            animation: 'fadeIn 0.15s ease'
          }}
        >
          {/* Header label inside recommendation dropdown */}
          <div style={{
            padding: '8px 16px 6px 16px',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            color: 'var(--color-text-muted)',
            borderBottom: '1px solid rgba(203, 163, 88, 0.18)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: '#FAF6EE'
          }}>
            <span>{searchQuery ? 'Matching Recommendations' : 'Recommended Topics in Website'}</span>
            <span style={{ fontSize: 10, color: 'var(--gold-700)', fontWeight: 600 }}>
              {recommendations.length} {recommendations.length === 1 ? 'topic' : 'topics'}
            </span>
          </div>

          {/* List of recommendations */}
          {recommendations.length > 0 ? (
            <div style={{ maxHeight: 340, overflowY: 'auto' }}>
              {recommendations.map((item, index) => {
                const isHighlighted = index === highlightedIndex

                return (
                  <div
                    key={item.id}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    onClick={() => handleSelectRecommendation(item)}
                    style={{
                      padding: '11px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 12,
                      cursor: 'pointer',
                      background: isHighlighted ? 'rgba(203, 163, 88, 0.12)' : 'transparent',
                      borderLeft: isHighlighted ? '3px solid var(--gold-600)' : '3px solid transparent',
                      transition: 'background var(--transition-fast)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                      <div style={{
                        width: 28,
                        height: 28,
                        borderRadius: 'var(--radius-xs)',
                        background: isHighlighted ? 'var(--obsidian-900)' : 'var(--cream-200)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: isHighlighted ? 'var(--gold-400)' : 'var(--obsidian-800)',
                        flexShrink: 0,
                        transition: 'all var(--transition-fast)'
                      }}>
                        {item.type === 'lab' ? (
                          <Zap size={14} />
                        ) : item.type === 'vis2d' ? (
                          <Globe size={14} />
                        ) : (
                          <BookOpen size={14} />
                        )}
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                        <div style={{
                          fontSize: 13.5,
                          fontWeight: 600,
                          color: 'var(--obsidian-950)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}>
                          {renderHighlightedTitle(item.title, searchQuery)}
                        </div>

                        <div style={{
                          fontSize: 11.5,
                          color: 'var(--color-text-muted)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          marginTop: 2
                        }}>
                          {item.subtitle}
                        </div>
                      </div>
                    </div>

                    {/* Right side: Badge / Action cue */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                      {item.badge && (
                        <span className="mono" style={{
                          fontSize: 11,
                          fontWeight: 600,
                          color: item.type === 'vis2d' ? '#002B66' : 'var(--gold-700)',
                          background: item.type === 'vis2d' ? 'rgba(0, 43, 102, 0.1)' : 'rgba(203, 163, 88, 0.15)',
                          padding: '2px 7px',
                          borderRadius: 2
                        }}>
                          {item.badge}
                        </span>
                      )}

                      <span style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: item.type === 'vis2d' ? '#002B66' : isHighlighted ? 'var(--gold-700)' : 'var(--color-text-faint)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 2
                      }}>
                        {item.type === 'vis2d' ? 'Open 2D' : 'Open'} <ArrowUpRight size={13} />
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 13 }}>
              No platform topic matched &ldquo;{searchQuery}&rdquo;.
              <div style={{ fontSize: 11.5, color: 'var(--gold-700)', marginTop: 4 }}>
                Try &ldquo;projectile&rdquo;, &ldquo;gravity&rdquo;, &ldquo;pendulum&rdquo;, &ldquo;buoyancy&rdquo;, or &ldquo;collision&rdquo;
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
