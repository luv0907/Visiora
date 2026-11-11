/**
 * VISIORA Studio — Falling on other planets (Class 9: Gravitation · free fall).
 * Explore (first): three guided ideas (Predict → Try → Explain): the hammer and the feather on
 * the Moon, the same on Earth, and a helium balloon. Then free play: any planet, any two things,
 * any height, with or without air. Practical: find g on a mystery planet from timed drops.
 * Physics: engine/fall.js (gravity, buoyancy, drag and added mass, 1 ms RK4 steps).
 */
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useCanvas } from '../components/motion/useCanvas'
import { OBJECTS, terminalSpeed } from '../engine/fall'
import { FALL_LESSONS, runFall } from '../engine/fallLessons'
import { PLANETS, planet } from '../engine/planets'
import { rememberExperiment } from './catalog'
import { paintFall } from './fallScene'
import { useDrops } from './useDrops'
import { IdeaChat, IdeaHead, IdeaList, IdeaPredict, IdeaVerdict, ideaStore, nextIdea, useIdeaChat } from './IdeaParts'
import PlanetsPractical from './PlanetsPractical'
import { ExperimentShell, Group, Icon, Slider, Toggle } from './Shell'

export const TABS = [['explore', 'Explore'], ['practical', 'Practical']]
const store = ideaStore('visiora.planets.ideas')
const KINDS = Object.keys(OBJECTS)
function FallCanvas({ world, sim, height, strobe, vacuum, label }) {
  const { ref } = useCanvas((ctx, w, h) => {
    paintFall(ctx, w, h, {
      world, height, t: sim.t, strobe, vacuum,
      drops: sim.drops.map((d, i) => ({ kind: d.kind, y: d.y, trail: sim.trails[i], landed: d.landed, stuck: d.stuck, label: OBJECTS[d.kind].label })),
    })
  }, [sim, sim.t, world, height, strobe, vacuum])
  return <canvas ref={ref} className="st-fill" role="img" aria-label={label} />
}

const fmt = (v, d = 2) => (v == null ? '—' : v.toFixed(d))

function FreePlay({ tabs, onTab, onIdeas }) {
  const [worldId, setWorldId] = useState('earth')
  const [vacuum, setVacuum] = useState(false)
  const [kinds, setKinds] = useState(['hammer', 'feather'])
  const [height, setHeight] = useState(3)
  const [slow, setSlow] = useState(false)
  const [strobe, setStrobe] = useState(true)
  const p = planet(worldId)
  const world = useMemo(() => ({ g: p.g, rho: vacuum ? 0 : p.rho }), [p, vacuum])
  const { sim, start, reset } = useDrops({ world, kinds, height, rate: slow ? 0.25 : 1 })
  const setKind = (i, k) => setKinds(ks => ks.map((x, j) => (j === i ? k : x)))

  const panel = (
    <>
      <button className="st-btn st-btn-secondary st-btn-wide" onClick={onIdeas}><Icon name="target" />Guided ideas: predict, try, explain</button>
      <Group label="Where">
        <div className="st-chipset">
          {PLANETS.map(x => <button key={x.id} className={`st-chip ${x.id === worldId ? 'is-on' : ''}`} onClick={() => { setWorldId(x.id); if (!x.rho) setVacuum(false) }}>{x.label}</button>)}
        </div>
        <p className="st-muted st-small">g = {p.g} m/s² · {vacuum ? 'no air (pumped out)' : p.air}</p>
        {p.rho > 0 && <Toggle label="Pump out the air" checked={vacuum} onChange={setVacuum} />}
      </Group>
      {[0, 1].map(i => (
        <Group key={i} label={i === 0 ? 'Left' : 'Right'}>
          <div className="st-chipset">
            {KINDS.map(k => <button key={k} className={`st-chip ${kinds[i] === k ? 'is-on' : ''}`} onClick={() => setKind(i, k)}>{OBJECTS[k].label}</button>)}
          </div>
        </Group>
      ))}
      <Slider label="Drop from" value={height} display={`${height.toFixed(1)} m`} min={0.5} max={20} step={0.1} scale={['0.5 m', '20 m']} onChange={setHeight} />
      <div className="st-row">
        <button className="st-btn st-btn-primary" onClick={start} disabled={sim.running}><Icon name="play" />{sim.done ? 'Drop again' : 'Drop'}</button>
        <button className="st-btn st-btn-secondary" onClick={reset}><Icon name="reset" />Reset</button>
      </div>
      <Toggle label="Slow motion (¼×)" checked={slow} onChange={setSlow} />
      <Toggle label="Strobe: where it was every 0.1 s" checked={strobe} onChange={setStrobe} />
      <Group label="Readings">
        <table className="st-table">
          <thead><tr><th /><th>speed</th><th>landed</th><th>top speed</th></tr></thead>
          <tbody>{sim.drops.map(d => (
            <tr key={d.kind + d.y}><td>{OBJECTS[d.kind].label}</td><td className="st-num">{fmt(Math.abs(d.v), 1)} m/s</td><td className="st-num">{d.landed ? `${fmt(d.landed.t)} s` : d.stuck ? 'rose' : '—'}</td><td className="st-num">{fmt(terminalSpeed(d.kind, world), 1)}{terminalSpeed(d.kind, world) ? ' m/s' : ''}</td></tr>
          ))}</tbody>
        </table>
        <p className="st-muted st-small">Top speed is the terminal speed, where the air’s push balances the weight. With no air there is none: it keeps speeding up.</p>
      </Group>
    </>
  )
  return (
    <ExperimentShell code="Class 9 · Gravitation" title="Falling on other planets" tabs={tabs} tab="explore" onTab={onTab} panel={panel}>
      <div className="st-circ is-bare"><div><FallCanvas world={p} sim={sim} height={height} strobe={strobe} vacuum={vacuum} label={`${OBJECTS[kinds[0]].label} and ${OBJECTS[kinds[1]].label} dropped from ${height} m on ${p.label}`} /></div></div>
    </ExperimentShell>
  )
}

