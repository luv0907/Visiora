import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/useAuthStore'
import { useProgressStore } from '../store/useProgressStore'

const SegmentedControl = ({ isSignUp, onChange }) => (
  <div style={{
    display: 'flex',
    position: 'relative',
    backgroundColor: 'var(--color-surface)',
    borderRadius: 'var(--radius-md)',
    padding: '4px',
    marginBottom: 'var(--space-6)',
    border: '1px solid var(--color-border)',
    boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.02)'
  }}>
    <div style={{
      position: 'absolute',
      top: '4px',
      left: isSignUp ? 'calc(50% - 2px)' : '4px',
      width: 'calc(50% - 2px)',
      height: 'calc(100% - 8px)',
      backgroundColor: 'var(--color-surface-2)',
      borderRadius: 'var(--radius-sm)',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      transition: 'left var(--transition-smooth) var(--ease-spring)'
    }} />
    <button
      onClick={() => onChange(false)}
      style={{
        flex: 1, position: 'relative', padding: 'var(--space-2) 0', background: 'none', border: 'none',
        color: !isSignUp ? 'var(--color-text)' : 'var(--color-text-muted)',
        fontWeight: 'var(--weight-semibold)', cursor: 'pointer', zIndex: 1,
        transition: 'color var(--transition-fast)'
      }}
    >
      Sign in
    </button>
    <button
      onClick={() => onChange(true)}
      style={{
        flex: 1, position: 'relative', padding: 'var(--space-2) 0', background: 'none', border: 'none',
        color: isSignUp ? 'var(--color-text)' : 'var(--color-text-muted)',
        fontWeight: 'var(--weight-semibold)', cursor: 'pointer', zIndex: 1,
        transition: 'color var(--transition-fast)'
      }}
    >
      Sign up
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

