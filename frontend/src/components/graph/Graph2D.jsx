/**
 * VISIORA — Graph2D
 * Canvas-based 2D graph renderer. Updates every frame via requestAnimationFrame.
 * Driven exclusively by Formula Engine state — never from Rapier.
 */
import React, { useRef, useEffect, useCallback } from 'react'
import { usePhysicsStore } from '../../store/usePhysicsStore'
import { useUIStore } from '../../store/useUIStore'
import { getGraphDefinitions } from '../../engine/formulaEngine'

// Palette
const COLORS = {
  primary:   '#F896B8',
  secondary: '#A48FD8',
  tertiary:  '#7CC8AB',
  peach:     '#FF9F5F',
  grid:      'rgba(46,42,44,0.06)',
  axis:      'rgba(46,42,44,0.2)',
  text:      '#8A8289',
  bg:        '#FFFBF8',
}

function drawGrid(ctx, w, h, xMin, xMax, yMin, yMax, padding = 44) {
  // Graph paper style
  ctx.fillStyle = '#FFFFFF'
  ctx.fillRect(padding, padding, w - padding * 2, h - padding * 2)
  
  const innerW = w - padding * 2
  const innerH = h - padding * 2
  
  // Calculate sensible steps based on range
  const xRange = xMax - xMin
  const yRange = yMax - yMin
  
  // Choose major step size (1, 2, 5, 10, etc)
  const getStep = (range) => {
    const rough = range / 10
    const mag = Math.pow(10, Math.floor(Math.log10(rough)))
    const rel = rough / mag
    if (rel < 1.5) return 1 * mag
    if (rel < 3.5) return 2 * mag
    if (rel < 7.5) return 5 * mag
    return 10 * mag
  }
  
  const xStep = getStep(xRange)
  const yStep = getStep(yRange)
  
  const drawLines = (step, color, width) => {
    ctx.strokeStyle = color
    ctx.lineWidth = width
    ctx.beginPath()
    
    // Vertical lines
    for (let x = Math.ceil(xMin / step) * step; x <= xMax; x += step) {
      const cx = padding + ((x - xMin) / xRange) * innerW
      ctx.moveTo(cx, padding)
      ctx.lineTo(cx, h - padding)
    }
    // Horizontal lines
    for (let y = Math.ceil(yMin / step) * step; y <= yMax; y += step) {
      const cy = (h - padding) - ((y - yMin) / yRange) * innerH
      ctx.moveTo(padding, cy)
      ctx.lineTo(w - padding, cy)
    }
    ctx.stroke()
  }

  // Draw minor (10 subdivisions per major)
  drawLines(xStep / 10, 'rgba(0,0,0,0.03)', 1)
  // Draw major
  drawLines(xStep, 'rgba(0,0,0,0.1)', 1.5)
}

function toCanvas(x, y, w, h, xMin, xMax, yMin, yMax, padding = 40) {
  const cx = padding + ((x - xMin) / (xMax - xMin)) * (w - padding * 2)
  const cy = (h - padding) - ((y - yMin) / (yMax - yMin)) * (h - padding * 2)
  return { cx, cy }
}

function drawSeries(ctx, data, w, h, xMin, xMax, yMin, yMax, color, label, padding = 40) {
  if (!data || data.length < 2) return
  ctx.strokeStyle = color
  ctx.lineWidth = 2.5
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  ctx.beginPath()
  data.forEach((pt, i) => {
    const { cx, cy } = toCanvas(pt.x, pt.y, w, h, xMin, xMax, yMin, yMax, padding)
    if (i === 0) ctx.moveTo(cx, cy)
    else ctx.lineTo(cx, cy)
  })
  ctx.stroke()
}

