/**
 * VISIORA Studio — drawing helpers shared by the light practicals and the ray bench: fitting a
 * region of the sheet (in mm) to a canvas, outlining blocks, lenses and mirrors, pins, arrows
 * and a protractor that can be read to the degree.
 */
import { LIGHTS, dirOf, spectrumRGB, surfaces, vec } from '../engine/raybench'
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

/** The ray bench's floor, in mm: 320 × 200, centred on the origin. */
export const BENCH_VIEW = { x0: -160, y0: -100, x1: 160, y1: 100 }

/**
 * Draw the bench: the dark room, the glass, every traced ray (added up like light), the normal
 * and angles where the ray first bends, and the ray box. `upTo` draws the ray only as far as the
 * glass, with a question mark, for the moment before a prediction is checked. Returns the view.
 */
export function paintBench(ctx, w, h, { shapes, selected = null, rays, first, angles, light, box, upTo = null, handle = true }) {
  const v = fit(BENCH_VIEW, w, h, 0)
  ctx.fillStyle = '#12141A'; ctx.fillRect(0, 0, w, h)
  ctx.strokeStyle = 'rgba(255,255,255,.04)'; ctx.lineWidth = 1
  for (let x = -160; x <= 160; x += 10) { ctx.beginPath(); ctx.moveTo(v.X(x), 0); ctx.lineTo(v.X(x), h); ctx.stroke() }
  for (let y = -100; y <= 100; y += 10) { ctx.beginPath(); ctx.moveTo(0, v.Y(y)); ctx.lineTo(w, v.Y(y)); ctx.stroke() }
  for (const s of shapes) drawGlass(ctx, s, v, { dark: true, selected: s.id === selected })
  if (upTo) {
    ctx.strokeStyle = 'rgba(255,107,107,.25)'; ctx.lineWidth = 6; ctx.lineCap = 'round'
    ctx.beginPath(); ctx.moveTo(...v.P(upTo.from)); ctx.lineTo(...v.P(upTo.to)); ctx.stroke()
    ctx.strokeStyle = '#FF6B6B'; ctx.lineWidth = 1.8
    ctx.beginPath(); ctx.moveTo(...v.P(upTo.from)); ctx.lineTo(...v.P(upTo.to)); ctx.stroke()
    if (upTo.normal) {
      ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.setLineDash([5, 4]); ctx.lineWidth = 1
      ctx.beginPath(); ctx.moveTo(...v.P(vec.add(upTo.to, upTo.normal, 34))); ctx.lineTo(...v.P(vec.add(upTo.to, upTo.normal, -34))); ctx.stroke(); ctx.setLineDash([])
    }
    const [qx, qy] = v.P(upTo.to)
    ctx.fillStyle = '#12141A'; ctx.strokeStyle = '#FFB347'; ctx.lineWidth = 2
    ctx.beginPath(); ctx.arc(qx, qy, 13, 0, 2 * Math.PI); ctx.fill(); ctx.stroke()
    ctx.fillStyle = '#FFB347'; ctx.font = `700 15px ${SANS}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('?', qx, qy + 1)
  }
  // rays: added up like light, so overlapping colours make white
  ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round'
  const n = LIGHTS[light].lams.length
  for (const r of rays) {
    const [R, G, B] = spectrumRGB(r.lam), a = Math.min(1, Math.sqrt(r.I * n) * (n > 1 ? 0.55 : 1))
    ctx.strokeStyle = `rgba(${R},${G},${B},${a * 0.25})`; ctx.lineWidth = 6
    ctx.beginPath(); ctx.moveTo(...v.P(r.a)); ctx.lineTo(...v.P(r.b)); ctx.stroke()
    ctx.strokeStyle = `rgba(${R},${G},${B},${a})`; ctx.lineWidth = 1.8
    ctx.beginPath(); ctx.moveTo(...v.P(r.a)); ctx.lineTo(...v.P(r.b)); ctx.stroke()
  }
  ctx.globalCompositeOperation = 'source-over'
  // normal and angles at the first surface
  const shown = first.find(e => !e.mirror && e.i > 0.2) ?? first[0]
  if (angles && shown && !shown.mirror && shown.i > 0.2) {
    const e = shown
    ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.setLineDash([5, 4]); ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(...v.P(vec.add(e.at, e.normal, 28))); ctx.lineTo(...v.P(vec.add(e.at, e.normal, -28))); ctx.stroke()
    ctx.setLineDash([])
    ctx.fillStyle = '#fff'; ctx.font = `600 12px ${MONO}`; ctx.textAlign = 'left'; ctx.textBaseline = 'bottom'
    ctx.fillText(`i = ${e.i.toFixed(1)}°${e.r != null ? `   r = ${e.r.toFixed(1)}°` : '   total internal reflection'}`, v.X(e.at[0]) + 10, v.Y(e.at[1]) - 8)
  }
  // the ray box
  const d = dirOf(box.deg)
  ctx.save(); ctx.translate(v.X(box.x), v.Y(box.y)); ctx.rotate((box.deg * Math.PI) / 180)
  ctx.fillStyle = '#2B2F38'; ctx.strokeStyle = '#8A8F99'; ctx.lineWidth = 1.2
  ctx.beginPath(); ctx.roundRect(-14 * v.k, -6 * v.k, 22 * v.k, 12 * v.k, 3); ctx.fill(); ctx.stroke()
  ctx.fillStyle = '#F5D76E'; ctx.fillRect(8 * v.k - 2, -2 * v.k, 3, 4 * v.k)
  ctx.restore()
  // rotate handle behind the box
  if (!handle) return v
  const hnd = vec.add([box.x, box.y], d, -20)
  ctx.fillStyle = '#E4532A'; ctx.beginPath(); ctx.arc(...v.P(hnd), 6, 0, 2 * Math.PI); ctx.fill()
  ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.font = `500 11px ${SANS}`; ctx.textAlign = 'center'; ctx.textBaseline = 'top'
  ctx.fillText('turn', ...vec.add(v.P(hnd), [0, 9]))
  return v
}
