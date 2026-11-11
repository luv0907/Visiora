/**
 * VISIORA Studio — Floating and sinking (Class 9: thrust, pressure and buoyancy).
 * Explore (first): three guided ideas (Predict → Try → Explain): an ice cube, steel in mercury,
 * and wood in oil against water. Then free play: any solid in any liquid, any size; drag the
 * cube down and let go to watch it bob, settle or sink, with the weight and upthrust drawn.
 * Practical: Archimedes' principle with a spring balance, an overflow can and a cylinder.
 * Physics: engine/buoy.js (buoyancy, drag and viscosity, waves, added mass, 1 ms RK4 steps).
 */
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useCanvas } from '../components/motion/useCanvas'
import { LIQUIDS, SOLIDS, floatFraction, sinks } from '../engine/buoy'
import { BUOY_LESSONS, runTanks } from '../engine/buoyLessons'
import { rememberExperiment } from './catalog'
import BuoyancyPractical from './BuoyancyPractical'
import { IdeaChat, IdeaHead, IdeaList, IdeaPredict, IdeaVerdict, ideaStore, nextIdea, useIdeaChat } from './IdeaParts'
import { ExperimentShell, Group, Icon, Slider, Toggle } from './Shell'
import { paintTanks, tankLayout, useTanks } from './tankScene'

export const TABS = [['explore', 'Explore'], ['practical', 'Practical']]
const store = ideaStore('visiora.buoyancy.ideas')

/** The tanks, with the cubes draggable: press on one, move it, let go. */
function Tanks({ run, arrows, label }) {
  const { sim, hold, release } = run
  const view = useRef(null)
  const { ref } = useCanvas((ctx, w, h) => { view.current = { w, h, ...paintTanks(ctx, w, h, { blocks: sim.blocks, arrows }) } }, [sim, sim.t, arrows])
  const where = e => { const r = e.currentTarget.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top] }
  const onDown = e => {
    const v = view.current; if (!v) return
    const [x, y] = where(e), L = tankLayout(v.w, v.h, sim.blocks.length)
    const i = sim.blocks.findIndex((b, j) => Math.abs(x - L.cx(j)) < (b.L * L.k) / 2 + 12 && y > L.Y(b.y + b.L) - 12 && y < L.Y(b.y) + 12)
    if (i < 0) return
    e.currentTarget.setPointerCapture?.(e.pointerId)
    view.current.drag = { i, off: L.Y(sim.blocks[i].y) - y }
    hold(i)
  }
  const onMove = e => {
    const v = view.current; if (!v?.drag) return
    const [, y] = where(e), L = tankLayout(v.w, v.h, sim.blocks.length)
    hold(v.drag.i, (L.surfaceY - (y + v.drag.off)) / L.k)
  }
  const onUp = () => { if (view.current?.drag) { view.current.drag = null; release() } }
  return <canvas ref={ref} className="st-fill" role="img" aria-label={label} style={{ touchAction: 'none', cursor: 'grab' }} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} />
}

function FreePlay({ tabs, onTab, onIdeas }) {
  const [solid, setSolid] = useState('wood')
  const [liquid, setLiquid] = useState('water')
  const [size, setSize] = useState(5)
  const [arrows, setArrows] = useState(true)
  const tanks = useMemo(() => [{ solid, liquid, L: size / 100 }], [solid, liquid, size])
  const run = useTanks(tanks)
  const b = run.sim.blocks[0]
  const f = floatFraction(solid, liquid)
  const panel = (
    <>
      <button className="st-btn st-btn-secondary st-btn-wide" onClick={onIdeas}><Icon name="target" />Guided ideas: predict, try, explain</button>
      <Group label="Solid">
        <div className="st-chipset">{Object.entries(SOLIDS).map(([id, x]) => <button key={id} className={`st-chip ${id === solid ? 'is-on' : ''}`} onClick={() => setSolid(id)}>{x.label}</button>)}</div>
      </Group>
      <Group label="Liquid">
        <div className="st-chipset">{Object.entries(LIQUIDS).map(([id, x]) => <button key={id} className={`st-chip ${id === liquid ? 'is-on' : ''}`} onClick={() => setLiquid(id)}>{x.label}</button>)}</div>
      </Group>
      <Slider label="Cube size" value={size} display={`${size.toFixed(1)} cm`} min={1} max={8} step={0.5} scale={['1 cm', '8 cm']} onChange={setSize} />
      <div className="st-row">
        <button className="st-btn st-btn-secondary" onClick={run.reset}><Icon name="reset" />Drop it in again</button>
      </div>
      <p className="st-muted st-small">Drag the cube down under the surface and let go.</p>
      <Toggle label="Weight and upthrust arrows" checked={arrows} onChange={setArrows} />
      <div className="st-idea-readings">
        <div><span>{SOLIDS[solid].label}</span><b className="st-num">{SOLIDS[solid].rho} kg/m³</b></div>
        <div><span>{LIQUIDS[liquid].label}</span><b className="st-num">{LIQUIDS[liquid].rho} kg/m³</b></div>
      </div>
      <p className="st-callout">{sinks(solid, liquid)
        ? <>The solid is denser than the liquid, so it <b>sinks</b>: no amount of it under can push aside its own weight of liquid.</>
        : <>It <b>floats</b> with {SOLIDS[solid].rho} ÷ {LIQUIDS[liquid].rho} = <b>{Math.round(f * 100)} %</b> under: that much pushes aside its own weight of liquid.</>}</p>
      {liquid === 'honey' && <p className="st-muted st-small">Honey is thick (sticky): try a 1 cm cube of aluminium and watch how slowly it sinks.</p>}
      <p className="st-muted st-small">Now {Math.round(Math.max(0, Math.min(b.L, -b.y)) / b.L * 100)} % under, moving at {(Math.abs(b.v) * 100).toFixed(1)} cm/s.</p>
    </>
  )
  return (
    <ExperimentShell code="Class 9 · Gravitation" title="Floating and sinking" tabs={tabs} tab="explore" onTab={onTab} panel={panel}>
      <div className="st-circ is-bare"><div><Tanks run={run} arrows={arrows} label={`A ${size} cm cube of ${SOLIDS[solid].label.toLowerCase()} in ${LIQUIDS[liquid].label.toLowerCase()}`} /></div></div>
    </ExperimentShell>
  )
}

