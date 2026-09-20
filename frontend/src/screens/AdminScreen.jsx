import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAdminStore } from '../store/useAdminStore'
import { useAuthStore } from '../store/useAuthStore'
import {
  ShieldCheck,
  Lock,
  Plus,
  Trash2,
  Edit2,
  ExternalLink,
  Image as ImageIcon,
  Users,
  Layers,
  Sparkles,
  CheckCircle,
  XCircle,
  Upload,
  RefreshCw,
  Search,
  ArrowUpRight,
  LogOut,
  ChevronRight,
  SlidersHorizontal,
  Flame,
  Award,
  Globe
} from 'lucide-react'

export default function AdminScreen() {
  const navigate = useNavigate()
  const {
    adminUser,
    isAdminAuthenticated,
    isAuthLoading,
    authError,
    loginWithGoogle,
    enableDevAdmin,
    logoutAdmin,
    bannerImage,
    showcaseImage,
    setBannerImage,
    setShowcaseImage,
    resetHomeImages,
    visualizations,
    addVisualization,
    updateVisualization,
    deleteVisualization,
    toggleVisualizationActive,
    usersList,
    fetchAdminData
  } = useAdminStore()

  const [activeTab, setActiveTab] = useState('visualizations') // 'visualizations' | 'images' | 'users'
  const [modalOpen, setModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [userSearch, setUserSearch] = useState('')
  const [statusMessage, setStatusMessage] = useState('')

  // Form state for 2D Visualizations modal
  const [formTitle, setFormTitle] = useState('')
  const [formSubtitle, setFormSubtitle] = useState('')
  const [formCategory, setFormCategory] = useState('Kinematics & Dynamics')
  const [formTargetUrl, setFormTargetUrl] = useState('')
  const [formImageUrl, setFormImageUrl] = useState('')
  const [formBadge, setFormBadge] = useState('Interactive 2D')
  const [formIsActive, setFormIsActive] = useState(true)

  // Form state for Home Images
  const [inputBanner, setInputBanner] = useState(bannerImage)
  const [inputShowcase, setInputShowcase] = useState(showcaseImage)
  const bannerFileRef = useRef(null)
  const showcaseFileRef = useRef(null)
  const modalFileRef = useRef(null)

  const POPULAR_2D_PRESETS = [
    {
      title: "Energy Forms & Changes: Thermal Physics & Systems",
      subtitle: "Experiment with heat conduction, thermal equilibrium, floating energy packets, and multi-stage power generation",
      category: "Thermodynamics",
      targetUrl: "https://phet.colorado.edu/sims/html/energy-forms-and-changes/latest/energy-forms-and-changes_en.html",
      imageUrl: "/images/energy_forms_changes_banner.jpg",
      badge: "Featured 2D Lab"
    },
    {
      title: "Faraday's Electromagnetic Induction & Magnets",
      subtitle: "Explore bar magnets, electromagnets, transformers, and magnetic flux generator coils",
      category: "Electromagnetism",
      targetUrl: "https://phet.colorado.edu/sims/html/faradays-law/latest/faradays-law_all.html",
      imageUrl: "https://images.unsplash.com/photo-1507668077129-56e32842fceb?auto=format&fit=crop&w=800&q=80",
      badge: "PhET Simulation"
    },
    {
      title: "Energy Skate Park: Kinetic & Potential Conservation",
      subtitle: "Track mechanical energy barter between kinetic, gravitational potential, and thermal friction",
      category: "Kinematics & Dynamics",
      targetUrl: "https://phet.colorado.edu/sims/html/energy-skate-park/latest/energy-skate-park_all.html",
      imageUrl: "https://images.unsplash.com/photo-1517420704952-d9f39e95b43e?auto=format&fit=crop&w=800&q=80",
      badge: "PhET Energy Lab"
    },
    {
      title: "Balancing Act: Rotational Torque & Lever Mechanics",
      subtitle: "Investigate rotational equilibrium, center of mass, and fulcrum moments of force",
      category: "Kinematics & Dynamics",
      targetUrl: "https://phet.colorado.edu/sims/html/balancing-act/latest/balancing-act_all.html",
      imageUrl: "https://images.unsplash.com/photo-1509228468518-180dd4864904?auto=format&fit=crop&w=800&q=80",
      badge: "Statics & Torque"
    }
  ]

  const handleApplyPreset = async (preset) => {
    await addVisualization({
      title: preset.title,
      subtitle: preset.subtitle,
      category: preset.category,
      targetUrl: preset.targetUrl,
      imageUrl: preset.imageUrl,
      badge: preset.badge,
      isActive: true
    })
    flashMessage(`✓ Added "${preset.title}" to Home Page!`)
  }

  const handleModalImageUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      setFormImageUrl(ev.target.result)
    }
    reader.readAsDataURL(file)
  }

  useEffect(() => {
    fetchAdminData()
  }, [fetchAdminData])

  useEffect(() => {
    setInputBanner(bannerImage)
  }, [bannerImage])

  useEffect(() => {
    setInputShowcase(showcaseImage)
  }, [showcaseImage])

  const flashMessage = (msg) => {
    setStatusMessage(msg)
    setTimeout(() => setStatusMessage(''), 3500)
  }

  // Open modal for new visualization
  const handleOpenAdd = () => {
    setEditingItem(null)
    setFormTitle('')
    setFormSubtitle('')
    setFormCategory('Kinematics & Dynamics')
    setFormTargetUrl('https://phet.colorado.edu/')
    setFormImageUrl('https://images.unsplash.com/photo-1509228468518-180dd4864904?auto=format&fit=crop&w=800&q=80')
    setFormBadge('Interactive 2D')
    setFormIsActive(true)
    setModalOpen(true)
  }

  // Open modal for editing
  const handleOpenEdit = (item) => {
    setEditingItem(item)
    setFormTitle(item.title)
    setFormSubtitle(item.subtitle || '')
    setFormCategory(item.category || 'Kinematics & Dynamics')
    setFormTargetUrl(item.targetUrl)
    setFormImageUrl(item.imageUrl || '')
    setFormBadge(item.badge || 'Interactive 2D')
    setFormIsActive(item.isActive !== false)
    setModalOpen(true)
  }

  // Save visualization (Create or Update)
  const handleSaveVisualization = async (e) => {
    e.preventDefault()
    if (!formTitle.trim() || !formTargetUrl.trim()) {
      alert('Title and Target URL are required!')
      return
    }

    if (editingItem) {
      await updateVisualization(editingItem.id, {
        title: formTitle.trim(),
        subtitle: formSubtitle.trim(),
        category: formCategory.trim(),
        targetUrl: formTargetUrl.trim(),
        imageUrl: formImageUrl.trim(),
        badge: formBadge.trim(),
        isActive: formIsActive
      })
      flashMessage('✓ 2D Visualization updated successfully!')
    } else {
      await addVisualization({
        title: formTitle.trim(),
        subtitle: formSubtitle.trim(),
        category: formCategory.trim(),
        targetUrl: formTargetUrl.trim(),
        imageUrl: formImageUrl.trim(),
        badge: formBadge.trim(),
        isActive: formIsActive
      })
      flashMessage('✓ New 2D Visualization added to Home Page!')
    }
    setModalOpen(false)
  }

  // Handle local file upload for Banner or Showcase Image
  const handleImageFileUpload = (e, target) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (uploadEvent) => {
      const base64Url = uploadEvent.target.result
      if (target === 'banner') {
        setInputBanner(base64Url)
      } else if (target === 'showcase') {
        setInputShowcase(base64Url)
      }
    }
    reader.readAsDataURL(file)
  }

  // Apply Home Page Image changes
  const handleApplyImages = async () => {
    await setBannerImage(inputBanner)
    await setShowcaseImage(inputShowcase)
    flashMessage('✓ Home page images updated live across the website!')
  }

  // Reset Home Page Images
  const handleResetImages = async () => {
    await resetHomeImages()
    setInputBanner('/images/physics_doodle_banner_16x9.jpg')
    setInputShowcase('/images/physics_doodle_portrait.jpg')
    flashMessage('✓ Restored default architectural artwork!')
  }

  // Filter users by search
  const filteredUsers = usersList.filter((u) => {
    const q = userSearch.toLowerCase()
    return (
      (u.email && u.email.toLowerCase().includes(q)) ||
      (u.displayName && u.displayName.toLowerCase().includes(q)) ||
      (u.role && u.role.toLowerCase().includes(q))
    )
  })

  // ─────────────────────────────────────────────────────────────────────
  // 1. GATED LOGIN VIEW (When not authenticated as Admin)
  // ─────────────────────────────────────────────────────────────────────
  if (!isAdminAuthenticated) {
    return (
      <div
        style={{
          minHeight: '100vh',
          backgroundColor: '#FAF5EC',
          backgroundImage:
            'radial-gradient(circle at 50% 10%, rgba(245, 237, 224, 0.6) 0%, rgba(235, 225, 210, 0.4) 100%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          boxSizing: 'border-box'
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: 480,
            background: '#FFFFFF',
            border: '1px solid var(--color-border)',
            borderTop: '4px solid #002B66',
            borderRadius: 0,
            boxShadow: '0 24px 60px rgba(18, 14, 11, 0.12)',
            padding: '44px 36px',
            textAlign: 'center',
            boxSizing: 'border-box'
          }}
        >
          {/* Official Lotus Logo */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
            <img
              src="/images/visiora_lotus_logo.png"
              alt="VISIORA Lotus Logo"
              style={{
                width: 72,
                height: 72,
                borderRadius: '50%',
                objectFit: 'cover',
                boxShadow: '0 4px 16px rgba(18, 14, 11, 0.12)'
              }}
            />
          </div>

          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '3px 10px',
              background: 'rgba(0, 43, 102, 0.08)',
              color: '#002B66',
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              marginBottom: 12
            }}
          >
            <ShieldCheck size={14} />
            Restricted Admin Console
          </div>

          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 26,
              fontWeight: 700,
              color: 'var(--obsidian-950)',
              margin: '0 0 8px 0',
              letterSpacing: '-0.02em'
            }}
          >
            VISIORA Administration
          </h1>

          <p
            style={{
              fontSize: 14,
              color: 'var(--color-text-muted)',
              lineHeight: 1.6,
              margin: '0 0 28px 0'
            }}
          >
            Sign in with an <strong>authorized Google Account</strong> to manage 2D visual laboratories,
            home page hero images, and user login activity.
          </p>

          {authError && (
            <div
              style={{
                padding: '12px 16px',
                background: '#FDF2F0',
                border: '1px solid rgba(194, 59, 48, 0.3)',
                color: '#C23B30',
                fontSize: 13,
                fontWeight: 600,
                textAlign: 'left',
                marginBottom: 20,
                lineHeight: 1.4
              }}
            >
              {authError}
            </div>
          )}

          {/* Primary Authorized Google Login Button */}
          <button
            onClick={loginWithGoogle}
            disabled={isAuthLoading}
            className="btn-navy-primary"
            style={{
              width: '100%',
              padding: '13px 20px',
              borderRadius: 0,
              background: '#002B66',
              color: '#FFFFFF',
              fontSize: 14.5,
              fontWeight: 700,
              border: 'none',
              cursor: isAuthLoading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              boxShadow: '0 4px 14px rgba(0, 43, 102, 0.35)',
              marginBottom: 14
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
            </svg>
            {isAuthLoading ? 'Verifying Google Account...' : 'Sign in with Authorized Google'}
          </button>

          {/* Quick Dev/Demo Admin Access Button */}
          <div
            style={{
              paddingTop: 16,
              borderTop: '1px solid var(--color-border-subtle)',
              marginTop: 16,
              display: 'flex',
              flexDirection: 'column',
              gap: 8
            }}
          >
            <button
              onClick={() => enableDevAdmin('bouroju@gmail.com')}
              style={{
                background: 'transparent',
                border: '1px dashed #002B66',
                color: '#002B66',
                padding: '9px 16px',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6
              }}
            >
              <Lock size={13} />
              Switch to Verified Admin (Dev &amp; Team Mode)
            </button>

            <button
              onClick={() => navigate('/')}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--color-text-muted)',
                fontSize: 13,
                cursor: 'pointer',
                textDecoration: 'underline',
                padding: '6px'
              }}
            >
              &larr; Return to Home Page
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────────
  // 2. AUTHENTICATED ADMIN DASHBOARD VIEW
  // ─────────────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#FAF5EC',
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box'
      }}
    >
      {/* ── Top Executive Header ── */}
      <header
        style={{
          background: '#002B66',
          color: '#FFFFFF',
          padding: '14px 28px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 4px 20px rgba(0, 43, 102, 0.35)',
          zIndex: 50
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <img
            src="/images/visiora_lotus_logo.png"
            alt="VISIORA Lotus Logo"
            style={{
              width: 38,
              height: 38,
              borderRadius: '50%',
              objectFit: 'cover',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)'
            }}
          />
          <div>
            <div
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 18,
                fontWeight: 800,
                letterSpacing: '0.04em',
                lineHeight: 1.1
              }}
            >
              VISIORA ATELIER
            </div>
            <div style={{ fontSize: 11, color: '#93B8FC', fontWeight: 600, letterSpacing: '0.06em' }}>
              EXECUTIVE ADMIN CONSOLE
            </div>
          </div>
        </div>

        {/* Status notification pill */}
        {statusMessage && (
          <div
            style={{
              background: '#1B7F53',
              color: '#FFFFFF',
              padding: '6px 14px',
              fontSize: 12.5,
              fontWeight: 700,
              animation: 'fadeIn 0.2s ease'
            }}
          >
            {statusMessage}
          </div>
        )}

        {/* Admin identity & action buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: 'rgba(255, 255, 255, 0.12)',
              padding: '5px 12px',
              borderRadius: 0
            }}
          >
            <ShieldCheck size={16} color="#93B8FC" />
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: '#FFFFFF' }}>
                {adminUser?.displayName || 'Administrator'}
              </div>
              <div style={{ fontSize: 10, color: '#BFDBFE' }}>{adminUser?.email}</div>
            </div>
          </div>

          <button
            onClick={() => navigate('/')}
            style={{
              background: 'rgba(255, 255, 255, 0.15)',
              color: '#FFFFFF',
              border: 'none',
              padding: '7px 14px',
              fontSize: 12.5,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <Globe size={14} />
            <span>View Live Site</span>
          </button>

          <button
            onClick={logoutAdmin}
            title="Sign out of Admin Console"
            style={{
              background: 'rgba(255, 255, 255, 0.15)',
              color: '#FFFFFF',
              border: 'none',
              padding: '7px 12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 12,
              fontWeight: 600
            }}
          >
            <LogOut size={14} />
            <span>Logout</span>
          </button>
        </div>
      </header>

      {/* ── Main Tab Navigation Bar ── */}
      <div
        style={{
          background: '#FFFFFF',
          borderBottom: '1px solid var(--color-border)',
          padding: '0 28px',
          display: 'flex',
          gap: 2
        }}
      >
        {[
          { id: 'visualizations', label: '2D Visualizations (CRUD)', icon: Layers, count: visualizations.length },
          { id: 'images', label: 'Home Page Images Customizer', icon: ImageIcon },
          { id: 'users', label: 'User Logins & Activity Intelligence', icon: Users, count: usersList.length }
        ].map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '14px 20px',
                background: isActive ? '#FAF5EC' : 'transparent',
                border: 'none',
                borderBottom: isActive ? '3px solid #002B66' : '3px solid transparent',
                color: isActive ? '#002B66' : 'var(--color-text-muted)',
                fontWeight: isActive ? 700 : 600,
                fontSize: 13.5,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  style={{
                    background: isActive ? '#002B66' : 'var(--cream-200)',
                    color: isActive ? '#FFFFFF' : 'var(--color-text-muted)',
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '1px 6px'
                  }}
                >
                  {tab.count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* ── Container ── */}
      <main style={{ flex: 1, padding: '32px 28px 60px 28px', maxWidth: 1320, width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>

        {/* ───────────────────────────────────────────────────────────── */}
        {/* TAB 1: 2D VISUALIZATIONS CRUD OPERATIONS                     */}
        {/* ───────────────────────────────────────────────────────────── */}
        {activeTab === 'visualizations' && (
          <div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 24
              }}
            >
              <div>
                <h2
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 22,
                    fontWeight: 700,
                    color: 'var(--obsidian-950)',
                    margin: '0 0 4px 0'
                  }}
                >
                  2D Interactive Physics Laboratories
                </h2>
                <p style={{ margin: 0, fontSize: 13, color: 'var(--color-text-muted)' }}>
                  Add, update, or remove 2D simulations. When visitors click the card on the home page,
                  they are automatically redirected to the destination URL.
                </p>
              </div>

              <button
                onClick={handleOpenAdd}
                className="btn-navy-primary"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 20px',
                  background: '#002B66',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  fontSize: 13.5,
                  cursor: 'pointer',
                  border: 'none',
                  boxShadow: '0 4px 14px rgba(0, 43, 102, 0.3)'
                }}
              >
                <Plus size={16} />
                <span>Add 2D Visualization</span>
              </button>
            </div>

            {/* Quick 1-Click PhET Presets Toolbar */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 10,
              padding: '12px 18px',
              background: '#FAF6EE',
              border: '1px solid rgba(203, 163, 88, 0.4)',
              borderLeft: '4px solid #002B66',
              marginBottom: 24
            }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#002B66', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                ⚡ Quick Presets:
              </span>
              {POPULAR_2D_PRESETS.map((preset, idx) => (
                <button
                  key={idx}
                  onClick={() => handleApplyPreset(preset)}
                  style={{
                    padding: '5px 12px',
                    fontSize: 11.5,
                    fontWeight: 600,
                    background: '#FFFFFF',
                    border: '1px solid rgba(0, 43, 102, 0.25)',
                    color: '#002B66',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = '#002B66'
                    e.currentTarget.style.color = '#FFFFFF'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = '#FFFFFF'
                    e.currentTarget.style.color = '#002B66'
                  }}
                >
                  <Plus size={12} />
                  <span>{preset.title.split(':')[0]}</span>
                </button>
              ))}
            </div>

            {/* List of 2D Visualizations */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
                gap: 20
              }}
            >
              {visualizations.map((item) => (
                <div
                  key={item.id}
                  style={{
                    background: '#FFFFFF',
                    border: '1px solid var(--color-border)',
                    borderRadius: 0,
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: '0 2px 10px rgba(18, 14, 11, 0.04)',
                    transition: 'box-shadow 0.2s ease',
                    opacity: item.isActive ? 1 : 0.65
                  }}
                >
                  {/* Card Image Box with clickable destination cue */}
                  <div
                    style={{
                      height: 180,
                      width: '100%',
                      position: 'relative',
                      background: '#1A1614',
                      overflow: 'hidden'
                    }}
                  >
                    <img
                      src={item.imageUrl}
                      alt={item.title}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover'
                      }}
                      onError={(e) => {
                        e.target.src =
                          'https://images.unsplash.com/photo-1509228468518-180dd4864904?auto=format&fit=crop&w=800&q=80'
                      }}
                    />

                    {/* Top Status & Category Badges */}
                    <div
                      style={{
                        position: 'absolute',
                        top: 10,
                        left: 10,
                        right: 10,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <span
                        style={{
                          background: item.isActive ? '#002B66' : '#6A5F54',
                          color: '#FFFFFF',
                          fontSize: 10.5,
                          fontWeight: 700,
                          padding: '3px 8px',
                          textTransform: 'uppercase'
                        }}
                      >
                        {item.isActive ? 'Active on Home' : 'Hidden'}
                      </span>

                      <span
                        className="badge-gold"
                        style={{
                          fontSize: 10.5,
                          fontWeight: 700,
                          background: 'rgba(255, 255, 255, 0.92)'
                        }}
                      >
                        {item.badge}
                      </span>
                    </div>

                    {/* Clicks counter */}
                    <div
                      style={{
                        position: 'absolute',
                        bottom: 8,
                        left: 10,
                        background: 'rgba(0, 0, 0, 0.75)',
                        color: '#BFDBFE',
                        fontSize: 11,
                        padding: '2px 8px',
                        fontWeight: 600,
                        fontFamily: 'var(--font-mono)'
                      }}
                    >
                      {item.clicks || 0} clicks
                    </div>
                  </div>

                  {/* Body Info */}
                  <div style={{ padding: 18, flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <div
                      style={{
                        fontSize: 11,
                        color: 'var(--gold-700)',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        marginBottom: 4
                      }}
                    >
                      {item.category}
                    </div>

                    <h3
                      style={{
                        margin: '0 0 6px 0',
                        fontSize: 16,
                        fontFamily: 'var(--font-display)',
                        fontWeight: 700,
                        color: 'var(--obsidian-950)',
                        lineHeight: 1.3
                      }}
                    >
                      {item.title}
                    </h3>

                    <p
                      style={{
                        margin: '0 0 16px 0',
                        fontSize: 12.5,
                        color: 'var(--color-text-muted)',
                        lineHeight: 1.5,
                        flex: 1
                      }}
                    >
                      {item.subtitle}
                    </p>

                    {/* Target URL banner */}
                    <div
                      style={{
                        padding: '6px 10px',
                        background: 'var(--cream-100)',
                        border: '1px solid var(--color-border-subtle)',
                        fontSize: 11,
                        fontFamily: 'var(--font-mono)',
                        color: '#002B66',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        marginBottom: 16
                      }}
                      title={item.targetUrl}
                    >
                      {item.targetUrl}
                    </div>

                    {/* Action Bar */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingTop: 12,
                        borderTop: '1px solid var(--color-border-subtle)'
                      }}
                    >
                      <a
                        href={item.targetUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          fontSize: 12.5,
                          fontWeight: 700,
                          color: '#002B66',
                          textDecoration: 'none'
                        }}
                      >
                        <span>Test Redirect</span>
                        <ArrowUpRight size={14} />
                      </a>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <button
                          onClick={() => toggleVisualizationActive(item.id)}
                          title={item.isActive ? 'Hide from home' : 'Show on home'}
                          style={{
                            padding: '5px 10px',
                            background: item.isActive ? 'rgba(0, 43, 102, 0.08)' : 'var(--cream-200)',
                            color: item.isActive ? '#002B66' : 'var(--color-text-muted)',
                            border: 'none',
                            fontSize: 11.5,
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          {item.isActive ? 'Disable' : 'Enable'}
                        </button>

                        <button
                          onClick={() => handleOpenEdit(item)}
                          title="Edit visualization"
                          style={{
                            padding: '6px 8px',
                            background: 'transparent',
                            border: '1px solid var(--color-border)',
                            color: 'var(--obsidian-900)',
                            cursor: 'pointer'
                          }}
                        >
                          <Edit2 size={13} />
                        </button>

                        <button
                          onClick={() => {
                            if (confirm(`Delete "${item.title}"?`)) {
                              deleteVisualization(item.id)
                              flashMessage('✓ 2D Visualization deleted.')
                            }
                          }}
                          title="Delete"
                          style={{
                            padding: '6px 8px',
                            background: 'transparent',
                            border: '1px solid rgba(194, 59, 48, 0.3)',
                            color: '#C23B30',
                            cursor: 'pointer'
                          }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ───────────────────────────────────────────────────────────── */}
        {/* TAB 2: HOME PAGE IMAGES CUSTOMIZER                           */}
        {/* ───────────────────────────────────────────────────────────── */}
        {activeTab === 'images' && (
          <div>
            <div style={{ marginBottom: 24 }}>
              <h2
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 22,
                  fontWeight: 700,
                  color: 'var(--obsidian-950)',
                  margin: '0 0 4px 0'
                }}
              >
                Home Page Dynamic Images Customizer
              </h2>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--color-text-muted)' }}>
                Customize the 2 primary showcase images on the main page via direct URL or local image upload.
                Changes take effect instantly on the live website.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28, marginBottom: 28 }}>
              {/* Image 1: Main Banner Background Artwork */}
              <div
                style={{
                  background: '#FFFFFF',
                  border: '1px solid var(--color-border)',
                  borderRadius: 0,
                  padding: 24,
                  boxShadow: '0 2px 10px rgba(18, 14, 11, 0.04)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <h3
                    style={{
                      margin: 0,
                      fontFamily: 'var(--font-display)',
                      fontSize: 16,
                      fontWeight: 700,
                      color: 'var(--obsidian-950)'
                    }}
                  >
                    1. Fixed Background Parallax Window
                  </h3>
                  <span style={{ fontSize: 11, color: '#002B66', fontWeight: 700 }}>16:9 Banner</span>
                </div>

                <p style={{ fontSize: 12.5, color: 'var(--color-text-muted)', margin: '0 0 16px 0', lineHeight: 1.5 }}>
                  The large landscape artwork displayed inside the fixed parallax window behind the overlapping card.
                </p>

                {/* Live Preview Box */}
                <div
                  style={{
                    width: '100%',
                    height: 180,
                    borderRadius: 0,
                    border: '1px solid var(--color-border)',
                    overflow: 'hidden',
                    background: '#1A1614',
                    marginBottom: 16,
                    position: 'relative'
                  }}
                >
                  <img
                    src={inputBanner}
                    alt="Banner Preview"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e) => {
                      e.target.src = '/images/physics_doodle_banner_16x9.jpg'
                    }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      bottom: 8,
                      right: 10,
                      background: 'rgba(0, 43, 102, 0.85)',
                      color: '#FFFFFF',
                      fontSize: 10.5,
                      fontWeight: 700,
                      padding: '2px 8px'
                    }}
                  >
                    Live Preview
                  </div>
                </div>

                {/* URL Input */}
                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--obsidian-900)', marginBottom: 4 }}>
                    Custom Image URL
                  </label>
                  <input
                    type="text"
                    value={inputBanner}
                    onChange={(e) => setInputBanner(e.target.value)}
                    placeholder="https://example.com/banner.jpg or /images/..."
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      fontSize: 13,
                      border: '1px solid var(--color-border)',
                      borderRadius: 0,
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                {/* Local Upload Button */}
                <input
                  type="file"
                  ref={bannerFileRef}
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={(e) => handleImageFileUpload(e, 'banner')}
                />
                <button
                  type="button"
                  onClick={() => bannerFileRef.current?.click()}
                  style={{
                    width: '100%',
                    padding: '8px 14px',
                    background: 'var(--cream-100)',
                    border: '1px dashed var(--color-border)',
                    color: '#002B66',
                    fontSize: 12.5,
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6
                  }}
                >
                  <Upload size={14} />
                  <span>Upload Image File from Computer</span>
                </button>
              </div>

              {/* Image 2: Periodic Showcase Portrait Detail */}
              <div
                style={{
                  background: '#FFFFFF',
                  border: '1px solid var(--color-border)',
                  borderRadius: 0,
                  padding: 24,
                  boxShadow: '0 2px 10px rgba(18, 14, 11, 0.04)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <h3
                    style={{
                      margin: 0,
                      fontFamily: 'var(--font-display)',
                      fontSize: 16,
                      fontWeight: 700,
                      color: 'var(--obsidian-950)'
                    }}
                  >
                    2. Periodic Symphony Detail Card
                  </h3>
                  <span style={{ fontSize: 11, color: '#002B66', fontWeight: 700 }}>Portrait / Frame</span>
                </div>

                <p style={{ fontSize: 12.5, color: 'var(--color-text-muted)', margin: '0 0 16px 0', lineHeight: 1.5 }}>
                  The framed detail artwork displayed on the right side of the &ldquo;Periodic Symphony&rdquo; card.
                </p>

                {/* Live Preview Box */}
                <div
                  style={{
                    width: '100%',
                    height: 180,
                    borderRadius: 0,
                    border: '1px solid var(--color-border)',
                    overflow: 'hidden',
                    background: '#1A1614',
                    marginBottom: 16,
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <img
                    src={inputShowcase}
                    alt="Showcase Preview"
                    style={{ width: 140, height: 160, objectFit: 'cover', border: '1px solid #FAF5EC' }}
                    onError={(e) => {
                      e.target.src = '/images/physics_doodle_portrait.jpg'
                    }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      bottom: 8,
                      right: 10,
                      background: 'rgba(0, 43, 102, 0.85)',
                      color: '#FFFFFF',
                      fontSize: 10.5,
                      fontWeight: 700,
                      padding: '2px 8px'
                    }}
                  >
                    Live Preview
                  </div>
                </div>

                {/* URL Input */}
                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--obsidian-900)', marginBottom: 4 }}>
                    Custom Image URL
                  </label>
                  <input
                    type="text"
                    value={inputShowcase}
                    onChange={(e) => setInputShowcase(e.target.value)}
                    placeholder="https://example.com/portrait.jpg or /images/..."
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      fontSize: 13,
                      border: '1px solid var(--color-border)',
                      borderRadius: 0,
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                {/* Local Upload Button */}
                <input
                  type="file"
                  ref={showcaseFileRef}
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={(e) => handleImageFileUpload(e, 'showcase')}
                />
                <button
                  type="button"
                  onClick={() => showcaseFileRef.current?.click()}
                  style={{
                    width: '100%',
                    padding: '8px 14px',
                    background: 'var(--cream-100)',
                    border: '1px dashed var(--color-border)',
                    color: '#002B66',
                    fontSize: 12.5,
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6
                  }}
                >
                  <Upload size={14} />
                  <span>Upload Image File from Computer</span>
                </button>
              </div>
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: 14 }}>
              <button
                onClick={handleApplyImages}
                className="btn-navy-primary"
                style={{
                  padding: '12px 28px',
                  background: '#002B66',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  fontSize: 14,
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(0, 43, 102, 0.35)'
                }}
              >
                Save &amp; Apply Images to Main Page
              </button>

              <button
                onClick={handleResetImages}
                style={{
                  padding: '12px 20px',
                  background: 'transparent',
                  border: '1px solid var(--color-border)',
                  color: 'var(--obsidian-900)',
                  fontWeight: 600,
                  fontSize: 13.5,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                <RefreshCw size={14} />
                <span>Restore Original Artwork</span>
              </button>
            </div>
          </div>
        )}

        {/* ───────────────────────────────────────────────────────────── */}
        {/* TAB 3: USER LOGINS & ACTIVITY INTELLIGENCE                    */}
        {/* ───────────────────────────────────────────────────────────── */}
        {activeTab === 'users' && (
          <div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 24
              }}
            >
              <div>
                <h2
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 22,
                    fontWeight: 700,
                    color: 'var(--obsidian-950)',
                    margin: '0 0 4px 0'
                  }}
                >
                  User Logins &amp; Scholar Directory
                </h2>
                <p style={{ margin: 0, fontSize: 13, color: 'var(--color-text-muted)' }}>
                  Comprehensive audit of user logins, auth providers, active streaks, and physics proficiency.
                </p>
              </div>

              {/* Search user box */}
              <div style={{ display: 'flex', alignItems: 'center', background: '#FFFFFF', border: '1px solid var(--color-border)', padding: '6px 12px', width: 280 }}>
                <Search size={15} color="var(--color-text-muted)" />
                <input
                  type="text"
                  placeholder="Search user by name or email..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  style={{
                    border: 'none',
                    outline: 'none',
                    fontSize: 13,
                    marginLeft: 8,
                    width: '100%',
                    background: 'transparent'
                  }}
                />
              </div>
            </div>

            {/* Users Table */}
            <div
              style={{
                background: '#FFFFFF',
                border: '1px solid var(--color-border)',
                borderRadius: 0,
                overflow: 'hidden',
                boxShadow: '0 2px 10px rgba(18, 14, 11, 0.04)'
              }}
            >
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr
                    style={{
                      background: '#FAF5EC',
                      borderBottom: '2px solid var(--color-border)',
                      fontSize: 11.5,
                      fontWeight: 800,
                      letterSpacing: '0.05em',
                      textTransform: 'uppercase',
                      color: 'var(--obsidian-900)'
                    }}
                  >
                    <th style={{ padding: '12px 16px' }}>Scholar / User</th>
                    <th style={{ padding: '12px 16px' }}>Auth Provider</th>
                    <th style={{ padding: '12px 16px' }}>Role</th>
                    <th style={{ padding: '12px 16px' }}>Streak</th>
                    <th style={{ padding: '12px 16px' }}>Mastery</th>
                    <th style={{ padding: '12px 16px' }}>Last Login</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((u, i) => (
                    <tr
                      key={u.uid || i}
                      style={{
                        borderBottom: '1px solid var(--color-border-subtle)',
                        fontSize: 13,
                        transition: 'background 0.15s ease'
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#FCFBF9')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div
                            style={{
                              width: 34,
                              height: 34,
                              borderRadius: 0,
                              background: '#002B66',
                              color: '#FFFFFF',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 700,
                              fontSize: 13
                            }}
                          >
                            {u.photoURL ? (
                              <img src={u.photoURL} alt={u.displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              (u.displayName || u.email || 'U').charAt(0).toUpperCase()
                            )}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, color: 'var(--obsidian-950)' }}>{u.displayName || 'Anonymous User'}</div>
                            <div style={{ fontSize: 11.5, color: 'var(--color-text-muted)' }}>{u.email}</div>
                          </div>
                        </div>
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            padding: '3px 8px',
                            background: u.provider?.includes('google') ? 'rgba(66, 133, 244, 0.1)' : 'var(--cream-200)',
                            color: u.provider?.includes('google') ? '#1A73E8' : 'var(--obsidian-900)',
                            fontSize: 11,
                            fontWeight: 700
                          }}
                        >
                          {u.provider || 'google.com'}
                        </span>
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        <span
                          style={{
                            padding: '3px 8px',
                            background: u.role === 'Admin' ? '#002B66' : 'rgba(203, 163, 88, 0.18)',
                            color: u.role === 'Admin' ? '#FFFFFF' : 'var(--gold-700)',
                            fontSize: 11,
                            fontWeight: 700
                          }}
                        >
                          {u.role || 'Student'}
                        </span>
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontWeight: 700 }}>
                          <Flame size={14} color="#D97706" />
                          <span>{u.streak || 1}d</span>
                        </div>
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div style={{ width: 60, height: 4, background: 'var(--cream-200)', overflow: 'hidden' }}>
                            <div style={{ width: `${u.mastery || 0}%`, height: '100%', background: 'var(--gold-500)' }} />
                          </div>
                          <span style={{ fontSize: 11.5, fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{u.mastery || 0}%</span>
                        </div>
                      </td>

                      <td style={{ padding: '14px 16px', color: 'var(--color-text-muted)', fontSize: 12, fontFamily: 'var(--font-mono)' }}>
                        {u.lastLogin ? new Date(u.lastLogin).toLocaleString() : 'Just now'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </main>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MODAL: ADD / EDIT 2D VISUALIZATION                            */}
      {/* ───────────────────────────────────────────────────────────── */}
      {modalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(14, 12, 11, 0.65)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 20
          }}
        >
          <div
            style={{
              background: '#FFFFFF',
              width: '100%',
              maxWidth: 540,
              border: '1px solid var(--color-border)',
              borderTop: '4px solid #002B66',
              boxShadow: '0 24px 60px rgba(0, 0, 0, 0.3)',
              padding: '28px 32px',
              boxSizing: 'border-box',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <h3
                style={{
                  margin: 0,
                  fontFamily: 'var(--font-display)',
                  fontSize: 18,
                  fontWeight: 700,
                  color: 'var(--obsidian-950)'
                }}
              >
                {editingItem ? 'Edit 2D Visualization' : 'Add New 2D Visualization'}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: 'var(--color-text-muted)' }}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveVisualization} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
                  Laboratory Title *
                </label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. Electric Field Mapping & Coulomb Law"
                  style={{ width: '100%', padding: '9px 12px', fontSize: 13, border: '1px solid var(--color-border)', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
                  Subtitle / Scientific Concept
                </label>
                <input
                  type="text"
                  value={formSubtitle}
                  onChange={(e) => setFormSubtitle(e.target.value)}
                  placeholder="e.g. Point charges, potential gradients, and electric vector flux"
                  style={{ width: '100%', padding: '9px 12px', fontSize: 13, border: '1px solid var(--color-border)', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
                    Category
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', fontSize: 13, border: '1px solid var(--color-border)', background: '#FFFFFF' }}
                  >
                    <option value="Electromagnetism">Electromagnetism</option>
                    <option value="Wave Mechanics">Wave Mechanics</option>
                    <option value="Optics & Light">Optics &amp; Light</option>
                    <option value="Thermodynamics">Thermodynamics</option>
                    <option value="Quantum & Modern">Quantum &amp; Modern</option>
                    <option value="Kinematics & Dynamics">Kinematics &amp; Dynamics</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
                    Badge Tag
                  </label>
                  <input
                    type="text"
                    value={formBadge}
                    onChange={(e) => setFormBadge(e.target.value)}
                    placeholder="e.g. PhET Simulation"
                    style={{ width: '100%', padding: '9px 12px', fontSize: 13, border: '1px solid var(--color-border)', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
                  Target Redirect URL (Where clicking leads) *
                </label>
                <input
                  type="url"
                  required
                  value={formTargetUrl}
                  onChange={(e) => setFormTargetUrl(e.target.value)}
                  placeholder="https://phet.colorado.edu/sims/... or https://..."
                  style={{ width: '100%', padding: '9px 12px', fontSize: 13, border: '1px solid var(--color-border)', boxSizing: 'border-box' }}
                />
                <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                  When a student clicks the card on the home page, they will open this website.
                </span>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
                  Custom Preview Image URL or File Upload
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="text"
                    value={formImageUrl}
                    onChange={(e) => setFormImageUrl(e.target.value)}
                    placeholder="https://images.unsplash.com/... or /images/..."
                    style={{ flex: 1, padding: '9px 12px', fontSize: 13, border: '1px solid var(--color-border)', boxSizing: 'border-box' }}
                  />
                  <input
                    type="file"
                    ref={modalFileRef}
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handleModalImageUpload}
                  />
                  <button
                    type="button"
                    onClick={() => modalFileRef.current?.click()}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '8px 14px',
                      background: '#FAF5EC',
                      border: '1px solid var(--color-border)',
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    <Upload size={13} />
                    <span>Upload File</span>
                  </button>
                </div>

                {/* Live Preview of the Image */}
                {formImageUrl && (
                  <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <img
                      src={formImageUrl}
                      alt="Thumbnail Preview"
                      style={{ width: 80, height: 48, objectFit: 'cover', border: '1px solid var(--color-border)' }}
                      onError={(e) => { e.target.style.display = 'none' }}
                    />
                    <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                      Preview loaded
                    </span>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                <input
                  type="checkbox"
                  id="activeToggle"
                  checked={formIsActive}
                  onChange={(e) => setFormIsActive(e.target.checked)}
                />
                <label htmlFor="activeToggle" style={{ fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  Publish and show on Home Page immediately
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  style={{ padding: '9px 16px', background: 'transparent', border: '1px solid var(--color-border)', fontSize: 13, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-navy-primary"
                  style={{ padding: '9px 20px', background: '#002B66', color: '#FFFFFF', border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
                >
                  {editingItem ? 'Save Changes' : 'Create 2D Visualization'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
