/**
 * VISIORA — CliffScene
 * Side view of a ball dropped or thrown from a cliff, drawn to scale (equal x/y).
 * Faded "strobe" balls every 0.25 s show how the motion spreads out; arrows show
 * the sideways (vx) and up–down (vy) speeds. Sky and ground change with the planet.
 */
import React from 'react'
import { useCanvas } from './useCanvas'
import { MOTION_COLORS } from './colors'
import { stateAt, flightTime, apex } from '../../engine/projectile'
import { niceStep, formatTick } from '../../engine/formula'

const MONO = '"JetBrains Mono", monospace'

const WORLDS = {
  earth: { sky: ['#DCEAF3', '#F7F3EB'], ground: '#C9D8B4', cliff: '#8C7B66', cliffTop: '#7FA35B', ink: '#1C1713' },
  moon: { sky: ['#0E0C0B', '#2A2622'], ground: '#9C9893', cliff: '#77736E', cliffTop: '#B5B1AB', ink: '#F7F3EB' },
  mars: { sky: ['#F2D2B6', '#F7E6D6'], ground: '#C9774A', cliff: '#9C5131', cliffTop: '#B8653C', ink: '#1C1713' },
  jupiter: { sky: ['#EAD7B1', '#F5EAD3'], ground: '#C79A68', cliff: '#9E7449', cliffTop: '#B58A5B', ink: '#1C1713' },
}

const STROBE = 0.25 // s between ghost balls

export default function CliffScene({ params, planet, mass, t, target, showPath }) {
  const { ref } = useCanvas(
    (ctx, w, h) => draw(ctx, w, h, { params, planet, mass, t, target, showPath }),
    [params, planet, mass, t, target, showPath]
  )
  const st = stateAt(t, params)
  return <canvas ref={ref} className="ml-canvas" role="img" aria-label={`Ball ${st.y.toFixed(1)} metres high and ${st.x.toFixed(1)} metres from the cliff`} />
}

