/**
 * VISIORA Studio — the living breadboard for Circuits.
 * Every part is drawn from its physical state in the live simulation (useLab): a filament glows
 * with the colour of a body at its temperature, nichrome coils go dull red then orange, resistors
 * scorch and smoke, overloaded wires smoke, meter needles swing with inertia, fan blades spin up.
 * Current flows as moving dots (or electrons, the other way). Two looks: picture and symbols.
 */
import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { APPLIANCES, COLS, ROWS, allEdges, batteryPlus, edgeEnds, isMeter, isSource, meterPlus, nodeAt, sourceVolts } from '../engine/board'
import { METER, RESISTOR, RHEOSTAT, T_ROOM, WIRE, glowColor } from '../engine/components'
import { isMuted, loop, setMuted, sfx } from './sound'
import { ACCENT, DATA, INK } from './drawings'

export { useLab } from './useLab'

const MONO = '"IBM Plex Mono", monospace', SANS = '"Instrument Sans", sans-serif'
const MUTED = '#82868F', LEAD = '#3A3F48', BRASS = '#C9A23B', RED = '#D23A2A'
const fmtA = I => `${Math.abs(I).toFixed(2)} A`
const rgba = ([r, g, b], a) => `rgba(${r | 0}, ${g | 0}, ${b | 0}, ${a})`
/** How visibly something at temperature T glows (0 until about 800 K, the Draper point). */
const redHot = T => (T < 790 ? 0 : Math.min(1, ((T - 790) / 700) ** 1.4))
/** 0 at room temperature, 1 when too hot to touch. */
const warmth = T => Math.max(0, Math.min(1, (T - T_ROOM - 8) / 100))

export function Stars({ n, of = 3 }) {
  return <span className="st-stars" aria-label={`${n} of ${of} stars`}>{Array.from({ length: of }, (_, i) => <span key={i} className={i < n ? 'is-on' : ''}>★</span>)}</span>
}

// ——— resistor colour code ———
const CODE = ['#16181D', '#8B5A2B', '#D23A2A', '#E8822A', '#E9C83A', '#2E8B57', '#2F5FD0', '#7B4BB7', '#8A8D93', '#F4F4F2']
/** Colour bands for a value in ohms: two digits, a multiplier, and gold for ±5 %. */
function bands(R) {
  let m = 0, v = Math.round(R * 10) / 10
  while (v >= 100) { v /= 10; m++ }
  if (v < 10) { v *= 10; m-- }
  const d = Math.round(v), first = Math.floor(d / 10), second = d % 10
  return [CODE[first], CODE[second], m < 0 ? BRASS : CODE[m], BRASS]
}

/** Where the dots sit for a canvas of this size. */
function layout(w, h) {
  const pad = 56
  const s = Math.min((w - 2 * pad) / (COLS - 1), (h - 2 * pad) / (ROWS - 1), 150)
  const ox = (w - s * (COLS - 1)) / 2, oy = (h - s * (ROWS - 1)) / 2
  return { s, P: n => { const { c, r } = nodeAt(n); return { x: ox + c * s, y: oy + r * s } } }
}

function nearestEdge(g, x, y) {
  let best = null, bd = g.s * 0.28
  for (const key of allEdges()) {
    const [a, b] = edgeEnds(key), p = g.P(a), q = g.P(b)
    const mx = (p.x + q.x) / 2, my = (p.y + q.y) / 2
    // distance to the middle part of the segment, so dots themselves stay easy to grab
    const along = p.y === q.y ? Math.abs(x - mx) : Math.abs(y - my)
    const across = p.y === q.y ? Math.abs(y - my) : Math.abs(x - mx)
    if (along < g.s * 0.42 && across < bd) { bd = across; best = key }
  }
  return best
}

function nearestNode(g, x, y) {
  let best = null, bd = g.s * 0.35
  for (let n = 0; n < COLS * ROWS; n++) { const p = g.P(n), d = Math.hypot(p.x - x, p.y - y); if (d < bd) { bd = d; best = n } }
  return best
}

