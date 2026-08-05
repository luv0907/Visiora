/**
 * VISIORA — Projectile Motion 2D Scene (PhET-style)
 *
 * Scene API (consumed by PhysicsCanvas):
 *   initState(vars) → state object
 *   tick(state, dt, vars) → mutates state
 *   draw(ctx, state, vars, w, h)
 *   hitTest(state, cx, cy, vars, w, h) → target | null
 *   onDrag(state, target, cx, cy, vars, w, h)
 */

import {
  drawGrid, drawAxes, drawArrow, drawBall,
  drawTrail, drawGround, drawMeasureLine,
  drawInfoBox, drawAngleArc, COLORS
} from './canvas/drawUtils'

// ── World bounds (metres) ─────────────────────────────────────────
const WORLD = { xMin: -2, xMax: 42, yMin: -2, yMax: 28 }

function makeViewport(w, h) {
  const padL = 52, padR = 24, padT = 24, padB = 48
  const pw = w - padL - padR
  const ph = h - padT - padB
  const scaleX = pw / (WORLD.xMax - WORLD.xMin)
  const scaleY = ph / (WORLD.yMax - WORLD.yMin)

  return {
    toCanvas: (wx, wy) => [
      padL + (wx - WORLD.xMin) * scaleX,
      padT + (WORLD.yMax - wy) * scaleY,   // y flipped
    ],
    toWorld: (cx, cy) => [
      WORLD.xMin + (cx - padL) / scaleX,
      WORLD.yMax - (cy - padT) / scaleY,
    ],
    scaleX, scaleY, padL, padT,
  }
}

// ── Scene API ─────────────────────────────────────────────────────

export const initState = (vars) => ({
  t:       0,
  x:       0,
  y:       vars.height ?? 0,
  vx:      0,
  vy:      0,
  landed:  false,
  trail:   [],
  maxH:    vars.height ?? 0,
  rangeX:  0,
})

export const tick = (state, dt, vars) => {
  if (state.landed) return

  const v0   = vars.velocity ?? 20
  const θdeg = vars.angle    ?? 45
  const h0   = vars.height   ?? 0
  const g    = vars.gravity  ?? 9.81
  const θ    = (θdeg * Math.PI) / 180

  // Initialize velocities on first tick
  if (state.t === 0) {
    state.vx = v0 * Math.cos(θ)
    state.vy = v0 * Math.sin(θ)
    state.y  = h0
    state.x  = 0
  }

  state.t   += dt
  state.vx   = v0 * Math.cos(θ)   // constant (no air resistance)
  state.vy   = v0 * Math.sin(θ) - g * state.t
  state.x    = v0 * Math.cos(θ) * state.t
  state.y    = h0 + v0 * Math.sin(θ) * state.t - 0.5 * g * state.t * state.t

  state.maxH = Math.max(state.maxH, state.y)

  if (state.y <= 0 && state.t > 0.05) {
    state.y     = 0
    state.landed = true
    state.rangeX = state.x
  }

  state.trail.push([state.x, state.y])
  if (state.trail.length > 200) state.trail.shift()
}

