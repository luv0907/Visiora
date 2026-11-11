/**
 * VISIORA Studio — boxes on floors, seen from the side. One lane per box, stacked; the view
 * follows the furthest box, with a mark every metre so speed shows. The push (blue), friction
 * (pink) and the net force (ink) are drawn to one scale in every lane, so they compare honestly.
 * A small speed–time graph sits in the corner of the first lane.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { forcesAt, step } from '../engine/forces'
import { surface } from '../engine/pushLessons'

const MONO = '"IBM Plex Mono", monospace'
const SANS = '"Instrument Sans", sans-serif'
const INK = '#1B1340'
export const PUSH_COLOUR = '#2051C8'
export const FRICTION_COLOUR = '#D6336C'
const FLOORS = {
  ice: { top: '#E3F1F8', body: '#C7E2EF', grain: 'rgba(255,255,255,.9)' },
  wood: { top: '#D9B48A', body: '#C29A6B', grain: 'rgba(92,58,24,.25)' },
  carpet: { top: '#A8525F', body: '#8E3F4C', grain: 'rgba(255,255,255,.12)' },
  none: { top: '#E4E3EC', body: '#CFCDDA', grain: 'rgba(27,19,64,.08)' },
}

/**
 * Run boxes in real time. lanes: [{ m, surface, F, v0 }]. pushRef, if given, overrides the
 * first lane's push live (free play). T stops the run.
 */
export function useLanes({ lanes, T = 60, pushRef }) {
  const sim = useRef(null)
  const raf = useRef(0)
  const [, setTick] = useState(0)
  const key = JSON.stringify(lanes)
  const make = useCallback(() => ({ t: 0, running: false, done: false, hist: [[0, lanes[0].v0 ?? 0]], boxes: lanes.map(l => ({ x: 0, v: l.v0 ?? 0 })) }), [key]) // eslint-disable-line react-hooks/exhaustive-deps
  if (!sim.current) sim.current = make()
  const reset = useCallback(() => { cancelAnimationFrame(raf.current); sim.current = make(); setTick(n => n + 1) }, [make])
  useEffect(() => { reset() }, [reset])
  useEffect(() => () => cancelAnimationFrame(raf.current), [])
  const pause = useCallback(() => { cancelAnimationFrame(raf.current); sim.current.running = false; setTick(n => n + 1) }, [])
  const start = useCallback((fresh = false) => {
    cancelAnimationFrame(raf.current)
    if (fresh || sim.current.done) sim.current = make()
    sim.current.running = true
    let last = performance.now()
    const frame = now => {
      const s = sim.current
      const dt = Math.min(0.05, (now - last) / 1000, T - s.t)
      last = now
      s.boxes = s.boxes.map((b, i) => {
        const l = lanes[i], F = i === 0 && pushRef ? pushRef.current : l.F
        const st = step({ t: s.t, x: b.x, v: b.v }, dt, F, l.m, surface(l.surface)).state
        return { x: st.x, v: st.v }
      })
      s.t += dt
      s.hist.push([s.t, s.boxes[0].v])
      if (s.hist.length > 4000) s.hist.splice(0, s.hist.length - 4000)
      if (s.t >= T - 1e-9) { s.running = false; s.done = true }
      setTick(n => n + 1)
      if (s.running) raf.current = requestAnimationFrame(frame)
    }
    raf.current = requestAnimationFrame(frame)
    setTick(n => n + 1)
  }, [make, lanes, pushRef, T]) // eslint-disable-line react-hooks/exhaustive-deps
  return { sim: sim.current, start, pause, reset }
}

/** The forces on each box right now. */
export const laneForces = (sim, lanes, pushRef) => sim.boxes.map((b, i) => forcesAt(b, i === 0 && pushRef ? pushRef.current : lanes[i].F, lanes[i].m, surface(lanes[i].surface)))

