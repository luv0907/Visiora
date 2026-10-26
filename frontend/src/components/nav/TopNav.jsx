/**
 * VISIORA — TopNav ("Storybook" design)
 * Desktop header: streak chip, logo tile, profile, and a lettered nav row.
 * 3D Simulator, 2D Labs, Mastery and Quiz open dropdown menus.
 */
import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useProgressStore } from '../../store/useProgressStore'
import { useAuthStore } from '../../store/useAuthStore'
import { useUIStore } from '../../store/useUIStore'
import LabIcon from '../common/LabIcon'
import './topnav.css'
import { Flame, Sparkles, ChevronDown, ArrowUpRight, Award, Target, Compass, Zap, Activity, Sliders } from 'lucide-react'
import { useAdminStore } from '../../store/useAdminStore'

// ── 3D SIMULATOR VISUALIZATIONS ──────────────────────────────────────
const SIM_VISUALIZATIONS = [
  {
    id: 'ohmslaw',
    label: "Ohm's Law Virtual Lab",
    badge: 'Unity 3D Lab',
    formula: 'V = I · R',
    icon: 'ohmslaw',
    desc: 'Interactive 3D laboratory bench with analog meters, rheostat & V-I graph',
    isVirtualLab: true
  },
  {
    id: 'projectile',
    label: 'Projectile Motion',
    badge: '2D Kinematics',
    formula: 'R = (v₀² sin 2θ)/g',
    icon: 'projectile',
    desc: 'Parabolic trajectories, air drag, and velocity vectors'
  },
  {
    id: 'gravity',
    label: 'Free Fall & Orbits',
    badge: 'Galileo Principle',
    formula: 'y(t) = h₀ - ½gt²',
    icon: 'gravity',
    desc: 'Mass-independent acceleration and Keplerian gravitational orbits'
  },
  {
    id: 'pendulum',
    label: 'Pendulum Mechanics',
    badge: 'Harmonics & Chaos',
    formula: 'T = 2π√(L/g)',
    icon: 'pendulum',
    desc: 'Harmonic oscillation, phase space trajectories, and double pendulum'
  },
  {
    id: 'buoyancy',
    label: 'Fluid Buoyancy',
    badge: 'Archimedes Law',
    formula: 'F_b = ρ_f · V_sub · g',
    icon: 'buoyancy',
    desc: 'Fluid displacement, density thresholds, and Archimedes force'
  },
  {
    id: 'collision',
    label: 'Elastic Collisions',
    badge: 'Momentum & Energy',
    formula: 'p = m₁v₁ + m₂v₂',
    icon: 'collision',
    desc: 'Conservation of linear momentum and kinetic energy exchange'
  }
]

// ── QUIZ CONCEPTS ──────────────────────────────────────────────────
const QUIZ_TOPICS = [
  {
    id: 'projectile',
    label: 'Projectile Kinematics Quiz',
    badge: '5 Questions',
    icon: 'projectile',
    desc: 'Test your grasp on launch angles, range, and velocity'
  },
  {
    id: 'gravity',
    label: 'Free Fall & Gravitation Quiz',
    badge: '5 Questions',
    icon: 'gravity',
    desc: 'Vacuum acceleration, mass independence, and g variations'
  },
  {
    id: 'pendulum',
    label: 'Pendulum Dynamics Quiz',
    badge: '5 Questions',
    icon: 'pendulum',
    desc: 'Oscillation periods, string length, and restoring force'
  },
  {
    id: 'buoyancy',
    label: 'Buoyancy & Fluids Quiz',
    badge: '5 Questions',
    icon: 'buoyancy',
    desc: 'Displacement, floating conditions, and fluid pressure'
  },
  {
    id: 'collision',
    label: 'Collision & Momentum Quiz',
    badge: '5 Questions',
    icon: 'collision',
    desc: 'Elastic vs inelastic impacts and kinetic energy preservation'
  }
]

