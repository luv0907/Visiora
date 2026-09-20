/**
 * VISIORA — ProgressScreen
 * Mobile-first progress dashboard. Cream + Teal palette.
 * Shows mastery bars, badges shelf, recent sessions, profile editor.
 */
import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProgressStore } from '../store/useProgressStore'
import { SCENE_META } from '../config/physics'
import { useMediaQuery } from '../hooks/useMediaQuery'
import { Target, Award, Flame, BookOpen, Clock, Zap, Atom, Star, Compass, User, CheckCircle2 } from 'lucide-react'
import LabIcon from '../components/common/LabIcon'

const BADGE_DEFS = [
  { id: 'first_session',               label: 'First Step',     Icon: Star,      desc: 'Log your first session' },
  { id: 'five_day_streak',             label: 'Unstoppable',    Icon: Flame,     desc: 'Reach a 5-day streak' },
  { id: 'concept_mastered_gravity',    label: 'Gravity Master', Icon: Compass,   desc: '80%+ in Gravity' },
  { id: 'concept_mastered_projectile', label: 'Artillery',      Icon: Target,    desc: '80%+ in Projectiles' },
  { id: 'concept_mastered_pendulum',   label: 'Timekeeper',     Icon: Clock,     desc: '80%+ in Pendulums' },
  { id: 'concept_mastered_collision',  label: 'Impact',         Icon: Zap,       desc: '80%+ in Collisions' },
  { id: 'concept_mastered_angular',    label: 'Spin Doctor',    Icon: Atom,      desc: '80%+ in Angular' },
  { id: 'all_rounder',                 label: 'All Rounder',    Icon: Award,     desc: '50%+ in all concepts' },
]

const GRADES = ['6','7','8','9','10','11','12']
const AVATAR_TITLES = {
  PH: 'Physicist',
  QC: 'Quantum Specialist',
  CM: 'Classical Mechanics',
  EM: 'Electromagnetics',
  TH: 'Thermodynamics',
  AP: 'Applied Physics',
  RL: 'Relativity Theorist',
  AS: 'Astrophysicist'
}
const AVATARS = ['PH', 'QC', 'CM', 'EM', 'TH', 'AP', 'RL', 'AS']

// ── Skeleton ──
function ProgressSkeleton() {
  return (
    <div className="screen-container" style={{ paddingBottom: 'calc(var(--bottom-nav-height) + var(--space-4))' }}>
      {[80, 160, 200, 120].map((h, i) => (
        <div key={i} className="shimmer" style={{ height: h, marginBottom: 'var(--space-4)', borderRadius: 'var(--radius-lg)' }} />
      ))}
    </div>
  )
}

