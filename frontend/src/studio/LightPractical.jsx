/**
 * VISIORA Studio — Practical tab of Light: the pin method, as in the school lab.
 * For each angle of incidence: trace the block, draw the normal and the incident ray with a
 * protractor, stick P1 and P2 on it; then look through the other side, move your eye until the
 * feet of P1 and P2 seen through the glass are in one line, and stick P3 and P4 to hide them.
 * Lift the block off, join the pin holes, and read the angles with a protractor. The eye's
 * view is worked out by tracing rays (engine/raybench.js), so a pin stuck carelessly gives
 * angles that are off, exactly as on paper.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useCanvas } from '../components/motion/useCanvas'
import { angleOf, dirOf, vec } from '../engine/raybench'
import {
  EYE, LIGHT_PRACTICALS, PIN_GAPS, PIN_TOLERANCE, angleOk, drawing, eyeAt, eyeView, faceOf, firstPins, incident, lengthOk, mean, pinError, pinOnSight, ratio, trueIndex, truePath,
} from '../engine/lightPracticals'
import { Stars } from './CircuitBoard'
import { ACCENT, INK } from './drawings'
import { MONO, PENCIL, PIN_COLOURS, SANS, arrowMid, drawEye, drawGlass, drawPin, fit, pencil, protractor } from './lightDraw'
import { ExperimentShell, Group, Icon, Options, Slider } from './Shell'

const DONE_KEY = 'visiora.light.practicals'
const VIEW = { slab: { x0: -125, y0: -100, x1: 125, y1: 185 }, prism: { x0: -125, y0: -140, x1: 170, y1: 135 } }
const ALIGNED = 0.15 // degrees: closer than this and the pins look like one
const FOV = 8 // the eye-view strip spans ±8°
const STEP_TITLES = { Aim: 'What we will find out', setup: 'Set up the sheet', sight: 'Look through the glass', measure: 'Measure the angles', Result: 'Your result', Viva: 'Check your understanding' }
const fmt = (v, d = 1) => (v == null || !Number.isFinite(v) ? '—' : v.toFixed(d))
const D2R = Math.PI / 180

function loadDone() { try { return JSON.parse(localStorage.getItem(DONE_KEY)) || {} } catch { return {} } }

const freshRun = (spec, k) => ({ i: null, traced: k > 0, normal: k > 0, ray: false, pins: false, s: spec.id === 'slab' ? 180 - EYE.slab.start : EYE.prism.start, P3: null, P4: null, typed: {}, checked: false, wrong: 0, shown: {} })

/** The slider position s → the eye's angle round the exit face (the slab's slider runs left → right). */
const thetaOf = (spec, s) => (spec.id === 'slab' ? 180 - s : s)
const sliderRange = spec => (spec.id === 'slab' ? [180 - EYE.slab.max, 180 - EYE.slab.min] : [EYE.prism.min, EYE.prism.max])

/** Everything the eye sees from where it is, and where it is looking. */
function useSight(spec, block, run, P1, P2) {
  return useMemo(() => {
    if (!run || run.i == null || !run.pins) return null
    const eye = eyeAt(spec, thetaOf(spec, run.s))
    const pins = { P1, P2, ...(run.P3 ? { P3: run.P3 } : {}), ...(run.P4 ? { P4: run.P4 } : {}) }
    const view = eyeView(block, eye, pins)
    const foot = name => view[name]?.feet.find(f => f.through && !f.bounced)?.angle ?? null
    const a1 = foot('P1'), a2 = foot('P2')
    const look = a2 ?? angleOf(vec.sub(EYE[spec.id].C, eye))
    const gap = a1 != null && a2 != null ? a1 - a2 : null
    const direct = name => view[name]?.feet.find(f => !f.through)?.angle ?? null
    const all = [a1, a2, direct('P3'), direct('P4')]
    const allInLine = all.every(a => a != null) && Math.max(...all) - Math.min(...all) < ALIGNED * 1.5
    return { eye, view, look, gap, a1, a2, allInLine, pins }
  }, [spec, block, run?.i, run?.pins, run?.s, run?.P3, run?.P4, P1, P2])
}

