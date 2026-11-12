/**
 * VISIORA Studio — a ramp hinged at the bottom left, its top raised on a stand, with a
 * protractor at the hinge reading the angle. The block sits on it with its forces: the weight
 * straight down, split (dashed) into the pull down the slope and the press into it; the normal
 * force from the ramp; and friction along the slope. One ramp per block, stacked.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { BLOCKS, RAMP, makeBlock, rampForces, stepBlock } from '../engine/ramp'

const MONO = '"IBM Plex Mono", monospace'
const SANS = '"Instrument Sans", sans-serif'
const INK = '#1B1340'
const INK3 = '#6B6888'
export const FRICTION_COLOUR = '#D6336C'
export const NORMAL_COLOUR = '#2051C8'

/**
 * Run blocks on ramps in real time. program(t, block, i) gives each ramp's angle; angleRef,
 * if given, sets the angle live instead (free play). Stops after T seconds.
 */
export function useRamps({ blocks, program, angleRef, T = 30, until }) {
  const sim = useRef(null)
  const raf = useRef(0)
  const [, setTick] = useState(0)
  const key = JSON.stringify(blocks)
  const make = useCallback(() => ({ t: 0, running: false, done: false, blocks: blocks.map(spec => makeBlock(spec.kind, { ...spec, angle: angleRef ? angleRef.current : program ? program(0, { slipAngle: null }, 0) : spec.angle ?? 0 })) }), [key]) // eslint-disable-line react-hooks/exhaustive-deps
  if (!sim.current) sim.current = make()
  const reset = useCallback(() => { cancelAnimationFrame(raf.current); sim.current = make(); setTick(n => n + 1) }, [make])
  useEffect(() => { reset() }, [reset])
  useEffect(() => () => cancelAnimationFrame(raf.current), [])
  const programRef = useRef(program)
  programRef.current = program
  const untilRef = useRef(until)
  untilRef.current = until
  const stop = useCallback(() => { cancelAnimationFrame(raf.current); sim.current.running = false; setTick(n => n + 1) }, [])
  const start = useCallback((fresh = true) => {
    cancelAnimationFrame(raf.current)
    if (fresh) sim.current = make()
    sim.current.running = true
    let last = performance.now()
    const frame = now => {
      const s = sim.current
      let dt = Math.min(0.05, (now - last) / 1000, T - s.t)
      last = now
      // the program is stepped in 10 ms pieces so a tilting ramp moves smoothly whatever the frame rate
      while (dt > 1e-9) {
        const h = Math.min(0.01, dt)
        s.blocks.forEach((b, i) => { b.angle = angleRef ? angleRef.current : programRef.current ? programRef.current(s.t, b, i) : b.angle; stepBlock(b, h) })
        s.t += h; dt -= h
      }
      if (s.t >= T - 1e-9 || untilRef.current?.(s)) { s.running = false; s.done = true }
      setTick(n => n + 1)
      if (s.running) raf.current = requestAnimationFrame(frame)
    }
    raf.current = requestAnimationFrame(frame)
    setTick(n => n + 1)
  }, [make, T, angleRef])
  return { sim: sim.current, start, stop, reset }
}

function arrow(ctx, x0, y0, x1, y1, colour, dashed = false) {
  const len = Math.hypot(x1 - x0, y1 - y0)
  if (len < 3) return
  const ux = (x1 - x0) / len, uy = (y1 - y0) / len, head = Math.min(9, len)
  ctx.strokeStyle = colour; ctx.fillStyle = colour; ctx.lineWidth = dashed ? 1.6 : 2.6
  ctx.setLineDash(dashed ? [5, 4] : [])
  ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1 - ux * head, y1 - uy * head); ctx.stroke(); ctx.setLineDash([])
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x1 - ux * head - uy * 5, y1 - uy * head + ux * 5); ctx.lineTo(x1 - ux * head + uy * 5, y1 - uy * head - ux * 5); ctx.closePath(); ctx.fill()
}

function label(ctx, text, x, y, colour) {
  ctx.font = `600 10px ${MONO}`; const tw = ctx.measureText(text).width
  ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.fillRect(x - tw / 2 - 3, y - 7, tw + 6, 14)
  ctx.fillStyle = colour; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, x, y)
}

