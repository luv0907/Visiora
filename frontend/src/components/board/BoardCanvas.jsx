/**
 * VISIORA — BoardCanvas
 * The x/y plane of the Graph Board: grid, axes, exact curve plots, key points,
 * a hover/tap trace, and draggable vectors. Pan with drag, zoom with wheel or pinch.
 *
 * view = { cx, cy, sx, sy }: world point at the canvas centre and pixels per unit on each axis.
 */
import React, { useEffect, useRef, useCallback } from 'react'
import { sampleSegments, niceStep, formatTick, formatNumber } from '../../engine/formula'
import { magnitude, angleDeg } from '../../engine/vectors'
import { visibleRange, zoomAt } from './view'

const C = {
  bg: '#FCFAF7',
  minor: 'rgba(28,23,19,0.05)',
  major: 'rgba(28,23,19,0.11)',
  axis: '#483E36',
  label: '#6D6254',
  ink: '#1C1713',
  chip: 'rgba(255,255,255,0.94)',
  root: '#E11D48',
  max: '#059669',
  min: '#4F46E5',
  intercept: '#D97706',
}

const MONO = '600 11px "JetBrains Mono", monospace'
const SANS = '600 12px "Plus Jakarta Sans", system-ui, sans-serif'

export default function BoardCanvas({
  view,
  onViewChange,
  onResize,
  curves,
  activeCurveId,
  keyPoints,
  xLabel,
  yLabel,
  vectors,
  showComponents,
  showResultant,
  snap,
  onVectorChange,
  trace,
  onTrace,
}) {
  const canvasRef = useRef(null)
  const sizeRef = useRef({ w: 0, h: 0 })
  const propsRef = useRef({})
  propsRef.current = { view, curves, activeCurveId, keyPoints, xLabel, yLabel, vectors, showComponents, showResultant, snap, trace }
  const dragRef = useRef(null)
  const pointersRef = useRef(new Map())
  const frameRef = useRef(0)

  const toPx = (v, x, y) => {
    const { w, h } = sizeRef.current
    return [w / 2 + (x - v.cx) * v.sx, h / 2 - (y - v.cy) * v.sy]
  }
  const toWorld = (v, px, py) => {
    const { w, h } = sizeRef.current
    return [v.cx + (px - w / 2) / v.sx, v.cy - (py - h / 2) / v.sy]
  }

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const { w, h } = sizeRef.current
    const dpr = window.devicePixelRatio || 1
    const p = propsRef.current
    const v = p.view
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.fillStyle = C.bg
    ctx.fillRect(0, 0, w, h)
    if (!w || !h) return

    const r = visibleRange(v, { w, h })
    drawGrid(ctx, v, r, w, h, toPx)
    drawAxes(ctx, v, r, w, h, toPx, p.xLabel, p.yLabel)

    // Curves — inactive first so the active one sits on top.
    const ordered = [...p.curves].sort((a, b) => (a.id === p.activeCurveId) - (b.id === p.activeCurveId))
    for (const c of ordered) {
      if (!c.visible || !c.fn) continue
      const segs = sampleSegments(c.fn, r.x0, r.x1, Math.ceil(w), r.y1 - r.y0)
      ctx.strokeStyle = c.color
      ctx.lineWidth = c.id === p.activeCurveId ? 3 : 2
      ctx.lineJoin = 'round'
      ctx.lineCap = 'round'
      ctx.globalAlpha = c.id === p.activeCurveId ? 1 : 0.75
      for (const seg of segs) {
        ctx.beginPath()
        seg.forEach(([x, y], i) => {
          const [px, py] = toPx(v, x, y)
          const cy = Math.max(-1e5, Math.min(1e5, py))
          if (i === 0) ctx.moveTo(px, cy)
          else ctx.lineTo(px, cy)
        })
        if (seg.length === 1) {
          const [px, py] = toPx(v, seg[0][0], seg[0][1])
          ctx.arc(px, py, 1.5, 0, Math.PI * 2)
        }
        ctx.stroke()
      }
      ctx.globalAlpha = 1
    }

    // Key points of the active curve.
    for (const kp of p.keyPoints || []) {
      const [px, py] = toPx(v, kp.x, kp.y)
      if (px < -10 || px > w + 10 || py < -10 || py > h + 10) continue
      dot(ctx, px, py, C[kp.kind])
      chip(ctx, `(${formatNumber(kp.x)}, ${formatNumber(kp.y)})`, px, py - 14, C[kp.kind], w, h)
    }

    // Trace on the active curve.
    const active = p.curves.find(c => c.id === p.activeCurveId && c.visible && c.fn)
    if (p.trace != null && active) {
      const y = active.fn(p.trace)
      const [px] = toPx(v, p.trace, 0)
      ctx.strokeStyle = 'rgba(28,23,19,0.25)'
      ctx.setLineDash([4, 4])
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(px, 0)
      ctx.lineTo(px, h)
      ctx.stroke()
      ctx.setLineDash([])
      if (Number.isFinite(y)) {
        const [, py] = toPx(v, p.trace, y)
        if (py > -10 && py < h + 10) {
          dot(ctx, px, py, active.color, 6)
          chip(ctx, `${p.xLabel} = ${formatNumber(p.trace)}   ${p.yLabel} = ${formatNumber(y)}`, px, py - 18, C.ink, w, h)
        }
      }
    }

    drawVectors(ctx, v, p, toPx)
  }, [])

  const requestDraw = useCallback(() => {
    cancelAnimationFrame(frameRef.current)
    frameRef.current = requestAnimationFrame(draw)
  }, [draw])

  useEffect(requestDraw, [view, curves, activeCurveId, keyPoints, xLabel, yLabel, vectors, showComponents, showResultant, trace, requestDraw])

  useEffect(() => {
    const canvas = canvasRef.current
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      const dpr = window.devicePixelRatio || 1
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      sizeRef.current = { w: width, h: height }
      onResize?.({ w: width, h: height })
      draw()
    })
    ro.observe(canvas)
    return () => {
      ro.disconnect()
      cancelAnimationFrame(frameRef.current)
    }
  }, [draw, onResize])

  // ── Interaction ──────────────────────────────────────────────
  const localPoint = e => {
    const rect = canvasRef.current.getBoundingClientRect()
    return [e.clientX - rect.left, e.clientY - rect.top]
  }

  const hitVector = (px, py, touch) => {
    const p = propsRef.current
    const radius = touch ? 24 : 14
    for (const part of ['tip', 'tail']) {
      for (let i = p.vectors.length - 1; i >= 0; i--) {
        const vec = p.vectors[i]
        const [x, y] = part === 'tip' ? [vec.ox + vec.x, vec.oy + vec.y] : [vec.ox, vec.oy]
        const [hx, hy] = toPx(p.view, x, y)
        if (Math.hypot(px - hx, py - hy) <= radius) return { id: vec.id, part }
      }
    }
    return null
  }

  const snapValue = val => {
    if (!propsRef.current.snap) return val
    const step = niceStep(sizeRef.current.w / propsRef.current.view.sx, 8) / 2
    return Math.round(val / step) * step
  }

  const onPointerDown = e => {
    const [px, py] = localPoint(e)
    canvasRef.current.setPointerCapture(e.pointerId)
    pointersRef.current.set(e.pointerId, [px, py])
    if (pointersRef.current.size === 2) {
      const [a, b] = [...pointersRef.current.values()]
      dragRef.current = { kind: 'pinch', dist: Math.hypot(a[0] - b[0], a[1] - b[1]), view: propsRef.current.view }
      return
    }
    const hit = hitVector(px, py, e.pointerType === 'touch')
    if (hit) {
      dragRef.current = { kind: 'vector', ...hit }
    } else {
      dragRef.current = { kind: 'pan', start: [px, py], view: propsRef.current.view, moved: false }
    }
  }

  const onPointerMove = e => {
    const [px, py] = localPoint(e)
    const d = dragRef.current
    const canvas = canvasRef.current
    if (!d) {
      if (e.pointerType === 'mouse') {
        const hit = hitVector(px, py, false)
        canvas.style.cursor = hit ? 'pointer' : 'grab'
        onTrace?.(toWorld(propsRef.current.view, px, py)[0])
      }
      return
    }
    pointersRef.current.set(e.pointerId, [px, py])

    if (d.kind === 'pinch' && pointersRef.current.size === 2) {
      const [a, b] = [...pointersRef.current.values()]
      const dist = Math.hypot(a[0] - b[0], a[1] - b[1])
      const k = dist / d.dist
      const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
      onViewChange(zoomAt(d.view, mid, k, sizeRef.current))
    } else if (d.kind === 'vector') {
      const p = propsRef.current
      const vec = p.vectors.find(x => x.id === d.id)
      if (!vec) return
      const [wx, wy] = toWorld(p.view, px, py)
      if (d.part === 'tip') onVectorChange(d.id, { x: snapValue(wx) - vec.ox, y: snapValue(wy) - vec.oy })
      else onVectorChange(d.id, { ox: snapValue(wx), oy: snapValue(wy) })
      canvas.style.cursor = 'grabbing'
    } else if (d.kind === 'pan') {
      const dx = px - d.start[0]
      const dy = py - d.start[1]
      if (Math.hypot(dx, dy) > 4) d.moved = true
      if (d.moved) {
        canvas.style.cursor = 'grabbing'
        onViewChange({ ...d.view, cx: d.view.cx - dx / d.view.sx, cy: d.view.cy + dy / d.view.sy })
      }
    }
  }

  const onPointerUp = e => {
    const d = dragRef.current
    pointersRef.current.delete(e.pointerId)
    if (d?.kind === 'pan' && !d.moved) {
      const [px, py] = localPoint(e)
      onTrace?.(toWorld(propsRef.current.view, px, py)[0])
    }
    if (pointersRef.current.size === 0) dragRef.current = null
    else if (d?.kind === 'pinch') dragRef.current = null
    canvasRef.current.style.cursor = 'grab'
  }

  useEffect(() => {
    const canvas = canvasRef.current
    const onWheel = e => {
      e.preventDefault()
      const [px, py] = localPoint(e)
      const k = Math.exp(-e.deltaY * 0.0015)
      onViewChange(zoomAt(propsRef.current.view, [px, py], k, sizeRef.current))
    }
    canvas.addEventListener('wheel', onWheel, { passive: false })
    return () => canvas.removeEventListener('wheel', onWheel)
  }, [onViewChange])

  return (
    <canvas
      ref={canvasRef}
      className="gb-canvas"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onPointerLeave={e => {
        if (e.pointerType === 'mouse' && !dragRef.current) onTrace?.(null)
      }}
      aria-label="Graph plane. Drag to move, scroll or pinch to zoom."
      role="img"
    />
  )
}