// ── MASTERY SECTIONS ───────────────────────────────────────────────
const MASTERY_SECTIONS = [
  {
    id: 'overview',
    label: 'Mastery Dashboard',
    badge: 'Overview',
    icon: 'target',
    path: '/progress',
    desc: 'Comprehensive score analytics, learning streak, and activity'
  },
  {
    id: 'concepts',
    label: 'Concept Proficiency',
    badge: '5 Concepts',
    icon: 'compass',
    path: '/progress',
    desc: 'Deep breakdown across Kinematics, Gravity, and Fluid Dynamics'
  },
  {
    id: 'badges',
    label: 'Physicist Badges Shelf',
    badge: 'Honors',
    icon: 'award',
    path: '/progress',
    desc: 'Inspect unlocked medals, streaks, and milestone credentials'
  }
]

const TABS = [
  { id: 'home', label: 'Home', path: '/', hasDropdown: false },
  { id: 'physlab', label: 'Physics Lab', path: '/physics-lab', hasDropdown: false, isNew: true },
  { id: 'sim', label: '3D Simulator', path: '/sim', hasDropdown: true },
  { id: 'sim2d', label: '2D Labs', path: '/sim-2d', hasDropdown: true },
  { id: 'aitutor', label: 'AI Visual Studio', path: '/ai-tutor', hasDropdown: false, isSpecial: true },
  { id: 'progress', label: 'Mastery', path: '/progress', hasDropdown: true },
  { id: 'quiz', label: 'Quiz', path: '/quiz/projectile', hasDropdown: true },
]

