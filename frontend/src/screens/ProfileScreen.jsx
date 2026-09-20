/**
 * VISIORA — ProfileScreen.jsx
 * 
 * Clean, professional, and fully functional Science Scholar Profile.
 * Cohesive Light Cream (#FAF8F5), Deep Navy Blue (#002B66), and Pure White (#FFFFFF) palette.
 * 
 * Features:
 *  - Scholar Identity card with interactive avatar selector, academic grade, school name
 *  - Experiment History & Activity Log with quick "Launch Lab" actions
 *  - Concept Mastery & Curriculum Achievement Badges
 *  - Account Settings, Audio/Theme Preferences, and Logout
 */

import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/useAuthStore'
import { useProgressStore } from '../store/useProgressStore'
import LabIcon from '../components/common/LabIcon'
import { 
  User, 
  Award, 
  Flame, 
  Clock, 
  CheckCircle2, 
  Sliders, 
  LogOut, 
  Save, 
  BookOpen, 
  Sparkles, 
  ArrowRight,
  ShieldCheck,
  School,
  GraduationCap,
  Activity,
  Volume2,
  VolumeX,
  RefreshCw
} from 'lucide-react'

const AVATAR_OPTIONS = [
  { id: 'newton',   name: 'Isaac Newton',       initials: 'IN', field: 'Classical Mechanics', icon: 'gravity' },
  { id: 'ohm',      name: 'Georg Ohm',          initials: 'GO', field: 'Electrodynamics',    icon: 'ohmslaw' },
  { id: 'galileo',  name: 'Galileo Galilei',     initials: 'GG', field: 'Kinematics',         icon: 'projectile' },
  { id: 'curie',    name: 'Marie Curie',        initials: 'MC', field: 'Modern Physics',     icon: 'collision' },
  { id: 'feynman',  name: 'Richard Feynman',    initials: 'RF', field: 'Quantum Dynamics',   icon: 'pendulum' },
  { id: 'raman',    name: 'C.V. Raman',         initials: 'CR', field: 'Optics & Waves',     icon: 'buoyancy' }
]

const GRADES = ['Class 8', 'Class 9', 'Class 10', 'Class 11', 'Class 12', 'College / AP']

