/**
 * VISIORA Studio — the living bus-and-cow road, shared by the Mission and Drive tabs.
 * The bus is drawn to scale (12 m) with its front at the distance travelled. While braking,
 * its brake lights glow, its nose dips, its wheels slow and it leaves skid marks; the cow
 * steps in from the verge, hops at a near miss and leaps clear on a hit.
 * Art in public/images/studio: bus.svg is ours; cow.svg is Microsoft Fluent Emoji (MIT).
 */
import React, { useEffect, useState } from 'react'
import { useCanvas } from '../components/motion/useCanvas'
import { ACCENT, DATA, INK } from './drawings'

export const BUS_M = 12 // a real bus is about 12 m long
const WHEEL_R = 0.5 // m
const MONO = '"IBM Plex Mono", monospace', SANS = '"Instrument Sans", sans-serif'
const MUTED = '#82868F'
const n1 = v => v.toFixed(1)

// Each picture's viewBox size (vw × vh) and its drawn area: left x, top y, width w, height h.
const ART_BOX = {
  cow: { vw: 32, vh: 32, x: 2, y: 3.5, w: 28, h: 26.5 },
  bus: { vw: 240, vh: 84, x: 8, y: 6, w: 230, h: 76 },
}
const BUS_FRONT = 238, BUS_WHEELS = [50, 184], WHEEL_Y = 70, WHEEL_PX = 12 // in bus.svg units
const ART = Object.fromEntries(Object.keys(ART_BOX).map(k => {
  const img = new Image()
  img.src = `/images/studio/${k}.svg`
  return [k, img]
}))
const artLoaded = Promise.all(Object.values(ART).map(img => img.decode().catch(() => {})))
function useArt() {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    let live = true
    artLoaded.then(() => live && setReady(true))
    return () => { live = false }
  }, [])
  return ready && Object.values(ART).every(img => img.complete && img.naturalWidth > 0)
}

/** Road and tape share one scale, so anything drawn under the road lines up with the bus. */
export function roadScale(w, roadM) {
  const left = 24, right = 28, k = (w - left - right) / (roadM + BUS_M)
  return { X: s => left + (s + BUS_M) * k, S: x => (x - left) / k - BUS_M, k }
}

/** 0 → 1 over `ms` each time `key` changes to something truthy; 1 otherwise. */
function useBurst(key, ms = 900) {
  const [p, setP] = useState(1)
  useEffect(() => {
    if (!key) { setP(1); return undefined }
    let id = 0
    const t0 = performance.now()
    const tick = now => {
      const q = Math.min(1, (now - t0) / ms)
      setP(q)
      if (q < 1) id = requestAnimationFrame(tick)
    }
    setP(0)
    id = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(id)
  }, [key, ms])
  return p
}

/** A dimension line under the road: |←— label —→| */
function dimension(ctx, x0, x1, y, color, label) {
  if (x1 - x0 < 2) return
  ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 1.5
  ctx.beginPath(); ctx.moveTo(x0, y - 5); ctx.lineTo(x0, y + 5); ctx.moveTo(x1, y - 5); ctx.lineTo(x1, y + 5); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke()
  ctx.font = `600 11.5px ${SANS}`; ctx.textAlign = 'center'; ctx.textBaseline = 'top'
  ctx.fillText(label, (x0 + x1) / 2, y + 6)
}

/**
 * s, v: bus front position (m) and speed (m/s). decel: braking now (m/s², ≥ 0).
 * brakeS: where braking began, for skid marks. cow: { at, step 0 (verge) → 1 (on road), react: null | 'near' | 'hit' }.
 * marks: { appearS, brakeS, stopS } draws thinking and braking distances under the road.
 */
