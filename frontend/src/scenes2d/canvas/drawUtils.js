/**
 * VISIORA — 2D Canvas Drawing Utilities (PhET-style)
 *
 * Stateless pure-function drawing primitives used by all 2D scenes.
 * All coordinates passed in are "world" coordinates. The caller maps
 * world ↔ canvas via toCanvas(wx, wy) / toWorld(cx, cy) helpers built
 * per-scene from the viewport.
 */

// ── Color palette (matches Visiora design tokens) ──────────────────
export const COLORS = {
  grid:       '#D5CBBF',
  axis:       '#829AB1',
  axisLabel:  '#486581',
  text:       '#243B53',
  textMuted:  '#627D98',
  velocity:   '#3B82F6',   // blue
  gravity:    '#EF4444',   // red
  tension:    '#F59E0B',   // amber
  normal:     '#10B981',   // emerald
  friction:   '#8B5CF6',   // violet
  trail:      'rgba(99,102,241,0.35)',
  ballA:      '#3B82F6',
  ballB:      '#F59E0B',
  spring:     '#10B981',
  floor:      '#E2E8F0',
  ground:     '#94A3B8',
  sky:        '#F0F7FF',
}

// ── Grid & Axes ────────────────────────────────────────────────────

/**
 * Draw a cartesian grid with labeled axes.
 * @param {CanvasRenderingContext2D} ctx
 * @param {Function} toCanvas - (wx, wy) → [cx, cy]
 * @param {{ xMin, xMax, yMin, yMax, xStep, yStep }} world
 */
export function drawGrid(ctx, toCanvas, world) {
  const { xMin, xMax, yMin, yMax, xStep = 1, yStep = 1 } = world
  ctx.save()

  // Minor grid lines
  ctx.strokeStyle = COLORS.grid
  ctx.lineWidth = 0.5
  ctx.globalAlpha = 0.6

  for (let x = Math.ceil(xMin / xStep) * xStep; x <= xMax; x += xStep) {
    const [cx1, cy1] = toCanvas(x, yMin)
    const [cx2, cy2] = toCanvas(x, yMax)
    ctx.beginPath(); ctx.moveTo(cx1, cy1); ctx.lineTo(cx2, cy2); ctx.stroke()
  }
  for (let y = Math.ceil(yMin / yStep) * yStep; y <= yMax; y += yStep) {
    const [cx1, cy1] = toCanvas(xMin, y)
    const [cx2, cy2] = toCanvas(xMax, y)
    ctx.beginPath(); ctx.moveTo(cx1, cy1); ctx.lineTo(cx2, cy2); ctx.stroke()
  }

  ctx.globalAlpha = 1
  ctx.restore()
}

/**
 * Draw X/Y axes with tick marks and labels.
 */
export function drawAxes(ctx, toCanvas, world, opts = {}) {
  const { xMin, xMax, yMin, yMax, xStep = 1, yStep = 1 } = world
  const { xLabel = 'x (m)', yLabel = 'y (m)', tickLen = 6 } = opts

  ctx.save()
  ctx.strokeStyle = COLORS.axis
  ctx.fillStyle   = COLORS.axisLabel
  ctx.lineWidth   = 1.5
  ctx.font        = '11px Inter, system-ui, sans-serif'
  ctx.textAlign   = 'center'

  // X-axis (at y=0 or yMin if 0 is out of view)
  const yOrigin = Math.max(yMin, Math.min(0, yMax))
  const [, cy0] = toCanvas(xMin, yOrigin)
  const [cx0,  ] = toCanvas(xMin, yOrigin)
  const [cxMax,] = toCanvas(xMax, yOrigin)
  ctx.beginPath(); ctx.moveTo(cx0, cy0); ctx.lineTo(cxMax, cy0); ctx.stroke()

  // Y-axis (at x=0 or xMin)
  const xOrigin = Math.max(xMin, Math.min(0, xMax))
  const [cxO, ] = toCanvas(xOrigin, yMin)
  const [,  cyO] = toCanvas(xOrigin, yMin)
  const [, cyMax] = toCanvas(xOrigin, yMax)
  ctx.beginPath(); ctx.moveTo(cxO, cyO); ctx.lineTo(cxO, cyMax); ctx.stroke()

  // X ticks + labels
  for (let x = Math.ceil(xMin / xStep) * xStep; x <= xMax + 0.001; x += xStep) {
    const [cx, cy] = toCanvas(x, yOrigin)
    ctx.beginPath()
    ctx.moveTo(cx, cy - tickLen / 2)
    ctx.lineTo(cx, cy + tickLen / 2)
    ctx.stroke()
    if (Math.abs(x) > 0.01) {
      ctx.fillText(formatNum(x), cx, cy + tickLen + 11)
    }
  }

  // Y ticks + labels
  ctx.textAlign = 'right'
  for (let y = Math.ceil(yMin / yStep) * yStep; y <= yMax + 0.001; y += yStep) {
    const [cx, cy] = toCanvas(xOrigin, y)
    ctx.beginPath()
    ctx.moveTo(cx - tickLen / 2, cy)
    ctx.lineTo(cx + tickLen / 2, cy)
    ctx.stroke()
    if (Math.abs(y) > 0.01) {
      ctx.fillText(formatNum(y), cx - tickLen - 4, cy + 4)
    }
  }

  // Axis labels
  ctx.fillStyle = COLORS.axisLabel
  ctx.font = 'bold 12px Inter, system-ui, sans-serif'
  ctx.textAlign = 'center'
  const [cxMaxLbl,] = toCanvas(xMax, yOrigin)
  ctx.fillText(xLabel, cxMaxLbl - 20, cy0 - 8)
  ctx.textAlign = 'left'
  const [cxOLbl, cyMaxLbl] = toCanvas(xOrigin, yMax)
  ctx.fillText(yLabel, cxOLbl + 6, cyMaxLbl + 14)

  ctx.restore()
}