/** What the eye sees, drawn as a strip: pins as thin shafts, the glass as a tinted band. */
function EyeView({ sight }) {
  const { ref } = useCanvas((ctx, w, h) => {
    ctx.clearRect(0, 0, w, h)
    ctx.fillStyle = '#F3F1EB'; ctx.fillRect(0, 0, w, h)
    if (!sight) {
      ctx.fillStyle = '#82868F'; ctx.font = `500 13px ${SANS}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.fillText('Stick P1 and P2 first, then look through the glass from here.', w / 2, h / 2); return
    }
    const top = 18, glassTop = h * 0.5, bottom = h - 22
    const X = a => w / 2 + (Math.atan2(Math.sin((a - sight.look) * D2R), Math.cos((a - sight.look) * D2R)) / D2R) * (w / (2 * FOV))
    // the block, seen edge-on: everything in this band is seen through the glass
    const g = ctx.createLinearGradient(0, glassTop, 0, bottom)
    g.addColorStop(0, 'rgba(150,205,215,.55)'); g.addColorStop(1, 'rgba(150,205,215,.3)')
    ctx.fillStyle = g; ctx.fillRect(0, glassTop, w, bottom - glassTop)
    ctx.fillStyle = 'rgba(70,130,140,.5)'; ctx.fillRect(0, glassTop, w, 1.5)
    ctx.fillStyle = '#82868F'; ctx.font = `500 11px ${SANS}`; ctx.textAlign = 'left'; ctx.textBaseline = 'top'
    ctx.fillText('above the glass: the pin heads', 8, 4); ctx.fillText('through the glass: the feet of P1 and P2', 8, glassTop + 4)
    // centre mark
    ctx.strokeStyle = 'rgba(22,24,29,.15)'; ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.moveTo(w / 2, top); ctx.lineTo(w / 2, bottom); ctx.stroke(); ctx.setLineDash([])
    const dist = p => Math.hypot(p[0] - sight.eye[0], p[1] - sight.eye[1])
    const labels = [] // labels already placed, so a close neighbour moves aside
    const label = (text, x, colour, alpha = 1) => {
      const row = labels.filter(l => Math.abs(l - x) < 18).length
      labels.push(x)
      ctx.globalAlpha = alpha; ctx.fillStyle = colour; ctx.font = `600 11px ${SANS}`; ctx.textAlign = 'center'; ctx.textBaseline = 'top'
      ctx.fillText(text, x + row * 16, bottom + 4); ctx.globalAlpha = 1
    }
    const order = Object.keys(sight.view).sort((a, b) => dist(sight.pins[b]) - dist(sight.pins[a]))
    for (const name of order) {
      const v = sight.view[name], c = PIN_COLOURS[name], width = Math.max(1.6, Math.min(7, 420 / dist(sight.pins[name])))
      const behind = name === 'P1' || name === 'P2'
      const shaft = (x, y0, y1, alpha = 1) => { ctx.globalAlpha = alpha; ctx.fillStyle = '#9EA3AB'; ctx.fillRect(x - width / 2, y0, width, y1 - y0); ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.fillRect(x - width / 2, y0, Math.max(0.6, width / 3), y1 - y0); ctx.globalAlpha = 1 }
      const head = x => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, top + width, width * 1.4 + 2, 0, 2 * Math.PI); ctx.fill() }
      if (behind) {
        const hx = X(v.head)
        if (Math.abs(hx - w / 2) < w) { shaft(hx, top + width, glassTop); head(hx) }
        for (const f of v.feet.filter(f => f.through)) {
          const fx = X(f.angle)
          if (fx < -10 || fx > w + 10) continue
          shaft(fx, glassTop + 2, bottom, f.bounced ? 0.35 : 0.9)
          label(f.bounced ? `${name}′` : name, fx, c, f.bounced ? 0.5 : 1)
        }
      } else {
        const f = v.feet.find(f => !f.through) ?? { angle: v.head }
        const x = X(f.angle)
        if (x < -10 || x > w + 10) continue
        shaft(x, top + width, bottom); head(x)
        label(name, x, c)
      }
    }
    if (sight.a2 == null) {
      ctx.fillStyle = 'rgba(243,241,235,.85)'; ctx.fillRect(0, glassTop + 1, w, bottom - glassTop)
      ctx.fillStyle = INK; ctx.font = `600 13px ${SANS}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.fillText('From here you cannot see the pins through the glass. Move your eye.', w / 2, (glassTop + bottom) / 2)
    }
  }, [sight])
  return <canvas ref={ref} className="st-fill" role="img" aria-label="What your eye sees through the glass" />
}

/** A close-up of one measurement: a big protractor on an angle, or a ruler across two lines. */
function Closeup({ spec, dr, what }) {
  const { ref } = useCanvas((ctx, w, h) => {
    ctx.clearRect(0, 0, w, h)
    ctx.fillStyle = '#FBFAF7'; ctx.fillRect(0, 0, w, h)
    if (!dr) return
    const R = Math.min(w * 0.42, h - 30)
    if (what === 'shift') {
      // two parallel lines across the strip, a ruler laid square across them
      const k = Math.min(10, (h - 64) / Math.max(dr.shift + 3, 5)), cy = h / 2 + 4
      const y1 = cy - (dr.shift * k) / 2, y2 = cy + (dr.shift * k) / 2
      ctx.strokeStyle = PENCIL; ctx.setLineDash([5, 4]); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(20, y1); ctx.lineTo(w - 20, y1); ctx.stroke(); ctx.setLineDash([])
      ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(20, y2); ctx.lineTo(w - 20, y2); ctx.stroke()
      ctx.fillStyle = INK; ctx.font = `500 11px ${SANS}`; ctx.textAlign = 'left'; ctx.textBaseline = 'bottom'
      ctx.fillText('incident ray, produced', 24, y1 - 3); ctx.fillText('emergent ray', 24, y2 - 3)
      // a steel rule laid square across the lines, its zero on the upper one
      const rx = w / 2 - 26, top = y1 - 14, len = Math.ceil(dr.shift + 3)
      ctx.fillStyle = 'rgba(250,246,232,.96)'; ctx.strokeStyle = 'rgba(22,24,29,.55)'; ctx.lineWidth = 1
      ctx.fillRect(rx, top, 52, len * k + 28); ctx.strokeRect(rx, top, 52, len * k + 28)
      ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; ctx.font = `600 11px ${MONO}`
      for (let mm = 0; mm <= len; mm++) {
        const y = y1 + mm * k
        const l = mm % 10 === 0 ? 22 : mm % 5 === 0 ? 15 : 9
        ctx.strokeStyle = INK; ctx.lineWidth = mm % 5 === 0 ? 1.2 : 0.9
        ctx.beginPath(); ctx.moveTo(rx + 52, y); ctx.lineTo(rx + 52 - l, y); ctx.stroke()
        if (mm % 10 === 0) { ctx.fillStyle = INK; ctx.fillText(String(mm / 10), rx + 22, y) }
      }
      ctx.fillStyle = '#82868F'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.font = `500 11px ${SANS}`; ctx.fillText('ruler in cm · 1 small mark = 1 mm', rx + 64, cy)
      return
    }
    // a protractor with its zero along the normal (or along the incident ray produced, for D)
    let zero, ray, label
    if (what === 'r') { zero = vec.unit(vec.sub([0, 0], spec.outward)); ray = vec.unit(vec.sub(dr.O2, dr.O)); label = 'normal at O → refracted ray OO′' }
    else if (what === 'e') { zero = spec.exitOutward; ray = dr.em; label = 'normal at O′ → emergent ray' }
    else { zero = dr.d; ray = dr.em; label = 'incident ray produced → emergent ray' }
    // turn the picture so the zero line points up the strip
    const za = angleOf(zero), ra = angleOf(ray)
    const rel = Math.atan2(Math.sin((ra - za) * D2R), Math.cos((ra - za) * D2R)) / D2R
    const cx = w / 2, cy = h - 18
    protractor(ctx, cx, cy, R, -90)
    ctx.strokeStyle = PENCIL; ctx.lineWidth = 1.3; ctx.setLineDash([6, 4])
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx, cy - R - 6); ctx.stroke(); ctx.setLineDash([])
    const a = (-90 + rel) * D2R
    ctx.strokeStyle = ACCENT; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + (R + 8) * Math.cos(a), cy + (R + 8) * Math.sin(a)); ctx.stroke()
    ctx.fillStyle = '#82868F'; ctx.font = `500 11px ${SANS}`; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillText(label, 10, 8)
  }, [dr, what, spec])
  return <canvas ref={ref} className="st-fill" role="img" aria-label="Close-up of the protractor" />
}

