/**
 * VISIORA Studio — Light (Class 10): refraction done two ways.
 * Practical: the pin method through a glass slab and a prism, as in the school lab
 * (LightPractical.jsx). Explore: a ray box in a darkened room with blocks, a prism, lenses,
 * water and a mirror (LightBench.jsx). Physics: engine/raybench.js.
 */
import React, { useEffect, useState } from 'react'
import { rememberExperiment } from './catalog'
import LightBench from './LightBench'
import LightPractical from './LightPractical'

export const TABS = [['practical', 'Practical'], ['explore', 'Explore']]

export default function LightExperiment() {
  const [tab, setTab] = useState('practical')
  useEffect(() => { rememberExperiment('light') }, [])
  // both stay mounted, so a practical half done is still there after a look at the bench
  return (
    <>
      <div hidden={tab !== 'practical'}><LightPractical tabs={TABS} onTab={setTab} /></div>
      <div hidden={tab !== 'explore'}><LightBench tabs={TABS} onTab={setTab} /></div>
    </>
  )
}
