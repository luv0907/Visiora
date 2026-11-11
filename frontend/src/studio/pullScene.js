/**
 * VISIORA Studio — a wooden block pulled along a bench by a spring balance, from the side:
 * slotted masses stacked on the block, the string, the balance (its rod stretching out as the
 * spring does) and the hand. Above: a close-up of the balance's scale, read to 0.1 N, and a
 * trace of the reading against time, so the peak before it slips and the steady pull after
 * it both show.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { BALANCE, makePull, reading, stepPull } from '../engine/pull'

const MONO = '"IBM Plex Mono", monospace'
const SANS = '"Instrument Sans", sans-serif'
const INK = '#1B1340'
const INK3 = '#6B6888'
const ACCENT = '#D6336C'

/** Pull a block of total mass m in real time; stops a few seconds after it slips. */
export function usePull(m) {
  const sim = useRef(null)
  const raf = useRef(0)
  const [, setTick] = useState(0)
  const make = useCallback(() => ({ ...makePull(m), running: false, done: false, hist: [[0, 0]] }), [m])
  if (!sim.current) sim.current = make()
  const reset = useCallback(() => { cancelAnimationFrame(raf.current); sim.current = make(); setTick(n => n + 1) }, [make])
  useEffect(() => { reset() }, [reset])
  useEffect(() => () => cancelAnimationFrame(raf.current), [])
  const start = useCallback(() => {
    cancelAnimationFrame(raf.current)
    sim.current = make()
    sim.current.running = true
    let last = performance.now()
    const frame = now => {
      const s = sim.current
      stepPull(s, Math.min(0.05, (now - last) / 1000))
      last = now
      s.hist.push([s.t, reading(s)])
      if ((s.slippedAt != null && s.t > s.slippedAt + 4.5) || s.t > 14) { s.running = false; s.done = true }
      setTick(n => n + 1)
      if (s.running) raf.current = requestAnimationFrame(frame)
    }
    raf.current = requestAnimationFrame(frame)
    setTick(n => n + 1)
  }, [make])
  return { sim: sim.current, start, reset }
}

function closeUp(ctx, x, y, w, h, F) {
  ctx.fillStyle = '#fff'; ctx.fillRect(x, y, w, h); ctx.strokeStyle = 'rgba(27,19,64,.2)'; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1)
  ctx.fillStyle = INK3; ctx.font = `600 9px ${SANS}`; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillText('BALANCE SCALE (newtons)', x + 8, y + 5)
  // a window 3 N wide around the pointer, with a tick every 0.1 N
  const half = 1.5, c = Math.max(half, Math.min(BALANCE.max - half, F)), lo = c - half
  const sx = v => x + 10 + ((v - lo) / (2 * half)) * (w - 20), base = y + h - 14
  ctx.strokeStyle = INK; ctx.fillStyle = INK; ctx.font = `600 10px ${MONO}`; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'
  for (let i = Math.ceil(lo * 10 - 1e-9); i <= (lo + 2 * half) * 10 + 1e-9; i++) {
    const v = i / 10, big = i % 5 === 0
    ctx.lineWidth = big ? 1.5 : 1; ctx.beginPath(); ctx.moveTo(sx(v), base); ctx.lineTo(sx(v), base - (big ? 14 : 8)); ctx.stroke()
    if (big) ctx.fillText(v.toFixed(1), sx(v), base - 16)
  }
  ctx.fillRect(x + 10, base, w - 20, 1.5)
  // the pointer
  const px = sx(F)
  ctx.fillStyle = ACCENT; ctx.beginPath(); ctx.moveTo(px, base - 3); ctx.lineTo(px - 6, base + 10); ctx.lineTo(px + 6, base + 10); ctx.closePath(); ctx.fill()
  ctx.fillRect(px - 1, base - 20, 2, 18)
}

function trace(ctx, x, y, w, h, hist, mus) {
  ctx.fillStyle = '#fff'; ctx.fillRect(x, y, w, h); ctx.strokeStyle = 'rgba(27,19,64,.2)'; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1)
  ctx.fillStyle = INK3; ctx.font = `600 9px ${SANS}`; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillText('READING – TIME', x + 8, y + 5)
  const tMax = Math.max(8, hist[hist.length - 1][0]), Fmax = Math.max(1, mus * 1.25)
  const X = t => x + 8 + (t / tMax) * (w - 16), Y = F => y + h - 8 - (F / Fmax) * (h - 26)
  ctx.fillStyle = 'rgba(27,19,64,.25)'; ctx.fillRect(x + 8, Y(0), w - 16, 1)
  ctx.strokeStyle = ACCENT; ctx.lineWidth = 2; ctx.beginPath()
  hist.forEach(([t, F], i) => (i ? ctx.lineTo(X(t), Y(F)) : ctx.moveTo(X(t), Y(F))))
  ctx.stroke()
}

