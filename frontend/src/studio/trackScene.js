/**
 * VISIORA Studio — drawing an air track from the side: the beam with its air holes and a
 * centimetre scale, rubber-band end stops, two gliders (extra weights as discs, a 10 cm card on
 * top, spring or velcro bumpers facing each other), the light gates with their timer readings,
 * a speed arrow over each glider, and below it all a momentum bar for A, for B and for the total.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { TRACK, makeTrack, stepTrack, totals } from '../engine/airtrack'

const MONO = '"IBM Plex Mono", monospace'
const SANS = '"Instrument Sans", sans-serif'
const INK = '#1B1340'
const INK3 = '#6B6888'
export const GLIDER_COLOURS = ['#D6336C', '#2051C8']
export const extraWeights = m => Math.max(0, Math.round((m - 0.2) / 0.1))

/** Run the track in real time; physics steps in 1 ms pieces whatever the frame rate. */
export function useTrack({ gliders, e, gates, until, rate = 1, tMax = 20 }) {
  const sim = useRef(null)
  const raf = useRef(0)
  const [, setTick] = useState(0)
  const key = JSON.stringify({ gliders, e, gates })
  const make = useCallback(() => ({ ...makeTrack(gliders, { e, gates }), running: false, done: false }), [key]) // eslint-disable-line react-hooks/exhaustive-deps
  if (!sim.current) sim.current = make()
  const reset = useCallback(() => { cancelAnimationFrame(raf.current); sim.current = make(); setTick(n => n + 1) }, [make])
  useEffect(() => { reset() }, [reset])
  useEffect(() => () => cancelAnimationFrame(raf.current), [])
  const untilRef = useRef(until)
  untilRef.current = until
  const start = useCallback(() => {
    cancelAnimationFrame(raf.current)
    sim.current = make()
    sim.current.running = true
    let last = performance.now()
    const frame = now => {
      const s = sim.current
      stepTrack(s, Math.min(0.05, (now - last) / 1000) * rate)
      last = now
      if (s.t > tMax || untilRef.current?.(s)) { s.running = false; s.done = true }
      setTick(n => n + 1)
      if (s.running) raf.current = requestAnimationFrame(frame)
    }
    raf.current = requestAnimationFrame(frame)
    setTick(n => n + 1)
  }, [make, rate, tMax])
  return { sim: sim.current, start, reset }
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath()
}

function arrow(ctx, x0, y, x1, colour) {
  const d = Math.sign(x1 - x0)
  ctx.strokeStyle = colour; ctx.fillStyle = colour; ctx.lineWidth = 2.5
  ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1 - d * 6, y); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(x1, y); ctx.lineTo(x1 - d * 9, y - 5); ctx.lineTo(x1 - d * 9, y + 5); ctx.closePath(); ctx.fill()
}

/** Momentum scale for the bars: room for anything the gliders could share between them. */
export const barScale = gliders => Math.max(0.05, 1.1 * gliders.reduce((p, g) => p + g.m * Math.abs(g.v), 0))

