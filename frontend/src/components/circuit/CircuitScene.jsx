/**
 * VISIORA — CircuitScene
 * Circuit diagram with textbook symbols. Dots move along every wire at a speed
 * proportional to the exact current in that wire, so students can see current
 * split at junctions and join again. Tap a part to put the voltmeter across it;
 * tap the switch to open or close it.
 */
import React, { useEffect, useRef } from 'react'

const MONO = '"JetBrains Mono", monospace'
const SANS = '"Plus Jakarta Sans", system-ui, sans-serif'
const WIRE = '#3A332D'
const CURRENT = '#D97706'
const ELECTRON = '#1251B8'
const SPEED_PER_AMP = 40 // px/s for 1 A
const MAX_SPEED = 420
const DOT_GAP = 22

export default function CircuitScene({ layout, sol, ends, V, Rs, closed, electrons, meterOn, onToggleSwitch, onPickMeter }) {
  const canvasRef = useRef(null)
  const sizeRef = useRef({ w: 0, h: 0 })
  const hitsRef = useRef([])
  const phaseRef = useRef([])
  const propsRef = useRef(null)
  propsRef.current = { layout, sol, ends, V, Rs, closed, electrons, meterOn }

  useEffect(() => {
    phaseRef.current = layout.segments.map(() => 0)
  }, [layout])

  useEffect(() => {
    const canvas = canvasRef.current
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      const dpr = window.devicePixelRatio || 1
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      sizeRef.current = { w: width, h: height }
    })
    ro.observe(canvas)
    let raf
    let last = performance.now()
    const loop = now => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const { w, h } = sizeRef.current
      if (w) {
        const ctx = canvas.getContext('2d')
        const dpr = window.devicePixelRatio || 1
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
        hitsRef.current = draw(ctx, w, h, propsRef.current, phaseRef.current, dt)
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => { ro.disconnect(); cancelAnimationFrame(raf) }
  }, [])

  const onPointerDown = e => {
    const rect = canvasRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const hit = hitsRef.current.find(hb => Math.abs(x - hb.x) <= hb.hw && Math.abs(y - hb.y) <= hb.hh)
    if (!hit) return
    if (hit.type === 'switch') onToggleSwitch()
    else if (hit.type !== 'meter') onPickMeter(hit.id)
  }

  return (
    <canvas
      ref={canvasRef}
      className="ml-canvas el-canvas"
      onPointerDown={onPointerDown}
      role="img"
      aria-label={`Circuit diagram. Switch ${closed ? 'closed' : 'open'}. Ammeter reads ${sol.current('A').toFixed(2)} amps.`}
    />
  )
}