// ── Arrow ──────────────────────────────────────────────────────────

/**
 * Draw a labeled vector arrow from (x1,y1) to (x2,y2) in canvas coords.
 * @param {string} label  e.g. "v = 12.5 m/s"
 */
export function drawArrow(ctx, x1, y1, x2, y2, color, label = '', opts = {}) {
  const { headLen = 12, lineWidth = 2.5, fontSize = 12 } = opts
  const dx = x2 - x1
  const dy = y2 - y1
  const len = Math.sqrt(dx * dx + dy * dy)
  if (len < 4) return

  const angle = Math.atan2(dy, dx)

  ctx.save()
  ctx.strokeStyle = color
  ctx.fillStyle   = color
  ctx.lineWidth   = lineWidth
  ctx.lineCap     = 'round'

  // Shaft
  ctx.beginPath()
  ctx.moveTo(x1, y1)
  ctx.lineTo(x2 - Math.cos(angle) * headLen * 0.5, y2 - Math.sin(angle) * headLen * 0.5)
  ctx.stroke()

  // Head
  ctx.beginPath()
  ctx.moveTo(x2, y2)
  ctx.lineTo(x2 - headLen * Math.cos(angle - 0.4), y2 - headLen * Math.sin(angle - 0.4))
  ctx.lineTo(x2 - headLen * Math.cos(angle + 0.4), y2 - headLen * Math.sin(angle + 0.4))
  ctx.closePath()
  ctx.fill()

  // Label
  if (label) {
    ctx.fillStyle = color
    ctx.font = `bold ${fontSize}px Inter, system-ui, sans-serif`
    ctx.textAlign  = 'center'
    ctx.textBaseline = 'middle'
    const midX = (x1 + x2) / 2 + Math.sin(angle) * 14
    const midY = (y1 + y2) / 2 - Math.cos(angle) * 14
    // White background for readability
    ctx.save()
    ctx.fillStyle = 'rgba(255,255,255,0.85)'
    const tm = ctx.measureText(label)
    ctx.fillRect(midX - tm.width / 2 - 3, midY - fontSize / 2 - 2, tm.width + 6, fontSize + 4)
    ctx.restore()
    ctx.fillStyle = color
    ctx.fillText(label, midX, midY)
  }

  ctx.restore()
}

// ── Ball / Circle ──────────────────────────────────────────────────

export function drawBall(ctx, cx, cy, r, color, opts = {}) {
  const { label = '', shadow = true, gloss = true } = opts
  ctx.save()

  if (shadow) {
    ctx.shadowColor   = 'rgba(0,0,0,0.2)'
    ctx.shadowBlur    = 8
    ctx.shadowOffsetY = 3
  }

  // Main circle
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.fillStyle = color
  ctx.fill()

  if (shadow) ctx.shadowColor = 'transparent'

  // Gloss highlight
  if (gloss) {
    const grd = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, r * 0.05, cx, cy, r)
    grd.addColorStop(0, 'rgba(255,255,255,0.45)')
    grd.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.beginPath()
    ctx.arc(cx, cy, r, 0, Math.PI * 2)
    ctx.fillStyle = grd
    ctx.fill()
  }

  // Outline
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.strokeStyle = 'rgba(0,0,0,0.15)'
  ctx.lineWidth = 1
  ctx.stroke()

  // Label inside ball
  if (label) {
    ctx.fillStyle = 'rgba(255,255,255,0.9)'
    ctx.font = `bold ${Math.max(10, r * 0.6)}px Inter, system-ui, sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(label, cx, cy)
  }

  ctx.restore()
}

// ── Trail ──────────────────────────────────────────────────────────

/**
 * Draw a faded motion trail from an array of canvas-coord [x,y] points.
 * Most-recent point is brightest.
 */
export function drawTrail(ctx, points, color = COLORS.trail, maxLen = 80) {
  if (points.length < 2) return
  const pts = points.slice(-maxLen)
  ctx.save()
  for (let i = 1; i < pts.length; i++) {
    const alpha = i / pts.length
    ctx.globalAlpha = alpha * 0.6
    ctx.beginPath()
    ctx.moveTo(pts[i - 1][0], pts[i - 1][1])
    ctx.lineTo(pts[i][0], pts[i][1])
    ctx.strokeStyle = color
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.stroke()
  }
  ctx.restore()
}

// ── Text Label / Info Box ──────────────────────────────────────────

export function drawLabel(ctx, text, cx, cy, opts = {}) {
  const { color = COLORS.text, fontSize = 12, bg = true } = opts
  ctx.save()
  ctx.font = `${fontSize}px Inter, system-ui, sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  if (bg) {
    const tm = ctx.measureText(text)
    ctx.fillStyle = 'rgba(255,255,255,0.85)'
    ctx.beginPath()
    ctx.roundRect(cx - tm.width / 2 - 5, cy - fontSize / 2 - 3, tm.width + 10, fontSize + 6, 4)
    ctx.fill()
  }
  ctx.fillStyle = color
  ctx.fillText(text, cx, cy)
  ctx.restore()
}

