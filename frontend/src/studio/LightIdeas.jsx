/**
 * VISIORA Studio — guided ideas on the light bench: Predict → Try → Explain.
 * Predict: the ray stops at the glass and the student commits to a guess.
 * Try: the light goes through; whether the guess was right comes from the ray tracer, and a
 * slider lets them tilt the light and watch the angles. Explain: the tutor asks why, offers
 * answers to tap, and nudges with a clue (never a telling-off) until the idea lands.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCanvas } from '../components/motion/useCanvas'
import { LIGHTS, traceBeam } from '../engine/raybench'
import { LESSONS, bendOf, bendingEvent, runLesson } from '../engine/lightLessons'
import { paintBench } from './lightDraw'
import { ExperimentShell, Icon, Slider } from './Shell'

const DONE_KEY = 'visiora.light.ideas'
export function loadIdeas() { try { return JSON.parse(localStorage.getItem(DONE_KEY)) || {} } catch { return {} } }
/** The first idea not yet finished, or null when all are done. */
export const nextIdea = done => { const i = LESSONS.findIndex(l => !done[l.id]); return i < 0 ? null : i }
const STAGES = [['predict', 'Predict'], ['try', 'Try'], ['explain', 'Explain']]

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
  const [done, setDone] = useState(loadIdeas)
  const [index, setIndex] = useState(() => nextIdea(loadIdeas()) ?? 0)
  return <Idea key={index} index={index} done={done} tabs={tabs} onTab={onTab} onFree={onFree}
    onFinish={() => { const next = { ...done, [LESSONS[index].id]: true }; setDone(next); try { localStorage.setItem(DONE_KEY, JSON.stringify(next)) } catch { /* private mode */ } }}
    onPick={setIndex} />
}