function draw(ctx, w, h, p, phases, dt) {
  const { layout, sol, ends, V, Rs, closed, electrons, meterOn } = p
  ctx.fillStyle = '#FCFAF7'
  ctx.fillRect(0, 0, w, h)

  // Phones: tighter margins and one-line labels (the table under the circuit has the details).
  const compact = w < 520
  const pad = compact ? { l: 62, r: 60, t: 64, b: 62 } : { l: 92, r: 96, t: 84, b: 64 }
  const s = Math.min((w - pad.l - pad.r) / 10, (h - pad.t - pad.b) / 6)
  const ox = pad.l + (w - pad.l - pad.r - 10 * s) / 2
  const oy = pad.t + (h - pad.t - pad.b - 6 * s) / 2
  const P = ([x, y]) => [ox + x * s, oy + y * s]
  const center = P([5, 3])
  const partLen = Math.min(92, s * 1.5)
  const hits = []

  // Wires.
  ctx.strokeStyle = WIRE
  ctx.lineWidth = 3
  ctx.lineCap = 'round'
  for (const sg of layout.segments) {
    const [ax, ay] = P(sg.a)
    const [bx, by] = P(sg.b)
    ctx.beginPath()
    ctx.moveTo(ax, ay)
    ctx.lineTo(bx, by)
    ctx.stroke()
  }

  // Moving charges.
  layout.segments.forEach((sg, i) => {
    const I = sg.carries.reduce((sum, id) => sum + sol.current(id), 0)
    const speed = Math.min(MAX_SPEED, I * SPEED_PER_AMP) * (electrons ? -1 : 1)
    phases[i] = ((phases[i] || 0) + speed * dt) % DOT_GAP
    if (Math.abs(I) < 1e-6) return
    const [ax, ay] = P(sg.a)
    const [bx, by] = P(sg.b)
    const len = Math.hypot(bx - ax, by - ay)
    const ux = (bx - ax) / len
    const uy = (by - ay) / len
    ctx.fillStyle = electrons ? ELECTRON : CURRENT
    for (let d = ((phases[i] % DOT_GAP) + DOT_GAP) % DOT_GAP; d < len; d += DOT_GAP) {
      ctx.beginPath()
      ctx.arc(ax + ux * d, ay + uy * d, 3.6, 0, Math.PI * 2)
      ctx.fill()
    }
  })

  // Junctions.
  ctx.fillStyle = WIRE
  for (const j of layout.junctions) {
    const [x, y] = P(j)
    ctx.beginPath()
    ctx.arc(x, y, 5, 0, Math.PI * 2)
    ctx.fill()
  }

  // Parts.
  const partPos = {}
  for (const sg of layout.segments) {
    const [ax, ay] = P(sg.a)
    const [bx, by] = P(sg.b)
    for (const part of sg.parts) {
      const x = ax + (bx - ax) * part.at
      const y = ay + (by - ay) * part.at
      const ang = Math.atan2(by - ay, bx - ax)
      // Outward normal (away from the middle of the circuit) for labels.
      let nx = -Math.sin(ang)
      let ny = Math.cos(ang)
      if ((x - center[0]) * nx + (y - center[1]) * ny < 0) { nx = -nx; ny = -ny }
      // For rungs inside the circuit, put labels to the right.
      if (Math.abs(Math.cos(ang)) < 0.01 && x > P([0.5, 0])[0] && x < P([9.4, 0])[0]) { nx = 1; ny = 0 }
      const ux = Math.cos(ang)
      const uy = Math.sin(ang)
      partPos[part.id] = { x, y, ux, uy, nx, ny }

      if (part.type === 'resistor') {
        const k = Number(part.id.slice(1)) - 1
        const R = Rs[k]
        const I = sol.current(part.id)
        const power = I * I * R
        drawResistor(ctx, x, y, ang, partLen, power)
        const vR = sol.across(...ends[part.id])
        label(ctx, x + nx * (compact ? 18 : 30), y + ny * (compact ? 18 : 30), nx, ny, compact
          ? [[`${part.id} ${R}Ω`, '800 11.5px ' + SANS, '#1C1713']]
          : [
              [`${part.id} = ${R} Ω`, '800 13px ' + SANS, '#1C1713'],
              [`${fmt(I, 2)} A · ${fmt(vR, 2)} V`, '600 11.5px ' + MONO, '#6D6254'],
            ])
        hits.push({ id: part.id, type: 'resistor', x, y, hw: Math.abs(ux) * partLen / 2 + 14, hh: Math.abs(uy) * partLen / 2 + 14 })
      } else if (part.type === 'battery') {
        drawBattery(ctx, x, y, ang, partLen)
        label(ctx, x - (compact ? 26 : 34), y, -1, 0, compact
          ? [[`${V.toFixed(1)}V`, '800 12px ' + MONO, '#1C1713']]
          : [
              [`${V.toFixed(1)} V`, '800 14px ' + MONO, '#1C1713'],
              ['battery', '600 11px ' + SANS, '#6D6254'],
            ])
        hits.push({ id: 'B', type: 'battery', x, y, hw: 22, hh: partLen / 2 })
      } else if (part.type === 'ammeter') {
        drawMeter(ctx, x, y, 'A', '#1C1713')
        const I = sol.current('A')
        label(ctx, x + nx * (compact ? 24 : 34), y + ny * (compact ? 24 : 34), nx, ny, compact
          ? [[`${fmt(I, 2)} A`, '800 12.5px ' + MONO, CURRENT]]
          : [[`${fmt(I, 2)} A`, '800 15px ' + MONO, CURRENT], ['ammeter', '600 11px ' + SANS, '#6D6254']])
        hits.push({ id: 'A', type: 'ammeter', x, y, hw: 20, hh: 20 })
      } else if (part.type === 'switch') {
        drawSwitch(ctx, x, y, ang, partLen * 0.8, closed)
        label(ctx, x + nx * (compact ? 22 : 30), y + ny * (compact ? 22 : 30), nx, ny, [[closed ? 'switch: ON' : 'switch: OFF', '700 12px ' + SANS, closed ? '#059669' : '#E11D48'], ['tap to flip', '600 10.5px ' + SANS, '#A29482']])
        hits.push({ id: 'S', type: 'switch', x, y, hw: partLen * 0.45, hh: 26 })
      }
    }
  }

  // Voltmeter across the chosen part.
  const pp = partPos[meterOn]
  if (pp && ends[meterOn]) {
    const half = meterOn === 'B' ? partLen / 2 : meterOn === 'S' ? partLen * 0.4 : partLen / 2
    const e1 = [pp.x - pp.ux * (half + 6), pp.y - pp.uy * (half + 6)]
    const e2 = [pp.x + pp.ux * (half + 6), pp.y + pp.uy * (half + 6)]
    const dist = meterOn === 'B' ? 0 : compact ? 50 : 88
    const side = meterOn === 'B' ? [1, 0] : [-pp.nx, -pp.ny]
    const mx = pp.x + side[0] * (meterOn === 'B' ? (compact ? 44 : 70) : dist)
    const my = pp.y + side[1] * (meterOn === 'B' ? 0 : dist)
    ctx.strokeStyle = '#4F46E5'
    ctx.lineWidth = 1.75
    ctx.setLineDash([5, 4])
    for (const [ex, ey] of [e1, e2]) {
      ctx.beginPath()
      ctx.moveTo(ex, ey)
      ctx.lineTo(mx, my)
      ctx.stroke()
      ctx.beginPath()
      ctx.arc(ex, ey, 3.5, 0, Math.PI * 2)
      ctx.fillStyle = '#4F46E5'
      ctx.fill()
    }
    ctx.setLineDash([])
    drawMeter(ctx, mx, my, 'V', '#4F46E5')
    const v = Math.abs(sol.across(...ends[meterOn]))
    ctx.font = `800 15px ${MONO}`
    const text = `${fmt(v, 2)} V`
    const tw = ctx.measureText(text).width + 16
    ctx.fillStyle = '#4F46E5'
    ctx.beginPath()
    ctx.roundRect(mx - tw / 2, my + 22, tw, 26, 13)
    ctx.fill()
    ctx.fillStyle = '#fff'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(text, mx, my + 35.5)
    hits.push({ id: meterOn, type: 'meter', x: mx, y: my, hw: 18, hh: 18 })
  }

  return hits
}

