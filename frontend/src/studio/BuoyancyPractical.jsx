/**
 * VISIORA Studio — Practical tab of Floating and sinking: Archimedes' principle, as in the
 * Class 9 lab. Weigh an aluminium cube on a spring balance in air, then lower it right into an
 * overflow can of tap water and, after that, of very salty water. Each time read the balance
 * (to 0.05 N) and the water that spilled into the measuring cylinder (to 1 mL). The loss in
 * weight should equal the weight of liquid pushed aside: W = ρ·V·g.
 */
import React, { useEffect, useRef, useState } from 'react'
import { useCanvas } from '../components/motion/useCanvas'
import { BALANCE, G, LIQUIDS, SOLIDS } from '../engine/buoy'
import { Stars } from './CircuitBoard'
import { ExperimentShell, Group, Icon, Slider } from './Shell'
import { paintBench, useBalance } from './tankScene'

const L = 0.05
const STEPS = ['Aim', 'air', 'water', 'salt', 'Result', 'Viva']
const TITLES = { Aim: 'What we will find out', air: 'Weigh it in air', water: 'Lower it into tap water', salt: 'Now very salty water', Result: 'Your result', Viva: 'Check your understanding' }
const DONE_KEY = 'visiora.buoyancy.practical'
const UP = 0.2 // hook height with the cube hanging clear of the liquid (its bottom ~4 cm above it)
const ok = (typed, actual, tol) => typed !== '' && Number.isFinite(Number(typed)) && Math.abs(Number(typed) - actual) <= tol + 1e-9

const VIVA = [
  { q: 'Why must the overflow can be filled right up to its spout before you start?', options: ['So it looks full', 'So every bit of water the cube pushes aside spills into the cylinder and none is “used up” filling the can', 'To make the water cold', 'To keep the cube clean'], a: 1, why: 'Otherwise the first water pushed aside just raises the level in the can, and the cylinder catches too little.' },
  { q: 'Why does the balance read less when the cube is in water?', options: ['The cube gets lighter', 'The water pushes up on it (upthrust), so the spring holds up less', 'Water is heavy', 'The spring gets wet'], a: 1, why: 'Its mass and weight do not change; the upthrust shares the job of holding it up. That is the “apparent” loss in weight.' },
  { q: 'Why is the loss bigger in salty water?', options: ['Salt is sticky', 'Salty water is denser, so the same volume pushed aside weighs more', 'The cube absorbs salt', 'It isn’t really bigger'], a: 1, why: 'Upthrust = weight of liquid displaced = ρ·V·g. Same V, bigger ρ, bigger upthrust.' },
  { q: 'Why wait before reading the balance?', options: ['To be polite', 'The cube swings up and down on the spring after it moves, and the water takes a moment to finish spilling', 'The balance warms up', 'It is not needed'], a: 1, why: 'A reading taken while the pointer is still bouncing could be off by several divisions.' },
]

