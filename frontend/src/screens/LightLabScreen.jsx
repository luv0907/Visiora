/**
 * VISIORA — Light Lab (Class 10: Light · reflection and refraction)
 * Aim a laser at the boundary between two materials and watch it reflect,
 * bend, or get trapped (total internal reflection). Angles and brightness come
 * from Snell's law and the Fresnel equations in engine/optics.js.
 */
import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, Circle, Lightbulb } from 'lucide-react'
import RayScene from '../components/light/RayScene'
import BendGraph from '../components/light/BendGraph'
import { MEDIA, interact, criticalAngle, insight } from '../engine/optics'
import '../components/motion/motion.css'

const CHALLENGES = [
  {
    id: 'away',
    title: 'Make the light bend away from the normal.',
    hint: 'Light bends away when it goes into a material with a smaller n. Try shining from inside the water or glass.',
    check: r => !r.tir && r.theta1 > 0 && r.theta2 > r.theta1 + 0.5,
  },
  {
    id: 'tir',
    title: 'Trap the light — make total internal reflection happen.',
    hint: 'Shine from glass or water out into air, and keep tilting the laser past the critical angle.',
    check: r => r.tir,
  },
  {
    id: 'thirty',
    title: 'Shine from air into glass so the light bends to exactly 30°.',
    hint: 'Snell: 1.00 × sin θ₁ = 1.5 × sin 30° = 0.75. Which angle has a sine of 0.75? (Use the bend graph!)',
    check: (r, from, into) => from.id === 'air' && into.id === 'glass' && !r.tir && Math.abs(r.theta2 - 30) <= 0.3,
  },
]

const d1 = v => v.toFixed(1)
const d4 = v => v.toFixed(4)
const nn = v => v.toFixed(2)

