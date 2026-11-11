/**
 * VISIORA Studio — Projectile motion (Class 9: Motion · throwing things).
 * Explore (first): three guided ideas (Predict → Try → Explain): the best angle with no air,
 * the best angle with air, and dropping versus throwing sideways. Then free play: any ball, any
 * planet, any speed, angle and height, with air on or off, strobe dots and velocity arrows.
 * Practical: find a launcher's speed from its range at five angles (R against sin 2θ).
 * Physics: engine/flight.js (gravity, drag, bounces and rolling, 1 ms RK4 steps).
 */
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useCanvas } from '../components/motion/useCanvas'
import { BALLS } from '../engine/flight'
import { FLIGHT_LESSONS } from '../engine/flightLessons'
import { PLANETS, planet } from '../engine/planets'
import { rememberExperiment } from './catalog'
import { SHOT_COLOURS, fieldSpan, paintFlight, useFlights } from './flightScene'
import { IdeaChat, IdeaHead, IdeaList, IdeaPredict, IdeaVerdict, ideaStore, nextIdea, useIdeaChat } from './IdeaParts'
import ProjectilePractical from './ProjectilePractical'
import { ExperimentShell, Group, Icon, Slider, Toggle } from './Shell'

export const TABS = [['explore', 'Explore'], ['practical', 'Practical']]
const store = ideaStore('visiora.projectile.ideas')

function FlightCanvas({ world, shots, sim, strobe, arrows, label }) {
  const span = useMemo(() => fieldSpan(shots, world.g), [shots, world.g])
  const { ref } = useCanvas((ctx, w, h) => paintFlight(ctx, w, h, { world, shots, sim, span, strobe, arrows }), [sim, sim.t, shots, world, span, strobe, arrows])
  return <canvas ref={ref} className="st-fill" role="img" aria-label={label} />
}

function FreePlay({ tabs, onTab, onIdeas }) {
  const [kind, setKind] = useState('cricket')
  const [worldId, setWorldId] = useState('earth')
  const [air, setAir] = useState(true)
  const [u, setU] = useState(14)
  const [theta, setTheta] = useState(40)
  const [h, setH] = useState(0)
  const [strobe, setStrobe] = useState(true)
  const [arrows, setArrows] = useState(false)
  const [slow, setSlow] = useState(false)
  const p = planet(worldId)
  const world = useMemo(() => ({ ...p, rho: air ? p.rho : 0 }), [p, air])
  const shots = useMemo(() => [{ kind, u, theta, h }], [kind, u, theta, h])
  const { sim, start, reset } = useFlights({ world, shots, rate: slow ? 0.25 : 1 })
  const b = sim.balls[0]
  const panel = (
    <>
      <button className="st-btn st-btn-secondary st-btn-wide" onClick={onIdeas}><Icon name="target" />Guided ideas: predict, try, explain</button>
      <Group label="Ball">
        <div className="st-chipset">{Object.entries(BALLS).map(([id, x]) => <button key={id} className={`st-chip ${id === kind ? 'is-on' : ''}`} onClick={() => setKind(id)}>{x.label}</button>)}</div>
      </Group>
      <Group label="Where">
        <div className="st-chipset">{PLANETS.map(x => <button key={x.id} className={`st-chip ${x.id === worldId ? 'is-on' : ''}`} onClick={() => setWorldId(x.id)}>{x.label}</button>)}</div>
        {p.rho > 0 && <Toggle label="Air resistance" checked={air} onChange={setAir} />}
      </Group>
      <Slider label="Speed" value={u} display={`${u.toFixed(0)} m/s`} min={1} max={40} step={1} scale={['1', '40 m/s']} onChange={setU} />
      <Slider label="Angle" value={theta} display={`${theta.toFixed(0)}°`} min={-10} max={90} step={1} scale={['−10°', '90°']} onChange={setTheta} />
      <Slider label="Throw from a height of" value={h} display={`${h.toFixed(1)} m`} min={0} max={20} step={0.5} scale={['ground', '20 m']} onChange={setH} />
      <div className="st-row">
        <button className="st-btn st-btn-primary" onClick={start} disabled={sim.running}><Icon name="play" />{sim.done ? 'Throw again' : 'Throw'}</button>
        <button className="st-btn st-btn-secondary" onClick={reset}><Icon name="reset" />Reset</button>
      </div>
      <Toggle label="Strobe: a dot every 0.1 s" checked={strobe} onChange={setStrobe} />
      <Toggle label="Speed arrows (along and up)" checked={arrows} onChange={setArrows} />
      <Toggle label="Slow motion (¼×)" checked={slow} onChange={setSlow} />
      <div className="st-idea-readings">
        <div><span>landed at</span><b className="st-num">{b.landed ? `${b.landed.x.toFixed(2)} m` : '—'}</b></div>
        <div><span>in the air for</span><b className="st-num">{b.landed ? `${b.landed.t.toFixed(2)} s` : '—'}</b></div>
        <div><span>highest point</span><b className="st-num">{b.top.y.toFixed(2)} m</b></div>
        <div><span>bounces</span><b className="st-num">{b.bounces}</b></div>
      </div>
      {arrows && <p className="st-muted st-small"><b style={{ color: '#2051C8' }}>Blue</b> is the speed along, <b style={{ color: '#D6336C' }}>pink</b> the speed up or down. With no air the blue one never changes.</p>}
    </>
  )
  return (
    <ExperimentShell code="Class 9 · Motion" title="Projectile motion" tabs={tabs} tab="explore" onTab={onTab} panel={panel}>
      <div className="st-circ is-bare"><div><FlightCanvas world={world} shots={shots} sim={sim} strobe={strobe} arrows={arrows} label={`${BALLS[kind].label} thrown at ${u} m/s and ${theta}° on ${p.label}`} /></div></div>
    </ExperimentShell>
  )
}