// ── Drawing helpers ────────────────────────────────────────────

function drawGrid(ctx, v, r, w, h, toPx) {
  const stepX = niceStep(r.x1 - r.x0, Math.max(4, w / 90))
  const stepY = niceStep(r.y1 - r.y0, Math.max(4, h / 90))
  const minor = s => s / (Math.round(s / Math.pow(10, Math.floor(Math.log10(s)))) === 2 ? 4 : 5)
  ctx.lineWidth = 1
  for (const [step, color] of [[minor(stepX), C.minor], [stepX, C.major]]) {
    ctx.strokeStyle = color
    ctx.beginPath()
    for (let x = Math.ceil(r.x0 / step) * step; x <= r.x1; x += step) {
      const [px] = toPx(v, x, 0)
      ctx.moveTo(Math.round(px) + 0.5, 0)
      ctx.lineTo(Math.round(px) + 0.5, h)
    }
    ctx.stroke()
  }
  for (const [step, color] of [[minor(stepY), C.minor], [stepY, C.major]]) {
    ctx.strokeStyle = color
    ctx.beginPath()
    for (let y = Math.ceil(r.y0 / step) * step; y <= r.y1; y += step) {
      const [, py] = toPx(v, 0, y)
      ctx.moveTo(0, Math.round(py) + 0.5)
      ctx.lineTo(w, Math.round(py) + 0.5)
    }
    ctx.stroke()
  }
}

