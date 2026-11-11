/**
 * VISIORA Studio — drawing floating and sinking: glass tanks of liquid with a cube in each
 * (drawn to scale), the waterline, how much is under, and arrows for the weight and the upthrust.
 * Also the Archimedes bench: a spring balance on a stand, an overflow can and a measuring
 * cylinder, each with a close-up so its scale can be read to its least count.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { BALANCE, forces, hangBlock, hangY, placeBlock, stepBlock, stepHang } from '../engine/buoy'

const MONO = '"IBM Plex Mono", monospace', SANS = '"Instrument Sans", sans-serif'
const INK = '#1B1340'
export const TANK = { width: 0.22, depth: 0.3, air: 0.12 } // m

/** Run blocks in tanks in real time. Any block can be held (dragged) and let go; hold('all') holds every one. */
export function useTanks(tanks) {
  const sim = useRef(null)
  const raf = useRef(0)
  const [, setTick] = useState(0)
  const key = JSON.stringify(tanks)
  const make = useCallback(() => ({ t: 0, blocks: tanks.map(k => placeBlock(k.solid, k.liquid, { L: k.L ?? 0.05, y: k.y ?? 0.02, depth: TANK.depth })), held: null }), [key]) // eslint-disable-line react-hooks/exhaustive-deps
  if (!sim.current) sim.current = make()
  const loop = useCallback(() => {
    cancelAnimationFrame(raf.current)
    let last = performance.now(), quiet = 0
    const frame = now => {
      const s = sim.current
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      s.blocks.forEach((b, i) => { if (s.held === i || s.held === 'all') { b.v = 0; return } stepBlock(b, dt) })
      s.t += dt
      // everything settled (or all held still before a prediction): stop drawing until something changes
      quiet = (s.held === 'all' || (s.blocks.every(b => b.rest) && s.held == null)) ? quiet + dt : 0
      setTick(n => n + 1)
      if (quiet < 0.5) raf.current = requestAnimationFrame(frame) // sleep once everything has settled
    }
    raf.current = requestAnimationFrame(frame)
  }, [])
  const reset = useCallback(() => { sim.current = make(); setTick(n => n + 1); loop() }, [make, loop])
  useEffect(() => { reset() }, [reset])
  useEffect(() => () => cancelAnimationFrame(raf.current), [])
  const hold = useCallback((i, y) => { const s = sim.current; s.held = i; if (i != null && y != null) { const b = s.blocks[i]; b.y = Math.max(-TANK.depth, Math.min(TANK.air - b.L, y)); b.rest = false } loop() }, [loop])
  const release = useCallback(() => { sim.current.held = null; loop() }, [loop])
  return { sim: sim.current, reset, hold, release }
}

/** Layout for n tanks side by side in a w × h canvas: metres → pixels. */
export function tankLayout(w, h, n) {
  const top = 30, bottom = h - 58
  const k = Math.min((bottom - top) / (TANK.depth + TANK.air), (w - 40) / (n * TANK.width * 1.5))
  const surfaceY = top + TANK.air * k
  const cx = i => w / 2 + (i - (n - 1) / 2) * TANK.width * 1.5 * k
  return { k, surfaceY, cx, Y: m => surfaceY - m * k, floorY: surfaceY + TANK.depth * k }
}

