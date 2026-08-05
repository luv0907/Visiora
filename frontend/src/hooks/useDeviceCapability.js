import { useState, useEffect } from 'react'

export function useDeviceCapability() {
  const [capabilities, setCapabilities] = useState({
    isMobile: false,
    hasTouch: false,
    isLowEnd: false,
    hardwareConcurrency: 4
  })

  useEffect(() => {
    // Check mobile by user agent or screen width
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768
    
    // Check touch support
    const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0
    
    // Check hardware tier (very basic heuristic)
    const hardwareConcurrency = navigator.hardwareConcurrency || 4
    const isLowEnd = hardwareConcurrency <= 4 || (navigator.deviceMemory && navigator.deviceMemory <= 4)

    setCapabilities({
      isMobile,
      hasTouch,
      isLowEnd,
      hardwareConcurrency
    })
  }, [])

  return capabilities
}
