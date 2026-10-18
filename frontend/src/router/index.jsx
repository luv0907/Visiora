import React from 'react'
import { createBrowserRouter, RouterProvider, Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/useAuthStore'
import { useMediaQuery } from '../hooks/useMediaQuery'
import BottomNav from '../components/nav/BottomNav'
import TopNav from '../components/nav/TopNav'
import { useAdminStore } from '../store/useAdminStore'

import OnboardingScreen from '../screens/OnboardingScreen'
import HomeScreen from '../screens/HomeScreen'
import SimulatorScreen from '../screens/SimulatorScreen'
import Simulator2DScreen from '../screens/Simulator2DScreen'
import ProgressScreen from '../screens/ProgressScreen'
import QuizScreen from '../screens/QuizScreen'
import AdminScreen from '../screens/AdminScreen'
import VirtualLabScreen from '../screens/VirtualLabScreen'
import ProfileScreen from '../screens/ProfileScreen'
import DynamicLabScreen from '../screens/DynamicLabScreen'
import AITutorScreen from '../screens/AITutorScreen'
import GraphBoardScreen from '../screens/GraphBoardScreen'
import MotionLabScreen from '../screens/MotionLabScreen'
import GravityLabScreen from '../screens/GravityLabScreen'
import LightLabScreen from '../screens/LightLabScreen'
import ElectricityLabScreen from '../screens/ElectricityLabScreen'
import ForceLabScreen from '../screens/ForceLabScreen'

function ProtectedRoute() {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated)
  const isDesktop = useMediaQuery('(min-width: 1024px)')
  const location = useLocation()
  const isSim = location.pathname.startsWith('/sim') || location.pathname.startsWith('/virtual-lab') || location.pathname.startsWith('/lab') || location.pathname.startsWith('/board') || location.pathname.startsWith('/motion') || location.pathname.startsWith('/gravity') || location.pathname.startsWith('/light') || location.pathname.startsWith('/electricity') || location.pathname.startsWith('/force')

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

const isDedicatedAdmin = 
  import.meta.env.VITE_APP_TARGET === 'admin' ||
  (typeof window !== 'undefined' && (
    window.location.hostname.includes('admin') ||
    window.location.search.includes('portal=admin') ||
    window.location.search.includes('admin=true')
  ))

const router = createBrowserRouter(
  isDedicatedAdmin
    ? [
        { path: '/', element: <AdminScreen /> },
        { path: '/admin', element: <AdminScreen /> },
        { path: '/onboarding', element: <AdminScreen /> },
        { path: '*', element: <Navigate to="/" replace /> }
      ]
    : [
        { path: '/onboarding', element: <OnboardingScreen /> },
        {
          element: <ProtectedRoute />,
          children: [
            { path: '/',                  element: <HomeScreen /> },
            { path: '/sim',               element: <SimulatorScreen /> },
            { path: '/sim-2d',            element: <Simulator2DScreen /> },
            { path: '/sim-2d/:labId',     element: <DynamicLabScreen /> },
            { path: '/lab',               element: <DynamicLabScreen /> },
            { path: '/lab/:labId',        element: <DynamicLabScreen /> },
            { path: '/board',             element: <GraphBoardScreen /> },
            { path: '/motion',            element: <MotionLabScreen /> },
            { path: '/gravity',           element: <GravityLabScreen /> },
            { path: '/light',             element: <LightLabScreen /> },
            { path: '/electricity',       element: <ElectricityLabScreen /> },
            { path: '/force',             element: <ForceLabScreen /> },
            { path: '/ai-tutor',          element: <AITutorScreen /> },
            { path: '/progress',          element: <ProgressScreen /> },
            { path: '/quiz/:conceptId',   element: <QuizScreen /> },
            { path: '/virtual-lab',       element: <VirtualLabScreen /> },
            { path: '/profile',           element: <ProfileScreen /> },
          ]
        },
        { path: '/admin', element: <AdminScreen /> },
        { path: '*', element: <Navigate to="/" replace /> }
      ]
)

export function AppRouter() {
  return <RouterProvider router={router} />
}
