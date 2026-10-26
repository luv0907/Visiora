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
    id: 'physlab',
    label: 'Lab',
    path: '/physics-lab',
    icon: (active) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3" />
        <path d="M7.5 15h9" fill={active ? 'currentColor' : 'none'} />
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
        <polygon points="10 8 16 12 10 16 10 8" fill={active ? 'var(--sunflower)' : 'currentColor'} />
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

  // Floating ink "sticker" bar: the active tab is a sunflower pill with its
  // label; the others are icons (each still has an aria-label).
  return (
    <nav
      role="navigation"
      aria-label="Main navigation"
      style={{
        position: 'fixed',
        left: 12,
        right: 12,
        bottom: 'calc(10px + var(--bottom-nav-safe, 0px))',
        zIndex: 'var(--z-modal)',
        height: 64,
        padding: 8,
        boxSizing: 'border-box',
        backgroundColor: 'var(--ink)',
        border: '3px solid var(--ink)',
        borderRadius: 999,
        boxShadow: '4px 4px 0 var(--grape-ink)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 4,
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
              flex: active ? '0 0 auto' : '1 1 0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              height: 44,
              padding: active ? '0 16px' : 0,
              border: 'none',
              borderRadius: 999,
              background: active ? 'var(--sunflower)' : 'transparent',
              color: active ? 'var(--ink)' : 'var(--paper)',
              cursor: 'pointer',
              transition: 'background var(--transition-fast)',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            <span style={{ display: 'flex' }}>{tab.icon(active)}</span>
            {active && (
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 12.5, fontWeight: 800, lineHeight: 1 }}>
                {tab.label}
              </span>
            )}
          </button>
        )
      })}
    </nav>
  )
}