function arrow(ctx, x0, y, x1, colour, label, above = true) {
  if (Math.abs(x1 - x0) < 2) return
  const d = Math.sign(x1 - x0), head = Math.min(9, Math.abs(x1 - x0))
  ctx.strokeStyle = colour; ctx.fillStyle = colour; ctx.lineWidth = 3
  ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1 - d * head, y); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(x1, y); ctx.lineTo(x1 - d * head, y - 5.5); ctx.lineTo(x1 - d * head, y + 5.5); ctx.closePath(); ctx.fill()
  if (label) {
    ctx.font = `600 11px ${MONO}`; ctx.textAlign = 'center'; ctx.textBaseline = above ? 'bottom' : 'top'
    // a short arrow keeps its label behind the head, never over what it pushes on
    const tw = ctx.measureText(label).width / 2, mid = (x0 + x1) / 2
    ctx.fillText(label, d > 0 ? Math.min(mid, x1 - tw) : Math.max(mid, x1 + tw), y + (above ? -7 : 7))
  }
}

function speedGraph(ctx, x, y, w, h, hist) {
  ctx.fillStyle = 'rgba(255,255,255,.92)'; ctx.fillRect(x, y, w, h); ctx.strokeStyle = 'rgba(27,19,64,.15)'; ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1)
  const tEnd = Math.max(4, hist[hist.length - 1][0]), t0 = Math.max(0, tEnd - 10)
  const vMax = Math.max(1, ...hist.map(p => Math.abs(p[1]))) * 1.15
  const X = t => x + 8 + ((t - t0) / (tEnd - t0)) * (w - 16), Y = v => y + h - 16 - (v / vMax) * (h - 30)
  ctx.fillStyle = '#6B6888'; ctx.font = `600 9px ${SANS}`; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillText('SPEED – TIME', x + 8, y + 5)
  ctx.textAlign = 'right'; ctx.fillText(`${vMax.toFixed(1)} m/s`, x + w - 6, y + 5)
  ctx.fillStyle = 'rgba(27,19,64,.35)'; ctx.fillRect(x + 8, Y(0), w - 16, 1)
  ctx.strokeStyle = PUSH_COLOUR; ctx.lineWidth = 2; ctx.beginPath()
  let first = true
  for (const [t, v] of hist) { if (t < t0) continue; first ? ctx.moveTo(X(t), Y(v)) : ctx.lineTo(X(t), Y(v)); first = false }
  ctx.stroke()
}

