/**
 * VISIORA Studio — "Save your progress". Nobody needs an account to use Visiora; this page is
 * only for keeping stars and streaks across devices. Google first, email if they prefer, and a
 * plain way out. Afterwards the student goes straight back to the page that sent them here.
 */
import React, { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { isGuestUser, useAuthStore } from '../store/useAuthStore'
import { useProgressStore } from '../store/useProgressStore'
import { Brand, Icon } from './Shell'
import './studio.css'

function GoogleMark() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#4285F4" d="M45 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h11.8c-.5 2.7-2.1 5-4.4 6.6v5.5h7.1C42.7 36.7 45 31.1 45 24.5z" />
      <path fill="#34A853" d="M24 46c5.9 0 10.9-2 14.5-5.4l-7.1-5.5c-2 1.3-4.5 2.1-7.4 2.1-5.7 0-10.5-3.8-12.2-9H4.5v5.7C8.1 41.1 15.5 46 24 46z" />
      <path fill="#FBBC05" d="M11.8 28.2c-.4-1.3-.7-2.7-.7-4.2s.3-2.9.7-4.2v-5.7H4.5C3 17.1 2 20.4 2 24s1 6.9 2.5 9.9l7.3-5.7z" />
      <path fill="#EA4335" d="M24 10.8c3.2 0 6.1 1.1 8.4 3.3l6.3-6.3C34.9 4.2 29.9 2 24 2 15.5 2 8.1 6.9 4.5 14.1l7.3 5.7c1.7-5.2 6.5-9 12.2-9z" />
    </svg>
  )
}

export default function SignIn() {
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from && location.state.from !== '/onboarding' ? location.state.from : '/'
  const { user, error, signInWithGoogle, signIn, signUp, clearError } = useAuthStore()
  const streak = useProgressStore(s => s.profile?.streak ?? 1)
  const [email, setEmail] = useState(false)
  const [address, setAddress] = useState('')
  const [password, setPassword] = useState('')
  const [isNew, setIsNew] = useState(false)
  const [busy, setBusy] = useState(false)

  // signed in for real: back to what they were doing
  useEffect(() => { if (user && !isGuestUser(user)) navigate(from, { replace: true }) }, [user, from, navigate])
  useEffect(() => () => clearError(), [clearError])

  const run = async fn => { setBusy(true); try { await fn() } catch { /* the store shows the error */ } finally { setBusy(false) } }
  const submit = e => {
    e.preventDefault()
    if (!address.trim() || password.length < 6) return
    run(() => (isNew ? signUp(address.trim(), password) : signIn(address.trim(), password)))
  }

  return (
    <div className="studio st-signin">
      <header className="st-signin-top"><Brand onClick={() => navigate('/')} /></header>
      <main className="st-signin-card">
        <div className="st-signin-head">
          <span className="st-signin-badge" aria-hidden="true"><Icon name="save" /></span>
          <div>
            <h1>Save your progress</h1>
            <p>Keep your stars and streak on any device.</p>
          </div>
        </div>
        <p className="st-signin-keep st-num">{streak}-day streak · saved in this browser until you sign in</p>

        {error && <p className="st-callout is-danger" role="alert">{error}</p>}

        <button type="button" className="st-btn st-btn-secondary st-signin-google" disabled={busy} onClick={() => run(signInWithGoogle)}>
          <GoogleMark />Continue with Google
        </button>

        {email ? (
          <form className="st-signin-form" onSubmit={submit}>
            <label className="st-field-block">Email
              <input type="email" autoComplete="email" value={address} onChange={e => setAddress(e.target.value)} required />
            </label>
            <label className="st-field-block">Password
              <input type="password" autoComplete={isNew ? 'new-password' : 'current-password'} minLength={6} value={password} onChange={e => setPassword(e.target.value)} required />
            </label>
            <button type="submit" className="st-btn st-btn-primary" disabled={busy}>{isNew ? 'Create account' : 'Sign in'}</button>
            <button type="button" className="st-linkbtn" onClick={() => setIsNew(n => !n)}>{isNew ? 'I already have an account' : 'New here? Create an account'}</button>
          </form>
        ) : (
          <button type="button" className="st-linkbtn st-signin-email" onClick={() => setEmail(true)}>Use email instead</button>
        )}

        <button type="button" className="st-btn st-signin-later" onClick={() => navigate(from, { replace: true })}>Not now</button>
      </main>
    </div>
  )
}
