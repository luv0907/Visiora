import React, { Suspense, lazy } from 'react'

// The 3D lab is large; load it only when someone opens the preview.
const TowerPreview = lazy(() => import('../physicsLab/TowerPreview'))

export default function PreviewScreen() {
  return (
    <Suspense fallback={<div style={{ position: 'fixed', inset: 0, background: '#A8D8DE' }} />}>
      <TowerPreview />
    </Suspense>
  )
}
