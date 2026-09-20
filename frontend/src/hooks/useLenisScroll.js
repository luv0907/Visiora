import { useEffect } from 'react'
import Lenis from 'lenis'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

export function useLenisScroll() {
  useEffect(() => {
    if (typeof window === 'undefined') return

    // Ensure native smooth scrolling is enabled without touch/wheel hijacking
    document.documentElement.style.scrollBehavior = 'smooth'
    
    // Provide a safe scroll helper on window for any programmatic scroll calls
    window.__scrollTo = (target, options = {}) => {
      if (typeof target === 'number') {
        window.scrollTo({ top: target, behavior: options.behavior || 'smooth' })
      } else if (typeof target === 'string') {
        const el = document.querySelector(target)
        if (el) el.scrollIntoView({ behavior: options.behavior || 'smooth' })
      }
    }

    return () => {
      delete window.__scrollTo
    }
  }, [])
}
