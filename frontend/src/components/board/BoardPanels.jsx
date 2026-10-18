/**
 * VISIORA — Graph Board side-panel pieces: formula rows, sliders,
 * key points, vector cards and small form controls.
 */
import React, { useEffect, useState } from 'react'
import { Eye, EyeOff, X, Play, Pause, Plus } from 'lucide-react'
import { formatNumber, displayName } from '../../engine/formula'
import { magnitude, angleDeg, fromPolar } from '../../engine/vectors'

/** Number input that lets students type "-", "0." etc. and only commits valid numbers. */
export function NumberField({ value, onCommit, step = 'any', label, className = '' }) {
  const [text, setText] = useState(formatNumber(value, 4))
  const [focused, setFocused] = useState(false)
  useEffect(() => {
    if (!focused) setText(formatNumber(value, 4))
  }, [value, focused])
  return (
    <input
      className={`gb-num ${className}`}
      inputMode="decimal"
      aria-label={label}
      value={text}
      step={step}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onChange={e => {
        setText(e.target.value)
        const n = Number(e.target.value)
        if (e.target.value.trim() !== '' && Number.isFinite(n)) onCommit(n)
      }}
    />
  )
}

export function FormulaRow({ formula, parsed, active, canRemove, onSelect, onChange, onToggle, onRemove, onIndep, onSubmit }) {
  const multi = parsed.ok && parsed.symbols.length > 1
  return (
    <div className={`gb-frow ${active ? 'is-active' : ''}`} onClick={onSelect}>
      <div className="gb-frow-main">
        <button
          className="gb-swatch"
          style={{ '--c': formula.color }}
          onClick={e => { e.stopPropagation(); onToggle() }}
          aria-label={formula.visible ? 'Hide this graph' : 'Show this graph'}
          title={formula.visible ? 'Hide' : 'Show'}
        >
          {formula.visible ? <Eye size={14} strokeWidth={2.5} /> : <EyeOff size={14} strokeWidth={2.5} />}
        </button>
        <input
          className="gb-finput"
          value={formula.text}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          placeholder="y = 2x + 3"
          aria-label="Formula"
          onFocus={onSelect}
          onChange={e => onChange(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') onSubmit() }}
        />
        {canRemove && (
          <button className="gb-icon-btn" onClick={e => { e.stopPropagation(); onRemove() }} aria-label="Remove formula">
            <X size={15} strokeWidth={2.5} />
          </button>
        )}
      </div>
      {!parsed.ok ? (
        <p className="gb-ferror">{parsed.error}</p>
      ) : (
        <div className="gb-fmeta">
          <span>
            {displayName(parsed.output.replace(/\(.*\)/, ''))} against
          </span>
          {multi ? (
            <select
              className="gb-select"
              value={parsed.independent}
              onClick={e => e.stopPropagation()}
              onChange={e => onIndep(e.target.value)}
              aria-label="Variable on the x-axis"
            >
              {parsed.symbols.map(s => <option key={s} value={s}>{displayName(s)}</option>)}
            </select>
          ) : (
            <b>{displayName(parsed.independent)}</b>
          )}
        </div>
      )}
    </div>
  )
}

export function ParamSlider({ name, cfg, playing, onChange, onTogglePlay }) {
  const pct = ((cfg.value - cfg.min) / (cfg.max - cfg.min || 1)) * 100
  return (
    <div className="gb-param">
      <div className="gb-param-head">
        <span className="gb-param-name">{displayName(name)}</span>
        <NumberField value={cfg.value} label={`${name} value`} onCommit={v => onChange({ value: v, min: Math.min(cfg.min, v), max: Math.max(cfg.max, v) })} className="gb-param-value" />
        <button className={`gb-icon-btn ${playing ? 'is-on' : ''}`} onClick={onTogglePlay} aria-label={playing ? `Stop animating ${name}` : `Animate ${name}`} title={playing ? 'Stop' : 'Animate'}>
          {playing ? <Pause size={14} strokeWidth={2.5} /> : <Play size={14} strokeWidth={2.5} />}
        </button>
      </div>
      <input
        type="range"
        className="gb-range"
        style={{ '--pct': `${Math.min(100, Math.max(0, pct))}%` }}
        min={cfg.min}
        max={cfg.max}
        step={cfg.step}
        value={cfg.value}
        aria-label={`${name} slider`}
        onChange={e => onChange({ value: Number(e.target.value) })}
      />
      <div className="gb-param-ends">
        <NumberField value={cfg.min} label={`${name} minimum`} onCommit={v => v < cfg.max && onChange({ min: v, value: Math.max(v, cfg.value) })} />
        <NumberField value={cfg.max} label={`${name} maximum`} onCommit={v => v > cfg.min && onChange({ max: v, value: Math.min(v, cfg.value) })} />
      </div>
    </div>
  )
}

const KP_TEXT = {
  root: (p, x, y) => `${y} = 0 when ${x} = ${formatNumber(p.x, 4)}`,
  max: (p, x, y) => `Highest: ${y} = ${formatNumber(p.y, 4)} at ${x} = ${formatNumber(p.x, 4)}`,
  min: (p, x, y) => `Lowest: ${y} = ${formatNumber(p.y, 4)} at ${x} = ${formatNumber(p.x, 4)}`,
  intercept: (p, x, y) => `Starts at ${y} = ${formatNumber(p.y, 4)} when ${x} = 0`,
}

export function KeyPointList({ points, xName, yName }) {
  if (!points.length) return <p className="gb-muted">No crossings or turning points in view. Zoom out to look further.</p>
  return (
    <ul className="gb-kps">
      {points.map((p, i) => (
        <li key={i} className={`gb-kp gb-kp-${p.kind}`}>
          <i />
          {KP_TEXT[p.kind](p, xName, yName)}
        </li>
      ))}
    </ul>
  )
}

export function VectorCard({ vec, canRemove, onChange, onRemove }) {
  const mag = magnitude(vec)
  const ang = angleDeg(vec)
  return (
    <div className="gb-vcard" style={{ '--c': vec.color }}>
      <div className="gb-vcard-head">
        <span className="gb-vbadge">{vec.label}</span>
        <span className="gb-vsummary">
          |{vec.label}| = <b>{formatNumber(mag, 3)}</b> at <b>{formatNumber(ang, 1)}°</b>
        </span>
        {canRemove && (
          <button className="gb-icon-btn" onClick={onRemove} aria-label={`Remove vector ${vec.label}`}>
            <X size={15} strokeWidth={2.5} />
          </button>
        )}
      </div>
      <div className="gb-vgrid">
        <label>{vec.label}x<NumberField value={vec.x} label={`${vec.label} x component`} onCommit={x => onChange({ x })} /></label>
        <label>{vec.label}y<NumberField value={vec.y} label={`${vec.label} y component`} onCommit={y => onChange({ y })} /></label>
        <label>size<NumberField value={mag} label={`${vec.label} magnitude`} onCommit={m => m >= 0 && onChange(fromPolar(m, ang))} /></label>
        <label>angle °<NumberField value={ang} label={`${vec.label} angle`} onCommit={a => onChange(fromPolar(mag, a))} /></label>
      </div>
    </div>
  )
}

export function Toggle({ checked, onChange, children }) {
  return (
    <label className="gb-toggle">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />
      <span className="gb-toggle-track"><span /></span>
      {children}
    </label>
  )
}

export function AddButton({ onClick, children, disabled }) {
  return (
    <button className="gb-add" onClick={onClick} disabled={disabled}>
      <Plus size={15} strokeWidth={2.75} /> {children}
    </button>
  )
}
