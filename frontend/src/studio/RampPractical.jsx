/**
 * VISIORA Studio — Practical tab of the Friction ramp: μs and μk for wood on wood.
 * Part 1, the angle of slip: tilt the ramp slowly until the block just slips, read the
 * protractor (to 1°), three times. Then μs = tan θ. Part 2, sliding: set the ramp at 35°,
 * release the block from rest and time it to a light gate 1.00 m down, three times. Then
 * a = 2s ÷ t² and, from a = g (sin θ − μk cos θ), μk = tan θ − a ÷ (g cos θ).
 * The grip differs a little from try to try, as on a real bench, so the repeats scatter.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { BLOCKS, G, slideTime } from '../engine/ramp'
import { useCanvas } from '../components/motion/useCanvas'
import { Stars } from './CircuitBoard'
import { paintRamps, useRamps } from './rampScene'
import { ExperimentShell, Group, Icon } from './Shell'

const KIND = 'wood'
const SLIDE_ANGLE = 35
const DIST = 1.0 // m from the start to the light gate
const TRIES = 3
const DONE_KEY = 'visiora.ramp.practical'
const STEPS = ['Aim', 'Slip', 'Slide', 'Calculate', 'Result', 'Viva']
const TITLES = { Aim: 'What we will find out', Slip: 'Part 1: the angle of slip', Slide: 'Part 2: time the slide', Calculate: 'Work out μs and μk', Result: 'Your result', Viva: 'Check your understanding' }
const ok = (typed, actual, rel, abs = 0) => typed !== '' && Number.isFinite(Number(typed)) && Math.abs(Number(typed) - actual) <= rel * Math.abs(actual) + abs
const rad = d => (d * Math.PI) / 180
const mean = xs => xs.reduce((a, b) => a + b, 0) / xs.length

const VIVA = [
  { q: 'Why tilt the ramp slowly?', options: ['To save time', 'So you read the angle at the very moment it slips, not a degree or two after', 'So the block does not fall off', 'Because friction needs time to grow'], a: 1, why: 'Tilting fast overshoots: by the time you see it move, the ramp is already steeper than the angle of slip.' },
  { q: 'Why does μs = tan θ at the angle of slip?', options: ['It is a rule to learn', 'At that angle the pull down the slope, m g sin θ, just equals the most friction can grip, μs m g cos θ', 'Because the block is not moving', 'Because tan is the steepness'], a: 1, why: 'Divide both sides by m g cos θ and you get μs = tan θ. The mass cancels, so any block of the same material gives the same angle.' },
  { q: 'Why repeat each part three times?', options: ['It is the rule', 'The grip varies a little from spot to spot and try to try; the mean is more reliable than any one reading', 'To get tired', 'To use the timer'], a: 1, why: 'Your three angles were not all the same. Real surfaces are not perfectly even.' },
  { q: 'Your μk came out smaller than μs. What does that mean?', options: ['A mistake', 'It takes more force to start the block sliding than to keep it sliding', 'The ramp got smoother', 'The block got lighter'], a: 1, why: 'μk < μs for almost every pair of surfaces. It is why a block that has slipped keeps sliding even if you lower the ramp a little.' },
]

export default function RampPractical({ tabs, onTab }) {
  const [step, setStep] = useState(0)
  const [angles, setAngles] = useState([]) // protractor readings, whole degrees
  const [times, setTimes] = useState([]) // gate times, to 1 ms
  const [typed, setTyped] = useState({ th: '', mus: '', t: '', a: '', muk: '' })
  const [checked, setChecked] = useState(false)
  const [viva, setViva] = useState({})
  const [wrong, setWrong] = useState(0)
  const [done, setDone] = useState(() => { try { return Number(localStorage.getItem(DONE_KEY)) || 0 } catch { return 0 } })
  const stage = STEPS[step]
  const sliding = stage === 'Slide'
  // which try this is: the grip differs a little from one try to the next
  const trial = sliding ? 10 + times.length + 1 : angles.length + 1
  const blocks = useMemo(() => [{ kind: KIND, m: 0.5, trial }], [trial])
  const program = sliding ? () => SLIDE_ANGLE : (t, b) => (b.slipAngle == null ? Math.min(45, 15 + 2 * t) : b.slipAngle)
  const until = sliding ? s => s.blocks[0].s - 0.1 >= DIST || s.blocks[0].atBottom : s => s.blocks[0].slipAngle != null && (s.blocks[0].s > 0.25 || s.blocks[0].atBottom)
  const run = useRamps({ blocks, program, T: 40, until })
  const b = run.sim.blocks[0]
  const reading = !sliding && b.slipAngle != null ? Math.round(b.slipAngle) : null
  const gateTime = useMemo(() => Math.round(slideTime(KIND, SLIDE_ANGLE, { trial, dist: DIST }) * 1000) / 1000, [trial])
  const passed = sliding && b.s - 0.1 >= DIST
  const timer = sliding ? (passed ? gateTime : run.sim.t) : null
  const thMean = angles.length ? mean(angles) : 0, tMean = times.length ? mean(times) : 0
  const want = { th: thMean, mus: Math.tan(rad(thMean)), t: tMean, a: tMean ? (2 * DIST) / tMean ** 2 : 0 }
  want.muk = Math.tan(rad(SLIDE_ANGLE)) - want.a / (G * Math.cos(rad(SLIDE_ANGLE)))
  const fOk = { th: ok(typed.th, want.th, 0, 0.051), mus: ok(typed.mus, want.mus, 0.015, 0.005), t: ok(typed.t, want.t, 0.002, 0.0011), a: ok(typed.a, want.a, 0.01, 0.005), muk: ok(typed.muk, want.muk, 0.04, 0.006) }
  const allOk = Object.values(fOk).every(Boolean)
  const stars = (wrong === 0 ? 1 : 0) + (angles.length + times.length >= 2 * TRIES ? 1 : 0) + (allOk && Math.abs(Number(typed.muk) - BLOCKS[KIND].muk) / BLOCKS[KIND].muk < 0.1 ? 1 : 0)
  const vivaDone = VIVA.every((_, i) => viva[i] != null)
  useEffect(() => { if (vivaDone && stars > done) { setDone(stars); try { localStorage.setItem(DONE_KEY, String(stars)) } catch { /* private mode */ } } }, [vivaDone, stars, done])
  const topRef = useRef(null)
  useEffect(() => { topRef.current?.closest('.st-panel-scroll')?.scrollTo({ top: 0 }) }, [step])
  const field = (key, label, unit) => (
    <label className="st-field"><span>{label}</span>
      <input className={`st-answer ${checked ? (fOk[key] ? 'is-right' : 'is-wrong') : ''}`} value={typed[key]} inputMode="decimal" placeholder="?" onChange={e => { setTyped(x => ({ ...x, [key]: e.target.value })); setChecked(false) }} />{unit && <em>{unit}</em>}
    </label>
  )

  let body
  if (stage === 'Aim') {
    body = (
      <>
        <p><b>Aim.</b> To find the coefficients of static and sliding friction between a wooden block and a wooden ramp.</p>
        <p><b>Apparatus.</b> A hinged wooden ramp with a protractor, a 0.5 kg wooden block, a stand, and a light gate with a timer reading to 1 ms.</p>
        <p className="st-muted">Part 1 uses only the angle. Part 2 uses the time to slide 1.00 m.</p>
        <button className="st-btn st-btn-primary st-btn-wide" onClick={() => setStep(1)}>Start the practical</button>
      </>
    )
  } else if (stage === 'Slip') {
    body = (
      <>
        <p>Tilt the ramp up slowly from 15°. Read the protractor the moment the block starts to slip.</p>
        <div className="st-row">
          <button className="st-btn st-btn-primary" onClick={() => run.start()} disabled={run.sim.running || angles.length >= TRIES}><Icon name="play" />{run.sim.t > 0 ? 'Try again' : 'Tilt slowly'}</button>
          <button className="st-btn st-btn-secondary" disabled={reading == null || angles.length >= TRIES} onClick={() => { setAngles(a => [...a, reading]); run.reset() }}>Record {reading != null ? `${reading}°` : ''}</button>
        </div>
        <div className="st-idea-readings"><div><span>protractor</span><b className="st-num">{b.angle.toFixed(0)}°</b></div><div><span>tries</span><b className="st-num">{angles.length} of {TRIES}</b></div></div>
        {angles.length > 0 && <p className="st-num">θ = {angles.map(a => `${a}°`).join(', ')}</p>}
        {angles.length >= TRIES && <button className="st-btn st-btn-primary st-btn-wide" onClick={() => setStep(2)}>Next: time the slide</button>}
      </>
    )
  } else if (stage === 'Slide') {
    body = (
      <>
        <p>The ramp is set at {SLIDE_ANGLE}°. Let go of the block from rest; the timer stops when it reaches the light gate {DIST.toFixed(2)} m down.</p>
        <div className="st-row">
          <button className="st-btn st-btn-primary" onClick={() => run.start()} disabled={run.sim.running || times.length >= TRIES}><Icon name="play" />Let go</button>
          <button className="st-btn st-btn-secondary" disabled={!passed || times.length >= TRIES} onClick={() => { setTimes(t => [...t, gateTime]); run.reset() }}>Record {passed ? `${gateTime.toFixed(3)} s` : ''}</button>
        </div>
        <div className="st-idea-readings"><div><span>timer</span><b className="st-num">{timer.toFixed(3)} s</b></div><div><span>tries</span><b className="st-num">{times.length} of {TRIES}</b></div></div>
        {times.length > 0 && <p className="st-num">t = {times.map(t => `${t.toFixed(3)} s`).join(', ')}</p>}
        {times.length >= TRIES && <button className="st-btn st-btn-primary st-btn-wide" onClick={() => setStep(3)}>Next: work it out</button>}
      </>
    )
  } else if (stage === 'Calculate') {
    body = (
      <>
        <p className="st-num st-small">θ = {angles.map(a => `${a}°`).join(', ')} · t = {times.map(t => t.toFixed(3)).join(', ')} s</p>
        <Group label="Part 1">
          {field('th', 'Mean angle of slip θ', '°')}
          {field('mus', 'μs = tan θ', '')}
        </Group>
        <Group label={`Part 2 (θ = ${SLIDE_ANGLE}°, s = ${DIST.toFixed(2)} m)`}>
          {field('t', 'Mean time t', 's')}
          {field('a', 'a = 2s ÷ t²', 'm/s²')}
          {field('muk', 'μk = tan θ − a ÷ (g cos θ)', '')}
        </Group>
        <p className="st-muted st-small">tan {SLIDE_ANGLE}° = {Math.tan(rad(SLIDE_ANGLE)).toFixed(3)}, cos {SLIDE_ANGLE}° = {Math.cos(rad(SLIDE_ANGLE)).toFixed(3)}, g = 9.8 m/s².</p>
        <button className="st-btn st-btn-secondary" onClick={() => { setChecked(true); if (!allOk) setWrong(w => w + 1) }}>Check my working</button>
        {checked && !allOk && <p className="st-callout">Some are off (marked red). Means to 2 decimal places; μ values to 3.</p>}
        {checked && allOk && <button className="st-btn st-btn-primary st-btn-wide" onClick={() => setStep(4)}>See the result</button>}
      </>
    )
  } else if (stage === 'Result') {
    const T = BLOCKS[KIND], es = Math.abs(Number(typed.mus) - T.mus) / T.mus * 100, ek = Math.abs(Number(typed.muk) - T.muk) / T.muk * 100
    body = (
      <>
        <p className="st-truth">You found <b>μs = {Number(typed.mus).toFixed(2)}</b> and <b>μk = {Number(typed.muk).toFixed(2)}</b>. For wood on wood they really are {T.mus.toFixed(2)} and {T.muk.toFixed(2)}: {es.toFixed(0)} % and {ek.toFixed(0)} % out.</p>
        <p>μk is smaller than μs: once something is sliding, friction holds it back less.</p>
        <Group label="Sources of error">
          <ul className="st-howto">
            <li>The protractor reads to 1°; near 24° that is about 4 % in tan θ.</li>
            <li>The grip is not the same all along the ramp, so the angle and times scatter.</li>
            <li>Even a slow tilt overshoots a little before you see the block move.</li>
          </ul>
        </Group>
        <button className="st-btn st-btn-primary" onClick={() => setStep(5)}>Viva questions</button>
      </>
    )
  } else {
    body = (
      <>
        {VIVA.map((v, i) => (
          <div key={v.q} className="st-viva">
            <p><b>{i + 1}.</b> {v.q}</p>
            {v.options.map((o, j) => <button key={o} className={`st-choice ${viva[i] == null ? '' : j === v.a ? 'is-right' : viva[i] === j ? 'is-wrong' : ''}`} disabled={viva[i] != null} onClick={() => setViva(s => ({ ...s, [i]: j }))}>{o}</button>)}
            {viva[i] != null && <p className="st-muted st-small">{v.why}</p>}
          </div>
        ))}
        {vivaDone && (<><p className="st-done"><Icon name="check" />Practical complete</p><Stars n={Math.max(1, stars)} /><p className="st-muted st-small">Stars: right first time · all six tries · μk within 10 %.</p></>)}
      </>
    )
  }

  const panel = (
    <>
      <div className="st-stephead" ref={topRef}>
        <div className="st-stephead-top"><span className="st-label">Friction on a ramp{done ? ' · completed' : ''}</span><span className="st-num">Step {step + 1} of {STEPS.length}</span></div>
        <div className="st-progress" aria-hidden="true">{STEPS.map((s, i) => <span key={s} className={i < step ? 'is-done' : i === step ? 'is-on' : ''} />)}</div>
        <h2 className="st-step-title">{TITLES[stage]}</h2>
        {step > 0 && <button className="st-back-step" onClick={() => setStep(step - 1)}><Icon name="back" />Back</button>}
      </div>
      <div className="st-step-body">{body}</div>
    </>
  )
  return (
    <ExperimentShell code="Class 9 · Force and laws of motion" title="Friction ramp" tabs={tabs} tab="practical" onTab={onTab} panel={panel}>
      <div className="st-circ is-bare"><div><RampCanvas sim={run.sim} gate={sliding ? DIST : null} /></div></div>
    </ExperimentShell>
  )
}

function RampCanvas({ sim, gate }) {
  const { ref } = useCanvas((ctx, w, h) => paintRamps(ctx, w, h, { blocks: sim.blocks, arrows: false, gate }), [sim, sim.t, gate])
  return <canvas ref={ref} className="st-fill" role="img" aria-label="A wooden block on a hinged ramp with a protractor" />
}