/**
 * Draw a multi-line info box in the corner.
 */
export function drawInfoBox(ctx, lines, x, y, opts = {}) {
  const { fontSize = 12, padding = 10, lineHeight = 18, maxWidth = 180 } = opts
  ctx.save()
  ctx.font = `${fontSize}px Inter, system-ui, sans-serif`

  // Background
  const h = lines.length * lineHeight + padding * 2
  ctx.fillStyle = 'rgba(248,250,252,0.92)'
  ctx.strokeStyle = 'rgba(148,163,184,0.4)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.roundRect(x, y, maxWidth, h, 8)
  ctx.fill()
  ctx.stroke()

  // Lines
  lines.forEach((line, i) => {
    ctx.fillStyle = i === 0 ? COLORS.text : COLORS.textMuted
    ctx.font = i === 0 ? `bold ${fontSize}px Inter, system-ui, sans-serif` : `${fontSize}px Inter, system-ui, sans-serif`
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'
    ctx.fillText(line, x + padding, y + padding + i * lineHeight, maxWidth - padding * 2)
  })

  ctx.restore()
}

// ── Ground / Floor ─────────────────────────────────────────────────

export function drawGround(ctx, cx1, cy, cx2, opts = {}) {
  const { color = COLORS.floor, stripes = true } = opts
  ctx.save()
  ctx.fillStyle = color
  ctx.fillRect(cx1, cy, cx2 - cx1, 8)

  if (stripes) {
    ctx.strokeStyle = COLORS.ground
    ctx.lineWidth = 1
    ctx.setLineDash([8, 8])
    ctx.beginPath()
    ctx.moveTo(cx1, cy)
    ctx.lineTo(cx2, cy)
    ctx.stroke()
    ctx.setLineDash([])
  }
  ctx.restore()
}

// ── Angle Arc ─────────────────────────────────────────────────────

export function drawAngleArc(ctx, cx, cy, r, fromAngle, toAngle, color, label) {
  ctx.save()
  ctx.strokeStyle = color
  ctx.lineWidth = 1.5
  ctx.setLineDash([4, 4])
  ctx.beginPath()
  ctx.arc(cx, cy, r, fromAngle, toAngle)
  ctx.stroke()
  ctx.setLineDash([])

  if (label) {
    const midAngle = (fromAngle + toAngle) / 2
    const lx = cx + (r + 14) * Math.cos(midAngle)
    const ly = cy + (r + 14) * Math.sin(midAngle)
    ctx.fillStyle = color
    ctx.font = 'bold 11px Inter, system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(label, lx, ly)
  }
  ctx.restore()
}

// ── Measurement line ───────────────────────────────────────────────

export function drawMeasureLine(ctx, x1, y, x2, color = COLORS.axisLabel, label = '') {
  ctx.save()
  ctx.strokeStyle = color
  ctx.lineWidth = 1.5
  ctx.setLineDash([5, 4])

  // Horizontal line
  ctx.beginPath(); ctx.moveTo(x1, y); ctx.lineTo(x2, y); ctx.stroke()
  ctx.setLineDash([])

  // End caps
  for (const x of [x1, x2]) {
    ctx.beginPath(); ctx.moveTo(x, y - 6); ctx.lineTo(x, y + 6); ctx.stroke()
  }

  if (label) {
    ctx.fillStyle = color
    ctx.font = '11px Inter, system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'bottom'
    ctx.fillText(label, (x1 + x2) / 2, y - 4)
  }

  ctx.restore()
}

// ── Helpers ────────────────────────────────────────────────────────

function formatNum(n) {
  if (Math.abs(n) >= 100) return Math.round(n).toString()
  if (Math.abs(n) >= 10)  return n.toFixed(1)
  return n.toFixed(1)
}

export function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)) }
