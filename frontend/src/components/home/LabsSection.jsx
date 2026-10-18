/**
 * VISIORA — LabsSection
 * Home's grid of interactive labs, grouped by class, with each student's
 * saved challenge progress.
 */
import React from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowUpRight, Gauge, Package, Orbit, Flashlight, Zap, LineChart, CheckCircle2 } from 'lucide-react'
import { LAB_GROUPS } from '../../data/labCatalog'
import { useLabStore } from '../../store/useLabStore'
import './labs-section.css'

const ICONS = { Gauge, Package, Orbit, Flashlight, Zap, LineChart }

export default function LabsSection() {
  const navigate = useNavigate()
  const won = useLabStore(s => s.won)

  const doneFor = lab => Math.min(lab.challenges, (won[lab.id] || []).length)
  const all = LAB_GROUPS.flatMap(g => g.labs)
  const total = all.reduce((s, l) => s + l.challenges, 0)
  const done = all.reduce((s, l) => s + doneFor(l), 0)

  return (
    <section id="labs-section" className="lb-section" aria-labelledby="labs-title">
      <header className="lb-head">
        <div>
          <h2 id="labs-title">Interactive labs</h2>
          <p>Play with real experiments. Every number is calculated live from the real equations.</p>
        </div>
        <div className="lb-total" aria-label={`${done} of ${total} challenges complete`}>
          <b>{done}<span>/{total}</span></b>
          <small>challenges done</small>
          <i style={{ '--pct': `${total ? (done / total) * 100 : 0}%` }} />
        </div>
      </header>

      {LAB_GROUPS.map(group => (
        <div key={group.id} className="lb-group">
          <h3>{group.title}</h3>
          <div className="lb-grid">
            {group.labs.map(lab => {
              const Icon = ICONS[lab.icon] || Gauge
              const d = doneFor(lab)
              const complete = lab.challenges > 0 && d === lab.challenges
              return (
                <button key={lab.id} className="lb-card" style={{ '--c': lab.color }} onClick={() => navigate(lab.path)}>
                  <div className="lb-card-top">
                    <span className="lb-icon"><Icon size={22} strokeWidth={2.4} /></span>
                    <span className="lb-chapter">{lab.chapter}</span>
                  </div>
                  <span className="lb-title">{lab.title}</span>
                  <span className="lb-topic">{lab.topic}</span>
                  <div className="lb-foot">
                    {lab.challenges > 0 ? (
                      <span className={`lb-progress ${complete ? 'is-done' : ''}`}>
                        {complete ? (
                          <><CheckCircle2 size={15} strokeWidth={2.75} /> All challenges done</>
                        ) : (
                          <>
                            <span className="lb-dots" aria-hidden="true">
                              {Array.from({ length: lab.challenges }, (_, i) => <i key={i} className={i < d ? 'on' : ''} />)}
                            </span>
                            {d === 0 ? `${lab.challenges} challenges` : `${d}/${lab.challenges} challenges`}
                          </>
                        )}
                      </span>
                    ) : (
                      <span className="lb-progress">Free play</span>
                    )}
                    <span className="lb-go">
                      {d === 0 || lab.challenges === 0 ? 'Open' : complete ? 'Play again' : 'Continue'}
                      <ArrowUpRight size={15} strokeWidth={2.5} />
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </section>
  )
}
