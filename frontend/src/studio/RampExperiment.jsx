/**
 * VISIORA Studio — Friction ramp (Class 9: Force and laws of motion · friction).
 * Explore (first): three guided ideas (Predict → Try → Explain): heavy and light blocks slip
 * at the same angle, a sliding block keeps going below its slipping angle, and a flicked block
 * stops on a gentle slope. Then free play: any block, any mass, set the angle or tilt slowly,
 * with the weight split into its parts, the normal force and friction drawn.
 * Practical: find μs from the angle of slip and μk from the time to slide 1 m.
 * Physics: engine/ramp.js (static and sliding friction on a slope, exact stops).
 */
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useCanvas } from '../components/motion/useCanvas'
import { BLOCKS, rampForces } from '../engine/ramp'
import { RAMP_LESSONS, runRamps } from '../engine/rampLessons'
import { rememberExperiment } from './catalog'
import { IdeaChat, IdeaHead, IdeaList, IdeaPredict, IdeaVerdict, ideaStore, nextIdea, useIdeaChat } from './IdeaParts'
import RampPractical from './RampPractical'
import { paintRamps, useRamps } from './rampScene'
import { ExperimentShell, Group, Icon, Slider, Toggle } from './Shell'

export const TABS = [['explore', 'Explore'], ['practical', 'Practical']]
const store = ideaStore('visiora.ramp.ideas')
const CODE = 'Class 9 · Force and laws of motion'
const TITLE = 'Friction ramp'
const deg = r => (r * 180) / Math.PI

function Ramps({ sim, arrows = true, label }) {
  const { ref } = useCanvas((ctx, w, h) => paintRamps(ctx, w, h, { blocks: sim.blocks, arrows }), [sim, sim.t, arrows])
  return <canvas ref={ref} className="st-fill" role="img" aria-label={label} />
}

function FreePlay({ tabs, onTab, onIdeas }) {
  const [kind, setKind] = useState('wood')
  const [m, setM] = useState(0.5)
  const [angle, setAngle] = useState(15)
  const [arrows, setArrows] = useState(true)
  const ctrl = useRef({ angle: 15, auto: null })
  const blocks = useMemo(() => [{ kind, m }], [kind, m])
  // the ramp follows the slider, or rises 2° a second by itself until the block slips
  const program = (t, b) => {
    const c = ctrl.current
    if (c.auto) {
      if (b.slipAngle != null || c.angle >= 60) { c.auto = null; return c.angle }
      c.angle = Math.min(60, c.auto.from + 2 * (t - c.auto.t0))
    }
    return c.angle
  }
  const run = useRamps({ blocks, program, T: 1e6, until: s => !ctrl.current.auto && s.blocks.every(b => !b.sliding) })
  const b = run.sim.blocks[0]
  const shownAngle = ctrl.current.auto ? b.angle : angle
  const go = () => { if (!run.sim.running) run.start(false) }
  useEffect(() => { ctrl.current.angle = angle; go() }, [angle]) // eslint-disable-line react-hooks/exhaustive-deps
  const tiltSlowly = () => { ctrl.current.auto = { from: ctrl.current.angle, t0: run.sim.t }; go() }
  const backToTop = () => { ctrl.current.auto = null; ctrl.current.angle = angle; run.reset() }
  // after an automatic tilt, leave the slider where the ramp got to
  useEffect(() => { if (!run.sim.running && Math.abs(ctrl.current.angle - angle) > 0.05) setAngle(Math.round(ctrl.current.angle * 10) / 10) }, [run.sim.running]) // eslint-disable-line react-hooks/exhaustive-deps
  const f = rampForces(b)
  const B = BLOCKS[kind]
  const panel = (
    <>
      <button className="st-btn st-btn-secondary st-btn-wide" onClick={onIdeas}><Icon name="target" />Guided ideas: predict, try, explain</button>
      <Group label="Block">
        <div className="st-chipset">{Object.entries(BLOCKS).map(([id, x]) => <button key={id} className={`st-chip ${id === kind ? 'is-on' : ''}`} onClick={() => { setKind(id); ctrl.current.auto = null }}>{x.label}</button>)}</div>
      </Group>
      <Slider label="Mass" value={m} display={`${m.toFixed(1)} kg`} min={0.1} max={2} step={0.1} scale={['0.1 kg', '2 kg']} onChange={setM} />
      <Slider label="Ramp angle" value={shownAngle} display={`${shownAngle.toFixed(1)}°`} min={0} max={60} step={0.5} scale={['0°', '60°']} onChange={v => { ctrl.current.auto = null; setAngle(v) }} />
      <div className="st-row">
        <button className="st-btn st-btn-primary" onClick={tiltSlowly} disabled={!!ctrl.current.auto || b.sliding}><Icon name="play" />Tilt slowly</button>
        <button className="st-btn st-btn-secondary" onClick={backToTop}><Icon name="reset" />Back to the top</button>
      </div>
      <Toggle label="Force arrows" checked={arrows} onChange={setArrows} />
      <div className="st-idea-readings">
        <div><span>pull down the slope</span><b className="st-num">{f.along.toFixed(2)} N</b></div>
        <div><span>friction can grip up to</span><b className="st-num">{f.grip.toFixed(2)} N</b></div>
        <div><span>tan θ</span><b className="st-num">{Math.tan((shownAngle * Math.PI) / 180).toFixed(2)}</b></div>
        <div><span>μs · μk</span><b className="st-num">{B.mus.toFixed(2)} · {B.muk.toFixed(2)}</b></div>
      </div>
      <p className="st-callout">{b.atBottom ? <>At the bottom. Press <b>Back to the top</b> to try again.</>
        : b.sliding ? <>Sliding: friction has dropped to μk × N = <b>{(-f.friction).toFixed(2)} N</b>. a = g (sin θ − μk cos θ) = <b>{(f.net / b.m).toFixed(2)} m/s²</b>{f.net < 0 ? ', slowing' : ''}.</>
          : <>Held still: friction matches the pull, <b>{f.along.toFixed(2)} N</b>. It slips when tan θ passes μs, at <b>{deg(Math.atan(B.mus)).toFixed(1)}°</b>, whatever the mass.</>}</p>
    </>
  )
  return (
    <ExperimentShell code={CODE} title={TITLE} tabs={tabs} tab="explore" onTab={onTab} panel={panel}>
      <div className="st-circ is-bare"><div><Ramps sim={run.sim} arrows={arrows} label={`A ${m} kg block, ${B.label.toLowerCase()}, on a ramp at ${shownAngle.toFixed(0)}°`} /></div></div>
    </ExperimentShell>
  )
}

