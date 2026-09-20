import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAdminStore } from '../store/useAdminStore'
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
  Upload,
  RefreshCw,
  Search,
  LogOut,
  Flame,
  Globe,
  AlertCircle,
  Sparkles
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
    experiments,
    addExperiment,
    updateExperiment,
    deleteExperiment,
    toggleExperimentActive,
    usersList,
    fetchAdminData
  } = useAdminStore()

  const [activeTab, setActiveTab] = useState('experiments') // 'experiments' | 'images' | 'users'
  const [filterType, setFilterType] = useState('all') // 'all' | '3d' | '2d' | 'active'
  const [searchQuery, setSearchQuery] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [userSearch, setUserSearch] = useState('')
  const [statusMessage, setStatusMessage] = useState('')

  // Sandbox Test Modal State
  const [sandboxModalOpen, setSandboxModalOpen] = useState(false)
  const [sandboxUrl, setSandboxUrl] = useState('')
  const [sandboxTitle, setSandboxTitle] = useState('')

  // Form state for Experiments modal (Both 2D & 3D)
  const [formType, setFormType] = useState('3d') // '3d' | '2d'
  const [formTitle, setFormTitle] = useState('')
  const [formSubtitle, setFormSubtitle] = useState('')
  const [formCategory, setFormCategory] = useState('Mechanics & Kinematics')
  const [formFormula, setFormFormula] = useState('')
  const [formTargetUrl, setFormTargetUrl] = useState('')
  const [formImageUrl, setFormImageUrl] = useState('')
  const [formBadge, setFormBadge] = useState('3D Physics Lab')
  const [formIcon, setFormIcon] = useState('atom')
  const [formEmbedMode, setFormEmbedMode] = useState('embed')
  const [formAuthorTeam, setFormAuthorTeam] = useState('Visiora Core Team')
  const [formGradeLevel, setFormGradeLevel] = useState('Class 8-12')
  const [formIsActive, setFormIsActive] = useState(true)
  const [formIsFeatured, setFormIsFeatured] = useState(false)

  // Form state for Home Images
  const [inputBanner, setInputBanner] = useState(bannerImage)
  const [inputShowcase, setInputShowcase] = useState(showcaseImage)
  const bannerFileRef = useRef(null)
  const showcaseFileRef = useRef(null)
  const modalFileRef = useRef(null)

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

  // Open modal for new experiment (3D or 2D)
  const handleOpenAdd = (defaultType = '3d') => {
    setEditingItem(null)
    setFormType(defaultType)
    setFormTitle('')
    setFormSubtitle('')
    setFormCategory(defaultType === '3d' ? 'Mechanics & Kinematics' : 'Electromagnetism')
    setFormFormula('')
    setFormTargetUrl(defaultType === '3d' ? '/sim?lab=projectile' : 'https://phet.colorado.edu/')
    setFormImageUrl(defaultType === '3d' 
      ? 'https://images.unsplash.com/photo-1509228468518-180dd4864904?auto=format&fit=crop&w=800&q=80'
      : '/images/energy_forms_changes_banner.jpg')
    setFormBadge(defaultType === '3d' ? '3D Physics Lab' : 'Interactive 2D')
    setFormIcon(defaultType === '3d' ? 'atom' : 'activity')
    setFormEmbedMode('embed')
    setFormAuthorTeam('Visiora Atelier Team')
    setFormGradeLevel('Class 8-12')
    setFormIsActive(true)
    setFormIsFeatured(false)
    setModalOpen(true)
  }

  // Open modal for editing
  const handleOpenEdit = (item) => {
    setEditingItem(item)
    setFormType(item.type || '3d')
    setFormTitle(item.title || '')
    setFormSubtitle(item.subtitle || '')
    setFormCategory(item.category || 'Physics')
    setFormFormula(item.formula || '')
    setFormTargetUrl(item.targetUrl || '')
    setFormImageUrl(item.imageUrl || '')
    setFormBadge(item.badge || (item.type === '3d' ? '3D Physics Lab' : 'Interactive 2D'))
    setFormIcon(item.icon || 'atom')
    setFormEmbedMode(item.embedMode || 'embed')
    setFormAuthorTeam(item.authorTeam || 'Visiora Atelier Core')
    setFormGradeLevel(item.gradeLevel || 'Class 8-12')
    setFormIsActive(item.isActive !== false)
    setFormIsFeatured(Boolean(item.isFeatured))
    setModalOpen(true)
  }

  // Open sandbox tester
  const handleOpenSandbox = (url, title) => {
    setSandboxUrl(url)
    setSandboxTitle(title || 'Experiment Sandbox')
    setSandboxModalOpen(true)
  }

  // Save experiment (Create or Update)
  const handleSaveVisualization = async (e) => {
    e.preventDefault()
    if (!formTitle.trim() || !formTargetUrl.trim()) {
      alert('Title and Target URL are required!')
      return
    }

    const payload = {
      type: formType,
      title: formTitle.trim(),
      subtitle: formSubtitle.trim(),
      category: formCategory.trim(),
      formula: formFormula.trim(),
      targetUrl: formTargetUrl.trim(),
      imageUrl: formImageUrl.trim(),
      badge: formBadge.trim(),
      icon: formIcon.trim(),
      embedMode: formEmbedMode,
      authorTeam: formAuthorTeam.trim(),
      gradeLevel: formGradeLevel.trim(),
      isActive: formIsActive,
      isFeatured: formIsFeatured
    }

    if (editingItem) {
      await updateExperiment(editingItem.id, payload)
      flashMessage(`✓ ${formType.toUpperCase()} experiment "${payload.title}" updated successfully!`)
    } else {
      await addExperiment(payload)
      flashMessage(`✓ New ${formType.toUpperCase()} experiment "${payload.title}" registered & published live!`)
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

  // Open live site
  const handleViewLiveSite = () => {
    const liveUrl = import.meta.env.VITE_MAIN_SITE_URL
    if (liveUrl && liveUrl.startsWith('http')) {
      window.open(liveUrl, '_blank', 'noopener,noreferrer')
    } else {
      navigate('/')
    }
  }

  // ─────────────────────────────────────────────────────────────────────
  // 1. GATED LOGIN VIEW (When not authenticated as Admin)
  // ─────────────────────────────────────────────────────────────────────
  // ─────────────────────────────────────────────────────────────────────
  // 1. GATED LOGIN VIEW (When not authenticated as Admin)
  // ─────────────────────────────────────────────────────────────────────
  if (!isAdminAuthenticated) {
    const domain = typeof window !== 'undefined' ? window.location.hostname : ''

    return (
      <div
        style={{
          minHeight: '100vh',
          background: '#FAF8F5',
          color: '#0A192F',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px 16px',
          boxSizing: 'border-box',
          fontFamily: 'Inter, system-ui, sans-serif'
        }}
      >
        <div
          style={{
            maxWidth: 480,
            width: '100%',
            background: '#FFFFFF',
            border: '1.5px solid rgba(0, 43, 102, 0.2)',
            boxShadow: '0 16px 48px rgba(0, 43, 102, 0.12)',
            padding: '36px 32px',
            textAlign: 'center'
          }}
        >
          {/* Logo & Header */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
            <img
              src="/images/visiora_lotus_logo.png"
              alt="Visiora Logo"
              style={{ width: 52, height: 52, borderRadius: '50%', boxShadow: '0 4px 12px rgba(0, 43, 102, 0.15)' }}
            />
          </div>

          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: 'rgba(0, 43, 102, 0.08)',
              border: '1px solid rgba(0, 43, 102, 0.18)',
              padding: '4px 12px',
              fontSize: 11,
              fontWeight: 700,
              color: '#002B66',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              marginBottom: 16
            }}
          >
            <ShieldCheck size={14} />
            <span>Executive Admin Console</span>
          </div>

          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#002B66', margin: '0 0 10px 0', fontFamily: 'var(--font-serif)' }}>
            Visiora Atelier Studio
          </h1>

          <p style={{ fontSize: 13.5, color: '#4A5568', margin: '0 0 24px 0', lineHeight: 1.5 }}>
            Restricted administrative management portal. Sign in with an authorized Google account or click instant admin access to open the dashboard.
          </p>

          {/* Auth Error Display */}
          {authError && (
            <div
              style={{
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#B91C1C',
                padding: '12px 14px',
                fontSize: 12.5,
                textAlign: 'left',
                marginBottom: 20,
                lineHeight: 1.4,
                display: 'flex',
                alignItems: 'flex-start',
                gap: 8
              }}
            >
              <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
              <div style={{ flex: 1 }}>
                <div>{authError}</div>
                {authError.includes('unauthorized-domain') || authError.includes('Domain unauthorized') ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (typeof window !== 'undefined') {
                        navigator.clipboard.writeText(window.location.hostname)
                        alert(`Copied domain: "${window.location.hostname}"`)
                      }
                    }}
                    style={{
                      marginTop: 8,
                      background: '#FFFFFF',
                      color: '#002B66',
                      border: '1px solid #CBD5E1',
                      padding: '4px 10px',
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    📋 Copy Domain "{domain}"
                  </button>
                ) : null}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <button
              type="button"
              onClick={loginWithGoogle}
              disabled={isAuthLoading}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                width: '100%',
                padding: '12px 16px',
                background: '#002B66',
                color: '#FFFFFF',
                border: 'none',
                fontSize: 14,
                fontWeight: 700,
                cursor: isAuthLoading ? 'wait' : 'pointer',
                boxShadow: '0 4px 14px rgba(0, 43, 102, 0.25)',
                transition: 'all 0.15s ease'
              }}
            >
              {isAuthLoading ? (
                <span>Authorizing Admin Credentials...</span>
              ) : (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  <span>Sign In with Google (Admin)</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => enableDevAdmin()}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                width: '100%',
                padding: '11px 16px',
                background: '#FAF8F5',
                color: '#002B66',
                border: '1.5px solid rgba(0, 43, 102, 0.3)',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              <Sparkles size={15} color="#D97706" />
              <span>✦ Instant Dev Admin Access (Bypass)</span>
            </button>
          </div>

          {/* Footer Back Link */}
          <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid rgba(0, 43, 102, 0.1)' }}>
            <a
              href="/"
              onClick={(e) => {
                e.preventDefault()
                const liveUrl = import.meta.env.VITE_MAIN_SITE_URL || 'https://visiora-atelier.vercel.app'
                window.location.href = liveUrl
              }}
              style={{
                fontSize: 12,
                color: '#718096',
                textDecoration: 'none',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4
              }}
            >
              ← Back to Main Student Portal
            </a>
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
            onClick={handleViewLiveSite}
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
          { id: 'experiments', label: '2D & 3D Simulations Catalog', icon: Layers, count: (experiments || []).length },
          { id: 'images', label: 'Home Page Visuals Customizer', icon: ImageIcon },
          { id: 'users', label: 'User Directory & Activity', icon: Users, count: (usersList || []).length }
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
        {/* TAB 1: UNIFIED 2D & 3D EXPERIMENTS DEPLOYMENT HUB             */}
        {/* ───────────────────────────────────────────────────────────── */}
        {activeTab === 'experiments' && (
          <div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: 24,
                flexWrap: 'wrap',
                gap: 16
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <h2
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: 22,
                      fontWeight: 800,
                      color: '#002B66',
                      margin: 0
                    }}
                  >
                    Dynamic 2D &amp; 3D Experiment Hub
                  </h2>
                  <span
                    style={{
                      fontSize: 10.5,
                      fontWeight: 700,
                      color: '#002B66',
                      background: 'rgba(0, 43, 102, 0.08)',
                      padding: '2px 8px',
                      border: '1px solid rgba(0, 43, 102, 0.16)'
                    }}
                  >
                    LIVE SITE-WIDE SYNC
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: 13, color: '#64748B', maxWidth: 740, lineHeight: 1.5 }}>
                  Empower your distributed team to deploy 2D and 3D science simulations online. Enter the deployed project URL,
                  topic, formulas, photos, and team details. All entries instantly reflect in TopNav, Home Cards, and Interactive Viewers.
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button
                  onClick={() => handleOpenAdd('3d')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '10px 18px',
                    background: '#002B66',
                    color: '#FFFFFF',
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: 'pointer',
                    border: 'none',
                    boxShadow: '0 4px 14px rgba(0, 43, 102, 0.25)'
                  }}
                >
                  <Plus size={15} />
                  <span>+ Add 3D Engine</span>
                </button>

                <button
                  onClick={() => handleOpenAdd('2d')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '10px 18px',
                    background: '#FFFFFF',
                    color: '#002B66',
                    border: '1px solid rgba(0, 43, 102, 0.25)',
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(18, 14, 11, 0.04)'
                  }}
                >
                  <Plus size={15} />
                  <span>+ Add 2D Studio</span>
                </button>
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 12,
                padding: '12px 18px',
                background: '#FFFFFF',
                border: '1px solid rgba(0, 43, 102, 0.14)',
                marginBottom: 20
              }}
            >
              {/* Type Filter Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                {[
                  { id: 'all', label: `All Experiments (${(experiments || []).length})` },
                  { id: '3d', label: `3D Engines (${(experiments || []).filter(e => e.type === '3d').length})` },
                  { id: '2d', label: `2D Studios (${(experiments || []).filter(e => e.type === '2d').length})` },
                  { id: 'active', label: `Active (${(experiments || []).filter(e => e.isActive !== false).length})` }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setFilterType(tab.id)}
                    style={{
                      padding: '5px 12px',
                      fontSize: 12,
                      fontWeight: filterType === tab.id ? 700 : 600,
                      background: filterType === tab.id ? '#002B66' : '#FAF8F5',
                      color: filterType === tab.id ? '#FFFFFF' : '#002B66',
                      border: filterType === tab.id ? '1px solid #002B66' : '1px solid rgba(0, 43, 102, 0.15)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Real-time Search */}
              <div style={{ position: 'relative', minWidth: 260 }}>
                <Search size={14} color="#64748B" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  placeholder="Filter by topic, formula, title..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '6px 10px 6px 32px',
                    fontSize: 12.5,
                    border: '1px solid rgba(0, 43, 102, 0.2)',
                    background: '#FAF8F5',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            {/* List of Experiments */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
                gap: 20
              }}
            >
              {(experiments || [])
                .filter(item => {
                  if (filterType === '3d' && item.type !== '3d') return false
                  if (filterType === '2d' && item.type !== '2d') return false
                  if (filterType === 'active' && item.isActive === false) return false
                  if (searchQuery.trim()) {
                    const q = searchQuery.toLowerCase().trim()
                    const matchTitle = (item.title || '').toLowerCase().includes(q)
                    const matchCategory = (item.category || '').toLowerCase().includes(q)
                    const matchFormula = (item.formula || '').toLowerCase().includes(q)
                    const matchAuthor = (item.authorTeam || '').toLowerCase().includes(q)
                    const matchBadge = (item.badge || '').toLowerCase().includes(q)
                    return matchTitle || matchCategory || matchFormula || matchAuthor || matchBadge
                  }
                  return true
                })
                .map((item) => (
                <div
                  key={item.id}
                  style={{
                    background: '#FFFFFF',
                    border: '1px solid rgba(0, 43, 102, 0.14)',
                    boxShadow: '0 2px 10px rgba(0, 43, 102, 0.04)',
                    display: 'flex',
                    flexDirection: 'column',
                    opacity: item.isActive !== false ? 1 : 0.65,
                    transition: 'all 0.2s ease',
                    position: 'relative'
                  }}
                >
                  {/* Card Image Box */}
                  <div
                    style={{
                      height: 175,
                      width: '100%',
                      position: 'relative',
                      background: '#FAF8F5',
                      overflow: 'hidden'
                    }}
                  >
                    <img
                      src={item.imageUrl || 'https://images.unsplash.com/photo-1509228468518-180dd4864904?auto=format&fit=crop&w=800&q=80'}
                      alt={item.title}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover'
                      }}
                      onError={(e) => {
                        e.target.src = 'https://images.unsplash.com/photo-1509228468518-180dd4864904?auto=format&fit=crop&w=800&q=80'
                      }}
                    />

                    {/* Top Status & Type Badges */}
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
                          background: item.type === '3d' ? '#002B66' : '#D97706',
                          color: '#FFFFFF',
                          fontSize: 10,
                          fontWeight: 800,
                          padding: '3px 8px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em'
                        }}
                      >
                        {item.type === '3d' ? '3D ENGINE' : '2D STUDIO'}
                      </span>

                      <span
                        style={{
                          fontSize: 10.5,
                          fontWeight: 700,
                          background: 'rgba(255, 255, 255, 0.95)',
                          color: '#002B66',
                          border: '1px solid rgba(0, 43, 102, 0.2)',
                          padding: '2px 8px'
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
                        background: 'rgba(10, 25, 47, 0.85)',
                        color: '#FFFFFF',
                        fontSize: 10.5,
                        padding: '2px 8px',
                        fontWeight: 600,
                        fontFamily: 'monospace'
                      }}
                    >
                      {item.clicks || 0} clicks
                    </div>
                  </div>

                  {/* Body Info */}
                  <div style={{ padding: 18, flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <span
                        style={{
                          fontSize: 11,
                          color: '#002B66',
                          fontWeight: 800,
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em'
                        }}
                      >
                        {item.category}
                      </span>
                      {item.formula && (
                        <span
                          style={{
                            fontSize: 11,
                            fontFamily: 'monospace',
                            fontWeight: 700,
                            color: '#002B66',
                            background: '#FAF8F5',
                            border: '1px solid rgba(0, 43, 102, 0.16)',
                            padding: '1px 6px'
                          }}
                        >
                          {item.formula}
                        </span>
                      )}
                    </div>

                    <h3
                      style={{
                        margin: '0 0 4px 0',
                        fontSize: 16,
                        fontFamily: 'var(--font-display)',
                        fontWeight: 700,
                        color: '#0A192F',
                        lineHeight: 1.3
                      }}
                    >
                      {item.title}
                    </h3>

                    <p
                      style={{
                        margin: '0 0 12px 0',
                        fontSize: 12.5,
                        color: '#64748B',
                        lineHeight: 1.45,
                        flex: 1
                      }}
                    >
                      {item.subtitle || 'Custom online deployed physics experiment'}
                    </p>

                    {/* Author & Grade Level */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: '#475569', marginBottom: 12 }}>
                      <span>Team: <strong style={{ color: '#002B66' }}>{item.authorTeam || 'Visiora Core'}</strong></span>
                      <span>Target: <strong style={{ color: '#002B66' }}>{item.gradeLevel || 'Class 8-12'}</strong></span>
                    </div>

                    {/* Target URL Banner */}
                    <div
                      style={{
                        padding: '6px 10px',
                        background: '#FAF8F5',
                        border: '1px solid rgba(0, 43, 102, 0.12)',
                        fontSize: 11,
                        fontFamily: 'monospace',
                        color: '#002B66',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        marginBottom: 14
                      }}
                      title={item.targetUrl}
                    >
                      URL: {item.targetUrl}
                    </div>

                    {/* Action Bar */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingTop: 12,
                        borderTop: '1px solid rgba(0, 43, 102, 0.1)'
                      }}
                    >
                      {/* Test Sandbox Button */}
                      <button
                        onClick={() => handleOpenSandbox(item.targetUrl, item.title)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5,
                          fontSize: 12,
                          fontWeight: 700,
                          color: '#002B66',
                          background: 'rgba(0, 43, 102, 0.06)',
                          border: '1px solid rgba(0, 43, 102, 0.18)',
                          padding: '5px 10px',
                          cursor: 'pointer'
                        }}
                      >
                        <ExternalLink size={13} />
                        <span>Test Sandbox</span>
                      </button>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <button
                          onClick={() => toggleExperimentActive(item.id)}
                          title={item.isActive ? 'Hide from home' : 'Show on home'}
                          style={{
                            padding: '5px 10px',
                            background: item.isActive ? '#002B66' : '#FAF8F5',
                            color: item.isActive ? '#FFFFFF' : '#64748B',
                            border: '1px solid rgba(0, 43, 102, 0.2)',
                            fontSize: 11.5,
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          {item.isActive ? 'Active' : 'Draft'}
                        </button>

                        <button
                          onClick={() => handleOpenEdit(item)}
                          title="Edit experiment"
                          style={{
                            padding: '6px 8px',
                            background: '#FFFFFF',
                            border: '1px solid rgba(0, 43, 102, 0.2)',
                            color: '#002B66',
                            cursor: 'pointer'
                          }}
                        >
                          <Edit2 size={13} />
                        </button>

                        <button
                          onClick={() => {
                            if (confirm(`Delete experiment "${item.title}"?`)) {
                              deleteExperiment(item.id)
                              flashMessage(`✓ Experiment "${item.title}" deleted.`)
                            }
                          }}
                          title="Delete"
                          style={{
                            padding: '6px 8px',
                            background: '#FFFFFF',
                            border: '1px solid rgba(194, 59, 48, 0.3)',
                            color: '#DC2626',
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
      {/* MODAL: ADD / EDIT EXPERIMENT (2D & 3D DEPLOYMENT)              */}
      {/* ───────────────────────────────────────────────────────────── */}
      {modalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(10, 25, 47, 0.7)',
            backdropFilter: 'blur(8px)',
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
              maxWidth: 620,
              border: '1px solid rgba(0, 43, 102, 0.25)',
              borderTop: '5px solid #002B66',
              boxShadow: '0 24px 60px rgba(0, 0, 0, 0.35)',
              padding: '28px 32px',
              boxSizing: 'border-box',
              maxHeight: '92vh',
              overflowY: 'auto'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <div>
                <h3
                  style={{
                    margin: 0,
                    fontFamily: 'var(--font-display)',
                    fontSize: 18,
                    fontWeight: 800,
                    color: '#002B66'
                  }}
                >
                  {editingItem ? `Edit ${formType.toUpperCase()} Experiment` : `Register New ${formType.toUpperCase()} Experiment`}
                </h3>
                <span style={{ fontSize: 11.5, color: '#64748B' }}>
                  Deploy your team's online simulation directly into VISIORA
                </span>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#64748B' }}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveVisualization} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Type Switcher: 3D Engine vs 2D Studio */}
              <div>
                <label style={{ display: 'block', fontSize: 11.5, fontWeight: 800, color: '#002B66', textTransform: 'uppercase', marginBottom: 6 }}>
                  Simulation Architecture Type *
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => {
                      setFormType('3d')
                      if (!formBadge || formBadge === 'Interactive 2D') setFormBadge('3D Physics Lab')
                    }}
                    style={{
                      padding: '10px 14px',
                      background: formType === '3d' ? '#002B66' : '#FAF8F5',
                      color: formType === '3d' ? '#FFFFFF' : '#002B66',
                      border: formType === '3d' ? '1px solid #002B66' : '1px solid rgba(0, 43, 102, 0.2)',
                      fontWeight: 700,
                      fontSize: 12.5,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <span>✦ 3D Physics Engine (WebGL / Unity)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setFormType('2d')
                      if (!formBadge || formBadge === '3D Physics Lab') setFormBadge('Interactive 2D')
                    }}
                    style={{
                      padding: '10px 14px',
                      background: formType === '2d' ? '#D97706' : '#FAF8F5',
                      color: formType === '2d' ? '#FFFFFF' : '#002B66',
                      border: formType === '2d' ? '1px solid #D97706' : '1px solid rgba(0, 43, 102, 0.2)',
                      fontWeight: 700,
                      fontSize: 12.5,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <span>⚡ 2D Interactive Studio (HTML5 / PhET)</span>
                  </button>
                </div>
              </div>

              {/* Title */}
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#0A192F', marginBottom: 4 }}>
                  Experiment Title *
                </label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. Wave Optics & Double Slit Interference"
                  style={{ width: '100%', padding: '9px 12px', fontSize: 13, border: '1px solid rgba(0, 43, 102, 0.22)', boxSizing: 'border-box' }}
                />
              </div>

              {/* Category & Governing Formula */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#0A192F', marginBottom: 4 }}>
                    Scientific Topic / Domain *
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', fontSize: 13, border: '1px solid rgba(0, 43, 102, 0.22)', background: '#FFFFFF' }}
                  >
                    <option value="Mechanics & Kinematics">Mechanics &amp; Kinematics</option>
                    <option value="Electromagnetism">Electromagnetism</option>
                    <option value="Wave Mechanics">Wave Mechanics</option>
                    <option value="Optics & Light">Optics &amp; Light</option>
                    <option value="Thermodynamics">Thermodynamics</option>
                    <option value="Gravitation & Astrophysics">Gravitation &amp; Astrophysics</option>
                    <option value="Fluid Mechanics">Fluid Mechanics</option>
                    <option value="Quantum & Modern">Quantum &amp; Modern</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#0A192F', marginBottom: 4 }}>
                    Governing Law / Formula
                  </label>
                  <input
                    type="text"
                    value={formFormula}
                    onChange={(e) => setFormFormula(e.target.value)}
                    placeholder="e.g. λ = d·sin θ / m"
                    style={{ width: '100%', padding: '9px 12px', fontSize: 13, border: '1px solid rgba(0, 43, 102, 0.22)', fontFamily: 'monospace', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              {/* Subtitle */}
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#0A192F', marginBottom: 4 }}>
                  Subtitle / Scientific Concept Summary
                </label>
                <input
                  type="text"
                  value={formSubtitle}
                  onChange={(e) => setFormSubtitle(e.target.value)}
                  placeholder="e.g. Coherent wave superposition, fringe width calculation, and phase difference"
                  style={{ width: '100%', padding: '9px 12px', fontSize: 13, border: '1px solid rgba(0, 43, 102, 0.22)', boxSizing: 'border-box' }}
                />
              </div>

              {/* Deployed Project URL with Sandbox Test Button */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#0A192F' }}>
                    Deployed Project URL (Team's Online Host) *
                  </label>
                  {formTargetUrl && (
                    <button
                      type="button"
                      onClick={() => handleOpenSandbox(formTargetUrl, formTitle || 'New Simulation')}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#002B66',
                        fontSize: 11.5,
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4
                      }}
                    >
                      <span>⚡ Test URL Sandbox</span>
                      <ExternalLink size={12} />
                    </button>
                  )}
                </div>
                <input
                  type="url"
                  required
                  value={formTargetUrl}
                  onChange={(e) => setFormTargetUrl(e.target.value)}
                  placeholder="https://your-team.vercel.app/lab/ or https://phet.colorado.edu/..."
                  style={{ width: '100%', padding: '9px 12px', fontSize: 13, border: '1px solid rgba(0, 43, 102, 0.22)', boxSizing: 'border-box' }}
                />
                <span style={{ fontSize: 11, color: '#64748B' }}>
                  Students clicking this lab on the website will interact with this deployed simulation.
                </span>
              </div>

              {/* Photos / Custom Preview Image URL or File Upload */}
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#0A192F', marginBottom: 4 }}>
                  Experiment Photo / Thumbnail Image URL
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="text"
                    value={formImageUrl}
                    onChange={(e) => setFormImageUrl(e.target.value)}
                    placeholder="https://images.unsplash.com/... or /images/..."
                    style={{ flex: 1, padding: '9px 12px', fontSize: 13, border: '1px solid rgba(0, 43, 102, 0.22)', boxSizing: 'border-box' }}
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
                      background: '#FAF8F5',
                      border: '1px solid rgba(0, 43, 102, 0.2)',
                      fontSize: 12,
                      fontWeight: 700,
                      color: '#002B66',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    <Upload size={13} />
                    <span>Upload Image</span>
                  </button>
                </div>

                {/* Live Preview of the Image */}
                {formImageUrl && (
                  <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <img
                      src={formImageUrl}
                      alt="Thumbnail Preview"
                      style={{ width: 90, height: 50, objectFit: 'cover', border: '1px solid rgba(0, 43, 102, 0.2)' }}
                      onError={(e) => { e.target.style.display = 'none' }}
                    />
                    <span style={{ fontSize: 11, color: '#64748B' }}>
                      Thumbnail visual verified
                    </span>
                  </div>
                )}
              </div>

              {/* Author Team & Grade Level & Badge */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#0A192F', marginBottom: 4 }}>
                    Author Team
                  </label>
                  <input
                    type="text"
                    value={formAuthorTeam}
                    onChange={(e) => setFormAuthorTeam(e.target.value)}
                    placeholder="e.g. Alpha 3D Lab"
                    style={{ width: '100%', padding: '8px 10px', fontSize: 12.5, border: '1px solid rgba(0, 43, 102, 0.22)', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#0A192F', marginBottom: 4 }}>
                    Target Grade
                  </label>
                  <input
                    type="text"
                    value={formGradeLevel}
                    onChange={(e) => setFormGradeLevel(e.target.value)}
                    placeholder="e.g. Class 8-10"
                    style={{ width: '100%', padding: '8px 10px', fontSize: 12.5, border: '1px solid rgba(0, 43, 102, 0.22)', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#0A192F', marginBottom: 4 }}>
                    Badge Tag
                  </label>
                  <input
                    type="text"
                    value={formBadge}
                    onChange={(e) => setFormBadge(e.target.value)}
                    placeholder="e.g. Unity 3D Lab"
                    style={{ width: '100%', padding: '8px 10px', fontSize: 12.5, border: '1px solid rgba(0, 43, 102, 0.22)', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              {/* Active / Publish Checkbox */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                <input
                  type="checkbox"
                  id="activeToggle"
                  checked={formIsActive}
                  onChange={(e) => setFormIsActive(e.target.checked)}
                  style={{ width: 16, height: 16, accentColor: '#002B66', cursor: 'pointer' }}
                />
                <label htmlFor="activeToggle" style={{ fontSize: 13, fontWeight: 700, color: '#002B66', cursor: 'pointer' }}>
                  Publish live and display immediately across the entire website
                </label>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 14 }}>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  style={{
                    padding: '9px 16px',
                    background: 'transparent',
                    border: '1px solid rgba(0, 43, 102, 0.2)',
                    fontSize: 13,
                    color: '#64748B',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  style={{
                    padding: '10px 22px',
                    background: '#002B66',
                    color: '#FFFFFF',
                    border: 'none',
                    fontWeight: 800,
                    fontSize: 13,
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(0, 43, 102, 0.25)'
                  }}
                >
                  {editingItem ? 'Save & Update Experiment' : 'Publish Experiment Live'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MODAL: LIVE SANDBOX URL TESTER                                */}
      {/* ───────────────────────────────────────────────────────────── */}
      {sandboxModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(10, 25, 47, 0.8)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
            padding: 24
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 1080,
              height: '85vh',
              background: '#FAF8F5',
              border: '1px solid rgba(0, 43, 102, 0.25)',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 24px 60px rgba(0, 0, 0, 0.5)',
              overflow: 'hidden'
            }}
          >
            {/* Sandbox Header */}
            <div
              style={{
                height: 48,
                background: '#FAF8F5',
                borderBottom: '1px solid rgba(0, 43, 102, 0.16)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 16px',
                flexShrink: 0
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 11, fontWeight: 800, background: '#002B66', color: '#FFFFFF', padding: '2px 8px' }}>
                  SANDBOX TESTER
                </span>
                <strong style={{ fontSize: 13.5, color: '#002B66' }}>{sandboxTitle}</strong>
                <span style={{ fontSize: 11, color: '#64748B', fontFamily: 'monospace' }}>({sandboxUrl})</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <a
                  href={sandboxUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontSize: 12,
                    color: '#002B66',
                    fontWeight: 700,
                    textDecoration: 'none',
                    padding: '4px 8px',
                    border: '1px solid rgba(0, 43, 102, 0.2)',
                    background: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4
                  }}
                >
                  <span>Open in Tab</span>
                  <ExternalLink size={12} />
                </a>

                <button
                  onClick={() => setSandboxModalOpen(false)}
                  style={{
                    background: '#FFFFFF',
                    border: '1px solid rgba(0, 43, 102, 0.2)',
                    fontSize: 16,
                    cursor: 'pointer',
                    width: 28,
                    height: 28,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#002B66'
                  }}
                >
                  &times;
                </button>
              </div>
            </div>

            {/* Sandbox Iframe */}
            <div style={{ flex: 1, position: 'relative', background: '#FFFFFF' }}>
              <iframe
                src={sandboxUrl}
                title="Sandbox Preview"
                style={{ width: '100%', height: '100%', border: 'none' }}
                allow="fullscreen; accelerometer; gyroscope; autoplay; clipboard-write; encrypted-media; picture-in-picture"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

