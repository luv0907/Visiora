import React, { useState, useEffect } from 'react'
import { auth } from '../../lib/firebase'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { logout } from '../../api/client'
import { useUIStore } from '../../store/useUIStore'
import AuthModal from './AuthModal'

export default function UserBadge() {
  const [user, setUser] = useState(null)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const { addToast } = useUIStore()

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser)
    })
    return () => unsubscribe()
  }, [])

  const handleLogout = async () => {
    try {
      await signOut(auth)
      await logout()
      addToast({ type: 'info', message: 'Logged out successfully' })
    } catch (err) {
      addToast({ type: 'error', message: 'Error logging out' })
    }
  }

  if (user) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
        <div style={{ 
          width: '32px', height: '32px', borderRadius: '50%', 
          background: 'var(--color-primary-bg)', color: 'var(--color-primary)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 'bold', fontSize: '14px'
        }}>
          {user.email ? user.email[0].toUpperCase() : 'U'}
        </div>
        <button 
          onClick={handleLogout}
          style={{ 
            background: 'none', border: 'none', cursor: 'pointer', 
            fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)',
            textDecoration: 'underline'
          }}
        >
          Logout
        </button>
      </div>
    )
  }

  return (
    <>
      <button 
        onClick={() => setShowAuthModal(true)}
        style={{
          padding: '6px 12px',
          borderRadius: 'var(--radius-full)',
          border: '1px solid var(--color-primary)',
          background: 'transparent',
          color: 'var(--color-primary)',
          cursor: 'pointer',
          fontWeight: 'var(--weight-semibold)',
          fontSize: 'var(--text-xs)'
        }}
      >
        Sign In
      </button>
      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}
    </>
  )
}