export function paintLanes(ctx, w, h, { sim, lanes, forces, arrows = true, graph = false, span = 8 }) {
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h)
  const n = lanes.length, laneH = h / n
  const lead = Math.max(...sim.boxes.map(b => b.x)), trail = Math.min(...sim.boxes.map(b => b.x))
  const pad = Math.min(130, w * 0.3) // room on the left for the push arrow and its label
  // zoom out, if need be, so the box that is behind stays in view as well
  const ppm = Math.max(12, Math.min(110, w / span, (w * 0.55 - pad + pad * 0.6) / Math.max(1e-6, lead - trail)))
  const camera = Math.max(0, lead - (w * 0.55 - pad) / ppm) // world x at the pad
  const X = m => pad + (m - camera) * ppm
  const maxF = Math.max(20, ...lanes.map((l, i) => Math.max(Math.abs(forces[i].applied), Math.abs(forces[i].friction))))
  const pxPerN = Math.min(2.2, (w * 0.28) / maxF)
  lanes.forEach((l, i) => {
    const top = i * laneH, floorY = top + laneH * 0.68
    const F = FLOORS[l.surface] ?? FLOORS.wood
    if (i > 0) { ctx.fillStyle = 'rgba(27,19,64,.08)'; ctx.fillRect(0, top, w, 1) }
    ctx.fillStyle = F.top; ctx.fillRect(0, floorY, w, 6); ctx.fillStyle = F.body; ctx.fillRect(0, floorY + 6, w, top + laneH - floorY - 6)
    ctx.strokeStyle = F.grain; ctx.lineWidth = 1
    for (let gx = Math.floor((camera - pad / ppm) * 4) / 4; X(gx) < w; gx += 0.25) { const sx = X(gx); ctx.beginPath(); ctx.moveTo(sx, floorY + 10); ctx.lineTo(sx + 14, floorY + 10); ctx.stroke() }
    // a mark every metre, with labels far enough apart never to touch
    const lab = [1, 2, 5].find(s => s * ppm >= 44) ?? 10
    ctx.fillStyle = 'rgba(27,19,64,.55)'; ctx.font = `500 10px ${MONO}`; ctx.textAlign = 'center'; ctx.textBaseline = 'top'
    const labY = Math.max(floorY + 34, top + laneH - 18) // under the friction arrow, near the lane's foot
    for (let m = Math.max(0, Math.ceil(camera - pad / ppm)); X(m) < w + 20; m++) { ctx.fillRect(X(m), floorY, 1.2, 8); if (m % lab === 0) ctx.fillText(`${m} m`, X(m), labY) }
    // the box: its size grows with the mass
    const side = Math.max(44, Math.min(laneH * 0.42, 0.75 * Math.cbrt(l.m / 10) * ppm))
    const b = sim.boxes[i], bx = X(b.x)
    ctx.fillStyle = '#C8925B'; ctx.fillRect(bx, floorY - side, side, side)
    ctx.strokeStyle = '#8A5E33'; ctx.lineWidth = 2; ctx.strokeRect(bx + 1, floorY - side + 1, side - 2, side - 2)
    ctx.beginPath(); ctx.moveTo(bx + 3, floorY - side + 3); ctx.lineTo(bx + side - 3, floorY - 3); ctx.moveTo(bx + side - 3, floorY - side + 3); ctx.lineTo(bx + 3, floorY - 3); ctx.strokeStyle = 'rgba(138,94,51,.45)'; ctx.stroke()
    ctx.fillStyle = '#fff'; ctx.fillRect(bx + side / 2 - 20, floorY - side / 2 - 9, 40, 18)
    ctx.fillStyle = INK; ctx.font = `700 11px ${SANS}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(`${l.m} kg`, bx + side / 2, floorY - side / 2)
    if (arrows) {
      const f = forces[i]
      // the push presses on the back face; friction acts along the floor
      if (Math.abs(f.applied) > 0.05) { const len = f.applied * pxPerN; arrow(ctx, f.applied > 0 ? bx - Math.abs(len) - 2 : bx + side + Math.abs(len) + 2, floorY - side * 0.55, f.applied > 0 ? bx - 2 : bx + side + 2, PUSH_COLOUR, `push ${Math.abs(f.applied).toFixed(1)} N`) }
      if (Math.abs(f.friction) > 0.05) { const cx = bx + side / 2; arrow(ctx, cx, floorY + 3, cx + f.friction * pxPerN, FRICTION_COLOUR, `friction ${Math.abs(f.friction).toFixed(1)} N`, false) }
      const cx = bx + side / 2, ny = floorY - side - 14
      if (Math.abs(f.net) > 0.05) arrow(ctx, cx, ny, cx + f.net * pxPerN, INK, `net ${Math.abs(f.net).toFixed(1)} N`)
      else { ctx.fillStyle = INK; ctx.font = `600 11px ${MONO}`; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.fillText('net 0 N', cx, ny + 4) }
    }
    // speed and distance for this lane
    ctx.fillStyle = INK; ctx.font = `600 11px ${MONO}`; ctx.textAlign = 'left'; ctx.textBaseline = 'top'
    ctx.fillText(`${Math.abs(b.v).toFixed(2)} m/s · ${b.x.toFixed(2)} m`, 12, top + 10)
    if (n > 1) { ctx.fillStyle = '#6B6888'; ctx.font = `600 10px ${SANS}`; ctx.fillText(`${surface(l.surface).label.toUpperCase()}`, 12, top + 26) }
  })
  if (graph) { const gw = Math.min(200, w * 0.42), gh = Math.min(96, laneH * 0.32); speedGraph(ctx, w - gw - 10, 10, gw, gh, sim.hist) }
  ctx.fillStyle = INK; ctx.font = `600 11px ${MONO}`; ctx.textAlign = 'right'; ctx.textBaseline = 'bottom'; ctx.fillText(`t = ${sim.t.toFixed(2)} s`, w - 12, h - 8)
}
