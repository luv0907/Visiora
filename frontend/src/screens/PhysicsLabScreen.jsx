import React, { Suspense, lazy } from 'react'
import { useNavigate } from 'react-router-dom'

// The 3D lab is large; load it only when a student opens it.
const PhysicsLab = lazy(() => import('../physicsLab/PhysicsLab'))

export default function PhysicsLabScreen() {
  const navigate = useNavigate()
  return (
    <Suspense fallback={<div style={{ position: 'fixed', inset: 0, background: '#A8D8DE' }} />}>
      <PhysicsLab onExit={() => navigate('/')} />
    </Suspense>
  )
}
