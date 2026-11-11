/**
 * VISIORA Studio — the pieces of a guided idea (Predict → Try → Explain), shared by every
 * experiment: the step bar, the picture choices, the honest verdict and the tutor chat, where
 * the tutor asks first, a wrong answer earns a clue, and the right one moves the idea on.
 */
import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Icon } from './Shell'

export const IDEA_STAGES = [['predict', 'Predict'], ['try', 'Try'], ['explain', 'Explain']]

export function ideaStore(key) {
  return {
    load: () => { try { return JSON.parse(localStorage.getItem(key)) || {} } catch { return {} } },
    save: done => { try { localStorage.setItem(key, JSON.stringify(done)) } catch { /* private mode */ } },
  }
}
/** The first idea not yet finished, or null when all are done. */
export const nextIdea = (lessons, done) => { const i = lessons.findIndex(l => !done[l.id]); return i < 0 ? null : i }

/** The panel header: which idea, the three steps, and a way out to free play. */
export function IdeaHead({ index, count, title, stage, onFree, headRef }) {
  const at = IDEA_STAGES.findIndex(([id]) => id === stage)
  return (
    <div className="st-stephead" ref={headRef}>
      <div className="st-stephead-top">
        <span className="st-label">Idea {index + 1} of {count} · {title}</span>
        <button className="st-linkbtn st-idea-skip" onClick={onFree}>Free play</button>
      </div>
      <ol className="st-idea-stages" aria-label="Steps">
        {IDEA_STAGES.map(([id, label], i) => <li key={id} className={i < at ? 'is-done' : i === at ? 'is-on' : ''} aria-current={i === at ? 'step' : undefined}>{label}</li>)}
      </ol>
    </div>
  )
}

/** Predict: the question, the choices (each with a small picture), and the go button. */
export function IdeaPredict({ question, options, pick, onPick, note, icon, go = 'Try it', onGo }) {
  return (
    <>
      <h2 className="st-idea-q">{question}</h2>
      <div className="st-idea-options" role="radiogroup" aria-label="Your prediction">
        {options.map(o => (
          <button key={o.id} type="button" role="radio" aria-checked={pick === o.id} className={pick === o.id ? 'is-on' : ''} onClick={() => onPick(o.id)}>
            {o.swatch ? <span className="st-idea-swatch" style={{ background: o.swatch }} aria-hidden="true" /> : icon?.(o)}
            {o.label}
          </button>
        ))}
      </div>
      {note && <p className="st-muted">{note}</p>}
      <button className="st-btn st-btn-primary st-idea-go" disabled={!pick} onClick={onGo}>{pick ? go : 'Pick one first'}</button>
    </>
  )
}

/** Try: whether the guess was right, told plainly from what really happened. */
export function IdeaVerdict({ right, told }) {
  return (
    <div className={`st-idea-result ${right ? 'is-right' : ''}`} role="status">
      <span className="st-idea-mark" aria-hidden="true"><Icon name={right ? 'check' : 'arrow'} /></span>
      <div><b>{right ? 'You were right' : 'Not quite'}</b><span>{told}</span></div>
    </div>
  )
}

/** Explain: the tutor's questions and the student's taps, until every step has its right answer. */
export function useIdeaChat(steps, onFinish) {
  const [chat, setChat] = useState([])
  const [step, setStep] = useState(0)
  const [finished, setFinished] = useState(false)
  const start = () => { setChat([{ who: 'tutor', text: steps[0].ask }]); setStep(0); setFinished(false) }
  const answer = a => {
    const said = [...chat, { who: 'me', text: a.label }, { who: 'tutor', text: a.reply }]
    if (!a.right) { setChat(said); return }
    if (step + 1 < steps.length) { setChat([...said, { who: 'tutor', text: steps[step + 1].ask }]); setStep(step + 1) } else { setChat(said); setFinished(true); onFinish() }
  }
  return { chat, step, finished, start, answer }
}

export function IdeaChat({ steps, talk, index, title, nextTitle, onNext, onFree }) {
  const navigate = useNavigate()
  const [own, setOwn] = useState('')
  const ask = e => { e.preventDefault(); if (own.trim()) navigate(`/ai-tutor?ask=${encodeURIComponent(own.trim())}`) }
  return (
    <>
      <div className="st-idea-chat" aria-live="polite">
        {talk.chat.map((m, i) => (
          <div key={i} className={`st-bubble is-${m.who}`}>
            {m.who === 'tutor' && <img src="/logo-96.png" alt="Tutor" width="26" height="26" />}
            <p>{m.text}</p>
          </div>
        ))}
      </div>
      {!talk.finished ? (
        <div className="st-idea-answers" role="group" aria-label="Your answer">
          {steps[talk.step].answers.map(a => <button key={a.label} type="button" onClick={() => talk.answer(a)}>{a.label}</button>)}
        </div>
      ) : (
        <div className="st-idea-done">
          <p className="st-done"><Icon name="check" />Idea {index + 1} done: {title}</p>
          <div className="st-row">
            {nextTitle && <button className="st-btn st-btn-primary" onClick={onNext}>Next idea: {nextTitle}</button>}
            <button className="st-btn st-btn-secondary" onClick={onFree}>Free play</button>
          </div>
        </div>
      )}
      <form className="st-idea-ask" onSubmit={ask}>
        <label className="st-sr" htmlFor="idea-ask">Ask your own question</label>
        <input id="idea-ask" value={own} onChange={e => setOwn(e.target.value)} placeholder="Or ask your own question" />
        <button type="submit" className="st-btn st-btn-primary" aria-label="Ask the tutor"><Icon name="arrow" /></button>
      </form>
    </>
  )
}

/** All the ideas as chips, ticked when done. */
export function IdeaList({ lessons, done, index, onPick }) {
  return (
    <div className="st-idea-list">
      {lessons.map((l, i) => <button key={l.id} className={`st-chip ${i === index ? 'is-on' : ''}`} onClick={() => onPick(i)}>{done[l.id] ? '✓ ' : ''}{l.title}</button>)}
    </div>
  )
}
