/**
 * VISIORA — LiveGraph
 * A quantity–time graph that draws itself as the experiment runs. The current
 * moment is a dot with guide lines to both axes; drag on the graph to scrub time.
 * Optionally shades the area between the line and zero (e.g. speed–time → distance).
 *
 * valueAt(t) must be exact; the graph only samples it.
 */
import React, { useRef } from 'react'
import { useCanvas } from './useCanvas'
import { MOTION_COLORS } from './colors'
import { niceStep, formatTick } from '../../engine/formula'

const MONO = '"JetBrains Mono", monospace'
const SANS = '"Plus Jakarta Sans", system-ui, sans-serif'

export default function LiveGraph({
  title,
  yName,
  unit,
  color,
  valueAt,
  t,
  tAxis,
  yMin = 0,
  yMax,
  showPrediction,
  areaLabel,
  note,
  onScrub,
}) {
  const layoutRef = useRef(null)

  const { ref } = useCanvas((ctx, w, h) => {
    const L = { l: 46, r: 14, t: 14, b: 36 }
    layoutRef.current = { ...L, w, h }
    const X = tt => L.l + (tt / tAxis) * (w - L.l - L.r)
    const Y = y => h - L.b - ((y - yMin) / (yMax - yMin)) * (h - L.t - L.b)
    const zeroY = Y(Math.min(yMax, Math.max(yMin, 0)))

    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(0, 0, w, h)

    // Grid + ticks (y ticks are aligned to zero).
    const sx = niceStep(tAxis, Math.max(3, (w - L.l - L.r) / 70))
    const sy = niceStep(yMax - yMin, Math.max(3, (h - L.t - L.b) / 40))
    const yTicks = []
    for (let y = Math.ceil(yMin / sy - 1e-9) * sy; y <= yMax + 1e-9; y += sy) yTicks.push(y)
    ctx.lineWidth = 1
    ctx.strokeStyle = 'rgba(28,23,19,0.08)'
    ctx.beginPath()
    for (let x = 0; x <= tAxis + 1e-9; x += sx) { ctx.moveTo(Math.round(X(x)) + 0.5, L.t); ctx.lineTo(Math.round(X(x)) + 0.5, h - L.b) }
    for (const y of yTicks) { ctx.moveTo(L.l, Math.round(Y(y)) + 0.5); ctx.lineTo(w - L.r, Math.round(Y(y)) + 0.5) }
    ctx.stroke()
    ctx.strokeStyle = '#483E36'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(L.l, L.t)
    ctx.lineTo(L.l, h - L.b)
    ctx.moveTo(L.l, Math.round(zeroY) + 0.5)
    ctx.lineTo(w - L.r, Math.round(zeroY) + 0.5)
    ctx.stroke()

    ctx.font = `600 10.5px ${MONO}`
    ctx.fillStyle = MOTION_COLORS.muted
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    for (let x = 0; x <= tAxis + 1e-9; x += sx) ctx.fillText(formatTick(x, sx), X(x), h - L.b + 5)
    ctx.textAlign = 'right'
    ctx.textBaseline = 'middle'
    for (const y of yTicks) ctx.fillText(formatTick(y, sy), L.l - 6, Y(y))
    ctx.font = `600 11px ${SANS}`
    ctx.textAlign = 'right'
    ctx.textBaseline = 'bottom'
    ctx.fillText('time (s)', w - L.r, h - 2)

    const N = 240
    const pts = tt => {
      const out = []
      for (let i = 0; i <= N; i++) {
        const ti = (tt * i) / N
        out.push([X(ti), Y(valueAt(ti))])
      }
      return out
    }
    if (showPrediction) {
      ctx.setLineDash([5, 5])
      ctx.strokeStyle = color
      ctx.globalAlpha = 0.35
      ctx.lineWidth = 2
      line(ctx, pts(tAxis))
      ctx.setLineDash([])
      ctx.globalAlpha = 1
    }

    const done = pts(t)
    if (areaLabel && t > 0) {
      ctx.fillStyle = hexA(color, 0.14)
      ctx.beginPath()
      ctx.moveTo(X(0), zeroY)
      done.forEach(([x, y]) => ctx.lineTo(x, y))
      ctx.lineTo(X(t), zeroY)
      ctx.closePath()
      ctx.fill()
    }
    ctx.strokeStyle = color
    ctx.lineWidth = 3
    ctx.lineJoin = 'round'
    ctx.lineCap = 'round'
    line(ctx, done)

    // Current moment.
    const val = valueAt(t)
    const px = X(t)
    const py = Y(val)
    ctx.setLineDash([3, 4])
    ctx.strokeStyle = 'rgba(28,23,19,0.35)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(px, zeroY)
    ctx.lineTo(px, py)
    ctx.lineTo(L.l, py)
    ctx.stroke()
    ctx.setLineDash([])
    ctx.beginPath()
    ctx.arc(px, py, 6, 0, Math.PI * 2)
    ctx.fillStyle = '#fff'
    ctx.fill()
    ctx.lineWidth = 3
    ctx.strokeStyle = color
    ctx.stroke()

    const text = `${(Math.abs(val) < 0.05 ? 0 : val).toFixed(1)} ${unit}`
    ctx.font = `700 12px ${MONO}`
    const tw = ctx.measureText(text).width + 12
    const bx = Math.min(w - L.r - tw, Math.max(L.l + 4, px + 10))
    const by = Math.max(L.t, Math.min(h - L.b - 24, py - 30))
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.roundRect(bx, by, tw, 22, 11)
    ctx.fill()
    ctx.fillStyle = '#fff'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    ctx.fillText(text, bx + 6, by + 11.5)

    if (areaLabel && t > 0) {
      const lbl = areaLabel(t)
      const ay = (zeroY + Y(valueAt(t / 2))) / 2
      if (lbl && Math.abs(zeroY - ay) > 14) {
        ctx.font = `700 11px ${SANS}`
        ctx.fillStyle = '#483E36'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(lbl, X(t / 2), Math.max(ay, L.t + 10))
      }
    }
  }, [valueAt, t, tAxis, yMin, yMax, showPrediction, areaLabel, color, unit])

  const scrub = e => {
    const L = layoutRef.current
    if (!L) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    onScrub(Math.max(0, ((x - L.l) / (L.w - L.l - L.r)) * tAxis))
  }

  return (
    <figure className="ml-graph">
      <figcaption>
        <span style={{ background: color }} />
        {title}
        <small>{yName}</small>
      </figcaption>
      <canvas
        ref={ref}
        className="ml-canvas ml-graph-canvas"
        role="img"
        aria-label={`${title} graph. Drag to move through time.`}
        onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); scrub(e) }}
        onPointerMove={e => { if (e.buttons) scrub(e) }}
      />
      {note && <p className="ml-graph-note">{note}</p>}
    </figure>
  )
}

function line(ctx, pts) {
  ctx.beginPath()
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)))
  ctx.stroke()
}

function hexA(hex, alpha) {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`
}