function drawAxes(ctx, v, r, w, h, toPx, xLabel, yLabel) {
  const [ox, oy] = toPx(v, 0, 0)
  const axisY = Math.min(h - 1, Math.max(0, oy))
  const axisX = Math.min(w - 1, Math.max(0, ox))
  ctx.strokeStyle = C.axis
  ctx.lineWidth = 1.5
  ctx.beginPath()
  if (oy >= 0 && oy <= h) { ctx.moveTo(0, Math.round(oy) + 0.5); ctx.lineTo(w, Math.round(oy) + 0.5) }
  if (ox >= 0 && ox <= w) { ctx.moveTo(Math.round(ox) + 0.5, 0); ctx.lineTo(Math.round(ox) + 0.5, h) }
  ctx.stroke()

  // Tick labels sit next to the axis, or stick to the edge when the axis is off-screen.
  const stepX = niceStep(r.x1 - r.x0, Math.max(4, w / 90))
  const stepY = niceStep(r.y1 - r.y0, Math.max(4, h / 90))
  ctx.font = MONO
  ctx.fillStyle = C.label
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  const labelY = axisY + 6 > h - 16 ? axisY - 18 : axisY + 6
  for (let x = Math.ceil(r.x0 / stepX) * stepX; x <= r.x1; x += stepX) {
    if (Math.abs(x) < stepX / 2) continue
    const [px] = toPx(v, x, 0)
    if (px < 14 || px > w - 14) continue
    halo(ctx, formatTick(x, stepX), px, labelY)
  }
  ctx.textAlign = 'right'
  ctx.textBaseline = 'middle'
  const rightEdge = axisX - 6 < 34
  if (rightEdge) ctx.textAlign = 'left'
  for (let y = Math.ceil(r.y0 / stepY) * stepY; y <= r.y1; y += stepY) {
    if (Math.abs(y) < stepY / 2) continue
    const [, py] = toPx(v, 0, y)
    if (py < 12 || py > h - 12) continue
    halo(ctx, formatTick(y, stepY), rightEdge ? axisX + 6 : axisX - 6, py)
  }
  if (ox >= 0 && ox <= w && oy >= 0 && oy <= h) {
    ctx.textAlign = 'right'
    ctx.textBaseline = 'top'
    halo(ctx, '0', ox - 5, oy + 5)
  }

  // Axis names.
  ctx.font = '700 13px "Plus Jakarta Sans", system-ui, sans-serif'
  ctx.fillStyle = C.ink
  ctx.textAlign = 'right'
  ctx.textBaseline = 'bottom'
  halo(ctx, xLabel, w - 10, axisY - 6 < 18 ? axisY + 24 : axisY - 6)
  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'
  // Keep clear of the back button in the top-left corner.
  halo(ctx, yLabel, axisX + 8 > w - 40 ? axisX - 40 : axisX + 8, axisX < 70 ? 64 : 10)
}

