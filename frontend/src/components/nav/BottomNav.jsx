/**
 * VISIORA — BottomNav
 * Fixed mobile bottom navigation bar with 4 tabs.
 * Uses safe-area-inset-bottom for iPhone notch support.
 */
import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

const TABS = [
  {
    id: 'home',
    label: 'Home',
    path: '/',
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    id: 'sim',
    label: 'Simulator',
    path: '/sim',
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polygon points="10 8 16 12 10 16 10 8" fill={active ? 'white' : 'currentColor'} />
      </svg>
    ),
  },
  {
    id: 'progress',
    label: 'Progress',
    path: '/progress',
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10" strokeWidth={active ? 3 : 2} />
        <line x1="12" y1="20" x2="12" y2="4"  strokeWidth={active ? 3 : 2} />
        <line x1="6"  y1="20" x2="6"  y2="14" strokeWidth={active ? 3 : 2} />
      </svg>
    ),
  },
  {
    id: 'quiz',
    label: 'Quiz',
    path: '/quiz/gravity',
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 11l3 3L22 4" />
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </svg>
    ),
  },
]

export default function BottomNav() {
  const navigate = useNavigate()
  const location = useLocation()

  const getActiveTab = () => {
    const path = location.pathname
    if (path === '/') return 'home'
    if (path.startsWith('/sim')) return 'sim'
    if (path.startsWith('/progress')) return 'progress'
    if (path.startsWith('/quiz')) return 'quiz'
    return 'home'
  }

  const activeTab = getActiveTab()

  return (
    <nav
      role="navigation"
      aria-label="Main navigation"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 'var(--z-modal)',
        height: 'calc(var(--bottom-nav-height) + var(--bottom-nav-safe))',
        paddingBottom: 'var(--bottom-nav-safe)',
        backgroundColor: 'var(--color-surface)',
        borderTop: '1px solid var(--color-border)',
        boxShadow: '0 -4px 20px rgba(26, 122, 115, 0.08)',
        display: 'flex',
        alignItems: 'stretch',
      }}
    >
      {TABS.map(tab => {
        const active = activeTab === tab.id
        return (
          <button
            key={tab.id}
            onClick={() => navigate(tab.path)}
            aria-label={tab.label}
            aria-current={active ? 'page' : undefined}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '3px',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              padding: 'var(--space-2) var(--space-1)',
              minHeight: 'unset', // override global min-height inside nav
              color: active ? 'var(--color-primary)' : 'var(--color-text-faint)',
              transition: 'color var(--transition-fast)',
              position: 'relative',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            {/* Active indicator pill */}
            {active && (
              <span
                style={{
                  position: 'absolute',
                  top: 0,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: '32px',
                  height: '3px',
                  borderRadius: '0 0 var(--radius-full) var(--radius-full)',
                  background: 'var(--color-primary)',
                }}
              />
            )}

            {/* Icon */}
            <span
              style={{
                transition: 'transform var(--transition-fast) var(--ease-spring)',
                transform: active ? 'scale(1.12)' : 'scale(1)',
              }}
            >
              {tab.icon(active)}
            </span>

            {/* Label */}
            <span
              style={{
                fontSize: '10px',
                fontWeight: active ? 'var(--weight-bold)' : 'var(--weight-medium)',
                fontFamily: 'var(--font-body)',
                letterSpacing: active ? '0.02em' : '0',
                lineHeight: 1,
              }}
            >
              {tab.label}
            </span>
          </button>
        )
      })}
    </nav>
  )
}