const VIVA = {
  slab: [
    { q: 'Why does light bend when it goes from air into glass?', options: ['Glass attracts light', 'Light slows down in glass, and the edge of the beam that enters first slows first', 'Glass is thicker', 'Light speeds up in glass'], a: 1, why: 'Light travels at about 2 × 10⁸ m/s in glass compared with 3 × 10⁸ m/s in air. n = c ÷ v, so for glass n ≈ 1.5.' },
    { q: 'At O, light goes from air into glass. Which way does it bend?', options: ['Away from the normal', 'Towards the normal, so r < i', 'It does not bend', 'Along the surface'], a: 1, why: 'Going into an optically denser medium, light bends towards the normal. Your readings show r smaller than i every time.' },
    { q: 'Why is the emergent ray parallel to the incident ray?', options: ['Because the slab is transparent', 'The two faces are parallel, so the bending at the second face exactly undoes the first: e = i', 'Because the pins are in a line', 'It is a coincidence'], a: 1, why: 'Inside, the ray meets the second face at the same angle r it left the first face with, so it comes out at i again.' },
    { q: 'Which of these does NOT change the lateral displacement?', options: ['The thickness of the slab', 'The angle of incidence', 'The refractive index of the glass', 'The distance of the eye from the slab'], a: 3, why: 'The sideways shift is t·sin(i − r)/cos r: it depends on the thickness, i and n, not on where you look from.' },
    { q: 'Why do we line up the feet of the pins, not their heads?', options: ['The heads are too small', 'Only the feet are seen through the glass; the heads are seen straight over the top of it', 'The feet are sharper', 'It does not matter'], a: 1, why: 'You saw it in the eye view: the heads appear in a different place from the feet, because only the light from the feet has come through the glass.' },
    { q: 'Why should the two pins on each side be at least 5 cm apart?', options: ['So they do not touch', 'A small error in placing a pin turns a line through close pins by a large angle', 'So the paper does not tear', 'To let more light through'], a: 1, why: 'The farther apart the pins, the less a millimetre’s error tilts the line, so the angles are more accurate.' },
  ],
  prism: [
    { q: 'Which way does a prism bend a ray of light?', options: ['Towards its apex (the top corner)', 'Towards its base', 'It does not bend it', 'Back the way it came'], a: 1, why: 'It bends towards the normal going in and away from the normal coming out, and both bends turn the ray towards the thicker base.' },
    { q: 'What is the angle of deviation D?', options: ['The angle of the prism', 'The angle between the incident ray produced and the emergent ray', 'The angle between the incident ray and the normal', 'The angle of emergence'], a: 1, why: 'It measures how much the prism has turned the ray from the way it was going.' },
    { q: 'Unlike a glass slab, the emergent ray is not parallel to the incident ray. Why?', options: ['The prism is smaller', 'The two refracting faces of a prism are not parallel', 'The glass is different', 'The pins are further apart'], a: 1, why: 'The faces meet at the prism angle A, so the two bends add up instead of cancelling.' },
    { q: 'For your readings, i + e is equal to…', options: ['D', 'A + D', 'A − D', '180°'], a: 1, why: 'Inside, r₁ + r₂ = A, so the total turn D = (i − r₁) + (e − r₂) = i + e − A.' },
    { q: 'If white light is used instead, what happens?', options: ['It comes out white', 'It splits into colours, violet bent the most and red the least', 'Red is bent the most', 'It is all reflected'], a: 1, why: 'Glass has a slightly higher refractive index for violet than for red, so each colour deviates by a different angle: dispersion. Try it in the Explore tab.' },
  ],
}

/** A short to-do list that ticks itself off. items: [[done, text], …] */
function Todo({ items }) {
  return (
    <ul className="st-todo">
      {items.map(([done, text], i) => (
        <li key={i} className={done ? 'is-done' : ''}><span className="st-tick" aria-hidden="true">{done && <Icon name="check" />}</span><span>{text}</span>{done && <span className="st-sr">done</span>}</li>
      ))}
    </ul>
  )
}

export default function LightPractical({ tabs, onTab }) {
  const [pid, setPid] = useState('slab')
  const spec = LIGHT_PRACTICALS.find(p => p.id === pid)
  return <Run key={pid} spec={spec} tabs={tabs} onTab={onTab} onPick={setPid} />
}

