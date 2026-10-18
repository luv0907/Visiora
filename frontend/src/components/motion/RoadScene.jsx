/**
 * VISIORA — RoadScene
 * A car on a 100 m road, drawn at its exact position. Ticker-tape dots mark where
 * the car was at every whole second, so spacing shows speed. Arrows show v and a.
 */
import React from 'react'
import { useCanvas } from './useCanvas'
import { MOTION_COLORS } from './colors'
import { stateAt, ROAD_LENGTH } from '../../engine/motion'


const MONO = '"JetBrains Mono", monospace'
const SANS = '"Plus Jakarta Sans", system-ui, sans-serif'

export default function RoadScene({ u, a, state, flagAt }) {
  const { ref } = useCanvas((ctx, w, h) => draw(ctx, w, h, { u, a, state, flagAt }), [u, a, state, flagAt])
  return <canvas ref={ref} className="ml-canvas" role="img" aria-label={`Car at ${state.s.toFixed(1)} metres moving at ${state.v.toFixed(1)} metres per second`} />
}

function draw(ctx, w, h, { u, a, state, flagAt }) {
  // The car's front bumper marks its position, so leave room for the whole car at 0 m.
  const carW = Math.max(52, Math.min(92, w * 0.085))
  const padL = carW + 14
  const padR = 36
  const X = m => padL + (m / ROAD_LENGTH) * (w - padL - padR)
  const roadH = Math.max(46, Math.min(72, h * 0.2))
  const roadY = h * 0.6
  const scale = (w - padL - padR) / ROAD_LENGTH

  // Sky and ground.
  const sky = ctx.createLinearGradient(0, 0, 0, roadY)
  sky.addColorStop(0, '#E6EEF3')
  sky.addColorStop(1, '#F7F3EB')
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, w, roadY)
  ctx.fillStyle = '#DCE6CC'
  ctx.fillRect(0, roadY - 6, w, 6)
  ctx.fillStyle = '#EFE8DC'
  ctx.fillRect(0, roadY + roadH, w, h - roadY - roadH)

  // Distant hills for depth (static).
  ctx.fillStyle = '#D5E0C6'
  ctx.beginPath()
  ctx.moveTo(0, roadY - 6)
  for (let x = 0; x <= w; x += 8) ctx.lineTo(x, roadY - 6 - 22 - 14 * Math.sin(x / 90) - 8 * Math.sin(x / 37))
  ctx.lineTo(w, roadY - 6)
  ctx.fill()

  // Road.
  ctx.fillStyle = '#3A332D'
  ctx.fillRect(0, roadY, w, roadH)
  ctx.strokeStyle = '#F0DDA8'
  ctx.lineWidth = 2
  ctx.setLineDash([14, 12])
  ctx.beginPath()
  ctx.moveTo(0, roadY + roadH / 2)
  ctx.lineTo(w, roadY + roadH / 2)
  ctx.stroke()
  ctx.setLineDash([])

  // Start and finish lines.
  ctx.fillStyle = '#fff'
  ctx.fillRect(X(0) - 1.5, roadY, 3, roadH)
  const cell = roadH / 6
  for (let r = 0; r < 6; r++) for (let c = 0; c < 2; c++) {
    ctx.fillStyle = (r + c) % 2 ? '#1C1713' : '#fff'
    ctx.fillRect(X(ROAD_LENGTH) + c * cell - cell, roadY + r * cell, cell, cell)
  }

  // Ruler: ticks every 10 m (minor every 5 m).
  const rulerY = roadY + roadH + 30
  ctx.strokeStyle = '#B5A285'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(X(0), rulerY)
  ctx.lineTo(X(ROAD_LENGTH), rulerY)
  for (let m = 0; m <= ROAD_LENGTH; m += 5) {
    const len = m % 10 === 0 ? 7 : 4
    ctx.moveTo(X(m) + 0.5, rulerY - len)
    ctx.lineTo(X(m) + 0.5, rulerY + len)
  }
  ctx.stroke()
  ctx.font = `600 ${w < 500 ? 9 : 11}px ${MONO}`
  ctx.fillStyle = MOTION_COLORS.muted
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  const labelEvery = w < 500 ? 20 : 10
  for (let m = 0; m <= ROAD_LENGTH; m += labelEvery) ctx.fillText(m === ROAD_LENGTH ? `${m} m` : `${m}`, X(m), rulerY + 9)

  // Ticker tape: where the car was at each whole second.
  const tapeY = roadY + roadH + 12
  ctx.fillStyle = '#FCFAF7'
  ctx.fillRect(X(0) - 6, tapeY - 6, X(ROAD_LENGTH) - X(0) + 12, 12)
  for (let k = 0; k <= Math.floor(state.t + 1e-9); k++) {
    const sk = stateAt(k, u, a).s
    ctx.beginPath()
    ctx.arc(X(sk), tapeY, 3.5, 0, Math.PI * 2)
    ctx.fillStyle = MOTION_COLORS.distance
    ctx.fill()
  }

  // Target flag.
  if (flagAt != null) {
    const fx = X(flagAt)
    ctx.strokeStyle = '#483E36'
    ctx.lineWidth = 2.5
    ctx.beginPath()
    ctx.moveTo(fx, roadY + 4)
    ctx.lineTo(fx, roadY - 54)
    ctx.stroke()
    ctx.fillStyle = MOTION_COLORS.slowDown
    ctx.beginPath()
    ctx.moveTo(fx, roadY - 54)
    ctx.lineTo(fx + 24, roadY - 46)
    ctx.lineTo(fx, roadY - 38)
    ctx.fill()
    ctx.font = `700 11px ${MONO}`
    ctx.fillStyle = MOTION_COLORS.ink
    ctx.textAlign = 'center'
    ctx.textBaseline = 'bottom'
    ctx.fillText(`${flagAt} m`, fx, roadY - 58)
  }

  // Car: the front bumper sits exactly at distance s.
  const carH = carW * 0.42
  const front = X(state.s)
  const left = front - carW
  const bodyY = roadY + roadH * 0.5 - carH * 0.55
  const wheelR = carH * 0.3
  drawCar(ctx, left, bodyY, carW, carH, wheelR, state.s, scale)

  // Arrows above the car.
  const arrowBase = bodyY - carH * 0.55 - 14
  const kv = (w * 0.22) / 30 // px per m/s
  ctx.font = `700 12px ${MONO}`
  if (state.v > 0) {
    arrow(ctx, front - carW / 2, arrowBase, front - carW / 2 + state.v * kv, arrowBase, MOTION_COLORS.speed)
    label(ctx, `v = ${state.v.toFixed(1)} m/s`, front - carW / 2, arrowBase - 9, MOTION_COLORS.speed, w)
  }
  if (state.a !== 0) {
    const ka = (w * 0.12) / 5
    const col = state.a > 0 ? MOTION_COLORS.speedUp : MOTION_COLORS.slowDown
    const y = arrowBase - 34
    arrow(ctx, front - carW / 2, y, front - carW / 2 + state.a * ka, y, col)
    label(ctx, `a = ${state.a.toFixed(1)} m/s²`, front - carW / 2, y - 9, col, w)
  }
}

