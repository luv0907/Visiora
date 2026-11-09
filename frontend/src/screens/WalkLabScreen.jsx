import React, { Suspense, lazy } from 'react'
import { useNavigate } from 'react-router-dom'

// The first-person version of the lab: walk with W A S D. Not linked from anywhere for now.
const PhysicsLab = lazy(() => import('../physicsLab/PhysicsLab'))

export default function WalkLabScreen() {
  const navigate = useNavigate()
  return (
    <Suspense fallback={<div style={{ position: 'fixed', inset: 0, background: '#A8D8DE' }} />}>
      <PhysicsLab onExit={() => navigate('/physics-lab')} />
    </Suspense>
  )
}