function Idea({ index, done, tabs, onTab, onFree, onFinish, onPick }) {
  const navigate = useNavigate()
  const lesson = LESSONS[index]
  const shapes = useMemo(() => lesson.shapes(), [lesson])
  const [stage, setStage] = useState('predict')
  const [pick, setPick] = useState(null)
  const [angle, setAngle] = useState(lesson.angle.start)
  const [chat, setChat] = useState([])
  const [step, setStep] = useState(0)
  const [finished, setFinished] = useState(false)
  const [own, setOwn] = useState('')

  const run = useMemo(() => runLesson(lesson, angle, shapes), [lesson, angle, shapes])
  const atStart = useMemo(() => runLesson(lesson, lesson.angle.start, shapes), [lesson, shapes])
  const truth = useMemo(() => lesson.outcome(atStart), [lesson, atStart]) // what the light really did for the guess
  const rays = useMemo(() => (stage === 'predict' ? [] : traceBeam(shapes, run.start, run.dir, { lams: LIGHTS[lesson.light].lams, minI: 0.01 })), [stage, shapes, run, lesson])
  const first = bendingEvent(run.events)
  const now = lesson.light === 'white' ? null : bendOf(first)

  // each new step starts at the top of the panel, wherever the student had scrolled to
  const topRef = useRef(null)
  useEffect(() => { topRef.current?.closest('.st-panel-scroll')?.scrollTo({ top: 0 }) }, [stage])

  const viewRef = useRef(null)
  const { ref } = useCanvas((ctx, w, h) => {
    const hit = run.events[0]
    viewRef.current = paintBench(ctx, w, h, {
      shapes, rays, first: stage === 'predict' ? [] : run.events, angles: stage !== 'predict' && lesson.light !== 'white', light: lesson.light, box: run.box, handle: false,
      upTo: stage === 'predict' && hit ? { from: run.start, to: (bendingEvent(run.events) ?? hit).at, normal: (bendingEvent(run.events) ?? hit).normal } : null,
    })
  }, [run, rays, stage, shapes, lesson])

  const shine = () => { setStage('try') }
  const toExplain = () => { setStage('explain'); setChat([{ who: 'tutor', text: lesson.explain[0].ask }]) }
  const answer = a => {
    const said = [...chat, { who: 'me', text: a.label }, { who: 'tutor', text: a.reply }]
    if (!a.right) { setChat(said); return }
    const nextStep = step + 1
    if (nextStep < lesson.explain.length) { setChat([...said, { who: 'tutor', text: lesson.explain[nextStep].ask }]); setStep(nextStep) }
    else { setChat(said); setFinished(true); onFinish() }
  }
  const askTutor = e => { e.preventDefault(); if (own.trim()) navigate(`/ai-tutor?ask=${encodeURIComponent(own.trim())}`) }

  const stageIndex = STAGES.findIndex(([id]) => id === stage)
  const nextIndex = LESSONS.findIndex((l, i) => i > index && !done[l.id] && l.id !== lesson.id)
  let body
  if (stage === 'predict') {
    body = (
      <>
        <h2 className="st-idea-q">{lesson.question}</h2>
        <div className="st-idea-options" role="radiogroup" aria-label="Your prediction">
          {lesson.options.map(o => (
            <button key={o.id} type="button" role="radio" aria-checked={pick === o.id} className={pick === o.id ? 'is-on' : ''} onClick={() => setPick(o.id)}>
              {o.swatch ? <span className="st-idea-swatch" style={{ background: o.swatch }} aria-hidden="true" /> : <BendIcon kind={o.id} />}
              {o.label}
            </button>
          ))}
        </div>
        <p className="st-muted">{lesson.note}</p>
        <button className="st-btn st-btn-primary st-idea-go" disabled={!pick} onClick={shine}>{pick ? 'Shine the light' : 'Pick one first'}</button>
      </>
    )
  } else if (stage === 'try') {
    const right = pick === truth
    body = (
      <>
        <div className={`st-idea-result ${right ? 'is-right' : ''}`} role="status">
          <span className="st-idea-mark" aria-hidden="true"><Icon name={right ? 'check' : 'arrow'} /></span>
          <div><b>{right ? 'You were right' : 'Not quite'}</b><span>{lesson.told[truth]}</span></div>
        </div>
        <Slider label={lesson.angle.label} value={angle} display={`${angle.toFixed(0)}°`} min={lesson.angle.min} max={lesson.angle.max} step={1} onChange={setAngle} />
        <p className="st-muted st-small">{lesson.angle.hint}</p>
        {lesson.light !== 'white' && first && (
          <div className="st-idea-readings">
            <div><span>angle in, i</span><b className="st-num">{first.i.toFixed(1)}°</b></div>
            <div><span>{first.entering ? 'inside, r' : 'out in air, r'}</span><b className="st-num">{first.tir ? 'no way out' : `${first.r.toFixed(1)}°`}</b></div>
          </div>
        )}
        {now && now !== truth && <p className="st-muted st-small">Now: {lesson.told[now] ?? ''}</p>}
        <button className="st-btn st-btn-primary st-idea-go" onClick={toExplain}>Next: why does it happen?</button>
      </>
    )
  } else {
    body = (
      <>
        <div className="st-idea-chat" aria-live="polite">
          {chat.map((m, i) => (
            <div key={i} className={`st-bubble is-${m.who}`}>
              {m.who === 'tutor' && <img src="/logo-96.png" alt="Tutor" width="26" height="26" />}
              <p>{m.text}</p>
            </div>
          ))}
        </div>
        {!finished ? (
          <div className="st-idea-answers" role="group" aria-label="Your answer">
            {lesson.explain[step].answers.map(a => <button key={a.label} type="button" onClick={() => answer(a)}>{a.label}</button>)}
          </div>
        ) : (
          <div className="st-idea-done">
            <p className="st-done"><Icon name="check" />Idea {index + 1} done: {lesson.title}</p>
            <div className="st-row">
              {nextIndex >= 0 && <button className="st-btn st-btn-primary" onClick={() => onPick(nextIndex)}>Next idea: {LESSONS[nextIndex].title}</button>}
              <button className="st-btn st-btn-secondary" onClick={onFree}>Free play</button>
            </div>
          </div>
        )}
        <form className="st-idea-ask" onSubmit={askTutor}>
          <label className="st-sr" htmlFor="idea-ask">Ask your own question</label>
          <input id="idea-ask" value={own} onChange={e => setOwn(e.target.value)} placeholder="Or ask your own question" />
          <button type="submit" className="st-btn st-btn-primary" aria-label="Ask the tutor"><Icon name="arrow" /></button>
        </form>
      </>
    )
  }

  const panel = (
    <>
      <div className="st-stephead" ref={topRef}>
        <div className="st-stephead-top">
          <span className="st-label">Idea {index + 1} of {LESSONS.length} · {lesson.title}</span>
          <button className="st-linkbtn st-idea-skip" onClick={onFree}>Free play</button>
        </div>
        <ol className="st-idea-stages" aria-label="Steps">
          {STAGES.map(([id, label], i) => <li key={id} className={i < stageIndex ? 'is-done' : i === stageIndex ? 'is-on' : ''} aria-current={i === stageIndex ? 'step' : undefined}>{label}</li>)}
        </ol>
      </div>
      <div className="st-step-body">{body}</div>
      <div className="st-idea-list">
        {LESSONS.map((l, i) => (
          <button key={l.id} className={`st-chip ${i === index ? 'is-on' : ''}`} onClick={() => onPick(i)}>{done[l.id] ? '✓ ' : ''}{l.title}</button>
        ))}
      </div>
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