function halo(ctx, text, x, y) {
  ctx.save()
  ctx.strokeStyle = C.bg
  ctx.lineWidth = 4
  ctx.lineJoin = 'round'
  ctx.strokeText(text, x, y)
  ctx.restore()
  ctx.fillText(text, x, y)
}

function dot(ctx, x, y, color, r = 5) {
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fillStyle = '#fff'
  ctx.fill()
  ctx.lineWidth = 2.5
  ctx.strokeStyle = color
  ctx.stroke()
}

function chip(ctx, text, x, y, color, w, h) {
  ctx.font = MONO
  const tw = ctx.measureText(text).width
  const bw = tw + 14
  const bh = 22
  const bx = Math.min(w - bw - 4, Math.max(4, x - bw / 2))
  const by = Math.min(h - bh - 4, Math.max(4, y - bh))
  ctx.fillStyle = C.chip
  ctx.strokeStyle = color
  ctx.lineWidth = 1.25
  ctx.beginPath()
  ctx.roundRect(bx, by, bw, bh, 11)
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = C.ink
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, bx + 7, by + bh / 2 + 0.5)
}

function arrow(ctx, x0, y0, x1, y1, color, width = 3, dashed = false) {
  const len = Math.hypot(x1 - x0, y1 - y0)
  if (len < 1) return
  const ux = (x1 - x0) / len
  const uy = (y1 - y0) / len
  const head = Math.min(16, len * 0.45)
  ctx.strokeStyle = color
  ctx.fillStyle = color
  ctx.lineWidth = width
  ctx.lineCap = 'round'
  if (dashed) ctx.setLineDash([6, 6])
  ctx.beginPath()
  ctx.moveTo(x0, y0)
  ctx.lineTo(x1 - ux * head * 0.8, y1 - uy * head * 0.8)
  ctx.stroke()
  ctx.setLineDash([])
  ctx.beginPath()
  ctx.moveTo(x1, y1)
  ctx.lineTo(x1 - ux * head - uy * head * 0.5, y1 - uy * head + ux * head * 0.5)
  ctx.lineTo(x1 - ux * head + uy * head * 0.5, y1 - uy * head - ux * head * 0.5)
  ctx.closePath()
  ctx.fill()
}

