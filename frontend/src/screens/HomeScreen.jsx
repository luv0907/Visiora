/**
 * VISIORA — Home ("Sticker Notebook" design)
 * Hero, today's mission, the exact-physics labs (with saved challenge
 * progress), every 3D experiment and 2D visualisation (including ones added
 * from the admin portal), an AI tutor teaser and the latest blog posts.
 */
import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, ArrowRight, Play, Flame, Sparkles, Star, Gauge, Package, Orbit, Flashlight, Zap, LineChart } from 'lucide-react'
import { useProgressStore } from '../store/useProgressStore'
import { useUIStore } from '../store/useUIStore'
import { useAuthStore } from '../store/useAuthStore'
import { useAdminStore } from '../store/useAdminStore'
import { useLabStore } from '../store/useLabStore'
import { SCENE_META } from '../config/physics'
import { LAB_GROUPS } from '../data/labCatalog'
import LabIcon from '../components/common/LabIcon'
import './home.css'

const ICONS = { Gauge, Package, Orbit, Flashlight, Zap, LineChart }
const CARD_COLORS = ['var(--sky)', 'var(--tangerine)', 'var(--grape)', 'var(--bubblegum)', 'var(--sunflower)']
const CORE_3D = ['projectile', 'gravity', 'pendulum', 'buoyancy', 'collision']

const matches = (q, ...fields) => !q || fields.some(f => String(f || '').toLowerCase().includes(q))