export default function BuoyancyPractical({ tabs, onTab }) {
  const [step, setStep] = useState(0)
  const stage = STEPS[step]
  const liquid = stage === 'salt' ? 'salt' : 'water'
  const bal = useBalance(L)
  const [hook, setHook] = useState(UP)
  const [typed, setTyped] = useState({ air: '', water: '', vWater: '', salt: '', vSalt: '' })
  const [checked, setChecked] = useState({})
  const [wrong, setWrong] = useState(0)
  const [early, setEarly] = useState(false) // Check pressed before the cube was in or the pointer still
  const [viva, setViva] = useState({})
  const [done, setDone] = useState(() => { try { return Number(localStorage.getItem(DONE_KEY)) || 0 } catch { return 0 } })
  // each stage starts with the cube hanging clear of a fresh, brim-full can
  useEffect(() => { bal.hang('aluminium', liquid, UP); setHook(UP); setEarly(false) }, [stage]) // eslint-disable-line react-hooks/exhaustive-deps
  const s = bal.sim.s
  const settled = bal.settled()
  const under = s ? Math.max(0, Math.min(L, -(s.hook - s.e - s.cord - L))) / L : 0
  const weight = SOLIDS.aluminium.rho * L ** 3 * G
  const truth = {
    air: weight,
    water: weight - LIQUIDS.water.rho * L ** 3 * G, vWater: L ** 3 * 1e6,
    salt: weight - LIQUIDS.salt.rho * L ** 3 * G, vSalt: L ** 3 * 1e6,
  }
  const tol = { air: BALANCE.leastCount, water: BALANCE.leastCount, salt: BALANCE.leastCount, vWater: 1, vSalt: 1 }
  const fieldOk = k => ok(typed[k], truth[k], tol[k])
  const check = keys => { setChecked(c => ({ ...c, ...Object.fromEntries(keys.map(k => [k, true])) })); if (!keys.every(fieldOk)) setWrong(w => w + 1) }
  const topRef = useRef(null)
  useEffect(() => { topRef.current?.closest('.st-panel-scroll')?.scrollTo({ top: 0 }) }, [step])
  const stars = (wrong === 0 ? 1 : 0) + (['air', 'water', 'salt'].every(k => checked[k]) ? 1 : 0) + 1
  const vivaDone = VIVA.every((_, i) => viva[i] != null)
  useEffect(() => { if (vivaDone && stars > done) { setDone(stars); try { localStorage.setItem(DONE_KEY, String(stars)) } catch { /* private mode */ } } }, [vivaDone, stars, done])

  const field = (k, label, unit) => (
    <label className="st-field" key={k}><span>{label}</span>
      <input className={`st-answer ${checked[k] ? (fieldOk(k) ? 'is-right' : 'is-wrong') : ''}`} value={typed[k]} inputMode="decimal" placeholder="?"
        onChange={e => { const v = e.target.value; setTyped(t => ({ ...t, [k]: v })); setChecked(c => ({ ...c, [k]: false })) }} /><em>{unit}</em>
    </label>
  )
  const lowerer = (
    <>
      <Slider label="Lower the balance" value={UP - hook} display={under >= 1 ? 'fully under' : `${Math.round(under * 100)} % under`} min={0} max={UP + 0.02} step={0.005} scale={['up', 'down']}
        onChange={d => { const h = UP - d; setHook(h); bal.setHook(h) }} />
      <p className={`st-callout ${settled ? 'is-ok' : ''}`}>{settled ? 'Settled: read the scales now.' : 'Wait: the pointer is still moving, or water is still spilling.'}</p>
    </>
  )

  let body
  if (stage === 'Aim') {
    body = (
      <>
        <p><b>Aim.</b> To show that when a solid is fully under water, its loss in weight equals the weight of water it pushes aside, in tap water and in very salty water.</p>
        <p><b>Apparatus.</b> A spring balance (0–5 N, reads to 0.05 N), a 5 cm aluminium cube on a thread, an overflow can, a 250 mL measuring cylinder (reads to 1 mL), tap water and very salty water, a stand.</p>
        <button className="st-btn st-btn-primary st-btn-wide" onClick={() => setStep(1)}>Start the practical</button>
      </>
    )
  } else if (stage === 'air') {
    body = (
      <>
        <p>The cube hangs in air. Read the balance close-up (top right): each small mark is 0.05 N.</p>
        <div className="st-form">{field('air', 'Weight in air', 'N')}</div>
        <button className="st-btn st-btn-secondary" onClick={() => check(['air'])}>Check</button>
        {checked.air && !fieldOk('air') && <p className="st-callout">Read where the pink pointer crosses the scale, to the nearest small mark.</p>}
        {checked.air && fieldOk('air') && <button className="st-btn st-btn-primary st-btn-wide" onClick={() => setStep(2)}>Next: tap water</button>}
      </>
    )
  } else if (stage === 'water' || stage === 'salt') {
    const [wk, vk] = stage === 'water' ? ['water', 'vWater'] : ['salt', 'vSalt']
    body = (
      <>
        <p>The overflow can is filled to the spout with {stage === 'water' ? 'tap water' : 'very salty water'}. Lower the cube until it is <b>fully under</b>, without touching the bottom.</p>
        {lowerer}
        <div className="st-form">{field(wk, 'Balance reading', 'N')}{field(vk, 'Water in the cylinder', 'mL')}</div>
        <button className="st-btn st-btn-secondary" onClick={() => { if (under >= 1 && settled) check([wk, vk]); else setEarly(true) }}>Check</button>
        {early && (under < 1 || !settled) && <p className="st-callout">{under < 1 ? 'Lower it further: the whole cube must be under the liquid.' : 'Wait until the pointer stops and the water stops spilling, then read.'}</p>}
        {checked[wk] && !(fieldOk(wk) && fieldOk(vk)) && <p className="st-callout">Read each close-up where the pink line crosses: balance to 0.05 N, cylinder to 1 mL.</p>}
        {checked[wk] && fieldOk(wk) && fieldOk(vk) && <button className="st-btn st-btn-primary st-btn-wide" onClick={() => setStep(step + 1)}>{stage === 'water' ? 'Next: very salty water' : 'See the result'}</button>}
      </>
    )
  } else if (stage === 'Result') {
    const W = Number(typed.air)
    const rows = [['Tap water', W - Number(typed.water), Number(typed.vWater), LIQUIDS.water.rho], ['Very salty water', W - Number(typed.salt), Number(typed.vSalt), LIQUIDS.salt.rho]]
    body = (
      <>
        <table className="st-table">
          <thead><tr><th>Liquid</th><th>Loss in weight</th><th>Liquid pushed aside</th><th>Its weight, ρVg</th></tr></thead>
          <tbody>{rows.map(([name, loss, v, rho]) => <tr key={name}><td>{name}</td><td className="st-num">{loss.toFixed(2)} N</td><td className="st-num">{v} mL</td><td className="st-num">{((rho * v * 1e-6) * G).toFixed(2)} N</td></tr>)}</tbody>
        </table>
        <p className="st-truth">In both liquids the <b>loss in weight equals the weight of liquid pushed aside</b>, to within the balance’s 0.05 N. That is Archimedes’ principle. The salty water, being denser, pushed up harder.</p>
        <Group label="Sources of error">
          <ul className="st-howto">
            <li>The balance reads to 0.05 N, about 4 % of the 1.2 N loss.</li>
            <li>Drops left on the spout or the cylinder’s sides make the volume read a little low.</li>
            <li>If the cube touches the can’s floor, the floor holds some of its weight and the reading is wrong.</li>
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
            {v.options.map((o, j) => <button key={o} className={`st-choice ${viva[i] == null ? '' : j === v.a ? 'is-right' : viva[i] === j ? 'is-wrong' : ''}`} disabled={viva[i] != null} onClick={() => setViva(x => ({ ...x, [i]: j }))}>{o}</button>)}
            {viva[i] != null && <p className="st-muted st-small">{v.why}</p>}
          </div>
        ))}
        {vivaDone && (<><p className="st-done"><Icon name="check" />Practical complete</p><Stars n={Math.max(1, stars)} /><p className="st-muted st-small">Stars: right first time · every reading checked · finished.</p></>)}
      </>
    )
  }

  const panel = (
    <>
      <div className="st-stephead" ref={topRef}>
        <div className="st-stephead-top"><span className="st-label">Archimedes’ principle{done ? ' · completed' : ''}</span><span className="st-num">Step {step + 1} of {STEPS.length}</span></div>
        <div className="st-progress" aria-hidden="true">{STEPS.map((x, i) => <span key={x} className={i < step ? 'is-done' : i === step ? 'is-on' : ''} />)}</div>
        <h2 className="st-step-title">{TITLES[stage]}</h2>
        {step > 0 && <button className="st-back-step" onClick={() => setStep(step - 1)}><Icon name="back" />Back</button>}
      </div>
      <div className="st-step-body">{body}</div>
    </>
  )
  return (
    <ExperimentShell code="Class 9 · Gravitation" title="Floating and sinking" tabs={tabs} tab="practical" onTab={onTab} panel={panel}>
      <div className="st-circ is-bare"><div><Bench bal={bal} liquid={liquid} /></div></div>
    </ExperimentShell>
  )
}

function Bench({ bal, liquid }) {
  const s = bal.sim.s
  const { ref } = useCanvas((ctx, w, h) => { if (s) paintBench(ctx, w, h, { s, overflow: bal.sim.overflow, liquidColour: LIQUIDS[liquid].colour }) }, [s, s?.e, s?.hook, bal.sim.overflow, liquid])
  return <canvas ref={ref} className="st-fill" role="img" aria-label="A spring balance holding an aluminium cube over an overflow can, with a measuring cylinder" />
}
