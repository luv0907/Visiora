/**
 * VISIORA Studio — the home page: continue where you left off, then every experiment by
 * chapter, like a game's level select.
 */
import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { isGuestUser, useAuthStore } from '../store/useAuthStore'
import { useUIStore } from '../store/useUIStore'
import { CHAPTERS, findExperiment, lastExperiment, rememberExperiment } from './catalog'
import { drawFigure } from './drawings'
import { Icon, TopBar } from './Shell'
import './studio.css'

function Figure({ art, width = 520, height = 240 }) {
  const ref = useRef(null)
  useEffect(() => { if (ref.current) drawFigure(ref.current, art) }, [art])
  return <canvas ref={ref} width={width} height={height} aria-hidden="true" />
}

const greeting = () => {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}

export default function StudioHome() {
  const navigate = useNavigate()
  const user = useAuthStore(s => s.user)
  const setActiveLab = useUIStore(s => s.setActiveLab)
  const [grade, setGrade] = useState('all')
  const next = lastExperiment() ?? findExperiment('pendulum')
  const firstName = isGuestUser(user) ? null : user?.displayName?.split(/\s+/)[0]

  const open = exp => {
    rememberExperiment(exp.id)
    if (exp.simLab) setActiveLab(exp.simLab)
    navigate(exp.path)
  }
  const chapters = CHAPTERS.filter(c => grade === 'all' || c.grade === grade)
  const count = CHAPTERS.reduce((n, c) => n + c.items.length, 0)

  return (
    <div className="studio">
      <TopBar active="experiments" />
      <main className="st-home">
        <p className="st-greet">{greeting()}{firstName ? `, ${firstName}` : ''}</p>

        <section className="st-continue" aria-label="Continue">
          <Figure art={next.art} width={600} height={336} />
          <div>
            <span className="st-label">{lastExperiment() ? 'Continue' : 'Start here'} · {next.kind}</span>
            <h1>{next.name}</h1>
            <p>{next.about}</p>
          </div>
          <div className="st-actions">
            <button className="st-btn st-btn-primary" onClick={() => open(next)}>{lastExperiment() ? 'Continue' : 'Start'}<Icon name="arrow" /></button>
          </div>
        </section>

        <div className="st-section-head">
          <h2>Experiments</h2><span className="st-num">{count} experiments</span>
          <div className="st-seg" role="radiogroup" aria-label="Class">
            {[['all', 'All'], ['Class 9', 'Class 9'], ['Class 10', 'Class 10']].map(([id, label]) => (
              <button key={id} role="radio" aria-checked={grade === id} className={grade === id ? 'is-on' : ''} onClick={() => setGrade(id)}>{label}</button>
            ))}
          </div>
        </div>

        {chapters.map(c => (
          <section className="st-chapter" key={c.id} aria-label={c.title}>
            <div className="st-chapter-name">
              <span className="st-label">{c.grade}</span>
              <h3>{c.title}</h3>
              <p>{c.note}</p>
            </div>
            <div className="st-grid">
              {c.items.map(exp => (
                <button key={exp.id} className="st-card" onClick={() => open(exp)}>
                  {exp.redesigned && <span className="st-tag is-new">New</span>}
                  <Figure art={exp.art} />
                  <span className="st-card-body">
                    <strong>{exp.name}</strong>
                    <span className="st-card-meta"><span>{exp.kind === '3D' ? 'In the 3D lab' : 'Simulation'}</span></span>
                  </span>
                </button>
              ))}
            </div>
          </section>
        ))}

        <section className="st-feature" aria-label="The 3D lab">
          <img src="/images/physics-lab-preview.jpg" alt="Inside the Visiora 3D physics lab" />
          <div>
            <span className="st-label">3D lab</span>
            <h2>Step inside the physics lab</h2>
            <p>Seven experiments set up in one room, from a free fall tower to an optics bench. Pick one and the camera takes you there.</p>
            <button className="st-btn" onClick={() => navigate('/physics-lab')}>Enter the lab<Icon name="arrow" /></button>
          </div>
        </section>
      </main>
    </div>
  )
}