// ── Animated Mastery Bar ──
function MasteryBar({ score, animate }) {
  const [width, setWidth] = useState(0)
  const pct = Math.min(100, Math.max(0, Math.round(score || 0)))
  useEffect(() => {
    if (animate) {
      const t = setTimeout(() => setWidth(pct), 100)
      return () => clearTimeout(t)
    } else {
      setWidth(pct)
    }
  }, [pct, animate])

  const color = pct >= 80 ? 'var(--color-primary)' : pct >= 40 ? 'var(--navy-300)' : 'var(--navy-200)'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', width: '100%' }}>
      <div style={{ flex: 1, height: 8, borderRadius: 'var(--radius-full)', background: 'var(--navy-50)', overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${width}%`,
          borderRadius: 'var(--radius-full)', background: color,
          transition: 'width 1s var(--ease-decelerate)',
        }} />
      </div>
      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', minWidth: 32, textAlign: 'right', fontWeight: 'var(--weight-semibold)' }}>
        {pct}%
      </span>
    </div>
  )
}

export default function ProgressScreen() {
  const navigate = useNavigate()
  const isDesktop = useMediaQuery('(min-width: 1024px)')
  const { profile: progressPayload, fetchProfile, updateProfile, isLoading, error } = useProgressStore()

  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({ name: '', grade: '', avatar: '' })
  const [isSaving, setIsSaving] = useState(false)
  const [barsVisible, setBarsVisible] = useState(false)

  useEffect(() => {
    fetchProfile()
  }, [])

  useEffect(() => {
    if (progressPayload && !isEditing) {
      const p = progressPayload?.profile || progressPayload
      setEditForm({
        name:   p?.name   || '',
        grade:  p?.grade  || '6',
        avatar: p?.avatar || '🚀',
      })
    }
  }, [progressPayload, isEditing])

  useEffect(() => {
    const t = setTimeout(() => setBarsVisible(true), 300)
    return () => clearTimeout(t)
  }, [])

  const handleSave = async (e) => {
    e.preventDefault()
    if (!editForm.name.trim()) return
    setIsSaving(true)
    try {
      await updateProfile(editForm)
      setIsEditing(false)
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading && !progressPayload) return <ProgressSkeleton />

  if (error && !progressPayload) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-4)', padding: 'var(--space-6)', backgroundColor: 'var(--color-bg)' }}>
        <p style={{ color: 'var(--color-text-muted)', textAlign: 'center' }}>{error}</p>
        <button onClick={fetchProfile} style={{ padding: 'var(--space-3) var(--space-6)', background: 'var(--color-primary)', color: 'white', borderRadius: 'var(--radius-full)', fontWeight: 'var(--weight-bold)' }}>
          Retry
        </button>
      </div>
    )
  }

  const rawProfile = progressPayload?.profile || progressPayload || {}
  const mastery = progressPayload?.mastery || rawProfile?.mastery || {}
  const recentSessions = progressPayload?.recentSessions || []

  const name   = rawProfile?.name   || 'Explorer'
  const avatar = rawProfile?.avatar || '🚀'
  const grade  = rawProfile?.grade  || ''
  const streak = rawProfile?.streak || 0
  const badges = rawProfile?.badges || []

  const avgMastery = Object.values(mastery).reduce((a, b) => a + (b?.score || 0), 0) / (Object.keys(mastery).length || 1)

  return (
    <div style={{ backgroundColor: 'var(--color-bg)', minHeight: '100dvh', paddingBottom: 'calc(var(--bottom-nav-height) + var(--space-4))' }}>
      <div className="screen-container">

        {!isDesktop && (
          <div style={{
            paddingTop: 'calc(var(--space-4) + env(safe-area-inset-top, 0px))',
            marginBottom: 'var(--space-5)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <div>
              <h1 style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--weight-extrabold)' }}>My Progress</h1>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>Grade {grade} · {streak} day streak</p>
            </div>
            <div style={{
              width: 48, height: 48, borderRadius: '50%',
              background: 'var(--cream-100)', border: '1.5px solid var(--gold-500)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', 
              color: 'var(--obsidian-900)', fontWeight: 800, fontSize: 15,
            }}>
              {avatar && avatar.length <= 3 ? avatar : 'PH'}
            </div>
          </div>
        )}

        {isDesktop && (
          <div style={{ marginBottom: 'var(--space-6)', paddingTop: 'var(--space-8)' }}>
            <h1 style={{ fontSize: 'var(--text-3xl)', fontWeight: 'var(--weight-extrabold)' }}>My Progress</h1>
            <p style={{ fontSize: 'var(--text-base)', color: 'var(--color-text-muted)' }}>Overview of your mastery and learning activity</p>
          </div>
        )}

        <div className="card" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)', marginBottom: 'var(--space-5)' }}>
          {[
            { label: 'Overall Mastery', value: `${Math.min(100, Math.max(0, Math.round(avgMastery)))}%`, Icon: Target },
            { label: 'Badges Earned', value: `${badges.length} / ${BADGE_DEFS.length}`, Icon: Award },
            { label: 'Day Streak', value: `${streak} days`, Icon: Flame },
            { label: 'Sessions Logged', value: recentSessions.length, Icon: BookOpen },
          ].map(s => {
            const SIcon = s.Icon
            return (
              <div key={s.label} style={{ textAlign: 'center', padding: 'var(--space-2)' }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 6, color: 'var(--gold-600)' }}>
                  <SIcon size={20} strokeWidth={2} />
                </div>
                <div style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--weight-extrabold)', color: 'var(--color-primary)' }}>{s.value}</div>
                <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{s.label}</div>
              </div>
            )
          })}
        </div>

        <div className={isDesktop ? "desktop-two-col" : ""}>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
            <div className="card">
              <h2 className="section-header">Topic Mastery</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                {Object.values(SCENE_META).map(({ id, label, icon }) => (
                  <div key={id}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                        <span style={{ fontSize: 18 }}>{icon}</span>
                        <span style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-semibold)' }}>{label}</span>
                      </div>
                      <button
                        onClick={() => navigate(`/quiz/${id}`)}
                        style={{
                          fontSize: '10px', fontWeight: 'var(--weight-bold)',
                          color: 'var(--color-primary)',
                          border: '1px solid var(--navy-200)',
                          borderRadius: 'var(--radius-full)',
                          padding: '3px 10px',
                          background: 'var(--navy-50)',
                          minHeight: 'unset',
                        }}
                      >
                        Quiz
                      </button>
                    </div>
                    <MasteryBar score={mastery[id]?.score || 0} animate={barsVisible} />
                  </div>
                ))}
              </div>
            </div>

            {recentSessions.length > 0 && (
              <div className="card">
                <h2 className="section-header">Recent Sessions</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                  {recentSessions.slice(0, 20).map((s, i) => {
                    const meta = SCENE_META[s.conceptId]
                    const mins = Math.round((s.durationSeconds || 0) / 60)
                    return (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                        <div style={{
                          width: 40, height: 40, borderRadius: 'var(--radius-md)',
                          background: 'var(--cream-100)', border: '1px solid var(--color-border)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                          color: 'var(--obsidian-900)'
                        }}>
                          <LabIcon id={s.conceptId} size={20} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-semibold)' }}>{meta?.label || s.conceptId}</div>
                          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>{s.date} · {mins} min</div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)', marginTop: isDesktop ? 0 : 'var(--space-5)' }}>
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isEditing ? 'var(--space-4)' : 0 }}>
                <h2 className="section-header" style={{ marginBottom: 0 }}>Profile</h2>
                {!isEditing && (
                  <button
                    onClick={() => setIsEditing(true)}
                    style={{
                      fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-bold)',
                      color: 'var(--color-primary)', background: 'var(--navy-50)',
                      border: '1px solid var(--navy-200)', borderRadius: 'var(--radius-full)',
                      padding: 'var(--space-1) var(--space-4)', minHeight: 'unset',
                    }}
                  >
                    Edit
                  </button>
                )}
              </div>

              {!isEditing ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', paddingTop: 'var(--space-2)' }}>
                  <div style={{
                    width: 52, height: 52, borderRadius: '50%',
                    background: 'var(--cream-100)', border: '1.5px solid var(--gold-500)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 800, fontSize: 16, color: 'var(--obsidian-900)'
                  }}>
                    {avatar && avatar.length <= 3 ? avatar : 'PH'}
                  </div>
                  <div>
                    <div style={{ fontWeight: 'var(--weight-bold)', fontSize: 'var(--text-md)' }}>{name}</div>
                    <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>{AVATAR_TITLES[avatar] || 'Physicist'} · Grade {grade}</div>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSave}>
                  <div style={{ marginBottom: 'var(--space-4)' }}>
                    <label style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--weight-semibold)', color: 'var(--color-text-muted)', display: 'block', marginBottom: 'var(--space-2)' }}>
                      Physicist Role Specialization
                    </label>
                    <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                      {AVATARS.map(a => (
                        <button
                          key={a} type="button"
                          onClick={() => setEditForm(f => ({ ...f, avatar: a }))}
                          title={AVATAR_TITLES[a]}
                          style={{
                            width: 44, height: 44, borderRadius: '50%', fontSize: 13, fontWeight: 700,
                            border: editForm.avatar === a ? '2px solid var(--gold-600)' : '1px solid var(--color-border)',
                            background: editForm.avatar === a ? 'var(--obsidian-900)' : 'var(--cream-100)',
                            color: editForm.avatar === a ? 'var(--gold-400)' : 'var(--obsidian-900)',
                            minHeight: 'unset', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer', transition: 'all var(--transition-fast)'
                          }}
                        >
                          {a}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div style={{ marginBottom: 'var(--space-3)' }}>
                    <label style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--weight-semibold)', color: 'var(--color-text-muted)', display: 'block', marginBottom: 'var(--space-1)' }}>Name</label>
                    <input
                      value={editForm.name}
                      onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                      placeholder="Your name"
                      style={{
                        width: '100%', padding: 'var(--space-3)', fontSize: '16px',
                        border: '1.5px solid var(--color-border)', borderRadius: 'var(--radius-md)',
                        background: 'var(--cream-50)', color: 'var(--color-text)',
                      }}
                    />
                  </div>
                  <div style={{ marginBottom: 'var(--space-4)' }}>
                    <label style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--weight-semibold)', color: 'var(--color-text-muted)', display: 'block', marginBottom: 'var(--space-1)' }}>Grade</label>
                    <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                      {GRADES.map(g => (
                        <button
                          key={g} type="button"
                          onClick={() => setEditForm(f => ({ ...f, grade: g }))}
                          style={{
                            padding: 'var(--space-2) var(--space-3)',
                            borderRadius: 'var(--radius-md)',
                            border: editForm.grade === g ? '2px solid var(--color-primary)' : '1.5px solid var(--cream-300)',
                            background: editForm.grade === g ? 'var(--navy-50)' : 'var(--cream-100)',
                            color: editForm.grade === g ? 'var(--color-primary)' : 'var(--color-text-muted)',
                            fontWeight: 'var(--weight-semibold)', fontSize: 'var(--text-sm)',
                            minHeight: 'unset',
                          }}
                        >
                          {g}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      style={{
                        flex: 1, padding: 'var(--space-3)',
                        border: '1.5px solid var(--color-border)',
                        borderRadius: 'var(--radius-full)',
                        background: 'var(--cream-100)',
                        fontWeight: 'var(--weight-semibold)', fontSize: 'var(--text-sm)',
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit" disabled={isSaving}
                      style={{
                        flex: 2, padding: 'var(--space-3)',
                        background: isSaving ? 'var(--navy-300)' : 'var(--color-primary)',
                        color: 'white',
                        borderRadius: 'var(--radius-full)',
                        fontWeight: 'var(--weight-bold)', fontSize: 'var(--text-sm)',
                        boxShadow: 'var(--shadow-navy)',
                        opacity: isSaving ? 0.8 : 1,
                      }}
                    >
                      {isSaving ? 'Saving…' : 'Save Profile'}
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* ── Badges ── */}
            <div className="card">
              <h2 className="section-header">
                Badges
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-3)' }}>
                {BADGE_DEFS.map(b => {
                  const earned = badges.includes(b.id)
                  const BIcon = b.Icon
                  return (
                    <div key={b.id} title={b.desc} style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                      opacity: earned ? 1 : 0.35,
                      filter: earned ? 'none' : 'grayscale(1)',
                      transition: 'opacity 0.3s, filter 0.3s',
                    }}>
                      <div style={{
                        width: 52, height: 52, borderRadius: 'var(--radius-md)',
                        background: earned ? 'var(--cream-100)' : 'var(--cream-200)',
                        border: earned ? '1.5px solid var(--gold-500)' : '1px solid var(--color-border)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: earned ? 'var(--gold-600)' : 'var(--color-text-muted)',
                        boxShadow: earned ? 'var(--shadow-xs)' : 'none'
                      }}>
                        <BIcon size={24} strokeWidth={2} />
                      </div>
                      <span style={{ fontSize: '10px', textAlign: 'center', color: 'var(--color-text-muted)', fontWeight: 'var(--weight-semibold)', lineHeight: 1.2 }}>
                        {b.label}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  )
}
