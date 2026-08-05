/**
 * VISIORA — PhysicsCanvas
 *
 * Shared canvas wrapper for all 2D PhET-style scenes.
 * Responsibilities:
 *  - Creates a <canvas> that fills its container via ResizeObserver
 *  - Runs a requestAnimationFrame loop, gated by isPlaying
 *  - Calls scene.tick(dt, vars, state) → updates state in ref
 *  - Calls scene.draw(ctx, state, vars, w, h) → renders
 *  - Manages drag: mousedown/touchstart hit-test, then scene.onDrag(...)
 */
import React, { useRef, useEffect, useCallback } from 'react'
import { usePhysicsStore } from '../../store/usePhysicsStore'

export default function PhysicsCanvas({ scene }) {
  const canvasRef = useRef(null)
  const stateRef  = useRef(null)      // mutable physics state (NOT react state)
  const rafRef    = useRef(null)
  const lastTRef  = useRef(null)
  const sizeRef   = useRef({ w: 800, h: 600 })
  const dragRef   = useRef(null)      // { target, startX, startY }

  // Read physics store once per frame (stable refs)
  const { isPlaying, simSpeed, simKey, variables, activeScene } = usePhysicsStore()
  const varsRef = useRef(variables)
  useEffect(() => { varsRef.current = variables }, [variables])

  const isPlayingRef = useRef(isPlaying)
  useEffect(() => { isPlayingRef.current = isPlaying }, [isPlaying])

  const simSpeedRef = useRef(simSpeed)
  useEffect(() => { simSpeedRef.current = simSpeed }, [simSpeed])

  // ── Resize ───────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect
        const dpr = window.devicePixelRatio || 1
        canvas.width  = width  * dpr
        canvas.height = height * dpr
        canvas.style.width  = `${width}px`
        canvas.style.height = `${height}px`
        sizeRef.current = { w: width * dpr, h: height * dpr }
        const ctx = canvas.getContext('2d')
        ctx.scale(dpr, dpr)
        // Re-draw immediately at new size
        const vars = varsRef.current[activeScene] ?? {}
        if (stateRef.current) {
          scene.draw(ctx, stateRef.current, vars, width, height)
        }
      }
    })
    ro.observe(canvas.parentElement || canvas)
    return () => ro.disconnect()
  }, [scene, activeScene])

  // ── Reset state on simKey change ─────────────────────────────────
  useEffect(() => {
    const vars = varsRef.current[activeScene] ?? {}
    stateRef.current = scene.initState(vars)
    lastTRef.current = null
    // force redraw
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    const w = canvas.width / dpr
    const h = canvas.height / dpr
    const ctx = canvas.getContext('2d')
    scene.draw(ctx, stateRef.current, vars, w, h)
  }, [simKey, scene, activeScene])

  // ── RAF loop ─────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const loop = (timestamp) => {
      const dpr  = window.devicePixelRatio || 1
      const w    = canvas.width  / dpr
      const h    = canvas.height / dpr
      const vars = (varsRef.current[activeScene] ?? {})

      if (isPlayingRef.current) {
        const dt = lastTRef.current
          ? Math.min((timestamp - lastTRef.current) / 1000, 0.05) * simSpeedRef.current
          : 0
        lastTRef.current = timestamp

        if (!stateRef.current) {
          stateRef.current = scene.initState(vars)
        }
        scene.tick(stateRef.current, dt, vars)
      } else {
        lastTRef.current = null
        // Still draw (handles slider changes while paused)
        if (!stateRef.current) {
          stateRef.current = scene.initState(vars)
        }
      }

      const ctx = canvas.getContext('2d')
      ctx.save()
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.restore()
      scene.draw(ctx, stateRef.current, vars, w, h)

      rafRef.current = requestAnimationFrame(loop)
    }

    rafRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafRef.current)
  }, [scene, activeScene])

  // ── Drag support ─────────────────────────────────────────────────
  const getCanvasXY = useCallback((e, canvas) => {
    const rect = canvas.getBoundingClientRect()
    const dpr  = window.devicePixelRatio || 1
    const src  = e.touches ? e.touches[0] : e
    return {
      x: (src.clientX - rect.left),
      y: (src.clientY - rect.top),
    }
  }, [])

  const handlePointerDown = useCallback((e) => {
    const canvas = canvasRef.current
    if (!canvas || !scene.hitTest) return
    const { x, y } = getCanvasXY(e, canvas)
    const dpr = window.devicePixelRatio || 1
    const w   = canvas.width / dpr
    const h   = canvas.height / dpr
    const vars = varsRef.current[activeScene] ?? {}
    const target = scene.hitTest(stateRef.current, x, y, vars, w, h)
    if (target) {
      dragRef.current = { target, startX: x, startY: y }
      e.preventDefault()
    }
  }, [scene, activeScene, getCanvasXY])

  const handlePointerMove = useCallback((e) => {
    if (!dragRef.current || !scene.onDrag) return
    const canvas = canvasRef.current
    if (!canvas) return
    const { x, y } = getCanvasXY(e, canvas)
    const dpr = window.devicePixelRatio || 1
    const w   = canvas.width / dpr
    const h   = canvas.height / dpr
    const vars = varsRef.current[activeScene] ?? {}
    scene.onDrag(stateRef.current, dragRef.current.target, x, y, vars, w, h)
    e.preventDefault()
  }, [scene, activeScene, getCanvasXY])

  const handlePointerUp = useCallback(() => {
    dragRef.current = null
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{ display: 'block', width: '100%', height: '100%', cursor: 'default' }}
      onMouseDown={handlePointerDown}
      onMouseMove={handlePointerMove}
      onMouseUp={handlePointerUp}
      onMouseLeave={handlePointerUp}
      onTouchStart={handlePointerDown}
      onTouchMove={handlePointerMove}
      onTouchEnd={handlePointerUp}
    />
  )
}
