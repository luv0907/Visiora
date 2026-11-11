/**
 * VISIORA Studio — shared pieces: icons, the top bar, and the experiment layout every
 * simulation uses (stage in the middle, controls on the right, play bar at the bottom).
 */
import React, { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/useAuthStore'
import { useProgressStore } from '../store/useProgressStore'
import './studio.css'

const ICONS = {
  play: <path d="M7 5v14l11-7z" fill="currentColor" stroke="none" />,
  pause: <path d="M8 5v14M16 5v14" />,
  step: <path d="M6 6l8 6-8 6zM18 6v12" />,
  reset: <path d="M4 12a8 8 0 1 0 2.3-5.7M4 4v4h4" />,
  back: <path d="M15 6l-6 6 6 6" />,
  watch: <><circle cx="12" cy="13" r="7" /><path d="M12 10v3l2 1M10 3h4" /></>,
  ruler: <path d="M4 16 16 4l4 4L8 20z M8 12l2 2M11 9l2 2M14 6l2 2" />,
  path: <path d="M4 18c3-10 13-10 16 0" strokeDasharray="2 3" />,
  help: <><circle cx="12" cy="12" r="9" /><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .8-1 1.5M12 17h.01" /></>,
  target: <><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="3" /></>,
  flame: <path d="M12 3c1 4 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 1-9z" />,
  check: <path d="M5 12l4 4 10-10" />,
  arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
}

export function Icon({ name, style }) {
  return <svg className="st-icon" viewBox="0 0 24 24" style={style} aria-hidden="true">{ICONS[name]}</svg>
}

export function Brand({ onClick }) {
  return (
    <button className="st-brand" onClick={onClick} aria-label="Visiora home">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="10" fill="none" stroke="#16181D" strokeWidth="1.75" />
        <circle cx="12" cy="12" r="3.2" fill="#E4532A" />
        <path d="M12 2v4" stroke="#16181D" strokeWidth="1.75" />
      </svg>
      Visiora
    </button>
  )
}

const initials = name => (name || 'S').split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase()

export function TopBar({ active = 'experiments' }) {
  const navigate = useNavigate()
  const user = useAuthStore(s => s.user)
  const streak = useProgressStore(s => s.profile?.streak ?? 1)
  const items = [['experiments', 'Experiments', '/'], ['tutor', 'Ask the tutor', '/ai-tutor'], ['progress', 'Progress', '/progress']]
  return (
    <header className="st-topbar">
      <Brand onClick={() => navigate('/')} />
      <nav className="st-nav" aria-label="Main">
        {items.map(([id, label, path]) => (
          <button key={id} className={active === id ? 'is-on' : ''} aria-current={active === id ? 'page' : undefined} onClick={() => navigate(path)}>{label}</button>
        ))}
      </nav>
      <div className="st-top-right">
        <span className="st-stat"><Icon name="flame" /><span className="st-num">{streak}</span> day streak</span>
        <button className="st-avatar" onClick={() => navigate('/profile')} aria-label="Your profile">{initials(user?.displayName)}</button>
      </div>
    </header>
  )
}

const PANEL_KEY = 'visiora.panel'
const PANEL_MIN = 280, PANEL_DEFAULT = 340
const panelMax = () => Math.max(PANEL_MIN, Math.min(640, Math.round(window.innerWidth * 0.5)))
function loadPanel() {
  try { const p = JSON.parse(localStorage.getItem(PANEL_KEY)); if (p && typeof p.width === 'number') return p } catch { /* private mode */ }
  return { width: PANEL_DEFAULT, open: true }
}

/**
 * The side panel's width and whether it is shown, remembered between visits. Drag the
 * handle on its left edge to resize (double-click it for the default width), use ← and → on the
 * focused handle, or hide the panel to give the experiment the whole screen.
 */
function usePanel() {
  const [panel, setPanel] = useState(loadPanel)
  const save = next => setPanel(prev => {
    const p = { ...prev, ...next }
    p.width = Math.max(PANEL_MIN, Math.min(panelMax(), Math.round(p.width)))
    try { localStorage.setItem(PANEL_KEY, JSON.stringify(p)) } catch { /* private mode */ }
    return p
  })
  return [panel, save]
}

function PanelHandle({ width, onWidth, onHide }) {
  const drag = useRef(null)
  return (
    <div className="st-resizer" role="separator" aria-orientation="vertical" aria-label="Resize the side panel" aria-valuenow={width}
      aria-valuemin={PANEL_MIN} aria-valuemax={640} tabIndex={0} title="Drag to resize · double-click to reset"
      onPointerDown={e => { if (e.target.closest('button')) return; drag.current = { x: e.clientX, w: width }; e.currentTarget.setPointerCapture(e.pointerId); document.body.classList.add('is-resizing') }}
      onPointerMove={e => { if (drag.current) onWidth(drag.current.w + (drag.current.x - e.clientX)) }}
      onPointerUp={() => { drag.current = null; document.body.classList.remove('is-resizing') }}
      onDoubleClick={() => onWidth(PANEL_DEFAULT)}
      onKeyDown={e => { if (e.key === 'ArrowLeft') onWidth(width + 24); if (e.key === 'ArrowRight') onWidth(width - 24) }}>
      <span className="st-resizer-grip" aria-hidden="true" />
      <button className="st-panel-hide" onClick={onHide} aria-label="Hide the side panel" title="Hide the panel"><Icon name="arrow" /></button>
    </div>
  )
}

/** The frame every experiment sits in. `tabs` is [[id, label], …]. */
export function ExperimentShell({ code, title, tabs, tab, onTab, panel, children }) {
  const navigate = useNavigate()
  const [side, setSide] = usePanel()
  return (
    <div className="studio st-sim">
      <header className="st-simbar">
        <button className="st-back" onClick={() => navigate('/')}><Icon name="back" />Experiments</button>
        <div className="st-crumb"><span className="st-num">{code}</span><h1>{title}</h1></div>
        {tabs && (
          <div className="st-tabs" role="tablist" aria-label="Parts of this experiment">
            {tabs.map(([id, label], i) => (
              <button key={id} role="tab" aria-selected={tab === id} className={tab === id ? 'is-on' : ''} onClick={() => onTab(id)}>
                <span className="st-num">{i + 1}</span>{label}
              </button>
            ))}
          </div>
        )}
        <button className="st-btn st-btn-secondary st-help" onClick={() => navigate('/ai-tutor')}><Icon name="help" />Ask the tutor</button>
      </header>
      <div className="st-simmain" style={{ gridTemplateColumns: side.open ? `minmax(0, 1fr) ${side.width}px` : 'minmax(0, 1fr) 0px' }}>
        <div className="st-stage">
          {children}
          {!side.open && <button className="st-panel-show" onClick={() => setSide({ open: true })}><Icon name="back" />Show the steps</button>}
        </div>
        <aside className="st-panel" aria-label="Controls" hidden={!side.open}>
          {side.open && <PanelHandle width={side.width} onWidth={w => setSide({ width: w })} onHide={() => setSide({ open: false })} />}
          <div className="st-panel-scroll">{panel}</div>
        </aside>
      </div>
    </div>
  )
}

export function Group({ label, children }) {
  return <section className="st-group"><span className="st-label">{label}</span>{children}</section>
}

export function Slider({ label, value, display, min, max, step, onChange, disabled, scale }) {
  return (
    <label className="st-slider">
      <span className="st-slider-head"><span>{label}</span><span className="st-num">{display}</span></span>
      <input type="range" min={min} max={max} step={step} value={value} disabled={disabled} onChange={e => onChange(Number(e.target.value))} aria-valuetext={display} />
      {scale && <span className="st-scale"><span>{scale[0]}</span><span>{scale[1]}</span></span>}
    </label>
  )
}

export function Options({ options, value, onChange, disabled, label }) {
  return (
    <div className="st-options" role="radiogroup" aria-label={label}>
      {options.map(o => (
        <button key={o.id} role="radio" aria-checked={value === o.id} className={value === o.id ? 'is-on' : ''} disabled={disabled || o.disabled} onClick={() => onChange(o.id)}>
          {o.label}{o.sub && <span className="st-num">{o.sub}</span>}
        </button>
      ))}
    </div>
  )
}

export function Toggle({ label, checked, onChange }) {
  return (
    <label className="st-check">{label}
      <span className="st-switch"><input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} /><span /></span>
    </label>
  )
}

