import React, { useEffect } from 'react'
import { BrowserRouter } from 'react-router-dom'
import { AppRouter } from './router'
import AdminScreen from './screens/AdminScreen'
import { ErrorBoundary } from './components/ui/ErrorBoundary'
import ToastContainer from './components/ui/Toast'
import { useAuthStore } from './store/useAuthStore'
import { useProgressStore } from './store/useProgressStore'
import { useLenisScroll } from './hooks/useLenisScroll'

export default function App() {
  useLenisScroll()

  // 1. Direct Admin Portal Enforcement (Bypasses student router completely)
  const isDirectAdmin = typeof window !== 'undefined' && (
    window.location.hostname.includes('admin') ||
    window.location.pathname.startsWith('/admin') ||
    window.location.search.includes('portal=admin') ||
    window.location.search.includes('admin=true')
  )

  if (isDirectAdmin) {
    return (
      <ErrorBoundary section="admin-portal">
        <BrowserRouter>
          <AdminScreen />
        </BrowserRouter>
        <ToastContainer />
      </ErrorBoundary>
    )
  }

  return <StudentApp />
}

function StudentApp() {
  const init = useAuthStore(state => state.init)
  const isLoading = useAuthStore(state => state.isLoading)
  const isAuthenticated = useAuthStore(state => state.isAuthenticated)
  const fetchProfile = useProgressStore(state => state.fetchProfile)

  useEffect(() => {
    const unsubscribe = init()
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe()
    }
  }, [init])

  useEffect(() => {
    if (isAuthenticated) {
      fetchProfile()
    }
  }, [isAuthenticated, fetchProfile])

  if (isLoading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--color-bg)', color: 'var(--color-primary)' }}>
        <p style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-lg)', fontWeight: 'var(--weight-bold)' }}>VISIORA</p>
      </div>
    )
  }

  return (
    <ErrorBoundary section="app-root">
      <AppRouter />
      <ToastContainer />
    </ErrorBoundary>
  )
}
