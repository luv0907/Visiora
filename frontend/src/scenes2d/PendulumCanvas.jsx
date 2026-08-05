/**
 * VISIORA — Pendulum 2D Scene (PhET-style)
 * 
 * Uses Euler integration of the exact pendulum ODE:
 *   α = -(g/L)·sin(θ)
 * 
 * Shows: pivot, string, bob, tension vector, gravity vector,
 * angle arc, velocity arc, energy bars (KE/PE), period readout.
 */

import {
  drawGrid, drawAxes, drawArrow, drawBall,
  drawTrail, drawInfoBox, drawAngleArc, drawLabel, COLORS
} from './canvas/drawUtils'

function makeViewport(w, h) {
  // Center of canvas = pivot point
  const pivotX = w * 0.5
  const pivotY = h * 0.22
  // 1 metre = how many px?
  const scale = Math.min(w, h) * 0.28
  return {
    toCanvas: (wx, wy) => [pivotX + wx * scale, pivotY + wy * scale],
    toWorld:  (cx, cy) => [(cx - pivotX) / scale, (cy - pivotY) / scale],
    pivotX, pivotY, scale,
  }
}

export const initState = (vars) => {
  const θ0 = ((vars.angle ?? 30) * Math.PI) / 180
  return {
    θ:      θ0,
    ω:      0,         // angular velocity
    t:      0,
    trail:  [],        // bob canvas positions
    maxKE:  0,
  }
}

export const tick = (state, dt, vars) => {
  const L = vars.length  ?? 2
  const g = vars.gravity ?? 9.81

  // Euler-Cromer integration (more stable than plain Euler)
  const α = -(g / L) * Math.sin(state.θ)
  state.ω += α * dt
  state.θ += state.ω * dt
  state.t += dt

  // Store bob position for trail (world coords)
  const bx = Math.sin(state.θ) * L
  const by = Math.cos(state.θ) * L   // downward = positive y in world for pendulum
  state.trail.push([bx, by])
  if (state.trail.length > 120) state.trail.shift()
}