export function BusRoad({ roadM, s, v, decel = 0, brakeS = null, cow, marks = null, children }) {
  const artReady = useArt()
  const burst = useBurst(cow.react)
  const { ref } = useCanvas((ctx, w, h) => {
    ctx.clearRect(0, 0, w, h)
    const { X, k } = roadScale(w, roadM)
    const top = Math.round(Math.min(h * 0.58, h - 110)), lane = top + 22
    // road and scale
    ctx.fillStyle = '#E9E7DF'; ctx.fillRect(0, top, w, 36)
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.setLineDash([18, 14]); ctx.lineDashOffset = 0
    ctx.beginPath(); ctx.moveTo(0, top + 18); ctx.lineTo(w, top + 18); ctx.stroke(); ctx.setLineDash([])
    ctx.font = `500 11px ${MONO}`; ctx.textAlign = 'center'; ctx.textBaseline = 'top'
    const tick = roadM > 90 ? 20 : 10
    for (let m = 0; m <= roadM; m += tick) {
      ctx.fillStyle = INK; ctx.fillRect(Math.round(X(m)) - 0.5, top + 36, 1, 6)
      ctx.fillStyle = MUTED; ctx.fillText(m ? `${m}` : '0 m', X(m), top + 46)
    }
    // skid marks from both axles, from where the brakes went on
    const busScale = (BUS_M * k) / ART_BOX.bus.w
    if (brakeS !== null && s > brakeS) {
      ctx.fillStyle = 'rgba(22, 24, 29, .22)'
      for (const wx of BUS_WHEELS) {
        const back = ((BUS_FRONT - wx) / ART_BOX.bus.w) * BUS_M
        ctx.fillRect(X(brakeS - back), lane - 2, X(s - back) - X(brakeS - back), 3)
      }
    }
    // thinking and braking distances, once the run is over
    if (marks) {
      const y = top + 68
      if (marks.appearS != null && marks.brakeS != null && marks.brakeS > marks.appearS) dimension(ctx, X(marks.appearS), X(marks.brakeS), y, DATA, `thinking ${n1(marks.brakeS - marks.appearS)} m`)
      if (marks.brakeS != null && marks.stopS > marks.brakeS) dimension(ctx, X(marks.brakeS), X(marks.stopS), y, ACCENT, `braking ${n1(marks.stopS - marks.brakeS)} m`)
    }
    // the cow: steps in from the verge, hops at a near miss, leaps clear on a hit
    const c = ART_BOX.cow, cowH = Math.min(64, h * 0.28), cs = cowH / c.h
    let cx = X(cow.at), dy = -(1 - cow.step) * 30, rot = 0
    if (cow.react === 'near') dy -= Math.sin(Math.PI * burst) * 18
    // on a hit it leaps clear and lands upright on the verge behind the road
    if (cow.react === 'hit') { cx += burst * 70; dy -= Math.sin(Math.PI * burst) * 46 + burst * 30; rot = Math.sin(Math.PI * burst) * 0.5 }
    if (artReady) {
      ctx.save(); ctx.translate(cx + (c.w * cs) / 2, lane + dy); ctx.rotate(rot)
      ctx.drawImage(ART.cow, -(c.x + c.w / 2) * cs, -(c.y + c.h) * cs, c.vw * cs, c.vh * cs)
      ctx.restore()
    }
    ctx.fillStyle = INK; ctx.font = `600 12px ${SANS}`; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'
    if (cow.step >= 1 && !cow.react) ctx.fillText(`cow · ${n1(cow.at)} m`, cx + (c.w * cs) / 2, lane - cowH - 10)
    if (cow.react === 'near' && burst < 1) bubble(ctx, cx + (c.w * cs) / 2, lane + dy - cowH - 8, 'Moo!')
    // the bus: true to scale, front at s; nose dips while braking, pivoting on the rear wheel
    const b = ART_BOX.bus, ox = X(s) - BUS_FRONT * busScale, oy = lane - (b.y + b.h) * busScale
    ctx.save()
    const px = ox + BUS_WHEELS[0] * busScale
    ctx.translate(px, lane); ctx.rotate(Math.min(decel, 8) * 0.0035); ctx.translate(-px, -lane)
    if (artReady) ctx.drawImage(ART.bus, ox, oy, b.vw * busScale, b.vh * busScale)
    // brake lights
    ctx.fillStyle = decel > 0 ? '#FF3B30' : '#7A1E14'
    if (decel > 0) { ctx.shadowColor = 'rgba(255, 59, 48, .9)'; ctx.shadowBlur = 14 }
    ctx.beginPath(); ctx.roundRect(ox + 4 * busScale, oy + 48 * busScale, 6 * busScale, 12 * busScale, 2); ctx.fill()
    ctx.shadowBlur = 0
    // spinning wheels: spokes turn by distance ÷ wheel radius
    ctx.strokeStyle = '#fff'; ctx.lineWidth = Math.max(1.2, 1.8 * busScale); ctx.lineCap = 'round'
    for (const wx of BUS_WHEELS) {
      const cxw = ox + wx * busScale, cyw = oy + WHEEL_Y * busScale, r = WHEEL_PX * busScale
      for (let i = 0; i < 3; i++) {
        const ang = s / WHEEL_R + (i * 2 * Math.PI) / 3
        ctx.beginPath(); ctx.moveTo(cxw + Math.cos(ang) * r * 0.5, cyw + Math.sin(ang) * r * 0.5)
        ctx.lineTo(cxw + Math.cos(ang) * r * 0.85, cyw + Math.sin(ang) * r * 0.85); ctx.stroke()
      }
    }
    ctx.restore()
    ctx.fillStyle = INK; ctx.beginPath(); ctx.moveTo(X(s), top + 30); ctx.lineTo(X(s) - 5, top + 38); ctx.lineTo(X(s) + 5, top + 38); ctx.fill()
    if (cow.react === 'hit') stamp(ctx, X(s) - 30, oy - 18, 'CRASH!')
  }, [roadM, s, v, decel, brakeS, cow.at, cow.step, cow.react, marks, artReady, burst])
  return (
    <div className="st-scene">
      <canvas ref={ref} className="st-fill" role="img" aria-label={`Bus ${n1(s)} m along at ${n1(v)} m/s; cow at ${n1(cow.at)} m.`} />
      <Speedometer v={v} />
      {children}
    </div>
  )
}

