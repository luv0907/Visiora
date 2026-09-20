import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/useAuthStore'
import { useProgressStore } from '../store/useProgressStore'

// ── Particle Background ──────────────────────────────────────────────
function ParticleCanvas() {
  const canvasRef = useRef(null)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let animId
    let W, H
    const PARTICLE_COUNT = 55

    const particles = Array.from({ length: PARTICLE_COUNT }, () => ({
      x: Math.random(),
      y: Math.random(),
      r: Math.random() * 1.8 + 0.4,
      vx: (Math.random() - 0.5) * 0.0003,
      vy: (Math.random() - 0.5) * 0.0003,
      alpha: Math.random() * 0.5 + 0.1,
    }))

    function resize() {
      W = canvas.width = window.innerWidth
      H = canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    function draw() {
      ctx.clearRect(0, 0, W, H)
      // Connection lines
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = (particles[i].x - particles[j].x) * W
          const dy = (particles[i].y - particles[j].y) * H
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 130) {
            ctx.beginPath()
            ctx.moveTo(particles[i].x * W, particles[i].y * H)
            ctx.lineTo(particles[j].x * W, particles[j].y * H)
            ctx.strokeStyle = `rgba(139,92,246,${0.12 * (1 - dist / 130)})`
            ctx.lineWidth = 0.7
            ctx.stroke()
          }
        }
      }
      // Dots
      for (const p of particles) {
        ctx.beginPath()
        ctx.arc(p.x * W, p.y * H, p.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(167,139,250,${p.alpha})`
        ctx.fill()
        p.x += p.vx
        p.y += p.vy
        if (p.x < 0) p.x = 1
        if (p.x > 1) p.x = 0
        if (p.y < 0) p.y = 1
        if (p.y > 1) p.y = 0
      }
      animId = requestAnimationFrame(draw)
    }
    draw()
    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', resize)
    }
  }, [])
  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed', inset: 0, zIndex: 0,
        pointerEvents: 'none', opacity: 0.7,
      }}
    />
  )
}

// ── Spinner ──────────────────────────────────────────────────────────
function Spinner({ size = 20, color = '#fff' }) {
  return (
    <span style={{
      display: 'inline-block', width: size, height: size,
      border: `2px solid ${color}33`,
      borderTopColor: color,
      borderRadius: '50%',
      animation: 'ob-spin 0.8s linear infinite',
    }} />
  )
}

// ── Google Icon ──────────────────────────────────────────────────────
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  )
}

// ── Error message ────────────────────────────────────────────────────
function ErrorMsg({ message }) {
  if (!message) return null
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      background: 'rgba(239,68,68,0.12)',
      border: '1px solid rgba(239,68,68,0.3)',
      color: '#fca5a5',
      padding: '10px 14px',
      borderRadius: 10,
      fontSize: 13,
      fontWeight: 500,
      marginBottom: 16,
      animation: 'ob-fadein 0.3s ease',
    }}>
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ flexShrink: 0 }}>
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      {message}
    </div>
  )
}

// ── Input Field ──────────────────────────────────────────────────────
function FloatingInput({ type, placeholder, value, onChange, required, icon }) {
  const [focused, setFocused] = useState(false)
  return (
    <div style={{
      position: 'relative',
      marginBottom: 14,
    }}>
      {icon && (
        <span style={{
          position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
          color: focused ? 'rgba(167,139,250,0.9)' : 'rgba(255,255,255,0.3)',
          transition: 'color 0.2s', pointerEvents: 'none', display: 'flex',
        }}>
          {icon}
        </span>
      )}
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        required={required}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          width: '100%',
          padding: icon ? '13px 16px 13px 42px' : '13px 16px',
          borderRadius: 12,
          border: `1px solid ${focused ? 'rgba(167,139,250,0.6)' : 'rgba(255,255,255,0.1)'}`,
          background: focused ? 'rgba(167,139,250,0.08)' : 'rgba(255,255,255,0.05)',
          color: '#f1f5f9',
          fontSize: 15,
          fontFamily: 'inherit',
          outline: 'none',
          transition: 'all 0.2s ease',
          boxSizing: 'border-box',
          boxShadow: focused ? '0 0 0 3px rgba(139,92,246,0.15)' : 'none',
        }}
      />
    </div>
  )
}

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
  const [googleLoading, setGoogleLoading] = useState(false)

  useEffect(() => {
    if (isAuthenticated) {
      if (!isJustSignedIn) {
        navigate('/', { replace: true })
      } else {
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
      // Error displayed via store
    } finally {
      setLocalLoading(false)
    }
  }

  const handleGoogle = async () => {
    clearError()
    setGoogleLoading(true)
    try {
      await signInWithGoogle()
    } catch (err) {
      // Error handled in store
    } finally {
      setGoogleLoading(false)
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

  const isLoading = localLoading || googleLoading

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Space+Grotesk:wght@700;800&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }

        @keyframes ob-spin { to { transform: rotate(360deg); } }
        @keyframes ob-fadein { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes ob-float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          33% { transform: translateY(-8px) rotate(1deg); }
          66% { transform: translateY(4px) rotate(-1deg); }
        }
        @keyframes ob-pulse-ring {
          0% { transform: scale(1); opacity: 0.4; }
          100% { transform: scale(2.2); opacity: 0; }
        }
        @keyframes ob-card-in {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes ob-title-in {
          from { opacity: 0; transform: translateY(-12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes ob-orbit1 {
          from { transform: rotate(0deg) translateX(38px) rotate(0deg); }
          to   { transform: rotate(360deg) translateX(38px) rotate(-360deg); }
        }
        @keyframes ob-orbit2 {
          from { transform: rotate(120deg) translateX(28px) rotate(-120deg); }
          to   { transform: rotate(480deg) translateX(28px) rotate(-480deg); }
        }
        @keyframes ob-orbit3 {
          from { transform: rotate(240deg) translateX(20px) rotate(-240deg); }
          to   { transform: rotate(600deg) translateX(20px) rotate(-600deg); }
        }
        @keyframes ob-tab-slide {
          from { opacity: 0; transform: translateX(10px); }
          to   { opacity: 1; transform: translateX(0); }
        }

        .ob-btn-primary {
          width: 100%;
          padding: 13px 20px;
          border-radius: 12px;
          background: linear-gradient(135deg, #7c3aed 0%, #a855f7 50%, #6366f1 100%);
          color: #fff;
          border: none;
          font-size: 15px;
          font-weight: 700;
          font-family: inherit;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: all 0.2s ease;
          box-shadow: 0 4px 24px rgba(124,58,237,0.35);
          position: relative;
          overflow: hidden;
          letter-spacing: 0.2px;
        }
        .ob-btn-primary::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(255,255,255,0.15) 0%, transparent 60%);
          border-radius: inherit;
        }
        .ob-btn-primary:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 8px 32px rgba(124,58,237,0.5);
        }
        .ob-btn-primary:active:not(:disabled) { transform: scale(0.98); }
        .ob-btn-primary:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }

        .ob-btn-google {
          width: 100%;
          padding: 13px 20px;
          border-radius: 12px;
          background: rgba(255,255,255,0.07);
          color: #e2e8f0;
          border: 1px solid rgba(255,255,255,0.12);
          font-size: 15px;
          font-weight: 600;
          font-family: inherit;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          transition: all 0.2s ease;
          backdrop-filter: blur(8px);
        }
        .ob-btn-google:hover:not(:disabled) {
          background: rgba(255,255,255,0.12);
          border-color: rgba(255,255,255,0.22);
          transform: translateY(-1px);
        }
        .ob-btn-google:active:not(:disabled) { transform: scale(0.98); }
        .ob-btn-google:disabled { opacity: 0.5; cursor: not-allowed; }

        .ob-btn-dev {
          width: 100%;
          padding: 11px 20px;
          border-radius: 10px;
          background: transparent;
          color: rgba(167,139,250,0.8);
          border: 1px dashed rgba(139,92,246,0.4);
          font-size: 13px;
          font-weight: 600;
          font-family: inherit;
          cursor: pointer;
          transition: all 0.2s ease;
          margin-top: 10px;
        }
        .ob-btn-dev:hover:not(:disabled) {
          background: rgba(139,92,246,0.08);
          border-color: rgba(139,92,246,0.7);
          color: #a78bfa;
        }
        .ob-btn-dev:disabled { opacity: 0.4; cursor: not-allowed; }

        .ob-tab {
          flex: 1;
          padding: 9px 0;
          background: none;
          border: none;
          font-size: 14px;
          font-weight: 600;
          font-family: inherit;
          cursor: pointer;
          transition: color 0.2s;
          position: relative;
          z-index: 1;
          border-radius: 8px;
        }

        .ob-class-input {
          width: 100%;
          padding: 14px 18px;
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,0.1);
          background: rgba(255,255,255,0.05);
          color: #f1f5f9;
          font-size: 16px;
          font-family: inherit;
          font-weight: 700;
          letter-spacing: 3px;
          text-align: center;
          text-transform: uppercase;
          outline: none;
          transition: all 0.2s ease;
          margin-bottom: 14px;
        }
        .ob-class-input:focus {
          border-color: rgba(167,139,250,0.6);
          background: rgba(167,139,250,0.08);
          box-shadow: 0 0 0 3px rgba(139,92,246,0.15);
        }
        .ob-class-input::placeholder { letter-spacing: 1px; color: rgba(255,255,255,0.25); font-weight: 500; }

        .ob-skip-btn {
          background: none;
          border: none;
          color: rgba(255,255,255,0.35);
          font-size: 13px;
          font-family: inherit;
          cursor: pointer;
          padding: 8px;
          transition: color 0.2s;
          display: block;
          width: 100%;
          text-align: center;
          margin-top: 4px;
        }
        .ob-skip-btn:hover { color: rgba(255,255,255,0.65); }
      `}</style>

      <ParticleCanvas />

      {/* Full page background */}
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'radial-gradient(ellipse at 60% 0%, rgba(124,58,237,0.18) 0%, transparent 60%), radial-gradient(ellipse at 10% 80%, rgba(99,102,241,0.12) 0%, transparent 50%), #0a0a12',
        fontFamily: "'Inter', sans-serif",
        color: '#f1f5f9',
        padding: '24px 16px',
        position: 'relative',
        zIndex: 1,
      }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 32, animation: 'ob-title-in 0.6s ease both' }}>
          {/* Atom icon */}
          <div style={{
            display: 'flex', justifyContent: 'center', marginBottom: 20,
          }}>
            <div style={{
              position: 'relative', width: 72, height: 72,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {/* Pulse rings */}
              <div style={{
                position: 'absolute', inset: 0, borderRadius: '50%',
                border: '1px solid rgba(139,92,246,0.4)',
                animation: 'ob-pulse-ring 2s ease-out infinite',
              }} />
              <div style={{
                position: 'absolute', inset: 0, borderRadius: '50%',
                border: '1px solid rgba(139,92,246,0.3)',
                animation: 'ob-pulse-ring 2s ease-out infinite 0.7s',
              }} />
              {/* Core */}
              <div style={{
                width: 48, height: 48, borderRadius: '50%',
                background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 0 32px rgba(124,58,237,0.5)',
                animation: 'ob-float 4s ease-in-out infinite',
                position: 'relative', zIndex: 2,
              }}>
                {/* Orbiting dots */}
                <div style={{ position: 'absolute', width: '100%', height: '100%', animation: 'ob-orbit1 2.4s linear infinite' }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#a78bfa', position: 'absolute', top: -3, left: '50%', transform: 'translateX(-50%)', boxShadow: '0 0 8px #a78bfa' }} />
                </div>
                <div style={{ position: 'absolute', width: '100%', height: '100%', animation: 'ob-orbit2 3.2s linear infinite' }}>
                  <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#6ee7f7', position: 'absolute', top: -2, left: '50%', transform: 'translateX(-50%)', boxShadow: '0 0 6px #6ee7f7' }} />
                </div>
                <div style={{ position: 'absolute', width: '80%', height: '80%', animation: 'ob-orbit3 1.8s linear infinite' }}>
                  <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#f9a8d4', position: 'absolute', top: -2, left: '50%', transform: 'translateX(-50%)', boxShadow: '0 0 5px #f9a8d4' }} />
                </div>
                {/* Inner atom symbol */}
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style={{ position: 'relative', zIndex: 1 }}>
                  <circle cx="12" cy="12" r="3" fill="white" />
                  <ellipse cx="12" cy="12" rx="10" ry="4" stroke="rgba(255,255,255,0.5)" strokeWidth="1.2" fill="none" />
                  <ellipse cx="12" cy="12" rx="10" ry="4" stroke="rgba(255,255,255,0.5)" strokeWidth="1.2" fill="none" transform="rotate(60,12,12)" />
                  <ellipse cx="12" cy="12" rx="10" ry="4" stroke="rgba(255,255,255,0.5)" strokeWidth="1.2" fill="none" transform="rotate(120,12,12)" />
                </svg>
              </div>
            </div>
          </div>

          <h1 style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 36,
            fontWeight: 800,
            letterSpacing: '-1px',
            background: 'linear-gradient(135deg, #f8fafc 30%, #a78bfa 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            marginBottom: 8,
          }}>
            VISIORA
          </h1>
          <p style={{
            color: 'rgba(255,255,255,0.45)',
            fontSize: 14,
            fontWeight: 500,
            letterSpacing: '0.05em',
          }}>
            AI-guided 3D physics experiments
          </p>
        </div>

        {/* Card */}
        <div style={{
          width: '100%',
          maxWidth: 420,
          background: 'rgba(255,255,255,0.04)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 20,
          padding: '32px 28px',
          boxShadow: '0 24px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(139,92,246,0.12) inset',
          animation: 'ob-card-in 0.5s cubic-bezier(0.34,1.56,0.64,1) 0.1s both',
        }}>
          {step === 'auth' ? (
            <>
              {/* Tab switcher */}
              <div style={{
                display: 'flex',
                background: 'rgba(255,255,255,0.05)',
                borderRadius: 12,
                padding: 4,
                marginBottom: 24,
                border: '1px solid rgba(255,255,255,0.07)',
              }}>
                {['Sign In', 'Sign Up'].map((label, i) => {
                  const active = isSignUp === (i === 1)
                  return (
                    <button
                      key={label}
                      className="ob-tab"
                      onClick={() => { setIsSignUp(i === 1); clearError() }}
                      style={{
                        color: active ? '#f1f5f9' : 'rgba(255,255,255,0.35)',
                        background: active ? 'rgba(139,92,246,0.25)' : 'none',
                        border: active ? '1px solid rgba(139,92,246,0.4)' : '1px solid transparent',
                      }}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>

              <form onSubmit={handleAuth} style={{ animation: 'ob-tab-slide 0.2s ease both' }} key={isSignUp ? 'signup' : 'signin'}>
                <FloatingInput
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  icon={
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="2" y="4" width="20" height="16" rx="2" />
                      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                    </svg>
                  }
                />
                <FloatingInput
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  icon={
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="11" width="18" height="11" rx="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  }
                />

                <ErrorMsg message={authError} />

                <button type="submit" className="ob-btn-primary" disabled={isLoading} style={{ marginBottom: 14 }}>
                  {localLoading ? <Spinner /> : (isSignUp ? 'Create Account' : 'Sign In')}
                </button>
              </form>

              {/* Divider */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', fontWeight: 600, letterSpacing: '0.08em' }}>OR</span>
                <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
              </div>

              <button className="ob-btn-google" onClick={handleGoogle} disabled={isLoading}>
                {googleLoading ? <Spinner size={18} color="#a78bfa" /> : <GoogleIcon />}
                <span>Continue with Google</span>
              </button>

              {import.meta.env.VITE_ENVIRONMENT === 'development' && (
                <button
                  className="ob-btn-dev"
                  onClick={async () => {
                    clearError()
                    setLocalLoading(true)
                    try { await signInDev() } catch (e) {}
                    setLocalLoading(false)
                  }}
                  disabled={isLoading}
                >
                  ⚡ Bypass Auth (Dev Mode)
                </button>
              )}

              <p style={{
                textAlign: 'center',
                marginTop: 20,
                fontSize: 12,
                color: 'rgba(255,255,255,0.2)',
                lineHeight: 1.6,
              }}>
                By continuing, you agree to our{' '}
                <span style={{ color: 'rgba(167,139,250,0.6)', cursor: 'pointer' }}>Terms</span> &amp;{' '}
                <span style={{ color: 'rgba(167,139,250,0.6)', cursor: 'pointer' }}>Privacy Policy</span>
              </p>
            </>
          ) : (
            <>
              {/* Class Code Step */}
              <div style={{ textAlign: 'center', marginBottom: 24 }}>
                <div style={{
                  width: 52, height: 52, borderRadius: '50%',
                  background: 'linear-gradient(135deg, rgba(139,92,246,0.3), rgba(99,102,241,0.2))',
                  border: '1px solid rgba(139,92,246,0.4)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 16px',
                  fontSize: 24,
                }}>
                  🎓
                </div>
                <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8, color: '#f1f5f9' }}>
                  Have a class code?
                </h2>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, lineHeight: 1.6 }}>
                  Enter it to link your progress with your class, or skip and do it later.
                </p>
              </div>

              <form onSubmit={handleClassCodeSubmit}>
                <input
                  type="text"
                  placeholder="e.g. PHY101"
                  value={classCode}
                  onChange={e => setClassCode(e.target.value.toUpperCase())}
                  className="ob-class-input"
                />
                <ErrorMsg message={progressError} />
                <button type="submit" className="ob-btn-primary" disabled={isProgressLoading}>
                  {isProgressLoading ? <Spinner /> : 'Join Class →'}
                </button>
              </form>
              <button className="ob-skip-btn" onClick={handleSkip}>
                Skip for now
              </button>
            </>
          )}
        </div>

        {/* Footer */}
        <p style={{
          marginTop: 24,
          fontSize: 12,
          color: 'rgba(255,255,255,0.15)',
          animation: 'ob-title-in 0.6s ease 0.4s both',
        }}>
          Visiora Physics © 2026
        </p>
      </div>
    </>
  )
}