export const draw = (ctx, state, vars, w, h) => {
  const vp = makeViewport(w, h)
  const { toCanvas } = vp

  // Sky background
  const sky = ctx.createLinearGradient(0, 0, 0, h)
  sky.addColorStop(0, '#EEF4FF')
  sky.addColorStop(1, '#F9F5F0')
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, w, h)

  // Grid & Axes
  const gridStep = 5
  drawGrid(ctx, toCanvas, { ...WORLD, xStep: gridStep, yStep: gridStep })
  drawAxes(ctx, toCanvas, { ...WORLD, xStep: gridStep, yStep: gridStep },
    { xLabel: 'x (m)', yLabel: 'y (m)', tickLen: 6 })

  // Ground
  const [gx1, gy] = toCanvas(WORLD.xMin, 0)
  const [gx2,   ] = toCanvas(WORLD.xMax, 0)
  drawGround(ctx, gx1, gy, gx2)

  // Trajectory ghost (dashed formula line)
  const v0   = vars.velocity ?? 20
  const θdeg = vars.angle    ?? 45
  const h0   = vars.height   ?? 0
  const g    = vars.gravity  ?? 9.81
  const θ    = (θdeg * Math.PI) / 180
  const tFlight = (v0 * Math.sin(θ) + Math.sqrt((v0 * Math.sin(θ)) ** 2 + 2 * g * h0)) / g

  ctx.save()
  ctx.strokeStyle = 'rgba(148,163,184,0.6)'
  ctx.lineWidth = 1.5
  ctx.setLineDash([5, 5])
  ctx.beginPath()
  let firstGhost = true
  for (let ti = 0; ti <= tFlight + 0.05; ti += tFlight / 60) {
    const gx = v0 * Math.cos(θ) * ti
    const gy_ = h0 + v0 * Math.sin(θ) * ti - 0.5 * g * ti * ti
    const [cx, cy] = toCanvas(gx, Math.max(0, gy_))
    if (firstGhost) { ctx.moveTo(cx, cy); firstGhost = false } else ctx.lineTo(cx, cy)
  }
  ctx.stroke()
  ctx.setLineDash([])
  ctx.restore()

  // Trail
  const trailPts = state.trail.map(([wx, wy]) => toCanvas(wx, wy))
  drawTrail(ctx, trailPts, COLORS.ballA)

  // Ball
  const [bx, by] = toCanvas(state.x, state.y)
  const R = Math.max(8, Math.min(16, w * 0.018))
  drawBall(ctx, bx, by, R, COLORS.ballA)

  // Velocity arrow
  const vScale = w * 0.008
  const [vTipX, vTipY] = toCanvas(state.x + state.vx * 0.4, state.y + state.vy * 0.4)
  if (!state.landed) {
    drawArrow(ctx, bx, by, vTipX, vTipY, COLORS.velocity,
      `v=${Math.sqrt(state.vx**2+state.vy**2).toFixed(1)} m/s`, { headLen: 10 })
  }

  // Gravity arrow
  if (!state.landed) {
    drawArrow(ctx, bx, by, bx, by + g * vp.scaleY * 0.25,
      COLORS.gravity, `g=${g} m/s²`, { headLen: 10 })
  }

  // Range measurement
  if (state.landed && state.rangeX > 0.5) {
    const [ox,  oy_] = toCanvas(0, 0)
    const [rx,    ] = toCanvas(state.rangeX, 0)
    drawMeasureLine(ctx, ox, oy_ + 22, rx, COLORS.axisLabel,
      `R = ${state.rangeX.toFixed(1)} m`)
  }

  // Max height annotation
  if (state.maxH > 0.5) {
    const [mhx, mhy] = toCanvas(0, state.maxH)
    ctx.save()
    ctx.strokeStyle = COLORS.textMuted
    ctx.setLineDash([3, 4])
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(gx1 + 50, mhy)
    ctx.lineTo(gx2, mhy)
    ctx.stroke()
    ctx.setLineDash([])
    ctx.fillStyle = COLORS.textMuted
    ctx.font = '11px Inter, system-ui, sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText(`H = ${state.maxH.toFixed(1)} m`, gx1 + 52, mhy - 5)
    ctx.restore()
  }

  // Angle arc at origin
  const [ox, oy_] = toCanvas(0, h0)
  drawAngleArc(ctx, ox, oy_, 30, -θ, 0, COLORS.axisLabel, `${θdeg.toFixed(0)}°`)

  // Info box
  drawInfoBox(ctx, [
    'Projectile Motion',
    `v₀ = ${v0} m/s   θ = ${θdeg.toFixed(0)}°`,
    `t = ${state.t.toFixed(2)} s`,
    `x = ${state.x.toFixed(1)} m   y = ${state.y.toFixed(1)} m`,
  ], w - 190, 12)
}

export const hitTest = (state, cx, cy, vars, w, h) => {
  const vp = makeViewport(w, h)
  const [bx, by] = vp.toCanvas(state.x, state.y)
  const R = Math.max(8, Math.min(16, w * 0.018))
  if (Math.hypot(cx - bx, cy - by) < R + 8) return 'ball'
  return null
}

export const onDrag = (state, target, cx, cy, vars, w, h) => {
  // Dragging on projectile scene resets launch angle
  const vp = makeViewport(w, h)
  const [wx, wy] = vp.toWorld(cx, cy)
  if (target === 'ball') {
    // no-op — can't drag mid-flight; handled via reset
  }
}

const ProjectileScene2D = { initState, tick, draw, hitTest, onDrag }
export default ProjectileScene2D