function drawAxes(ctx, w, h, xMin, xMax, yMin, yMax, xLabel, yLabel, padding = 40) {
  ctx.strokeStyle = COLORS.axis
  ctx.lineWidth = 1.5
  ctx.font = '11px JetBrains Mono, monospace'
  ctx.fillStyle = COLORS.text

  // X axis
  const yZero = toCanvas(0, 0, w, h, xMin, xMax, yMin, yMax, padding).cy
  const yAxisY = Math.max(padding, Math.min(h - padding, yZero))
  ctx.beginPath()
  ctx.moveTo(padding, yAxisY)
  ctx.lineTo(w - padding / 2, yAxisY)
  ctx.stroke()

  // Y axis
  const xZero = toCanvas(0, 0, w, h, xMin, xMax, yMin, yMax, padding).cx
  const xAxisX = Math.max(padding, Math.min(w - padding, xZero))
  ctx.beginPath()
  ctx.moveTo(xAxisX, padding / 2)
  ctx.lineTo(xAxisX, h - padding)
  ctx.stroke()

  // Tick labels
  ctx.textAlign = 'center'
  for (let i = 0; i <= 5; i++) {
    const x = xMin + (xMax - xMin) * i / 5
    const { cx } = toCanvas(x, yMin, w, h, xMin, xMax, yMin, yMax, padding)
    ctx.fillText(x.toFixed(1), cx, h - 8)
  }
  ctx.textAlign = 'right'
  for (let i = 0; i <= 4; i++) {
    const y = yMin + (yMax - yMin) * i / 4
    const { cy } = toCanvas(xMin, y, w, h, xMin, xMax, yMin, yMax, padding)
    ctx.fillText(y.toFixed(2), padding - 4, cy + 4)
  }

  // Axis labels
  ctx.textAlign = 'center'
  ctx.font = '12px Inter, sans-serif'
  ctx.fillStyle = COLORS.text
  ctx.fillText(xLabel, w / 2, h - 2)

  ctx.save()
  ctx.translate(12, h / 2)
  ctx.rotate(-Math.PI / 2)
  ctx.fillText(yLabel, 0, 0)
  ctx.restore()
}

function getSeriesForScene(sceneId, graphId, formulaState) {
  const gs = formulaState?.graphSeries
  if (!gs) return { series: [], xLabel: 'x', yLabel: 'y' }
  const defs = getGraphDefinitions(sceneId)
  const def = defs.find(d => d.id === graphId) ?? defs[0]

  switch (sceneId) {
    case 'gravity': {
      if (graphId === 'velocity-time') return { series: [{ data: gs.velocityTime, color: COLORS.primary, label: 'v' }], xLabel: def?.xLabel ?? 'Time (s)', yLabel: def?.yLabel ?? 'v (m/s)' }
      if (graphId === 'height-time')   return { series: [{ data: gs.heightTime,   color: COLORS.secondary, label: 'h' }], xLabel: def?.xLabel, yLabel: def?.yLabel }
      if (graphId === 'energy-time')   return {
        series: [
          { data: gs.energyTime.map(p => ({ x: p.x, y: p.ke1 })), color: COLORS.primary,   label: 'KE₁' },
          { data: gs.energyTime.map(p => ({ x: p.x, y: p.pe1 })), color: COLORS.secondary, label: 'PE₁' },
        ], xLabel: def?.xLabel, yLabel: def?.yLabel
      }
      break
    }
    case 'projectile': {
      if (graphId === 'trajectory')    return { series: [{ data: gs.trajectory, color: COLORS.primary }], xLabel: def?.xLabel, yLabel: def?.yLabel }
      if (graphId === 'height-time')   return { series: [{ data: gs.heightTime, color: COLORS.secondary }], xLabel: def?.xLabel, yLabel: def?.yLabel }
      if (graphId === 'velocity-time') return {
        series: [
          { data: gs.velocityTime.map(p => ({ x: p.x, y: p.speed })), color: COLORS.primary,   label: '|v|' },
          { data: gs.velocityTime.map(p => ({ x: p.x, y: p.vx    })), color: COLORS.tertiary,  label: 'vₓ' },
          { data: gs.velocityTime.map(p => ({ x: p.x, y: p.vy    })), color: COLORS.peach,     label: 'vᵧ' },
        ], xLabel: def?.xLabel, yLabel: def?.yLabel
      }
      break
    }
    case 'pendulum': {
      if (graphId === 'angle-time')  return { series: [{ data: gs.angleTime,  color: COLORS.primary }], xLabel: def?.xLabel, yLabel: def?.yLabel }
      if (graphId === 'energy-time') return {
        series: [
          { data: gs.energyTime.map(p => ({ x: p.x, y: p.ke })), color: COLORS.primary,   label: 'KE' },
          { data: gs.energyTime.map(p => ({ x: p.x, y: p.pe })), color: COLORS.secondary, label: 'PE' },
          { data: gs.energyTime.map(p => ({ x: p.x, y: p.te })), color: COLORS.tertiary,  label: 'Total' },
        ], xLabel: def?.xLabel, yLabel: def?.yLabel
      }
      if (graphId === 'phase') return { series: [{ data: gs.phase, color: COLORS.secondary }], xLabel: def?.xLabel, yLabel: def?.yLabel }
      break
    }
    case 'collision': {
      // Bar chart data
      return { series: [{ data: gs.velocity ?? [], color: COLORS.primary }], xLabel: def?.xLabel, yLabel: def?.yLabel, isBar: true }
    }
    case 'angular': {
      if (graphId === 'omega-r')  return { series: [{ data: gs.omegaR,  color: COLORS.primary }], xLabel: def?.xLabel, yLabel: def?.yLabel }
      if (graphId === 'energy-r') return { series: [{ data: gs.energyR, color: COLORS.peach  }], xLabel: def?.xLabel, yLabel: def?.yLabel }
      break
    }
  }
  return { series: [], xLabel: 'x', yLabel: 'y' }
}

