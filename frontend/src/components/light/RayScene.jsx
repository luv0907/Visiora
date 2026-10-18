/**
 * VISIORA — RayScene
 * A laser hits the flat boundary between two materials. Drag anywhere to aim it.
 * Reflected and refracted rays are drawn at their exact angles, with brightness
 * set by how much light each one really carries (Fresnel).
 */
import React from 'react'
import { useCanvas } from '../motion/useCanvas'
import { interact, criticalAngle } from '../../engine/optics'

const MONO = '"JetBrains Mono", monospace'
const SANS = '"Plus Jakarta Sans", system-ui, sans-serif'
const D2R = Math.PI / 180

const MEDIUM_FILL = {
  air: '#FBF8F2',
  water: '#CFE6F2',
  glass: '#DCEBE8',
  diamond: '#E7E1F5',
}

const LASER = '#E11D48'

export default function RayScene({ top, bottom, side, theta, onAim }) {
  const { ref, sizeRef } = useCanvas((ctx, w, h) => draw(ctx, w, h, { top, bottom, side, theta }), [top, bottom, side, theta])

  const aim = e => {
    const rect = e.currentTarget.getBoundingClientRect()
    const { w, h } = sizeRef.current
    const dx = e.clientX - rect.left - w / 2
    const dy = e.clientY - rect.top - h / 2
    if (Math.hypot(dx, dy) < 12) return
    const ang = Math.atan2(Math.abs(dx), Math.abs(dy)) / D2R
    onAim({ side: dy < 0 ? 'top' : 'bottom', theta: Math.min(89.5, Math.round(ang * 2) / 2) })
  }

  return (
    <canvas
      ref={ref}
      className="ml-canvas lt-canvas"
      role="img"
      aria-label={`Laser at ${theta} degrees from the normal in ${side === 'top' ? top.label : bottom.label}. Drag to aim.`}
      onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); aim(e) }}
      onPointerMove={e => { if (e.buttons) aim(e) }}
    />
  )
}

function draw(ctx, w, h, { top, bottom, side, theta }) {
  const cx = w / 2
  const cy = h / 2
  const R = Math.min(w * 0.44, h * 0.44)
  const from = side === 'top' ? top : bottom
  const into = side === 'top' ? bottom : top
  const sIn = side === 'top' ? -1 : 1 // y direction of the laser's half
  const res = interact(theta, from.n, into.n)

  // Two materials.
  ctx.fillStyle = MEDIUM_FILL[top.id]
  ctx.fillRect(0, 0, w, cy)
  ctx.fillStyle = MEDIUM_FILL[bottom.id]
  ctx.fillRect(0, cy, w, h - cy)
  ctx.strokeStyle = 'rgba(28,23,19,0.45)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(0, cy)
  ctx.lineTo(w, cy)
  ctx.stroke()

  ctx.font = `800 14px ${SANS}`
  ctx.fillStyle = '#1C1713'
  ctx.textAlign = 'right'
  ctx.textBaseline = 'top'
  ctx.fillText(top.label, w - 16, 16)
  ctx.textBaseline = 'bottom'
  ctx.fillText(bottom.label, w - 16, h - 30)
  ctx.font = `600 12px ${MONO}`
  ctx.fillStyle = '#6D6254'
  ctx.textBaseline = 'top'
  ctx.fillText(`n = ${top.n.toFixed(2)}`, w - 16, 34)
  ctx.textBaseline = 'bottom'
  ctx.fillText(`n = ${bottom.n.toFixed(2)}`, w - 16, h - 12)

  // Protractor: ticks every 10° measured from the normal, both halves.
  ctx.strokeStyle = 'rgba(28,23,19,0.18)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.arc(cx, cy, R, 0, Math.PI * 2)
  ctx.stroke()
  ctx.font = `600 10px ${MONO}`
  ctx.fillStyle = 'rgba(28,23,19,0.45)'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  for (let a = -90; a <= 90; a += 10) {
    for (const sy of [-1, 1]) {
      const x = Math.sin(a * D2R)
      const y = sy * Math.cos(a * D2R)
      const inner = a % 30 === 0 ? R - 10 : R - 5
      ctx.beginPath()
      ctx.moveTo(cx + x * inner, cy + y * inner)
      ctx.lineTo(cx + x * R, cy + y * R)
      ctx.stroke()
      if (a % 30 === 0 && Math.abs(a) !== 90) ctx.fillText(`${Math.abs(a)}°`, cx + x * (R + 14), cy + y * (R + 14))
    }
  }

  // No-way-out zone past the critical angle, in the laser's material.
  const crit = criticalAngle(from.n, into.n)
  if (crit != null) {
    ctx.strokeStyle = 'rgba(225,29,72,0.35)'
    ctx.lineWidth = 8
    for (const sx of [-1, 1]) {
      ctx.beginPath()
      const a0 = Math.atan2(sIn * Math.cos(crit * D2R), sx * Math.sin(crit * D2R))
      // Boundary direction on the same side, chosen so the arc takes the short way round.
      const a1 = sx > 0 ? 0 : sIn < 0 ? -Math.PI : Math.PI
      ctx.arc(cx, cy, R - 4, Math.min(a0, a1), Math.max(a0, a1))
      ctx.stroke()
    }
    ctx.font = `700 10.5px ${SANS}`
    ctx.fillStyle = '#B4123A'
    const lx = cx - Math.sin(65 * D2R) * (R - 22)
    const ly = cy + sIn * Math.cos(65 * D2R) * (R - 22)
    ctx.fillText('light trapped', lx, ly)
  }

  // Normal.
  ctx.setLineDash([6, 6])
  ctx.strokeStyle = 'rgba(28,23,19,0.55)'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(cx, cy - R - 4)
  ctx.lineTo(cx, cy + R + 4)
  ctx.stroke()
  ctx.setLineDash([])
  ctx.font = `600 11px ${SANS}`
  ctx.fillStyle = '#6D6254'
  ctx.textAlign = 'left'
  ctx.fillText('normal', cx + 6, cy - R + 4)

  // Rays.
  const dir = (deg, sy, sx) => [cx + sx * Math.sin(deg * D2R) * R, cy + sy * Math.cos(deg * D2R) * R]
  const [lx, ly] = dir(theta, sIn, -1)
  ray(ctx, lx, ly, cx, cy, 1)
  ray(ctx, cx, cy, ...dir(res.thetaR, sIn, 1), Math.max(0.12, res.R))
  if (!res.tir) ray(ctx, cx, cy, ...dir(res.theta2, -sIn, 1), Math.max(0.12, res.T))

  // Laser pen.
  ctx.save()
  ctx.translate(lx, ly)
  ctx.rotate(Math.atan2(cy - ly, cx - lx))
  ctx.fillStyle = '#1C1713'
  ctx.beginPath()
  ctx.roundRect(-38, -8, 40, 16, 5)
  ctx.fill()
  ctx.fillStyle = LASER
  ctx.fillRect(-2, -4, 4, 8)
  ctx.restore()

  // Angle arcs and labels.
  const arcR = Math.min(70, R * 0.38)
  angleArc(ctx, cx, cy, arcR, sIn, -1, theta, `θ₁ ${theta.toFixed(1)}°`, '#1C1713')
  angleArc(ctx, cx, cy, arcR * 0.8, sIn, 1, res.thetaR, `${res.thetaR.toFixed(1)}°`, '#6D6254')
  if (!res.tir) angleArc(ctx, cx, cy, arcR, -sIn, 1, res.theta2, `θ₂ ${res.theta2.toFixed(1)}°`, '#1251B8')

  // How much light goes where.
  ctx.font = `700 12px ${MONO}`
  const [rx, ry] = dir(res.thetaR, sIn, 1)
  // Placed out along each ray (away from the angle labels near the centre), to its right.
  const along = (x, y) => [cx + (x - cx) * 0.78, cy + (y - cy) * 0.78]
  const [px, py] = along(rx, ry)
  pillLeft(ctx, `${Math.round(res.R * 100)}% bounces`, px + 12, py, '#6D6254', w)
  if (!res.tir) {
    const [tx, ty] = along(...dir(res.theta2, -sIn, 1))
    pillLeft(ctx, `${Math.round(res.T * 100)}% goes through`, tx + 12, ty, '#1251B8', w)
  }
}