function drawVectors(ctx, v, p, toPx) {
  const vecs = p.vectors || []
  if (!vecs.length) return
  const { w, h } = { w: ctx.canvas.width / (window.devicePixelRatio || 1), h: ctx.canvas.height / (window.devicePixelRatio || 1) }

  // Resultant: place each vector tip-to-tail from the first one's tail.
  if (p.showResultant && vecs.length >= 2) {
    let x = vecs[0].ox
    let y = vecs[0].oy
    vecs.forEach((vec, i) => {
      const [ax, ay] = toPx(v, x, y)
      const [bx, by] = toPx(v, x + vec.x, y + vec.y)
      if (i > 0) arrow(ctx, ax, ay, bx, by, vec.color, 2, true)
      x += vec.x
      y += vec.y
    })
    const [ax, ay] = toPx(v, vecs[0].ox, vecs[0].oy)
    const [bx, by] = toPx(v, x, y)
    arrow(ctx, ax, ay, bx, by, C.ink, 4)
    const R = { x: x - vecs[0].ox, y: y - vecs[0].oy }
    const len = Math.hypot(bx - ax, by - ay) || 1
    chip(ctx, `R = ${formatNumber(magnitude(R), 2)} at ${formatNumber(angleDeg(R), 1)}°`, bx + ((bx - ax) / len) * 30, by + ((by - ay) / len) * 30 + 11, C.ink, w, h)
  }

  for (const vec of vecs) {
    const [ax, ay] = toPx(v, vec.ox, vec.oy)
    const [bx, by] = toPx(v, vec.ox + vec.x, vec.oy + vec.y)

    if (p.showComponents) {
      const [cx] = toPx(v, vec.ox + vec.x, vec.oy)
      ctx.setLineDash([5, 5])
      ctx.lineWidth = 2
      ctx.strokeStyle = vec.color
      ctx.globalAlpha = 0.7
      ctx.beginPath()
      ctx.moveTo(ax, ay)
      ctx.lineTo(cx, ay)
      ctx.lineTo(bx, by)
      ctx.stroke()
      ctx.setLineDash([])
      ctx.globalAlpha = 1
      ctx.font = MONO
      ctx.fillStyle = vec.color
      ctx.textAlign = 'center'
      ctx.textBaseline = vec.y >= 0 ? 'top' : 'bottom'
      halo(ctx, `${vec.label}x = ${formatNumber(vec.x, 2)}`, (ax + cx) / 2, ay + (vec.y >= 0 ? 6 : -6))
      ctx.textAlign = vec.x >= 0 ? 'left' : 'right'
      ctx.textBaseline = 'middle'
      halo(ctx, `${vec.label}y = ${formatNumber(vec.y, 2)}`, cx + (vec.x >= 0 ? 8 : -8), (ay + by) / 2)

      // Angle arc from +x.
      const ang = angleDeg(vec)
      if (magnitude(vec) > 0) {
        ctx.strokeStyle = vec.color
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.arc(ax, ay, 26, 0, -(ang * Math.PI) / 180, ang > 0)
        ctx.stroke()
        const mid = (-(ang / 2) * Math.PI) / 180
        ctx.textAlign = 'left'
        ctx.textBaseline = 'middle'
        halo(ctx, `${formatNumber(ang, 1)}°`, ax + Math.cos(mid) * 34, ay + Math.sin(mid) * 34)
      }
    }

    arrow(ctx, ax, ay, bx, by, vec.color, 3.5)
    // Handles: tail (move) and tip (resize).
    ctx.beginPath()
    ctx.arc(ax, ay, 4.5, 0, Math.PI * 2)
    ctx.fillStyle = vec.color
    ctx.fill()
    ctx.beginPath()
    ctx.arc(bx, by, 9, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(255,255,255,0.01)'
    ctx.fill()
    ctx.lineWidth = 2
    ctx.strokeStyle = vec.color
    ctx.globalAlpha = 0.35
    ctx.stroke()
    ctx.globalAlpha = 1

    ctx.font = '800 14px "Plus Jakarta Sans", system-ui, sans-serif'
    ctx.fillStyle = vec.color
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    const len = Math.hypot(bx - ax, by - ay) || 1
    halo(ctx, vec.label, bx + ((bx - ax) / len) * 16, by + ((by - ay) / len) * 16)
  }
  ctx.font = SANS
}
