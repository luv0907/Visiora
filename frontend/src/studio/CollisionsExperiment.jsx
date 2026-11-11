/**
 * VISIORA Studio — Air track collisions (Class 9: Force and laws of motion · momentum).
 * Explore (first): three guided ideas (Predict → Try → Explain): equal gliders, heavy into
 * light, and gliders that stick. Then free play: any masses, any speeds either way, springy or
 * velcro bumpers, with live momentum bars and the speeds just before and after each hit.
 * Practical: conservation of momentum with two light gates.
 * Physics: engine/airtrack.js (air drag, collisions with restitution, end stops, light gates).
 */
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useCanvas } from '../components/motion/useCanvas'
import { BUMPERS, totals } from '../engine/airtrack'
import { TRACK_LESSONS, firstHit } from '../engine/airtrackLessons'
import { rememberExperiment } from './catalog'
import CollisionsPractical from './CollisionsPractical'
import { IdeaChat, IdeaHead, IdeaList, IdeaPredict, IdeaVerdict, ideaStore, nextIdea, useIdeaChat } from './IdeaParts'
import { ExperimentShell, Group, Icon, Slider, Toggle } from './Shell'
import { GLIDER_COLOURS, barScale, paintTrack, useTrack } from './trackScene'

export const TABS = [['explore', 'Explore'], ['practical', 'Practical']]
const store = ideaStore('visiora.collisions.ideas')
const CODE = 'Class 9 · Force and laws of motion'
const TITLE = 'Air track collisions'

export function TrackCanvas({ sim, bumper, pScale, showGates = false, arrows = true, label }) {
  const { ref } = useCanvas((ctx, w, h) => paintTrack(ctx, w, h, { sim, bumper, pScale, showGates, arrows }), [sim, sim.t, bumper, pScale, showGates, arrows])
  return <canvas ref={ref} className="st-fill" role="img" aria-label={label} />
}

const signed = (v, d = 3) => `${v < -0.00005 ? '−' : ''}${Math.abs(v).toFixed(d)}`

/** Speeds and momentum just before and just after a hit, glider by glider. */
function HitTable({ gliders, hit }) {
  const p = v => gliders.reduce((s, g, i) => s + g.m * v[i], 0)
  const f = v => (Math.abs(v) < 0.0005 ? '0.00' : `${v < 0 ? '−' : ''}${Math.abs(v).toFixed(2)}`)
  return (
    <table className="st-table">
      <thead><tr><th /><th>before</th><th>after</th></tr></thead>
      <tbody>
        {gliders.map((g, i) => <tr key={i}><td><span className="st-dot" style={{ background: GLIDER_COLOURS[i] }} />{'AB'[i]} ({g.m.toFixed(1)} kg), m/s</td><td className="st-num">{hit ? f(hit.before[i]) : '—'}</td><td className="st-num">{hit ? f(hit.after[i]) : '—'}</td></tr>)}
        <tr><td><b>Total momentum</b>, kg·m/s</td><td className="st-num"><b>{hit ? signed(p(hit.before)) : '—'}</b></td><td className="st-num"><b>{hit ? signed(p(hit.after)) : '—'}</b></td></tr>
      </tbody>
    </table>
  )
}

function FreePlay({ tabs, onTab, onIdeas }) {
  const [wA, setWA] = useState(0)
  const [wB, setWB] = useState(0)
  const [uA, setUA] = useState(0.5)
  const [uB, setUB] = useState(0)
  const [bumper, setBumper] = useState('spring')
  const [arrows, setArrows] = useState(true)
  const [slow, setSlow] = useState(false)
  const gliders = useMemo(() => [{ m: 0.2 + wA * 0.1, x: 0.3, v: uA }, { m: 0.2 + wB * 0.1, x: 1.1, v: uB }], [wA, wB, uA, uB])
  const { sim, start, reset } = useTrack({ gliders, e: BUMPERS[bumper].e, gates: [], rate: slow ? 0.25 : 1 })
  const pScale = useMemo(() => barScale(gliders), [gliders])
  const now = totals(sim)
  const atEnd = sim.g.some(g => g.x < 0.005 || g.x > 1.835)
  const panel = (
    <>
      <button className="st-btn st-btn-secondary st-btn-wide" onClick={onIdeas}><Icon name="target" />Guided ideas: predict, try, explain</button>
      <Group label="Bumpers">
        <div className="st-chipset">{Object.entries(BUMPERS).map(([id, x]) => <button key={id} className={`st-chip ${id === bumper ? 'is-on' : ''}`} onClick={() => setBumper(id)}>{x.label}</button>)}</div>
      </Group>
      <Slider label="Glider A mass" value={wA} display={`${(0.2 + wA * 0.1).toFixed(1)} kg`} min={0} max={4} step={1} scale={['0.2 kg', '0.6 kg']} onChange={v => { setWA(v); reset() }} />
      <Slider label="Glider B mass" value={wB} display={`${(0.2 + wB * 0.1).toFixed(1)} kg`} min={0} max={4} step={1} scale={['0.2 kg', '0.6 kg']} onChange={v => { setWB(v); reset() }} />
      <Slider label="A’s push" value={uA} display={`${uA.toFixed(2)} m/s →`} min={0} max={0.8} step={0.05} scale={['0', '0.8 m/s']} onChange={setUA} />
      <Slider label="B’s push" value={uB} display={uB === 0 ? 'at rest' : `${Math.abs(uB).toFixed(2)} m/s ${uB < 0 ? '←' : '→'}`} min={-0.6} max={0.6} step={0.05} scale={['← 0.6', '0.6 m/s →']} onChange={setUB} />
      <div className="st-row">
        <button className="st-btn st-btn-primary" onClick={start} disabled={sim.running}><Icon name="play" />{sim.t > 0 ? 'Push again' : 'Push'}</button>
        <button className="st-btn st-btn-secondary" onClick={reset}><Icon name="reset" />Reset</button>
      </div>
      <Toggle label="Speed arrows" checked={arrows} onChange={setArrows} />
      <Toggle label="Slow motion (¼×)" checked={slow} onChange={setSlow} />
      <span className="st-label">Last hit</span>
      <HitTable gliders={gliders} hit={sim.lastHit} />
      <div className="st-idea-readings">
        <div><span>total momentum now</span><b className="st-num">{signed(now.p)} kg·m/s</b></div>
        <div><span>kinetic energy now</span><b className="st-num">{(now.ke * 1000).toFixed(1)} mJ</b></div>
      </div>
      <p className="st-muted st-small">{atEnd
        ? <>An end stop is pushing a glider back: that push comes from outside the two gliders, so the total momentum <b>changes</b> here.</>
        : <>Between the gliders, momentum is only passed across, so the total stays the same. Air takes a little off, about 1 % a second.</>}</p>
    </>
  )
  return (
    <ExperimentShell code={CODE} title={TITLE} tabs={tabs} tab="explore" onTab={onTab} panel={panel}>
      <div className="st-circ is-bare"><div><TrackCanvas sim={sim} bumper={bumper} pScale={pScale} arrows={arrows} label={`Glider A, ${gliders[0].m.toFixed(1)} kg, and glider B, ${gliders[1].m.toFixed(1)} kg, on an air track`} /></div></div>
    </ExperimentShell>
  )
}