function Idea({ index, done, tabs, onTab, onFree, onFinish, onPick }) {
  const lesson = RAMP_LESSONS[index]
  const [stage, setStage] = useState('predict')
  const [pick, setPick] = useState(null)
  const talk = useIdeaChat(lesson.explain, onFinish)
  const truth = useMemo(() => lesson.outcome(lesson), [lesson])
  const final = useMemo(() => runRamps(lesson), [lesson])
  const run = useRamps({ blocks: lesson.blocks, program: lesson.program, T: lesson.T })
  const topRef = useRef(null)
  useEffect(() => { topRef.current?.closest('.st-panel-scroll')?.scrollTo({ top: 0 }) }, [stage])
  const nextIndex = RAMP_LESSONS.findIndex((l, i) => i > index && !done[l.id])
  const finished = run.sim.done
  const what = b => (b.atBottom ? 'reached the bottom' : b.sliding ? `sliding, ${b.v.toFixed(2)} m/s` : b.s > 0.1005 ? `stopped after ${((b.s - 0.1) * 100).toFixed(0)} cm` : 'held still')
  let body
  if (stage === 'predict') {
    body = <IdeaPredict question={lesson.question} options={lesson.options} pick={pick} onPick={setPick} note={lesson.note} go="Go" onGo={() => { setStage('try'); run.start() }} />
  } else if (stage === 'try') {
    body = (
      <>
        {finished ? <IdeaVerdict right={pick === truth} told={lesson.told[truth]} /> : <p className="st-idea-watch">Watch…</p>}
        <table className="st-table">
          <thead><tr><th /><th>slipped at</th><th>in the end</th></tr></thead>
          <tbody>{lesson.blocks.map((spec, i) => <tr key={i}><td>{spec.m} kg</td><td className="st-num">{finished && final[i].slipAngle != null ? `${final[i].slipAngle.toFixed(1)}°` : '—'}</td><td>{finished ? what(final[i]) : '—'}</td></tr>)}</tbody>
        </table>
        <div className="st-row">
          <button className="st-btn st-btn-secondary" onClick={() => run.start()} disabled={run.sim.running}><Icon name="reset" />Again</button>
          <button className="st-btn st-btn-primary st-idea-go" disabled={!finished} onClick={() => { setStage('explain'); talk.start() }}>Next: why?</button>
        </div>
      </>
    )
  } else {
    body = <IdeaChat steps={lesson.explain} talk={talk} index={index} title={lesson.title} nextTitle={RAMP_LESSONS[nextIndex]?.title} onNext={() => onPick(nextIndex)} onFree={onFree} />
  }
  const panel = (
    <>
      <IdeaHead index={index} count={RAMP_LESSONS.length} title={lesson.title} stage={stage} onFree={onFree} headRef={topRef} />
      <div className="st-step-body">{body}</div>
      <IdeaList lessons={RAMP_LESSONS} done={done} index={index} onPick={onPick} />
    </>
  )
  return (
    <ExperimentShell code={CODE} title={TITLE} tabs={tabs} tab="explore" onTab={onTab} panel={panel}>
      <div className="st-circ is-bare"><div><Ramps sim={run.sim} arrows={stage !== 'predict'} label={lesson.question} /></div></div>
    </ExperimentShell>
  )
}

function Explore({ tabs, onTab }) {
  const [done, setDone] = useState(store.load)
  const [mode, setMode] = useState(() => (nextIdea(RAMP_LESSONS, store.load()) != null ? 'ideas' : 'free'))
  const [index, setIndex] = useState(() => nextIdea(RAMP_LESSONS, store.load()) ?? 0)
  if (mode === 'free') return <FreePlay tabs={tabs} onTab={onTab} onIdeas={() => setMode('ideas')} />
  return <Idea key={index} index={index} done={done} tabs={tabs} onTab={onTab} onFree={() => setMode('free')} onPick={setIndex}
    onFinish={() => { const next = { ...done, [RAMP_LESSONS[index].id]: true }; setDone(next); store.save(next) }} />
}

export default function RampExperiment() {
  const [tab, setTab] = useState('explore')
  useEffect(() => { rememberExperiment('ramp') }, [])
  return (
    <>
      <div hidden={tab !== 'explore'}><Explore tabs={TABS} onTab={setTab} /></div>
      <div hidden={tab !== 'practical'}><RampPractical tabs={TABS} onTab={setTab} /></div>
    </>
  )
}