export function paintRamps(ctx, w, h, { blocks, arrows = true, protractor = true, gate = null }) {
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h)
  const n = blocks.length
  // side by side when that gives each ramp more room, otherwise one above the other
  const cols = n > 1 && w / n > h * 0.8
  blocks.forEach((b, i) => {
    const [x0, top, W, H] = cols ? [(i * w) / n, 0, w / n, h] : [0, (i * h) / n, w, h / n]
    ctx.save(); ctx.translate(x0, 0)
    if (i > 0) { ctx.fillStyle = 'rgba(27,19,64,.08)'; cols ? ctx.fillRect(0, 0, 1, h) : ctx.fillRect(0, top, W, 1) }
    paintOne(ctx, W, H, top, b, { arrows, protractor, gate, small: n > 1 })
    ctx.restore()
  })
}

function paintOne(ctx, w, H, top, b, { arrows, protractor, gate, small }) {
  const L = RAMP.length
  const k = Math.min((w - 90) / L, (H - 40) / (L * 0.9))
  const hx = Math.max(40, (w - L * k) / 2 - 10), hy = top + H - 22 // the hinge
  const th = (b.angle * Math.PI) / 180, c = Math.cos(th), s = Math.sin(th)
  // a point d metres up the ramp from the hinge, raised e metres off its surface
  const P = (d, e = 0) => [hx + d * k * c - e * k * s, hy - d * k * s - e * k * c]
  // the bench
  ctx.fillStyle = '#F4F3F8'; ctx.fillRect(0, hy, w, top + H - hy)
  ctx.fillStyle = 'rgba(27,19,64,.12)'; ctx.fillRect(0, hy, w, 1.5)
  // the stand holding the top up
  const [tx, ty] = P(L)
  ctx.fillStyle = '#B8B6C8'; ctx.fillRect(tx - 3, ty, 6, hy - ty); ctx.fillRect(tx - 18, hy - 5, 36, 5)
  // the board
  const thick = 0.03
  ctx.beginPath(); const p0 = P(0), p1 = P(L), p2 = P(L, -thick), p3 = P(0, -thick)
  ctx.moveTo(...p0); ctx.lineTo(...p1); ctx.lineTo(...p2); ctx.lineTo(...p3); ctx.closePath()
  ctx.fillStyle = '#D9B48A'; ctx.fill(); ctx.strokeStyle = '#A57A4C'; ctx.lineWidth = 1; ctx.stroke()
  // the stop at the bottom
  ctx.beginPath(); const q0 = P(0), q1 = P(0, 0.05), q2 = P(-0.02, 0.05), q3 = P(-0.02)
  ctx.moveTo(...q0); ctx.lineTo(...q1); ctx.lineTo(...q2); ctx.lineTo(...q3); ctx.closePath(); ctx.fillStyle = '#8A5E33'; ctx.fill()
  // light gate, if any, `gate` metres down from where the block starts
  if (gate != null) {
    const d = L - (RAMP.start + gate), [gx, gy] = P(d, 0.09), [bx0, by0] = P(d, 0)
    ctx.strokeStyle = '#3A3459'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(bx0, by0); ctx.lineTo(gx, gy); ctx.stroke()
    ctx.fillStyle = FRICTION_COLOUR; ctx.beginPath(); ctx.arc(gx, gy, 3, 0, 7); ctx.fill()
  }
  // protractor at the hinge
  if (protractor) {
    const R = Math.min(80, L * k * 0.32)
    ctx.strokeStyle = 'rgba(27,19,64,.35)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(hx, hy, R, -Math.PI / 2, 0); ctx.stroke()
    for (let d = 0; d <= 90; d += 5) {
      const a = (d * Math.PI) / 180, r1 = d % 10 ? R - 4 : R - 8
      ctx.beginPath(); ctx.moveTo(hx + R * Math.cos(a), hy - R * Math.sin(a)); ctx.lineTo(hx + r1 * Math.cos(a), hy - r1 * Math.sin(a)); ctx.stroke()
    }
    ctx.strokeStyle = FRICTION_COLOUR; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(hx, hy, R * 0.55, -th, 0); ctx.stroke()
    ctx.fillStyle = INK; ctx.font = `700 ${small ? 12 : 14}px ${MONO}`; ctx.textAlign = 'left'; ctx.textBaseline = 'bottom'
    ctx.fillText(`${b.angle.toFixed(1)}°`, hx + R * 0.62 * Math.cos(th / 2) + 4, hy - R * 0.62 * Math.sin(th / 2) + 2)
  }
  // the block: centre at distance d from the hinge
  const bl = 0.14, bh = 0.07, d = L - b.s
  const corners = [P(d - bl / 2), P(d + bl / 2), P(d + bl / 2, bh), P(d - bl / 2, bh)]
  ctx.beginPath(); ctx.moveTo(...corners[0]); corners.slice(1).forEach(p => ctx.lineTo(...p)); ctx.closePath()
  ctx.fillStyle = BLOCKS[b.kind].colour; ctx.fill(); ctx.strokeStyle = 'rgba(27,19,64,.5)'; ctx.lineWidth = 1.2; ctx.stroke()
  const [cx, cy] = P(d, bh / 2)
  // its mass, on it if it fits, else just above it
  ctx.font = `700 11px ${SANS}`
  const fits = ctx.measureText(`${b.m} kg`).width < bl * k - 6
  const [mx, my] = fits ? [cx, cy] : P(d, bh + 0.05)
  ctx.save(); ctx.translate(mx, my); ctx.rotate(-th); ctx.fillStyle = fits && b.kind === 'rubber' ? '#fff' : INK; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(`${b.m} kg`, 0, 0); ctx.restore()
  // readings
  ctx.fillStyle = INK; ctx.font = `600 11px ${MONO}`; ctx.textAlign = 'left'; ctx.textBaseline = 'top'
  ctx.fillText(b.atBottom ? 'at the bottom' : b.sliding ? `sliding ${b.v.toFixed(2)} m/s` : b.slipAngle != null ? 'stopped' : 'held still', 12, top + 10)
  if (small) { ctx.fillStyle = INK3; ctx.font = `600 10px ${SANS}`; ctx.fillText(`${BLOCKS[b.kind].label.toUpperCase()}`, 12, top + 26) }
  if (!arrows) return
  // forces, one scale for all of them: the weight is drawn 0.32 m long at any mass
  const f = rampForces(b), sc = (0.32 * k) / f.W
  const along = f.along * sc, into = f.N * sc
  const [ox, oy] = P(d, bh / 2)
  // weight straight down and its two parts
  arrow(ctx, ox, oy, ox, oy + f.W * sc, INK)
  arrow(ctx, ox, oy, ox - along * c, oy + along * s, INK3, true) // down the slope
  arrow(ctx, ox, oy, ox + into * s, oy + into * c, INK3, true) // into the slope
  // the ramp pushes back (normal), from the bottom face
  const [nx, ny] = P(d, 0)
  arrow(ctx, nx, ny, nx - f.N * sc * s, ny - f.N * sc * c, NORMAL_COLOUR)
  // friction up the slope along the bottom face
  if (Math.abs(f.friction) > 1e-6) { const fr = -f.friction * sc, [fx, fy] = P(d + bl / 2, 0.005); arrow(ctx, fx, fy, fx + fr * c, fy - fr * s, FRICTION_COLOUR) }
  if (!small) {
    label(ctx, `W ${f.W.toFixed(2)} N`, ox + 34, oy + f.W * sc - 4, INK)
    label(ctx, `N ${f.N.toFixed(2)} N`, nx - f.N * sc * s, ny - f.N * sc * c - 12, NORMAL_COLOUR)
    if (Math.abs(f.friction) > 1e-6) { const fr = -f.friction * sc, [fx, fy] = P(d + bl / 2, 0.005); label(ctx, `friction ${(-f.friction).toFixed(2)} N`, fx + fr * c + 8, fy - fr * s - 14, FRICTION_COLOUR) }
  }
}