export function paintTanks(ctx, w, h, { blocks, arrows = true, labels = true }) {
  ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, w, h)
  const v = tankLayout(w, h, blocks.length)
  blocks.forEach((b, i) => {
    const cx = v.cx(i), half = (TANK.width / 2) * v.k
    // liquid, then the glass
    ctx.fillStyle = b.liquid.colour; ctx.fillRect(cx - half, v.surfaceY, 2 * half, TANK.depth * v.k)
    ctx.strokeStyle = 'rgba(27,19,64,.5)'; ctx.lineWidth = 2
    ctx.beginPath(); ctx.moveTo(cx - half, v.Y(TANK.air)); ctx.lineTo(cx - half, v.floorY); ctx.lineTo(cx + half, v.floorY); ctx.lineTo(cx + half, v.Y(TANK.air)); ctx.stroke()
    ctx.strokeStyle = 'rgba(27,19,64,.25)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(cx - half, v.surfaceY); ctx.lineTo(cx + half, v.surfaceY); ctx.stroke()
    // the cube
    const side = b.L * v.k, x0 = cx - side / 2, y0 = v.Y(b.y + b.L)
    ctx.fillStyle = b.solid.colour; ctx.strokeStyle = INK; ctx.lineWidth = 1.4
    ctx.fillRect(x0, y0, side, side); ctx.strokeRect(x0, y0, side, side)
    if (b.solid.label === 'Pine wood' || b.solid.label === 'Cork') { ctx.strokeStyle = 'rgba(120,80,30,.35)'; for (let k = 1; k < 4; k++) { ctx.beginPath(); ctx.moveTo(x0, y0 + (side * k) / 4); ctx.lineTo(x0 + side, y0 + (side * k) / 4 + 2); ctx.stroke() } }
    // the liquid over the submerged part shows through
    // the liquid over the part of the cube that is under the surface (wherever the cube is)
    const sub = Math.max(0, Math.min(b.L, -b.y))
    if (sub > 0) { const wetTop = Math.min(b.y + b.L, 0); ctx.fillStyle = b.liquid.colour; ctx.fillRect(x0, v.Y(wetTop), side, (wetTop - b.y) * v.k) }
    const f = forces(b.solid, b.liquid, b.L, b.y, 0)
    if (arrows) {
      const sc = 26 / f.weight, mid = y0 + side / 2
      const arrow = (dir, len, col, text) => {
        ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 2.4
        const x = cx
        const yEnd = mid + dir * len
        ctx.beginPath(); ctx.moveTo(x, mid); ctx.lineTo(x, yEnd); ctx.stroke()
        ctx.beginPath(); ctx.moveTo(x, yEnd); ctx.lineTo(x - 5, yEnd - dir * 8); ctx.lineTo(x + 5, yEnd - dir * 8); ctx.closePath(); ctx.fill()
        ctx.font = `600 11px ${SANS}`; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(text, x + 8, yEnd - dir * 6)
      }
      arrow(1, Math.min(70, f.weight * sc), '#D6336C', `weight ${f.weight.toFixed(2)} N`)
      if (f.buoy > 0.0005) arrow(-1, Math.min(70, f.buoy * sc), '#2051C8', `upthrust ${f.buoy.toFixed(2)} N`)
    }
    if (labels) {
      ctx.fillStyle = INK; ctx.font = `600 12px ${SANS}`; ctx.textAlign = 'center'; ctx.textBaseline = 'top'
      ctx.fillText(`${b.solid.label} in ${b.liquid.label.toLowerCase()}`, cx, v.floorY + 8)
      ctx.font = `600 12px ${MONO}`
      ctx.fillText(b.onFloor && b.y <= -TANK.depth + 1e-6 ? 'sank' : `${Math.round((sub / b.L) * 100)} % under`, cx, v.floorY + 26)
    }
  })
  return v
}

// ——— the Archimedes bench ———
/**
 * Run a spring balance with its cube. `hang(solid, liquid, hook)` starts afresh (a new cube, or
 * a new can of liquid); `setHook` lowers or raises it. The liquid the cube pushes aside spills
 * over the can's spout into the measuring cylinder, taking a moment to drain.
 */
export function useBalance(L = 0.05) {
  const sim = useRef({ s: null, overflow: 0 })
  const raf = useRef(0)
  const [, setTick] = useState(0)
  const run = useCallback(() => {
    cancelAnimationFrame(raf.current)
    let last = performance.now(), quiet = 0
    const frame = now => {
      const c = sim.current
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      stepHang(c.s, dt)
      const displaced = Math.max(0, Math.min(c.s.L, -hangY(c.s))) * c.s.L * c.s.L
      c.overflow += (displaced - c.overflow) * Math.min(1, dt * 2.5)
      quiet = Math.abs(c.s.v) < 2e-4 && Math.abs(displaced - c.overflow) < 1e-8 ? quiet + dt : 0
      setTick(n => n + 1)
      if (quiet < 0.4) raf.current = requestAnimationFrame(frame)
    }
    raf.current = requestAnimationFrame(frame)
  }, [])
  useEffect(() => () => cancelAnimationFrame(raf.current), [])
  const hang = useCallback((solid, liquid, hook) => { sim.current = { s: hangBlock(solid, liquid, { L, hook }), overflow: 0 }; setTick(n => n + 1) }, [L])
  const setHook = useCallback(hook => { sim.current.s.hook = hook; run() }, [run])
  /** The balance has stopped swinging and the cylinder has stopped filling. */
  const settled = () => {
    const c = sim.current; if (!c.s) return false
    const d = Math.max(0, Math.min(c.s.L, -hangY(c.s))) * c.s.L * c.s.L
    // still, balanced (the spring holds exactly weight − upthrust), and the cylinder has stopped filling
    const f = forces(c.s.solid, c.s.liquid, c.s.L, hangY(c.s), 0)
    return Math.abs(c.s.v) < 5e-4 && Math.abs(BALANCE.k * c.s.e - (f.weight - f.buoy)) < 0.005 && Math.abs(d - c.overflow) < 2e-7
  }
  return { sim: sim.current, hang, setHook, settled }
}

/** A close-up window of a scale around a value: ticks every `lc`, numbers every `major`. */
function closeUp(ctx, x, y, w, h, { value, lc, major, unit, span, min = -Infinity }) {
  ctx.fillStyle = '#FFFDF5'; ctx.strokeStyle = INK; ctx.lineWidth = 1.2
  ctx.beginPath(); ctx.roundRect(x, y, w, h, 8); ctx.fill(); ctx.stroke()
  ctx.save(); ctx.beginPath(); ctx.roundRect(x, y, w, h, 8); ctx.clip()
  const mid = y + h / 2, px = h / span // pixels per unit
  const lo = Math.floor((value - span / 2) / lc) * lc
  ctx.fillStyle = INK; ctx.font = `600 11px ${MONO}`; ctx.textAlign = 'right'; ctx.textBaseline = 'middle'
  for (let s = Math.max(lo, min); s <= value + span / 2 + lc; s += lc) {
    const yy = mid + (value - s) * px, isMajor = Math.abs(s / major - Math.round(s / major)) < 1e-6
    ctx.fillRect(x + w - (isMajor ? 26 : 14), yy, isMajor ? 26 : 14, 1)
    if (isMajor) ctx.fillText(`${+s.toFixed(3)}`, x + w - 30, yy)
  }
  ctx.fillStyle = '#D6336C'; ctx.fillRect(x, mid - 1, w, 2) // the pointer / meniscus
  ctx.restore()
  ctx.fillStyle = '#6B6888'; ctx.font = `500 10px ${SANS}`; ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillText(unit, x + w / 2, y + h + 4)
}