function Idea({ index, done, tabs, onTab, onFree, onFinish, onPick }) {
  const lesson = BUOY_LESSONS[index]
  const [stage, setStage] = useState('predict')
  const [pick, setPick] = useState(null)
  const talk = useIdeaChat(lesson.explain, onFinish)
  const truth = useMemo(() => lesson.outcome(runTanks(lesson)), [lesson]) // where they really settle
  // before the prediction the cube is held just above the liquid; after, it is let go
  const tanks = useMemo(() => lesson.tank.map(t => ({ ...t, y: stage === 'predict' ? 0.03 : 0.02 })), [lesson, stage])
  const run = useTanks(tanks)
  useEffect(() => { if (stage === 'predict') run.hold('all') }, [stage]) // eslint-disable-line react-hooks/exhaustive-deps
  const topRef = useRef(null)
  useEffect(() => { topRef.current?.closest('.st-panel-scroll')?.scrollTo({ top: 0 }) }, [stage])
  const settledNow = run.sim.blocks.every(b => b.rest)
  const nextIndex = BUOY_LESSONS.findIndex((l, i) => i > index && !done[l.id])
  let body
  if (stage === 'predict') {
    body = <IdeaPredict question={lesson.question} options={lesson.options} pick={pick} onPick={setPick} note={lesson.note} go="Let go" onGo={() => { setStage('try'); run.release() }} />
  } else if (stage === 'try') {
    body = (
      <>
        {settledNow ? <IdeaVerdict right={pick === truth} told={lesson.told[truth]} /> : <p className="st-idea-watch">Watch it settle…</p>}
        <p className="st-muted st-small">Drag the cube under and let go to see it again.</p>
        <button className="st-btn st-btn-primary st-idea-go" disabled={!settledNow} onClick={() => { setStage('explain'); talk.start() }}>Next: why?</button>
      </>
    )
  } else {
    body = <IdeaChat steps={lesson.explain} talk={talk} index={index} title={lesson.title} nextTitle={BUOY_LESSONS[nextIndex]?.title} onNext={() => onPick(nextIndex)} onFree={onFree} />
  }
  const panel = (
    <>
      <IdeaHead index={index} count={BUOY_LESSONS.length} title={lesson.title} stage={stage} onFree={onFree} headRef={topRef} />
      <div className="st-step-body">{body}</div>
      <IdeaList lessons={BUOY_LESSONS} done={done} index={index} onPick={onPick} />
    </>
  )
  return (
    <ExperimentShell code="Class 9 · Gravitation" title="Floating and sinking" tabs={tabs} tab="explore" onTab={onTab} panel={panel}>
      <div className="st-circ is-bare"><div><Tanks run={run} arrows={stage !== 'predict'} label={lesson.question} /></div></div>
    </ExperimentShell>
  )
}

function Explore({ tabs, onTab }) {
  const [done, setDone] = useState(store.load)
  const [mode, setMode] = useState(() => (nextIdea(BUOY_LESSONS, store.load()) != null ? 'ideas' : 'free'))
  const [index, setIndex] = useState(() => nextIdea(BUOY_LESSONS, store.load()) ?? 0)
  if (mode === 'free') return <FreePlay tabs={tabs} onTab={onTab} onIdeas={() => setMode('ideas')} />
  return <Idea key={index} index={index} done={done} tabs={tabs} onTab={onTab} onFree={() => setMode('free')} onPick={setIndex}
    onFinish={() => { const next = { ...done, [BUOY_LESSONS[index].id]: true }; setDone(next); store.save(next) }} />
}

export default function BuoyancyExperiment() {
  const [tab, setTab] = useState('explore')
  useEffect(() => { rememberExperiment('buoyancy') }, [])
  return (
    <>
      <div hidden={tab !== 'explore'}><Explore tabs={TABS} onTab={setTab} /></div>
      <div hidden={tab !== 'practical'}><BuoyancyPractical tabs={TABS} onTab={setTab} /></div>
    </>
  )
}