export default function OnboardingScreen() {
  const navigate = useNavigate()
  
  const { signIn, signUp, signInWithGoogle, signInDev, isAuthenticated, isJustSignedIn, error: authError, clearError, clearJustSignedIn } = useAuthStore()
  const { updateClassCode, isLoading: isProgressLoading, error: progressError } = useProgressStore()

  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [localLoading, setLocalLoading] = useState(false)
  const [step, setStep] = useState('auth') // 'auth' | 'classCode'
  const [classCode, setClassCode] = useState('')

  useEffect(() => {
    if (isAuthenticated) {
      if (!isJustSignedIn) {
        // They were already signed in from a previous session and visited /onboarding directly
        navigate('/', { replace: true })
      } else {
        // They just signed in! Move to classCode step
        setStep('classCode')
      }
    }
  }, [isAuthenticated, isJustSignedIn, navigate])

  const handleAuth = async (e) => {
    e.preventDefault()
    clearError()
    setLocalLoading(true)
    try {
      if (isSignUp) {
        await signUp(email, password)
      } else {
        await signIn(email, password)
      }
    } catch (err) {
      // Error is handled in store and displayed
    } finally {
      setLocalLoading(false)
    }
  }

  const handleGoogle = async () => {
    clearError()
    setLocalLoading(true)
    try {
      await signInWithGoogle()
    } catch (err) {
      // Error handled in store
    } finally {
      setLocalLoading(false)
    }
  }

  const handleClassCodeSubmit = async (e) => {
    e.preventDefault()
    if (!classCode.trim()) {
      clearJustSignedIn()
      navigate('/', { replace: true })
      return
    }
    
    try {
      await updateClassCode(classCode.trim())
      clearJustSignedIn()
      navigate('/', { replace: true })
    } catch (err) {
      // Store has error
    }
  }

  const handleSkip = () => {
    clearJustSignedIn()
    navigate('/', { replace: true })
  }

  // --- STYLES ---
  const containerStyle = {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'var(--color-bg)',
    backgroundImage: `
      radial-gradient(circle at 10% 20%, rgba(27, 42, 65, 0.04) 0%, transparent 40%),
      radial-gradient(circle at 90% 80%, rgba(139, 92, 246, 0.05) 0%, transparent 50%),
      linear-gradient(rgba(27, 42, 65, 0.02) 1px, transparent 1px),
      linear-gradient(90deg, rgba(27, 42, 65, 0.02) 1px, transparent 1px)
    `,
    backgroundSize: '100% 100%, 100% 100%, 20px 20px, 20px 20px',
    color: 'var(--color-text)',
    padding: 'var(--space-6) var(--space-4)',
  }

  const heroStyle = {
    textAlign: 'center',
    marginBottom: 'var(--space-6)',
  }

  const cardStyle = {
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    backdropFilter: 'blur(16px) saturate(180%)',
    WebkitBackdropFilter: 'blur(16px) saturate(180%)',
    padding: 'var(--space-8)',
    borderRadius: 'var(--radius-xl)',
    boxShadow: 'var(--shadow-lg)',
    border: '1px solid rgba(255, 255, 255, 0.5)',
    width: '100%',
    maxWidth: '420px',
  }

  const inputStyle = {
    width: '100%',
    padding: 'var(--space-3) var(--space-4)',
    marginBottom: 'var(--space-4)',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--color-border)',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    color: 'var(--color-text)',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-base)',
    outline: 'none',
    boxShadow: 'var(--shadow-xs)',
    transition: 'all var(--transition-fast) var(--ease-standard)',
  }

  const btnPrimaryStyle = {
    width: '100%',
    padding: 'var(--space-3) var(--space-4)',
    borderRadius: 'var(--radius-md)',
    backgroundColor: 'var(--color-primary)',
    color: 'var(--color-text-on-primary)',
    border: 'none',
    fontWeight: 'var(--weight-semibold)',
    fontSize: 'var(--text-base)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: 'var(--shadow-sm)',
    transition: 'all var(--transition-fast) var(--ease-standard)',
    opacity: localLoading || isProgressLoading ? 0.7 : 1,
  }

  const btnOutlineStyle = {
    ...btnPrimaryStyle,
    backgroundColor: 'var(--color-surface)',
    color: 'var(--color-text)',
    border: '1px solid var(--color-border-md)',
    boxShadow: 'var(--shadow-xs)',
  }

  return (
    <div style={containerStyle}>
      <div style={heroStyle}>
        <h1 style={{ 
          fontFamily: 'var(--font-display)', 
          fontSize: 'var(--text-4xl)', 
          fontWeight: 'var(--weight-extrabold)', 
          color: 'var(--color-text)', 
          letterSpacing: '-0.5px',
          marginBottom: 'var(--space-1)' 
        }}>
          VISIORA
        </h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-lg)', fontWeight: '500' }}>
          AI-guided 3D physics experiments.
        </p>
        
        {/* Orbital SVG physics animation */}
        <div style={{ marginTop: 'var(--space-6)', height: 80, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <svg width="120" height="80" viewBox="0 0 120 80">
            {/* Nucleus */}
            <circle cx="60" cy="40" r="7" fill="var(--color-primary)" />
            {/* Orbit 1 */}
            <ellipse cx="60" cy="40" rx="35" ry="12" fill="none" stroke="var(--color-border-md)" strokeWidth="1.5" transform="rotate(-30, 60, 40)" strokeDasharray="3 3" />
            <circle cx="60" cy="40" r="3.5" fill="var(--color-accent)">
              <animateMotion dur="2.5s" repeatCount="indefinite" path="M 29.6 22.5 A 35 12 0 1 1 90.4 57.5 A 35 12 0 1 1 29.6 22.5" />
            </circle>
            {/* Orbit 2 */}
            <ellipse cx="60" cy="40" rx="35" ry="12" fill="none" stroke="var(--color-border-md)" strokeWidth="1.5" transform="rotate(30, 60, 40)" strokeDasharray="3 3" />
            <circle cx="60" cy="40" r="3.5" fill="var(--color-primary)">
              <animateMotion dur="3.5s" repeatCount="indefinite" path="M 29.6 57.5 A 35 12 0 1 1 90.4 22.5 A 35 12 0 1 1 29.6 57.5" />
            </circle>
          </svg>
        </div>
      </div>

      <div style={cardStyle}>
        {step === 'auth' ? (
          <>
            <SegmentedControl 
              isSignUp={isSignUp} 
              onChange={(val) => { setIsSignUp(val); clearError(); }} 
            />

            <form onSubmit={handleAuth}>
              <input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={e => setEmail(e.target.value)}
                style={inputStyle}
                required
              />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                style={inputStyle}
                required
              />
              
              {authError && <ErrorChip message={authError} />}

              <button type="submit" style={btnPrimaryStyle} disabled={localLoading}>
                {localLoading ? (
                  <span style={{ display: 'inline-block', width: 20, height: 20, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                ) : (
                  isSignUp ? 'Create Account' : 'Sign In'
                )}
              </button>
            </form>

            <div style={{ display: 'flex', alignItems: 'center', margin: 'var(--space-6) 0', color: 'var(--color-text-faint)' }}>
              <div style={{ flex: 1, height: 1, backgroundColor: 'var(--color-border)' }} />
              <span style={{ padding: '0 var(--space-4)', fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-medium)' }}>or</span>
              <div style={{ flex: 1, height: 1, backgroundColor: 'var(--color-border)' }} />
            </div>

            <button type="button" onClick={handleGoogle} style={btnOutlineStyle} disabled={localLoading}>
              {localLoading ? (
                  <span style={{ display: 'inline-block', width: 20, height: 20, border: '2px solid var(--color-border)', borderTopColor: 'var(--color-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-3)' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  Continue with Google
                </div>
              )}
            </button>

            {import.meta.env.VITE_ENVIRONMENT === 'development' && (
              <button 
                type="button" 
                onClick={async () => {
                  clearError();
                  setLocalLoading(true);
                  try {
                    await signInDev();
                  } catch (e) {}
                  setLocalLoading(false);
                }} 
                style={{ 
                  ...btnOutlineStyle, 
                  marginTop: 'var(--space-3)', 
                  borderColor: 'var(--color-primary)', 
                  color: 'var(--color-primary)',
                  fontWeight: 'var(--weight-bold)'
                }}
                disabled={localLoading}
              >
                ⚡ Bypass Auth (Dev Mode)
              </button>
            )}
          </>
        ) : (
          <>
            <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--weight-bold)', marginBottom: 'var(--space-2)', color: 'var(--color-text)', textAlign: 'center' }}>Have a class code?</h2>
            <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-base)', marginBottom: 'var(--space-6)', textAlign: 'center', lineHeight: '1.5' }}>
              Enter it now to link your progress, or skip and do it later.
            </p>

            <form onSubmit={handleClassCodeSubmit}>
              <input
                type="text"
                placeholder="Class Code (e.g. PHY101)"
                value={classCode}
                onChange={e => setClassCode(e.target.value.toUpperCase())}
                style={{ ...inputStyle, textTransform: 'uppercase', letterSpacing: '1px', textAlign: 'center' }}
              />
              
              {progressError && <ErrorChip message={progressError} />}

              <button type="submit" style={{ ...btnPrimaryStyle, marginBottom: 'var(--space-4)' }} disabled={isProgressLoading}>
                {isProgressLoading ? (
                  <span style={{ display: 'inline-block', width: 20, height: 20, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                ) : 'Join Class'}
              </button>
              
              <button type="button" onClick={handleSkip} style={{ ...btnOutlineStyle, border: 'none', boxShadow: 'none', backgroundColor: 'transparent' }}>
                Skip for now
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}

