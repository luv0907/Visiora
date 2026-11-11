/**
 * VISIORA Studio — drawing a throw from the side: sky and ground, distance marks along the
 * ground, the wall it is thrown from, a launcher set at the throw's angle, each ball's path with
 * a dot every tenth of a second, where it landed, and its highest point. One scale both ways, so
 * angles and curves are drawn true.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { launch, stepFlight } from '../engine/flight'

const MONO = '"IBM Plex Mono", monospace'
const INK = '#1B1340'
export const SHOT_COLOURS = ['#D6336C', '#2051C8', '#1E7F4F']
const MARK = 0.1

/** Run throws side by side in real time; the physics steps in 1 ms pieces whatever the frame rate. */
export function useFlights({ world, shots, rate = 1 }) {
  const sim = useRef(null)
  const raf = useRef(0)
  const [, setTick] = useState(0)
  const key = JSON.stringify(shots)
  const make = useCallback(() => ({
    t: 0, running: false, done: false, next: MARK,
    balls: shots.map(s => launch(s.kind, s)), paths: shots.map(s => [[0, s.h]]), marks: shots.map(() => []),
  }), [key]) // eslint-disable-line react-hooks/exhaustive-deps
  if (!sim.current) sim.current = make()
  const reset = useCallback(() => { cancelAnimationFrame(raf.current); sim.current = make(); setTick(n => n + 1) }, [make])
  useEffect(() => { reset() }, [reset, world.g, world.rho])
  useEffect(() => () => cancelAnimationFrame(raf.current), [])
  const start = useCallback(() => {
    if (sim.current.done || sim.current.t > 0) sim.current = make()
    sim.current.running = true
    let last = performance.now()
    const frame = now => {
      const s = sim.current
      const dt = Math.min(0.05, (now - last) / 1000) * rate
      last = now
      s.balls.forEach((b, i) => { if (!b.rest) { stepFlight(b, dt, world); s.paths[i].push([b.x, b.y]) } })
      s.t += dt
      while (s.t >= s.next) { s.balls.forEach((b, i) => { if (!b.landed) s.marks[i].push([b.x, b.y]) }); s.next += MARK }
      if (s.balls.every(b => b.rest) || s.t > 30) { s.running = false; s.done = true }
      setTick(n => n + 1)
      if (s.running) raf.current = requestAnimationFrame(frame)
    }
    raf.current = requestAnimationFrame(frame)
    setTick(n => n + 1)
  }, [make, rate, world])
  return { sim: sim.current, start, reset }
}

/** How much of the field to show: enough for every throw (worked out with no air, so it fits). */
export function fieldSpan(shots, g) {
  let x = 4, y = 2
  for (const s of shots) {
    const a = (s.theta * Math.PI) / 180, ux = s.u * Math.cos(a), uy = s.u * Math.sin(a)
    const T = (uy + Math.sqrt(uy * uy + 2 * g * s.h)) / g
    x = Math.max(x, ux * T * 1.1 + 2)
    y = Math.max(y, s.h + (uy > 0 ? (uy * uy) / (2 * g) : 0) + 1)
  }
  return { x, y }
}

