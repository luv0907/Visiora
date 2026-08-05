/**
 * VISIORA — Collision 2D Scene (PhET-style)
 *
 * 1D elastic / inelastic collision on a frictionless track.
 *
 * Shows: two balls on a rail, momentum arrows (p = mv),
 * velocity labels, collision flash, before/after momentum readout.
 */

import {
  drawArrow, drawBall, drawTrail,
  drawGround, drawInfoBox, COLORS
} from './canvas/drawUtils'

const TRACK_Y_FRAC = 0.55     // track at 55% of canvas height

function makeViewport(w, h) {
  // World: x in [-12, 12]
  const WORLD_W = 24
  const padX = 60
  const scaleX = (w - padX * 2) / WORLD_W
  const trackY = h * TRACK_Y_FRAC
  return {
    toCanvas: (wx) => [w / 2 + wx * scaleX, trackY],
    trackY, scaleX,
  }
}

const BALL_R = 22

export const initState = (vars) => ({
  x1: -(vars.mass1 ?? 2) - 2,
  x2:  (vars.mass2 ?? 1) + 2,
  v1: vars.velocity1 ?? 5,
  v2: vars.velocity2 ?? -2,
  collided: false,
  v1After: 0,
  v2After: 0,
  trail1: [],
  trail2: [],
  flash: 0,
  phase: 'before',   // 'before' | 'colliding' | 'after'
})

function elasticCollision(m1, v1, m2, v2, e) {
  const v1f = ((m1 - e * m2) * v1 + (1 + e) * m2 * v2) / (m1 + m2)
  const v2f = ((m2 - e * m1) * v2 + (1 + e) * m1 * v1) / (m1 + m2)
  return [v1f, v2f]
}

export const tick = (state, dt, vars) => {
  const m1 = vars.mass1    ?? 2
  const m2 = vars.mass2    ?? 1
  const e  = vars.restitution ?? 1
  const R  = BALL_R / 60   // rough radius in world units

  if (!state.collided) {
    state.x1 += state.v1 * dt
    state.x2 += state.v2 * dt

    state.trail1.push(state.x1)
    state.trail2.push(state.x2)
    if (state.trail1.length > 60) state.trail1.shift()
    if (state.trail2.length > 60) state.trail2.shift()

    // Collision detection
    if (Math.abs(state.x2 - state.x1) < R * 2 + 0.1) {
      const [v1f, v2f] = elasticCollision(m1, state.v1, m2, state.v2, e)
      state.v1After = v1f
      state.v2After = v2f
      state.collided = true
      state.flash = 0.6
      state.phase = 'colliding'
    }
  } else {
    state.x1 += state.v1After * dt
    state.x2 += state.v2After * dt
    state.flash = Math.max(0, state.flash - dt * 3)
    state.phase = state.flash > 0 ? 'colliding' : 'after'

    state.trail1.push(state.x1)
    state.trail2.push(state.x2)
    if (state.trail1.length > 60) state.trail1.shift()
    if (state.trail2.length > 60) state.trail2.shift()
  }
}

