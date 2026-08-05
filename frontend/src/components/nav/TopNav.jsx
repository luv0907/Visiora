/**
 * VISIORA — TopNav
 * Desktop top navigation bar, replacing BottomNav at >= 1024px.
 */
import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useProgressStore } from '../../store/useProgressStore'
import { useAuthStore } from '../../store/useAuthStore'

const TABS = [
  { id: 'home', label: 'Home', path: '/' },
  { id: 'sim', label: 'Simulator', path: '/sim' },
  { id: 'progress', label: 'Progress', path: '/progress' },
  { id: 'quiz', label: 'Quiz', path: '/quiz/gravity' },
]

export default function TopNav() {
  const navigate = useNavigate()
  const location = useLocation()
  
  const user = useAuthStore(state => state.user)
  const profile = useProgressStore(state => state.profile)

  const getActiveTab = () => {
    const path = location.pathname
    if (path === '/') return 'home'
    if (path.startsWith('/sim')) return 'sim'
    if (path.startsWith('/progress')) return 'progress'
    if (path.startsWith('/quiz')) return 'quiz'
    return 'home'
  }

  const activeTab = getActiveTab()
  const streak = profile?.streak || 0
  const avatar = profile?.avatar || '🚀'

  return (
    <nav
      role="navigation"
      style={{
        position: 'sticky',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 'var(--z-header)',
        backgroundColor: 'var(--color-surface)',
        borderBottom: '1px solid var(--color-border)',
        height: '64px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div style={{
        width: '100%',
        maxWidth: '1280px',
        padding: '0 var(--space-4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: '100%',
      }}>
        {/* Left: Logo */}
        <div 
          onClick={() => navigate('/')}
          style={{ 
            fontFamily: 'var(--font-display)', 
            fontSize: 'var(--text-lg)', 
            fontWeight: 'var(--weight-extrabold)',
            color: 'var(--color-primary)',
            cursor: 'pointer',
            flex: 1,
          }}
        >
          VISIORA
        </div>

        {/* Center: Nav Links */}
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          {TABS.map(tab => {
            const active = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => navigate(tab.path)}
                style={{
                  padding: 'var(--space-2) var(--space-4)',
                  borderRadius: 'var(--radius-full)',
                  fontSize: 'var(--text-sm)',
                  fontWeight: 'var(--weight-semibold)',
                  color: active ? 'white' : 'var(--color-text-muted)',
                  backgroundColor: active ? 'var(--color-primary)' : 'transparent',
                  transition: 'background-color var(--duration-fast), color var(--duration-fast)',
                  minHeight: '36px',
                }}
              >
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Right: Stats & Profile */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flex: 1, justifyContent: 'flex-end' }}>
          <div style={{ 
            display: 'flex', alignItems: 'center', gap: '4px',
            backgroundColor: 'var(--cream-100)',
            padding: '4px 12px',
            borderRadius: 'var(--radius-full)',
            border: '1px solid var(--color-border)'
          }}>
            <span style={{ fontSize: '14px' }}>🔥</span>
            <span style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-bold)', color: 'var(--color-text)' }}>{streak}</span>
          </div>
          
          <div 
            onClick={() => navigate('/progress')}
            style={{
              width: 36, height: 36,
              borderRadius: '50%',
              background: 'var(--navy-50)',
              border: '2px solid var(--navy-200)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18,
              cursor: 'pointer',
              transition: 'transform var(--duration-fast)',
            }}
          >
            {avatar}
          </div>
        </div>
      </div>
    </nav>
  )
}