function Idea({ index, done, tabs, onTab, onFree, onFinish, onPick }) {
  const lesson = FALL_LESSONS[index]
  const p = planet(lesson.world)
  const world = useMemo(() => ({ g: p.g, rho: p.rho }), [p])
  const [stage, setStage] = useState('predict')
  const [pick, setPick] = useState(null)
  const talk = useIdeaChat(lesson.explain, onFinish)
  const truth = useMemo(() => lesson.outcome(runFall(lesson)), [lesson]) // what really happens
  const { sim, start } = useDrops({ world, kinds: lesson.objects, height: lesson.height })
  const topRef = useRef(null)
  useEffect(() => { topRef.current?.closest('.st-panel-scroll')?.scrollTo({ top: 0 }) }, [stage])
  const nextIndex = FALL_LESSONS.findIndex((l, i) => i > index && !done[l.id])
  const options = lesson.options.map(o => ({ ...o, label: o.id === 'a' || o.id === 'b' ? `The ${OBJECTS[lesson.objects[o.id === 'a' ? 0 : 1]].label.toLowerCase()}` : o.label }))

  let body
  if (stage === 'predict') {
    body = <IdeaPredict question={lesson.question} options={options} pick={pick} onPick={setPick} note={lesson.note} go="Let go" onGo={() => { setStage('try'); start() }} />
  } else if (stage === 'try') {
    body = (
      <>
        {sim.done ? <IdeaVerdict right={pick === truth} told={lesson.told[truth]} /> : <p className="st-idea-watch">Watch…</p>}
        <table className="st-table">
          <tbody>{sim.drops.map(d => (
            <tr key={d.kind}><td>{OBJECTS[d.kind].label}</td><td className="st-num">{d.landed ? `landed at ${d.landed.t.toFixed(2)} s` : d.stuck ? 'went up' : `${Math.abs(d.v).toFixed(1)} m/s`}</td></tr>
          ))}</tbody>
        </table>
        <div className="st-row">
          <button className="st-btn st-btn-secondary" onClick={start} disabled={sim.running}><Icon name="reset" />Drop again</button>
          <button className="st-btn st-btn-primary st-idea-go" disabled={!sim.done} onClick={() => { setStage('explain'); talk.start() }}>Next: why?</button>
        </div>
      </>
    )
  } else {
    body = <IdeaChat steps={lesson.explain} talk={talk} index={index} title={lesson.title} nextTitle={FALL_LESSONS[nextIndex]?.title} onNext={() => onPick(nextIndex)} onFree={onFree} />
  }
  const panel = (
    <>
      <IdeaHead index={index} count={FALL_LESSONS.length} title={lesson.title} stage={stage} onFree={onFree} headRef={topRef} />
      <div className="st-step-body">{body}</div>
      <IdeaList lessons={FALL_LESSONS} done={done} index={index} onPick={onPick} />
    </>
  )
  return (
    <ExperimentShell code="Class 9 · Gravitation" title="Falling on other planets" tabs={tabs} tab="explore" onTab={onTab} panel={panel}>
      <div className="st-circ is-bare"><div><FallCanvas world={p} sim={sim} height={lesson.height} strobe={stage !== 'predict'} label={`${lesson.objects.map(k => OBJECTS[k].label).join(' and ')} on ${p.label}`} /></div></div>
    </ExperimentShell>
  )
}

function Explore({ tabs, onTab }) {
  const [done, setDone] = useState(store.load)
  const [mode, setMode] = useState(() => (nextIdea(FALL_LESSONS, store.load()) != null ? 'ideas' : 'free'))
  const [index, setIndex] = useState(() => nextIdea(FALL_LESSONS, store.load()) ?? 0)
  if (mode === 'free') return <FreePlay tabs={tabs} onTab={onTab} onIdeas={() => setMode('ideas')} />
  return <Idea key={index} index={index} done={done} tabs={tabs} onTab={onTab} onFree={() => setMode('free')} onPick={setIndex}
    onFinish={() => { const next = { ...done, [FALL_LESSONS[index].id]: true }; setDone(next); store.save(next) }} />
}

export default function PlanetsExperiment() {
  const [tab, setTab] = useState('explore')
  useEffect(() => { rememberExperiment('gravity') }, [])
  // both stay mounted, so a half-done practical survives a look at Explore
  return (
    <>
      <div hidden={tab !== 'explore'}><Explore tabs={TABS} onTab={setTab} /></div>
      <div hidden={tab !== 'practical'}><PlanetsPractical tabs={TABS} onTab={setTab} /></div>
    </>
  )
}