export function paintPull(ctx, w, h, { sim, added }) {
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h)
  const benchY = h < 230 ? h * 0.8 : h * 0.74
  const ppm = Math.min(w / 0.95, (h * 0.5) / 0.22)
  const X = m => 20 + m * ppm
  // the bench
  ctx.fillStyle = '#D9B48A'; ctx.fillRect(0, benchY, w, 8); ctx.fillStyle = '#C29A6B'; ctx.fillRect(0, benchY + 8, w, h - benchY - 8)
  ctx.strokeStyle = 'rgba(92,58,24,.2)'; ctx.lineWidth = 1
  for (let gx = 0; gx < w; gx += 46) { ctx.beginPath(); ctx.moveTo(gx, benchY + 18); ctx.quadraticCurveTo(gx + 20, benchY + 14, gx + 40, benchY + 19); ctx.stroke() }
  // the block and its slotted masses
  const bw = 0.1 * ppm, bh = 0.045 * ppm, bx = X(sim.xb)
  ctx.fillStyle = '#C8925B'; ctx.fillRect(bx, benchY - bh, bw, bh); ctx.strokeStyle = '#8A5E33'; ctx.lineWidth = 1.5; ctx.strokeRect(bx + 0.75, benchY - bh + 0.75, bw - 1.5, bh - 1.5)
  const n = Math.round(added / 0.2), mh = Math.max(5, 0.012 * ppm), mw = bw * 0.6
  for (let i = 0; i < n; i++) {
    const my = benchY - bh - (i + 1) * mh
    ctx.fillStyle = '#9C9AAE'; ctx.fillRect(bx + (bw - mw) / 2, my, mw, mh - 1); ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(bx + (bw - mw) / 2, my, mw, 2)
  }
  ctx.fillStyle = INK; ctx.font = `700 11px ${SANS}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(`${(sim.m).toFixed(1)} kg`, bx + bw / 2, benchY - bh / 2)
  // string, then the balance: its rod stretches out of the body as the spring does
  const ext = reading(sim) / BALANCE.k
  const hookX = bx + bw + 0.08 * ppm, cy = benchY - bh * 0.5
  ctx.strokeStyle = INK; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(bx + bw, cy); ctx.lineTo(hookX, cy); ctx.stroke()
  const rod = (0.03 + ext) * ppm, bodyX = hookX + rod, bodyW = 0.2 * ppm, bodyH = Math.max(12, 0.026 * ppm)
  ctx.fillStyle = '#7A7790'; ctx.fillRect(hookX, cy - 1.5, rod, 3)
  ctx.fillStyle = '#E9E8EF'; ctx.fillRect(bodyX, cy - bodyH / 2, bodyW, bodyH); ctx.strokeStyle = 'rgba(27,19,64,.45)'; ctx.strokeRect(bodyX + 0.5, cy - bodyH / 2 + 0.5, bodyW - 1, bodyH - 1)
  ctx.strokeStyle = 'rgba(27,19,64,.4)'
  for (let i = 1; i < 10; i++) { const tx = bodyX + (i / 10) * bodyW; ctx.beginPath(); ctx.moveTo(tx, cy - bodyH / 2); ctx.lineTo(tx, cy - bodyH / 2 + (i % 5 ? 3 : 6)); ctx.stroke() }
  // the hand holding the far end
  const hx = bodyX + bodyW
  ctx.fillStyle = '#E8B58F'; ctx.beginPath(); ctx.ellipse(hx + 10, cy, 12, 9, 0, 0, 7); ctx.fill(); ctx.fillRect(hx + 14, cy - 6, Math.max(0, w - hx - 14), 12)
  // labels
  ctx.fillStyle = INK; ctx.font = `600 11px ${MONO}`; ctx.textAlign = 'left'; ctx.textBaseline = 'top'
  ctx.fillText(sim.slippedAt == null ? (sim.running ? 'held still by friction…' : 'ready') : 'sliding', 12, benchY + 22)
  // close-up of the scale and the trace, when there is room for them above the bench
  if (h < 230) return
  const top = 10, boxH = Math.min(78, h * 0.26), gap = 10
  const cw = (w - 3 * gap) / 2
  closeUp(ctx, gap, top, cw, boxH, reading(sim))
  trace(ctx, 2 * gap + cw, top, cw, boxH, sim.hist, sim.surface.mus * sim.N)
}
