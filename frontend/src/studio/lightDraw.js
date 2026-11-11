/**
 * VISIORA Studio — drawing helpers shared by the light practicals and the ray bench: fitting a
 * region of the sheet (in mm) to a canvas, outlining blocks, lenses and mirrors, pins, arrows
 * and a protractor that can be read to the degree.
 */
import { surfaces } from '../engine/raybench'
import { INK } from './drawings'

export const MONO = '"IBM Plex Mono", monospace', SANS = '"Instrument Sans", sans-serif'
export const PENCIL = '#4A4D55'
export const PIN_COLOURS = { P1: '#D23A2A', P2: '#E8822A', P3: '#2051C8', P4: '#2E8B57' }

/** Map a region { x0, y0, x1, y1 } in mm onto a w × h canvas, centred, keeping the aspect. */
export function fit(view, w, h, pad = 12) {
  const k = Math.min((w - 2 * pad) / (view.x1 - view.x0), (h - 2 * pad) / (view.y1 - view.y0))
  const mx = (view.x0 + view.x1) / 2, my = (view.y0 + view.y1) / 2
  const X = x => w / 2 + (x - mx) * k, Y = y => h / 2 + (y - my) * k
  return { k, X, Y, P: p => [X(p[0]), Y(p[1])], inv: (px, py) => [mx + (px - w / 2) / k, my + (py - h / 2) / k] }
}

/** Trace a shape's outline as a canvas path (lines and arcs, in order). */
export function shapePath(ctx, shape, v) {
  const S = surfaces(shape)
  ctx.beginPath()
  if (shape.kind === 'mirror') { const e = S[0]; ctx.moveTo(...v.P(e.a)); ctx.lineTo(...v.P(e.b)); return S }
  if (shape.kind === 'lens' || shape.kind === 'concave' || shape.kind === 'semi') {
    // sample curved outlines finely; they are drawn, not traced
    const pts = []
    for (const e of S) {
      if (e.type === 'line') { pts.push(e.a, e.b); continue }
      const n = 48
      const from = e.mid - e.half, to = e.mid + e.half
      for (let k = 0; k <= n; k++) { const a = from + ((to - from) * k) / n; pts.push([e.c[0] + e.r * Math.cos(a), e.c[1] + e.r * Math.sin(a)]) }
    }
    // order the points round the centre so the outline closes cleanly
    const c = [pts.reduce((s, p) => s + p[0], 0) / pts.length, pts.reduce((s, p) => s + p[1], 0) / pts.length]
    pts.sort((p, q) => Math.atan2(p[1] - c[1], p[0] - c[0]) - Math.atan2(q[1] - c[1], q[0] - c[0]))
    pts.forEach((p, i) => (i ? ctx.lineTo(...v.P(p)) : ctx.moveTo(...v.P(p))))
    ctx.closePath()
    return S
  }
  S.forEach((e, i) => (i ? ctx.lineTo(...v.P(e.a)) : ctx.moveTo(...v.P(e.a))))
  ctx.closePath()
  return S
}

/** A glass (or water) block seen from above: tinted, with a bright bevelled edge. */
export function drawGlass(ctx, shape, v, { dark = false, selected = false } = {}) {
  const water = shape.mat === 'water'
  if (shape.kind === 'mirror') {
    const [e] = shapePath(ctx, shape, v)
    ctx.strokeStyle = dark ? '#D9DEE6' : '#9AA3AE'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.stroke()
    // hatching on the painted back
    const n = e.n, back = [-n[0], -n[1]], L = Math.hypot(e.b[0] - e.a[0], e.b[1] - e.a[1])
    ctx.strokeStyle = dark ? 'rgba(217,222,230,.5)' : 'rgba(22,24,29,.45)'; ctx.lineWidth = 1
    for (let s = 4; s < L; s += 5) {
      const p = [e.a[0] + ((e.b[0] - e.a[0]) * s) / L, e.a[1] + ((e.b[1] - e.a[1]) * s) / L]
      ctx.beginPath(); ctx.moveTo(...v.P(p)); ctx.lineTo(...v.P([p[0] + 3 * back[0] - 2 * (e.b[0] - e.a[0]) / L, p[1] + 3 * back[1] - 2 * (e.b[1] - e.a[1]) / L])); ctx.stroke()
    }
    if (selected) { ctx.strokeStyle = '#E4532A'; ctx.lineWidth = 1.5; ctx.setLineDash([4, 3]); shapePath(ctx, shape, v); ctx.stroke(); ctx.setLineDash([]) }
    return
  }
  shapePath(ctx, shape, v)
  ctx.fillStyle = water ? (dark ? 'rgba(70,140,220,.18)' : 'rgba(90,160,230,.18)') : dark ? 'rgba(160,220,230,.12)' : 'rgba(150,205,215,.22)'
  ctx.fill()
  ctx.strokeStyle = water ? 'rgba(110,170,240,.8)' : dark ? 'rgba(200,240,250,.65)' : 'rgba(70,130,140,.75)'
  ctx.lineWidth = 1.6; ctx.lineJoin = 'round'; ctx.stroke()
  if (selected) { ctx.strokeStyle = '#E4532A'; ctx.lineWidth = 1.5; ctx.setLineDash([5, 4]); ctx.stroke(); ctx.setLineDash([]) }
}