export default function Graph2D({ graphId, width, height }) {
  const canvasRef = useRef()
  const { activeScene, formulaState } = usePhysicsStore()
  const { activeGraphTab } = useUIStore()

  const render = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !formulaState) return

    const W = canvas.width
    const H = canvas.height
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, W, H)
    ctx.fillStyle = COLORS.bg
    ctx.fillRect(0, 0, W, H)

    const { series, xLabel, yLabel, isBar } = getSeriesForScene(activeScene, graphId, formulaState)
    if (!series || series.length === 0) {
      ctx.fillStyle = COLORS.text
      ctx.font = '13px Inter, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('No data for this graph', W / 2, H / 2)
      return
    }

    // Compute bounds from all series
    let xMin = Infinity, xMax = -Infinity, yMin = Infinity, yMax = -Infinity
    series.forEach(({ data }) => {
      data.forEach(pt => {
        xMin = Math.min(xMin, pt.x)
        xMax = Math.max(xMax, pt.x)
        yMin = Math.min(yMin, pt.y)
        yMax = Math.max(yMax, pt.y)
      })
    })
    // Add 5% padding
    const xRange = xMax - xMin || 1
    const yRange = yMax - yMin || 1
    xMin -= xRange * 0.05; xMax += xRange * 0.05
    yMin -= yRange * 0.08; yMax += yRange * 0.08

    const PAD = 44
    drawGrid(ctx, W, H, xMin, xMax, yMin, yMax)
    drawAxes(ctx, W, H, xMin, xMax, yMin, yMax, xLabel ?? 'x', yLabel ?? 'y', PAD)

    // Draw each series
    series.forEach(({ data, color }) => {
      drawSeries(ctx, data, W, H, xMin, xMax, yMin, yMax, color, '', PAD)
    })

    // Draw animated dot synced to simTime
    const simTime = usePhysicsStore.getState().simTime
    series.forEach(({ data, color }) => {
      if (!data || data.length < 2) return
      // Find the point corresponding to simTime
      // We assume data points are uniformly distributed over the simulation duration
      // Or we can just find the closest point where pt.t <= simTime or if x is time, pt.x <= simTime
      // Since some graphs have x as time and others have x as distance, we rely on the fact that
      // the array index is monotonically increasing with time.
      // But we need the total duration.
      let T = formulaState.values.T || formulaState.values.T_corrected * 3 || 3
      if (activeScene === 'angular') T = 1 // Angular doesn't have a time animation yet

      let idx = Math.floor((simTime / T) * (data.length - 1))
      idx = Math.max(0, Math.min(data.length - 1, idx))
      
      const pt = data[idx]
      if (pt) {
        const { cx, cy } = toCanvas(pt.x, pt.y, W, H, xMin, xMax, yMin, yMax, PAD)
        ctx.beginPath()
        ctx.arc(cx, cy, 6, 0, Math.PI * 2)
        ctx.fillStyle = '#FFFFFF'
        ctx.fill()
        ctx.lineWidth = 2
        ctx.strokeStyle = color
        ctx.stroke()
      }
    })

    // Draw legend
    series.forEach(({ color, label }, i) => {
      if (!label) return
      const lx = W - PAD - 80 + i * 0
      const ly = PAD + i * 18
      ctx.fillStyle = color
      ctx.fillRect(W - PAD - 80, ly, 12, 12)
      ctx.fillStyle = COLORS.text
      ctx.font = '11px Inter, sans-serif'
      ctx.textAlign = 'left'
      ctx.fillText(label, W - PAD - 64, ly + 10)
    })
  }, [activeScene, formulaState, graphId])

  useEffect(() => {
    let rafId
    const loop = () => {
      render()
      rafId = requestAnimationFrame(loop)
    }
    loop()
    return () => cancelAnimationFrame(rafId)
  }, [render])

  // Resize canvas on mount
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const resize = () => {
      canvas.width  = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
      render()
    }
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)
    resize()
    return () => ro.disconnect()
  }, [render])

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: '100%',
        height: '100%',
        display: 'block',
        borderRadius: 'var(--radius-lg)',
      }}
    />
  )
}
