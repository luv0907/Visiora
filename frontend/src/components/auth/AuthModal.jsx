import React, { useState } from 'react'
import { auth } from '../../lib/firebase'
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth'
import { useUIStore } from '../../store/useUIStore'
import { loginWithFirebase } from '../../api/client'

const SegmentedControl = ({ isSignUp, onChange }) => (
  <div style={{
    display: 'flex', position: 'relative', backgroundColor: 'var(--color-surface)',
    borderRadius: 'var(--radius-md)', padding: '4px', marginBottom: 'var(--space-6)',
    border: '1px solid var(--color-border)', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.02)'
  }}>
    <div style={{
      position: 'absolute', top: '4px', left: isSignUp ? 'calc(50% - 2px)' : '4px',
      width: 'calc(50% - 2px)', height: 'calc(100% - 8px)', backgroundColor: 'var(--color-surface-2)',
      borderRadius: 'var(--radius-sm)', boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      transition: 'left var(--transition-smooth) var(--ease-spring)'
    }} />
    <button type="button" onClick={() => onChange(false)}
      style={{
        flex: 1, position: 'relative', padding: 'var(--space-2) 0', background: 'none', border: 'none',
        color: !isSignUp ? 'var(--color-text)' : 'var(--color-text-muted)',
        fontWeight: 'var(--weight-semibold)', cursor: 'pointer', zIndex: 1, transition: 'color var(--transition-fast)'
      }}>
      Log In
    </button>
    <button type="button" onClick={() => onChange(true)}
      style={{
        flex: 1, position: 'relative', padding: 'var(--space-2) 0', background: 'none', border: 'none',
        color: isSignUp ? 'var(--color-text)' : 'var(--color-text-muted)',
        fontWeight: 'var(--weight-semibold)', cursor: 'pointer', zIndex: 1, transition: 'color var(--transition-fast)'
      }}>
      Sign Up
    </button>
  </div>
)

const ErrorChip = ({ message }) => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
    backgroundColor: 'var(--color-error-bg)', color: 'var(--color-error)',
    padding: 'var(--space-2) var(--space-3)', borderRadius: 'var(--radius-sm)',
    marginBottom: 'var(--space-4)', fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-medium)'
  }}>
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"></circle>
      <line x1="12" y1="8" x2="12" y2="12"></line>
      <line x1="12" y1="16" x2="12.01" y2="16"></line>
    </svg>
    {message}
  </div>
)

export default function AuthModal({ onClose }) {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const { addToast } = useUIStore()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      let userCredential;
      if (isLogin) {
        userCredential = await signInWithEmailAndPassword(auth, email, password)
      } else {
        userCredential = await createUserWithEmailAndPassword(auth, email, password)
      }
      
      const token = await userCredential.user.getIdToken()
      await loginWithFirebase(token)
      
      addToast({ type: 'success', message: `Successfully ${isLogin ? 'logged in' : 'registered'}!` })
      if (onClose) onClose()
    } catch (err) {
      const errorMessage = err.code === 'auth/operation-not-allowed' 
        ? 'Email/Password authentication is not enabled in your Firebase Console.' 
        : (err.message || 'Authentication failed')
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = {
    width: '100%', padding: 'var(--space-3) var(--space-4)', marginBottom: 'var(--space-4)',
    borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-surface)', color: 'var(--color-text)',
    fontFamily: 'var(--font-body)', fontSize: 'var(--text-base)', outline: 'none',
    boxShadow: 'var(--shadow-sm)', transition: 'box-shadow var(--transition-fast), border-color var(--transition-fast)'
  }

  const btnPrimaryStyle = {
    width: '100%', padding: 'var(--space-3) var(--space-4)', borderRadius: 'var(--radius-md)',
    backgroundColor: 'var(--color-primary)', color: '#FFFBF8', border: 'none',
    fontWeight: 'var(--weight-semibold)', fontSize: 'var(--text-base)', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'background-color var(--transition-fast), opacity var(--transition-fast), transform var(--transition-fast)',
    opacity: loading ? 0.7 : 1
  }

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 'var(--z-modal)', padding: 'var(--space-4)'
    }}>
      <div style={{
        background: 'var(--color-surface-2)', padding: 'var(--space-6) var(--space-8)',
        borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: '400px',
        boxShadow: 'var(--shadow-lg)', border: '1px solid var(--color-border)',
        maxHeight: '90vh', overflowY: 'auto'
      }}>
        <h2 style={{ fontFamily: 'var(--font-display)', marginBottom: 'var(--space-4)', color: 'var(--color-text)', textAlign: 'center' }}>
          {isLogin ? 'Welcome Back' : 'Create Account'}
        </h2>
        
        <SegmentedControl isSignUp={!isLogin} onChange={(isSignUp) => { setIsLogin(!isSignUp); setError(null); }} />
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column' }}>
          <input 
            type="email" placeholder="Email address" value={email} 
            onChange={e => setEmail(e.target.value)} required style={inputStyle}
          />
          <input 
            type="password" placeholder="Password" value={password} 
            onChange={e => setPassword(e.target.value)} required minLength={6} style={inputStyle}
          />

          {error && <ErrorChip message={error} />}

          <button type="submit" disabled={loading} style={btnPrimaryStyle}>
            {loading ? (
              <span style={{ display: 'inline-block', width: 20, height: 20, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            ) : (isLogin ? 'Log In' : 'Create Account')}
          </button>
        </form>
        
        {onClose && (
          <button type="button" onClick={onClose}
            style={{ 
              marginTop: 'var(--space-4)', width: '100%', padding: 'var(--space-3)', 
              background: 'transparent', border: 'none', color: 'var(--color-text-muted)',
              borderRadius: 'var(--radius-md)', cursor: 'pointer', fontWeight: 'var(--weight-semibold)',
              transition: 'color var(--transition-fast)'
            }}
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  )
}
