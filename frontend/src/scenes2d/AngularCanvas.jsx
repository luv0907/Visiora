/**
 * VISIORA — Angular Momentum 2D Scene (PhET-style)
 *
 * Spinning disk / turntable with tangential velocity vector,
 * angular velocity arc, and moment of inertia readout.
 */

import { drawArrow, drawInfoBox, drawAngleArc, COLORS } from './canvas/drawUtils'

export const initState = (vars) => ({
  angle: 0,
})

export const tick = (state, dt, vars) => {
  const ω = vars.angularVelocity ?? 3
  state.angle += ω * dt
}

export const draw = (ctx, state, vars, w, h) => {
  const ω  = vars.angularVelocity ?? 3
  const r  = vars.armRadius       ?? 1.5
  const m  = vars.mass1           ?? 60
  const I  = m * r * r
  const L  = I * ω

  const cx = w / 2
  const cy = h / 2
  const diskR = Math.min(w, h) * 0.22
  const scale = diskR / r     // pixels per metre

  // Background
  const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h) * 0.7)
  bg.addColorStop(0, '#F5F0FF')
  bg.addColorStop(1, '#EEF4FF')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, w, h)

  // Disk shadow
  ctx.save()
  ctx.shadowColor = 'rgba(79,70,229,0.2)'
  ctx.shadowBlur = 24
  ctx.beginPath()
  ctx.arc(cx, cy, diskR, 0, Math.PI * 2)
  ctx.fillStyle = '#EDE9FE'
  ctx.fill()
  ctx.restore()

  // Disk
  ctx.save()
  ctx.beginPath()
  ctx.arc(cx, cy, diskR, 0, Math.PI * 2)
  const diskGrad = ctx.createRadialGradient(cx - diskR * 0.2, cy - diskR * 0.2, 4, cx, cy, diskR)
  diskGrad.addColorStop(0, '#A78BFA')
  diskGrad.addColorStop(1, '#7C3AED')
  ctx.fillStyle = diskGrad
  ctx.fill()
  ctx.strokeStyle = '#6D28D9'
  ctx.lineWidth = 2
  ctx.stroke()
  ctx.restore()

  // Spoke (arm)
  const armEndX = cx + Math.cos(state.angle) * diskR
  const armEndY = cy + Math.sin(state.angle) * diskR
  ctx.save()
  ctx.strokeStyle = 'rgba(255,255,255,0.7)'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(cx, cy)
  ctx.lineTo(armEndX, armEndY)
  ctx.stroke()
  ctx.restore()

  // Mass dot on rim
  ctx.save()
  ctx.beginPath()
  ctx.arc(armEndX, armEndY, Math.max(10, Math.cbrt(m) * 4), 0, Math.PI * 2)
  ctx.fillStyle = '#FCD34D'
  ctx.shadowColor = 'rgba(0,0,0,0.2)'
  ctx.shadowBlur = 6
  ctx.fill()
  ctx.strokeStyle = '#F59E0B'
  ctx.lineWidth = 2
  ctx.stroke()
  ctx.restore()

  // Center hub
  ctx.save()
  ctx.beginPath()
  ctx.arc(cx, cy, 8, 0, Math.PI * 2)
  ctx.fillStyle = '#1E1B4B'
  ctx.fill()
  ctx.restore()

  // Tangential velocity arrow
  const vT = ω * r
  const tangX = -Math.sin(state.angle)
  const tangY =  Math.cos(state.angle)
  const vLen = Math.min(vT * scale * 0.18, 90)
  drawArrow(ctx,
    armEndX, armEndY,
    armEndX + tangX * vLen, armEndY + tangY * vLen,
    COLORS.velocity, `v=${vT.toFixed(1)} m/s`, { headLen: 10 })

  // Angular velocity arc
  drawAngleArc(ctx, cx, cy, diskR + 28, 0, ω > 0 ? Math.PI * 0.6 : -Math.PI * 0.6,
    COLORS.tension, `ω=${ω.toFixed(1)} rad/s`)

  // Angular momentum arrow (out of page symbol)
  ctx.save()
  ctx.beginPath()
  ctx.arc(cx, cy, 18, 0, Math.PI * 2)
  ctx.fillStyle = 'white'
  ctx.fill()
  ctx.strokeStyle = COLORS.gravity
  ctx.lineWidth = 2
  ctx.stroke()
  // dot = coming toward viewer (L positive)
  ctx.beginPath()
  ctx.arc(cx, cy, 5, 0, Math.PI * 2)
  ctx.fillStyle = COLORS.gravity
  ctx.fill()
  ctx.fillStyle = COLORS.gravity
  ctx.font = 'bold 10px Inter, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('L', cx, cy + 28)
  ctx.restore()

  // Info box
  drawInfoBox(ctx, [
    'Angular Momentum',
    `ω = ${ω.toFixed(2)} rad/s   r = ${r.toFixed(1)} m`,
    `m = ${m} kg   I = mr² = ${I.toFixed(1)} kg·m²`,
    `L = Iω = ${L.toFixed(2)} kg·m²/s`,
    `v_tangential = ${vT.toFixed(2)} m/s`,
  ], 12, 12)
}

const AngularScene2D = { initState, tick, draw }
export default AngularScene2D
