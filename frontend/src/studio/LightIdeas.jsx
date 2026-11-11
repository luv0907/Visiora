/**
 * VISIORA Studio — guided ideas on the light bench: Predict → Try → Explain.
 * Predict: the ray stops at the glass and the student commits to a guess.
 * Try: the light goes through; whether the guess was right comes from the ray tracer, and a
 * slider lets them tilt the light and watch the angles. Explain: the tutor asks why
 * (IdeaParts.jsx), offering answers to tap and nudging with clues until the idea lands.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useCanvas } from '../components/motion/useCanvas'
import { LIGHTS, traceBeam } from '../engine/raybench'
import { LESSONS, bendOf, bendingEvent, runLesson } from '../engine/lightLessons'
import { IdeaChat, IdeaHead, IdeaList, IdeaPredict, IdeaVerdict, ideaStore, nextIdea as firstOpen, useIdeaChat } from './IdeaParts'
import { paintBench } from './lightDraw'
import { ExperimentShell, Slider } from './Shell'

const store = ideaStore('visiora.light.ideas')
export const loadIdeas = store.load
export const nextIdea = done => firstOpen(LESSONS, done)

/** A small picture of each bending choice: in from the upper left, then the three ways out. */
function BendIcon({ kind }) {
  const out = { towards: 'L40 52', away: 'L60 46', straight: 'L56 50' }[kind]
  return (
    <svg width="64" height="56" viewBox="0 0 64 56" aria-hidden="true">
      <path d="M2 28h60" stroke="currentColor" strokeWidth="1.4" />
      <path d="M32 4v48" stroke="#6B6888" strokeWidth="1" strokeDasharray="3 3" />
      <path d={`M8 6L32 28${out}`} fill="none" stroke="#D6336C" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function Ideas({ tabs, onTab, onFree }) {
  const [done, setDone] = useState(store.load)
  const [index, setIndex] = useState(() => nextIdea(store.load()) ?? 0)
  return <Idea key={index} index={index} done={done} tabs={tabs} onTab={onTab} onFree={onFree} onPick={setIndex}
    onFinish={() => { const next = { ...done, [LESSONS[index].id]: true }; setDone(next); store.save(next) }} />
}

function Idea({ index, done, tabs, onTab, onFree, onFinish, onPick }) {
  const lesson = LESSONS[index]
  const shapes = useMemo(() => lesson.shapes(), [lesson])
  const [stage, setStage] = useState('predict')
  const [pick, setPick] = useState(null)
  const [angle, setAngle] = useState(lesson.angle.start)
  const talk = useIdeaChat(lesson.explain, onFinish)

  const run = useMemo(() => runLesson(lesson, angle, shapes), [lesson, angle, shapes])
  const atStart = useMemo(() => runLesson(lesson, lesson.angle.start, shapes), [lesson, shapes])
  const truth = useMemo(() => lesson.outcome(atStart), [lesson, atStart]) // what the light really did for the guess
  const rays = useMemo(() => (stage === 'predict' ? [] : traceBeam(shapes, run.start, run.dir, { lams: LIGHTS[lesson.light].lams, minI: 0.01 })), [stage, shapes, run, lesson])
  const first = bendingEvent(run.events)
  const now = lesson.light === 'white' ? null : bendOf(first)

  // each new step starts at the top of the panel, wherever the student had scrolled to
  const topRef = useRef(null)
  useEffect(() => { topRef.current?.closest('.st-panel-scroll')?.scrollTo({ top: 0 }) }, [stage])

  const { ref } = useCanvas((ctx, w, h) => {
    const hit = bendingEvent(run.events) ?? run.events[0]
    paintBench(ctx, w, h, {
      shapes, rays, first: stage === 'predict' ? [] : run.events, angles: stage !== 'predict' && lesson.light !== 'white', light: lesson.light, box: run.box, handle: false,
      upTo: stage === 'predict' && hit ? { from: run.start, to: hit.at, normal: hit.normal } : null,
    })
  }, [run, rays, stage, shapes, lesson])

  const nextIndex = LESSONS.findIndex((l, i) => i > index && !done[l.id])
  let body
  if (stage === 'predict') {
    body = <IdeaPredict question={lesson.question} options={lesson.options} pick={pick} onPick={setPick} note={lesson.note} icon={o => <BendIcon kind={o.id} />} go="Shine the light" onGo={() => setStage('try')} />
  } else if (stage === 'try') {
    body = (
      <>
        <IdeaVerdict right={pick === truth} told={lesson.told[truth]} />
        <Slider label={lesson.angle.label} value={angle} display={`${angle.toFixed(0)}°`} min={lesson.angle.min} max={lesson.angle.max} step={1} onChange={setAngle} />
        <p className="st-muted st-small">{lesson.angle.hint}</p>
        {lesson.light !== 'white' && first && (
          <div className="st-idea-readings">
            <div><span>angle in, i</span><b className="st-num">{first.i.toFixed(1)}°</b></div>
            <div><span>{first.entering ? 'inside, r' : 'out in air, r'}</span><b className="st-num">{first.tir ? 'no way out' : `${first.r.toFixed(1)}°`}</b></div>
          </div>
        )}
        {now && now !== truth && <p className="st-muted st-small">Now: {lesson.told[now] ?? ''}</p>}
        <button className="st-btn st-btn-primary st-idea-go" onClick={() => { setStage('explain'); talk.start() }}>Next: why does it happen?</button>
      </>
    )
  } else {
    body = <IdeaChat steps={lesson.explain} talk={talk} index={index} title={lesson.title} nextTitle={LESSONS[nextIndex]?.title} onNext={() => onPick(nextIndex)} onFree={onFree} />
  }

  const panel = (
    <>
      <IdeaHead index={index} count={LESSONS.length} title={lesson.title} stage={stage} onFree={onFree} headRef={topRef} />
      <div className="st-step-body">{body}</div>
      <IdeaList lessons={LESSONS} done={done} index={index} onPick={onPick} />
    </>
  )
  return (
    <ExperimentShell code="Class 10 · Light" title="Light" tabs={tabs} tab="explore" onTab={onTab} panel={panel}>
      <div className="st-circ is-bare">
        <div><canvas ref={ref} className="st-fill" role="img" aria-label={stage === 'predict' ? 'A ray of light stopped where it meets the glass' : 'The ray of light going through the glass'} /></div>
      </div>
    </ExperimentShell>
  )
}