export function paintFlight(ctx, w, h, { world, shots, sim, span, strobe = true, arrows = false }) {
  const padL = 34, padB = 40, top = 16
  const k = Math.min((w - padL - 16) / span.x, (h - padB - top) / span.y)
  const X = m => padL + m * k, Y = m => h - padB - m * k
  const sky = ctx.createLinearGradient(0, 0, 0, Y(0))
  sky.addColorStop(0, world.sky?.[0] ?? '#9CC9F0'); sky.addColorStop(1, world.sky?.[1] ?? '#E7F1FB')
  ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h)
  ctx.fillStyle = world.ground ?? '#8A9A5B'; ctx.fillRect(0, Y(0), w, h - Y(0))
  // distance marks along the ground
  // marks far enough apart on screen that their labels never touch, on a phone as on a laptop
  const step = [1, 2, 5, 10, 20, 50].find(m => m * k >= 44) ?? 100
  ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.fillStyle = '#fff'; ctx.font = `600 11px ${MONO}`; ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.lineWidth = 1.2
  for (let m = 0; m <= span.x; m += step) { ctx.beginPath(); ctx.moveTo(X(m), Y(0)); ctx.lineTo(X(m), Y(0) + 7); ctx.stroke(); ctx.fillText(`${m} m`, X(m), Y(0) + 10) }
  // the wall
  const hMax = Math.max(0, ...shots.map(s => s.h))
  if (hMax > 0) { ctx.fillStyle = '#B8A99A'; ctx.fillRect(X(0) - 26, Y(hMax), 26, hMax * k); ctx.strokeStyle = 'rgba(27,19,64,.3)'; ctx.strokeRect(X(0) - 26, Y(hMax), 26, hMax * k) }
  // height marks up the left
  ctx.fillStyle = INK; ctx.textAlign = 'right'; ctx.textBaseline = 'middle'
  const ystep = [1, 2, 5, 10, 20].find(m => m * k >= 18) ?? 50
  for (let m = ystep; m <= span.y; m += ystep) { ctx.fillRect(padL - 5, Y(m), 5, 1); ctx.fillText(`${m}`, padL - 8, Y(m)) }
  shots.forEach((s, i) => {
    const c = SHOT_COLOURS[i % SHOT_COLOURS.length]
    // the launcher, pointing along the throw
    ctx.save(); ctx.translate(X(0), Y(s.h)); ctx.rotate((-s.theta * Math.PI) / 180)
    ctx.fillStyle = '#2A2350'; ctx.beginPath(); ctx.roundRect(-4, -5, 30, 10, 3); ctx.fill(); ctx.restore()
    const path = sim.paths[i], b = sim.balls[i]
    ctx.strokeStyle = c; ctx.lineWidth = 2; ctx.globalAlpha = 0.85
    ctx.beginPath(); path.forEach(([x, y], j) => (j ? ctx.lineTo(X(x), Y(y)) : ctx.moveTo(X(x), Y(y)))); ctx.stroke(); ctx.globalAlpha = 1
    if (strobe) for (const [x, y] of sim.marks[i]) { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(X(x), Y(y), 2.6, 0, 2 * Math.PI); ctx.fill() }
    if (b.landed) {
      ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(X(b.landed.x), Y(0)); ctx.lineTo(X(b.landed.x) - 6, Y(0) - 10); ctx.lineTo(X(b.landed.x) + 6, Y(0) - 10); ctx.closePath(); ctx.fill()
      ctx.font = `700 12px ${MONO}`; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.fillText(`${b.landed.x.toFixed(1)} m`, X(b.landed.x), Y(0) - 12 - i * 14)
    }
    if (b.top.y > s.h + 0.3 && (b.landed || b.vy < 0)) {
      ctx.strokeStyle = c; ctx.setLineDash([3, 3]); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(X(b.top.x), Y(b.top.y)); ctx.lineTo(X(b.top.x), Y(0)); ctx.stroke(); ctx.setLineDash([])
      ctx.fillStyle = c; ctx.font = `600 11px ${MONO}`; ctx.textAlign = 'left'; ctx.textBaseline = 'bottom'; ctx.fillText(`top ${b.top.y.toFixed(1)} m`, X(b.top.x) + 4, Y(b.top.y) - 4)
    }
    // the ball itself
    const r = Math.max(4, b.b.r * k)
    ctx.fillStyle = b.kind === 'shot' ? '#5B6270' : b.kind === 'pingpong' ? '#FFFFFF' : b.kind === 'football' ? '#F4F4F2' : '#B3261E'
    ctx.strokeStyle = INK; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(X(b.x), Y(b.y) - r, r, 0, 2 * Math.PI); ctx.fill(); ctx.stroke()
    if (arrows && !b.landed && (b.vx || b.vy)) {
      const ax = X(b.x), ay = Y(b.y) - r, sc = 4
      const arrow = (dx, dy, col) => { ctx.strokeStyle = col; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(ax + dx, ay + dy); ctx.stroke() }
      arrow(b.vx * sc, 0, '#2051C8'); arrow(0, -b.vy * sc, '#D6336C')
    }
  })
  // the clock
  ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.beginPath(); ctx.roundRect(w - 112, 10, 100, 34, 8); ctx.fill()
  ctx.fillStyle = INK; ctx.font = `600 18px ${MONO}`; ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; ctx.fillText(`${sim.t.toFixed(2)} s`, w - 22, 27)
}