/** A pencil line, optionally dashed. */
export function pencil(ctx, a, b, v, { dash = null, width = 1.1, colour = PENCIL } = {}) {
  ctx.strokeStyle = colour; ctx.lineWidth = width; ctx.setLineDash(dash ?? [])
  ctx.beginPath(); ctx.moveTo(...v.P(a)); ctx.lineTo(...v.P(b)); ctx.stroke(); ctx.setLineDash([])
}

/** An arrowhead in the middle of a line from a to b, the way rays are marked in a notebook. */
export function arrowMid(ctx, a, b, v, colour = PENCIL) {
  const A = v.P(a), B = v.P(b), m = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2]
  const ang = Math.atan2(B[1] - A[1], B[0] - A[0])
  ctx.fillStyle = colour; ctx.beginPath()
  ctx.moveTo(m[0] + 6 * Math.cos(ang), m[1] + 6 * Math.sin(ang))
  ctx.lineTo(m[0] + 6 * Math.cos(ang + 2.6), m[1] + 6 * Math.sin(ang + 2.6))
  ctx.lineTo(m[0] + 6 * Math.cos(ang - 2.6), m[1] + 6 * Math.sin(ang - 2.6))
  ctx.closePath(); ctx.fill()
}

/** An office pin seen from above (a coloured ball head) or, once removed, its circled hole. */
export function drawPin(ctx, p, name, v, { hole = false, faint = false } = {}) {
  const [x, y] = v.P(p), c = PIN_COLOURS[name] ?? INK
  ctx.globalAlpha = faint ? 0.45 : 1
  if (hole) {
    ctx.strokeStyle = PENCIL; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x, y, 5, 0, 2 * Math.PI); ctx.stroke()
    ctx.fillStyle = PENCIL; ctx.beginPath(); ctx.arc(x, y, 1.2, 0, 2 * Math.PI); ctx.fill()
  } else {
    ctx.fillStyle = 'rgba(22,24,29,.18)'; ctx.beginPath(); ctx.ellipse(x + 3, y + 3, 5, 3.5, 0, 0, 2 * Math.PI); ctx.fill()
    const g = ctx.createRadialGradient(x - 2, y - 2, 1, x, y, 6)
    g.addColorStop(0, '#fff'); g.addColorStop(0.35, c); g.addColorStop(1, c)
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 5.5, 0, 2 * Math.PI); ctx.fill()
  }
  ctx.fillStyle = INK; ctx.font = `600 11px ${SANS}`; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'
  ctx.fillText(name, x + 9, y - 8)
  ctx.globalAlpha = 1
}

/** An eye, looking along direction `look` (degrees). */
export function drawEye(ctx, p, look, v, active = false) {
  const [x, y] = v.P(p), a = (look * Math.PI) / 180
  ctx.save(); ctx.translate(x, y); ctx.rotate(a)
  if (active) { ctx.fillStyle = 'rgba(228,83,42,.12)'; ctx.beginPath(); ctx.arc(0, 0, 20, 0, 2 * Math.PI); ctx.fill() }
  ctx.fillStyle = '#fff'; ctx.strokeStyle = INK; ctx.lineWidth = 1.6
  ctx.beginPath(); ctx.moveTo(-12, 0); ctx.quadraticCurveTo(0, -11, 12, 0); ctx.quadraticCurveTo(0, 11, -12, 0); ctx.fill(); ctx.stroke()
  ctx.fillStyle = '#2B5C8A'; ctx.beginPath(); ctx.arc(4, 0, 4.5, 0, 2 * Math.PI); ctx.fill()
  ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(5, 0, 2, 0, 2 * Math.PI); ctx.fill()
  ctx.restore()
}

/**
 * A large protractor for reading one angle: centred at (cx, cy), radius R px, its zero along
 * `zeroDeg` (canvas degrees), marked 0–90 either side, 1° ticks, numbers every 10°.
 */
export function protractor(ctx, cx, cy, R, zeroDeg, { span = 90 } = {}) {
  const z = (zeroDeg * Math.PI) / 180
  ctx.fillStyle = 'rgba(255,255,255,.72)'
  ctx.strokeStyle = 'rgba(22,24,29,.55)'; ctx.lineWidth = 1
  ctx.beginPath(); ctx.arc(cx, cy, R, z - (span * Math.PI) / 180, z + (span * Math.PI) / 180); ctx.lineTo(cx, cy); ctx.closePath(); ctx.fill(); ctx.stroke()
  ctx.font = `500 10px ${MONO}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = INK
  for (let d = -span; d <= span; d++) {
    const a = z + (d * Math.PI) / 180, len = d % 10 === 0 ? 14 : d % 5 === 0 ? 9 : 5
    ctx.strokeStyle = 'rgba(22,24,29,.7)'; ctx.lineWidth = d % 10 === 0 ? 1.2 : 0.8
    ctx.beginPath(); ctx.moveTo(cx + R * Math.cos(a), cy + R * Math.sin(a)); ctx.lineTo(cx + (R - len) * Math.cos(a), cy + (R - len) * Math.sin(a)); ctx.stroke()
    if (d % 10 === 0) ctx.fillText(String(Math.abs(d)), cx + (R - 24) * Math.cos(a), cy + (R - 24) * Math.sin(a))
  }
  ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(cx, cy, 2.5, 0, 2 * Math.PI); ctx.fill()
}