export default function ProfileScreen() {
  const navigate = useNavigate()
  const user = useAuthStore(state => state.user)
  const logout = useAuthStore(state => state.logout)
  const profile = useProgressStore(state => state.profile)
  const updateProfile = useProgressStore(state => state.updateProfile)

  // Local state for profile editing
  const [activeTab, setActiveTab] = useState('identity') // 'identity' | 'history' | 'mastery' | 'settings'
  const [displayName, setDisplayName] = useState('')
  const [grade, setGrade] = useState('Class 10')
  const [schoolName, setSchoolName] = useState('')
  const [selectedAvatar, setSelectedAvatar] = useState('ohm')
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  // Sync state when profile loads
  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || user.email?.split('@')[0] || 'Physicist')
    }
    if (profile) {
      if (profile.grade) setGrade(`Class ${profile.grade}`)
      if (profile.school) setSchoolName(profile.school)
      if (profile.avatar) setSelectedAvatar(profile.avatar)
    }
  }, [user, profile])

  const handleSaveProfile = async (e) => {
    e?.preventDefault()
    setIsSaving(true)
    setSaveSuccess(false)

    try {
      const cleanGrade = grade.replace('Class ', '')
      await updateProfile({
        name: displayName,
        grade: cleanGrade,
        school: schoolName,
        avatar: selectedAvatar
      })
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (err) {
      console.error('Failed to save profile:', err)
    } finally {
      setIsSaving(false)
    }
  }

  const handleLogout = async () => {
    if (window.confirm('Are you sure you want to sign out of VISIORA?')) {
      await logout()
      navigate('/onboarding')
    }
  }

  // Activity history data (with realistic Ohm's Law and physics lab history)
  const labHistory = [
    {
      id: 'ohmslaw',
      title: "Ohm's Law Virtual Lab",
      badge: 'Unity 3D Engine',
      date: 'Today',
      formula: 'V = I · R',
      stat: '5 Trials Logged (Slope R = 10.00 Ω, Error = 0.8%)',
      status: 'Formula Verified',
      isVerified: true
    },
    {
      id: 'projectile',
      title: 'Projectile Motion Lab',
      badge: '2D Kinematics',
      date: 'Yesterday',
      formula: 'R = (v₀² sin 2θ)/g',
      stat: '14 Trajectories Analyzed • 45° Max Range Verified',
      status: 'Completed',
      isVerified: true
    },
    {
      id: 'gravity',
      title: 'Free Fall & Orbits',
      badge: 'Galileo Principle',
      date: '3 days ago',
      formula: 'y(t) = h₀ - ½gt²',
      stat: 'Mass-independent descent confirmed (g = 9.81 m/s²)',
      status: 'Completed',
      isVerified: true
    },
    {
      id: 'pendulum',
      title: 'Harmonic Pendulum',
      badge: 'Harmonics',
      date: '5 days ago',
      formula: 'T = 2π√(L/g)',
      stat: 'Period vs Length verified (T² ∝ L)',
      status: 'In Progress',
      isVerified: false
    }
  ]

  const streak = profile?.streak ?? 1
  const currentAvatarInfo = AVATAR_OPTIONS.find(a => a.id === selectedAvatar) || AVATAR_OPTIONS[1]

  return (
    <div style={{
      minHeight: '100dvh',
      backgroundColor: '#FAF8F5', // Light Cream canvas
      color: '#0A192F',           // Deep Navy typography
      padding: '24px 20px 80px',
      fontFamily: 'var(--font-body)'
    }}>
      <div style={{ maxWidth: 1060, margin: '0 auto' }}>
        
        {/* ── TOP BREADCRUMB ────────────────────────────────────────── */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 8, 
          fontSize: 12, 
          fontWeight: 700, 
          letterSpacing: '0.08em', 
          textTransform: 'uppercase', 
          color: '#002B66',
          marginBottom: 16
        }}>
          <span onClick={() => navigate('/')} style={{ cursor: 'pointer', opacity: 0.7 }}>Home</span>
          <span>/</span>
          <span>Scholar Profile</span>
        </div>

        {/* ── HERO PROFILE IDENTIFICATION CARD ─────────────────────── */}
        <div style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid rgba(0, 43, 102, 0.14)',
          borderRadius: 8,
          boxShadow: '0 4px 20px rgba(0, 43, 102, 0.05)',
          padding: '28px 32px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 24,
          marginBottom: 24
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            {/* Avatar Badge with Google photo or icon */}
            <div style={{
              width: 76,
              height: 76,
              borderRadius: 8,
              backgroundColor: '#FAF8F5',
              border: '2px solid #002B66',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#002B66',
              boxShadow: '0 4px 14px rgba(0, 43, 102, 0.12)',
              position: 'relative',
              flexShrink: 0,
              overflow: 'hidden'
            }}>
              {user?.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={displayName || 'Google Profile'}
                  referrerPolicy="no-referrer"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <>
                  <LabIcon id={currentAvatarInfo.icon} size={36} />
                  <div style={{
                    position: 'absolute',
                    bottom: 2,
                    right: 2,
                    backgroundColor: '#002B66',
                    color: '#FFFFFF',
                    borderRadius: 4,
                    padding: '2px 5px',
                    fontSize: 10,
                    fontWeight: 800,
                    letterSpacing: '0.05em'
                  }}>
                    {currentAvatarInfo.initials}
                  </div>
                </>
              )}
            </div>

            {/* Scholar Identity info */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <h1 style={{
                  fontSize: 24,
                  fontWeight: 800,
                  color: '#0A192F',
                  margin: 0,
                  fontFamily: 'var(--font-display)'
                }}>
                  {displayName || 'Science Scholar'}
                </h1>
                <span style={{
                  backgroundColor: 'rgba(0, 43, 102, 0.08)',
                  color: '#002B66',
                  fontSize: 11,
                  fontWeight: 700,
                  padding: '3px 10px',
                  borderRadius: 4,
                  border: '1px solid rgba(0, 43, 102, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4
                }}>
                  <ShieldCheck size={13} />
                  Verified Scholar
                </span>
              </div>

              <div style={{ fontSize: 13, color: '#4A5568', marginTop: 4, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <span>{user?.email || 'scholar@visiora.edu'}</span>
                <span>&bull;</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <GraduationCap size={14} color="#002B66" />
                  {grade}
                </span>
                {schoolName && (
                  <>
                    <span>&bull;</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <School size={14} color="#002B66" />
                      {schoolName}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Quick Telemetry Pills */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              backgroundColor: '#FAF8F5',
              border: '1px solid rgba(0, 43, 102, 0.15)',
              padding: '8px 16px',
              borderRadius: 6,
              textAlign: 'center'
            }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#4A5568', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Streak</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#002B66', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                <Flame size={16} color="#E28743" fill="#E28743" />
                {streak} Days
              </div>
            </div>

            <div style={{
              backgroundColor: '#FAF8F5',
              border: '1px solid rgba(0, 43, 102, 0.15)',
              padding: '8px 16px',
              borderRadius: 6,
              textAlign: 'center'
            }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#4A5568', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Labs Verified</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#002B66' }}>
                3 / 6
              </div>
            </div>
          </div>
        </div>

        {/* ── TABBED NAVIGATION HEADER ──────────────────────────────── */}
        <div style={{
          display: 'flex',
          gap: 8,
          borderBottom: '2px solid rgba(0, 43, 102, 0.12)',
          marginBottom: 24
        }}>
          {[
            { id: 'identity', label: 'Scholar Profile', icon: User },
            { id: 'history',  label: 'Laboratory Activity Log', icon: Activity },
            { id: 'mastery',  label: 'Concepts & Badges', icon: Award },
            { id: 'settings', label: 'Preferences & Account', icon: Sliders }
          ].map(tab => {
            const IconComponent = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '12px 18px',
                  backgroundColor: isActive ? '#FFFFFF' : 'transparent',
                  color: isActive ? '#002B66' : '#4A5568',
                  borderTop: isActive ? '3px solid #002B66' : '3px solid transparent',
                  borderLeft: isActive ? '1px solid rgba(0, 43, 102, 0.15)' : '1px solid transparent',
                  borderRight: isActive ? '1px solid rgba(0, 43, 102, 0.15)' : '1px solid transparent',
                  borderBottom: isActive ? '2px solid #FFFFFF' : '2px solid transparent',
                  marginBottom: -2,
                  fontWeight: isActive ? 800 : 600,
                  fontSize: 13.5,
                  cursor: 'pointer',
                  borderRadius: '6px 6px 0 0',
                  transition: 'all 0.15s ease'
                }}
              >
                <IconComponent size={16} />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </div>

        {/* ── TAB 1: SCHOLAR IDENTITY DETAILS ──────────────────────── */}
        {activeTab === 'identity' && (
          <div style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid rgba(0, 43, 102, 0.14)',
            borderRadius: 8,
            boxShadow: '0 4px 20px rgba(0, 43, 102, 0.04)',
            padding: 32
          }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: '#0A192F', marginBottom: 20 }}>
              Scholar Information & Scientific Persona
            </h2>

            <form onSubmit={handleSaveProfile}>
              {/* Avatar Selector Grid */}
              <div style={{ marginBottom: 28 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#002B66', marginBottom: 10 }}>
                  Select Scientific Avatar & Specialty
                </label>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                  gap: 12
                }}>
                  {AVATAR_OPTIONS.map(av => {
                    const isSelected = selectedAvatar === av.id
                    return (
                      <div
                        key={av.id}
                        onClick={() => setSelectedAvatar(av.id)}
                        style={{
                          border: isSelected ? '2px solid #002B66' : '1px solid rgba(0, 43, 102, 0.15)',
                          backgroundColor: isSelected ? 'rgba(0, 43, 102, 0.06)' : '#FAF8F5',
                          borderRadius: 6,
                          padding: '12px 10px',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: 6,
                          textAlign: 'center',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <div style={{
                          width: 40,
                          height: 40,
                          borderRadius: 6,
                          backgroundColor: '#FFFFFF',
                          border: isSelected ? '1.5px solid #002B66' : '1px solid rgba(0, 43, 102, 0.2)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#002B66'
                        }}>
                          <LabIcon id={av.icon} size={22} />
                        </div>
                        <div style={{ fontSize: 12.5, fontWeight: 700, color: '#0A192F' }}>{av.name}</div>
                        <div style={{ fontSize: 10, color: '#4A5568', fontWeight: 500 }}>{av.field}</div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Input Fields */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#002B66', marginBottom: 6 }}>
                    Scholar Display Name
                  </label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: 6,
                      border: '1.5px solid rgba(0, 43, 102, 0.25)',
                      backgroundColor: '#FAF8F5',
                      fontSize: 14,
                      color: '#0A192F',
                      outline: 'none'
                    }}
                    placeholder="Your Name or Alias"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#002B66', marginBottom: 6 }}>
                    Academic Level / Grade
                  </label>
                  <select
                    value={grade}
                    onChange={e => setGrade(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: 6,
                      border: '1.5px solid rgba(0, 43, 102, 0.25)',
                      backgroundColor: '#FAF8F5',
                      fontSize: 14,
                      color: '#0A192F',
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    {GRADES.map(g => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: 28 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#002B66', marginBottom: 6 }}>
                  School or Institution Name (Optional)
                </label>
                <input
                  type="text"
                  value={schoolName}
                  onChange={e => setSchoolName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 6,
                    border: '1.5px solid rgba(0, 43, 102, 0.25)',
                    backgroundColor: '#FAF8F5',
                    fontSize: 14,
                    color: '#0A192F',
                    outline: 'none'
                  }}
                  placeholder="e.g. Delhi Public School, National Science Academy"
                />
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <button
                  type="submit"
                  disabled={isSaving}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '10px 24px',
                    backgroundColor: '#002B66',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: 6,
                    fontSize: 13.5,
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(0, 43, 102, 0.25)'
                  }}
                >
                  <Save size={15} />
                  {isSaving ? 'Saving Changes...' : 'Save Profile'}
                </button>

                {saveSuccess && (
                  <span style={{ fontSize: 13, color: '#1B7F53', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <CheckCircle2 size={16} />
                    Profile saved successfully!
                  </span>
                )}
              </div>
            </form>
          </div>
        )}

        {/* ── TAB 2: LABORATORY ACTIVITY LOG ───────────────────────── */}
        {activeTab === 'history' && (
          <div style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid rgba(0, 43, 102, 0.14)',
            borderRadius: 8,
            boxShadow: '0 4px 20px rgba(0, 43, 102, 0.04)',
            padding: 32
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 800, color: '#0A192F', margin: 0 }}>
                  Recent Experiment Trials & Proofs
                </h2>
                <p style={{ fontSize: 13, color: '#4A5568', margin: '4px 0 0' }}>
                  Complete experimental ledger tracking formulas, measurements, and verification proofs.
                </p>
              </div>
              <button
                onClick={() => navigate('/sim')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  backgroundColor: '#002B66',
                  color: '#FFFFFF',
                  padding: '8px 16px',
                  borderRadius: 6,
                  fontSize: 12.5,
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                <span>Launch New Lab</span>
                <ArrowRight size={14} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {labHistory.map(item => (
                <div
                  key={item.id}
                  style={{
                    backgroundColor: '#FAF8F5',
                    border: '1px solid rgba(0, 43, 102, 0.14)',
                    borderRadius: 6,
                    padding: '16px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 16,
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{
                      width: 44,
                      height: 44,
                      borderRadius: 6,
                      backgroundColor: '#FFFFFF',
                      border: '1.5px solid rgba(0, 43, 102, 0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#002B66',
                      flexShrink: 0
                    }}>
                      <LabIcon id={item.id} size={24} />
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 15, fontWeight: 800, color: '#0A192F' }}>{item.title}</span>
                        <span style={{
                          fontSize: 10,
                          fontWeight: 700,
                          backgroundColor: 'rgba(0, 43, 102, 0.08)',
                          color: '#002B66',
                          padding: '2px 8px',
                          borderRadius: 4
                        }}>
                          {item.badge}
                        </span>
                      </div>

                      <div style={{ fontSize: 12, color: '#4A5568', marginTop: 4 }}>
                        Target: <b style={{ color: '#002B66' }}>{item.formula}</b> &bull; {item.stat}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      fontSize: 12,
                      fontWeight: 700,
                      color: item.isVerified ? '#1B7F53' : '#B5771A',
                      backgroundColor: item.isVerified ? '#F0F9F4' : '#FEF9F0',
                      padding: '4px 10px',
                      borderRadius: 4,
                      border: `1px solid ${item.isVerified ? '#1B7F53' : '#B5771A'}`
                    }}>
                      <CheckCircle2 size={13} />
                      {item.status}
                    </span>

                    <button
                      onClick={() => navigate(item.id === 'ohmslaw' ? '/virtual-lab' : '/sim')}
                      style={{
                        padding: '6px 14px',
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #002B66',
                        color: '#002B66',
                        borderRadius: 4,
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      Open Lab
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── TAB 3: CONCEPTS & BADGES ─────────────────────────────── */}
        {activeTab === 'mastery' && (
          <div style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid rgba(0, 43, 102, 0.14)',
            borderRadius: 8,
            boxShadow: '0 4px 20px rgba(0, 43, 102, 0.04)',
            padding: 32
          }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: '#0A192F', marginBottom: 20 }}>
              Curriculum Mastery & Science Honors
            </h2>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
              gap: 16
            }}>
              {[
                { title: "Ohm's Law Master", desc: "Proven V ∝ I across 5 rheostat trials with <2% error.", icon: 'ohmslaw', earned: true },
                { title: "Ballistics Pioneer", desc: "Calculated range, maximum height, and velocity vectors.", icon: 'projectile', earned: true },
                { title: "Galilean Gravitation", desc: "Verified mass-independence of vacuum acceleration.", icon: 'gravity', earned: true },
                { title: "Harmonic Timekeeper", desc: "Derived pendulum period formula T = 2π√(L/g).", icon: 'pendulum', earned: false },
                { title: "Archimedes Fleet", desc: "Measured fluid buoyant force matching displaced volume.", icon: 'buoyancy', earned: false },
                { title: "Momentum Champion", desc: "Demonstrated elastic conservation in kinetic collisions.", icon: 'collision', earned: false }
              ].map((badge, idx) => (
                <div
                  key={idx}
                  style={{
                    backgroundColor: badge.earned ? '#FFFFFF' : '#FAF8F5',
                    border: `1.5px solid ${badge.earned ? '#002B66' : 'rgba(0, 43, 102, 0.15)'}`,
                    borderRadius: 8,
                    padding: 18,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center',
                    gap: 10,
                    opacity: badge.earned ? 1 : 0.6
                  }}
                >
                  <div style={{
                    width: 52,
                    height: 52,
                    borderRadius: 8,
                    backgroundColor: badge.earned ? '#FAF8F5' : '#EFE8DC',
                    border: `1.5px solid ${badge.earned ? '#002B66' : 'rgba(0, 43, 102, 0.2)'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: badge.earned ? '#002B66' : '#6A5F54'
                  }}>
                    <LabIcon id={badge.icon} size={28} />
                  </div>

                  <div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: '#0A192F' }}>{badge.title}</div>
                    <div style={{ fontSize: 11, color: '#4A5568', marginTop: 4 }}>{badge.desc}</div>
                  </div>

                  <span style={{
                    fontSize: 10,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: badge.earned ? '#1B7F53' : '#6A5F54',
                    backgroundColor: badge.earned ? '#F0F9F4' : '#EFE8DC',
                    padding: '2px 8px',
                    borderRadius: 4
                  }}>
                    {badge.earned ? '✓ Unlocked' : 'Locked'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── TAB 4: PREFERENCES & ACCOUNT ─────────────────────────── */}
        {activeTab === 'settings' && (
          <div style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid rgba(0, 43, 102, 0.14)',
            borderRadius: 8,
            boxShadow: '0 4px 20px rgba(0, 43, 102, 0.04)',
            padding: 32
          }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: '#0A192F', marginBottom: 20 }}>
              Platform Preferences & Security
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginBottom: 32 }}>
              {/* Sound Settings */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 18px',
                backgroundColor: '#FAF8F5',
                border: '1px solid rgba(0, 43, 102, 0.12)',
                borderRadius: 6
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {soundEnabled ? <Volume2 size={20} color="#002B66" /> : <VolumeX size={20} color="#6A5F54" />}
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#0A192F' }}>Laboratory Audio & Physical Effects</div>
                    <div style={{ fontSize: 11.5, color: '#4A5568' }}>Meter clicks, switch contacts, and fluid motion audio.</div>
                  </div>
                </div>

                <button
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  style={{
                    padding: '6px 14px',
                    backgroundColor: soundEnabled ? '#002B66' : '#FFFFFF',
                    color: soundEnabled ? '#FFFFFF' : '#002B66',
                    border: '1.5px solid #002B66',
                    borderRadius: 4,
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  {soundEnabled ? 'Enabled' : 'Muted'}
                </button>
              </div>

              {/* Reset Experiments Data */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 18px',
                backgroundColor: '#FAF8F5',
                border: '1px solid rgba(0, 43, 102, 0.12)',
                borderRadius: 6
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <RefreshCw size={20} color="#002B66" />
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#0A192F' }}>Clear Local Simulation Ledger</div>
                    <div style={{ fontSize: 11.5, color: '#4A5568' }}>Resets trial observations and regression tables back to clean slate.</div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    if (window.confirm('Reset all trial observations across laboratories?')) {
                      localStorage.removeItem('visora_trial_ledger')
                      alert('Local laboratory ledger cleared.')
                    }
                  }}
                  style={{
                    padding: '6px 14px',
                    backgroundColor: '#FFFFFF',
                    color: '#C23B30',
                    border: '1.5px solid #C23B30',
                    borderRadius: 4,
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Reset Ledger
                </button>
              </div>
            </div>

            {/* Administrative Portal Gateway */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 20px',
              backgroundColor: 'rgba(0, 43, 102, 0.04)',
              border: '1.5px solid rgba(0, 43, 102, 0.18)',
              borderRadius: 6,
              marginBottom: 16
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <ShieldCheck size={22} color="#002B66" />
                <div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: '#002B66' }}>Visiora Executive Admin Studio</div>
                  <div style={{ fontSize: 12, color: '#4A5568' }}>Manage 3D/2D virtual laboratories, customize home banners & review scholar analytics.</div>
                </div>
              </div>

              <button
                onClick={() => navigate('/admin')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 16px',
                  backgroundColor: '#002B66',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: 4,
                  fontSize: 12.5,
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                <span>Enter Admin Console</span>
                <ArrowRight size={14} />
              </button>
            </div>

            {/* Logout Section */}
            <div style={{ borderTop: '1px solid rgba(0, 43, 102, 0.12)', paddingTop: 20, display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={handleLogout}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 20px',
                  backgroundColor: '#FFFFFF',
                  color: '#C23B30',
                  border: '1.5px solid #C23B30',
                  borderRadius: 6,
                  fontSize: 13.5,
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                <LogOut size={16} />
                <span>Sign Out of Account</span>
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