export function TimeControls({ playing, onPlay, onStep, speed, onSpeed }) {
  return (
    <div className="st-float st-time" aria-label="Time controls">
      <button className="st-ctl" onClick={onStep} title="Step forward" aria-label="Step forward"><Icon name="step" /></button>
      <button className="st-play" onClick={onPlay} title={playing ? 'Pause' : 'Play'} aria-label={playing ? 'Pause' : 'Play'}><Icon name={playing ? 'pause' : 'play'} /></button>
      <span className="st-divider" />
      <div className="st-speed" role="radiogroup" aria-label="Speed">
        {[[1, '1×'], [0.25, '¼×']].map(([v, l]) => (
          <button key={v} role="radio" aria-checked={speed === v} className={speed === v ? 'is-on' : ''} onClick={() => onSpeed(v)}>{l}</button>
        ))}
      </div>
    </div>
  )
}

export function ResetAll({ onClick }) {
  return <button className="st-float st-reset" onClick={onClick}><Icon name="reset" />Reset all</button>
}

export function Toolbox({ tools, on, onToggle }) {
  return (
    <div className="st-float st-toolbox" aria-label="Tools">
      {tools.map(([id, label, icon]) => (
        <button key={id} className={`st-tool ${on[id] ? 'is-on' : ''}`} aria-pressed={!!on[id]} onClick={() => onToggle(id)}><Icon name={icon} />{label}</button>
      ))}
    </div>
  )
}

/** A stopwatch you can pick up and put anywhere on the stage. */
export function Stopwatch({ time, running, onStartStop, onReset }) {
  const [pos, setPos] = useState({ left: 230, bottom: 96 })
  const drag = useRef(null)
  const down = e => {
    if (e.target.tagName === 'BUTTON') return
    const r = e.currentTarget.getBoundingClientRect()
    drag.current = { dx: e.clientX - r.left, dy: e.clientY - r.top, stage: e.currentTarget.parentElement.getBoundingClientRect() }
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const move = e => {
    const d = drag.current
    if (!d) return
    setPos({ left: e.clientX - d.stage.left - d.dx, top: e.clientY - d.stage.top - d.dy })
  }
  return (
    <div className="st-float st-stopwatch" style={pos} onPointerDown={down} onPointerMove={move} onPointerUp={() => { drag.current = null }} aria-label="Stopwatch">
      <span className="st-label">Stopwatch</span>
      <b>{time.toFixed(2)} s</b>
      <div><button onClick={onStartStop}>{running ? 'Stop' : 'Start'}</button><button onClick={onReset}>Reset</button></div>
    </div>
  )
}
