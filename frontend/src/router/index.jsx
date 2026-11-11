import React, { Suspense, lazy } from 'react'
import { createBrowserRouter, RouterProvider, Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/useAuthStore'
import { useMediaQuery } from '../hooks/useMediaQuery'
import BottomNav from '../components/nav/BottomNav'
import TopNav from '../components/nav/TopNav'

import StudioHome from '../studio/StudioHome'

// Only the first screens a visitor sees are in the main bundle; every other screen (and the
// three.js, maths and admin code it needs) downloads the first time it is opened.
const HomeScreen = lazy(() => import('../screens/HomeScreen'))
const SimulatorScreen = lazy(() => import('../screens/SimulatorScreen'))
const Simulator2DScreen = lazy(() => import('../screens/Simulator2DScreen'))
const ProgressScreen = lazy(() => import('../screens/ProgressScreen'))
const QuizScreen = lazy(() => import('../screens/QuizScreen'))
const AdminScreen = lazy(() => import('../screens/AdminScreen'))
const VirtualLabScreen = lazy(() => import('../screens/VirtualLabScreen'))
const ProfileScreen = lazy(() => import('../screens/ProfileScreen'))
const DynamicLabScreen = lazy(() => import('../screens/DynamicLabScreen'))
const AITutorScreen = lazy(() => import('../screens/AITutorScreen'))
const GraphBoardScreen = lazy(() => import('../screens/GraphBoardScreen'))
const PhysicsLabScreen = lazy(() => import('../screens/PhysicsLabScreen'))
const WalkLabScreen = lazy(() => import('../screens/WalkLabScreen'))
const PreviewScreen = lazy(() => import('../screens/PreviewScreen'))
const SignIn = lazy(() => import('../studio/SignIn'))
const PendulumExperiment = lazy(() => import('../studio/PendulumExperiment'))
const MotionExperiment = lazy(() => import('../studio/MotionExperiment'))
const CircuitsExperiment = lazy(() => import('../studio/CircuitsExperiment'))
const LightExperiment = lazy(() => import('../studio/LightExperiment'))
const PlanetsExperiment = lazy(() => import('../studio/PlanetsExperiment'))
const ProjectileExperiment = lazy(() => import('../studio/ProjectileExperiment'))
const BuoyancyExperiment = lazy(() => import('../studio/BuoyancyExperiment'))
const CollisionsExperiment = lazy(() => import('../studio/CollisionsExperiment'))
const ForceExperiment = lazy(() => import('../studio/ForceExperiment'))

/** Shown for the moment a screen's code is downloading: a quiet bar, not a flash of text. */
function Loading() {
  return <div className="route-loading" role="progressbar" aria-label="Loading" />
}

function ProtectedRoute() {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated)
  const isDesktop = useMediaQuery('(min-width: 1024px)')
  const location = useLocation()
  // The redesigned screens bring their own top bar.
  const isStudio = location.pathname === '/' || location.pathname.startsWith('/experiments')
  const isSim = isStudio || location.pathname.startsWith('/sim') || location.pathname.startsWith('/virtual-lab') || location.pathname.startsWith('/lab') || location.pathname.startsWith('/board') || location.pathname.startsWith('/motion') || location.pathname.startsWith('/gravity') || location.pathname.startsWith('/light') || location.pathname.startsWith('/electricity') || location.pathname.startsWith('/force') || location.pathname.startsWith('/physics-lab')

  // Visitors start as guests (useAuthStore.startGuest), so this only catches the moment before that
  if (!isAuthenticated) {
    return <Navigate to="/onboarding" replace state={{ from: location.pathname + location.search }} />
  }

  if (isSim) {
    return <Suspense fallback={<Loading />}><Outlet /></Suspense>
  }

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: 'var(--color-bg)' }}>
      {isDesktop ? <TopNav /> : null}
      <div style={{ flex: 1 }}>
        <Suspense fallback={<Loading />}><Outlet /></Suspense>
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
        { path: '/', element: <Suspense fallback={<Loading />}><AdminScreen /></Suspense> },
        { path: '/admin', element: <Suspense fallback={<Loading />}><AdminScreen /></Suspense> },
        { path: '/onboarding', element: <Suspense fallback={<Loading />}><AdminScreen /></Suspense> },
        { path: '*', element: <Navigate to="/" replace /> }
      ]
    : [
        // only for saving progress: nobody has to sign in to use Visiora
        { path: '/onboarding', element: <Suspense fallback={<Loading />}><SignIn /></Suspense> },
        { path: '/preview', element: <Suspense fallback={<Loading />}><PreviewScreen /></Suspense> },
        {
          element: <ProtectedRoute />,
          children: [
            { path: '/',                  element: <StudioHome /> },
            { path: '/classic',           element: <HomeScreen /> },
            { path: '/experiments/pendulum', element: <PendulumExperiment /> },
            { path: '/experiments/motion', element: <MotionExperiment /> },
            { path: '/experiments/circuits', element: <CircuitsExperiment /> },
            { path: '/experiments/light', element: <LightExperiment /> },
            { path: '/experiments/planets', element: <PlanetsExperiment /> },
            { path: '/experiments/projectile', element: <ProjectileExperiment /> },
            { path: '/experiments/buoyancy', element: <BuoyancyExperiment /> },
            { path: '/experiments/collisions', element: <CollisionsExperiment /> },
            { path: '/experiments/force', element: <ForceExperiment /> },
            { path: '/sim',               element: <SimulatorScreen /> },
            { path: '/sim-2d',            element: <Simulator2DScreen /> },
            { path: '/sim-2d/:labId',     element: <DynamicLabScreen /> },
            { path: '/lab',               element: <DynamicLabScreen /> },
            { path: '/lab/:labId',        element: <DynamicLabScreen /> },
            { path: '/board',             element: <GraphBoardScreen /> },
            { path: '/physics-lab',       element: <PhysicsLabScreen /> },
            { path: '/physics-lab/walk',  element: <WalkLabScreen /> },
            { path: '/motion',            element: <Navigate to="/experiments/motion" replace /> },
            { path: '/gravity',           element: <Navigate to="/experiments/planets" replace /> },
            { path: '/light',             element: <Navigate to="/experiments/light" replace /> },
            { path: '/electricity',       element: <Navigate to="/experiments/circuits" replace /> },
            { path: '/force',             element: <Navigate to="/experiments/force" replace /> },
            { path: '/ai-tutor',          element: <AITutorScreen /> },
            { path: '/progress',          element: <ProgressScreen /> },
            { path: '/quiz/:conceptId',   element: <QuizScreen /> },
            { path: '/virtual-lab',       element: <VirtualLabScreen /> },
            { path: '/profile',           element: <ProfileScreen /> },
          ]
        },
        { path: '/admin', element: <Suspense fallback={<Loading />}><AdminScreen /></Suspense> },
        { path: '*', element: <Navigate to="/" replace /> }
      ]
)

export function AppRouter() {
  return <RouterProvider router={router} />
}
