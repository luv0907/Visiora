/**
 * VISIORA — Free Fall / Gravity 2D Scene (PhET-style)
 *
 * Galileo's demonstration: two balls (different masses) dropped from the
 * same height fall at the same rate.
 *
 * Shows: both balls, gravity vectors (scaled by mass), velocity vectors
 * (growing over time), displacement labels, timer, ground impact flash.
 */

import {
  drawAxes, drawArrow, drawBall,
  drawTrail, drawGround, drawMeasureLine,
  drawInfoBox, COLORS
} from './canvas/drawUtils'

const WORLD = { xMin: -5, xMax: 5, yMin: -2, yMax: 28 }

function makeViewport(w, h) {
  const padL = 48, padR = 24, padT = 24, padB = 48
  const ph = h - padT - padB
  const scaleY = ph / (WORLD.yMax - WORLD.yMin)
  const midX = w / 2

  return {
    toCanvas: (wx, wy) => [midX + wx * (w * 0.07), padT + (WORLD.yMax - wy) * scaleY],
    toWorld:  (cx, cy) => [(cx - midX) / (w * 0.07), WORLD.yMax - (cy - padT) / scaleY],
    scaleY, midX,
  }
}

export const initState = (vars) => ({
  t: 0,
  y1: vars.height ?? 20,
  y2: vars.height ?? 20,
  v1: 0,
  v2: 0,
  landed1: false,
  landed2: false,
  trail1: [],
  trail2: [],
  flash1: 0,
  flash2: 0,
})

export const tick = (state, dt, vars) => {
  const g  = vars.gravity ?? 9.81
  const h0 = vars.height  ?? 20

  if (!state.landed1) {
    state.v1 += g * dt
    state.y1 -= state.v1 * dt
    if (state.y1 <= 0) { state.y1 = 0; state.landed1 = true; state.flash1 = 0.5 }
    else state.trail1.push([state.y1])
    if (state.trail1.length > 100) state.trail1.shift()
  }

  if (!state.landed2) {
    state.v2 += g * dt
    state.y2 -= state.v2 * dt
    if (state.y2 <= 0) { state.y2 = 0; state.landed2 = true; state.flash2 = 0.5 }
    else state.trail2.push([state.y2])
    if (state.trail2.length > 100) state.trail2.shift()
  }

  state.t += dt
  state.flash1 = Math.max(0, state.flash1 - dt * 2)
  state.flash2 = Math.max(0, state.flash2 - dt * 2)
}

