/**
 * VISIORA — HomeScreen
 * Mobile-first home dashboard. Cream + Teal palette.
 * Shows greeting, streak, continue card, topic grid.
 */
import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProgressStore } from '../store/useProgressStore'
import { useUIStore } from '../store/useUIStore'
import { useAuthStore } from '../store/useAuthStore'
import { SCENE_META } from '../config/physics'
import { useMediaQuery } from '../hooks/useMediaQuery'

const BADGE_DEFS = [
  { id: 'first_session',               label: 'First Step',     icon: '🚀' },
  { id: 'five_day_streak',             label: 'Unstoppable',    icon: '🔥' },
  { id: 'concept_mastered_gravity',    label: 'Gravity Master', icon: '🍎' },
  { id: 'concept_mastered_projectile', label: 'Artillery',      icon: '☄️' },
  { id: 'concept_mastered_pendulum',   label: 'Timekeeper',     icon: '⏱️' },
  { id: 'concept_mastered_collision',  label: 'Impact',         icon: '💥' },
  { id: 'concept_mastered_angular',    label: 'Spin Doctor',    icon: '🌪️' },
  { id: 'all_rounder',                 label: 'All Rounder',    icon: '⭐' },
]

const BADGE_NAMES = {
  first_session:               'First Session',
  five_day_streak:             '5-Day Streak',
  concept_mastered_gravity:    'Mastered: Free Fall',
  concept_mastered_projectile: 'Mastered: Projectiles',
  concept_mastered_pendulum:   'Mastered: Pendulum',
  concept_mastered_collision:  'Mastered: Collisions',
  concept_mastered_angular:    'Mastered: Angular',
  all_rounder:                 'All-Rounder',
}

const AVATARS = {
  '🚀': '#EAF4F3',
  '⚡': '#FEF3E2',
  '🌊': '#EAF4F3',
  '🔬': '#F0EBF8',
  '🎯': '#FDEDEB',
}

// ── Skeleton ──────────────────────────────────────────────────────
function HomeScreenSkeleton() {
  return (
    <div style={{
      maxWidth: 480,
      margin: '0 auto',
      padding: 'var(--space-4)',
      paddingBottom: 'calc(var(--bottom-nav-height) + var(--space-4))',
    }}>
      {[80, 140, 180, 100, 100].map((h, i) => (
        <div key={i} className="shimmer" style={{ height: h, marginBottom: 'var(--space-4)', borderRadius: 'var(--radius-lg)' }} />
      ))}
    </div>
  )
}

// ── Mastery Bar ───────────────────────────────────────────────────
function MasteryBar({ score }) {
  const pct = Math.min(100, Math.max(0, Math.round(score || 0)))
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
      <div style={{
        flex: 1,
        height: 6,
        borderRadius: 'var(--radius-full)',
        background: 'var(--navy-100)',
        overflow: 'hidden',
      }}>
        <div style={{
          height: '100%',
          width: `${pct}%`,
          borderRadius: 'var(--radius-full)',
          background: pct >= 80
            ? 'var(--color-primary)'
            : pct >= 40
            ? 'var(--navy-300)'
            : 'var(--navy-200)',
          transition: 'width 0.8s var(--ease-decelerate)',
        }} />
      </div>
      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', minWidth: 28, textAlign: 'right' }}>
        {pct}%
      </span>
    </div>
  )
}

