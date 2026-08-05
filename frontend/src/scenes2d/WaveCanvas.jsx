/**
 * VISIORA — Wave / Simple Harmonic Motion 2D Scene (PhET-style)
 *
 * Spring-mass oscillator + live sine wave graph.
 * Shows: spring (zigzag), mass block, displacement arrow, restoring force,
 * a live sine wave graph scrolling on the right, period/frequency/amplitude readout.
 */

import { drawArrow, drawInfoBox, COLORS } from './canvas/drawUtils'

// ── Spring drawing ─────────────────────────────────────────────────
function drawSpring(ctx, x1, y, x2, coils = 12, color = COLORS.spring) {
  const len    = x2 - x1
  const coilW  = len / coils
  const amp    = 10

  ctx.save()
  ctx.strokeStyle = color
  ctx.lineWidth   = 2.5
  ctx.lineCap     = 'round'
  ctx.lineJoin    = 'round'
  ctx.beginPath()
  ctx.moveTo(x1, y)

  // First straight segment
  ctx.lineTo(x1 + coilW * 0.5, y)

  for (let i = 0; i < coils - 1; i++) {
    const xBase = x1 + coilW * (0.5 + i)
    ctx.lineTo(xBase + coilW * 0.25, y - amp)
    ctx.lineTo(xBase + coilW * 0.75, y + amp)
  }

  // Last straight segment
  ctx.lineTo(x2, y)
  ctx.stroke()
  ctx.restore()
}

// ── Wave graph ────────────────────────────────────────────────────
function drawWaveGraph(ctx, history, x0, y0, gw, gh, A, T) {
  ctx.save()

  // Background
  ctx.fillStyle = 'rgba(248,250,252,0.9)'
  ctx.strokeStyle = 'rgba(148,163,184,0.4)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.roundRect(x0, y0, gw, gh, 8)
  ctx.fill()
  ctx.stroke()

  // Grid lines
  ctx.strokeStyle = 'rgba(148,163,184,0.25)'
  ctx.lineWidth = 0.5
  ctx.setLineDash([3, 3])
  // Horizontal center
  ctx.beginPath(); ctx.moveTo(x0, y0 + gh / 2); ctx.lineTo(x0 + gw, y0 + gh / 2); ctx.stroke()
  ctx.setLineDash([])

  // Axes labels
  ctx.fillStyle = COLORS.textMuted
  ctx.font = '10px Inter, sans-serif'
  ctx.textAlign = 'left'
  ctx.fillText('x(t)', x0 + 4, y0 + 13)
  ctx.fillText('t →', x0 + gw - 22, y0 + gh / 2 - 4)

  // Wave data
  if (history.length < 2) { ctx.restore(); return }
  const yScale = (gh / 2 - 10) / (A || 1)
  const xStep  = gw / Math.max(history.length - 1, 1)

  ctx.strokeStyle = COLORS.velocity
  ctx.lineWidth = 2
  ctx.beginPath()
  history.forEach((v, i) => {
    const cx_ = x0 + i * xStep
    const cy_ = y0 + gh / 2 - v * yScale
    if (i === 0) ctx.moveTo(cx_, cy_); else ctx.lineTo(cx_, cy_)
  })
  ctx.stroke()

  // Amplitude labels
  ctx.fillStyle = COLORS.velocity
  ctx.textAlign = 'right'
  ctx.fillText(`+A=${A.toFixed(1)}`, x0 + gw - 2, y0 + gh / 2 - (A > 0 ? A * yScale - 2 : 6))
  ctx.fillText(`-A`, x0 + gw - 2, y0 + gh / 2 + (A > 0 ? A * yScale + 10 : 16))

  ctx.restore()
}

// ── Scene API ─────────────────────────────────────────────────────

export const initState = (vars) => ({
  t:        0,
  x:        vars.amplitude ?? 2,    // current displacement
  v:        0,                       // velocity
  history:  [],                      // displacement history for wave graph
})

export const tick = (state, dt, vars) => {
  const k = vars.springK   ?? 10
  const m = vars.massBlock ?? 1
  const ω = Math.sqrt(k / m)

  // SHM exact solution
  const A = vars.amplitude ?? 2
  state.t += dt
  state.x = A * Math.cos(ω * state.t)
  state.v = -A * ω * Math.sin(ω * state.t)

  state.history.push(state.x)
  if (state.history.length > 300) state.history.shift()
}

