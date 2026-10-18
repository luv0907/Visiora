/**
 * VISIORA — MotionGraph
 * A distance–time or speed–time graph that draws itself as the car moves.
 * The current moment is a dot with guide lines to both axes. Drag on the graph
 * to scrub time. On the speed graph the area under the line is shaded: it equals
 * the distance travelled.
 */
import React, { useRef } from 'react'
import { useCanvas } from './useCanvas'
import { MOTION_COLORS } from './colors'
import { stateAt, ROAD_LENGTH } from '../../engine/motion'
import { niceStep, formatTick } from '../../engine/formula'

const MONO = '"JetBrains Mono", monospace'
const SANS = '"Plus Jakarta Sans", system-ui, sans-serif'

const KINDS = {
  s: { title: 'Distance–time', yName: 'distance (m)', color: MOTION_COLORS.distance, value: st => st.s },
  v: { title: 'Speed–time', yName: 'speed (m/s)', color: MOTION_COLORS.speed, value: st => st.v },
}

export default function MotionGraph({ kind, u, a, t, tAxis, vAxis, showPrediction, onScrub }) {
  const K = KINDS[kind]
  const yMax = kind === 's' ? ROAD_LENGTH : vAxis
  const layoutRef = useRef(null)

  const { ref } = useCanvas((ctx, w, h) => {
    const L = { l: 46, r: 14, t: 14, b: 36 }
    layoutRef.current = { ...L, w, h }
    const X = tt => L.l + (tt / tAxis) * (w - L.l - L.r)
    const Y = y => h - L.b - (y / yMax) * (h - L.t - L.b)

    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(0, 0, w, h)

    // Grid + ticks.
    const sx = niceStep(tAxis, Math.max(3, (w - L.l - L.r) / 70))
    const sy = niceStep(yMax, Math.max(3, (h - L.t - L.b) / 40))
    ctx.lineWidth = 1
    ctx.strokeStyle = 'rgba(28,23,19,0.08)'
    ctx.beginPath()
    for (let x = 0; x <= tAxis + 1e-9; x += sx) { ctx.moveTo(Math.round(X(x)) + 0.5, L.t); ctx.lineTo(Math.round(X(x)) + 0.5, h - L.b) }
    for (let y = 0; y <= yMax + 1e-9; y += sy) { ctx.moveTo(L.l, Math.round(Y(y)) + 0.5); ctx.lineTo(w - L.r, Math.round(Y(y)) + 0.5) }
    ctx.stroke()
    ctx.strokeStyle = '#483E36'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(L.l, L.t)
    ctx.lineTo(L.l, h - L.b)
    ctx.lineTo(w - L.r, h - L.b)
    ctx.stroke()

    ctx.font = `600 10.5px ${MONO}`
    ctx.fillStyle = MOTION_COLORS.muted
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    for (let x = 0; x <= tAxis + 1e-9; x += sx) ctx.fillText(formatTick(x, sx), X(x), h - L.b + 5)
    ctx.textAlign = 'right'
    ctx.textBaseline = 'middle'
    for (let y = 0; y <= yMax + 1e-9; y += sy) ctx.fillText(formatTick(y, sy), L.l - 6, Y(y))
    ctx.font = `600 11px ${SANS}`
    ctx.textAlign = 'right'
    ctx.textBaseline = 'bottom'
    ctx.fillText('time (s)', w - L.r, h - 2)

    // Prediction (faint, dashed) over the whole run.
    const N = 240
    const pts = tt => {
      const out = []
      for (let i = 0; i <= N; i++) {
        const ti = (tt * i) / N
        out.push([X(ti), Y(K.value(stateAt(ti, u, a)))])
      }
      return out
    }
    if (showPrediction) {
      ctx.setLineDash([5, 5])
      ctx.strokeStyle = K.color
      ctx.globalAlpha = 0.35
      ctx.lineWidth = 2
      line(ctx, pts(tAxis))
      ctx.setLineDash([])
      ctx.globalAlpha = 1
    }

    const done = pts(t)
    // Area under speed–time = distance.
    if (kind === 'v' && t > 0) {
      ctx.fillStyle = 'rgba(217,119,6,0.14)'
      ctx.beginPath()
      ctx.moveTo(X(0), Y(0))
      done.forEach(([x, y]) => ctx.lineTo(x, y))
      ctx.lineTo(X(t), Y(0))
      ctx.closePath()
      ctx.fill()
    }
    ctx.strokeStyle = K.color
    ctx.lineWidth = 3
    ctx.lineJoin = 'round'
    ctx.lineCap = 'round'
    line(ctx, done)

    // Current moment.
    const st = stateAt(t, u, a)
    const val = K.value(st)
    const px = X(st.t)
    const py = Y(val)
    ctx.setLineDash([3, 4])
    ctx.strokeStyle = 'rgba(28,23,19,0.35)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(px, h - L.b)
    ctx.lineTo(px, py)
    ctx.lineTo(L.l, py)
    ctx.stroke()
    ctx.setLineDash([])
    ctx.beginPath()
    ctx.arc(px, py, 6, 0, Math.PI * 2)
    ctx.fillStyle = '#fff'
    ctx.fill()
    ctx.lineWidth = 3
    ctx.strokeStyle = K.color
    ctx.stroke()

    const text = kind === 's' ? `${val.toFixed(1)} m` : `${val.toFixed(1)} m/s`
    ctx.font = `700 12px ${MONO}`
    const tw = ctx.measureText(text).width + 12
    const bx = Math.min(w - L.r - tw, Math.max(L.l + 4, px + 10))
    const by = Math.max(L.t, Math.min(h - L.b - 24, py - 30))
    ctx.fillStyle = K.color
    ctx.beginPath()
    ctx.roundRect(bx, by, tw, 22, 11)
    ctx.fill()
    ctx.fillStyle = '#fff'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    ctx.fillText(text, bx + 6, by + 11.5)

    if (kind === 'v' && st.t > 0 && st.s > 0) {
      ctx.font = `700 11px ${SANS}`
      ctx.fillStyle = '#936C06'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      const ax = X(st.t / 2)
      const ay = (Y(0) + Y(K.value(stateAt(st.t / 2, u, a)))) / 2
      if (Y(0) - ay > 14) ctx.fillText(`area = ${st.s.toFixed(1)} m`, ax, Math.max(ay, L.t + 10))
    }
  }, [kind, u, a, t, tAxis, vAxis, showPrediction])

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
        <span style={{ background: K.color }} />
        {K.title}
        <small>{K.yName}</small>
      </figcaption>
      <canvas
        ref={ref}
        className="ml-canvas ml-graph-canvas"
        role="img"
        aria-label={`${K.title} graph. Drag to move through time.`}
        onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); scrub(e) }}
        onPointerMove={e => { if (e.buttons) scrub(e) }}
      />
    </figure>
  )
}

function line(ctx, pts) {
  ctx.beginPath()
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)))
  ctx.stroke()
}
