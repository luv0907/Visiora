import { useEffect, useRef } from 'react'

/**
 * Sizes a canvas to its box (with devicePixelRatio) and calls draw(ctx, w, h)
 * whenever deps change or the box resizes.
 */
export function useCanvas(draw, deps) {
  const ref = useRef(null)
  const sizeRef = useRef({ w: 0, h: 0 })
  const drawRef = useRef(draw)
  drawRef.current = draw

  const paint = () => {
    const canvas = ref.current
    if (!canvas || !sizeRef.current.w) return
    const dpr = window.devicePixelRatio || 1
    const ctx = canvas.getContext('2d')
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    drawRef.current(ctx, sizeRef.current.w, sizeRef.current.h)
  }

  useEffect(() => {
    const canvas = ref.current
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      const dpr = window.devicePixelRatio || 1
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      sizeRef.current = { w: width, h: height }
      paint()
    })
    ro.observe(canvas)
    return () => ro.disconnect()
  }, [])

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(paint, deps)
  return { ref, sizeRef }
}