function Run({ spec, tabs, onTab, onPick }) {
  const block = useMemo(() => spec.shape(), [spec])
  const nRuns = spec.need
  const steps = useMemo(() => ['Aim', ...Array.from({ length: nRuns }, (_, k) => [`setup${k}`, `sight${k}`, `measure${k}`]).flat(), 'Result', 'Viva'], [nRuns])
  const [step, setStep] = useState(0)
  const [runs, setRuns] = useState(() => Array.from({ length: nRuns }, (_, k) => freshRun(spec, k)))
  const [viva, setViva] = useState({})
  const [closeup, setCloseup] = useState(spec.id === 'slab' ? 'r' : 'e')
  const [done, setDone] = useState(loadDone)
  const key = steps[step]
  const k = step >= 1 && step <= nRuns * 3 ? Math.floor((step - 1) / 3) : nRuns - 1
  const stage = key.replace(/\d+$/, '')
  const run = runs[k]
  const setRun = changes => setRuns(rs => rs.map((r, j) => (j === k ? { ...r, ...(typeof changes === 'function' ? changes(r) : changes) } : r)))
  const go = n => { setStep(n); setCloseup(spec.id === 'slab' ? 'r' : 'e') }

  const [P1, P2] = useMemo(() => (run.i != null ? firstPins(spec, run.i) : [null, null]), [spec, run.i])
  const sight = useSight(spec, block, run, P1, P2)
  const dr = useMemo(() => (run.P3 && run.P4 && run.i != null ? drawing(spec, block, run.i, run.P3, run.P4) : null), [spec, block, run.i, run.P3, run.P4])

  // ——— the drawing board ———
  const drag = useRef(null)
  const viewRef = useRef(null)
  const { ref } = useCanvas((ctx, w, h) => {
    const v = fit(VIEW[spec.id], w, h)
    viewRef.current = v
    ctx.clearRect(0, 0, w, h)
    // drawing board and the sheet pinned to it
    ctx.fillStyle = '#E9E2D3'; ctx.fillRect(0, 0, w, h)
    const sx0 = v.X(VIEW[spec.id].x0 + 4), sy0 = v.Y(VIEW[spec.id].y0 + 4), sx1 = v.X(VIEW[spec.id].x1 - 4), sy1 = v.Y(VIEW[spec.id].y1 - 4)
    ctx.fillStyle = 'rgba(22,24,29,.08)'; ctx.fillRect(sx0 + 3, sy0 + 4, sx1 - sx0, sy1 - sy0)
    ctx.fillStyle = '#FFFFFF'; ctx.fillRect(sx0, sy0, sx1 - sx0, sy1 - sy0)
    for (const [x, y] of [[sx0 + 10, sy0 + 10], [sx1 - 10, sy0 + 10], [sx0 + 10, sy1 - 10], [sx1 - 10, sy1 - 10]]) { ctx.fillStyle = '#B8B2A4'; ctx.beginPath(); ctx.arc(x, y, 4, 0, 2 * Math.PI); ctx.fill() }
    if (stage === 'Aim' || stage === 'Result' || stage === 'Viva') {
      drawFinished(ctx, v, spec, block, runs.find(r => r.P3 && r.P4) ?? null, stage === 'Aim')
      return
    }
    const measuring = stage === 'measure'
    const inc = run.i != null ? incident(spec, run.i) : null
    // the block on the sheet, or its pencil outline once lifted
    if (run.traced) { ctx.strokeStyle = PENCIL; ctx.lineWidth = 1.1; drawOutline(ctx, block, v) }
    if (!measuring) drawGlass(ctx, block, v)
    // normal at O
    const O = spec.entry, nIn = vec.sub([0, 0], spec.outward)
    if (run.normal) pencil(ctx, vec.add(O, spec.outward, 45), vec.add(O, nIn, measuring ? 45 : 22), v, { dash: [5, 4] })
    if (run.normal) { ctx.fillStyle = INK; ctx.font = `600 12px ${SANS}`; ctx.textAlign = 'right'; ctx.textBaseline = 'bottom'; ctx.fillText('O', v.X(O[0]) - 5, v.Y(O[1]) - 3) }
    // choosing the angle: a protractor laid on the normal at O
    if (stage === 'setup' && run.normal && !run.ray) {
      const za = angleOf(spec.outward)
      protractor(ctx, v.X(O[0]), v.Y(O[1]), 42 * v.k, za, { span: 90 })
      if (run.i != null) { const d = incident(spec, run.i).d; pencil(ctx, O, vec.add(O, d, -55), v, { colour: ACCENT, width: 1.6, dash: [4, 3] }) }
    }
    if (run.ray && inc) {
      pencil(ctx, vec.add(O, inc.d, -95), O, v)
      arrowMid(ctx, vec.add(O, inc.d, -95), O, v)
      ctx.fillStyle = INK; ctx.font = `italic 600 12px ${SANS}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      const lab = vec.add(O, vec.unit(vec.add(vec.unit(spec.outward), vec.sub([0, 0], inc.d))), 16)
      ctx.fillText('i', ...v.P(lab))
    }
    if (measuring && dr) {
      // join the holes: incident ray, refracted ray through the glass, emergent ray
      pencil(ctx, O, dr.O2, v, { width: 1.4 }); arrowMid(ctx, O, dr.O2, v)
      pencil(ctx, dr.O2, vec.add(dr.O2, dr.em, 90), v, { width: 1.4 }); arrowMid(ctx, dr.O2, vec.add(dr.O2, dr.em, 90), v)
      pencil(ctx, vec.add(dr.O2, spec.exitOutward, 40), vec.add(dr.O2, spec.exitOutward, -22), v, { dash: [5, 4] })
      pencil(ctx, O, vec.add(O, inc.d, spec.id === 'slab' ? 110 : 90), v, { dash: [2, 3] }) // incident ray produced
      if (dr.meet) pencil(ctx, dr.O2, dr.meet, v, { dash: [2, 3] }) // emergent ray produced back, to measure D
      ctx.fillStyle = INK; ctx.font = `600 12px ${SANS}`; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillText('O′', v.X(dr.O2[0]) + 5, v.Y(dr.O2[1]) + 3)
      const at = closeup === 'r' ? O : closeup === 'e' ? dr.O2 : closeup === 'D' ? dr.meet : dr.O2
      if (at) { ctx.strokeStyle = ACCENT; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(v.X(at[0]), v.Y(at[1]), 12, 0, 2 * Math.PI); ctx.stroke() }
    }
    // pins (holes once the block and pins are lifted off)
    const pinList = [['P1', run.pins && P1], ['P2', run.pins && P2], ['P3', run.P3], ['P4', run.P4]]
    for (const [name, p] of pinList) if (p) drawPin(ctx, p, name, v, { hole: measuring })
    // the eye and its line of sight
    if (stage === 'sight' && sight) {
      pencil(ctx, sight.eye, vec.add(sight.eye, dirOf(sight.look), 120), v, { dash: [2, 5], colour: 'rgba(228,83,42,.6)' })
      drawEye(ctx, sight.eye, sight.look, v, true)
      ctx.fillStyle = ACCENT; ctx.font = `600 11px ${SANS}`; ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillText('your eye · drag me', v.X(sight.eye[0]), v.Y(sight.eye[1]) + 16)
    }
  }, [spec, block, run, stage, sight, dr, closeup, runs])

  const pointer = e => { const r = e.currentTarget.getBoundingClientRect(); return viewRef.current?.inv(e.clientX - r.left, e.clientY - r.top) }
  const onDown = e => {
    if (stage !== 'sight' || !sight) return
    const p = pointer(e); if (!p) return
    const near = (q, rad) => q && Math.hypot(q[0] - p[0], q[1] - p[1]) < rad
    if (near(run.P3, 6)) drag.current = 'P3'
    else if (near(run.P4, 6)) drag.current = 'P4'
    else if (near(sight.eye, 18)) drag.current = 'eye'
    else return
    e.currentTarget.setPointerCapture?.(e.pointerId)
  }
  const onMove = e => {
    if (!drag.current) return
    const p = pointer(e); if (!p) return
    if (drag.current === 'eye') {
      const th = angleOf(vec.sub(p, EYE[spec.id].C))
      const [lo, hi] = sliderRange(spec)
      const s = Math.max(lo, Math.min(hi, spec.id === 'slab' ? 180 - th : th))
      setRun({ s: Math.round(s * 10) / 10 })
    } else setRun({ [drag.current]: p })
  }
  const onUp = () => { drag.current = null }

  // ——— step logic ———
  const used = runs.filter((_, j) => j !== k).map(r => r.i).filter(i => i != null)
  const choices = spec.id === 'slab' ? [25, 30, 35, 40, 45, 50, 55, 60, 65] : [35, 40, 45, 50, 55, 60]
  const stick = name => {
    if (!sight || sight.a2 == null) return
    const p = pinOnSight(spec, block, sight.eye, sight.look, PIN_GAPS[name])
    if (p) setRun({ [name]: p })
  }
  // which way to move the eye: towards closing the gap between the feet of P1 and P2, or,
  // when one of them cannot be seen through the glass yet, towards where both can
  const hint = useMemo(() => {
    if (!sight || (sight.gap != null && Math.abs(sight.gap) < ALIGNED)) return null
    const words = spec.id === 'slab' ? ['left', 'right'] : ['up', 'down']
    const probe = s => { const eye = eyeAt(spec, thetaOf(spec, s)); const v = eyeView(block, eye, { P1, P2 }); const f = n => v[n].feet.find(x => x.through && !x.bounced)?.angle; return f('P1') != null && f('P2') != null ? Math.abs(f('P1') - f('P2')) : null }
    if (sight.gap != null) { const up = probe(run.s + 0.5); return up != null && up < Math.abs(sight.gap) ? words[1] : words[0] }
    const [lo, hi] = sliderRange(spec)
    for (let k = 2; k < hi - lo; k += 2) {
      if (run.s + k <= hi && probe(run.s + k) != null) return words[1]
      if (run.s - k >= lo && probe(run.s - k) != null) return words[0]
    }
    return null
  }, [sight, run.s, spec, block, P1, P2])
  const lined = sight && sight.gap != null && Math.abs(sight.gap) < ALIGNED

  const fields = spec.id === 'slab' ? [['r', 'Angle of refraction r', '°'], ['e', 'Angle of emergence e', '°'], ['shift', 'Lateral displacement', 'cm']] : [['e', 'Angle of emergence e', '°'], ['D', 'Angle of deviation D', '°']]
  const actual = f => (f === 'shift' ? dr?.shift / 10 : dr?.[f])
  const fieldOk = (f, run) => {
    const val = run.typed[f]
    if (f === 'shift') return lengthOk(val === '' || val == null ? '' : Number(val) * 10, dr?.shift ?? NaN)
    return angleOk(val, actual(f))
  }
  const allOk = dr && fields.every(([f]) => fieldOk(f, run))
  const check = () => setRun(r => ({ checked: true, wrong: r.wrong + (fields.every(([f]) => fieldOk(f, r)) ? 0 : 1) }))

  // ——— results ———
  const results = runs.map(r => {
    if (r.i == null || !r.P3 || !r.P4) return null
    const d = drawing(spec, block, r.i, r.P3, r.P4)
    const t = Object.fromEntries(Object.entries(r.typed).map(([f, v]) => [f, Number(v)]))
    return { i: r.i, ...t, d, err: pinError(spec, block, r.i, r.P3, r.P4) }
  }).filter(Boolean)
  const nVals = spec.id === 'slab' ? results.filter(x => x.r > 0).map(x => ratio(x.i, x.r)) : []
  const nMean = nVals.length ? mean(nVals) : null
  const careful = results.every(x => x.err && Math.max(...x.err) < PIN_TOLERANCE)
  const firstTime = runs.every(r => r.wrong === 0)
  const noPeeking = runs.every(r => !Object.keys(r.shown).length)
  const stars = (careful ? 1 : 0) + (firstTime ? 1 : 0) + (noPeeking ? 1 : 0)
  const vivaQs = VIVA[spec.id]
  const vivaDone = vivaQs.every((_, i) => viva[i] != null)
  useEffect(() => {
    if (!vivaDone || done[spec.id] >= Math.max(1, stars)) return
    const next = { ...done, [spec.id]: Math.max(1, stars) }
    setDone(next)
    try { localStorage.setItem(DONE_KEY, JSON.stringify(next)) } catch { /* private mode */ }
  }, [vivaDone])
  const startOver = () => { setRuns(Array.from({ length: nRuns }, (_, j) => freshRun(spec, j))); setViva({}); go(0) }

  // ——— panel ———
  let body = null
  if (stage === 'Aim') {
    body = (
      <>
        <Group label="Choose the practical">
          <div className="st-levels">
            {LIGHT_PRACTICALS.map((p, i) => (
              <button key={p.id} className={`st-level ${p.id === spec.id ? 'is-on' : ''}`} onClick={() => onPick(p.id)}>
                <span className="st-num">{i + 1}</span><span className="st-level-name">{p.title}</span>
                {done[p.id] ? <Stars n={done[p.id]} /> : <span className="st-locked">{p.short}</span>}
              </button>
            ))}
          </div>
        </Group>
        <p><b>Aim.</b> {spec.aim}</p>
        <button className="st-btn st-btn-primary st-btn-wide" onClick={() => go(1)}>Start the practical</button>
        <p><b>Apparatus.</b> {spec.apparatus}</p>
        <p className="st-muted st-small">The picture shows how the finished sheet will look. You will do it {nRuns} times, with a different angle of incidence each time.</p>
      </>
    )
  } else if (stage === 'setup') {
    body = (
      <>
        <Todo items={[
          [run.traced, `Place the ${spec.id === 'slab' ? 'slab' : 'prism'} in the middle of the sheet and trace round it with a sharp pencil.`],
          [run.normal, `Mark a point O on the ${spec.id === 'slab' ? 'top face' : 'left face'} and draw the normal there (a dashed line at 90° to the face).`],
          [run.i != null && run.ray, 'Lay the protractor on the normal and draw the incident ray at your chosen angle i.'],
          [run.pins, 'Stick two pins, P1 and P2, upright on that line, about 5 cm apart.'],
        ]} />
        {!run.traced && <button className="st-btn st-btn-primary st-btn-wide" onClick={() => setRun({ traced: true })}>Trace round the {spec.id === 'slab' ? 'slab' : 'prism'}</button>}
        {run.traced && !run.normal && <button className="st-btn st-btn-primary st-btn-wide" onClick={() => setRun({ normal: true })}>Draw the normal at O</button>}
        {run.normal && !run.ray && (
          <>
            <Options label="Angle of incidence" value={run.i} onChange={i => setRun({ i })} options={choices.map(a => ({ id: a, label: `${a}°`, disabled: used.includes(a) }))} />
            {used.length > 0 && <p className="st-muted st-small">Already done: {used.map(a => `${a}°`).join(', ')}. Pick a different angle so you can compare.</p>}
            <button className="st-btn st-btn-primary st-btn-wide" disabled={run.i == null || used.includes(run.i)} onClick={() => setRun({ ray: true })}>Draw the incident ray at {run.i ?? '?'}°</button>
          </>
        )}
        {run.ray && !run.pins && <button className="st-btn st-btn-primary st-btn-wide" onClick={() => setRun({ pins: true })}>Stick pins P1 and P2 on the line</button>}
        {run.pins && <button className="st-btn st-btn-primary st-btn-wide" onClick={() => go(step + 1)}>Next: look through the glass</button>}
      </>
    )
  } else if (stage === 'sight') {
    const [lo, hi] = sliderRange(spec)
    body = (
      <>
        <p>Look at P1 and P2 <b>through the {spec.id === 'slab' ? 'opposite face of the slab' : 'other face of the prism'}</b>. The strip under the board shows what your eye sees.</p>
        <Todo items={[
          [!!lined, 'Move your eye until the feet of P1 and P2, seen through the glass, are exactly one behind the other.'],
          [!!run.P3, 'Stick P3 so that it hides the feet of P1 and P2.'],
          [!!run.P4, 'Stick P4 so that it hides P3 and the feet of P1 and P2.'],
          [!!sight?.allInLine, 'Look once more: all four pins should be in one straight line.'],
        ]} />
        <Slider label="Move your eye" value={run.s} display={lined ? 'lined up' : sight?.gap != null ? `gap ${Math.abs(sight.gap).toFixed(2)}°` : sight?.a2 == null ? 'P2 hidden' : 'P1 hidden'} min={lo} max={hi} step={0.1}
          scale={spec.id === 'slab' ? ['← left', 'right →'] : ['↑ up', 'down ↓']} onChange={s => setRun({ s })} />
        {hint && sight.gap != null && <p className="st-callout">The feet of P1 and P2 are {Math.abs(sight.gap).toFixed(2)}° apart. Move your eye a little <b>{hint}</b>.</p>}
        {hint && sight.gap == null && <p className="st-callout">From here you cannot see {sight.a2 == null ? 'P2' : 'P1'} through the glass. Move your eye to the <b>{hint}</b> until both feet show in the blue band.</p>}
        {lined && !run.P3 && <p className="st-callout is-ok">Lined up: P2’s foot now hides P1’s. Keep your eye still and stick P3.</p>}
        <div className="st-row">
          <button className="st-btn st-btn-secondary" disabled={!sight || sight.a2 == null} onClick={() => stick('P3')}>{run.P3 ? 'Stick P3 again' : 'Stick P3'}</button>
          <button className="st-btn st-btn-secondary" disabled={!run.P3 || !sight || sight.a2 == null} onClick={() => stick('P4')}>{run.P4 ? 'Stick P4 again' : 'Stick P4'}</button>
        </div>
        <p className="st-muted st-small">A pin goes where your line of sight is now. If your eye was not lined up, the pin will be off the true ray, and so will your angles. You can also drag the pins and the eye on the board.</p>
        {run.P3 && run.P4 && !sight?.allInLine && <p className="st-callout">The four pins are not quite in one line from here. Move your eye to line up P1 and P2 again, then stick P3 and P4 again.</p>}
        {run.P3 && run.P4 && <button className="st-btn st-btn-primary st-btn-wide" onClick={() => go(step + 1)}>Next: lift off the {spec.id === 'slab' ? 'slab' : 'prism'} and measure</button>}
      </>
    )
  } else if (stage === 'measure') {
    body = (
      <>
        <p>The {spec.id === 'slab' ? 'slab' : 'prism'} and pins are lifted off. The pin holes have been joined: P1P2 meets the face at O, P4P3 meets the other face at O′, and OO′ is the path inside the glass.</p>
        <Group label="Read each one in the close-up">
          <Options label="Close-up" value={closeup} onChange={setCloseup} options={fields.map(([f]) => ({ id: f, label: f === 'shift' ? 'Shift' : f }))} />
        </Group>
        <div className="st-form">
          <span className="st-form-head">Angle of incidence i = {run.i}° (you drew it)</span>
          {fields.map(([f, label, unit]) => (
            <label key={f} className="st-field" onFocus={() => setCloseup(f)}>
              <span>{label}</span>
              <input className={`st-answer ${run.checked ? (fieldOk(f, run) ? 'is-right' : 'is-wrong') : ''}`} value={run.typed[f] ?? ''} inputMode="decimal" placeholder="?"
                onChange={e => setRun(r => ({ typed: { ...r.typed, [f]: e.target.value }, checked: false }))} />
              <em>{unit}</em>
            </label>
          ))}
        </div>
        <details className="st-help-more">
          <summary>How do I read these?</summary>
          <ul className="st-howto">
            <li><b>Angles:</b> the protractor’s 0 sits on the dashed line (the normal{spec.id === 'prism' ? ', or for D the incident ray produced' : ''}). Count the degrees round to the orange line. Small marks are 1°, numbers every 10°.</li>
            {spec.id === 'slab' && <li><b>Lateral displacement:</b> the distance between the incident ray produced and the emergent ray, measured square across. Read the ruler in cm to the nearest mm (0.1 cm).</li>}
          </ul>
        </details>
        <div className="st-row">
          <button className="st-btn st-btn-primary" onClick={check}>Check my readings</button>
          <button className="st-linkbtn" onClick={() => setRun(r => ({ typed: Object.fromEntries(fields.map(([f]) => [f, f === 'shift' ? (actual(f)).toFixed(1) : String(Math.round(actual(f)))])), shown: { ...r.shown, all: true }, checked: true }))}>Show me the answers</button>
        </div>
        {run.checked && !allOk && <p className="st-callout">One or more readings are out by more than {fields.some(([f]) => f === 'shift') ? '1° (or 1 mm)' : '1°'}. Look at the close-up again: is the protractor’s zero on the dashed line?</p>}
        {run.checked && allOk && (
          <>
            <p className="st-callout is-ok">Right. {spec.id === 'slab' ? `sin ${run.i}° ÷ sin ${run.typed.r}° = ${fmt(ratio(run.i, Number(run.typed.r)), 2)}.` : `i + e = ${run.i + Number(run.typed.e)}°, and A + D = ${60 + Number(run.typed.D)}°.`}</p>
            <button className="st-btn st-btn-primary st-btn-wide" onClick={() => go(step + 1)}>{k + 1 < nRuns ? `Next: angle ${k + 2} of ${nRuns}` : 'See the result'}</button>
          </>
        )}
      </>
    )
  } else if (stage === 'Result') {
    body = (
      <>
        <table className="st-table">
          <thead>{spec.id === 'slab'
            ? <tr><th>i</th><th>r</th><th>e</th><th>sin i ÷ sin r</th><th>shift</th></tr>
            : <tr><th>i</th><th>e</th><th>D</th><th>i + e</th><th>A + D</th></tr>}</thead>
          <tbody>{results.map(x => (spec.id === 'slab'
            ? <tr key={x.i}><td>{x.i}°</td><td>{fmt(x.r, 0)}°</td><td>{fmt(x.e, 0)}°</td><td>{fmt(ratio(x.i, x.r), 2)}</td><td>{fmt(x.shift, 1)} cm</td></tr>
            : <tr key={x.i}><td>{x.i}°</td><td>{fmt(x.e, 0)}°</td><td>{fmt(x.D, 0)}°</td><td>{fmt(x.i + x.e, 0)}°</td><td>{fmt(60 + x.D, 0)}°</td></tr>))}</tbody>
        </table>
        {spec.id === 'slab' ? (
          <>
            <p className="st-truth">Refractive index of the glass: <b>n = {fmt(nMean, 2)}</b> (mean of your three). The glass actually has n = {trueIndex().toFixed(3)} for daylight, so you are {fmt((Math.abs(nMean - trueIndex()) / trueIndex()) * 100, 1)} % out.</p>
            <ul className="st-howto">
              <li><b>r is always less than i:</b> light bends towards the normal going into glass.</li>
              <li><b>e equals i</b> (within a degree) every time, so the emergent ray is parallel to the incident ray.</li>
              <li><b>The sideways shift grows with i:</b> {results.map(x => `${fmt(x.shift, 1)} cm at ${x.i}°`).join(', ')}.</li>
            </ul>
          </>
        ) : (
          <ul className="st-howto">
            <li><b>i + e = A + D</b> for every reading, within a degree or two.</li>
            <li><b>The deviation changes with i:</b> {results.map(x => `${fmt(x.D, 0)}° at ${x.i}°`).join(', ')}. It is smallest somewhere in the middle, where the ray passes through the prism symmetrically (the angle of minimum deviation).</li>
          </ul>
        )}
        <Group label="Sources of error">
          <ul className="st-howto">
            <li>{careful ? 'Your pins were all within a millimetre of the true ray: careful sighting.' : `Some pins were more than ${PIN_TOLERANCE} mm off the true ray (worst ${fmt(Math.max(...results.flatMap(x => x.err)), 1)} mm), which tilts the lines and the angles.`}</li>
            <li>A protractor reads to 1°. At small angles that is a large fraction of the reading, which is why angles between 30° and 60° are used.</li>
            <li>Thick pins and a thick pencil line blur the line by about half a millimetre.</li>
          </ul>
        </Group>
        <button className="st-btn st-btn-primary" onClick={() => go(step + 1)}>Viva questions</button>
      </>
    )
  } else if (stage === 'Viva') {
    body = (
      <>
        {vivaQs.map((v, i) => (
          <div key={v.q} className="st-viva">
            <p><b>{i + 1}.</b> {v.q}</p>
            {v.options.map((o, j) => (
              <button key={o} className={`st-choice ${viva[i] == null ? '' : j === v.a ? 'is-right' : viva[i] === j ? 'is-wrong' : ''}`} disabled={viva[i] != null} onClick={() => setViva(s => ({ ...s, [i]: j }))}>{o}</button>
            ))}
            {viva[i] != null && <p className="st-muted st-small">{v.why}</p>}
          </div>
        ))}
        {vivaDone && (
          <>
            <p className="st-done"><Icon name="check" />Practical complete</p>
            <Stars n={Math.max(1, stars)} />
            <p className="st-muted st-small">Stars: pins within {PIN_TOLERANCE} mm of the true ray · readings right first time · no answers shown.</p>
            <div className="st-row">
              {LIGHT_PRACTICALS[LIGHT_PRACTICALS.indexOf(spec) + 1] && <button className="st-btn st-btn-primary" onClick={() => onPick(LIGHT_PRACTICALS[LIGHT_PRACTICALS.indexOf(spec) + 1].id)}>Next practical</button>}
              <button className="st-btn st-btn-secondary" onClick={() => onTab('explore')}>Play with light</button>
            </div>
          </>
        )}
      </>
    )
  }

  const title = STEP_TITLES[stage] ?? stage
  const panel = (
    <>
      <div className="st-stephead">
        <div className="st-stephead-top">
          <span className="st-label">{spec.title}{done[spec.id] ? ' · completed' : ''}</span>
          <span className="st-num">Step {step + 1} of {steps.length}</span>
        </div>
        <div className="st-progress" aria-hidden="true">{steps.map((s, i) => <span key={s} className={i < step ? 'is-done' : i === step ? 'is-on' : ''} />)}</div>
        <h2 className="st-step-title">{title}{['setup', 'sight', 'measure'].includes(stage) ? ` · angle ${k + 1} of ${nRuns}` : ''}</h2>
        {step > 0 && <button className="st-back-step" onClick={() => go(step - 1)}><Icon name="back" />Back</button>}
      </div>
      <div className="st-step-body">{body}</div>
      {step > 0 && <button className="st-linkbtn st-startover" onClick={startOver}>Start this practical again</button>}
    </>
  )

  const strip = stage === 'sight' ? 'eye' : stage === 'measure' ? 'closeup' : null
  return (
    <ExperimentShell code="Class 10 · Light" title="Light" tabs={tabs} tab="practical" onTab={onTab} panel={panel}>
      <div className={`st-circ st-lab st-light ${strip ? 'has-strip' : ''}`}>
        <div className="st-circ-board">
          <canvas ref={ref} className="st-fill" role="img" aria-label="The drawing board" style={{ cursor: stage === 'sight' ? 'grab' : 'default', touchAction: 'none' }}
            onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} />
          {stage === 'Aim' && <p className="st-endnote">How the finished sheet looks</p>}
          {stage === 'sight' && lined && <p className="st-endnote is-ok">P1 and P2 lined up</p>}
        </div>
        {strip && (
          <div className="st-light-strip">
            <span className="st-label">{strip === 'eye' ? 'What your eye sees' : closeup === 'shift' ? 'Close-up · ruler' : `Close-up · protractor on ${closeup}`}</span>
            {strip === 'eye' ? <EyeView sight={sight} /> : <Closeup spec={spec} dr={dr} what={closeup} />}
          </div>
        )}
      </div>
    </ExperimentShell>
  )
}

/** The outline traced in pencil round the block. */
function drawOutline(ctx, block, v) {
  ctx.setLineDash([]); ctx.beginPath()
  const faces = block.kind === 'slab' ? 4 : 3
  for (let f = 0; f < faces; f++) { const e = faceOf(block, f); if (f === 0) ctx.moveTo(...v.P(e.a)); ctx.lineTo(...v.P(e.b)) }
  ctx.closePath(); ctx.stroke()
}

/** The finished sheet: the outline, pin holes and rays, as in a practical notebook. */
function drawFinished(ctx, v, spec, block, done, demo) {
  ctx.strokeStyle = PENCIL; ctx.lineWidth = 1.1; drawOutline(ctx, block, v)
  if (demo) drawGlass(ctx, block, v)
  const i = done?.i ?? spec.angles[1]
  const [P1, P2] = firstPins(spec, i)
  const { O, d } = incident(spec, i)
  let P3 = done?.P3, P4 = done?.P4
  if (!P3 || !P4) {
    // a demonstration: the pins where a careful student would put them
    const t = truePath(spec, block, i)
    P3 = vec.add(t.exit, t.dir, PIN_GAPS.P3); P4 = vec.add(t.exit, t.dir, PIN_GAPS.P4)
  }
  const dr = drawing(spec, block, i, P3, P4)
  pencil(ctx, vec.add(O, spec.outward, 40), vec.add(O, spec.outward, -20), v, { dash: [5, 4] })
  pencil(ctx, vec.add(O, d, -95), O, v); arrowMid(ctx, vec.add(O, d, -95), O, v)
  pencil(ctx, O, dr.O2, v); arrowMid(ctx, O, dr.O2, v)
  pencil(ctx, dr.O2, vec.add(dr.O2, dr.em, 90), v); arrowMid(ctx, dr.O2, vec.add(dr.O2, dr.em, 90), v)
  pencil(ctx, vec.add(dr.O2, spec.exitOutward, 35), vec.add(dr.O2, spec.exitOutward, -20), v, { dash: [5, 4] })
  pencil(ctx, O, vec.add(O, d, 100), v, { dash: [2, 3] })
  for (const [n, p] of [['P1', P1], ['P2', P2], ['P3', P3], ['P4', P4]]) drawPin(ctx, p, n, v, { hole: !demo })
  ctx.fillStyle = INK; ctx.font = `600 12px ${SANS}`; ctx.textAlign = 'right'; ctx.textBaseline = 'bottom'; ctx.fillText('O', v.X(O[0]) - 5, v.Y(O[1]) - 3)
  ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillText('O′', v.X(dr.O2[0]) + 5, v.Y(dr.O2[1]) + 3)
}