export const draw = (ctx, state, vars, w, h) => {
  const L    = vars.length  ?? 2
  const m    = vars.mass1   ?? 1
  const g    = vars.gravity ?? 9.81

  const vp = makeViewport(w, h)
  const { toCanvas, pivotX, pivotY, scale } = vp

  // ── Background ───────────────────────────────────────────────────
  const bg = ctx.createLinearGradient(0, 0, 0, h)
  bg.addColorStop(0, '#F0F4FF')
  bg.addColorStop(1, '#FAF7F2')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, w, h)

  // Light grid (very subtle)
  ctx.save()
  ctx.strokeStyle = 'rgba(148,163,184,0.15)'
  ctx.lineWidth = 1
  for (let x = 0; x < w; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke() }
  for (let yy = 0; yy < h; yy += 40) { ctx.beginPath(); ctx.moveTo(0, yy); ctx.lineTo(w, yy); ctx.stroke() }
  ctx.restore()

  // ── Ceiling bar ──────────────────────────────────────────────────
  ctx.save()
  ctx.fillStyle = '#CBD5E1'
  ctx.fillRect(pivotX - 50, pivotY - 12, 100, 12)
  // Hatch marks
  ctx.strokeStyle = '#94A3B8'
  ctx.lineWidth = 1
  for (let xi = 0; xi < 12; xi++) {
    const x0 = pivotX - 50 + xi * 10
    ctx.beginPath(); ctx.moveTo(x0, pivotY - 12); ctx.lineTo(x0 - 8, pivotY - 20); ctx.stroke()
  }
  ctx.restore()

  // Bob position in canvas coords
  const bobWX = Math.sin(state.θ) * L
  const bobWY = Math.cos(state.θ) * L
  const [bx, by] = toCanvas(bobWX, bobWY)

  // ── Trail ────────────────────────────────────────────────────────
  const trailPts = state.trail.map(([wx, wy]) => toCanvas(wx, wy))
  drawTrail(ctx, trailPts, COLORS.ballA, 80)

  // ── String ───────────────────────────────────────────────────────
  ctx.save()
  ctx.strokeStyle = '#64748B'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(pivotX, pivotY)
  ctx.lineTo(bx, by)
  ctx.stroke()
  ctx.restore()

  // ── Pivot point ──────────────────────────────────────────────────
  ctx.save()
  ctx.beginPath()
  ctx.arc(pivotX, pivotY, 6, 0, Math.PI * 2)
  ctx.fillStyle = '#334155'
  ctx.fill()
  ctx.restore()

  // ── Bob ──────────────────────────────────────────────────────────
  const bobR = Math.max(10, Math.min(22, scale * 0.12 * Math.cbrt(m)))
  drawBall(ctx, bx, by, bobR, COLORS.ballA)

  // ── Tension arrow (along string, toward pivot) ───────────────────
  const tensionMag = m * g * Math.cos(state.θ) + m * state.ω * state.ω * L
  const dirX = (pivotX - bx)
  const dirY = (pivotY - by)
  const dirLen = Math.hypot(dirX, dirY)
  const tLen = Math.min(tensionMag * 0.6, 70)
  if (dirLen > 0 && tLen > 5) {
    drawArrow(ctx,
      bx, by,
      bx + (dirX / dirLen) * tLen,
      by + (dirY / dirLen) * tLen,
      COLORS.tension, `T=${tensionMag.toFixed(1)} N`, { headLen: 9 }
    )
  }

  // ── Gravity arrow (downward) ─────────────────────────────────────
  const gArrowLen = Math.min(m * g * 0.4, 65)
  drawArrow(ctx, bx, by, bx, by + gArrowLen,
    COLORS.gravity, `mg=${(m*g).toFixed(1)} N`, { headLen: 9 })

  // ── Angle arc ────────────────────────────────────────────────────
  // Draw from vertical downward at pivot
  const arcR = Math.min(scale * L * 0.35, 60)
  // angle=0 is downward (+y canvas), θ is offset from that
  drawAngleArc(ctx, pivotX, pivotY, arcR,
    Math.PI / 2 - state.θ, Math.PI / 2,
    '#8B5CF6',
    `${(state.θ * 180 / Math.PI).toFixed(1)}°`)

  // ── Energy bars ──────────────────────────────────────────────────
  const KE = 0.5 * m * (state.ω * L) ** 2
  const h_bob = L - L * Math.cos(state.θ)          // height above lowest
  const PE = m * g * h_bob
  const E  = KE + PE
  state.maxKE = Math.max(state.maxKE, KE)
  const barMaxH = Math.min(h * 0.28, 90)
  const barW    = 18
  const barX    = w - 60
  const barBaseY = h - 50

  ctx.save()
  // KE bar
  const keH = E > 0 ? (KE / E) * barMaxH : 0
  ctx.fillStyle = '#3B82F6'
  ctx.beginPath(); ctx.roundRect(barX, barBaseY - keH, barW, keH, [4, 4, 0, 0]); ctx.fill()
  ctx.fillStyle = COLORS.textMuted
  ctx.font = '10px Inter, system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('KE', barX + barW / 2, barBaseY + 14)

  // PE bar
  const peH = E > 0 ? (PE / E) * barMaxH : 0
  ctx.fillStyle = '#EF4444'
  ctx.beginPath(); ctx.roundRect(barX + barW + 6, barBaseY - peH, barW, peH, [4, 4, 0, 0]); ctx.fill()
  ctx.fillText('PE', barX + barW + 6 + barW / 2, barBaseY + 14)

  // bar outline
  ctx.strokeStyle = 'rgba(148,163,184,0.4)'
  ctx.lineWidth = 1
  ctx.strokeRect(barX, barBaseY - barMaxH, barW, barMaxH)
  ctx.strokeRect(barX + barW + 6, barBaseY - barMaxH, barW, barMaxH)
  ctx.restore()

  // ── Period readout ───────────────────────────────────────────────
  const T = 2 * Math.PI * Math.sqrt(L / g)

  drawInfoBox(ctx, [
    'Pendulum',
    `L = ${L.toFixed(1)} m   m = ${m.toFixed(1)} kg`,
    `θ = ${(state.θ * 180 / Math.PI).toFixed(1)}°`,
    `T = ${T.toFixed(2)} s   g = ${g} m/s²`,
    `ω = ${state.ω.toFixed(2)} rad/s`,
  ], 12, 12)
}

export const hitTest = (state, cx, cy, vars, w, h) => {
  const L = vars.length ?? 2
  const vp = makeViewport(w, h)
  const [bx, by] = vp.toCanvas(Math.sin(state.θ) * L, Math.cos(state.θ) * L)
  const R = Math.max(10, Math.min(22, vp.scale * 0.12 * Math.cbrt(vars.mass1 ?? 1)))
  if (Math.hypot(cx - bx, cy - by) < R + 12) return 'bob'
  return null
}

export const onDrag = (state, target, cx, cy, vars, w, h) => {
  if (target !== 'bob') return
  const vp = makeViewport(w, h)
  const [wx, wy] = vp.toWorld(cx, cy)
  const L = vars.length ?? 2
  // Compute θ from drag position relative to pivot (world)
  state.θ = Math.atan2(wx, wy)
  state.ω = 0   // reset velocity on drag
  state.trail = []
}

const PendulumScene2D = { initState, tick, draw, hitTest, onDrag }
export default PendulumScene2D