export default function HomeScreen() {
  const navigate = useNavigate()
  const profile = useProgressStore(s => s.profile)
  const user = useAuthStore(s => s.user)
  const experiments = useAdminStore(s => s.experiments)
  const visualizations = useAdminStore(s => s.visualizations)
  const won = useLabStore(s => s.won)
  const [query, setQuery] = useState('')
  const [posts, setPosts] = useState([])

  const q = query.trim().toLowerCase()
  const firstName = (profile?.name && profile.name !== 'Scholar' ? profile.name : user?.displayName || '').split(' ')[0]
  const streak = profile?.streak || 1

  // Latest articles from the static blog (absent in local dev — then the row hides).
  useEffect(() => {
    let alive = true
    fetch('/blog/posts.json')
      .then(r => (r.ok && r.headers.get('content-type')?.includes('json') ? r.json() : []))
      .then(list => { if (alive && Array.isArray(list)) setPosts(list.slice(0, 3)) })
      .catch(() => {})
    return () => { alive = false }
  }, [])

  const doneFor = lab => Math.min(lab.challenges, (won[lab.id] || []).length)
  const mission = useMemo(() => {
    for (const g of LAB_GROUPS) for (const lab of g.labs) if (lab.challenges && doneFor(lab) < lab.challenges) return lab
    return null
  }, [won]) // eslint-disable-line react-hooks/exhaustive-deps

  const labGroups = LAB_GROUPS.map(g => ({ ...g, labs: g.labs.filter(l => matches(q, l.title, l.topic, l.chapter)) })).filter(g => g.labs.length)

  const labs3D = useMemo(() => {
    const core = Object.values(SCENE_META)
    const custom = (experiments || [])
      .filter(e => e.type === '3d' && !CORE_3D.includes(e.id) && e.id !== 'ohmslaw' && e.isActive !== false)
      .map(e => ({ id: e.id, label: e.title, badge: e.badge || '3D lab', description: e.subtitle || e.category, formula: e.formula || '' }))
    return [...core, ...custom]
  }, [experiments])
  const shown3D = labs3D.filter(l => matches(q, l.label, l.badge, l.description, l.formula))
  const showUnity = matches(q, "ohm's law", 'ohms law', 'electricity', 'circuit', 'resistor', 'virtual lab', 'unity')

  const shown2D = (visualizations || [])
    .filter(v => v.isActive !== false)
    .filter(v => matches(q, v.title, v.subtitle, v.category, v.badge))

  const open3D = id => {
    if (CORE_3D.includes(id)) {
      useUIStore.getState().setActiveLab(id)
      navigate('/sim')
    } else {
      navigate(`/lab/${id}`)
    }
  }
  const open2D = v => navigate(v.internalPath || `/sim-2d?lab=${v.id.replace('vis-', '').replace('phet-', '')}`)

  const nothing = q && !labGroups.length && !shown3D.length && !shown2D.length && !showUnity

  return (
    <div className="hm nb-paper">
      {/* Phone header (the desktop top bar is hidden below 1024px) */}
      <div className="hm-mobilebar">
        <span className="hm-foot-brand"><img src="/images/visiora_lotus_logo.png" alt="" width="34" height="34" /> visiora</span>
        <span className="stk-chip hm-streak"><Flame size={15} strokeWidth={2.5} fill="var(--tangerine)" /> {streak} days</span>
      </div>
      {/* Hero */}
      <section className="hm-wrap hm-hero">
        <div className="hm-hero-copy">
          <p className="hand hm-note">{firstName ? `hey ${firstName}, ready to play?` : 'psst… physics is actually fun →'}</p>
          <h1 className="hm-title">Physics you can <span className="swash">play</span> with.</h1>
          <p className="hm-lede">Drop things on the Moon, bend lasers through diamonds, wire up circuits. Every number comes from the real equations.</p>
          <div className="hm-cta">
            <a className="stk-btn is-pink" href="#labs"><Play size={18} strokeWidth={3} fill="currentColor" /> Open a lab</a>
            <button className="stk-btn" onClick={() => navigate('/ai-tutor')}><Sparkles size={18} strokeWidth={2.75} /> Ask the AI tutor</button>
          </div>
          <p className="hm-facts"><span>Class 8–10</span><span aria-hidden="true">✶</span><span>CBSE &amp; ICSE</span><span aria-hidden="true">✶</span><span>Free</span></p>
        </div>

        <div className="hm-collage" aria-hidden="true">
          <div className="stk hm-poster">
            <svg viewBox="0 0 330 380" className="hm-poster-art">
              <path d="M40 60 h250" stroke="var(--ink)" strokeWidth="5" strokeLinecap="round" />
              <g fill="var(--sunflower)" stroke="var(--ink)" strokeWidth="3">
                <circle cx="110" cy="80" r="14" opacity=".25" /><circle cx="110" cy="110" r="14" opacity=".35" /><circle cx="110" cy="160" r="14" opacity=".5" /><circle cx="110" cy="235" r="20" />
              </g>
              <g fill="var(--bubblegum)" stroke="var(--ink)" strokeWidth="3">
                <circle cx="220" cy="80" r="14" opacity=".25" /><circle cx="220" cy="108" r="14" opacity=".35" /><circle cx="220" cy="152" r="14" opacity=".5" /><circle cx="220" cy="215" r="20" />
              </g>
              <path d="M30 345 q150 -14 270 0" stroke="var(--ink)" strokeWidth="4" fill="none" strokeLinecap="round" />
            </svg>
            <span className="hm-poster-label">FREE FALL</span>
          </div>
          <div className="tape" style={{ left: 170, top: 6, transform: 'rotate(-8deg)' }} />
          <div className="stk formula hm-f1">F = ma</div>
          <div className="stk formula hm-f2">v = u + at</div>
          <div className="stk hm-bolt"><Zap size={56} strokeWidth={2} fill="var(--tangerine)" /></div>
          <p className="hand hm-which">which lands first??</p>
        </div>
      </section>

      {/* Mission + search */}
      <section className="hm-wrap hm-row">
        {mission && (
          <div className="stk hm-mission">
            <div className="tape" style={{ left: 36, top: -14, transform: 'rotate(-3deg)' }} />
            <span className="hm-mission-icon">{React.createElement(ICONS[mission.icon] || Star, { size: 30, strokeWidth: 2.5 })}</span>
            <div className="hm-mission-text">
              <span className="hm-kicker">Today's mission</span>
              <span className="hm-mission-title">{mission.title}: finish all {mission.challenges} challenges</span>
              <span className="hm-mission-sub">{doneFor(mission)} of {mission.challenges} done · {mission.chapter}</span>
            </div>
            <button className="stk-btn is-sun" onClick={() => navigate(mission.path)}>Play mission</button>
          </div>
        )}
        <label className="stk hm-search">
          <Search size={20} strokeWidth={2.75} aria-hidden="true" />
          <span className="sr-only">Search labs and topics</span>
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search a topic — gravity, circuits, light…" />
        </label>
      </section>

      {nothing && <p className="hm-wrap hand hm-empty">nothing matches "{query}" — try another word ✶</p>}

      {/* Exact-physics labs */}
      {labGroups.length > 0 && (
        <section id="labs" className="hm-wrap hm-section">
          <div className="hm-head">
            <h2>Pick a lab</h2>
            <p className="hand">every number is real maths ✓</p>
          </div>
          {labGroups.map((g, gi) => (
            <div key={g.id} className="hm-group">
              <h3 className="stk-tag" style={{ transform: `rotate(${gi % 2 ? 1 : -1.5}deg)` }}>{g.title.toUpperCase()}</h3>
              <div className="hm-grid">
                {g.labs.map((lab, i) => {
                  const Icon = ICONS[lab.icon] || Star
                  const d = doneFor(lab)
                  return (
                    <a key={lab.id} className="stk hm-card" href={lab.path} onClick={e => { e.preventDefault(); navigate(lab.path) }}
                      style={{ background: CARD_COLORS[(gi * 2 + i) % CARD_COLORS.length], transform: `rotate(${i % 2 ? 1.2 : -1.4}deg)` }}>
                      <Icon size={44} strokeWidth={2.2} aria-hidden="true" />
                      <span className="hm-card-title">{lab.title}</span>
                      <span className="hm-card-text">{lab.topic}</span>
                      <span className="hm-card-meta">
                        {lab.challenges ? (d === lab.challenges ? `★ ${d}/${lab.challenges} — done!` : `${'★'.repeat(d)}${'☆'.repeat(lab.challenges - d)} ${d}/${lab.challenges}`) : 'Free play'}
                      </span>
                    </a>
                  )
                })}
              </div>
            </div>
          ))}
        </section>
      )}

      {/* 3D experiments */}
      {(shown3D.length > 0 || showUnity) && (
        <section className="hm-wrap hm-section">
          <div className="hm-head">
            <h2>3D experiments</h2>
            <p className="hand">spin them around!</p>
          </div>
          <div className="hm-grid">
            {showUnity && (
              <button className="stk hm-card hm-card-dark" onClick={() => navigate('/virtual-lab')} style={{ transform: 'rotate(-1deg)' }}>
                <LabIcon id="ohmslaw" size={44} strokeWidth={2} />
                <span className="hm-card-title">Walk-in Circuit Lab</span>
                <span className="hm-card-text">Step into a 3D lab and wire a real Ohm's law bench.</span>
                <span className="hm-card-meta">Virtual lab · Class 10</span>
              </button>
            )}
            {shown3D.map((lab, i) => (
              <button key={lab.id} className="stk hm-card" onClick={() => open3D(lab.id)}
                style={{ background: '#FFFFFF', transform: `rotate(${i % 2 ? -1 : 1}deg)` }}>
                <LabIcon id={lab.id} name={lab.label} size={44} strokeWidth={2} />
                <span className="hm-card-title">{lab.label}</span>
                <span className="hm-card-text">{lab.description}</span>
                <span className="hm-card-meta formula">{lab.formula || lab.badge}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* 2D visualisations */}
      {shown2D.length > 0 && (
        <section className="hm-wrap hm-section">
          <div className="hm-head">
            <h2>2D visualisations</h2>
          </div>
          <div className="hm-grid">
            {shown2D.map((v, i) => (
              <button key={v.id} className="stk hm-card" onClick={() => open2D(v)}
                style={{ background: i % 2 ? 'var(--paper-deep)' : '#FFFFFF', transform: `rotate(${i % 2 ? 1 : -1}deg)` }}>
                <LabIcon id={v.id} name={v.title} size={40} strokeWidth={2} />
                <span className="hm-card-title">{v.title}</span>
                <span className="hm-card-text">{v.subtitle || v.category}</span>
                {v.badge && <span className="hm-card-meta">{v.badge}</span>}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* AI tutor */}
      {!q && (
        <section className="hm-wrap hm-tutor">
          <div>
            <p className="hand hm-note">stuck on homework?</p>
            <h2 className="hm-title hm-title-sm">Ask anything. Get it <span className="swash" style={{ background: 'var(--sky)', transform: 'rotate(1.5deg)' }}>checked.</span></h2>
            <p className="hm-lede">The AI tutor explains step by step, and Visiora's physics engine double-checks every number before you see it.</p>
            <button className="stk-btn is-sun" onClick={() => navigate('/ai-tutor')}>Open the AI tutor <ArrowRight size={18} strokeWidth={3} /></button>
          </div>
          <div className="hm-chat" aria-hidden="true">
            <div className="stk hm-bubble-q">A stone is dropped from 19.6 m. How long does it take to land?</div>
            <div className="stk hm-bubble-a">
              <span className="hm-kicker">Free fall</span>
              <span className="formula">t = √(2h ÷ g) = √(2 × 19.6 ÷ 9.8)</span>
              <span className="formula">t = <mark>2 s</mark></span>
              <span className="hm-stamp">✓ engine checked</span>
            </div>
          </div>
        </section>
      )}

      {/* Blog */}
      {!q && posts.length > 0 && (
        <section className="hm-wrap hm-section">
          <div className="hm-head">
            <h2>From the notebook</h2>
            <a href="/blog" className="hm-more">All articles <ArrowRight size={16} strokeWidth={3} /></a>
          </div>
          <div className="hm-grid hm-grid-3">
            {posts.map(p => (
              <a key={p.slug} className="stk hm-post" href={`/blog/${p.slug}`}>
                <span className="stk-chip">{(p.keywords?.[0] || 'Physics').slice(0, 28)}</span>
                <span className="hm-post-title">{p.title}</span>
                <span className="hm-card-text">{p.description}</span>
              </a>
            ))}
          </div>
        </section>
      )}

      <footer className="hm-wrap hm-foot">
        <span className="hm-foot-brand"><img src="/images/visiora_lotus_logo.png" alt="" width="32" height="32" /> visiora</span>
        <span className="hand">made for curious minds ✶</span>
        <span className="hm-foot-streak"><Flame size={16} strokeWidth={2.75} /> {streak}-day streak</span>
      </footer>
    </div>
  )
}
