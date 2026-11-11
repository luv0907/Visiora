/**
 * VISIORA Studio — Push a box (Class 9: Force and laws of motion).
 * Explore (first): three guided ideas (Predict → Try → Explain): a push friction can hold,
 * balanced forces on a sliding box, and the same push on twice the mass. Then free play: any
 * floor, any mass, change the push while it moves or let go, with force arrows and a live
 * speed–time graph. Practical: find the coefficient of friction with a spring balance.
 * Physics: engine/forces.js (static and sliding friction, exact stops) and engine/pull.js.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useCanvas } from '../components/motion/useCanvas'
import { G, SURFACES } from '../engine/forces'
import { PUSH_LESSONS, runLanes, surface } from '../engine/pushLessons'
import { laneForces, paintLanes, useLanes } from './boxScene'
import { rememberExperiment } from './catalog'
import FrictionPractical from './FrictionPractical'
import { IdeaChat, IdeaHead, IdeaList, IdeaPredict, IdeaVerdict, ideaStore, nextIdea, useIdeaChat } from './IdeaParts'
import { ExperimentShell, Group, Icon, Slider, Toggle } from './Shell'

export const TABS = [['explore', 'Explore'], ['practical', 'Practical']]
const store = ideaStore('visiora.force.ideas')
const n = (v, d = 1) => `${v < -0.5 * 10 ** -d ? '−' : ''}${Math.abs(v).toFixed(d)}`
const CODE = 'Class 9 · Force and laws of motion'
const TITLE = 'Push a box'

function Lanes({ sim, lanes, pushRef, arrows = true, graph = false, label }) {
  const forces = laneForces(sim, lanes, pushRef)
  const { ref } = useCanvas((ctx, w, h) => paintLanes(ctx, w, h, { sim, lanes, forces, arrows, graph }), [sim, sim.t, lanes, arrows, graph, pushRef?.current])
  return <canvas ref={ref} className="st-fill" role="img" aria-label={label} />
}

function FreePlay({ tabs, onTab, onIdeas }) {
  const [floor, setFloor] = useState('wood')
  const [m, setM] = useState(10)
  const [push, setPush] = useState(40)
  const [arrows, setArrows] = useState(true)
  const pushRef = useRef(push)
  pushRef.current = push
  const lanes = useMemo(() => [{ m, surface: floor, F: 0 }], [m, floor])
  const { sim, start, pause, reset } = useLanes({ lanes, pushRef })
  const f = laneForces(sim, lanes, pushRef)[0]
  const S = surface(floor)
  const panel = (
    <>
      <button className="st-btn st-btn-secondary st-btn-wide" onClick={onIdeas}><Icon name="target" />Guided ideas: predict, try, explain</button>
      <Group label="Floor">
        <div className="st-chipset">{SURFACES.map(s => <button key={s.id} className={`st-chip ${s.id === floor ? 'is-on' : ''}`} onClick={() => setFloor(s.id)}>{s.label}</button>)}</div>
      </Group>
      <Slider label="Mass of the box" value={m} display={`${m} kg`} min={1} max={40} step={1} scale={['1 kg', '40 kg']} onChange={setM} />
      <Slider label="Your push" value={push} display={`${push} N`} min={0} max={200} step={1} scale={['0', '200 N']} onChange={setPush} />
      <div className="st-row">
        {sim.running
          ? <button className="st-btn st-btn-primary" onClick={pause}><Icon name="pause" />Pause</button>
          : <button className="st-btn st-btn-primary" onClick={() => start()}><Icon name="play" />{sim.t > 0 ? 'Carry on' : 'Start'}</button>}
        <button className="st-btn st-btn-secondary" onClick={() => setPush(0)} disabled={push === 0}>Let go</button>
        <button className="st-btn st-btn-secondary" onClick={reset}><Icon name="reset" />Reset</button>
      </div>
      <p className="st-muted st-small">Change the push while it moves.</p>
      <Toggle label="Force arrows" checked={arrows} onChange={setArrows} />
      <div className="st-idea-readings">
        <div><span>friction can grip up to</span><b className="st-num">{(S.mus * m * G).toFixed(1)} N</b></div>
        <div><span>sliding friction</span><b className="st-num">{(S.muk * m * G).toFixed(1)} N</b></div>
        <div><span>net force</span><b className="st-num">{n(f.net)} N</b></div>
        <div><span>acceleration</span><b className="st-num">{n(f.a, 2)} m/s²</b></div>
      </div>
      <p className="st-callout">{!f.moving
        ? (push === 0 ? <>No push, no motion.</> : <>Friction grips back with <b>{push} N</b>, exactly your push, so the net force is 0. Push past <b>{(S.mus * m * G).toFixed(1)} N</b> to get it going.</>)
        : Math.abs(f.net) < 0.05 ? <>Forces balance, so the speed stays the same. Moving, but not speeding up.</>
          : <>a = net force ÷ mass = {n(f.net)} ÷ {m} = <b>{n(f.a, 2)} m/s²</b>{f.a < 0 ? ', slowing down' : ''}.</>}</p>
    </>
  )
  return (
    <ExperimentShell code={CODE} title={TITLE} tabs={tabs} tab="explore" onTab={onTab} panel={panel}>
      <div className="st-circ is-bare"><div><Lanes sim={sim} lanes={lanes} pushRef={pushRef} arrows={arrows} graph label={`A ${m} kg box on ${S.label.toLowerCase()}, pushed with ${push} N`} /></div></div>
    </ExperimentShell>
  )
}

function Idea({ index, done, tabs, onTab, onFree, onFinish, onPick }) {
  const lesson = PUSH_LESSONS[index]
  const [stage, setStage] = useState('predict')
  const [pick, setPick] = useState(null)
  const talk = useIdeaChat(lesson.explain, onFinish)
  const truth = useMemo(() => lesson.outcome(lesson), [lesson])
  const final = useMemo(() => runLanes(lesson.lanes, lesson.T), [lesson])
  // before the prediction the boxes wait with no push on them
  const idle = useMemo(() => lesson.lanes.map(l => ({ ...l, F: 0, v0: 0 })), [lesson])
  const live = useLanes({ lanes: lesson.lanes, T: lesson.T })
  const still = useLanes({ lanes: idle })
  const run = stage === 'predict' ? still : live
  const topRef = useRef(null)
  useEffect(() => { topRef.current?.closest('.st-panel-scroll')?.scrollTo({ top: 0 }) }, [stage])
  const nextIndex = PUSH_LESSONS.findIndex((l, i) => i > index && !done[l.id])
  const finished = live.sim.done
  let body
  if (stage === 'predict') {
    body = <IdeaPredict question={lesson.question} options={lesson.options} pick={pick} onPick={setPick} note={lesson.note} go="Push" onGo={() => { setStage('try'); live.start(true) }} />
  } else if (stage === 'try') {
    body = (
      <>
        {finished ? <IdeaVerdict right={pick === truth} told={lesson.told[truth]} /> : <p className="st-idea-watch">Pushing for {lesson.T} s…</p>}
        <table className="st-table">
          <thead><tr><th /><th>speed</th><th>moved</th></tr></thead>
          <tbody>{lesson.lanes.map((l, i) => <tr key={i}><td>{l.m} kg, {surface(l.surface).label.toLowerCase()}</td><td className="st-num">{finished ? `${final[i].v.toFixed(2)} m/s` : '—'}</td><td className="st-num">{finished ? `${final[i].x.toFixed(2)} m` : '—'}</td></tr>)}</tbody>
        </table>
        <div className="st-row">
          <button className="st-btn st-btn-secondary" onClick={() => live.start(true)} disabled={live.sim.running}><Icon name="reset" />Push again</button>
          <button className="st-btn st-btn-primary st-idea-go" disabled={!finished} onClick={() => { setStage('explain'); talk.start() }}>Next: why?</button>
        </div>
      </>
    )
  } else {
    body = <IdeaChat steps={lesson.explain} talk={talk} index={index} title={lesson.title} nextTitle={PUSH_LESSONS[nextIndex]?.title} onNext={() => onPick(nextIndex)} onFree={onFree} />
  }
  const panel = (
    <>
      <IdeaHead index={index} count={PUSH_LESSONS.length} title={lesson.title} stage={stage} onFree={onFree} headRef={topRef} />
      <div className="st-step-body">{body}</div>
      <IdeaList lessons={PUSH_LESSONS} done={done} index={index} onPick={onPick} />
    </>
  )
  return (
    <ExperimentShell code={CODE} title={TITLE} tabs={tabs} tab="explore" onTab={onTab} panel={panel}>
      <div className="st-circ is-bare"><div><Lanes sim={run.sim} lanes={stage === 'predict' ? idle : lesson.lanes} arrows={stage !== 'predict'} label={lesson.question} /></div></div>
    </ExperimentShell>
  )
}

function Explore({ tabs, onTab }) {
  const [done, setDone] = useState(store.load)
  const [mode, setMode] = useState(() => (nextIdea(PUSH_LESSONS, store.load()) != null ? 'ideas' : 'free'))
  const [index, setIndex] = useState(() => nextIdea(PUSH_LESSONS, store.load()) ?? 0)
  if (mode === 'free') return <FreePlay tabs={tabs} onTab={onTab} onIdeas={() => setMode('ideas')} />
  return <Idea key={index} index={index} done={done} tabs={tabs} onTab={onTab} onFree={() => setMode('free')} onPick={setIndex}
    onFinish={() => { const next = { ...done, [PUSH_LESSONS[index].id]: true }; setDone(next); store.save(next) }} />
}

export default function ForceExperiment() {
  const [tab, setTab] = useState('explore')
  useEffect(() => { rememberExperiment('force') }, [])
  return (
    <>
      <div hidden={tab !== 'explore'}><Explore tabs={TABS} onTab={setTab} /></div>
      <div hidden={tab !== 'practical'}><FrictionPractical tabs={TABS} onTab={setTab} /></div>
    </>
  )
}
