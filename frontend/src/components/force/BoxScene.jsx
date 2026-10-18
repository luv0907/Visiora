/**
 * VISIORA — BoxScene
 * A crate on a floor, seen from the side. The camera follows the box; the floor
 * has a mark every metre so speed is visible. Force arrows share one scale
 * (px per newton), so their lengths can be compared honestly.
 */
import React from 'react'
import { useCanvas } from '../motion/useCanvas'
import { FORCE_COLORS } from './colors'

const MONO = '"JetBrains Mono", monospace'


const FLOORS = {
  ice: { top: '#DDEFF7', body: '#BFE0EE', line: 'rgba(18,81,184,0.25)' },
  wood: { top: '#D9B48A', body: '#C79F6F', line: 'rgba(92,58,24,0.35)' },
  carpet: { top: '#B65A4A', body: '#9A4536', line: 'rgba(255,255,255,0.25)' },
  none: { top: '#D9DEE6', body: '#C4CBD6', line: 'rgba(28,23,19,0.2)' },
}

export default function BoxScene({ x, m, surfaceId, forces, showForces, pushing }) {
  const { ref } = useCanvas(
    (ctx, w, h) => draw(ctx, w, h, { x, m, surfaceId, forces, showForces, pushing }),
    [x, m, surfaceId, forces, showForces, pushing]
  )
  return <canvas ref={ref} className="ml-canvas fl-canvas" role="img" aria-label={`Box at ${x.toFixed(1)} metres. Net force ${forces.net.toFixed(1)} newtons.`} />
}