function Idea({ index, done, tabs, onTab, onFree, onFinish, onPick }) {
  const lesson = TRACK_LESSONS[index]
  const [stage, setStage] = useState('predict')
  const [pick, setPick] = useState(null)
  const talk = useIdeaChat(lesson.explain, onFinish)
  const truth = useMemo(() => lesson.outcome(lesson), [lesson])
  const hit = useMemo(() => firstHit(lesson), [lesson])
  // stop once the two have parted (or moved off together) and before anything reaches an end stop
  const { sim, start } = useTrack({ gliders: lesson.gliders, e: BUMPERS[lesson.bumper].e, gates: [], until: s => s.firstHit && s.t > s.firstHit.t + 1.4 })
  const pScale = useMemo(() => barScale(lesson.gliders), [lesson])
  const topRef = useRef(null)
  useEffect(() => { topRef.current?.closest('.st-panel-scroll')?.scrollTo({ top: 0 }) }, [stage])
  const nextIndex = TRACK_LESSONS.findIndex((l, i) => i > index && !done[l.id])
  const seen = sim.firstHit && sim.t > sim.firstHit.t + 0.5
  let body
  if (stage === 'predict') {
    body = <IdeaPredict question={lesson.question} options={lesson.options} pick={pick} onPick={setPick} note={lesson.note} go="Push A" onGo={() => { setStage('try'); start() }} />
  } else if (stage === 'try') {
    body = (
      <>
        {seen ? <IdeaVerdict right={pick === truth} told={lesson.told[truth]} /> : <p className="st-idea-watch">Watch…</p>}
        <HitTable gliders={lesson.gliders} hit={seen ? hit : null} />
        <div className="st-row">
          <button className="st-btn st-btn-secondary" onClick={start} disabled={sim.running && !seen}><Icon name="reset" />Push again</button>
          <button className="st-btn st-btn-primary st-idea-go" disabled={!seen} onClick={() => { setStage('explain'); talk.start() }}>Next: why?</button>
        </div>
      </>
    )
  } else {
    body = <IdeaChat steps={lesson.explain} talk={talk} index={index} title={lesson.title} nextTitle={TRACK_LESSONS[nextIndex]?.title} onNext={() => onPick(nextIndex)} onFree={onFree} />
  }
  const panel = (
    <>
      <IdeaHead index={index} count={TRACK_LESSONS.length} title={lesson.title} stage={stage} onFree={onFree} headRef={topRef} />
      <div className="st-step-body">{body}</div>
      <IdeaList lessons={TRACK_LESSONS} done={done} index={index} onPick={onPick} />
    </>
  )
  return (
    <ExperimentShell code={CODE} title={TITLE} tabs={tabs} tab="explore" onTab={onTab} panel={panel}>
      <div className="st-circ is-bare"><div><TrackCanvas sim={sim} bumper={lesson.bumper} pScale={pScale} label={lesson.question} /></div></div>
    </ExperimentShell>
  )
}

function Explore({ tabs, onTab }) {
  const [done, setDone] = useState(store.load)
  const [mode, setMode] = useState(() => (nextIdea(TRACK_LESSONS, store.load()) != null ? 'ideas' : 'free'))
  const [index, setIndex] = useState(() => nextIdea(TRACK_LESSONS, store.load()) ?? 0)
  if (mode === 'free') return <FreePlay tabs={tabs} onTab={onTab} onIdeas={() => setMode('ideas')} />
  return <Idea key={index} index={index} done={done} tabs={tabs} onTab={onTab} onFree={() => setMode('free')} onPick={setIndex}
    onFinish={() => { const next = { ...done, [TRACK_LESSONS[index].id]: true }; setDone(next); store.save(next) }} />
}

export default function CollisionsExperiment() {
  const [tab, setTab] = useState('explore')
  useEffect(() => { rememberExperiment('airtrack') }, [])
  return (
    <>
      <div hidden={tab !== 'explore'}><Explore tabs={TABS} onTab={setTab} /></div>
      <div hidden={tab !== 'practical'}><CollisionsPractical tabs={TABS} onTab={setTab} /></div>
    </>
  )
}