function bubble(ctx, x, y, text) {
  ctx.font = `700 13px ${SANS}`
  const w = ctx.measureText(text).width + 16
  ctx.fillStyle = '#fff'; ctx.strokeStyle = INK; ctx.lineWidth = 1.5
  ctx.beginPath(); ctx.roundRect(x - w / 2, y - 26, w, 22, 11); ctx.fill(); ctx.stroke()
  ctx.fillStyle = INK; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, x, y - 15)
}

function stamp(ctx, x, y, text) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(-0.12)
  ctx.font = `800 20px ${SANS}`
  const w = ctx.measureText(text).width + 18
  ctx.fillStyle = ACCENT; ctx.beginPath(); ctx.roundRect(-w / 2, -16, w, 30, 5); ctx.fill()
  ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, 0, 0)
  ctx.restore()
}

/** A dashboard speedometer in km/h. */
export function Speedometer({ v }) {
  const kmh = v * 3.6, MAX = 100
  const { ref } = useCanvas((ctx, w, h) => {
    ctx.clearRect(0, 0, w, h)
    const cx = w / 2, cy = h - 18, r = Math.min(w / 2 - 10, h - 30)
    const ang = x => Math.PI + (x / MAX) * Math.PI
    ctx.lineCap = 'round'
    ctx.strokeStyle = '#E2E0D8'; ctx.lineWidth = 6
    ctx.beginPath(); ctx.arc(cx, cy, r, Math.PI, 2 * Math.PI); ctx.stroke()
    ctx.strokeStyle = ACCENT
    ctx.beginPath(); ctx.arc(cx, cy, r, Math.PI, ang(Math.min(kmh, MAX))); ctx.stroke()
    // tick marks every 10 km/h, longer every 50; only the ends are numbered so the dial stays clear
    ctx.strokeStyle = MUTED; ctx.lineWidth = 1.2
    for (let x = 0; x <= MAX; x += 10) {
      const inner = r - (x % 50 ? 9 : 13)
      ctx.beginPath(); ctx.moveTo(cx + Math.cos(ang(x)) * (r - 5), cy + Math.sin(ang(x)) * (r - 5))
      ctx.lineTo(cx + Math.cos(ang(x)) * inner, cy + Math.sin(ang(x)) * inner); ctx.stroke()
    }
    ctx.fillStyle = MUTED; ctx.font = `500 9.5px ${MONO}`; ctx.textAlign = 'center'; ctx.textBaseline = 'top'
    ctx.fillText('0', cx - r, cy + 6); ctx.fillText(MAX, cx + r, cy + 6)
    const a = ang(Math.min(kmh, MAX))
    ctx.strokeStyle = INK; ctx.lineWidth = 2.5
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * (r - 6), cy + Math.sin(a) * (r - 6)); ctx.stroke()
    ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(cx, cy, 4, 0, Math.PI * 2); ctx.fill()
    ctx.font = `600 13px ${MONO}`; ctx.textBaseline = 'alphabetic'; ctx.fillText(`${Math.round(kmh)} km/h`, cx, h - 2)
  }, [kmh])
  return <canvas ref={ref} className="st-float st-speedo" role="img" aria-label={`Speedometer: ${Math.round(kmh)} kilometres per hour`} />
}