export function paintTrack(ctx, w, h, { sim, bumper = 'spring', showGates = true, arrows = true, bars = true, pScale = 0.2, names = ['A', 'B'] }) {
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h)
  const pad = 22
  const k = (w - 2 * pad) / TRACK.length
  const X = m => pad + m * k
  const gh = Math.max(16, Math.min(30, 0.12 * k)) // glider height
  const barsH = bars ? Math.min(160, h * 0.4) : 0
  const beamY = Math.min(h - barsH - 56, Math.max(gh * 2.6 + 50, (h - barsH) * 0.58))
  // the bench under it
  ctx.fillStyle = '#F4F3F8'; ctx.fillRect(0, beamY + 30, w, h - beamY - 30)
  // legs and the beam
  ctx.fillStyle = '#C9C6D6'
  for (const m of [0.15, TRACK.length - 0.15]) ctx.fillRect(X(m) - 3, beamY + 10, 6, 20)
  const beam = ctx.createLinearGradient(0, beamY, 0, beamY + 10)
  beam.addColorStop(0, '#E4E3EC'); beam.addColorStop(1, '#A9A6B8')
  ctx.fillStyle = beam; ctx.fillRect(X(0) - 8, beamY, X(TRACK.length) - X(0) + 16, 10)
  ctx.fillStyle = 'rgba(27,19,64,.25)'
  for (let m = 0.05; m < TRACK.length; m += 0.05) { ctx.beginPath(); ctx.arc(X(m), beamY + 4, 1, 0, 7); ctx.fill() }
  // the scale under the beam, labels far enough apart never to touch
  const lab = [0.1, 0.2, 0.5, 1].find(m => m * k >= 46) ?? 1
  ctx.strokeStyle = INK3; ctx.fillStyle = INK3; ctx.font = `500 10px ${MONO}`; ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.lineWidth = 1
  for (let i = 0; i <= TRACK.length * 10 + 1e-9; i++) {
    const m = i / 10, big = Math.abs(m / lab - Math.round(m / lab)) < 1e-6
    ctx.beginPath(); ctx.moveTo(X(m), beamY + 12); ctx.lineTo(X(m), beamY + 12 + (big ? 6 : 3)); ctx.stroke()
    if (big) { ctx.textAlign = m === 0 ? 'left' : m >= TRACK.length - 1e-9 ? 'right' : 'center'; ctx.fillText(`${Math.round(m * 100)} cm`, X(m) + (m === 0 ? -4 : m >= TRACK.length - 1e-9 ? 4 : 0), beamY + 19) }
  }
  // end stops: a post with a rubber band
  for (const x of [X(0) - 6, X(TRACK.length) + 6]) {
    ctx.fillStyle = INK; ctx.fillRect(x - 2, beamY - gh - 6, 4, gh + 6)
    ctx.strokeStyle = '#D9822B'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, beamY - gh - 4); ctx.lineTo(x, beamY - 2); ctx.stroke()
  }
  // light gates: an upright each side, a beam across, and the timer above
  if (showGates) sim.gates.forEach((gate, i) => {
    const gx = X(gate.x), top = beamY - gh * 2.3 - 8
    const blocked = sim.open.some(o => o.gate === i)
    ctx.fillStyle = '#3A3459'; ctx.fillRect(gx - 7, top, 3, beamY - top); ctx.fillRect(gx + 4, top, 3, beamY - top); ctx.fillRect(gx - 7, top, 14, 4)
    ctx.strokeStyle = blocked ? 'rgba(214,51,108,.9)' : 'rgba(214,51,108,.35)'; ctx.lineWidth = blocked ? 2.5 : 1.5
    ctx.beginPath(); ctx.moveTo(gx - 4, beamY - gh * 1.55); ctx.lineTo(gx + 4, beamY - gh * 1.55); ctx.stroke()
    const last = gate.passes[gate.passes.length - 1]
    const text = blocked ? '…' : last ? `${last.time.toFixed(3)} s` : '0.000 s'
    ctx.font = `600 11px ${MONO}`; const tw = ctx.measureText(text).width + 12
    roundRect(ctx, gx - tw / 2, top - 30, tw, 18, 4); ctx.fillStyle = INK; ctx.fill()
    ctx.fillStyle = '#7CF2B0'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, gx, top - 21)
    ctx.fillStyle = INK3; ctx.font = `500 10px ${SANS}`; ctx.fillText(`Gate ${i + 1}`, gx, top - 40)
  })
  // gliders
  sim.g.forEach((g, i) => {
    const x0 = X(g.x), gw = TRACK.glider * k, colour = GLIDER_COLOURS[i]
    // the card (flag) on top, 10 cm long
    const cw = TRACK.card * k, cx = x0 + gw / 2 - cw / 2
    ctx.fillStyle = '#FFF'; ctx.strokeStyle = 'rgba(27,19,64,.5)'; ctx.lineWidth = 1
    ctx.fillRect(cx, beamY - gh * 1.9, cw, gh * 0.9); ctx.strokeRect(cx + 0.5, beamY - gh * 1.9 + 0.5, cw - 1, gh * 0.9 - 1)
    // body
    roundRect(ctx, x0, beamY - gh, gw, gh, 4); ctx.fillStyle = colour; ctx.fill()
    ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.fillRect(x0 + 3, beamY - gh + 3, gw - 6, gh * 0.3)
    // extra weights as discs on its side
    const n = extraWeights(g.m), r = Math.min(gh * 0.28, gw / (2 * n + 2))
    for (let j = 0; j < n; j++) { ctx.beginPath(); ctx.arc(x0 + gw / 2 + (j - (n - 1) / 2) * r * 2.2, beamY - gh * 0.42, r, 0, 7); ctx.fillStyle = '#E4E3EC'; ctx.fill(); ctx.strokeStyle = 'rgba(27,19,64,.4)'; ctx.stroke() }
    // the bumper facing the other glider
    const face = i === 0 ? x0 + gw : x0, out = i === 0 ? 1 : -1
    if (bumper === 'velcro') { ctx.fillStyle = '#5B5675'; ctx.fillRect(i === 0 ? face : face - 3, beamY - gh * 0.8, 3, gh * 0.6) }
    else { ctx.strokeStyle = '#3A3459'; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(face, beamY - gh / 2); for (let z = 1; z <= 4; z++) ctx.lineTo(face + out * z * 1.2, beamY - gh / 2 + (z % 2 ? -3 : 3)); ctx.stroke() }
    // its letter on the card, where the weights never cover it
    ctx.fillStyle = colour; ctx.font = `700 ${Math.round(gh * 0.55)}px ${SANS}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillText(names[i], x0 + gw / 2, beamY - gh * 1.45)
    // speed arrow above the card: 1 m/s is drawn as 0.4 m of track
    // when they are stuck together one arrow, from the middle of the pair, says it all
    if (arrows && Math.abs(g.v) > 0.004 && !(sim.stuck && i === 1)) {
      const y = beamY - gh * 2.3 - 2
      const mid = sim.stuck ? x0 + gw : x0 + gw / 2, len = Math.max(14, Math.abs(g.v) * 0.4 * k) * Math.sign(g.v)
      arrow(ctx, mid, y, mid + len, colour)
      ctx.fillStyle = colour; ctx.font = `600 10px ${MONO}`; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'
      ctx.fillText(`${Math.abs(g.v).toFixed(2)} m/s`, mid + len / 2, y - 6)
    }
  })
  if (!bars) return
  // momentum bars: right is positive (to the right), left negative
  const top = beamY + 60, rowH = Math.min(30, (h - top - 14) / 3)
  const labW = 46, numW = 92, zero = labW + (w - labW - numW) / 2, half = (w - labW - numW) / 2 - 8
  ctx.fillStyle = INK3; ctx.font = `600 10px ${SANS}`; ctx.textAlign = 'left'; ctx.textBaseline = 'bottom'
  ctx.fillText('MOMENTUM  (mass × speed, → is positive)', 12, top - 4)
  const rows = [[names[0], sim.g[0].m * sim.g[0].v, GLIDER_COLOURS[0]], [names[1], sim.g[1].m * sim.g[1].v, GLIDER_COLOURS[1]], ['Total', totals(sim).p, INK]]
  rows.forEach(([name, p, colour], j) => {
    const y = top + j * rowH + 4, bh = rowH - 10
    ctx.fillStyle = '#F4F3F8'; ctx.fillRect(zero - half, y, half * 2, bh)
    const len = Math.max(-half, Math.min(half, (p / pScale) * half))
    ctx.fillStyle = colour; ctx.fillRect(Math.min(zero, zero + len), y, Math.abs(len), bh)
    ctx.fillStyle = INK; ctx.font = `${j === 2 ? 700 : 600} 11px ${SANS}`; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(name, 12, y + bh / 2)
    ctx.font = `600 11px ${MONO}`; ctx.textAlign = 'right'; ctx.fillText(`${p >= 0 ? ' ' : '−'}${Math.abs(p).toFixed(3)}`, w - 12, y + bh / 2)
  })
  ctx.fillStyle = INK; ctx.fillRect(zero - 0.75, top, 1.5, rowH * 3)
  ctx.fillStyle = INK3; ctx.font = `500 10px ${MONO}`; ctx.textAlign = 'right'; ctx.textBaseline = 'top'; ctx.fillText('kg·m/s', w - 12, top + rowH * 3)
}