export const draw = (ctx, state, vars, w, h) => {
  const k  = vars.springK   ?? 10
  const m  = vars.massBlock ?? 1
  const A  = vars.amplitude ?? 2
  const ω  = Math.sqrt(k / m)
  const T  = 2 * Math.PI / ω
  const f  = 1 / T

  // Background
  const bg = ctx.createLinearGradient(0, 0, 0, h)
  bg.addColorStop(0, '#F0F7FF')
  bg.addColorStop(1, '#F5F0FF')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, w, h)

  // Layout
  const wallX  = 60
  const springY = h * 0.38
  const equilX  = w * 0.42           // equilibrium position of mass left edge
  const mScale  = 30                  // pixels per metre displacement
  const massW   = Math.max(30, 20 * Math.cbrt(m))
  const massH   = massW

  // Displacement in canvas pixels
  const dispPx = state.x * mScale
  const massLeftX = equilX + dispPx

  // ── Wall ─────────────────────────────────────────────────────────
  ctx.save()
  ctx.fillStyle = '#94A3B8'
  ctx.fillRect(wallX - 14, springY - 40, 14, 80)
  ctx.strokeStyle = '#64748B'
  ctx.lineWidth = 1
  for (let yi = 0; yi < 8; yi++) {
    const yo = springY - 40 + yi * 10
    ctx.beginPath(); ctx.moveTo(wallX - 14, yo); ctx.lineTo(wallX - 22, yo + 8); ctx.stroke()
  }
  ctx.restore()

  // ── Spring ───────────────────────────────────────────────────────
  drawSpring(ctx, wallX, springY, massLeftX, 12)

  // ── Floor / rail ─────────────────────────────────────────────────
  ctx.save()
  ctx.fillStyle = '#E2E8F0'
  ctx.fillRect(wallX, springY + massH / 2, w * 0.55, 6)
  ctx.restore()

  // ── Mass block ───────────────────────────────────────────────────
  ctx.save()
  const mx = massLeftX
  const my = springY - massH / 2

  // Shadow
  ctx.shadowColor = 'rgba(0,0,0,0.15)'
  ctx.shadowBlur = 8; ctx.shadowOffsetY = 3

  const grad = ctx.createLinearGradient(mx, my, mx, my + massH)
  grad.addColorStop(0, '#818CF8')
  grad.addColorStop(1, '#4F46E5')
  ctx.fillStyle = grad
  ctx.beginPath()
  ctx.roundRect(mx, my, massW, massH, 5)
  ctx.fill()

  ctx.shadowColor = 'transparent'

  // Mass label
  ctx.fillStyle = 'white'
  ctx.font = `bold ${Math.max(10, massW * 0.35)}px Inter, sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(`${m}kg`, mx + massW / 2, springY)
  ctx.restore()

  // ── Equilibrium line ─────────────────────────────────────────────
  ctx.save()
  ctx.strokeStyle = 'rgba(148,163,184,0.5)'
  ctx.lineWidth = 1
  ctx.setLineDash([5, 4])
  ctx.beginPath()
  ctx.moveTo(equilX + massW / 2, h * 0.1)
  ctx.lineTo(equilX + massW / 2, h * 0.7)
  ctx.stroke()
  ctx.setLineDash([])
  ctx.fillStyle = COLORS.textMuted
  ctx.font = '10px Inter, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('x=0', equilX + massW / 2, h * 0.12)
  ctx.restore()

  // ── Displacement arrow (from equil to mass center) ───────────────
  if (Math.abs(state.x) > 0.1) {
    const midY = springY - massH / 2 - 18
    drawArrow(ctx,
      equilX + massW / 2, midY,
      massLeftX + massW / 2, midY,
      COLORS.velocity, `x=${state.x.toFixed(2)} m`, { headLen: 9 })
  }

  // ── Restoring force arrow ─────────────────────────────────────────
  const F = -k * state.x
  if (Math.abs(F) > 0.2) {
    const fLen = Math.min(Math.abs(F) * mScale * 0.6, 80)
    drawArrow(ctx,
      massLeftX + massW / 2, springY + massH / 2 + 28,
      massLeftX + massW / 2 + Math.sign(F) * fLen, springY + massH / 2 + 28,
      COLORS.gravity, `F=${F.toFixed(1)} N`, { headLen: 9 })
  }

  // ── Wave graph ───────────────────────────────────────────────────
  const gx0 = w * 0.54
  const gy0 = h * 0.1
  const gw  = w - gx0 - 16
  const gh  = h * 0.55
  drawWaveGraph(ctx, state.history, gx0, gy0, gw, gh, A, T)

  // ── Info box ─────────────────────────────────────────────────────
  drawInfoBox(ctx, [
    'Simple Harmonic Motion',
    `k = ${k} N/m   m = ${m} kg`,
    `A = ${A} m   ω = ${ω.toFixed(2)} rad/s`,
    `T = ${T.toFixed(2)} s   f = ${f.toFixed(2)} Hz`,
    `x = ${state.x.toFixed(3)} m   v = ${state.v.toFixed(2)} m/s`,
  ], 12, h - 120)
}

const WaveScene2D = { initState, tick, draw }
export default WaveScene2D