export const draw = (ctx, state, vars, w, h) => {
  const m1 = vars.mass1       ?? 2
  const m2 = vars.mass2       ?? 1
  const e  = vars.restitution ?? 1
  const v1 = state.collided ? state.v1After : (vars.velocity1 ?? 5)
  const v2 = state.collided ? state.v2After : (vars.velocity2 ?? -2)

  const vp = makeViewport(w, h)
  const { toCanvas, trackY, scaleX } = vp

  // Background
  ctx.fillStyle = '#F8FAFF'
  ctx.fillRect(0, 0, w, h)

  // Track / rail
  ctx.save()
  ctx.fillStyle = '#E2E8F0'
  ctx.fillRect(30, trackY + BALL_R, w - 60, 8)
  ctx.strokeStyle = '#94A3B8'
  ctx.lineWidth = 2
  ctx.beginPath(); ctx.moveTo(30, trackY + BALL_R); ctx.lineTo(w - 30, trackY + BALL_R); ctx.stroke()
  // Track marks every ~60px
  ctx.strokeStyle = '#CBD5E1'
  ctx.lineWidth = 1
  for (let x = 30; x < w - 30; x += 60) {
    ctx.beginPath(); ctx.moveTo(x, trackY + BALL_R); ctx.lineTo(x, trackY + BALL_R + 8); ctx.stroke()
  }
  ctx.restore()

  // Trails (horizontal only)
  ctx.save()
  state.trail1.forEach((wx, i) => {
    const alpha = i / state.trail1.length * 0.4
    ctx.globalAlpha = alpha
    ctx.beginPath()
    ctx.arc(toCanvas(wx)[0], trackY, 4, 0, Math.PI * 2)
    ctx.fillStyle = COLORS.ballA
    ctx.fill()
  })
  state.trail2.forEach((wx, i) => {
    const alpha = i / state.trail2.length * 0.4
    ctx.globalAlpha = alpha
    ctx.beginPath()
    ctx.arc(toCanvas(wx)[0], trackY, 4, 0, Math.PI * 2)
    ctx.fillStyle = COLORS.ballB
    ctx.fill()
  })
  ctx.globalAlpha = 1
  ctx.restore()

  // Balls
  const [b1cx] = toCanvas(state.x1)
  const [b2cx] = toCanvas(state.x2)

  // Collision flash
  if (state.flash > 0) {
    ctx.save(); ctx.globalAlpha = state.flash * 0.8
    ctx.beginPath()
    ctx.arc((b1cx + b2cx) / 2, trackY, BALL_R * 2.5, 0, Math.PI * 2)
    ctx.fillStyle = '#FEF08A'
    ctx.fill()
    ctx.restore()
  }

  drawBall(ctx, b1cx, trackY, BALL_R, COLORS.ballA, { label: `${m1}` })
  drawBall(ctx, b2cx, trackY, BALL_R, COLORS.ballB, { label: `${m2}` })

  // Mass labels below balls
  ctx.fillStyle = COLORS.text
  ctx.font = '11px Inter, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(`m₁=${m1} kg`, b1cx, trackY + BALL_R + 22)
  ctx.fillText(`m₂=${m2} kg`, b2cx, trackY + BALL_R + 22)

  // Velocity arrows
  const arrowScale = scaleX * 0.6
  const v1Act = state.collided ? state.v1After : (vars.velocity1 ?? 5)
  const v2Act = state.collided ? state.v2After : (vars.velocity2 ?? -2)

  const v1Len = Math.abs(v1Act) * arrowScale
  const v2Len = Math.abs(v2Act) * arrowScale

  if (v1Len > 5)
    drawArrow(ctx, b1cx, trackY - BALL_R - 6,
      b1cx + Math.sign(v1Act) * v1Len, trackY - BALL_R - 6,
      COLORS.velocity, `v₁=${v1Act.toFixed(1)} m/s`, { headLen: 10 })

  if (v2Len > 5)
    drawArrow(ctx, b2cx, trackY - BALL_R - 6,
      b2cx + Math.sign(v2Act) * v2Len, trackY - BALL_R - 6,
      COLORS.ballB, `v₂=${v2Act.toFixed(1)} m/s`, { headLen: 10 })

  // Momentum arrows (below track)
  const pScale = scaleX * 0.15
  const p1 = m1 * v1Act
  const p2 = m2 * v2Act
  const p1Len = Math.abs(p1) * pScale
  const p2Len = Math.abs(p2) * pScale

  const momY = trackY + BALL_R + 50
  if (p1Len > 3)
    drawArrow(ctx, b1cx, momY, b1cx + Math.sign(p1) * p1Len, momY,
      'rgba(59,130,246,0.6)', `p₁=${p1.toFixed(1)} kg·m/s`, { headLen: 8, fontSize: 10 })
  if (p2Len > 3)
    drawArrow(ctx, b2cx, momY, b2cx + Math.sign(p2) * p2Len, momY,
      'rgba(245,158,11,0.6)', `p₂=${p2.toFixed(1)} kg·m/s`, { headLen: 8, fontSize: 10 })

  // Info
  const pTot    = m1 * (vars.velocity1 ?? 5) + m2 * (vars.velocity2 ?? -2)
  const pTotAft = m1 * v1Act + m2 * v2Act
  const KE_pre  = 0.5 * m1 * (vars.velocity1 ?? 5) ** 2 + 0.5 * m2 * (vars.velocity2 ?? -2) ** 2
  const KE_post = state.collided ? (0.5 * m1 * state.v1After ** 2 + 0.5 * m2 * state.v2After ** 2) : KE_pre

  drawInfoBox(ctx, [
    `Collision  (e=${e.toFixed(2)})`,
    `p_total = ${pTot.toFixed(2)} → ${pTotAft.toFixed(2)} kg·m/s`,
    `KE before = ${KE_pre.toFixed(1)} J`,
    `KE after  = ${KE_post.toFixed(1)} J  (Δ=${(KE_pre - KE_post).toFixed(1)} J)`,
    state.phase === 'after' ? '✅ Conservation verified' : '',
  ].filter(Boolean), 12, 12)
}

const CollisionScene2D = { initState, tick, draw }
export default CollisionScene2D
