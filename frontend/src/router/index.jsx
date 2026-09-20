import React from 'react'
import { createBrowserRouter, RouterProvider, Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/useAuthStore'
import { useMediaQuery } from '../hooks/useMediaQuery'
import BottomNav from '../components/nav/BottomNav'
import TopNav from '../components/nav/TopNav'

import OnboardingScreen from '../screens/OnboardingScreen'
import HomeScreen from '../screens/HomeScreen'
import SimulatorScreen from '../screens/SimulatorScreen'
import Simulator2DScreen from '../screens/Simulator2DScreen'
import ProgressScreen from '../screens/ProgressScreen'
import QuizScreen from '../screens/QuizScreen'
import AdminScreen from '../screens/AdminScreen'
import VirtualLabScreen from '../screens/VirtualLabScreen'
import ProfileScreen from '../screens/ProfileScreen'

function ProtectedRoute() {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated)
  const isDesktop = useMediaQuery('(min-width: 1024px)')
  const location = useLocation()
  const isSim = location.pathname.startsWith('/sim') || location.pathname.startsWith('/virtual-lab')

  if (!isAuthenticated) {
    return <Navigate to="/onboarding" replace />
  }

  if (isSim) {
    return <Outlet />
  }

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: 'var(--color-bg)' }}>
      {isDesktop ? <TopNav /> : null}
      <div style={{ flex: 1 }}>
        <Outlet />
      </div>
      {!isDesktop ? <BottomNav /> : null}
    </div>
  )
}

const router = createBrowserRouter([
  { path: '/onboarding', element: <OnboardingScreen /> },
  { path: '/admin', element: <AdminScreen /> },
  {
    element: <ProtectedRoute />,
    children: [
      { path: '/',                  element: <HomeScreen /> },
      { path: '/sim',               element: <SimulatorScreen /> },
      { path: '/sim-2d',            element: <Simulator2DScreen /> },
      { path: '/sim-2d/:labId',     element: <Simulator2DScreen /> },
      { path: '/progress',          element: <ProgressScreen /> },
      { path: '/quiz/:conceptId',   element: <QuizScreen /> },
      { path: '/virtual-lab',       element: <VirtualLabScreen /> },
      { path: '/profile',           element: <ProfileScreen /> },
    ]
  },
  { path: '*', element: <Navigate to="/" replace /> }
])

export function AppRouter() {
  return <RouterProvider router={router} />
}