function draw(ctx, w, h, { params, planet, mass, t, target, showPath }) {
  const W = WORLDS[planet] || WORLDS.earth
  const T = flightTime(params)
  const land = stateAt(T, params)
  const top = apex(params)

  // Fixed framing for this set of parameters (does not move while playing).
  const pad = { l: 64, r: 24, t: w < 500 ? 100 : 76, b: 40 }
  const cliffW = Math.max(4, params.h * 0.35)
  const xMin = -cliffW
  const xMax = Math.max(land.x, target ? target + 6 : 0, 12) * 1.08
  const yMax = Math.max(top.y, params.h, 6) * 1.12
  const s = Math.min((w - pad.l - pad.r) / (xMax - xMin), (h - pad.t - pad.b) / yMax)
  const X = x => pad.l + (x - xMin) * s
  const Y = y => h - pad.b - y * s
  const groundY = Y(0)

  // Sky + ground.
  const sky = ctx.createLinearGradient(0, 0, 0, groundY)
  sky.addColorStop(0, W.sky[0])
  sky.addColorStop(1, W.sky[1])
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, w, groundY)
  ctx.fillStyle = W.ground
  ctx.fillRect(0, groundY, w, h - groundY)
  if (planet === 'moon') {
    ctx.fillStyle = 'rgba(255,255,255,0.7)'
    for (let i = 0; i < 40; i++) {
      const sx = (i * 137.5) % w
      const sy = ((i * 89.3) % Math.max(1, groundY - 20))
      ctx.fillRect(sx, sy, 1.5, 1.5)
    }
  }

  // Cliff.
  if (params.h > 0) {
    // Starts after the left margin so the height scale stays readable.
    ctx.fillStyle = W.cliff
    ctx.fillRect(X(xMin), Y(params.h), X(0) - X(xMin), groundY - Y(params.h))
    ctx.fillStyle = W.cliffTop
    ctx.fillRect(X(xMin), Y(params.h) - 4, X(0) - X(xMin), 6)
  }

  // Height scale on the left, distance scale along the ground.
  ctx.font = `600 10.5px ${MONO}`
  const hs = niceStep(yMax, Math.max(3, (groundY - pad.t) / 45))
  ctx.textAlign = 'right'
  ctx.textBaseline = 'middle'
  ctx.strokeStyle = W.ink
  ctx.globalAlpha = 0.6
  ctx.lineWidth = 1
  for (let y = 0; y <= yMax + 1e-9; y += hs) {
    ctx.beginPath()
    ctx.moveTo(pad.l - 8, Y(y) + 0.5)
    ctx.lineTo(pad.l, Y(y) + 0.5)
    ctx.stroke()
    chipText(ctx, `${formatTick(y, hs)} m`, pad.l - 12, Y(y), W.ink, 'right')
  }
  const ds = niceStep(xMax, Math.max(3, (w - X(0)) / 70))
  for (let x = ds; x <= xMax; x += ds) {
    ctx.beginPath()
    ctx.moveTo(X(x) + 0.5, groundY)
    ctx.lineTo(X(x) + 0.5, groundY + 6)
    ctx.stroke()
    chipText(ctx, `${formatTick(x, ds)}`, X(x), groundY + 16, W.ink, 'center')
  }
  ctx.globalAlpha = 1

  // Target basket.
  if (target != null) {
    const bx = X(target)
    const bw = Math.max(18, 1.2 * s)
    ctx.strokeStyle = MOTION_COLORS.slowDown
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(bx - bw / 2, groundY - 18)
    ctx.lineTo(bx - bw / 2 + 4, groundY)
    ctx.lineTo(bx + bw / 2 - 4, groundY)
    ctx.lineTo(bx + bw / 2, groundY - 18)
    ctx.stroke()
    ctx.font = `700 11px ${MONO}`
    chipText(ctx, `${target} m`, bx, groundY - 30, MOTION_COLORS.slowDown, 'center')
  }

  // The ball is drawn resting on its lowest point, so the path is lifted by its radius too.
  const r = 7 + 4 * Math.cbrt(mass)

  // Predicted path.
  if (showPath && T > 0) {
    ctx.setLineDash([5, 6])
    ctx.strokeStyle = W.ink
    ctx.globalAlpha = 0.35
    ctx.lineWidth = 2
    ctx.beginPath()
    for (let i = 0; i <= 120; i++) {
      const p = stateAt((T * i) / 120, params)
      if (i) ctx.lineTo(X(p.x), Y(p.y) - r)
      else ctx.moveTo(X(p.x), Y(p.y) - r)
    }
    ctx.stroke()
    ctx.setLineDash([])
    ctx.globalAlpha = 1
  }

  // Strobe ghosts every 0.25 s up to now.
  const st = stateAt(t, params)
  for (let k = 0; k * STROBE <= st.t + 1e-9; k++) {
    const g = stateAt(k * STROBE, params)
    ctx.beginPath()
    ctx.arc(X(g.x), Y(g.y) - r, r * 0.7, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(18,81,184,0.22)'
    ctx.fill()
  }

  // Ball (sits on its lowest point so it rests on the ground at y = 0).
  const bx = X(st.x)
  const by = Y(st.y) - r
  const grad = ctx.createRadialGradient(bx - r * 0.35, by - r * 0.35, r * 0.2, bx, by, r)
  grad.addColorStop(0, '#5B8DEF')
  grad.addColorStop(1, '#0B3F94')
  ctx.fillStyle = grad
  ctx.beginPath()
  ctx.arc(bx, by, r, 0, Math.PI * 2)
  ctx.fill()
  ctx.font = `700 10px ${MONO}`
  chipText(ctx, `${mass} kg`, bx, by - r - 10, W.ink, 'center')

  // Velocity component arrows.
  if (!st.landed || st.t === 0) {
    const vmax = Math.max(1, Math.hypot(land.vx, land.vy), params.u)
    const k = 70 / vmax
    if (st.vx > 0.01) {
      arrow(ctx, bx, by, bx + st.vx * k, by, MOTION_COLORS.distance)
      chipText(ctx, `vx ${st.vx.toFixed(1)}`, bx + st.vx * k + 6, by - 12, MOTION_COLORS.distance, 'left')
    }
    if (Math.abs(st.vy) > 0.01) {
      arrow(ctx, bx, by, bx, by - st.vy * k, MOTION_COLORS.speed)
      chipText(ctx, `vy ${st.vy.toFixed(1)}`, bx + 10, by - st.vy * k, MOTION_COLORS.speed, 'left')
    }
  }
}

function chipText(ctx, text, x, y, color, align) {
  ctx.textAlign = align
  ctx.textBaseline = 'middle'
  ctx.lineWidth = 4
  ctx.lineJoin = 'round'
  ctx.strokeStyle = color === '#F7F3EB' ? 'rgba(14,12,11,0.85)' : 'rgba(255,255,255,0.85)'
  ctx.strokeText(text, x, y)
  ctx.fillStyle = color
  ctx.fillText(text, x, y)
}

function arrow(ctx, x0, y0, x1, y1, color) {
  const len = Math.hypot(x1 - x0, y1 - y0)
  if (len < 2) return
  const ux = (x1 - x0) / len
  const uy = (y1 - y0) / len
  const head = Math.min(10, len * 0.5)
  ctx.strokeStyle = color
  ctx.fillStyle = color
  ctx.lineWidth = 3.5
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(x0, y0)
  ctx.lineTo(x1 - ux * head, y1 - uy * head)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(x1, y1)
  ctx.lineTo(x1 - ux * head - uy * head * 0.6, y1 - uy * head + ux * head * 0.6)
  ctx.lineTo(x1 - ux * head + uy * head * 0.6, y1 - uy * head - ux * head * 0.6)
  ctx.closePath()
  ctx.fill()
}