function drawCar(ctx, x, y, w, h, r, s, scale) {
  // Shadow.
  ctx.fillStyle = 'rgba(0,0,0,0.25)'
  ctx.beginPath()
  ctx.ellipse(x + w / 2, y + h + r * 0.55, w * 0.48, r * 0.35, 0, 0, Math.PI * 2)
  ctx.fill()
  // Cabin.
  ctx.fillStyle = '#0B3F94'
  ctx.beginPath()
  ctx.moveTo(x + w * 0.22, y + h * 0.35)
  ctx.lineTo(x + w * 0.34, y - h * 0.28)
  ctx.lineTo(x + w * 0.68, y - h * 0.28)
  ctx.lineTo(x + w * 0.84, y + h * 0.35)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = '#BFDBFE'
  ctx.beginPath()
  ctx.moveTo(x + w * 0.3, y + h * 0.3)
  ctx.lineTo(x + w * 0.38, y - h * 0.16)
  ctx.lineTo(x + w * 0.5, y - h * 0.16)
  ctx.lineTo(x + w * 0.5, y + h * 0.3)
  ctx.closePath()
  ctx.moveTo(x + w * 0.54, y + h * 0.3)
  ctx.lineTo(x + w * 0.54, y - h * 0.16)
  ctx.lineTo(x + w * 0.66, y - h * 0.16)
  ctx.lineTo(x + w * 0.76, y + h * 0.3)
  ctx.closePath()
  ctx.fill()
  // Body.
  ctx.fillStyle = '#1251B8'
  ctx.beginPath()
  ctx.roundRect(x, y + h * 0.25, w, h * 0.6, h * 0.2)
  ctx.fill()
  ctx.fillStyle = '#F0DDA8'
  ctx.fillRect(x + w - 5, y + h * 0.38, 4, h * 0.14)
  ctx.fillStyle = '#E11D48'
  ctx.fillRect(x + 1, y + h * 0.38, 3, h * 0.14)
  // Wheels roll without slipping: angle = distance / radius (in world units).
  const wheelWorldR = r / scale
  const turn = s / wheelWorldR
  for (const cx of [x + w * 0.24, x + w * 0.78]) {
    const cy = y + h * 0.85
    ctx.fillStyle = '#1C1713'
    ctx.beginPath()
    ctx.arc(cx, cy, r, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#CFC0A7'
    ctx.beginPath()
    ctx.arc(cx, cy, r * 0.5, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = '#483E36'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    for (let k = 0; k < 3; k++) {
      const ang = turn + (k * Math.PI * 2) / 3
      ctx.moveTo(cx, cy)
      ctx.lineTo(cx + Math.cos(ang) * r * 0.5, cy + Math.sin(ang) * r * 0.5)
    }
    ctx.stroke()
  }
}

function arrow(ctx, x0, y, x1, _y1, color) {
  const dir = Math.sign(x1 - x0) || 1
  const len = Math.abs(x1 - x0)
  const head = Math.min(10, len * 0.5)
  ctx.strokeStyle = color
  ctx.fillStyle = color
  ctx.lineWidth = 4
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(x0, y)
  ctx.lineTo(x1 - dir * head, y)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(x1, y)
  ctx.lineTo(x1 - dir * head, y - head * 0.7)
  ctx.lineTo(x1 - dir * head, y + head * 0.7)
  ctx.closePath()
  ctx.fill()
}

function label(ctx, text, x, y, color, w) {
  ctx.font = `700 12px ${MONO}`
  const tw = ctx.measureText(text).width
  const lx = Math.min(w - tw / 2 - 6, Math.max(tw / 2 + 6, x))
  ctx.textAlign = 'center'
  ctx.textBaseline = 'bottom'
  ctx.lineWidth = 4
  ctx.strokeStyle = 'rgba(247,243,235,0.95)'
  ctx.strokeText(text, lx, y)
  ctx.fillStyle = color
  ctx.fillText(text, lx, y)
  ctx.font = `600 11px ${SANS}`
}