export default function HomeScreen() {
  const navigate = useNavigate()
  const isDesktop = useMediaQuery('(min-width: 1024px)')
  const progressPayload = useProgressStore(state => state.profile)
  const isLoading = useProgressStore(state => state.isLoading)
  const error = useProgressStore(state => state.error)
  const fetchProfile = useProgressStore(state => state.fetchProfile)
  const addToast = useUIStore(state => state.addToast)
  const user = useAuthStore(state => state.user)

  const [greeting, setGreeting] = useState('Good morning')

  useEffect(() => {
    const hour = new Date().getHours()
    if (hour < 12) setGreeting('Good morning')
    else if (hour < 17) setGreeting('Good afternoon')
    else setGreeting('Good evening')
  }, [])

  // Badge toast on new badges
  useEffect(() => {
    if (!progressPayload?.profile?.badges) return
    const earnedBadges = progressPayload.profile.badges
    let seenStr = localStorage.getItem('seen_badges')
    let seenBadges = seenStr ? JSON.parse(seenStr) : []
    let newFound = false
    earnedBadges.forEach(badge => {
      if (!seenBadges.includes(badge)) {
        addToast(`🏆 Badge earned: ${BADGE_NAMES[badge] || badge}`, 'success')
        seenBadges.push(badge)
        newFound = true
      }
    })
    if (newFound) localStorage.setItem('seen_badges', JSON.stringify(seenBadges))
  }, [progressPayload, addToast])

  // ── Error state
  if (error && !progressPayload) {
    return (
      <div style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--space-6)',
        backgroundColor: 'var(--color-bg)',
        gap: 'var(--space-4)',
      }}>
        <div style={{
          width: 64, height: 64,
          borderRadius: '50%',
          background: 'var(--color-error-bg)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 28,
        }}>⚠️</div>
        <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', fontSize: 'var(--text-sm)' }}>{error}</p>
        <button
          onClick={() => fetchProfile()}
          style={{
            padding: 'var(--space-3) var(--space-8)',
            backgroundColor: 'var(--color-primary)',
            color: 'white',
            borderRadius: 'var(--radius-full)',
            fontWeight: 'var(--weight-bold)',
            fontSize: 'var(--text-base)',
            boxShadow: 'var(--shadow-navy)',
          }}
        >
          Retry
        </button>
      </div>
    )
  }

  if (!progressPayload || isLoading) return <HomeScreenSkeleton />

  const { profile, mastery, recentSessions } = progressPayload

  // Continue card
  const lastSession = recentSessions?.[0]
  const continueConceptId = lastSession?.conceptId || 'gravity'
  const continueMeta = SCENE_META[continueConceptId] || SCENE_META['gravity']

  // Suggested (lowest mastery < 80%)
  let suggestedId = null
  let lowestScore = 100
  Object.keys(mastery || {}).forEach(id => {
    const score = mastery[id]?.score || 0
    if (score < 80 && score < lowestScore) {
      lowestScore = score
      suggestedId = id
    }
  })

  const displayName = profile?.name || user?.displayName || 'Explorer'
  const avatar = profile?.avatar || '🚀'
  const streak = profile?.streak || 0
  const badges = profile?.badges || []
  const avgMastery = Object.values(mastery || {}).reduce((a, b) => a + (b?.score || 0), 0) / (Object.keys(mastery || {}).length || 1)

  return (
    <div style={{
      backgroundColor: 'var(--color-bg)',
      minHeight: '100dvh',
      paddingBottom: 'calc(var(--bottom-nav-height) + var(--space-4) + env(safe-area-inset-bottom, 0px))',
    }}>
      <div className="screen-container">

        {/* ── Mobile Header ── */}
        {!isDesktop && (
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingTop: 'calc(var(--space-4) + env(safe-area-inset-top, 0px))',
            marginBottom: 'var(--space-5)',
          }}>
            <div>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', fontWeight: 'var(--weight-medium)' }}>
                {greeting} 👋
              </p>
              <h1 style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--weight-extrabold)', marginTop: 2 }}>
                {displayName}
              </h1>
            </div>
            <div style={{
              width: 48, height: 48,
              borderRadius: '50%',
              background: 'var(--navy-50)',
              border: '2.5px solid var(--navy-200)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 24,
            }}>
              {avatar}
            </div>
          </div>
        )}

        <div className={isDesktop ? "desktop-two-col" : ""}>
          {/* ── Main/Left Column ── */}
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            
            {/* ── Desktop Header ── */}
            {isDesktop && (
              <div style={{ marginBottom: 'var(--space-6)' }}>
                <p style={{ fontSize: 'var(--text-base)', color: 'var(--color-text-muted)', fontWeight: 'var(--weight-semibold)' }}>
                  {greeting} 👋
                </p>
                <h1 style={{ fontSize: 'var(--text-3xl)', fontWeight: 'var(--weight-extrabold)', marginTop: 2 }}>
                  {displayName}
                </h1>
              </div>
            )}

            {/* ── Continue Card ── */}
        <div
          onClick={() => navigate('/sim')}
          style={{
            backgroundColor: 'var(--color-primary)',
            borderRadius: 'var(--radius-xl)',
            padding: 'var(--space-5)',
            marginBottom: 'var(--space-5)',
            cursor: 'pointer',
            boxShadow: 'var(--shadow-navy)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 'var(--space-4)',
            position: 'relative',
            overflow: 'hidden',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          {/* Decorative blob */}
          <div style={{
            position: 'absolute', top: -20, right: -20,
            width: 100, height: 100,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.10)',
          }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <p style={{ fontSize: 'var(--text-xs)', color: 'rgba(255,255,255,0.75)', fontWeight: 'var(--weight-semibold)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Continue Learning
            </p>
            <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--weight-extrabold)', color: 'white', marginBottom: 'var(--space-1)' }}>
              {continueMeta.icon} {continueMeta.label}
            </h2>
            <p style={{ fontSize: 'var(--text-xs)', color: 'rgba(255,255,255,0.7)' }}>
              {continueMeta.description}
            </p>
          </div>
          <div style={{
            flexShrink: 0,
            width: 44, height: 44,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20,
          }}>
            ▶
          </div>
        </div>

        {/* ── Topics Grid ── */}
        <h2 className="section-header" style={{ marginTop: 'var(--space-5)' }}>
          Suggested Topics
        </h2>
        <div style={{
          display: 'grid',
          gridTemplateColumns: isDesktop ? '1fr 1fr 1fr' : '1fr 1fr',
          gap: 'var(--space-3)',
          marginBottom: 'var(--space-6)',
        }}>
          {Object.values(SCENE_META).map(({ id, label, icon, description }) => {
            const score = mastery?.[id]?.score || 0
            const pct = Math.min(100, Math.max(0, Math.round(score)))
            const isSuggested = id === suggestedId
            return (
              <div
                key={id}
                className="card interactive"
                onClick={() => navigate('/sim')}
                style={{
                  border: isSuggested ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                  boxShadow: isSuggested ? 'var(--shadow-navy)' : 'var(--shadow-xs)',
                  position: 'relative',
                  marginBottom: 0,
                }}
              >
                {isSuggested && (
                  <span style={{
                    position: 'absolute', top: 8, right: 8,
                    fontSize: '9px',
                    fontWeight: 'var(--weight-bold)',
                    background: 'var(--color-primary)',
                    color: 'white',
                    padding: '2px 6px',
                    borderRadius: 'var(--radius-full)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}>
                    Try Next
                  </span>
                )}
                <div style={{ fontSize: 28, marginBottom: 'var(--space-2)' }}>{icon}</div>
                <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-bold)', marginBottom: 4, color: 'var(--color-text)' }}>
                  {label}
                </div>
                <MasteryBar score={score} />
              </div>
            )
          })}
        </div>

        {/* ── Mobile Stats Row ── */}
        {!isDesktop && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: 'var(--space-3)',
            marginBottom: 'var(--space-5)',
          }}>
            {[
              { label: 'Streak', value: `${streak}🔥`, sub: 'days' },
              { label: 'Mastery', value: `${Math.min(100, Math.max(0, Math.round(avgMastery)))}%`, sub: 'overall' },
              { label: 'Badges', value: `${badges.length}🏆`, sub: 'earned' },
            ].map(stat => (
              <div key={stat.label} className="card" style={{
                padding: 'var(--space-3) var(--space-3)',
                textAlign: 'center',
                marginBottom: 0,
              }}>
                <div style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--weight-extrabold)', color: 'var(--color-primary)', lineHeight: 1.2 }}>
                  {stat.value}
                </div>
                <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', marginTop: 2 }}>
                  {stat.sub}
                </div>
              </div>
            ))}
          </div>
        )}

        </div>

        {/* ── Right Column (Desktop) ── */}
        {isDesktop && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)', marginTop: '24px' }}>
            
            {/* Desktop Stats Card */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', padding: 'var(--space-5)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', fontWeight: 'var(--weight-semibold)' }}>Overall Mastery</span>
                <span style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--weight-extrabold)', color: 'var(--color-primary)' }}>
                  {Math.min(100, Math.max(0, Math.round(avgMastery)))}%
                </span>
              </div>
              <div style={{ height: 1, background: 'var(--color-border)' }} />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', fontWeight: 'var(--weight-semibold)' }}>Day Streak</span>
                <span style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--weight-extrabold)', color: 'var(--color-primary)' }}>
                  {streak}🔥
                </span>
              </div>
              <div style={{ height: 1, background: 'var(--color-border)' }} />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', fontWeight: 'var(--weight-semibold)' }}>Badges Earned</span>
                <span style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--weight-extrabold)', color: 'var(--color-primary)' }}>
                  {badges.length}🏆
                </span>
              </div>
            </div>

            {/* Desktop Recent Sessions */}
            {recentSessions?.length > 0 && (
              <div className="card" style={{ padding: 'var(--space-5)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
                  <h3 className="section-header" style={{ marginBottom: 0 }}>Recent Activity</h3>
                  <button onClick={() => navigate('/progress')} style={{ fontSize: 'var(--text-xs)', color: 'var(--color-primary)', fontWeight: 'var(--weight-bold)' }}>
                    View all →
                  </button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                  {recentSessions.slice(0, 3).map((s, i) => {
                    const meta = SCENE_META[s.conceptId]
                    const mins = Math.round((s.durationSeconds || 0) / 60)
                    return (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                        <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-sm)', background: 'var(--color-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>
                          {meta?.icon || '🔬'}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-semibold)' }}>{meta?.label || 'Physics'}</div>
                          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>{mins} min session</div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Desktop Badge Teaser */}
            {badges?.length > 0 && (
              <div className="card" style={{ padding: 'var(--space-5)' }}>
                <h3 className="section-header">Latest Badges</h3>
                <div style={{ display: 'flex', gap: 'var(--space-3)', overflowX: 'auto', paddingBottom: 4 }}>
                  {badges.slice(0, 4).map(badgeId => {
                    const b = BADGE_DEFS.find(def => def.id === badgeId)
                    if (!b) return null
                    return (
                      <div key={badgeId} title={b.label} style={{
                        width: 48, height: 48, borderRadius: '50%',
                        background: 'var(--navy-50)', border: '2px solid var(--navy-200)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 24, flexShrink: 0
                      }}>
                        {b.icon}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

          </div>
        )}
        </div>

        {/* ── Quick Quiz ── */}
        <h2 className="section-header">
          Test Your Knowledge
        </h2>
        <div style={{ display: 'flex', gap: 'var(--space-2)', overflowX: 'auto', paddingBottom: 'var(--space-2)', scrollbarWidth: 'none' }}>
          {Object.values(SCENE_META).map(({ id, label, icon }) => (
            <button
              key={id}
              onClick={() => navigate(`/quiz/${id}`)}
              style={{
                flexShrink: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 'var(--space-1)',
                padding: 'var(--space-3) var(--space-4)',
                borderRadius: 'var(--radius-lg)',
                border: '1.5px solid var(--color-border)',
                background: 'var(--color-surface)',
                cursor: 'pointer',
                minHeight: 'unset',
                boxShadow: 'var(--shadow-xs)',
              }}
            >
              <span style={{ fontSize: 22 }}>{icon}</span>
              <span style={{ fontSize: '11px', fontWeight: 'var(--weight-semibold)', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                {label}
              </span>
            </button>
          ))}
        </div>

      </div>
    </div>
  )
}