function draw(ctx, w, h, { x, m, surfaceId, forces, showForces, pushing }) {
  const F = FLOORS[surfaceId] || FLOORS.wood
  const ppm = Math.max(46, Math.min(90, w / 11)) // pixels per metre
  const floorY = h * 0.6
  const boxX = w * 0.42 // screen x of the box centre (camera follows it)
  const X = wx => boxX + (wx - x) * ppm

  // Wall and floor.
  const sky = ctx.createLinearGradient(0, 0, 0, floorY)
  sky.addColorStop(0, '#F2EEE6')
  sky.addColorStop(1, '#FBF8F2')
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, w, floorY)
  ctx.fillStyle = F.top
  ctx.fillRect(0, floorY, w, 10)
  ctx.fillStyle = F.body
  ctx.fillRect(0, floorY + 10, w, h - floorY - 10)

  // Metre marks that scroll past.
  ctx.font = `600 11px ${MONO}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  const first = Math.floor(x - boxX / ppm) - 1
  const last = Math.ceil(x + (w - boxX) / ppm) + 1
  for (let mtr = first; mtr <= last; mtr++) {
    const px = X(mtr)
    ctx.strokeStyle = F.line
    ctx.lineWidth = mtr % 5 === 0 ? 2 : 1
    ctx.beginPath()
    ctx.moveTo(px, floorY + 10)
    ctx.lineTo(px, floorY + (mtr % 5 === 0 ? 34 : 22))
    ctx.stroke()
    if (mtr % 2 === 0) {
      ctx.fillStyle = surfaceId === 'carpet' ? 'rgba(255,255,255,0.85)' : 'rgba(28,23,19,0.6)'
      ctx.fillText(`${mtr} m`, px, floorY + 38)
    }
  }
  // Start line.
  if (X(0) > -10 && X(0) < w + 10) {
    ctx.fillStyle = '#1C1713'
    ctx.fillRect(X(0) - 1.5, floorY - 26, 3, 26)
    ctx.font = `700 11px ${MONO}`
    ctx.textBaseline = 'bottom'
    ctx.fillText('start', X(0), floorY - 28)
  }

  // Crate: size grows with ∛mass.
  const side = Math.max(54, Math.min(120, 40 * Math.cbrt(m)))
  const bx = boxX - side / 2
  const by = floorY - side
  ctx.fillStyle = 'rgba(0,0,0,0.15)'
  ctx.fillRect(bx + 4, floorY - 3, side, 4)
  ctx.fillStyle = '#C8955A'
  ctx.fillRect(bx, by, side, side)
  ctx.strokeStyle = '#8A5A2B'
  ctx.lineWidth = 4
  ctx.strokeRect(bx + 2, by + 2, side - 4, side - 4)
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(bx + 4, by + 4)
  ctx.lineTo(bx + side - 4, by + side - 4)
  ctx.moveTo(bx + side - 4, by + 4)
  ctx.lineTo(bx + 4, by + side - 4)
  ctx.stroke()
  ctx.font = `800 ${Math.round(side / 4.2)}px ${MONO}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = 'rgba(28,23,19,0.85)'
  ctx.fillRect(boxX - side * 0.32, by + side / 2 - side * 0.15, side * 0.64, side * 0.3)
  ctx.fillStyle = '#FFF6E0'
  ctx.fillText(`${m} kg`, boxX, by + side / 2 + 1)

  // Hand pushing (or pulling) when there is an applied force.
  if (pushing !== 0) {
    const dir = Math.sign(pushing)
    const hx = dir > 0 ? bx - 14 : bx + side + 14
    ctx.fillStyle = '#E8B98F'
    ctx.beginPath()
    ctx.roundRect(hx - 12, by + side * 0.42, 24, side * 0.22, 8)
    ctx.fill()
    ctx.fillRect(dir > 0 ? hx - 60 : hx + 10, by + side * 0.47, 50, side * 0.12)
  }

  if (!showForces) return

  // One scale for every arrow.
  const k = Math.min(1.1, 120 / Math.max(60, forces.weight, Math.abs(forces.applied)))
  const midY = by + side / 2
  // Labels sit on a light pill so they stay readable on any floor colour.
  const label = (text, lx, ly, color, align = 'center') => {
    ctx.font = `700 12px ${MONO}`
    const tw = ctx.measureText(text).width + 10
    const left = align === 'left' ? lx - 5 : align === 'right' ? lx - tw + 5 : lx - tw / 2
    ctx.fillStyle = 'rgba(255,255,255,0.9)'
    ctx.beginPath()
    ctx.roundRect(left, ly - 10, tw, 20, 10)
    ctx.fill()
    ctx.textAlign = align
    ctx.textBaseline = 'middle'
    ctx.fillStyle = color
    ctx.fillText(text, lx, ly + 0.5)
  }

  // Applied push from the side it acts on.
  if (forces.applied !== 0) {
    const len = forces.applied * k
    const start = forces.applied > 0 ? bx - Math.abs(len) - 18 : bx + side + Math.abs(len) + 18
    arrow(ctx, start, midY - side * 0.18, start + len, midY - side * 0.18, FORCE_COLORS.applied)
    label(`push ${Math.abs(forces.applied).toFixed(0)} N`, start + len / 2, midY - side * 0.18 - 16, FORCE_COLORS.applied)
  }
  // Friction along the floor contact.
  if (Math.abs(forces.friction) > 1e-9) {
    const len = forces.friction * k
    arrow(ctx, boxX, floorY - 5, boxX + len, floorY - 5, FORCE_COLORS.friction)
    label(`friction ${Math.abs(forces.friction).toFixed(1)} N`, boxX + len / 2, floorY + 56, FORCE_COLORS.friction)
  }
  // Weight and normal (equal and opposite: vertical forces balance).
  // Vertical pair is drawn shorter (capped) so it stays clear of the readouts above.
  const vLen = Math.min(forces.weight * k * 0.5, side * 0.6)
  // Normal on the left (its label stays clear of the readouts top-right), weight on the right.
  arrow(ctx, boxX - side * 0.3, by - 4, boxX - side * 0.3, by - 4 - vLen, FORCE_COLORS.normal, 2.5)
  label(`normal ${forces.normal.toFixed(0)} N`, boxX - side * 0.3 - 8, by - 4 - vLen * 0.6, FORCE_COLORS.normal, 'right')
  arrow(ctx, boxX + side * 0.3, floorY - side * 0.2, boxX + side * 0.3, floorY - side * 0.2 + vLen, FORCE_COLORS.weight, 2.5)
  label(`weight ${forces.weight.toFixed(0)} N`, boxX + side * 0.3 + 8, floorY - side * 0.2 + vLen - 4, FORCE_COLORS.weight, 'left')

  // Net force under the floor, away from everything else.
  const netY = floorY + 84
  if (Math.abs(forces.net) > 1e-9) {
    const len = forces.net * k
    arrow(ctx, boxX, netY, boxX + len, netY, FORCE_COLORS.net, 5)
    label(`net ${Math.abs(forces.net).toFixed(1)} N`, boxX + len + Math.sign(len) * 8, netY, FORCE_COLORS.net, len > 0 ? 'left' : 'right')
  } else {
    label('net force = 0', boxX, netY, FORCE_COLORS.net)
  }
}

function arrow(ctx, x0, y0, x1, y1, color, width = 4) {
  const len = Math.hypot(x1 - x0, y1 - y0)
  if (len < 2) return
  const ux = (x1 - x0) / len
  const uy = (y1 - y0) / len
  const head = Math.min(12, len * 0.5)
  ctx.strokeStyle = color
  ctx.fillStyle = color
  ctx.lineWidth = width
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(x0, y0)
  ctx.lineTo(x1 - ux * head, y1 - uy * head)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(x1, y1)
  ctx.lineTo(x1 - ux * head - uy * head * 0.6, y1 - uy * head + ux * head * 0.6)
  ctx.lineTo(x1 - ux * head + uy * head * 0.6, y1 - uy * head - ux * head * 0.6)
  ctx.closePath()
  ctx.fill()
}
