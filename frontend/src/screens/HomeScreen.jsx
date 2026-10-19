/**
 * VISIORA — Home ("Storybook" design)
 * Sky hero with a cloud headline, today's mission + search, the exact-physics
 * labs (with saved challenge progress), an AI tutor band, every 3D experiment
 * and 2D visualisation (including ones added from the admin portal) and the
 * latest blog posts.
 */
import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Flame } from 'lucide-react'
import { useProgressStore } from '../store/useProgressStore'
import { useUIStore } from '../store/useUIStore'
import { useAuthStore } from '../store/useAuthStore'
import { useAdminStore } from '../store/useAdminStore'
import { useLabStore } from '../store/useLabStore'
import { SCENE_META } from '../config/physics'
import { LAB_GROUPS } from '../data/labCatalog'
import { greetingName } from '../utils/greetingName'
import './home.css'

// Characters decorate the page; concept illustrations sit on lab and experiment cards.
const ART = '/images/art/'
const CONCEPT = '/images/concepts/'
const CORE_3D = ['projectile', 'gravity', 'pendulum', 'buoyancy', 'collision']
const CONCEPT_3D = { gravity: 'freefall', projectile: 'projectile', pendulum: 'pendulum', buoyancy: 'buoyancy', collision: 'collision' }

// Best-matching illustration for an experiment added from the admin portal.
const conceptFor = lab => {
  if (CONCEPT_3D[lab.id]) return CONCEPT_3D[lab.id]
  const text = `${lab.id} ${lab.label} ${lab.badge} ${lab.description} ${lab.formula}`.toLowerCase()
  if (/ohm|circuit|resist|current|volt|electric/.test(text)) return 'circuit-lab'
  if (/wave|sound|frequen|oscillat/.test(text)) return 'waves'
  if (/light|optic|lens|mirror|refract|snell/.test(text)) return 'light'
  if (/pendul|swing/.test(text)) return 'pendulum'
  if (/projectile|launch|trajector/.test(text)) return 'projectile'
  if (/buoyan|fluid|float|archimed/.test(text)) return 'buoyancy'
  if (/collision|momentum/.test(text)) return 'collision'
  if (/gravit|fall|orbit/.test(text)) return 'gravity'
  if (/force|friction|newton/.test(text)) return 'force'
  if (/motion|velocity|speed|kinemat/.test(text)) return 'motion'
  return 'lab'
}

const matches = (q, ...fields) => !q || fields.some(f => String(f || '').toLowerCase().includes(q))