function Idea({ index, done, tabs, onTab, onFree, onFinish, onPick }) {
  const lesson = FLIGHT_LESSONS[index]
  const world = useMemo(() => ({ ...planet('earth'), ...lesson.world }), [lesson])
  const [stage, setStage] = useState('predict')
  const [pick, setPick] = useState(null)
  const talk = useIdeaChat(lesson.explain, onFinish)
  const truth = useMemo(() => lesson.outcome(), [lesson])
  const { sim, start } = useFlights({ world, shots: lesson.shots })
  const topRef = useRef(null)
  useEffect(() => { topRef.current?.closest('.st-panel-scroll')?.scrollTo({ top: 0 }) }, [stage])
  const nextIndex = FLIGHT_LESSONS.findIndex((l, i) => i > index && !done[l.id])
  const swatches = lesson.options.length === lesson.shots.length ? lesson.options.map((o, i) => ({ ...o, swatch: SHOT_COLOURS[i] })) : lesson.options
  let body
  if (stage === 'predict') {
    body = <IdeaPredict question={lesson.question} options={swatches} pick={pick} onPick={setPick} note={lesson.note} go="Throw" onGo={() => { setStage('try'); start() }} />
  } else if (stage === 'try') {
    // the verdict is about where they land, so it shows the moment the last one touches down
    const landed = sim.balls.every(b => b.landed)
    body = (
      <>
        {landed ? <IdeaVerdict right={pick === truth} told={lesson.told[truth]} /> : <p className="st-idea-watch">Watch…</p>}
        <table className="st-table">
          <thead><tr><th /><th>landed</th><th>time</th></tr></thead>
          <tbody>{sim.balls.map((b, i) => (
            <tr key={i}><td><span className="st-dot" style={{ background: SHOT_COLOURS[i] }} />{lesson.shots[i].u ? `${lesson.shots[i].theta}°, ${lesson.shots[i].u} m/s` : 'dropped'}</td><td className="st-num">{b.landed ? `${b.landed.x.toFixed(1)} m` : '—'}</td><td className="st-num">{b.landed ? `${b.landed.t.toFixed(2)} s` : '—'}</td></tr>
          ))}</tbody>
        </table>
        <div className="st-row">
          <button className="st-btn st-btn-secondary" onClick={start} disabled={sim.running && !landed}><Icon name="reset" />Throw again</button>
          <button className="st-btn st-btn-primary st-idea-go" disabled={!landed} onClick={() => { setStage('explain'); talk.start() }}>Next: why?</button>
        </div>
      </>
    )
  } else {
    body = <IdeaChat steps={lesson.explain} talk={talk} index={index} title={lesson.title} nextTitle={FLIGHT_LESSONS[nextIndex]?.title} onNext={() => onPick(nextIndex)} onFree={onFree} />
  }
  const panel = (
    <>
      <IdeaHead index={index} count={FLIGHT_LESSONS.length} title={lesson.title} stage={stage} onFree={onFree} headRef={topRef} />
      <div className="st-step-body">{body}</div>
      <IdeaList lessons={FLIGHT_LESSONS} done={done} index={index} onPick={onPick} />
    </>
  )
  return (
    <ExperimentShell code="Class 9 · Motion" title="Projectile motion" tabs={tabs} tab="explore" onTab={onTab} panel={panel}>
      <div className="st-circ is-bare"><div><FlightCanvas world={world} shots={lesson.shots} sim={sim} strobe={stage !== 'predict'} label={lesson.question} /></div></div>
    </ExperimentShell>
  )
}

function Explore({ tabs, onTab }) {
  const [done, setDone] = useState(store.load)
  const [mode, setMode] = useState(() => (nextIdea(FLIGHT_LESSONS, store.load()) != null ? 'ideas' : 'free'))
  const [index, setIndex] = useState(() => nextIdea(FLIGHT_LESSONS, store.load()) ?? 0)
  if (mode === 'free') return <FreePlay tabs={tabs} onTab={onTab} onIdeas={() => setMode('ideas')} />
  return <Idea key={index} index={index} done={done} tabs={tabs} onTab={onTab} onFree={() => setMode('free')} onPick={setIndex}
    onFinish={() => { const next = { ...done, [FLIGHT_LESSONS[index].id]: true }; setDone(next); store.save(next) }} />
}

export default function ProjectileExperiment() {
  const [tab, setTab] = useState('explore')
  useEffect(() => { rememberExperiment('projectile') }, [])
  return (
    <>
      <div hidden={tab !== 'explore'}><Explore tabs={TABS} onTab={setTab} /></div>
      <div hidden={tab !== 'practical'}><ProjectilePractical tabs={TABS} onTab={setTab} /></div>
    </>
  )
}
