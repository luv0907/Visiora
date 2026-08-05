import React from 'react'
import { createBrowserRouter, RouterProvider, Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '../store/useAuthStore'
import { useMediaQuery } from '../hooks/useMediaQuery'
import BottomNav from '../components/nav/BottomNav'
import TopNav from '../components/nav/TopNav'

import OnboardingScreen from '../screens/OnboardingScreen'
import HomeScreen from '../screens/HomeScreen'
import SimulatorScreen from '../screens/SimulatorScreen'
import ProgressScreen from '../screens/ProgressScreen'
import QuizScreen from '../screens/QuizScreen'

function ProtectedRoute() {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated)
  const isDesktop = useMediaQuery('(min-width: 1024px)')

  if (!isAuthenticated) {
    return <Navigate to="/onboarding" replace />
  }
  return (
    <>
      {isDesktop && <TopNav />}
      <Outlet />
      {!isDesktop && <BottomNav />}
    </>
  )
}

const router = createBrowserRouter([
  { path: '/onboarding', element: <OnboardingScreen /> },
  {
    element: <ProtectedRoute />,
    children: [
      { path: '/',                  element: <HomeScreen /> },
      { path: '/sim',               element: <SimulatorScreen /> },
      { path: '/progress',          element: <ProgressScreen /> },
      { path: '/quiz/:conceptId',   element: <QuizScreen /> },
    ]
  },
  { path: '*', element: <Navigate to="/" replace /> }
])

export function AppRouter() {
  return <RouterProvider router={router} />
}