function ray(ctx, x0, y0, x1, y1, alpha) {
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.shadowColor = LASER
  ctx.shadowBlur = 10
  ctx.strokeStyle = LASER
  ctx.lineWidth = 3.5
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(x0, y0)
  ctx.lineTo(x1, y1)
  ctx.stroke()
  ctx.shadowBlur = 0
  // Direction arrow at the middle.
  const mx = (x0 + x1) / 2
  const my = (y0 + y1) / 2
  const a = Math.atan2(y1 - y0, x1 - x0)
  ctx.fillStyle = LASER
  ctx.beginPath()
  ctx.moveTo(mx + Math.cos(a) * 8, my + Math.sin(a) * 8)
  ctx.lineTo(mx + Math.cos(a + 2.5) * 8, my + Math.sin(a + 2.5) * 8)
  ctx.lineTo(mx + Math.cos(a - 2.5) * 8, my + Math.sin(a - 2.5) * 8)
  ctx.fill()
  ctx.restore()
}

// Arc from the normal (pointing into half sy) to a ray at `deg` on side sx.
function angleArc(ctx, cx, cy, r, sy, sx, deg, text, color) {
  if (deg < 0.5) return
  const aNormal = Math.atan2(sy, 0)
  const aRay = Math.atan2(sy * Math.cos(deg * D2R), sx * Math.sin(deg * D2R))
  ctx.strokeStyle = color
  ctx.lineWidth = 1.75
  ctx.beginPath()
  ctx.arc(cx, cy, r, Math.min(aNormal, aRay), Math.max(aNormal, aRay))
  ctx.stroke()
  const mid = (aNormal + aRay) / 2
  ctx.font = `700 12px ${MONO}`
  pill(ctx, text, cx + Math.cos(mid) * (r + 30), cy + Math.sin(mid) * (r + 14), color)
}

function pillLeft(ctx, text, x, y, color, w) {
  const tw = ctx.measureText(text).width + 12
  pill(ctx, text, Math.min(w - tw / 2 - 6, x + tw / 2), y, color)
}

function pill(ctx, text, x, y, color) {
  const tw = ctx.measureText(text).width + 12
  ctx.fillStyle = 'rgba(255,255,255,0.92)'
  ctx.beginPath()
  ctx.roundRect(x - tw / 2, y - 11, tw, 22, 11)
  ctx.fill()
  ctx.fillStyle = color
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, x, y + 0.5)
}