export function paintBench(ctx, w, h, { s, overflow, liquidColour }) {
  ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, w, h)
  const k = Math.min((h - 40) / 0.7, w / 0.7), base = h - 24 // fits from the can's floor (−0.22 m) to the stand's arm (+0.42 m)
  const X = m => w * 0.34 + m * k, Y = m => base - (m + 0.25) * k // y = 0 is the liquid surface in the can
  // the can: liquid up to the spout
  const can = { x0: -0.07, x1: 0.07, floor: -0.22 }
  ctx.fillStyle = liquidColour; ctx.fillRect(X(can.x0), Y(0), (can.x1 - can.x0) * k, -can.floor * k)
  ctx.strokeStyle = 'rgba(27,19,64,.55)'; ctx.lineWidth = 2
  ctx.beginPath(); ctx.moveTo(X(can.x0), Y(0.06)); ctx.lineTo(X(can.x0), Y(can.floor)); ctx.lineTo(X(can.x1), Y(can.floor)); ctx.lineTo(X(can.x1), Y(0.06)); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(X(can.x1), Y(0)); ctx.lineTo(X(can.x1 + 0.06), Y(-0.03)); ctx.stroke() // spout
  // the measuring cylinder under the spout, filling with what overflows
  const cyl = { x: 0.16, r: 0.025, h: 0.2, cap: 250e-6 } // 250 mL
  const filled = Math.min(1, overflow / cyl.cap)
  ctx.fillStyle = liquidColour; ctx.fillRect(X(cyl.x - cyl.r), Y(-0.22 + cyl.h * filled), 2 * cyl.r * k, cyl.h * filled * k)
  ctx.strokeStyle = 'rgba(27,19,64,.55)'; ctx.strokeRect(X(cyl.x - cyl.r), Y(-0.22 + cyl.h), 2 * cyl.r * k, cyl.h * k)
  ctx.fillStyle = INK; ctx.font = `500 9px ${MONO}`; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'
  for (let ml = 0; ml <= 250; ml += 50) ctx.fillText(`${ml}`, X(cyl.x + cyl.r) + 4, Y(-0.22 + (cyl.h * ml) / 250))
  // stand, spring and cube
  const hookY = Y(s.hook)
  // the stand: a base on the bench, an upright, and an arm the balance hangs from
  ctx.fillStyle = '#5B6270'; ctx.fillRect(X(-0.26), Y(-0.22) - 6, 0.14 * k, 6); ctx.fillRect(X(-0.2), Y(0.42), 6, (0.42 + 0.22) * k); ctx.fillRect(X(-0.2), Y(0.42), 0.2 * k + 3, 5)
  ctx.strokeStyle = INK; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(X(0), Y(0.42)); ctx.lineTo(X(0), hookY - 0.06 * k); ctx.stroke()
  // the balance body with its spring
  ctx.fillStyle = '#E9E6F2'; ctx.strokeStyle = INK; ctx.fillRect(X(-0.012), hookY - 0.06 * k, 0.024 * k, 0.06 * k); ctx.strokeRect(X(-0.012), hookY - 0.06 * k, 0.024 * k, 0.06 * k)
  const cubeTop = Y(hangY(s) + s.L)
  ctx.beginPath(); for (let i = 0; i <= 12; i++) { const yy = hookY + ((cubeTop - hookY - s.cord * k) * i) / 12; ctx.lineTo(X(0) + (i % 2 ? 5 : -5), yy) } ctx.stroke()
  ctx.beginPath(); ctx.moveTo(X(0), cubeTop - s.cord * k); ctx.lineTo(X(0), cubeTop); ctx.stroke()
  ctx.fillStyle = s.solid.colour; ctx.fillRect(X(-s.L / 2), cubeTop, s.L * k, s.L * k); ctx.strokeRect(X(-s.L / 2), cubeTop, s.L * k, s.L * k)
  // close-ups: the balance reads to 0.05 N, the cylinder to 1 mL
  const force = BALANCE.k * s.e, ml = overflow * 1e6
  closeUp(ctx, w - 168, 16, 70, Math.min(170, h * 0.42), { value: force, lc: 0.05, major: 0.5, unit: 'balance (N)', span: 1.2, min: 0 })
  closeUp(ctx, w - 86, 16, 70, Math.min(170, h * 0.42), { value: ml, lc: 1, major: 10, unit: 'cylinder (mL)', span: 30, min: 0 })
}
