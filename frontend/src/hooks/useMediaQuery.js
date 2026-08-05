/**
 * VISIORA — useMediaQuery
 * Reactive wrapper around window.matchMedia.
 * Re-renders the component whenever the query result changes
 * (e.g., on window resize or orientation change).
 *
 * Usage:
 *   const isMobile = useMediaQuery('(max-width: 1023px)')
 *   const prefersDark = useMediaQuery('(prefers-color-scheme: dark)')
 */
import { useState, useEffect } from 'react'

export function useMediaQuery(query) {
  const getMatch = () =>
    typeof window !== 'undefined'
      ? window.matchMedia(query).matches
      : false

  const [matches, setMatches] = useState(getMatch)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const mql = window.matchMedia(query)
    setMatches(mql.matches)

    const handler = (e) => setMatches(e.matches)

    // Use addEventListener if available (modern), fall back to addListener
    if (mql.addEventListener) {
      mql.addEventListener('change', handler)
      return () => mql.removeEventListener('change', handler)
    } else {
      // Safari < 14 fallback
      mql.addListener(handler)
      return () => mql.removeListener(handler)
    }
  }, [query])

  return matches
}
