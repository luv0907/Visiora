/**
 * VISIORA Studio — Light (Class 10): refraction done two ways.
 * Explore (first): guided ideas, predict, try, explain (LightIdeas.jsx), then a free ray box in
 * a darkened room (LightBench.jsx). Practical: the pin method through a glass slab and a prism,
 * as in the school lab (LightPractical.jsx). Physics: engine/raybench.js.
 */
import React, { useEffect, useState } from 'react'
import { rememberExperiment } from './catalog'
import LightBench from './LightBench'
import LightPractical from './LightPractical'

// Explore first: play and predict before the formal practical
export const TABS = [['explore', 'Explore'], ['practical', 'Practical']]

export default function LightExperiment() {
  const [tab, setTab] = useState('explore')
  useEffect(() => { rememberExperiment('light') }, [])
  // both stay mounted, so a practical half done is still there after a look at the bench
  return (
    <>
      <div hidden={tab !== 'practical'}><LightPractical tabs={TABS} onTab={setTab} /></div>
      <div hidden={tab !== 'explore'}><LightBench tabs={TABS} onTab={setTab} /></div>
    </>
  )
}