function zigzag(ctx, x0, x1, amp, teeth = 6) {
  ctx.beginPath(); ctx.moveTo(x0, 0)
  for (let i = 0; i < teeth; i++) ctx.lineTo(x0 + ((i + 0.5) / teeth) * (x1 - x0), i % 2 ? amp : -amp)
  ctx.lineTo(x1, 0); ctx.stroke()
}
/** A helix of resistance wire seen from the side, from x0 to x1. */
function helix(ctx, x0, x1, r, turns) {
  ctx.beginPath()
  for (let i = 0; i <= turns * 12; i++) {
    const f = i / (turns * 12), a = f * turns * Math.PI * 2
    ctx.lineTo(x0 + f * (x1 - x0) + Math.sin(a) * r * 0.25, Math.cos(a) * r)
  }
  ctx.stroke()
}
function halo(ctx, x, y, r0, r1, color, a) {
  const g = ctx.createRadialGradient(x, y, r0, x, y, r1)
  g.addColorStop(0, rgba(color, a)); g.addColorStop(1, rgba(color, 0))
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r1, 0, Math.PI * 2); ctx.fill()
}
/** A small round meter face: letter, needle at fraction x of full scale, + and − terminals. */
function miniMeter(ctx, m, r, letter, x, broken, symbols) {
  ctx.fillStyle = broken ? '#D9D6CC' : '#fff'; ctx.strokeStyle = INK; ctx.lineWidth = 2
  ctx.beginPath(); ctx.arc(m, 0, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
  if (symbols) {
    ctx.font = `700 13px ${SANS}`; ctx.fillStyle = INK; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(letter, m, 1)
    return
  }
  const a = Math.PI * (1.15 + 0.7 * Math.max(-0.03, Math.min(1.07, x ?? 0)))
  ctx.strokeStyle = '#B9BEC6'; ctx.lineWidth = 1
  ctx.beginPath(); ctx.arc(m, r * 0.45, r * 0.78, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke()
  if (!broken) { ctx.strokeStyle = ACCENT; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(m, r * 0.45); ctx.lineTo(m + Math.cos(a) * r * 0.8, r * 0.45 + Math.sin(a) * r * 0.8); ctx.stroke() }
  ctx.font = `700 9px ${SANS}`; ctx.fillStyle = INK; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(letter, m, r * 0.15)
}

/** Draws one part between p (lower dot) and q, in picture or symbol form. */
function drawPart(ctx, key, part, info, p, q, L, o) {
  const ang = Math.atan2(q.y - p.y, q.x - p.x), m = L / 2
  const mx = (p.x + q.x) / 2, my = (p.y + q.y) / 2
  const T = info?.T ?? T_ROOM
  const hot = !o.symbols && part.type === 'wire' ? warmth(T) : 0
  const leadW = o.symbols ? 2.5 : 4
  const leadC = o.symbols ? INK : hot > 0.05 ? `rgb(${58 + 170 * hot}, ${63 - 20 * hot}, ${72 - 40 * hot})` : LEAD
  ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(ang)
  const lead = (x0, x1) => { ctx.strokeStyle = leadC; ctx.lineWidth = leadW; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x0, 0); ctx.lineTo(x1, 0); ctx.stroke() }
  // the + and − terminals of a meter
  const terminals = plusAtStart => {
    if (o.symbols) return
    for (const [x, plus] of [[0.17 * L, plusAtStart], [0.83 * L, !plusAtStart]]) {
      ctx.fillStyle = plus ? RED : INK; ctx.beginPath(); ctx.arc(x, 0, 4.5, 0, Math.PI * 2); ctx.fill()
    }
  }
  if (part.type === 'wire') {
    if (part.blown) { lead(0, 0.42 * L); lead(0.58 * L, L) } else lead(0, L)
  } else if (part.type === 'battery') {
    const plusAtEnd = batteryPlus(key, part) === edgeEnds(key)[1]
    if (o.symbols) {
      // cells: long thin plate is +, short thick plate is −
      const n = Math.max(1, Math.min(6, part.cells ?? 2)), gap = 0.07 * L, w = n * gap * 2
      lead(0, m - w / 2); lead(m + w / 2, L)
      ctx.strokeStyle = o.short ? ACCENT : INK
      for (let i = 0; i < n; i++) {
        const x = m - w / 2 + i * 2 * gap + gap / 2
        const longX = plusAtEnd ? x + gap : x, shortX = plusAtEnd ? x : x + gap
        ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(longX, -0.13 * L); ctx.lineTo(longX, 0.13 * L); ctx.stroke()
        ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(shortX, -0.065 * L); ctx.lineTo(shortX, 0.065 * L); ctx.stroke()
      }
    } else {
      lead(0, 0.2 * L); lead(0.8 * L, L)
      const warm = warmth(T), n = part.cells ?? 2
      ctx.translate(0, o.short ? Math.sin(o.time * 60) * 1.2 : 0)
      // a holder with n cells side by side, + caps all facing the + end
      const x0 = 0.2 * L, len = 0.6 * L, cw = len / n
      for (let i = 0; i < n; i++) {
        const cx = x0 + i * cw
        ctx.fillStyle = part.blown ? '#6B5B4B' : `rgb(${43 + 140 * warm}, ${47 - 10 * warm}, ${54 - 20 * warm})`
        ctx.beginPath(); ctx.roundRect(cx + 1, -0.09 * L, cw - 2, 0.18 * L, 3); ctx.fill()
        ctx.fillStyle = '#D08A3A'; ctx.fillRect(plusAtEnd ? cx + cw - 1 - cw * 0.22 : cx + 1, -0.09 * L, cw * 0.22, 0.18 * L)
        ctx.fillStyle = '#9AA0AA'; ctx.fillRect(plusAtEnd ? cx + cw - 1 : cx - 1, -0.03 * L, 2, 0.06 * L)
      }
      if (part.blown) { ctx.fillStyle = 'rgba(245, 240, 220, .9)'; for (const f of [0.3, 0.55, 0.72]) { ctx.beginPath(); ctx.arc(f * L, 0.07 * L, 3, 0, Math.PI * 2); ctx.fill() } }
    }
  } else if (part.type === 'supply') {
    lead(0, 0.24 * L); lead(0.76 * L, L)
    const plusAtEnd = batteryPlus(key, part) === edgeEnds(key)[1]
    if (o.symbols) {
      ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.fillStyle = '#fff'
      ctx.beginPath(); ctx.arc(m, 0, 0.13 * L, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
      ctx.font = `700 12px ${SANS}`; ctx.fillStyle = INK; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.fillText(plusAtEnd ? '− +' : '+ −', m, 1)
    } else {
      ctx.fillStyle = '#2B2F36'; ctx.beginPath(); ctx.roundRect(0.24 * L, -0.16 * L, 0.52 * L, 0.32 * L, 6); ctx.fill()
      ctx.fillStyle = '#0E1A12'; ctx.fillRect(0.3 * L, -0.11 * L, 0.3 * L, 0.11 * L)
      ctx.font = `600 ${Math.round(0.075 * L)}px ${MONO}`; ctx.fillStyle = info?.cc ? '#FF7A4A' : '#5DF08A'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle'
      ctx.fillText(Math.abs(info?.V ?? sourceVolts(part)).toFixed(1), 0.585 * L, -0.055 * L)
      ctx.fillStyle = '#C9C6BC'; ctx.beginPath(); ctx.arc(0.68 * L, -0.05 * L, 0.05 * L, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = info?.cc ? '#FF7A4A' : '#3C4048'; ctx.beginPath(); ctx.arc(0.33 * L, 0.08 * L, 3, 0, Math.PI * 2); ctx.fill()
      for (const [x, plus] of [[0.45 * L, !plusAtEnd], [0.6 * L, plusAtEnd]]) { ctx.fillStyle = plus ? RED : '#111'; ctx.beginPath(); ctx.arc(x, 0.08 * L, 4, 0, Math.PI * 2); ctx.fill() }
    }
  } else if (part.type === 'bulb' || part.type === 'lamp') {
    const r = (o.symbols ? 0.11 : part.type === 'lamp' ? 0.19 : 0.16) * L
    const light = part.blown ? 0 : info?.light ?? 0, seen = Math.min(1.5, Math.cbrt(light)), col = glowColor(T)
    lead(0, m - r); lead(m + r, L)
    if (seen > 0.03) halo(ctx, m, 0, r * 0.3, r * (1.3 + 1.6 * seen), col, Math.min(0.9, 0.15 + seen * 0.6))
    ctx.fillStyle = part.blown ? '#D9D6CC' : seen > 0.03 ? rgba(col.map(c => 200 + c * 0.22), 0.55 + Math.min(seen, 1) * 0.45) : '#fff'
    ctx.strokeStyle = INK; ctx.lineWidth = 2
    ctx.beginPath(); ctx.arc(m, 0, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
    if (o.symbols) {
      const d = r * 0.7
      ctx.beginPath(); ctx.moveTo(m - d, -d); ctx.lineTo(m + d, d); ctx.moveTo(m - d, d); ctx.lineTo(m + d, -d); ctx.stroke()
    } else {
      // supports, then the coiled filament in the colour of its temperature
      ctx.strokeStyle = '#8A8D93'; ctx.lineWidth = 1.2
      ctx.beginPath(); ctx.moveTo(m - r * 0.6, r * 0.75); ctx.lineTo(m - r * 0.6, 0); ctx.moveTo(m + r * 0.6, r * 0.75); ctx.lineTo(m + r * 0.6, 0); ctx.stroke()
      ctx.strokeStyle = part.blown ? MUTED : T > 760 ? rgba(col, Math.min(1, 0.45 + redHot(T))) : '#6B6F78'; ctx.lineWidth = 1.6
      if (part.blown) { ctx.beginPath(); ctx.moveTo(m - r * 0.6, 0); ctx.lineTo(m - r * 0.15, -r * 0.2); ctx.moveTo(m + r * 0.15, r * 0.2); ctx.lineTo(m + r * 0.6, 0); ctx.stroke() }
      else zigzag(ctx, m - r * 0.6, m + r * 0.6, r * 0.18, 7)
    }
    if (part.blown) { ctx.strokeStyle = MUTED; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(m + r * 0.2, -r); ctx.lineTo(m + r * 0.45, -r * 0.4); ctx.lineTo(m + r * 0.25, -r * 0.1); ctx.stroke() }
  } else if (part.type === 'resistor') {
    lead(0, 0.3 * L); lead(0.7 * L, L)
    if (o.symbols) { ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.lineJoin = 'round'; zigzag(ctx, 0.3 * L, 0.7 * L, 0.07 * L) }
    else {
      // body darkens as it scorches, then chars
      const scorch = Math.max(0, Math.min(1, (T - 420) / (RESISTOR.Tfail - 420)))
      ctx.fillStyle = part.blown ? '#3A2E26' : `rgb(${232 - 120 * scorch}, ${217 - 140 * scorch}, ${181 - 130 * scorch})`
      ctx.strokeStyle = '#8A7A57'; ctx.lineWidth = 1.2
      ctx.beginPath(); ctx.roundRect(0.3 * L, -0.07 * L, 0.4 * L, 0.14 * L, 0.06 * L); ctx.fill(); ctx.stroke()
      if (!part.blown) bands(part.R).forEach((c, i) => { ctx.fillStyle = c; ctx.fillRect(0.36 * L + i * 0.075 * L + (i === 3 ? 0.03 * L : 0), -0.07 * L, 0.03 * L, 0.14 * L) })
      else { ctx.strokeStyle = '#111'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(0.45 * L, -0.07 * L); ctx.lineTo(0.5 * L, 0.02 * L); ctx.lineTo(0.55 * L, -0.03 * L); ctx.stroke() }
    }
  } else if (part.type === 'coil') {
    // resistance wire wound on an insulating card, as in the school practical
    lead(0, 0.22 * L); lead(0.78 * L, L)
    if (o.symbols) { ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.lineJoin = 'round'; zigzag(ctx, 0.3 * L, 0.7 * L, 0.07 * L) }
    else {
      ctx.fillStyle = '#EDE3CC'; ctx.strokeStyle = '#A8956C'; ctx.lineWidth = 1
      ctx.beginPath(); ctx.roundRect(0.22 * L, -0.1 * L, 0.56 * L, 0.2 * L, 3); ctx.fill(); ctx.stroke()
      const glow = redHot(T)
      ctx.strokeStyle = part.blown ? MUTED : glow > 0 ? rgba(glowColor(T), 0.4 + glow * 0.6) : `rgb(${110 + 100 * warmth(T)}, 108, 104)`
      ctx.lineWidth = 1.3; helix(ctx, 0.25 * L, 0.75 * L, 0.085 * L, 9)
      ctx.fillStyle = BRASS; ctx.fillRect(0.21 * L, -0.03 * L, 0.04 * L, 0.06 * L); ctx.fillRect(0.75 * L, -0.03 * L, 0.04 * L, 0.06 * L)
    }
  } else if (part.type === 'rheostat') {
    lead(0, 0.2 * L); lead(0.8 * L, L)
    const f = Math.min(1, part.R / (part.Rmax ?? RHEOSTAT.Rmax))
    if (o.symbols) {
      ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.lineJoin = 'round'; zigzag(ctx, 0.3 * L, 0.7 * L, 0.07 * L)
      ctx.beginPath(); ctx.moveTo(0.32 * L, 0.12 * L); ctx.lineTo(0.68 * L, -0.12 * L); ctx.stroke()
      ctx.fillStyle = INK; ctx.beginPath(); ctx.moveTo(0.68 * L, -0.12 * L); ctx.lineTo(0.6 * L, -0.11 * L); ctx.lineTo(0.65 * L, -0.05 * L); ctx.fill()
    } else {
      // a ceramic tube wound with nichrome; only the length up to the slider carries current
      const x0 = 0.24 * L, x1 = 0.76 * L, sx = x0 + f * (x1 - x0)
      ctx.fillStyle = '#F1E7D0'; ctx.strokeStyle = '#8A7A57'; ctx.lineWidth = 1.2
      ctx.beginPath(); ctx.roundRect(x0, -0.08 * L, x1 - x0, 0.16 * L, 4); ctx.fill(); ctx.stroke()
      const glow = redHot(T)
      for (let x = x0 + 2; x < x1 - 1; x += 3) {
        const live = x <= sx && !part.blown
        ctx.strokeStyle = live && glow > 0 ? rgba(glowColor(T), 0.5 + glow * 0.5) : live ? `rgb(${176 + 60 * warmth(T)}, ${122 - 40 * warmth(T)}, 58)` : '#C7B38A'
        ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, -0.08 * L); ctx.lineTo(x + 1.5, 0.08 * L); ctx.stroke()
      }
      if (glow > 0.05) { ctx.save(); ctx.globalAlpha = glow * 0.5; halo(ctx, (x0 + sx) / 2, 0, 2, Math.max(12, (sx - x0) / 1.6), glowColor(T), 0.6); ctx.restore() }
      // slider on its bar
      ctx.strokeStyle = '#8A8D93'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x0, -0.16 * L); ctx.lineTo(x1, -0.16 * L); ctx.stroke()
      ctx.fillStyle = INK; ctx.beginPath(); ctx.roundRect(sx - 5, -0.2 * L, 10, 0.1 * L, 2); ctx.fill()
      ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(sx, -0.1 * L); ctx.lineTo(sx, -0.075 * L); ctx.stroke()
    }
  } else if (part.type === 'switch') {
    lead(0, 0.3 * L); lead(0.7 * L, L)
    const len = 0.4 * L, a = -0.6 * (o.swing?.[key] ?? (part.closed ? 0 : 1))
    ctx.strokeStyle = INK; ctx.lineWidth = o.symbols ? 2.5 : 4; ctx.lineCap = 'round'
    ctx.beginPath(); ctx.moveTo(0.3 * L, 0); ctx.lineTo(0.3 * L + Math.cos(a) * len, Math.sin(a) * len); ctx.stroke()
    ctx.fillStyle = '#fff'; ctx.lineWidth = 2
    for (const x of [0.3 * L, 0.7 * L]) { ctx.beginPath(); ctx.arc(x, 0, 4.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke() }
    if (!o.symbols) { ctx.fillStyle = ACCENT; ctx.beginPath(); ctx.arc(0.3 * L + Math.cos(a) * len * 0.8, Math.sin(a) * len * 0.8, 5, 0, Math.PI * 2); ctx.fill() }
  } else if (part.type === 'key') {
    lead(0, 0.3 * L); lead(0.7 * L, L)
    if (o.symbols) {
      // plug key: a dot in brackets when the plug is in
      ctx.strokeStyle = INK; ctx.lineWidth = 2
      ctx.beginPath(); ctx.arc(m, 0, 0.1 * L, Math.PI * 0.65, Math.PI * 1.35); ctx.stroke()
      ctx.beginPath(); ctx.arc(m, 0, 0.1 * L, -Math.PI * 0.35, Math.PI * 0.35); ctx.stroke()
      if (part.closed) { ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(m, 0, 3.5, 0, Math.PI * 2); ctx.fill() }
    } else {
      // two brass blocks on an ebonite base; the brass plug bridges the gap when pushed in
      const lift = o.swing?.[key] ?? (part.closed ? 0 : 1)
      ctx.fillStyle = '#2B2F36'; ctx.beginPath(); ctx.roundRect(0.28 * L, -0.1 * L, 0.44 * L, 0.2 * L, 4); ctx.fill()
      ctx.fillStyle = BRASS; ctx.fillRect(0.31 * L, -0.07 * L, 0.16 * L, 0.14 * L); ctx.fillRect(0.53 * L, -0.07 * L, 0.16 * L, 0.14 * L)
      const py = -lift * 0.26 * L, px = m + lift * 0.18 * L
      ctx.fillStyle = '#B08A2A'; ctx.beginPath(); ctx.moveTo(px - 4, py); ctx.lineTo(px + 4, py); ctx.lineTo(px + 2.5, py + 0.08 * L); ctx.lineTo(px - 2.5, py + 0.08 * L); ctx.fill()
      ctx.fillStyle = '#16181D'; ctx.beginPath(); ctx.roundRect(px - 7, py - 0.09 * L, 14, 0.09 * L, 3); ctx.fill()
    }
  } else if (part.type === 'push') {
    // a doorbell button: the plate dips down onto the contacts while held
    lead(0, 0.3 * L); lead(0.7 * L, L)
    ctx.fillStyle = '#fff'; ctx.strokeStyle = INK; ctx.lineWidth = 2
    for (const x of [0.3 * L, 0.7 * L]) { ctx.beginPath(); ctx.arc(x, 0, 4, 0, Math.PI * 2); ctx.fill(); ctx.stroke() }
    const y = part.closed ? -5 : -0.13 * L
    ctx.lineWidth = o.symbols ? 2.5 : 4; ctx.beginPath(); ctx.moveTo(0.26 * L, y); ctx.lineTo(0.74 * L, y); ctx.stroke()
    ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(m, y); ctx.lineTo(m, y - 0.1 * L); ctx.stroke()
    if (!o.symbols) { ctx.fillStyle = ACCENT; ctx.beginPath(); ctx.arc(m, y - 0.1 * L, 7, 0, Math.PI * 2); ctx.fill() }
  } else if (part.type === 'mains') {
    lead(0, 0.28 * L); lead(0.72 * L, L)
    if (o.symbols) {
      ctx.fillStyle = '#fff'; ctx.strokeStyle = INK; ctx.lineWidth = 2
      ctx.beginPath(); ctx.arc(m, 0, 0.13 * L, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
      ctx.beginPath(); for (let i = 0; i <= 20; i++) { const x = m - 0.08 * L + (i / 20) * 0.16 * L; ctx.lineTo(x, -Math.sin((i / 20) * Math.PI * 2) * 0.04 * L) } ctx.stroke()
    } else {
      // a wall socket
      ctx.fillStyle = o.short ? '#F6D2C5' : '#fff'; ctx.strokeStyle = INK; ctx.lineWidth = 2
      ctx.beginPath(); ctx.roundRect(m - 0.22 * L, -0.15 * L, 0.44 * L, 0.3 * L, 6); ctx.fill(); ctx.stroke()
      ctx.fillStyle = INK
      for (const [dx, dy] of [[-0.07, -0.05], [0.07, -0.05], [0, 0.06]]) { ctx.beginPath(); ctx.arc(m + dx * L, dy * L, 3, 0, Math.PI * 2); ctx.fill() }
    }
  } else if (part.type === 'fuse') {
    lead(0, 0.28 * L); lead(0.72 * L, L)
    if (o.symbols) {
      ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.strokeRect(0.32 * L, -0.06 * L, 0.36 * L, 0.12 * L)
      if (!part.melted) { ctx.beginPath(); ctx.moveTo(0.28 * L, 0); ctx.lineTo(0.72 * L, 0); ctx.stroke() }
    } else {
      // a porcelain carrier with the fuse wire stretched across it
      ctx.fillStyle = part.melted ? '#E6E1D6' : '#F7F5EF'; ctx.strokeStyle = '#7A8590'; ctx.lineWidth = 1.5
      ctx.beginPath(); ctx.roundRect(0.3 * L, -0.08 * L, 0.4 * L, 0.16 * L, 6); ctx.fill(); ctx.stroke()
      ctx.fillStyle = '#B9BEC6'; ctx.fillRect(0.26 * L, -0.05 * L, 0.07 * L, 0.1 * L); ctx.fillRect(0.67 * L, -0.05 * L, 0.07 * L, 0.1 * L)
      const copper = part.wire === 'copper', glow = redHot(T), w = warmth(T)
      ctx.strokeStyle = glow > 0 ? rgba(glowColor(T), 0.5 + glow / 2) : copper ? '#B5652E' : `rgb(${150 + 100 * w}, ${155 - 60 * w}, ${160 - 100 * w})`
      ctx.lineWidth = copper ? 2.6 : 1.3
      ctx.beginPath()
      if (part.melted) { ctx.moveTo(0.33 * L, 0); ctx.lineTo(0.44 * L, 0.03 * L); ctx.moveTo(0.56 * L, -0.03 * L); ctx.lineTo(0.67 * L, 0) }
      else { ctx.moveTo(0.33 * L, 0); ctx.quadraticCurveTo(m, 0.015 * L, 0.67 * L, 0) }
      ctx.stroke()
      if (part.melted) { ctx.fillStyle = 'rgba(40, 30, 20, .45)'; ctx.beginPath(); ctx.arc(m, 0.01 * L, 0.035 * L, 0, Math.PI * 2); ctx.fill() }
    }
  } else if (isMeter(part)) {
    const r = o.symbols ? 0.11 * L : 0.15 * L
    lead(0, m - r); lead(m + r, L)
    terminals(meterPlus(key, part) === edgeEnds(key)[0])
    miniMeter(ctx, m, r, part.type === 'ammeter' ? 'A' : 'V', info?.needle, part.blown, o.symbols)
    if (part.blown && !o.symbols) { ctx.strokeStyle = '#3A3F48'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(m - r * 0.5, -r * 0.2); ctx.lineTo(m + r * 0.4, r * 0.3); ctx.stroke() }
  } else if (part.type === 'fan') {
    const r = 0.17 * L
    lead(0, m - r); lead(m + r, L)
    ctx.fillStyle = '#fff'; ctx.strokeStyle = INK; ctx.lineWidth = 2
    ctx.beginPath(); ctx.arc(m, 0, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
    if (o.symbols) { ctx.font = `700 14px ${SANS}`; ctx.fillStyle = INK; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('M', m, 1) }
    else {
      const a0 = o.spin?.[key] ?? 0, w = info?.w ?? 0
      // fast blades blur into a disc
      if (w > 10) { ctx.fillStyle = `rgba(90, 143, 216, ${Math.min(0.35, (w - 10) / 60)})`; ctx.beginPath(); ctx.arc(m, 0, r * 0.92, 0, Math.PI * 2); ctx.fill() }
      ctx.fillStyle = part.blown ? '#C9C6BC' : `rgba(90, 143, 216, ${w > 10 ? Math.max(0.35, 1 - (w - 10) / 40) : 1})`
      for (let i = 0; i < 3; i++) {
        const a = a0 + (i * Math.PI * 2) / 3
        ctx.beginPath(); ctx.ellipse(m + Math.cos(a) * r * 0.48, Math.sin(a) * r * 0.48, r * 0.45, r * 0.17, a, 0, Math.PI * 2); ctx.fill()
      }
      ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(m, 0, r * 0.15, 0, Math.PI * 2); ctx.fill()
    }
  } else if (part.type === 'heater') {
    lead(0, 0.24 * L); lead(0.76 * L, L)
    const glow = part.blown ? 0 : redHot(T)
    if (!o.symbols) {
      ctx.fillStyle = '#E9E6DE'; ctx.strokeStyle = INK; ctx.lineWidth = 1.5
      ctx.beginPath(); ctx.roundRect(0.24 * L, -0.13 * L, 0.52 * L, 0.26 * L, 5); ctx.fill(); ctx.stroke()
      if (glow > 0.02) halo(ctx, m, 0, 2, 0.32 * L, glowColor(T), 0.65 * glow)
    }
    ctx.strokeStyle = o.symbols ? INK : glow > 0.02 ? rgba(glowColor(T), 0.4 + 0.6 * glow) : `rgb(${107 + 100 * warmth(T)}, 111, 120)`
    ctx.lineWidth = o.symbols ? 2 : 2.4; ctx.lineJoin = 'round'
    if (o.symbols) zigzag(ctx, 0.28 * L, 0.72 * L, 0.07 * L, 9)
    else helix(ctx, 0.28 * L, 0.72 * L, 0.07 * L, 8)
  } else if (part.type === 'bell') {
    lead(0, 0.3 * L); lead(0.7 * L, L)
    const ringing = !part.blown && info?.ringing
    const shake = ringing ? Math.sin(o.time * 2 * Math.PI * 16) * 2.2 : 0
    ctx.save(); ctx.translate(shake, 0)
    ctx.fillStyle = o.symbols ? '#fff' : '#E9B949'; ctx.strokeStyle = INK; ctx.lineWidth = 2
    ctx.beginPath(); ctx.arc(m, 0.06 * L, 0.15 * L, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.stroke()
    ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(m, 0.08 * L, 3, 0, Math.PI * 2); ctx.fill()
    if (ringing) {
      ctx.strokeStyle = ACCENT; ctx.lineWidth = 1.5
      for (const [a0, a1] of [[-0.75, -0.35], [Math.PI + 0.35, Math.PI + 0.75]]) { ctx.beginPath(); ctx.arc(m, 0, 0.22 * L, a0, a1); ctx.stroke() }
      // the contact breaking: a tiny blue spark each time it opens
      if (Math.abs(info.I) < 1e-4 && !o.symbols) { ctx.fillStyle = '#9FD0FF'; ctx.beginPath(); ctx.arc(m + 0.12 * L, 0.08 * L, 2.5, 0, Math.PI * 2); ctx.fill() }
    }
    ctx.restore()
  }
  ctx.restore()

  // upright labels
  const perp = Math.abs(q.y - p.y) < 1 ? { x: 0, y: -1 } : { x: 1, y: 0 }
  const label = (text, dist, color = INK, font = `500 11.5px ${MONO}`) => {
    ctx.font = font; ctx.fillStyle = color; ctx.textBaseline = perp.x ? 'middle' : 'bottom'
    // labels beside vertical parts go on the left when the right side would run off the board
    const flip = perp.x && o.w && mx + dist + ctx.measureText(text).width > o.w - 6
    ctx.textAlign = perp.x ? (flip ? 'right' : 'left') : 'center'
    ctx.fillText(text, mx + perp.x * dist * (flip ? -1 : 1), my + perp.y * dist)
  }
  if (isMeter(part)) {
    const unit = part.type === 'ammeter' ? 'A' : 'V'
    if (part.blown) label('burnt out', 0.2 * L, ACCENT, `600 11px ${SANS}`)
    else if (o.readings) label(part.type === 'ammeter' ? fmtA(info?.reading ?? 0) : `${(info?.reading ?? 0).toFixed(2)} V`, 0.2 * L, DATA, `600 12px ${MONO}`)
    else label(`0–${part.range} ${unit}`, 0.2 * L, MUTED, `500 10.5px ${MONO}`)
  }
  if (part.type === 'resistor') label(part.blown ? 'burnt out' : `${part.R} Ω`, 0.13 * L, part.blown ? ACCENT : INK)
  if (part.type === 'coil') label(part.blown ? 'burnt out' : part.mystery ? `R${part.mystery === true ? '' : part.mystery} = ?` : `${part.R} Ω`, 0.14 * L)
  if (part.type === 'rheostat') label(part.blown ? 'burnt out' : `${part.R.toFixed(part.R < 10 ? 1 : 0)} Ω`, 0.24 * L)
  if (part.type === 'fuse') label(part.melted ? 'melted' : part.wire === 'copper' ? 'copper wire!' : `${part.rating} A fuse`, 0.12 * L, part.melted || part.wire === 'copper' ? ACCENT : MUTED, `600 11px ${SANS}`)
  if (APPLIANCES[part.type]) label(part.blown ? 'burnt out' : APPLIANCES[part.type].label, part.type === 'heater' ? 0.17 * L : 0.24 * L, part.blown ? MUTED : INK, `600 11px ${SANS}`)
  if (part.type === 'mains') label('220 V ~', 0.2 * L, o.short ? ACCENT : INK)
  if (part.type === 'supply') label(info?.cc ? 'current limit' : `${sourceVolts(part).toFixed(1)} V set`, 0.2 * L, info?.cc ? ACCENT : MUTED, `500 11px ${MONO}`)
  if (part.type === 'key') label(part.closed ? 'key in' : 'key out', -0.24 * L, MUTED, `500 10.5px ${SANS}`)
  if (part.type === 'battery') {
    label(part.blown ? 'leaked' : `${sourceVolts(part).toFixed(1)} V`, 0.14 * L, part.blown || o.short ? ACCENT : INK)
    const plus = batteryPlus(key, part) === edgeEnds(key)[1] ? q : p
    ctx.font = `700 13px ${SANS}`; ctx.fillStyle = ACCENT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillText('+', plus.x + (mx - plus.x) * 0.36 + perp.x * -0.12 * L, plus.y + (my - plus.y) * 0.36 + perp.y * -0.12 * L)
  }
  if (part.type === 'bulb' && part.blown) label('blown', 0.2 * L, MUTED, `600 11px ${SANS}`)
  if (part.type === 'wire' && part.blown) label('melted', 0.08 * L, ACCENT, `600 11px ${SANS}`)
  if (o.selected === key) {
    ctx.strokeStyle = DATA; ctx.lineWidth = 2; ctx.setLineDash([5, 4])
    const horiz = Math.abs(q.y - p.y) < 1, bw = (horiz ? 0.64 : 0.52) * L, bh = (horiz ? 0.52 : 0.64) * L
    ctx.beginPath(); ctx.roundRect(mx - bw / 2, my - bh / 2, bw, bh, 8); ctx.stroke(); ctx.setLineDash([])
  }
}

/** Is something on the board smoking? (hot insulation, a scorching resistor, a burnt-out part) */
function smokes(part, info) {
  const T = info?.T ?? T_ROOM
  if (part.type === 'wire') return T > WIRE.INSULATION ? Math.min(1, (T - WIRE.INSULATION) / 150) : 0
  if (part.type === 'resistor') return T > RESISTOR.SCORCH ? Math.min(1, (T - RESISTOR.SCORCH) / 120) : 0
  if (part.type === 'coil') return T > 900 ? 0.3 : 0
  if (part.type === 'battery') return T > 365 ? 0.4 : 0
  if (isMeter(part)) return T > T_ROOM + 80 ? 0.6 : 0
  return 0
}

/**
 * board/an: the parts and their analysis; sim: the live simulation from useLab (optional).
 * tool: the part or tool in hand. onEdge(key): an edge was clicked (null = look only).
 * onMove(from, to): a part was dragged to another edge (to = null: dropped off the board).
 * onPress(key, down): a push button. selected: the edge to outline.
 * probes: { plus, minus } dots for the multimeter, onProbes to move them.
 * The ref gives edgeAt(clientX, clientY) and hoverAt(…) for parts dragged in from the bin.
 */
export const CircuitBoard = forwardRef(function CircuitBoard(
  { board, an, sim, tool = null, onEdge, onMove, onPress, symbols, electrons, readings = true, probes = null, onProbes, locked, selected, sound = true, guide = null },
  apiRef,
) {
  const ref = useRef(null)
  const size = useRef({ w: 0, h: 0 })
  const state = useRef({})
  const [hover, setHover] = useState(null)
  const drag = useRef(null)
  const pops = useRef({})
  const sparks = useRef([])
  const smoke = useRef([])
  const spin = useRef({})
  const swing = useRef({})
  const last = useRef(performance.now())
  const prev = useRef(board)
  state.current = { board, an, symbols, electrons, readings, probes, hover, locked, selected, guide }

  useImperativeHandle(apiRef, () => ({
    edgeAt: (cx, cy) => {
      const r = ref.current.getBoundingClientRect()
      if (cx < r.left || cx > r.right || cy < r.top || cy > r.bottom) return null
      const k = nearestEdge(layout(size.current.w, size.current.h), cx - r.left, cy - r.top)
      return k && !locked?.has(k) ? k : null
    },
    hoverAt: (cx, cy) => {
      if (cx == null) { setHover(null); return }
      const r = ref.current.getBoundingClientRect()
      setHover(nearestEdge(layout(size.current.w, size.current.h), cx - r.left, cy - r.top))
    },
  }))

  const burst = (k, frac, n, speed) => {
    const { w, h } = size.current
    if (!w) return
    const g = layout(w, h), [a, b] = edgeEnds(k), P = g.P(a), Q = g.P(b)
    const x = P.x + (Q.x - P.x) * frac, y = P.y + (Q.y - P.y) * frac, now = performance.now()
    for (let i = 0; i < n; i++) { const ang = Math.random() * Math.PI * 2, v = speed * (0.4 + Math.random()); sparks.current.push({ x, y, vx: Math.cos(ang) * v, vy: Math.sin(ang) * v - 30, t0: now }) }
  }

  // what changed since last time: snaps, clicks, sparks, pops, a melted fuse
  useEffect(() => {
    const now = performance.now(), was = prev.current
    prev.current = board
    let placed = false
    const live = sim?.current?.an ?? an
    for (const [k, p] of Object.entries(board)) {
      const old = was[k]
      if (!old || old.id !== p.id) { if (!old || old.type !== p.type) placed = true; continue }
      if ((p.type === 'switch' || p.type === 'push' || p.type === 'key') && old.closed !== p.closed) {
        if (sound) sfx.click()
        if (p.type === 'switch' || p.type === 'key') swing.current[k] = p.closed ? 1 : 0
        // a spark at the contacts when a live circuit is made, a bigger one when it is broken under load
        const I = Math.abs(live.parts[k]?.I ?? 0)
        if ((p.closed && I > 1e-3) || (!p.closed && Math.abs(old.closed ? live.parts[k]?.I ?? 0 : 0) > 0.05)) { burst(k, 0.7, p.closed ? 10 : 16, 90); if (sound) sfx.spark() }
      }
      if (p.blown && !old.blown) { pops.current[k] = { t0: now, kind: p.type === 'bulb' || p.type === 'lamp' ? 'POP!' : 'BURNT!' }; if (sound) (p.type === 'bulb' || p.type === 'lamp' ? sfx.pop : sfx.fizz)() }
      if (p.melted && !old.melted) { pops.current[k] = { t0: now, kind: 'FIZZ!' }; burst(k, 0.5, 14, 120); if (sound) sfx.fizz() }
    }
    if (placed && sound && Object.keys(board).length >= Object.keys(was).length) sfx.snap()
  }, [board])

  // looping sounds: a buzz while shorted, a ring while a bell is powered
  const ringing = Object.keys(board).some(k => board[k].type === 'bell' && an.parts[k]?.ringing)
  useEffect(() => { loop('buzz', sound && an.short) }, [an.short, sound])
  useEffect(() => { loop('ring', sound && ringing) }, [ringing, sound])
  useEffect(() => () => { loop('buzz', false); loop('ring', false) }, [])

  const paint = (time = performance.now()) => {
    const cv = ref.current
    if (!cv || !size.current.w) return
    const { w, h } = size.current, dpr = window.devicePixelRatio || 1
    const ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h)
    const S = state.current, g = layout(w, h), t = time / 1000
    const A = sim?.current?.an ?? S.an
    const dt = Math.min(0.1, (time - last.current) / 1000); last.current = time
    // fans spin at their real speed; switch levers and plug keys move
    for (const [k, p] of Object.entries(S.board)) {
      if (p.type === 'fan') spin.current[k] = ((spin.current[k] ?? 0) + dt * (A.parts[k]?.w ?? 0)) % (Math.PI * 2)
      if (p.type === 'switch' || p.type === 'key') { const target = p.closed ? 0 : 1; const sw = swing.current[k] ?? target; swing.current[k] = sw + (target - sw) * Math.min(1, dt * 16) }
    }
    // dots
    for (let n = 0; n < COLS * ROWS; n++) { const p = g.P(n); ctx.fillStyle = '#C9C6BC'; ctx.beginPath(); ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2); ctx.fill() }
    if (S.hover && !S.locked?.has(S.hover)) {
      const [a, b] = edgeEnds(S.hover), p = g.P(a), q = g.P(b)
      ctx.strokeStyle = 'rgba(32, 81, 200, .45)'; ctx.lineWidth = 10; ctx.lineCap = 'round'
      ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke()
    }
    const o = { symbols: S.symbols, readings: S.readings, short: A.short, time: t, spin: spin.current, swing: swing.current, selected: S.selected, w }
    const moving = drag.current?.part
    // the guide: faint outlines of where each part of the finished circuit goes
    if (S.guide) {
      ctx.save(); ctx.globalAlpha = 0.22
      for (const [key, part] of Object.entries(S.guide)) {
        if (S.board[key]?.type === part.type) continue
        const [a, b] = edgeEnds(key)
        drawPart(ctx, key, part, null, g.P(a), g.P(b), g.s, { ...o, selected: null })
      }
      ctx.restore()
    }
    const entries = Object.entries(S.board)
    for (const [key, part] of entries) {
      if (moving && moving.from === key) continue
      const [a, b] = edgeEnds(key), p = g.P(a), q = g.P(b)
      drawPart(ctx, key, part, A.parts[key], p, q, g.s, o)
      // smoke rising from anything too hot (or burnt)
      const sm = Math.max(smokes(part, A.parts[key]), part.blown && part.type !== 'bulb' && part.type !== 'lamp' && part.type !== 'wire' && time - (pops.current[key]?.t0 ?? 0) < 4000 ? 0.5 : 0)
      if (sm > 0 && !S.symbols && Math.random() < sm * dt * 14) smoke.current.push({ x: (p.x + q.x) / 2 + (Math.random() - 0.5) * 14, y: (p.y + q.y) / 2 - 6, t0: time, r: 5 + Math.random() * 4 })
    }
    // moving charges: conventional current (+ to −) or electrons (the other way)
    for (const [key, part] of entries) {
      const I = A.parts[key]?.I ?? 0
      if (Math.abs(I) < 1e-4 || (moving && moving.from === key)) continue
      const [a, b] = edgeEnds(key), p = g.P(a), q = g.P(b), L = g.s
      const dir = Math.sign(I) * (S.electrons ? -1 : 1)
      const speed = Math.min(1.6, Math.max(0.08, Math.abs(I) / 0.3)) * 70, gap = 18
      const phase = ((t * speed) % gap + gap) % gap
      ctx.fillStyle = S.electrons ? DATA : ACCENT
      const skip = part.type === 'wire' ? 0 : isSource(part) ? 0.26 : 0.18
      for (let d = phase; d < L; d += gap) {
        const f = dir > 0 ? d / L : 1 - d / L
        if (skip && Math.abs(f - 0.5) < skip) continue
        ctx.beginPath(); ctx.arc(p.x + (q.x - p.x) * f, p.y + (q.y - p.y) * f, 2.6, 0, Math.PI * 2); ctx.fill()
      }
    }
    // a part being carried: drawn under the pointer, along the edge it would land on
    if (moving) {
      const target = drag.current.target
      if (target) {
        const [a, b] = edgeEnds(target), p = g.P(a), q = g.P(b)
        ctx.globalAlpha = 0.85; drawPart(ctx, moving.from, moving.part, null, p, q, g.s, o); ctx.globalAlpha = 1
      } else {
        ctx.globalAlpha = 0.6
        drawPart(ctx, moving.from, moving.part, null, { x: drag.current.x - g.s / 2, y: drag.current.y }, { x: drag.current.x + g.s / 2, y: drag.current.y }, g.s, o)
        ctx.globalAlpha = 1
      }
    }
    // wire being drawn from dot to dot
    if (drag.current?.wire) {
      const p = g.P(drag.current.wire.at)
      ctx.strokeStyle = 'rgba(58, 63, 72, .5)'; ctx.lineWidth = 4; ctx.setLineDash([6, 6])
      ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(drag.current.x, drag.current.y); ctx.stroke(); ctx.setLineDash([])
    }
    // smoke
    smoke.current = smoke.current.filter(s => time - s.t0 < 1800)
    for (const s of smoke.current) {
      const a = (time - s.t0) / 1800
      ctx.fillStyle = `rgba(120, 120, 120, ${0.32 * (1 - a)})`
      ctx.beginPath(); ctx.arc(s.x + Math.sin(a * 6 + s.r) * 6, s.y - a * 60, s.r + a * 14, 0, Math.PI * 2); ctx.fill()
    }
    // sparks
    sparks.current = sparks.current.filter(sp => time - sp.t0 < 450)
    for (const sp of sparks.current) {
      const a = (time - sp.t0) / 1000
      ctx.fillStyle = `rgba(255, ${190 - a * 200}, 60, ${1 - a / 0.45})`
      ctx.beginPath(); ctx.arc(sp.x + sp.vx * a, sp.y + sp.vy * a + 200 * a * a, 2.2, 0, Math.PI * 2); ctx.fill()
    }
    // pops, melts and burn-outs
    for (const [k, pop] of Object.entries(pops.current)) {
      const age = (time - pop.t0) / 900
      if (age > 1 || !S.board[k]) { if (age > 5) delete pops.current[k]; continue }
      const [a, b] = edgeEnds(k), p = g.P(a), q = g.P(b), mx = (p.x + q.x) / 2, my = (p.y + q.y) / 2
      if (pop.kind === 'POP!') {
        ctx.strokeStyle = `rgba(255, 180, 0, ${1 - age})`; ctx.lineWidth = 3
        for (let i = 0; i < 8; i++) { const a2 = (i / 8) * Math.PI * 2, r0 = 16 + age * 20, r1 = r0 + 14; ctx.beginPath(); ctx.moveTo(mx + Math.cos(a2) * r0, my + Math.sin(a2) * r0); ctx.lineTo(mx + Math.cos(a2) * r1, my + Math.sin(a2) * r1); ctx.stroke() }
      } else {
        for (let i = 0; i < 3; i++) { ctx.fillStyle = `rgba(110, 110, 110, ${0.35 * (1 - age)})`; ctx.beginPath(); ctx.arc(mx + (i - 1) * 8, my - 14 - age * 30 - i * 6, 7 + age * 10, 0, Math.PI * 2); ctx.fill() }
      }
      ctx.font = `800 16px ${SANS}`; ctx.fillStyle = `rgba(228, 83, 42, ${1 - age})`; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'
      ctx.fillText(pop.kind, mx, my - 30 - age * 12)
    }
    // short-circuit warning
    if (A.short) {
      ctx.font = `800 15px ${SANS}`
      const mains = Object.values(S.board).some(p => p.type === 'mains')
      const msg = mains ? 'Short circuit! Hundreds of amps' : 'Short circuit! The cells are heating up'
      const tw = ctx.measureText(msg).width + 24
      ctx.fillStyle = ACCENT; ctx.beginPath(); ctx.roundRect((w - tw) / 2, 12, tw, 30, 6); ctx.fill()
      ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(msg, w / 2, 27)
    }
    // multimeter probes
    if (S.probes) {
      const park = { plus: { x: w - 80, y: h - 22 }, minus: { x: w - 40, y: h - 22 } }
      for (const which of ['minus', 'plus']) {
        const d = drag.current?.which === which ? drag.current : null
        const pt = d ? { x: d.x, y: d.y } : S.probes[which] != null ? g.P(S.probes[which]) : park[which]
        // a short coiled lead above each probe, so the cables never cross the circuit
        ctx.strokeStyle = which === 'plus' ? RED : INK; ctx.lineWidth = 2
        const side = which === 'plus' ? -1 : 1
        ctx.beginPath(); ctx.moveTo(pt.x, pt.y - 9); ctx.bezierCurveTo(pt.x, pt.y - 30, pt.x + side * 18, pt.y - 26, pt.x + side * 14, pt.y - 44); ctx.stroke()
        ctx.fillStyle = which === 'plus' ? RED : INK
        ctx.beginPath(); ctx.arc(pt.x, pt.y, 9, 0, Math.PI * 2); ctx.fill()
        ctx.fillStyle = '#fff'; ctx.font = `800 13px ${SANS}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
        ctx.fillText(which === 'plus' ? '+' : '−', pt.x, pt.y + 0.5)
      }
    }
  }

  // size to the box
  useEffect(() => {
    const cv = ref.current
    const ro = new ResizeObserver(([e]) => {
      const { width, height } = e.contentRect, dpr = window.devicePixelRatio || 1
      cv.width = Math.round(width * dpr); cv.height = Math.round(height * dpr); size.current = { w: width, h: height }
      paint()
    })
    ro.observe(cv)
    return () => ro.disconnect()
  }, [])
  useEffect(() => { paint() })

  // keep animating while charges move, anything is warm, a fan turns, something pops or a lever swings
  useEffect(() => { paint() }, [guide])
  const busy = Object.values(an.parts).some(p => Math.abs(p.I) > 1e-4 || (p.T ?? T_ROOM) > T_ROOM + 2 || (p.w ?? 0) > 0.01)
    || Object.values(board).some(p => p.blown || p.melted || p.type === 'switch' || p.type === 'key')
  useEffect(() => {
    if (!busy) return undefined
    let id = 0
    const tick = now => { paint(now); id = requestAnimationFrame(tick) }
    id = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(id)
  }, [busy])

  const at = e => { const r = ref.current.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top } }
  const down = e => {
    const { x, y } = at(e), g = layout(size.current.w, size.current.h)
    if (probes && onProbes) {
      const { w, h } = size.current
      const park = { plus: { x: w - 80, y: h - 22 }, minus: { x: w - 40, y: h - 22 } }
      for (const which of ['plus', 'minus']) {
        const pt = probes[which] != null ? g.P(probes[which]) : park[which]
        if (Math.hypot(pt.x - x, pt.y - y) < 16) {
          drag.current = { which, x, y }; e.currentTarget.setPointerCapture(e.pointerId); return
        }
      }
    }
    const k = nearestEdge(g, x, y)
    // push buttons work while held
    if (k && board[k]?.type === 'push' && onPress) { onPress(k, true); drag.current = { push: k }; e.currentTarget.setPointerCapture(e.pointerId); return }
    // draw wires by dragging from dot to dot
    if (tool === 'wire' && onEdge) {
      const n = nearestNode(g, x, y)
      if (n != null && Math.hypot(g.P(n).x - x, g.P(n).y - y) < g.s * 0.2) { drag.current = { wire: { at: n }, x, y }; e.currentTarget.setPointerCapture(e.pointerId); return }
    }
    // pick a placed part up to move it
    if (k && board[k] && onMove && !locked?.has(k)) drag.current = { pick: k, x, y, x0: x, y0: y }
    else drag.current = { click: true, x, y }
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const move = e => {
    const { x, y } = at(e), d = drag.current, g = layout(size.current.w, size.current.h)
    if (d?.which) { drag.current = { ...d, x, y }; paint(); return }
    if (d?.wire) {
      const n = nearestNode(g, x, y)
      if (n != null && n !== d.wire.at && Math.hypot(g.P(n).x - x, g.P(n).y - y) < g.s * 0.3) {
        const [a, b] = [d.wire.at, n]
        const ca = nodeAt(a), cb = nodeAt(b)
        if (Math.abs(ca.c - cb.c) + Math.abs(ca.r - cb.r) === 1) {
          const key = a < b ? `${a}-${b}` : `${b}-${a}`
          if (!board[key] && !locked?.has(key)) onEdge(key)
          drag.current = { wire: { at: n }, x, y }
        }
      } else drag.current = { ...d, x, y }
      paint(); return
    }
    if (d?.pick && Math.hypot(x - d.x0, y - d.y0) > 8) {
      drag.current = { part: { from: d.pick, part: board[d.pick] }, x, y, target: nearestEdge(g, x, y) }
      paint(); return
    }
    if (d?.part) { drag.current = { ...d, x, y, target: nearestEdge(g, x, y) }; paint(); return }
    if (!onEdge || d) return
    const k = nearestEdge(g, x, y)
    if (k !== hover) setHover(k)
  }
  const up = e => {
    const d = drag.current
    drag.current = null
    if (!d) return
    const { x, y } = at(e), g = layout(size.current.w, size.current.h)
    if (d.which) { onProbes({ ...probes, [d.which]: nearestNode(g, x, y) }); return }
    if (d.push) { onPress(d.push, false); return }
    if (d.wire) { paint(); return }
    if (d.part) {
      const { w, h } = size.current
      const off = x < 0 || y < 0 || x > w || y > h
      const to = off ? null : d.target
      if (off || (to && to !== d.part.from && !locked?.has(to))) onMove(d.part.from, to)
      paint(); return
    }
    const k = nearestEdge(g, x, y)
    if (onEdge && k && !locked?.has(k)) onEdge(k)
  }
  return (
    <canvas ref={ref} className={`st-fill st-board ${hover && onEdge ? 'is-pointing' : ''}`} onPointerDown={down} onPointerMove={move}
      onPointerUp={up} onPointerCancel={() => { drag.current = null; paint() }} onPointerLeave={() => setHover(null)} role="img" aria-label="Circuit board" />
  )
})

/** Repaint `draw` whenever `read()` changes; poll gently when it is still. */
function useLiveCanvas(read, draw, deps) {
  const ref = useRef(null)
  useEffect(() => {
    const cv = ref.current
    let id = 0, timer = 0, lastV, still = 0, alive = true
    const fit = () => {
      const r = cv.getBoundingClientRect(), dpr = window.devicePixelRatio || 1
      if (cv.width !== Math.round(r.width * dpr)) { cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr); lastV = undefined }
      return { w: r.width, h: r.height, dpr }
    }
    const tick = () => {
      if (!alive) return
      const v = read()
      if (v !== lastV && !(typeof v === 'number' && typeof lastV === 'number' && Math.abs(v - lastV) < 1e-5)) {
        const { w, h, dpr } = fit(), ctx = cv.getContext('2d')
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h); draw(ctx, w, h, v)
        lastV = v; still = 0
      } else still++
      if (still > 30) timer = setTimeout(tick, 120)
      else id = requestAnimationFrame(tick)
    }
    tick()
    const ro = new ResizeObserver(() => { lastV = undefined })
    ro.observe(cv)
    return () => { alive = false; cancelAnimationFrame(id); clearTimeout(timer); ro.disconnect() }
  }, deps)
  return ref
}

/**
 * A moving-coil meter dial: 50 divisions, a mirror strip behind the needle, + and − terminals.
 * read(): the needle position as a fraction of full scale (from the simulation), or null when
 * no meter is connected. The face shows its range and least count, like a real one.
 */
export function Meter({ kind, range, read, burnt = false }) {
  const [close, setClose] = useState(false)
  const ref = useLiveCanvas(read, (ctx, W, H, x) => {
    // drawn on a 250 × 150 face, scaled to whatever size the dial has on screen
    const k = W / 250, w = 250, h = H / k
    ctx.scale(k, k)
    const cx = w / 2, cy = h - 30, r = Math.min(w / 2 - 16, h - 46)
    const ang = v => Math.PI * (1.15 + 0.7 * v)
    ctx.fillStyle = '#FBFAF6'; ctx.beginPath(); ctx.roundRect(2, 2, w - 4, h - 4, 10); ctx.fill()
    // mirror strip: line the needle up with its reflection to avoid parallax
    ctx.strokeStyle = 'rgba(160, 175, 190, .45)'; ctx.lineWidth = 6
    ctx.beginPath(); ctx.arc(cx, cy, r - 18, ang(0), ang(1)); ctx.stroke()
    ctx.strokeStyle = INK; ctx.lineWidth = 1
    ctx.beginPath(); ctx.arc(cx, cy, r, ang(0), ang(1)); ctx.stroke()
    const N = METER.divisions
    for (let i = 0; i <= N; i++) {
      const a = ang(i / N), big = i % 10 === 0, mid = i % 5 === 0
      const r0 = r - (big ? 13 : mid ? 9 : 5)
      ctx.lineWidth = big ? 1.4 : 1
      ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); ctx.lineTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); ctx.stroke()
      if (big) {
        const v = (range * i) / N
        ctx.fillStyle = INK; ctx.font = `500 10.5px ${MONO}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
        ctx.fillText(Number.isInteger(v) ? v : v.toFixed(range < 1 ? 1 : 1), cx + Math.cos(a) * (r - 25), cy + Math.sin(a) * (r - 25))
      }
    }
    ctx.font = `700 18px ${SANS}`; ctx.fillStyle = INK; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillText(kind, cx, cy - r * 0.48)
    ctx.font = `500 9.5px ${MONO}`; ctx.fillStyle = MUTED
    ctx.fillText(`0–${range} ${kind} · 1 div = ${+(range / N).toFixed(3)} ${kind}`, cx, h - 9)
    if (x != null && !burnt) {
      const a = ang(Math.max(-0.03, Math.min(1.07, x)))
      ctx.strokeStyle = '#16181D'; ctx.lineWidth = 1.6
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * (r + 2), cy + Math.sin(a) * (r + 2)); ctx.stroke()
      ctx.strokeStyle = 'rgba(22,24,29,.18)'; ctx.lineWidth = 1.4
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * (r - 14), cy + Math.sin(a) * (r - 14)); ctx.stroke()
    }
    ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(cx, cy, 5, 0, Math.PI * 2); ctx.fill()
    // terminals
    ctx.fillStyle = RED; ctx.beginPath(); ctx.arc(w - 22, h - 14, 6, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(22, h - 14, 6, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = '#fff'; ctx.font = `700 10px ${SANS}`; ctx.fillText('+', w - 22, h - 13.5); ctx.fillText('−', 22, h - 13.5)
    if (burnt) { ctx.fillStyle = ACCENT; ctx.font = `700 13px ${SANS}`; ctx.fillText('coil burnt out', cx, cy - r * 0.15) }
    else if (x == null) { ctx.fillStyle = MUTED; ctx.font = `600 12px ${SANS}`; ctx.fillText('not connected', cx, cy - r * 0.15) }
  }, [kind, range, burnt, read])
  return (
    <button className={`st-meterbtn ${close ? 'is-close' : ''}`} onClick={() => setClose(c => !c)} title={close ? 'Click to step back' : 'Click to look closer'}
      aria-label={`${kind === 'A' ? 'Ammeter' : 'Voltmeter'} dial, 0 to ${range} ${kind === 'A' ? 'amperes' : 'volts'}. ${close ? 'Enlarged' : 'Click to enlarge'}`}>
      <canvas ref={ref} className="st-meter" />
    </button>
  )
}

/** A digital multimeter on DC volts: three digits, updating a few times a second. read(): volts or null. */
export function Multimeter({ read }) {
  const ref = useLiveCanvas(read, (ctx, w, h, v) => {
    ctx.fillStyle = '#E8B92E'; ctx.beginPath(); ctx.roundRect(2, 2, w - 4, h - 4, 12); ctx.fill()
    ctx.fillStyle = '#C6CFC0'; ctx.beginPath(); ctx.roundRect(14, 14, w - 28, 54, 6); ctx.fill()
    ctx.fillStyle = '#1D231C'; ctx.font = `600 30px ${MONO}`; ctx.textAlign = 'right'; ctx.textBaseline = 'middle'
    const text = v == null ? '- - -' : Math.abs(v) >= 1000 ? 'OL' : Math.abs(v) >= 100 ? v.toFixed(1) : v.toFixed(2)
    ctx.fillText(text, w - 46, 42)
    ctx.font = `600 13px ${SANS}`; ctx.fillText('V', w - 24, 46)
    ctx.fillStyle = '#16181D'; ctx.font = `600 11px ${SANS}`; ctx.textAlign = 'center'
    ctx.fillText('DC volts  ·  multimeter', w / 2, h - 18)
  }, [read])
  return <canvas ref={ref} className="st-meter st-dmm" role="img" aria-label="Multimeter reading" />
}

const TOOL_ICONS = {
  hand: <path d="M8 13V5.5a1.5 1.5 0 0 1 3 0V11m0-1.5V4a1.5 1.5 0 0 1 3 0v6m0-4.5a1.5 1.5 0 0 1 3 0V12m0-3.5a1.5 1.5 0 0 1 3 0V15a6 6 0 0 1-6 6h-1.5a6 6 0 0 1-4.8-2.4L4.6 15.5a1.6 1.6 0 0 1 2.4-2L8 15" />,
  wire: <path d="M3 12h18" strokeWidth="2.6" />,
  bulb: <><circle cx="12" cy="12" r="6" /><path d="M2 12h4m12 0h4M9 12l1.5-2 1.5 4 1.5-4L15 12" /></>,
  battery: <><rect x="5" y="8" width="13" height="8" rx="1.5" /><path d="M18 11v2m3-1h-3M2 12h3" /></>,
  supply: <><rect x="4" y="6" width="16" height="12" rx="2" /><path d="M7 10h6M16 10h1M9 14.5h1m4 0h1" /></>,
  switch: <><circle cx="7" cy="12" r="1.8" /><circle cx="17" cy="12" r="1.8" /><path d="M2 12h3.2m13.6 0H22M8.4 11l7-5" /></>,
  key: <><rect x="6" y="11" width="12" height="5" rx="1" /><path d="M2 13.5h4m12 0h4M12 11V6m-2 0h4" /></>,
  resistor: <path d="M2 12h4l1.5-3 3 6 3-6 3 6 1.5-3h4" />,
  coil: <path d="M2 12h3c1-4 2-4 3 0s2 4 3 0 2-4 3 0 2 4 3 0h5" />,
  rheostat: <><path d="M2 12h4l1.5-3 3 6 3-6 3 6 1.5-3h4" /><path d="M7 18L17 5m0 0h-3.5M17 5v3.5" /></>,
  ammeter: <><circle cx="12" cy="12" r="6" /><path d="M2 12h4m12 0h4M10 14.5l2-5 2 5m-3.2-1.6h2.4" /></>,
  voltmeter: <><circle cx="12" cy="12" r="6" /><path d="M2 12h4m12 0h4M10 9.5l2 5 2-5" /></>,
  fuse: <><rect x="6" y="9" width="12" height="6" rx="3" /><path d="M2 12h20" /></>,
  push: <><circle cx="7" cy="14" r="1.6" /><circle cx="17" cy="14" r="1.6" /><path d="M2 14h3.4m13.2 0H22M6 9h12M12 9V5" /></>,
  erase: <path d="M4 16l8-8 6 6-5 5H8zM13 19h8" />,
}
/** One line on what each part is for, shown in the tray. */
export const TOOL_HELP = {
  hand: 'Select, move and operate parts. Click a switch or key to flip it.',
  wire: 'Joins two dots. Drag across several dots to lay a line of wires.',
  bulb: 'A torch bulb made for 3 V. More current makes it brighter and hotter.',
  battery: 'Cells push current round the circuit from + to −.',
  supply: 'A battery eliminator: set any voltage from 0 to 12 V.',
  switch: 'Opens or closes the circuit.',
  key: 'The lab switch: push the plug in to close the circuit, pull it out to open it.',
  push: 'Closed only while you hold it down, like a doorbell button.',
  resistor: 'Holds back the current by a fixed amount.',
  coil: 'A coil of nichrome resistance wire.',
  rheostat: 'A variable resistor: slide it to change the current.',
  fuse: 'Melts and breaks the circuit if too much current flows.',
  ammeter: 'Measures current. Put it in the loop (in series). Red terminal towards the + of the cells.',
  voltmeter: 'Measures voltage. Join it across a part (in parallel). Red lead to the side nearer the +.',
  erase: 'Click a part to take it off the board.',
}
export const TOOL_NAMES = {
  hand: 'Hand', wire: 'Wire', bulb: 'Bulb', battery: 'Cells', supply: 'Supply', switch: 'Switch', key: 'Plug key', resistor: 'Resistor',
  coil: 'Coil', rheostat: 'Rheostat', ammeter: 'Ammeter', voltmeter: 'Voltmeter', fuse: 'Fuse', push: 'Button', erase: 'Remove',
}

/**
 * The parts bin. Click a part to hold it, or drag it straight onto the board.
 * left (optional): how many of each part are still available.
 */
export function Palette({ tools, tool, onTool, left, onDragPart }) {
  const [hover, setHover] = useState(null)
  const shown = hover ?? tool
  const down = (t, e) => {
    if (!onDragPart || t === 'hand' || t === 'erase' || t === 'wire' || left?.[t] === 0) return
    const x0 = e.clientX, y0 = e.clientY
    let dragging = false
    const move = ev => {
      if (!dragging && Math.hypot(ev.clientX - x0, ev.clientY - y0) > 6) dragging = true
      if (dragging) onDragPart(t, ev.clientX, ev.clientY, false)
    }
    const up = ev => {
      window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up)
      if (dragging) onDragPart(t, ev.clientX, ev.clientY, true)
    }
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up)
  }
  return (
    <div className="st-palette" role="toolbar" aria-label="Parts" onPointerLeave={() => setHover(null)}>
      {tools.map(t => {
        const n = left?.[t]
        return (
          <button key={t} className={tool === t ? 'is-on' : ''} aria-pressed={tool === t} disabled={n === 0} onClick={() => onTool(t)} onPointerDown={e => down(t, e)} onPointerEnter={() => setHover(t)} onFocus={() => setHover(t)} title={TOOL_HELP[t]}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{TOOL_ICONS[t]}</svg>
            <span>{TOOL_NAMES[t]}</span>
            {n != null && <em className="st-num">×{n}</em>}
          </button>
        )
      })}
      {shown && TOOL_HELP[shown] && <p className="st-palette-help"><b>{TOOL_NAMES[shown]}:</b> {TOOL_HELP[shown]}</p>}
    </div>
  )
}

/** The picture of a part following the pointer while it is dragged in from the bin. */
export function DragGhost({ ghost }) {
  if (!ghost) return null
  return (
    <div className="st-ghost" style={{ left: ghost.x, top: ghost.y }}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{TOOL_ICONS[ghost.type]}</svg>
    </div>
  )
}

/** Picture or symbols, current or electrons, sound on or off. */
export function ViewSwitches({ symbols, setSymbols, electrons, setElectrons }) {
  const [quiet, setQuiet] = useState(isMuted)
  return (
    <div className="st-float st-viewsw">
      <div className="st-seg" role="radiogroup" aria-label="Look">
        <button role="radio" aria-checked={!symbols} className={!symbols ? 'is-on' : ''} onClick={() => setSymbols(false)}>Picture</button>
        <button role="radio" aria-checked={symbols} className={symbols ? 'is-on' : ''} onClick={() => setSymbols(true)}>Symbols</button>
      </div>
      <div className="st-seg" role="radiogroup" aria-label="Show the flow of">
        <button role="radio" aria-checked={!electrons} className={!electrons ? 'is-on' : ''} onClick={() => setElectrons(false)}>Current</button>
        <button role="radio" aria-checked={electrons} className={electrons ? 'is-on' : ''} onClick={() => setElectrons(true)}>Electrons</button>
      </div>
      <button className="st-soundbtn" aria-pressed={!quiet} onClick={() => { setMuted(!quiet); setQuiet(!quiet) }}>{quiet ? 'Sound off' : 'Sound on'}</button>
    </div>
  )
}