export default function LightLabScreen() {
  const navigate = useNavigate()
  const [topId, setTopId] = useState('air')
  const [bottomId, setBottomId] = useState('water')
  const [side, setSide] = useState('top')
  const [theta, setTheta] = useState(40)
  const [won, setWon] = useState(() => new Set())
  const [toast, setToast] = useState(null)
  const [openHint, setOpenHint] = useState(null)

  const top = MEDIA.find(m => m.id === topId)
  const bottom = MEDIA.find(m => m.id === bottomId)
  const from = side === 'top' ? top : bottom
  const into = side === 'top' ? bottom : top
  const res = useMemo(() => interact(theta, from.n, into.n), [theta, from.n, into.n])
  const crit = criticalAngle(from.n, into.n)

  useEffect(() => {
    const fresh = CHALLENGES.filter(c => !won.has(c.id) && c.check(res, from, into))
    if (!fresh.length) return
    setWon(prev => new Set([...prev, ...fresh.map(c => c.id)]))
    setToast(fresh[0].title)
  }, [res, from, into, won])

  useEffect(() => {
    if (!toast) return
    const id = setTimeout(() => setToast(null), 3000)
    return () => clearTimeout(id)
  }, [toast])

  const sinIn = Math.sin((theta * Math.PI) / 180)

  return (
    <div className="ml-root">
      <main className="ml-main ml-main-static">
        <section className="ml-scene">
          <RayScene top={top} bottom={bottom} side={side} theta={theta} onAim={({ side: s, theta: t }) => { setSide(s); setTheta(t) }} />
          <button className="ml-back" onClick={() => navigate(-1)} aria-label="Back">
            <ArrowLeft size={18} strokeWidth={2.5} />
          </button>
          <p className="lt-tip">Drag anywhere to aim the laser</p>
        </section>

        <section className="ml-graphs">
          <BendGraph n1={from.n} n2={into.n} theta={theta} onTheta={setTheta} />
          <div className="lt-readings" aria-live="polite">
            <div><small>in (θ₁)</small><b>{d1(theta)}°</b></div>
            <div style={{ color: '#1251B8' }}><small>out (θ₂)</small><b>{res.tir ? '—' : `${d1(res.theta2)}°`}</b></div>
            <div style={{ color: '#6D6254' }}><small>bounces back</small><b>{Math.round(res.R * 100)}%</b></div>
            <div style={{ color: '#1251B8' }}><small>goes through</small><b>{Math.round(res.T * 100)}%</b></div>
            <div className="lt-wide">
              <small>critical angle</small>
              <b>{crit == null ? 'none' : `${d1(crit)}°`}</b>
              <em>{crit == null ? `${into.label} is denser — light can always get in.` : `Past this, light can't leave ${from.label.toLowerCase()}.`}</em>
            </div>
          </div>
        </section>
      </main>

      <aside className="ml-panel">
        <header className="ml-head">
          <p className="ml-kicker">Class 10 · Light</p>
          <h1>Bending light</h1>
          <p>Aim a laser at the boundary between two materials. Does it bounce, bend — or get trapped?</p>
        </header>

        <section className="ml-section ml-sec-controls">
          <MediumPicker label="Top" value={topId} onChange={setTopId} />
          <MediumPicker label="Bottom" value={bottomId} onChange={setBottomId} />
          <div className="ml-slider">
            <div className="ml-slider-head">
              <span>Laser is in the</span>
            </div>
            <div className="ml-seg lt-seg" role="radiogroup" aria-label="Laser side">
              {['top', 'bottom'].map(s => (
                <button key={s} role="radio" aria-checked={side === s} className={side === s ? 'is-on' : ''} onClick={() => setSide(s)}>
                  {s === 'top' ? `${top.label} (top)` : `${bottom.label} (bottom)`}
                </button>
              ))}
            </div>
          </div>
          <div className="ml-slider">
            <div className="ml-slider-head">
              <span>Angle from the normal <i>θ₁</i></span>
              <b style={{ color: '#E11D48' }}>{d1(theta)} <small>°</small></b>
            </div>
            <input
              className="ml-range"
              type="range"
              min={0}
              max={89.5}
              step={0.5}
              value={theta}
              onChange={e => setTheta(Number(e.target.value))}
              aria-label="Angle of incidence in degrees"
              style={{ '--pct': `${(theta / 89.5) * 100}%`, '--c': '#E11D48' }}
            />
          </div>
        </section>

        <section className="ml-section ml-sec-insight">
          <p className="ml-insight"><Lightbulb size={16} strokeWidth={2.5} /> {insight(from.n, into.n, res, [from.label, into.label])}</p>
        </section>

        <section className="ml-section ml-sec-maths">
          <h2>The maths, right now</h2>
          <div className="ml-work">
            <p>
              <span className="ml-eq">Reflection: angle out = angle in</span>
              = <b>{d1(theta)}°</b>
            </p>
            <p>
              <span className="ml-eq">Snell: n₁ sin θ₁ = n₂ sin θ₂</span>
              sin θ₂ = {nn(from.n)} × sin {d1(theta)}° ÷ {nn(into.n)}<br />
              = {nn(from.n)} × {d4(sinIn)} ÷ {nn(into.n)} = <b>{d4(res.sin2)}</b>
            </p>
            {res.tir ? (
              <p>
                sin θ₂ can't be more than 1, so <b style={{ color: '#E11D48' }}>no light gets out</b>.<br />
                Critical angle = sin⁻¹({nn(into.n)} ÷ {nn(from.n)}) = {d1(crit)}°
              </p>
            ) : (
              <p>θ₂ = sin⁻¹({d4(res.sin2)}) = <b style={{ color: '#1251B8' }}>{d1(res.theta2)}°</b></p>
            )}
          </div>
        </section>

        <section className="ml-section ml-sec-challenges">
          <h2>Challenges <span className="ml-count">{won.size}/{CHALLENGES.length}</span></h2>
          <ul className="ml-challenges">
            {CHALLENGES.map(c => (
              <li key={c.id} className={won.has(c.id) ? 'is-won' : ''}>
                {won.has(c.id) ? <CheckCircle2 size={20} strokeWidth={2.5} /> : <Circle size={20} strokeWidth={2.5} />}
                <div>
                  <p>{c.title}</p>
                  {!won.has(c.id) && (
                    openHint === c.id
                      ? <p className="ml-hint">{c.hint}</p>
                      : <button className="ml-link" onClick={() => setOpenHint(c.id)}>Need a hint?</button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      </aside>

      {toast && (
        <div className="ml-toast" role="status">
          <CheckCircle2 size={18} strokeWidth={2.75} /> Challenge complete! {toast}
        </div>
      )}
    </div>
  )
}

function MediumPicker({ label, value, onChange }) {
  return (
    <div className="ml-slider">
      <div className="ml-slider-head"><span>{label} material</span></div>
      <div className="ml-chips" role="radiogroup" aria-label={`${label} material`}>
        {MEDIA.map(m => (
          <button key={m.id} role="radio" aria-checked={value === m.id} className={`ml-chip ${value === m.id ? 'is-on' : ''}`} onClick={() => onChange(m.id)}>
            {m.label}<small>n = {m.n.toFixed(2)}</small>
          </button>
        ))}
      </div>
    </div>
  )
}