export const draw = (ctx, state, vars, w, h) => {
  const g  = vars.gravity ?? 9.81
  const m1 = vars.mass1   ?? 1
  const m2 = vars.mass2   ?? 50
  const h0 = vars.height  ?? 20

  const vp = makeViewport(w, h)
  const { toCanvas, scaleY, midX } = vp

  // Background
  const bg = ctx.createLinearGradient(0, 0, 0, h)
  bg.addColorStop(0, '#EEF4FF')
  bg.addColorStop(1, '#FAF5F0')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, w, h)

  // Y-axis only
  ctx.save()
  ctx.strokeStyle = COLORS.axis
  ctx.lineWidth = 1.5
  const [, cyTop]    = toCanvas(0, WORLD.yMax - 1)
  const [, cyBottom] = toCanvas(0, 0)
  ctx.beginPath(); ctx.moveTo(midX, cyTop); ctx.lineTo(midX, cyBottom); ctx.stroke()
  // Y ticks
  ctx.fillStyle = COLORS.axisLabel
  ctx.font = '11px Inter, system-ui, sans-serif'
  ctx.textAlign = 'right'
  for (let y = 0; y <= h0; y += 5) {
    const [, cy] = toCanvas(0, y)
    ctx.beginPath(); ctx.moveTo(midX - 5, cy); ctx.lineTo(midX + 5, cy); ctx.stroke()
    ctx.fillText(`${y}`, midX - 8, cy + 4)
  }
  ctx.fillStyle = COLORS.axisLabel
  ctx.font = 'bold 12px Inter, system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('height (m)', midX - 30, cyTop - 8)
  ctx.restore()

  // Ground
  const [gx1, gy] = toCanvas(-5, 0)
  const [gx2,   ] = toCanvas(5, 0)
  drawGround(ctx, gx1, gy, gx2)

  // Drop height dashed line
  const [, dyLine] = toCanvas(0, h0)
  ctx.save()
  ctx.strokeStyle = 'rgba(148,163,184,0.7)'
  ctx.setLineDash([6, 4])
  ctx.lineWidth = 1
  ctx.beginPath(); ctx.moveTo(50, dyLine); ctx.lineTo(w - 20, dyLine); ctx.stroke()
  ctx.setLineDash([])
  ctx.fillStyle = COLORS.textMuted
  ctx.font = '11px Inter, sans-serif'
  ctx.textAlign = 'left'
  ctx.fillText(`Drop height = ${h0} m`, 54, dyLine - 5)
  ctx.restore()

  // Ball x offsets (in world)
  const wx1 = -1.5   // left ball
  const wx2 =  1.5   // right ball

  // Trails
  const trail1Pts = state.trail1.map(([y]) => toCanvas(wx1, y))
  const trail2Pts = state.trail2.map(([y]) => toCanvas(wx2, y))
  drawTrail(ctx, trail1Pts, COLORS.ballA, 80)
  drawTrail(ctx, trail2Pts, COLORS.ballB, 80)

  // Balls
  const R1 = Math.max(12, Math.min(28, 12 * Math.cbrt(m1)))
  const R2 = Math.max(12, Math.min(28, 12 * Math.cbrt(m2)))
  const [b1x, b1y] = toCanvas(wx1, state.y1)
  const [b2x, b2y] = toCanvas(wx2, state.y2)

  // Impact flash
  if (state.flash1 > 0) {
    ctx.save(); ctx.globalAlpha = state.flash1
    ctx.beginPath(); ctx.arc(b1x, b1y, R1 + 16, 0, Math.PI * 2)
    ctx.fillStyle = '#FEF08A'; ctx.fill(); ctx.restore()
  }
  if (state.flash2 > 0) {
    ctx.save(); ctx.globalAlpha = state.flash2
    ctx.beginPath(); ctx.arc(b2x, b2y, R2 + 16, 0, Math.PI * 2)
    ctx.fillStyle = '#FEF08A'; ctx.fill(); ctx.restore()
  }

  drawBall(ctx, b1x, b1y, R1, COLORS.ballA, { label: `${m1}kg` })
  drawBall(ctx, b2x, b2y, R2, COLORS.ballB, { label: `${m2}kg` })

  // Gravity arrows (scaled by mass — same acceleration, different force)
  const gArrowBase = 50
  const gLen1 = gArrowBase * Math.min(1, m1 / 10)
  const gLen2 = gArrowBase * Math.min(1, m2 / 10)
  if (!state.landed1)
    drawArrow(ctx, b1x, b1y + R1, b1x, b1y + R1 + gLen1,
      COLORS.gravity, `F=${(m1*g).toFixed(0)}N`, { headLen: 8, fontSize: 10 })
  if (!state.landed2)
    drawArrow(ctx, b2x, b2y + R2, b2x, b2y + R2 + gLen2,
      COLORS.gravity, `F=${(m2*g).toFixed(0)}N`, { headLen: 8, fontSize: 10 })

  // Velocity arrows (upward since falling, so we show magnitude downward)
  if (!state.landed1 && state.v1 > 0.5)
    drawArrow(ctx, b1x, b1y - R1, b1x, b1y - R1 - Math.min(state.v1 * 2.5, 60),
      COLORS.velocity, `v=${state.v1.toFixed(1)} m/s`, { headLen: 8, fontSize: 10 })
  if (!state.landed2 && state.v2 > 0.5)
    drawArrow(ctx, b2x, b2y - R2, b2x, b2y - R2 - Math.min(state.v2 * 2.5, 60),
      COLORS.velocity, `v=${state.v2.toFixed(1)} m/s`, { headLen: 8, fontSize: 10 })

  // Labels
  ctx.fillStyle = COLORS.ballA
  ctx.font = 'bold 12px Inter, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(`Ball 1 (${m1} kg)`, b1x, b1y - R1 - 40)
  ctx.fillStyle = COLORS.ballB
  ctx.fillText(`Ball 2 (${m2} kg)`, b2x, b2y - R2 - 40)

  // Info box
  drawInfoBox(ctx, [
    'Free Fall (Galileo)',
    `g = ${g} m/s²`,
    `t = ${state.t.toFixed(2)} s`,
    `v = ${Math.max(state.v1, state.v2).toFixed(1)} m/s`,
    state.landed1 && state.landed2 ? '✅ Same landing time!' : 'Both fall identically',
  ], 12, 12)
}

export const initState_ = initState
const GravityScene2D = { initState, tick, draw }
export default GravityScene2D
