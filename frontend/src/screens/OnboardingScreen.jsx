import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/useAuthStore'
import { useAdminStore } from '../store/useAdminStore'
import { useProgressStore } from '../store/useProgressStore'

const isDedicatedAdmin = import.meta.env.VITE_APP_TARGET === 'admin'
import {
  Compass,
  Sparkles,
  Layers,
  ShieldCheck,
  Atom,
  Mail,
  GraduationCap,
  AlertCircle
} from 'lucide-react'

// ── Google Brand Icon ────────────────────────────────────────────────
function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  )
}

export default function OnboardingScreen() {
  const navigate = useNavigate()
  
  const authStore = useAuthStore()
  const adminStore = useAdminStore()

  const {
    signIn,
    signUp,
    signInWithGoogle: authSignInWithGoogle,
    signInAsScholar,
    isAuthenticated: isAuthUser,
    isJustSignedIn,
    error: mainAuthError,
    clearError,
    clearJustSignedIn
  } = authStore

  const {
    loginWithGoogle: adminSignInWithGoogle,
    enableDevAdmin,
    isAdminAuthenticated,
    authError: adminAuthError,
    isAuthLoading: adminLoading
  } = adminStore

  const isAuthenticated = isDedicatedAdmin ? isAdminAuthenticated : isAuthUser
  const authError = isDedicatedAdmin ? adminAuthError : mainAuthError

  const { updateClassCode, error: progressError } = useProgressStore()

  const [mode, setMode] = useState('google') // 'google' | 'email'
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState('auth') // 'auth' | 'classCode'
  const [classCode, setClassCode] = useState('')

  // Route upon successful authentication
  useEffect(() => {
    if (isAuthenticated) {
      if (!isJustSignedIn) {
        navigate('/', { replace: true })
      } else {
        setStep('classCode')
      }
    }
  }, [isAuthenticated, isJustSignedIn, navigate])

  const handleGoogleLogin = async () => {
    if (!isDedicatedAdmin) clearError()
    setLoading(true)
    try {
      if (isDedicatedAdmin) {
        await adminSignInWithGoogle()
      } else {
        await authSignInWithGoogle()
      }
    } catch (err) {
      console.warn('Google sign-in completed or reported:', err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleInstantScholar = (name = 'Physics Scholar') => {
    clearError()
    setLoading(true)
    signInAsScholar(name, `${name.toLowerCase().replace(/\s+/g, '.') || 'scholar'}@visiora.edu`)
    setLoading(false)
  }

  const handleEmailAuth = async (e) => {
    e.preventDefault()
    if (!email.trim() || !password.trim()) return
    clearError()
    setLoading(true)
    try {
      if (isSignUp) {
        await signUp(email.trim(), password)
      } else {
        await signIn(email.trim(), password)
      }
    } catch (err) {
      console.warn('Email auth result:', err.message)
    } finally {
      setLoading(false)
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
      // Handled in store
    }
  }

  const handleSkipClassCode = () => {
    clearJustSignedIn()
    navigate('/', { replace: true })
  }

  return (
    <div
      style={{
        minHeight: '100dvh',
        width: '100vw',
        backgroundColor: '#FAF8F5',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        fontFamily: 'var(--font-body, Inter, sans-serif)',
        color: '#0A192F',
        overflowX: 'hidden'
      }}
    >
      {/* ── Blueprint Grid Background ── */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `
            linear-gradient(to right, rgba(0, 43, 102, 0.04) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(0, 43, 102, 0.04) 1px, transparent 1px)
          `,
          backgroundSize: '32px 32px',
          pointerEvents: 'none',
          zIndex: 0
        }}
      />

      {/* Floating Mathematical Constants in watermark */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 0,
          overflow: 'hidden',
          opacity: 0.035,
          fontFamily: 'serif',
          userSelect: 'none'
        }}
      >
        <span style={{ position: 'absolute', top: '10%', left: '5%', fontSize: 80 }}>E = mc²</span>
        <span style={{ position: 'absolute', top: '25%', right: '8%', fontSize: 90 }}>∇ × B = μ₀J</span>
        <span style={{ position: 'absolute', bottom: '15%', left: '12%', fontSize: 85 }}>λ = h / p</span>
        <span style={{ position: 'absolute', bottom: '30%', right: '15%', fontSize: 75 }}>F = G(m₁m₂)/r²</span>
      </div>

      {/* ── Top Header ── */}
      <header
        style={{
          padding: '20px 32px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          position: 'relative',
          zIndex: 10,
          borderBottom: '1px solid rgba(0, 43, 102, 0.08)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 38,
              height: 38,
              background: '#002B66',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(0, 43, 102, 0.25)'
            }}
          >
            <Compass size={22} color="#D97706" />
          </div>
          <div>
            <div
              style={{
                fontSize: 17,
                fontWeight: 850,
                color: '#002B66',
                letterSpacing: '0.04em',
                fontFamily: 'var(--font-display, serif)'
              }}
            >
              VISIORA
            </div>
            <div style={{ fontSize: 10, color: '#64748B', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Physics Atelier
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: '#002B66',
              background: 'rgba(0, 43, 102, 0.07)',
              padding: '4px 10px',
              border: '1px solid rgba(0, 43, 102, 0.15)'
            }}
          >
            {isDedicatedAdmin ? 'ADMIN CONSOLE' : 'ACADEMIC EDITION'}
          </span>
        </div>
      </header>

      {/* ── Main Hero Split ── */}
      <main
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px 24px',
          position: 'relative',
          zIndex: 1
        }}
      >
        <div
          style={{
            maxWidth: 1060,
            width: '100%',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
            gap: 40,
            alignItems: 'center'
          }}
        >
          {/* Left Column: Atelier Manifesto */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                background: '#FEF3C7',
                border: '1px solid #FDE68A',
                color: '#92400E',
                padding: '4px 12px',
                fontSize: 11.5,
                fontWeight: 800,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                alignSelf: 'flex-start'
              }}
            >
              <Sparkles size={13} color="#D97706" />
              <span>Interactive Scientific Workbench</span>
            </div>

            <h1
              style={{
                fontFamily: 'var(--font-display, serif)',
                fontSize: 'clamp(28px, 4.5vw, 44px)',
                fontWeight: 850,
                color: '#002B66',
                lineHeight: 1.18,
                letterSpacing: '-0.02em',
                margin: 0
              }}
            >
              Master Physics by Touching the Formulas.
            </h1>

            <p
              style={{
                fontSize: 15,
                color: '#475569',
                lineHeight: 1.65,
                margin: 0,
                maxWidth: 480
              }}
            >
              Step into an architectural learning laboratory. Seamlessly experiment with kinetic trajectories,
              electromagnetic induction, and buoyancy in real-time, accompanied by an intelligent visual physics tutor.
            </p>

            {/* 3 Core Highlights */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                {
                  icon: Layers,
                  title: '2D Interactive Laboratories',
                  desc: 'PhET & Canvas kinetic simulations with live parameter manipulation'
                },
                {
                  icon: Atom,
                  title: 'Spatial 3D Physics Bench',
                  desc: 'Precision WebGL apparatus under active engineering calibration'
                },
                {
                  icon: Sparkles,
                  title: 'AI Visual Physics Tutor',
                  desc: 'Dynamic Claude-inspired visual reasoning and generative physics diagrams'
                }
              ].map((item, idx) => {
                const Icon = item.icon
                return (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 14,
                      background: '#FFFFFF',
                      border: '1px solid rgba(0, 43, 102, 0.12)',
                      padding: '12px 16px',
                      boxShadow: '0 2px 8px rgba(0, 43, 102, 0.04)'
                    }}
                  >
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        background: '#FAF8F5',
                        border: '1px solid rgba(0, 43, 102, 0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#002B66',
                        flexShrink: 0
                      }}
                    >
                      <Icon size={16} />
                    </div>
                    <div>
                      <div style={{ fontSize: 13.5, fontWeight: 800, color: '#002B66' }}>{item.title}</div>
                      <div style={{ fontSize: 12, color: '#64748B', lineHeight: 1.4, marginTop: 2 }}>{item.desc}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Right Column: Scholar Authentication Card */}
          <div
            style={{
              background: '#FFFFFF',
              border: '1px solid rgba(0, 43, 102, 0.2)',
              borderTop: '5px solid #002B66',
              padding: '36px 32px',
              boxShadow: '0 20px 50px rgba(0, 43, 102, 0.12)',
              position: 'relative'
            }}
          >
            {step === 'auth' ? (
              <div>
                <div style={{ marginBottom: 24 }}>
                  <div
                    style={{
                      fontSize: 10.5,
                      fontWeight: 800,
                      color: '#D97706',
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      marginBottom: 6
                    }}
                  >
                    {isDedicatedAdmin ? 'Executive Admin Console' : 'Scholar Access Portal'}
                  </div>
                  <h2
                    style={{
                      fontFamily: 'var(--font-display, serif)',
                      fontSize: 24,
                      fontWeight: 800,
                      color: '#002B66',
                      margin: 0
                    }}
                  >
                    {isDedicatedAdmin ? 'Enter Admin Dashboard' : 'Enter the Physics Atelier'}
                  </h2>
                  <p style={{ fontSize: 13, color: '#64748B', marginTop: 6, lineHeight: 1.5, margin: '6px 0 0 0' }}>
                    {isDedicatedAdmin
                      ? 'Sign in with an authorized Google account to configure curriculum parameters and manage simulations.'
                      : 'Sign in with your Google account to automatically synchronize your physics mastery, active streak, and experiment notes.'}
                  </p>
                </div>

                {/* Error Banner */}
                {authError && (
                  <div
                    style={{
                      background: 'rgba(239, 68, 68, 0.08)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      color: '#B91C1C',
                      padding: '12px 14px',
                      fontSize: 12.5,
                      marginBottom: 20,
                      lineHeight: 1.4,
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 8
                    }}
                  >
                    <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                    <div>
                      <div>{authError}</div>
                      <div style={{ marginTop: 6 }}>
                        <button
                          type="button"
                          onClick={() => {
                            if (isDedicatedAdmin) {
                              enableDevAdmin()
                            } else {
                              handleInstantScholar('Research Scholar')
                            }
                          }}
                          style={{
                            background: '#002B66',
                            color: '#FFFFFF',
                            border: 'none',
                            padding: '4px 10px',
                            fontSize: 11.5,
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          ✦ Click Here for Instant {isDedicatedAdmin ? 'Admin' : 'Scholar'} Access
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Mode Selector: Google OAuth vs Instant Scholar */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {/* Primary Google Login Button */}
                  <button
                    type="button"
                    onClick={handleGoogleLogin}
                    disabled={loading}
                    style={{
                      width: '100%',
                      padding: '13px 20px',
                      background: '#FFFFFF',
                      color: '#002B66',
                      border: '1.5px solid rgba(0, 43, 102, 0.3)',
                      fontWeight: 700,
                      fontSize: 14.5,
                      cursor: loading ? 'wait' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 12,
                      boxShadow: '0 4px 14px rgba(0, 43, 102, 0.08)',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.borderColor = '#002B66'
                      e.currentTarget.style.background = '#FAF8F5'
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = 'rgba(0, 43, 102, 0.3)'
                      e.currentTarget.style.background = '#FFFFFF'
                    }}
                  >
                    <GoogleIcon />
                    <span>{loading ? 'Connecting with Google...' : 'Continue with Google Account'}</span>
                  </button>

                  {/* 1-Click Instant Access */}
                  {!isDedicatedAdmin ? (
                    <button
                      type="button"
                      onClick={() => handleInstantScholar('Physics Scholar')}
                      disabled={loading}
                      style={{
                        width: '100%',
                        padding: '13px 20px',
                        background: '#002B66',
                        color: '#FFFFFF',
                        border: 'none',
                        fontWeight: 700,
                        fontSize: 14.5,
                        cursor: loading ? 'wait' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 10,
                        boxShadow: '0 4px 16px rgba(0, 43, 102, 0.3)',
                        transition: 'background 0.15s ease'
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = '#0A192F'}
                      onMouseLeave={e => e.currentTarget.style.background = '#002B66'}
                    >
                      <Sparkles size={16} color="#F59E0B" />
                      <span>✦ Instant Scholar Access (1-Click Entry)</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => enableDevAdmin()}
                      disabled={loading}
                      style={{
                        width: '100%',
                        padding: '13px 20px',
                        background: '#002B66',
                        color: '#FFFFFF',
                        border: 'none',
                        fontWeight: 700,
                        fontSize: 14.5,
                        cursor: loading ? 'wait' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 10,
                        boxShadow: '0 4px 16px rgba(0, 43, 102, 0.3)',
                        transition: 'background 0.15s ease'
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = '#0A192F'}
                      onMouseLeave={e => e.currentTarget.style.background = '#002B66'}
                    >
                      <ShieldCheck size={16} color="#F59E0B" />
                      <span>✦ Switch to Verified Admin (Dev Mode)</span>
                    </button>
                  )}
                </div>

                {/* Email / Password Toggle Form (Hidden in Admin) */}
                {!isDedicatedAdmin && (
                  <>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        margin: '22px 0 16px 0'
                      }}
                    >
                      <div style={{ flex: 1, height: 1, background: 'rgba(0, 43, 102, 0.12)' }} />
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', letterSpacing: '0.08em' }}>
                        OR INSTITUTIONAL ID
                      </span>
                      <div style={{ flex: 1, height: 1, background: 'rgba(0, 43, 102, 0.12)' }} />
                    </div>

                    {mode === 'google' ? (
                  <button
                    type="button"
                    onClick={() => setMode('email')}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#002B66',
                      fontSize: 12.5,
                      fontWeight: 700,
                      cursor: 'pointer',
                      textDecoration: 'underline',
                      width: '100%',
                      textAlign: 'center',
                      padding: '4px'
                    }}
                  >
                    Sign in with Email &amp; Password
                  </button>
                ) : (
                  <form onSubmit={handleEmailAuth} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: '#002B66', marginBottom: 4 }}>
                        Email Address
                      </label>
                      <div style={{ position: 'relative' }}>
                        <Mail size={15} color="#64748B" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={e => setEmail(e.target.value)}
                          placeholder="scholar@university.edu"
                          style={{
                            width: '100%',
                            padding: '9px 12px 9px 34px',
                            fontSize: 13,
                            border: '1px solid rgba(0, 43, 102, 0.25)',
                            background: '#FAF8F5',
                            outline: 'none',
                            boxSizing: 'border-box'
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: '#002B66', marginBottom: 4 }}>
                        Password
                      </label>
                      <div style={{ position: 'relative' }}>
                        <KeyRound size={15} color="#64748B" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
                        <input
                          type="password"
                          required
                          value={password}
                          onChange={e => setPassword(e.target.value)}
                          placeholder="••••••••"
                          style={{
                            width: '100%',
                            padding: '9px 12px 9px 34px',
                            fontSize: 13,
                            border: '1px solid rgba(0, 43, 102, 0.25)',
                            background: '#FAF8F5',
                            outline: 'none',
                            boxSizing: 'border-box'
                          }}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                      <button
                        type="submit"
                        disabled={loading}
                        style={{
                          flex: 1,
                          padding: '10px 14px',
                          background: '#002B66',
                          color: '#FFFFFF',
                          border: 'none',
                          fontWeight: 700,
                          fontSize: 13,
                          cursor: 'pointer'
                        }}
                      >
                        {loading ? 'Processing...' : (isSignUp ? 'Create Scholar Account' : 'Sign In')}
                      </button>

                      <button
                        type="button"
                        onClick={() => setIsSignUp(!isSignUp)}
                        style={{
                          background: 'transparent',
                          border: '1px solid rgba(0, 43, 102, 0.2)',
                          padding: '10px 14px',
                          fontSize: 12,
                          fontWeight: 700,
                          color: '#002B66',
                          cursor: 'pointer'
                        }}
                      >
                        {isSignUp ? 'Switch to Sign In' : 'New Scholar? Register'}
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => setMode('google')}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#64748B',
                        fontSize: 12,
                        cursor: 'pointer',
                        textAlign: 'center',
                        marginTop: 4
                      }}
                    >
                      ← Back to Google Login
                    </button>
                  </form>
                )}
                </>
                )}

                <div
                  style={{
                    marginTop: 24,
                    paddingTop: 16,
                    borderTop: '1px solid rgba(0, 43, 102, 0.08)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    color: '#64748B',
                    fontSize: 12
                  }}
                >
                  <ShieldCheck size={14} color="#059669" />
                  <span>Secure Firebase Authentication · End-to-End Encryption</span>
                </div>
              </div>
            ) : (
              /* Step 2: Class Code Step */
              <div>
                <div style={{ textAlign: 'center', marginBottom: 24 }}>
                  <div
                    style={{
                      width: 56,
                      height: 56,
                      background: '#002B66',
                      color: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 16px auto'
                    }}
                  >
                    <GraduationCap size={28} color="#D97706" />
                  </div>

                  <h2
                    style={{
                      fontFamily: 'var(--font-display, serif)',
                      fontSize: 22,
                      fontWeight: 800,
                      color: '#002B66',
                      margin: '0 0 8px 0'
                    }}
                  >
                    Academic Class Code
                  </h2>

                  <p style={{ fontSize: 13.5, color: '#64748B', lineHeight: 1.5, margin: 0 }}>
                    Enter your school or university cohort code to link homework assignments, or proceed directly to the workbench.
                  </p>
                </div>

                <form onSubmit={handleClassCodeSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <input
                    type="text"
                    placeholder="e.g. PHY101"
                    value={classCode}
                    onChange={e => setClassCode(e.target.value.toUpperCase())}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      fontSize: 16,
                      fontWeight: 700,
                      letterSpacing: '0.1em',
                      textAlign: 'center',
                      textTransform: 'uppercase',
                      border: '1.5px solid rgba(0, 43, 102, 0.25)',
                      background: '#FAF8F5',
                      boxSizing: 'border-box'
                    }}
                  />

                  {progressError && (
                    <div style={{ color: '#DC2626', fontSize: 12, textAlign: 'center' }}>
                      {progressError}
                    </div>
                  )}

                  <button
                    type="submit"
                    style={{
                      width: '100%',
                      padding: '12px 20px',
                      background: '#002B66',
                      color: '#FFFFFF',
                      border: 'none',
                      fontWeight: 700,
                      fontSize: 14,
                      cursor: 'pointer'
                    }}
                  >
                    Join Cohort &amp; Enter Workbench →
                  </button>

                  <button
                    type="button"
                    onClick={handleSkipClassCode}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#64748B',
                      fontSize: 13,
                      cursor: 'pointer',
                      textAlign: 'center',
                      textDecoration: 'underline'
                    }}
                  >
                    Skip for now and start exploring
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* ── Footer ── */}
      <footer
        style={{
          padding: '16px 32px',
          textAlign: 'center',
          fontSize: 12,
          color: '#94A3B8',
          borderTop: '1px solid rgba(0, 43, 102, 0.06)',
          position: 'relative',
          zIndex: 10
        }}
      >
        VISIORA Atelier © 2026 · Interactive Physics Laboratories &amp; Visual Reasoning
      </footer>
    </div>
  )
}