export default function TopNav() {
  const navigate = useNavigate()
  const location = useLocation()
  
  const user = useAuthStore(state => state.user)
  const profile = useProgressStore(state => state.profile)

  const experiments = useAdminStore(state => state.experiments)
  const get3DExperiments = useAdminStore(state => state.get3DExperiments)
  const get2DExperiments = useAdminStore(state => state.get2DExperiments)
  const trackExperimentClick = useAdminStore(state => state.trackExperimentClick)

  const active3DExperiments = (get3DExperiments ? get3DExperiments(true) : [])
  const display3DList = active3DExperiments.length > 0 ? active3DExperiments : SIM_VISUALIZATIONS

  const active2DExperiments = (get2DExperiments ? get2DExperiments(true) : [])
  const display2DList = active2DExperiments.length > 0 ? active2DExperiments : []

  const [openDropdown, setOpenDropdown] = useState(null) // 'sim' | 'progress' | 'quiz' | null
  const navContainerRef = useRef(null)
  const hoverTimeoutRef = useRef(null)

  // Close dropdown on outside click or Escape key
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (navContainerRef.current && !navContainerRef.current.contains(e.target)) {
        setOpenDropdown(null)
      }
    }
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setOpenDropdown(null)
    }

    document.addEventListener('mousedown', handleOutsideClick)
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
      window.removeEventListener('keydown', handleKeyDown)
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)
    }
  }, [])

  const handleTabMouseEnter = (tab) => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)
    if (!tab.hasDropdown) {
      setOpenDropdown(null)
    } else {
      setOpenDropdown(tab.id)
    }
  }

  const handleTabMouseLeave = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)
    hoverTimeoutRef.current = setTimeout(() => {
      setOpenDropdown(null)
    }, 180)
  }

  const getActiveTab = () => {
    const path = location.pathname
    if (path === '/') return 'home'
    if (path.startsWith('/ai-tutor')) return 'aitutor'
    if (path.startsWith('/sim-2d')) return 'sim2d'
    if (path.startsWith('/sim')) return 'sim'
    if (path.startsWith('/profile')) return 'profile'
    if (path.startsWith('/progress')) return 'progress'
    if (path.startsWith('/quiz')) return 'quiz'
    return 'home'
  }

  const activeTab = getActiveTab()
  const streak = profile?.streak ?? 1

  const handleTabClick = (tab) => {
    if (tab.id === 'home') {
      setOpenDropdown(null)
      navigate('/')
      if (location.pathname === '/') {
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }
    } else if (tab.id === 'physlab') {
      setOpenDropdown(null)
      navigate('/physics-lab')
    } else if (tab.id === 'aitutor') {
      setOpenDropdown(null)
      navigate('/ai-tutor')
    } else if (tab.id === 'sim2d' && !openDropdown) {
      setOpenDropdown('sim2d')
    } else {
      // Toggle dropdown menu on click as well
      setOpenDropdown(prev => prev === tab.id ? null : tab.id)
    }
  }

  const handleLaunch2DLab = (vis) => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)
    setOpenDropdown(null)
    const visId = typeof vis === 'string' ? vis.replace('/sim-2d?lab=', '') : vis.id
    if (visId === 'vis-energy-forms' || visId === 'energy-forms-and-changes') {
      navigate('/sim-2d')
      return
    }
    navigate(`/lab/${visId}`)
  }

  const handleLaunchSim = (sim) => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)
    setOpenDropdown(null)
    const simId = typeof sim === 'string' ? sim : sim.id
    if (simId === 'ohmslaw') {
      navigate('/virtual-lab')
      return
    }
    const coreLabIds = ['projectile', 'gravity', 'pendulum', 'buoyancy', 'collision']
    if (coreLabIds.includes(simId)) {
      useUIStore.getState().setActiveLab(simId)
      navigate('/sim')
      return
    }
    navigate(`/lab/${simId}`)
  }

  const handleSelectQuiz = (conceptId) => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)
    setOpenDropdown(null)
    navigate(`/quiz/${conceptId}`)
  }

  const handleSelectMastery = (path) => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)
    setOpenDropdown(null)
    navigate(path)
  }

  const keepOpen = () => { if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current) }

  // One dropdown menu: a header row and a list of items.
  const renderMenu = (title, count, items, align = 'center', footer = null) => (
    <div className={`tn-menu is-${align}`} onMouseEnter={keepOpen} onMouseLeave={handleTabMouseLeave} data-lenis-prevent="true">
      <div className="tn-menu-head"><span>{title}</span>{count && <span className="tn-menu-count">{count}</span>}</div>
      <div className="tn-menu-list">
        {items.map(it => (
          <button key={it.key} className="tn-item" onClick={it.onClick}>
            <span className="tn-item-icon">{it.icon}</span>
            <span className="tn-item-text">
              <span className="tn-item-title">{it.title}{it.badge && <span className="tn-item-badge">{it.badge}</span>}</span>
              <span className="tn-item-desc">{it.desc}</span>
            </span>
            <ArrowUpRight size={15} className="tn-item-arrow" />
          </button>
        ))}
      </div>
      {footer}
    </div>
  )

  const simItems = display3DList.map(sim => ({
    key: sim.id,
    title: sim.label || sim.title,
    badge: sim.badge || '3D Lab',
    desc: sim.desc || sim.subtitle || sim.formula || 'Interactive 3D simulation',
    icon: <LabIcon id={sim.id} name={sim.icon || 'ohmslaw'} size={18} />,
    onClick: () => { trackExperimentClick(sim.id); handleLaunchSim(sim) }
  }))
  const visItems = display2DList.map(vis => ({
    key: vis.id,
    title: vis.title.split(':')[0],
    badge: vis.badge || '2D Studio',
    desc: vis.category,
    icon: vis.id.includes('energy') ? <Flame size={17} /> : vis.id.includes('circuit') ? <Zap size={17} /> : vis.id.includes('wave') ? <Activity size={17} /> : <Sliders size={17} />,
    onClick: () => { trackExperimentClick(vis.id); handleLaunch2DLab(vis) }
  }))
  const quizItems = QUIZ_TOPICS.map(quiz => ({
    key: quiz.id, title: quiz.label, badge: quiz.badge, desc: quiz.desc,
    icon: <LabIcon id={quiz.id} name={quiz.icon} size={18} />,
    onClick: () => handleSelectQuiz(quiz.id)
  }))
  const masteryItems = MASTERY_SECTIONS.map(item => ({
    key: item.id, title: item.label, badge: item.badge, desc: item.desc,
    icon: item.id === 'overview' ? <Target size={17} /> : item.id === 'concepts' ? <Compass size={17} /> : <Award size={17} />,
    onClick: () => handleSelectMastery(item.path)
  }))

  const initial = (user?.displayName || profile?.name || 'V').charAt(0).toUpperCase()

  return (
    <header className="tn" ref={navContainerRef}>
      <div className="tn-top">
        <div className="tn-left">
          <span className="tn-chip" title={`${streak}-day streak`}><span className="tn-chip-glyph" aria-hidden="true">✹</span> {streak}-day streak</span>
        </div>
        <a className="tn-logo" href="/" onClick={e => { e.preventDefault(); setOpenDropdown(null); navigate('/') }} aria-label="Visiora home">
          <span className="tn-logo-tile"><img src="/images/visiora_lotus_logo.png" alt="" width="52" height="52" /></span>
          <span className="tn-logo-word">visiora</span>
        </a>
        <div className="tn-right">
          <a className={`tn-profile${activeTab === 'profile' ? ' is-active' : ''}`} href="/profile" onClick={e => { e.preventDefault(); setOpenDropdown(null); navigate('/profile') }}>Profile</a>
          <button className="tn-avatar" onClick={() => { setOpenDropdown(null); navigate('/profile') }}
            title={user?.displayName ? `Signed in as ${user.displayName}` : 'Your profile'} aria-label="Your profile">
            {user?.photoURL
              ? <img src={user.photoURL} alt="" referrerPolicy="no-referrer" />
              : <span>{initial}</span>}
          </button>
        </div>
      </div>

      <nav className="tn-nav" aria-label="Main">
        {TABS.map(tab => {
          const active = activeTab === tab.id
          const isOpen = openDropdown === tab.id
          return (
            <div key={tab.id} className="tn-tab-wrap" onMouseEnter={() => handleTabMouseEnter(tab)} onMouseLeave={handleTabMouseLeave}>
              <button className={`tn-tab${active ? ' is-active' : ''}${isOpen ? ' is-open' : ''}`} onClick={() => handleTabClick(tab)}
                aria-current={active ? 'page' : undefined} aria-expanded={tab.hasDropdown ? isOpen : undefined}>
                {tab.isSpecial && <Sparkles size={13} strokeWidth={2.5} />}
                {tab.isNew && <span className="tn-new">new</span>}
                <span>{tab.label}</span>
                {tab.hasDropdown && <ChevronDown size={13} strokeWidth={2.5} className="tn-caret" />}
              </button>
              {isOpen && <div className="tn-bridge" />}

              {isOpen && tab.id === 'sim' && renderMenu('3D experiments', `${display3DList.length} labs`, simItems, 'center',
                <div className="tn-menu-foot">
                  <button className="tn-foot-link" onClick={() => { setOpenDropdown(null); navigate('/sim-2d') }}>
                    <span>Looking for 2D labs?</span><span>Explore 2D labs <ArrowUpRight size={13} /></span>
                  </button>
                </div>)}

              {isOpen && tab.id === 'sim2d' && renderMenu('2D labs', null, visItems, 'center',
                <div className="tn-menu-foot">
                  <button className="tn-foot-btn" onClick={() => handleLaunch2DLab('/sim-2d?lab=energy-forms-and-changes')}>
                    Open the 2D studio <ArrowUpRight size={13} />
                  </button>
                </div>)}

              {isOpen && tab.id === 'quiz' && renderMenu('Topic quizzes', `${QUIZ_TOPICS.length} quizzes`, quizItems, 'right')}

              {isOpen && tab.id === 'progress' && renderMenu('Mastery', null, masteryItems)}
            </div>
          )
        })}
      </nav>
    </header>
  )
}
