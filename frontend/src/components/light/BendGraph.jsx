/**
 * VISIORA — BendGraph
 * Refracted angle θ₂ against incident angle θ₁ for the chosen materials.
 * The dashed diagonal is "no bending". Past the critical angle the curve stops:
 * there is no refracted ray at all. Tap or drag to set θ₁.
 */
import React, { useRef } from 'react'
import { useCanvas } from '../motion/useCanvas'
import { interact, criticalAngle } from '../../engine/optics'

const MONO = '"JetBrains Mono", monospace'
const SANS = '"Plus Jakarta Sans", system-ui, sans-serif'

export default function BendGraph({ n1, n2, theta, onTheta }) {
  const layoutRef = useRef(null)
  const { ref } = useCanvas((ctx, w, h) => {
    const L = { l: 42, r: 14, t: 12, b: 34 }
    layoutRef.current = { ...L, w }
    const X = d => L.l + (d / 90) * (w - L.l - L.r)
    const Y = d => h - L.b - (d / 90) * (h - L.t - L.b)
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, w, h)

    const crit = criticalAngle(n1, n2)
    if (crit != null) {
      ctx.fillStyle = 'rgba(225,29,72,0.08)'
      ctx.fillRect(X(crit), L.t, X(90) - X(crit), h - L.t - L.b)
      ctx.font = `700 11px ${SANS}`
      ctx.fillStyle = '#B4123A'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'top'
      ctx.fillText('trapped', (X(crit) + X(90)) / 2, L.t + 6)
    }

    ctx.strokeStyle = 'rgba(28,23,19,0.08)'
    ctx.lineWidth = 1
    ctx.beginPath()
    for (let d = 0; d <= 90; d += 15) {
      ctx.moveTo(Math.round(X(d)) + 0.5, L.t)
      ctx.lineTo(Math.round(X(d)) + 0.5, h - L.b)
      ctx.moveTo(L.l, Math.round(Y(d)) + 0.5)
      ctx.lineTo(w - L.r, Math.round(Y(d)) + 0.5)
    }
    ctx.stroke()
    ctx.strokeStyle = '#483E36'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(L.l, L.t)
    ctx.lineTo(L.l, h - L.b)
    ctx.lineTo(w - L.r, h - L.b)
    ctx.stroke()

    ctx.font = `600 10.5px ${MONO}`
    ctx.fillStyle = '#6D6254'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    for (let d = 0; d <= 90; d += 30) ctx.fillText(`${d}°`, X(d), h - L.b + 5)
    ctx.textAlign = 'right'
    ctx.textBaseline = 'middle'
    for (let d = 0; d <= 90; d += 30) ctx.fillText(`${d}°`, L.l - 6, Y(d))
    ctx.font = `600 11px ${SANS}`
    ctx.textAlign = 'right'
    ctx.textBaseline = 'bottom'
    ctx.fillText('θ₁ (in)', w - L.r, h - 2)

    // No-bending reference.
    ctx.setLineDash([5, 5])
    ctx.strokeStyle = 'rgba(28,23,19,0.3)'
    ctx.beginPath()
    ctx.moveTo(X(0), Y(0))
    ctx.lineTo(X(90), Y(90))
    ctx.stroke()
    ctx.setLineDash([])

    // θ₂(θ₁), exact, up to the critical angle.
    ctx.strokeStyle = '#1251B8'
    ctx.lineWidth = 3
    ctx.beginPath()
    const end = crit ?? 90
    for (let i = 0; i <= 300; i++) {
      const d = (end * i) / 300
      const r = interact(Math.min(d, end - 1e-9), n1, n2)
      if (r.theta2 == null) break
      if (i) ctx.lineTo(X(d), Y(r.theta2))
      else ctx.moveTo(X(d), Y(r.theta2))
    }
    ctx.stroke()

    const cur = interact(theta, n1, n2)
    const px = X(theta)
    const py = cur.tir ? h - L.b : Y(cur.theta2)
    ctx.beginPath()
    ctx.arc(px, py, 6, 0, Math.PI * 2)
    ctx.fillStyle = '#fff'
    ctx.fill()
    ctx.lineWidth = 3
    ctx.strokeStyle = cur.tir ? '#E11D48' : '#1251B8'
    ctx.stroke()
  }, [n1, n2, theta])

  const pick = e => {
    const L = layoutRef.current
    if (!L) return
    const x = e.clientX - e.currentTarget.getBoundingClientRect().left
    const d = ((x - L.l) / (L.w - L.l - L.r)) * 90
    onTheta(Math.max(0, Math.min(89.5, Math.round(d * 2) / 2)))
  }

  return (
    <figure className="ml-graph">
      <figcaption>
        <span style={{ background: '#1251B8' }} />
        How much it bends
        <small>θ₂ (out)</small>
      </figcaption>
      <canvas
        ref={ref}
        className="ml-canvas ml-graph-canvas"
        role="img"
        aria-label="Graph of refracted angle against incident angle. Drag to change the angle."
        onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); pick(e) }}
        onPointerMove={e => { if (e.buttons) pick(e) }}
      />
      <p className="ml-graph-note">Dashed line = no bending. Below it bends towards the normal, above it bends away.</p>
    </figure>
  )
}