function fmt(v, d) {
  const c = Math.round(v * 1e9) / 1e9
  return (Math.abs(c) < 0.5 * 10 ** -d ? 0 : c).toFixed(d)
}

function drawResistor(ctx, x, y, ang, len, power) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(ang)
  if (power > 0) {
    const glow = Math.min(0.55, power / 40)
    const g = ctx.createRadialGradient(0, 0, 4, 0, 0, len * 0.75)
    g.addColorStop(0, `rgba(225,29,72,${glow})`)
    g.addColorStop(1, 'rgba(225,29,72,0)')
    ctx.fillStyle = g
    ctx.fillRect(-len, -len * 0.75, len * 2, len * 1.5)
  }
  ctx.fillStyle = '#FCFAF7'
  ctx.fillRect(-len / 2, -11, len, 22)
  ctx.strokeStyle = WIRE
  ctx.lineWidth = 3
  ctx.lineJoin = 'round'
  ctx.beginPath()
  ctx.moveTo(-len / 2, 0)
  const zig = 6
  for (let i = 0; i <= zig; i++) {
    const zx = -len / 2 + (len * (i + 0.5)) / (zig + 1)
    ctx.lineTo(zx, i % 2 ? 9 : -9)
  }
  ctx.lineTo(len / 2, 0)
  ctx.stroke()
  ctx.restore()
}

