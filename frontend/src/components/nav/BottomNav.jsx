/**
 * VISIORA — BottomNav
 * Mobile bottom navigation bar styled with the warm creamy theme.
 */
import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

const TABS = [
  {
    id: 'home',
    label: 'Home',
    path: '/',
    icon: (active) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
      <svg width="20" height="20" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polygon points="10 8 16 12 10 16 10 8" fill={active ? 'white' : 'currentColor'} />
      </svg>
    ),
  },
  {
    id: 'progress',
    label: 'Mastery',
    path: '/progress',
    icon: (active) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
      <svg width="20" height="20" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 11l3 3L22 4" />
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </svg>
    ),
  },
  {
    id: 'profile',
    label: 'Profile',
    path: '/profile',
    icon: (active) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
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
    if (path.startsWith('/profile')) return 'profile'
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
        backgroundColor: 'rgba(250, 248, 245, 0.96)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderTop: '1px solid rgba(0, 43, 102, 0.12)',
        boxShadow: '0 -4px 24px rgba(0, 43, 102, 0.08)',
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
              gap: '4px',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              padding: 'var(--space-2) var(--space-1)',
              minHeight: 'unset',
              color: active ? '#002B66' : '#718096',
              transition: 'color var(--transition-fast)',
              position: 'relative',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            {active && (
              <span
                style={{
                  position: 'absolute',
                  top: 0,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: '28px',
                  height: '3px',
                  borderRadius: '0 0 2px 2px',
                  background: '#002B66',
                }}
              />
            )}

            <span>{tab.icon(active)}</span>

            <span
              style={{
                fontSize: '10.5px',
                fontWeight: active ? 700 : 500,
                fontFamily: 'var(--font-body)',
                letterSpacing: active ? '0.02em' : '0',
                lineHeight: 1,
                color: active ? '#002B66' : 'inherit'
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