export default function HomeScreen() {
  const navigate = useNavigate()
  const profile = useProgressStore(s => s.profile)
  const user = useAuthStore(s => s.user)
  const experiments = useAdminStore(s => s.experiments)
  const visualizations = useAdminStore(s => s.visualizations)
  const won = useLabStore(s => s.won)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('All')
  const [posts, setPosts] = useState([])

  const q = query.trim().toLowerCase()
  const firstName = greetingName(profile, user)
  const streak = profile?.streak || 1

  // Latest articles from the static blog (absent in local dev — then the list hides).
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

  const allLabs = LAB_GROUPS.flatMap(g => g.labs.map(l => ({ ...l, group: g.title })))
  const labs = allLabs
    .filter(l => filter === 'All' || l.group === filter)
    .filter(l => matches(q, l.title, l.topic, l.chapter))

  const labs3D = useMemo(() => {
    const core = Object.values(SCENE_META)
    const custom = (experiments || [])
      .filter(e => e.type === '3d' && !CORE_3D.includes(e.id) && e.id !== 'ohmslaw' && e.isActive !== false)
      .map(e => ({ id: e.id, label: e.title, badge: e.badge || '3D lab', description: e.subtitle || e.category, formula: e.formula || '' }))
    return [...core, ...custom].map(l => ({ ...l, image: `${CONCEPT}${conceptFor(l)}.svg` }))
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
  const go = path => e => { e.preventDefault(); navigate(path) }

  const nothing = q && !labs.length && !shown3D.length && !shown2D.length && !showUnity

  return (
    <div className="sb">
      {/* Phone header (the desktop top bar is hidden below 1024px) */}
      <div className="sb-mobilebar">
        <span className="sb-brand"><img src="/images/visiora_lotus_logo.png" alt="" width="34" height="34" /> visiora</span>
        <span className="sb-chip"><Flame size={14} strokeWidth={2.5} color="#F08A3C" /> {streak}-day streak</span>
      </div>

      {/* Hero */}
      <section className="sb-hero">
        <span className="sb-puff" style={{ left: '46%', top: 26, width: 70, height: 26, opacity: 0.9 }} />
        <span className="sb-puff" style={{ right: '8%', top: 120, width: 90, height: 30, opacity: 0.85 }} />
        <span className="sb-puff" style={{ left: '6%', bottom: 200, width: 60, height: 22, opacity: 0.8 }} />

        <div className="sb-hero-row">
          <div className="sb-hero-left" aria-hidden="true">
            <img src={`${ART}hero-balloon.webp`} alt="" />
          </div>

          <div className="sb-cloud">
            <span className="sb-cloud-blob" />
            <span className="sb-cloud-c" style={{ left: '12%', top: 0, width: 190, height: 190 }} />
            <span className="sb-cloud-c" style={{ right: '14%', top: 12, width: 160, height: 160 }} />
            <span className="sb-cloud-c" style={{ left: -14, top: '40%', width: 130, height: 130 }} />
            <span className="sb-cloud-c" style={{ right: -12, top: '44%', width: 120, height: 120 }} />

            <div className="sb-ribbon">
              <span className="sb-ribbon-tail" />
              <span className="sb-ribbon-text">{firstName ? `hey ${firstName}, ready to play?` : 'the happy lab of'}</span>
              <span className="sb-ribbon-tail is-right" />
            </div>

            <h1 className="sb-h1">
              <span className="sb-h1-a">PHYSICS</span>
              <span className="sb-h1-b">you can</span>
              <span className="sb-h1-c">PLAY</span>
              <span className="sb-h1-d">with!</span>
            </h1>
          </div>

          <div className="sb-hero-right" aria-hidden="true">
            <img className="sb-rocket" src={`${ART}hero-rocket.webp`} alt="" />
          </div>
        </div>

        <div className="sb-hero-foot">
          <p className="sb-hero-line">Drop things on the Moon, bend lasers, wire up circuits.</p>
          <div className="sb-hero-cta">
            <a className="sb-btn is-ghost" href="#labs">Open a lab</a>
            <a className="sb-btn is-slate" href="/ai-tutor" onClick={go('/ai-tutor')}>✦ Ask the AI tutor</a>
          </div>
        </div>

        <span className="sb-ground" />
        <img className="sb-van" src={`${ART}van.png`} alt="" />
      </section>

      {/* Intro + mission + search */}
      <section className="sb-intro">
        <div className="sb-intro-text">
          <span className="sb-stitch" aria-hidden="true">✕✕✕✕✕ ✕✕</span>
          <p>Hi! I'm Visiora, a little physics playground for Class 8–10 (CBSE &amp; ICSE). Every number you see comes from the real equations, and it's free.</p>
        </div>

        <div className="sb-intro-grid">
          {mission && !q && (
            <div className="sb-mission">
              <span className="sb-tape" />
              <div className="sb-mission-text">
                <span className="sb-script">today's mission</span>
                <span className="sb-mission-title">{mission.title}: finish all {mission.challenges} challenges</span>
                <span className="sb-mission-sub">{doneFor(mission)} of {mission.challenges} done · {mission.chapter}</span>
              </div>
              <a className="sb-btn is-orange" href={mission.path} onClick={go(mission.path)}>Play mission</a>
            </div>
          )}
          <label className="sb-search">
            <Search size={22} strokeWidth={2.5} color="#6B4A2B" aria-hidden="true" />
            <span className="sr-only">Search labs and topics</span>
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search a topic, like gravity, circuits or light…" />
          </label>
        </div>
      </section>

      {/* Exact-physics labs */}
      <section id="labs" className="sb-labs">
        <span className="sb-scallop-up" />
        <div className="sb-wrap">
          <div className="sb-head has-art">
            <img className="sb-head-art is-left" src={`${ART}dino.png`} alt="" loading="lazy" />
            <span className="sb-script">every number is real maths ✓</span>
            <h2>Pick a lab &amp; start playing</h2>
            <span className="sb-rule" />
            <img className="sb-head-art is-right" src={`${ART}fox.png`} alt="" loading="lazy" />
          </div>

          <div className="sb-filters" role="group" aria-label="Filter labs">
            {['All', ...LAB_GROUPS.map(g => g.title)].map(f => (
              <button key={f} className={`sb-filter${filter === f ? ' is-on' : ''}`} aria-pressed={filter === f} onClick={() => setFilter(f)}>{f}</button>
            ))}
          </div>

          <div className="sb-lab-grid">
            {labs.map((lab, i) => {
              const d = doneFor(lab)
              const round = i % 2 === 1
              const cta = !lab.challenges ? 'Free play' : d === lab.challenges ? 'Play again' : d ? 'Continue' : 'Play now'
              return (
                <a key={lab.id} className="sb-lab" href={lab.path} onClick={go(lab.path)}>
                  <div className={`sb-frame${round ? ' is-round' : ''}`}>
                    <div className="sb-frame-in">
                      <img src={lab.image} alt={`Illustration: ${lab.topic}`} loading="lazy" />
                    </div>
                    <span className="sb-frame-badge">{lab.group}</span>
                  </div>
                  <span className="sb-lab-title">{lab.title}</span>
                  <span className="sb-lab-topic">{lab.topic}</span>
                  <span className="sb-lab-meta">
                    {lab.challenges > 0 && (
                      <span className="sb-stars" aria-label={`${d} of ${lab.challenges} challenges done`}>{'★'.repeat(d)}{'☆'.repeat(lab.challenges - d)}</span>
                    )}
                    <span className="sb-lab-cta">{cta}</span>
                  </span>
                </a>
              )
            })}
          </div>
          {nothing && (
            <div className="sb-empty">
              <img src={`${ART}monster.png`} alt="" />
              <p>nothing matches “{query}”, try another word ✶</p>
            </div>
          )}
        </div>
      </section>

      {/* AI tutor */}
      {!q && (
        <section id="tutor" className="sb-tutor">
          <span className="sb-scallop-down" />
          <div className="sb-tutor-grid">
            <div className="sb-tutor-copy">
              <div className="sb-tutor-title">
                <span className="sb-tutor-script">stuck on<br />homework?</span>
                <span className="sb-tutor-badge">AI TUTOR</span>
              </div>
              <p>Ask anything. The AI tutor explains it step by step, and Visiora's physics engine double-checks every number before you see it.</p>
              <div className="sb-tutor-cta">
                <a className="sb-btn is-ghost" href="/ai-tutor" onClick={go('/ai-tutor')}>Open the AI tutor →</a>
                <img src={`${ART}boy-think.png`} alt="" loading="lazy" />
              </div>
            </div>
            <div className="sb-chat" aria-hidden="true">
              <div className="sb-bubble-q">A stone is dropped from 19.6 m. How long does it take to land?</div>
              <div className="sb-bubble-a">
                <span className="sb-script">free fall</span>
                <div className="sb-mono">t = √(2h ÷ g) = √(2 × 19.6 ÷ 9.8)<br />t = <mark>2 s</mark></div>
                <span className="sb-stamp">✓ Engine checked</span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 3D experiments */}
      {(shown3D.length > 0 || showUnity) && (
        <section className="sb-exps">
          <div className="sb-wrap">
            <div className="sb-head has-art">
              <img className="sb-head-art is-right is-bird" src={`${ART}bird.png`} alt="" loading="lazy" />
              <img className="sb-head-art is-left" src={`${ART}boy-reach.png`} alt="" loading="lazy" />
              <span className="sb-script">spin them around!</span>
              <h2>3D experiments</h2>
              <span className="sb-rule is-sky" />
            </div>
            <div className="sb-exp-grid">
              {showUnity && (
                <button className="sb-exp" onClick={() => navigate('/virtual-lab')}>
                  <span className="sb-porthole"><span><img src={`${CONCEPT}circuit-lab.svg`} alt="" loading="lazy" /></span></span>
                  <span className="sb-exp-title">Walk-in Circuit Lab</span>
                  <span className="sb-mono sb-exp-formula">V = I · R</span>
                </button>
              )}
              {shown3D.map(lab => (
                <button key={lab.id} className="sb-exp" onClick={() => open3D(lab.id)}>
                  <span className="sb-porthole"><span><img src={lab.image} alt="" loading="lazy" /></span></span>
                  <span className="sb-exp-title">{lab.label}</span>
                  <span className="sb-mono sb-exp-formula">{lab.formula || lab.badge}</span>
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 2D visualisations */}
      {shown2D.length > 0 && (
        <section className="sb-list-sec">
          <div className="sb-wrap">
            <div className="sb-list-head">
              <h3><img className="sb-list-art" src={`${ART}boy-push.png`} alt="" loading="lazy" />2D visualisations</h3>
              <a href="/sim-2d" onClick={go('/sim-2d')}>See all 2D labs →</a>
            </div>
            <div className="sb-list">
              {shown2D.map(v => (
                <button key={v.id} className="sb-list-item" onClick={() => open2D(v)}>
                  <span className="sb-script">{v.badge || '2D lab'}</span>
                  <span className="sb-list-title">{v.title}</span>
                  <span className="sb-list-sub">{v.subtitle || v.category}</span>
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Blog */}
      {!q && posts.length > 0 && (
        <section className="sb-list-sec">
          <div className="sb-wrap">
            <div className="sb-list-head">
              <h3>From the notebook</h3>
              <a href="/blog">All articles →</a>
            </div>
            <div className="sb-list">
              {posts.map(p => (
                <a key={p.slug} className="sb-list-item" href={`/blog/${p.slug}`}>
                  <span className="sb-script">{(p.keywords?.[0] || 'physics').slice(0, 28)}</span>
                  <span className="sb-list-title">{p.title}</span>
                  <span className="sb-list-sub">{p.description}</span>
                </a>
              ))}
            </div>
          </div>
        </section>
      )}

      <footer className="sb-foot">
        <span className="sb-foot-cap" />
        <img className="sb-foot-boy" src={`${ART}boy-wave.png`} alt="" loading="lazy" />
        <img className="sb-foot-seal" src={`${ART}seal.png`} alt="" loading="lazy" />
        <div className="sb-foot-row">
          <span className="sb-brand is-lg"><img src="/images/visiora_lotus_logo.png" alt="" width="36" height="36" /> visiora</span>
          <span className="sb-foot-note">made for curious minds ✶</span>
          <span className="sb-foot-streak">✹ {streak}-day streak</span>
        </div>
      </footer>
    </div>
  )
}
