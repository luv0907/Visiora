import React, { useState, useEffect, useRef } from 'react'
import { ArrowUpRight, Sparkles, Play, X, Zap, ChevronDown } from 'lucide-react'
import { SCENE_META } from '../../config/physics'
import LabIcon from '../common/LabIcon'
import { useAdminStore } from '../../store/useAdminStore'

export default function PeriodicParallaxSection({ onLaunchLab }) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const dropdownRef = useRef(null)
  const bannerImage = useAdminStore((state) => state.bannerImage)
  const showcaseImage = useAdminStore((state) => state.showcaseImage)

  // Close dropdown on outside click or Escape key
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsDropdownOpen(false)
      }
    }
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setIsDropdownOpen(false)
    }

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleOutsideClick)
      window.addEventListener('keydown', handleKeyDown)
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isDropdownOpen])

  return (
    <section
      style={{
        position: 'relative',
        width: '100%',
        background: 'transparent'
      }}
    >
      {/* ── 1. CENTERED LAUNCH SIMULATION BUTTON ROW (MATCHING USER REFERENCE IMAGE) ── */}
      <div
        style={{
          width: '100%',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          paddingTop: 36,
          paddingBottom: 44,
          position: 'relative',
          zIndex: 30
        }}
      >
        {/* Centered Launch Simulation Button Anchor & Floating Dropdown */}
        <div ref={dropdownRef} style={{ position: 'relative', display: 'inline-block' }}>
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              padding: '13px 44px',
              borderRadius: 0, // Strict sharp architectural rectangle (0px corners)
              background: '#002B66', // Indriya signature deep navy matching reference image
              color: '#FFFFFF',
              fontWeight: 600,
              fontSize: 14,
              letterSpacing: '0.04em',
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(0, 43, 102, 0.25)',
              transition: 'all var(--transition-fast)'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = '#0B3F94'
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(0, 43, 102, 0.38)'
              e.currentTarget.style.transform = 'translateY(-1px)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = '#002B66'
              e.currentTarget.style.boxShadow = '0 4px 14px rgba(0, 43, 102, 0.25)'
              e.currentTarget.style.transform = 'none'
            }}
          >
            <span>Launch Simulation</span>
            <ChevronDown
              size={15}
              style={{
                transform: isDropdownOpen ? 'rotate(180deg)' : 'none',
                transition: 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                opacity: 0.85
              }}
            />
          </button>

          {/* Quick Floating Dropdown Menu */}
          {isDropdownOpen && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                left: '50%',
                transform: 'translateX(-50%)',
                width: 330,
                borderRadius: 0, // Strict sharp 0px corners
                background: '#FFF9F0',
                border: '1px solid rgba(0, 43, 102, 0.25)',
                borderTop: '3px solid #002B66',
                boxShadow: '0 20px 48px rgba(18, 14, 11, 0.22)',
                zIndex: 100,
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
                  color: 'var(--gold-700)',
                  borderBottom: '1px solid rgba(203, 163, 88, 0.25)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: 'rgba(245, 237, 224, 0.6)'
                }}
              >
                <span>Select Laboratory</span>
                <span style={{ fontSize: 10, color: 'var(--color-text-faint)', fontWeight: 600 }}>5 Interactive Labs</span>
              </div>

              {/* Laboratory Options */}
              <div style={{ padding: '6px' }}>
                {Object.values(SCENE_META).map((lab) => (
                  <div
                    key={lab.id}
                    onClick={() => {
                      setIsDropdownOpen(false)
                      if (onLaunchLab) onLaunchLab(lab.id)
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      borderRadius: 0, // Sharp corners
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      border: '1px solid transparent',
                      marginBottom: 3
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = '#F5EDE0'
                      e.currentTarget.style.borderColor = 'rgba(203, 163, 88, 0.4)'
                      e.currentTarget.style.transform = 'translateX(4px)'
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = 'transparent'
                      e.currentTarget.style.borderColor = 'transparent'
                      e.currentTarget.style.transform = 'none'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: 0, // Sharp corners
                          background: '#FAF4E8',
                          border: '1px solid rgba(203, 163, 88, 0.45)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'var(--obsidian-900)',
                          flexShrink: 0
                        }}
                      >
                        <LabIcon name={lab.icon} size={17} />
                      </div>
                      <div>
                        <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--obsidian-950)', lineHeight: 1.2 }}>
                          {lab.label}
                        </div>
                        <div style={{ fontSize: 11, color: '#6A5F54', marginTop: 2, fontWeight: 500 }}>
                          {lab.badge}
                        </div>
                      </div>
                    </div>

                    <ArrowUpRight size={15} color="var(--gold-700)" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── 2. FIXED BACKGROUND WINDOW (~480px height) ── */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: 480,
          borderTop: '1px solid rgba(0, 43, 102, 0.2)',
          borderBottom: '1px solid rgba(0, 43, 102, 0.2)',
          boxShadow: '0 12px 36px rgba(18, 14, 11, 0.1)',
          background: '#F5EDE0',
          overflow: 'hidden',
          clipPath: 'inset(0 0 0 0)'
        }}
      >
        {/* Fixed Underlay Artwork: Totally in the back of the page, rock-steady */}
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundImage: `linear-gradient(180deg, rgba(245, 237, 224, 0.05) 0%, rgba(20, 16, 12, 0.06) 100%), url('${bannerImage || '/images/physics_doodle_banner_16x9.jpg'}')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center 45%',
            pointerEvents: 'none',
            zIndex: 0
          }}
        />

        {/* Discreet Atelier Badge on Top-Right of the Banner Window */}
        <div
          style={{
            position: 'absolute',
            top: 24,
            right: 36,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 18px',
            borderRadius: 0, // Sharp architectural rectangle
            background: 'rgba(255, 248, 238, 0.92)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            border: '1px solid rgba(203, 163, 88, 0.5)',
            color: 'var(--obsidian-950)',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            boxShadow: '0 4px 16px rgba(18, 14, 11, 0.1)',
            pointerEvents: 'none',
            zIndex: 10
          }}
        >
          <Sparkles size={13} color="var(--gold-600)" />
          Atelier Physics &bull; Universal Laws
        </div>
      </div>

      {/* ── 2. FOREGROUND OVERLAPPING CARD LAYER (z-index: 10) ── */}
      {/* Box overlaps the banner by 75px for a layered atelier aesthetic */}
      <div
        style={{
          position: 'relative',
          zIndex: 10,
          marginTop: -75, // Subtle ~75px overlap onto the physics banner
          paddingBottom: 48
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: 1140,
            margin: '0 auto',
            padding: '0 24px',
            boxSizing: 'border-box'
          }}
        >
          {/* Luxury Cream Card */}
          <div
            style={{
              background: '#FFF1E3', // Indriya's signature creamy blush gold
              borderRadius: 0,
              border: '1px solid rgba(203, 163, 88, 0.45)',
              boxShadow: '0 24px 60px rgba(18, 14, 11, 0.18)',
              padding: '36px 52px',
              boxSizing: 'border-box'
            }}
          >
            {/* Headline Inside the Card */}
            <div style={{ marginBottom: 20 }}>
              <h2
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 'clamp(1.75rem, 2.5vw, 2.4rem)',
                  fontWeight: 500,
                  lineHeight: 1.25,
                  color: 'var(--obsidian-950)',
                  letterSpacing: '-0.025em',
                  margin: 0
                }}
              >
                Every <span className="font-signature" style={{ fontSize: '1.45em', color: 'var(--gold-700)', padding: '0 4px' }}>element</span> tells a story, which force will you choose ?
              </h2>
            </div>

            {/* Content Row: Description & CTA on Left, Signature Arched Dome on Right */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1.25fr 1fr',
                gap: 40,
                alignItems: 'center',
                paddingTop: 18,
                borderTop: '1px solid rgba(0, 43, 102, 0.15)'
              }}
            >
              {/* Left text column */}
              <div>
                <h3
                  style={{
                    fontSize: '1.4rem',
                    fontFamily: 'var(--font-display)',
                    fontWeight: 600,
                    color: 'var(--obsidian-950)',
                    margin: '0 0 10px 0',
                    letterSpacing: '-0.02em',
                    lineHeight: 1.2
                  }}
                >
                  Periodic Symphony
                </h3>

                <p
                  style={{
                    fontSize: 14.5,
                    color: '#443A33',
                    lineHeight: 1.65,
                    marginBottom: 24,
                    maxWidth: 500
                  }}
                >
                  Every element in the cosmos, from the lightest hydrogen to dense 22-karat gold and platinum, obeys eternal equations of motion, gravitation, and energy. Explore real-time 3D simulations where classical mechanics and atomic matter converge in immaculate symmetry.
                </p>

                <button
                  onClick={() => onLaunchLab && onLaunchLab('projectile')}
                  style={{
                    background: '#002B66', // Signature deep navy button
                    color: '#FFFFFF',
                    padding: '13px 32px',
                    borderRadius: 0, // Sharp architectural corners
                    fontWeight: 600,
                    fontSize: 14.5,
                    letterSpacing: '0.02em',
                    cursor: 'pointer',
                    border: 'none',
                    boxShadow: '0 6px 20px rgba(0, 43, 102, 0.35)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    transition: 'all var(--transition-fast)'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = '#0B3F94'
                    e.currentTarget.style.transform = 'translateY(-2px)'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = '#002B66'
                    e.currentTarget.style.transform = 'none'
                  }}
                >
                  Explore Collection
                  <ArrowUpRight size={16} />
                </button>
              </div>

              {/* Right column: Signature framed detail */}
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <div
                  style={{
                    width: '100%',
                    maxWidth: 320,
                    height: 240,
                    borderRadius: 0, // Sharp edges as requested
                    border: '2px solid rgba(0, 43, 102, 0.25)',
                    boxShadow: '0 12px 32px rgba(18, 14, 11, 0.15)',
                    overflow: 'hidden',
                    position: 'relative',
                    background: '#FAF4E8'
                  }}
                >
                  <img
                    src={showcaseImage || '/images/physics_doodle_portrait.jpg'}
                    alt="Physics Equations & Mechanics Detail"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      objectPosition: 'center 38%',
                      transform: 'scale(1.15)',
                      transition: 'transform 0.6s ease'
                    }}
                    onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.25)'}
                    onMouseLeave={e => e.currentTarget.style.transform = 'scale(1.15)'}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'radial-gradient(circle at 50% 50%, transparent 50%, rgba(0, 43, 102, 0.08) 100%)',
                      pointerEvents: 'none'
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