function drawBattery(ctx, x, y, ang, len) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(ang) // +x points towards the + terminal
  ctx.fillStyle = '#FCFAF7'
  ctx.fillRect(-len / 2 + 6, -24, len - 12, 48)
  ctx.strokeStyle = WIRE
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(-len / 2, 0)
  ctx.lineTo(-16, 0)
  ctx.moveTo(16, 0)
  ctx.lineTo(len / 2, 0)
  ctx.stroke()
  // Two cells: long thin plate = +, short thick plate = −.
  for (const cx of [-10, 10]) {
    ctx.lineWidth = 2.5
    ctx.beginPath()
    ctx.moveTo(cx + 3, -20)
    ctx.lineTo(cx + 3, 20)
    ctx.stroke()
    ctx.lineWidth = 6
    ctx.beginPath()
    ctx.moveTo(cx - 4, -10)
    ctx.lineTo(cx - 4, 10)
    ctx.stroke()
  }
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(-6, 0)
  ctx.lineTo(6, 0)
  ctx.stroke()
  ctx.rotate(-ang)
  ctx.font = `800 16px ${SANS}`
  ctx.fillStyle = '#E11D48'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const px = Math.cos(ang) * 26
  const py = Math.sin(ang) * 26
  ctx.fillText('+', px + 16, py)
  ctx.restore()
}

function drawMeter(ctx, x, y, letter, color) {
  ctx.beginPath()
  ctx.arc(x, y, 17, 0, Math.PI * 2)
  ctx.fillStyle = '#fff'
  ctx.fill()
  ctx.lineWidth = 2.5
  ctx.strokeStyle = color
  ctx.stroke()
  ctx.font = `800 15px ${SANS}`
  ctx.fillStyle = color
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(letter, x, y + 1)
}

function drawSwitch(ctx, x, y, ang, len, closed) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(ang)
  ctx.fillStyle = '#FCFAF7'
  ctx.fillRect(-len / 2, -26, len, 34)
  ctx.strokeStyle = WIRE
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(-len / 2, 0)
  ctx.lineTo(-len / 2 + 8, 0)
  ctx.moveTo(len / 2 - 8, 0)
  ctx.lineTo(len / 2, 0)
  ctx.stroke()
  for (const cx of [-len / 2 + 8, len / 2 - 8]) {
    ctx.beginPath()
    ctx.arc(cx, 0, 4.5, 0, Math.PI * 2)
    ctx.fillStyle = WIRE
    ctx.fill()
  }
  // Lever hinged on the left contact; lifted 32° when open.
  const L = len - 16
  const a = closed ? 0 : -0.56
  ctx.lineWidth = 3.5
  ctx.strokeStyle = closed ? '#059669' : '#E11D48'
  ctx.beginPath()
  ctx.moveTo(-len / 2 + 8, 0)
  ctx.lineTo(-len / 2 + 8 + Math.cos(a) * L, Math.sin(a) * L)
  ctx.stroke()
  ctx.restore()
}

// Stacked label lines, anchored on the side given by (nx, ny).
function label(ctx, x, y, nx, ny, lines) {
  const lh = 16
  const total = lines.length * lh
  let top = y - total / 2
  if (ny < -0.5) top = y - total
  if (ny > 0.5) top = y
  ctx.textAlign = nx > 0.5 ? 'left' : nx < -0.5 ? 'right' : 'center'
  ctx.textBaseline = 'middle'
  lines.forEach(([text, font, color], i) => {
    ctx.font = font
    const ty = top + lh * i + lh / 2
    ctx.lineWidth = 4
    ctx.strokeStyle = '#FCFAF7'
    ctx.strokeText(text, x, ty)
    ctx.fillStyle = color
    ctx.fillText(text, x, ty)
  })
}
