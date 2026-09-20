import { create } from 'zustand'
import { auth, googleProvider } from '../lib/firebase'
import { signInWithPopup, signOut } from 'firebase/auth'

const DEFAULT_BANNER = '/images/physics_doodle_banner_16x9.jpg'
const DEFAULT_SHOWCASE = '/images/physics_doodle_portrait.jpg'

const DEFAULT_2D_VISUALIZATIONS = [
  {
    id: 'vis-energy-forms',
    title: 'Energy Forms & Changes: Thermal Physics & Systems',
    subtitle: 'Experiment with heat conduction, thermal equilibrium, floating energy packets, and multi-stage power generation',
    category: 'Thermodynamics',
    targetUrl: 'https://phet.colorado.edu/sims/html/energy-forms-and-changes/latest/energy-forms-and-changes_en.html',
    internalPath: '/sim-2d?lab=energy-forms-and-changes',
    imageUrl: '/images/energy_forms_changes_banner.jpg',
    badge: 'Featured 2D Lab',
    isActive: true,
    order: 1,
    clicks: 215,
    createdAt: '2026-09-11T09:00:00Z'
  },
  {
    id: 'vis-phet-circuits',
    title: "Circuit Construction Kit: DC & Ohm's Law",
    subtitle: 'Interactive schematic builder for resistors, batteries, capacitors and voltage analysis',
    category: 'Electromagnetism',
    targetUrl: 'https://phet.colorado.edu/sims/html/circuit-construction-kit-dc/latest/circuit-construction-kit-dc_all.html',
    internalPath: '/sim-2d?lab=circuit-construction-kit-dc',
    imageUrl: 'https://images.unsplash.com/photo-1517420704952-d9f39e95b43e?auto=format&fit=crop&w=800&q=80',
    badge: 'PhET Simulation',
    isActive: true,
    order: 2,
    clicks: 142,
    createdAt: '2026-09-10T12:00:00Z'
  },
  {
    id: 'vis-wave-string',
    title: 'Wave Interference & Standing Harmonics',
    subtitle: 'Explore frequency, amplitude, damping and boundary reflection in 2D mechanical strings',
    category: 'Wave Mechanics',
    targetUrl: 'https://phet.colorado.edu/sims/html/wave-on-a-string/latest/wave-on-a-string_all.html',
    internalPath: '/sim-2d?lab=wave-on-a-string',
    imageUrl: 'https://images.unsplash.com/photo-1509228468518-180dd4864904?auto=format&fit=crop&w=800&q=80',
    badge: 'Interactive 2D',
    isActive: true,
    order: 3,
    clicks: 98,
    createdAt: '2026-09-10T14:30:00Z'
  },
  {
    id: 'vis-optics-ray',
    title: "Geometric Optics & Snell's Refraction",
    subtitle: 'Precision ray tracing through convex lenses, concave mirrors and refractive prisms',
    category: 'Optics & Light',
    targetUrl: 'https://phet.colorado.edu/sims/html/geometric-optics/latest/geometric-optics_all.html',
    internalPath: '/sim-2d?lab=geometric-optics',
    imageUrl: 'https://images.unsplash.com/photo-1507668077129-56e32842fceb?auto=format&fit=crop&w=800&q=80',
    badge: 'Optics Lab',
    isActive: true,
    order: 4,
    clicks: 76,
    createdAt: '2026-09-11T08:15:00Z'
  }
]

const DEFAULT_USERS = [
  {
    uid: 'usr_atelier_founder',
    email: 'director@visiora.org',
    displayName: 'Visiora Director',
    provider: 'google.com',
    photoURL: null,
    lastLogin: new Date().toISOString(),
    createdAt: '2026-09-01T08:00:00Z',
    role: 'Admin',
    streak: 11,
    mastery: 94
  },
  {
    uid: 'usr_dev_bouroju',
    email: 'bouroju@gmail.com',
    displayName: 'Lead Physicist',
    provider: 'google.com',
    photoURL: null,
    lastLogin: new Date(Date.now() - 3600000).toISOString(),
    createdAt: '2026-09-02T10:30:00Z',
    role: 'Admin',
    streak: 9,
    mastery: 88
  },
  {
    uid: 'usr_student_elena',
    email: 'elena.curie@cambridge.ac.uk',
    displayName: 'Elena Curie',
    provider: 'google.com',
    photoURL: null,
    lastLogin: new Date(Date.now() - 18000000).toISOString(),
    createdAt: '2026-09-05T14:15:00Z',
    role: 'Student',
    streak: 5,
    mastery: 72
  }
]

export const useAdminStore = create((set, get) => ({
  // Admin Auth State
  adminUser: null,
  isAdminAuthenticated: false,
  authorizedEmails: [
    'admin@visiora.edu',
    'director@visiora.org',
    'bouroju@gmail.com',
    'admin@atelier.visiora'
  ],
  isAuthLoading: false,
  authError: null,

  // Home Images State
  bannerImage: (() => {
    try {
      return localStorage.getItem('visiora_banner_img') || DEFAULT_BANNER
    } catch {
      return DEFAULT_BANNER
    }
  })(),
  showcaseImage: (() => {
    try {
      return localStorage.getItem('visiora_showcase_img') || DEFAULT_SHOWCASE
    } catch {
      return DEFAULT_SHOWCASE
    }
  })(),

  // 2D Visualizations State
  visualizations: (() => {
    try {
      const stored = localStorage.getItem('visiora_2d_sims')
      if (!stored) return DEFAULT_2D_VISUALIZATIONS
      const parsed = JSON.parse(stored)
      // Ensure DEFAULT items like energy forms are merged if missing or updated
      const existingIds = new Set(parsed.map(p => p.id))
      const missing = DEFAULT_2D_VISUALIZATIONS.filter(d => !existingIds.has(d.id))
      return [...missing, ...parsed]
    } catch {
      return DEFAULT_2D_VISUALIZATIONS
    }
  })(),

  // Users Directory State
  usersList: (() => {
    try {
      const stored = localStorage.getItem('visiora_users_list')
      return stored ? JSON.parse(stored) : DEFAULT_USERS
    } catch {
      return DEFAULT_USERS
    }
  })(),

  isLoadingData: false,

  // ── 1. Admin Authentication with Authorized Google Sign-in ──
  loginWithGoogle: async () => {
    set({ isAuthLoading: true, authError: null })
    try {
      const result = await signInWithPopup(auth, googleProvider)
      const email = result.user.email?.toLowerCase() || ''
      const authorized = get().authorizedEmails.map(e => e.toLowerCase())

      // Check if user is in authorized list OR has admin in email or in dev mode
      const isAuthorized = authorized.includes(email) || email.includes('admin') || import.meta.env.DEV

      if (!isAuthorized) {
        await signOut(auth)
        set({
          adminUser: null,
          isAdminAuthenticated: false,
          isAuthLoading: false,
          authError: `Access Denied: ${email} is not on the authorized administrative whitelist.`
        })
        return false
      }

      const adminProfile = {
        uid: result.user.uid,
        email: result.user.email,
        displayName: result.user.displayName || 'Authorized Administrator',
        photoURL: result.user.photoURL,
        provider: 'google.com',
        role: 'Admin',
        lastLogin: new Date().toISOString()
      }

      set({
        adminUser: adminProfile,
        isAdminAuthenticated: true,
        isAuthLoading: false,
        authError: null
      })

      // Track this login
      get().trackUserLogin(adminProfile)
      return true
    } catch (err) {
      console.warn('Google Popup Login Error:', err.message)
      set({
        isAuthLoading: false,
        authError: err.message || 'Google sign-in was interrupted or failed.'
      })
      return false
    }
  },

  // Development / Demo Admin Access Bypass
  enableDevAdmin: (customEmail = 'bouroju@gmail.com') => {
    const devAdmin = {
      uid: 'dev_admin_001',
      email: customEmail,
      displayName: 'Authorized Atelier Admin',
      provider: 'google.com',
      photoURL: null,
      role: 'Admin',
      lastLogin: new Date().toISOString()
    }
    set({
      adminUser: devAdmin,
      isAdminAuthenticated: true,
      authError: null
    })
    get().trackUserLogin(devAdmin)
  },

  logoutAdmin: () => {
    try {
      signOut(auth)
    } catch (e) {}
    set({ adminUser: null, isAdminAuthenticated: false, authError: null })
  },

  // ── 2. Initialize and Fetch Data from Backend (with fallback) ──
  fetchAdminData: async () => {
    set({ isLoadingData: true })
    try {
      // Fetch Config (Home Images)
      const resConfig = await fetch('/api/v1/admin/config').catch(() => null)
      if (resConfig && resConfig.ok) {
        const config = await resConfig.json()
        if (config.bannerImage) {
          set({ bannerImage: config.bannerImage })
          localStorage.setItem('visiora_banner_img', config.bannerImage)
        }
        if (config.showcaseImage) {
          set({ showcaseImage: config.showcaseImage })
          localStorage.setItem('visiora_showcase_img', config.showcaseImage)
        }
        if (config.authorizedGoogleEmails) {
          set({ authorizedEmails: config.authorizedGoogleEmails })
        }
      }

      // Fetch 2D Visualizations
      const resVis = await fetch('/api/v1/admin/visualizations').catch(() => null)
      if (resVis && resVis.ok) {
        const vis = await resVis.json()
        if (Array.isArray(vis) && vis.length > 0) {
          set({ visualizations: vis })
          localStorage.setItem('visiora_2d_sims', JSON.stringify(vis))
        }
      }

      // Fetch Users
      const resUsers = await fetch('/api/v1/admin/users').catch(() => null)
      if (resUsers && resUsers.ok) {
        const users = await resUsers.json()
        if (Array.isArray(users) && users.length > 0) {
          set({ usersList: users })
          localStorage.setItem('visiora_users_list', JSON.stringify(users))
        }
      }
    } catch (err) {
      console.warn('Backend sync warning, keeping local cached data:', err)
    } finally {
      set({ isLoadingData: false })
    }
  },

  // ── 3. Home Images Management ──
  setBannerImage: async (url) => {
    const trimmed = (url || '').trim() || DEFAULT_BANNER
    set({ bannerImage: trimmed })
    try {
      localStorage.setItem('visiora_banner_img', trimmed)
      await fetch('/api/v1/admin/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bannerImage: trimmed })
      })
    } catch (e) {}
  },

  setShowcaseImage: async (url) => {
    const trimmed = (url || '').trim() || DEFAULT_SHOWCASE
    set({ showcaseImage: trimmed })
    try {
      localStorage.setItem('visiora_showcase_img', trimmed)
      await fetch('/api/v1/admin/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ showcaseImage: trimmed })
      })
    } catch (e) {}
  },

  resetHomeImages: async () => {
    set({ bannerImage: DEFAULT_BANNER, showcaseImage: DEFAULT_SHOWCASE })
    try {
      localStorage.setItem('visiora_banner_img', DEFAULT_BANNER)
      localStorage.setItem('visiora_showcase_img', DEFAULT_SHOWCASE)
      await fetch('/api/v1/admin/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bannerImage: DEFAULT_BANNER, showcaseImage: DEFAULT_SHOWCASE })
      })
    } catch (e) {}
  },

  // ── 4. 2D Visualizations CRUD Operations ──
  addVisualization: async (item) => {
    const newItem = {
      id: `vis-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      title: item.title,
      subtitle: item.subtitle || '',
      category: item.category || 'General Physics',
      targetUrl: item.targetUrl,
      imageUrl: item.imageUrl || 'https://images.unsplash.com/photo-1509228468518-180dd4864904?auto=format&fit=crop&w=800&q=80',
      badge: item.badge || 'Interactive 2D',
      isActive: item.isActive !== false,
      order: item.order || (get().visualizations.length + 1),
      clicks: 0,
      createdAt: new Date().toISOString()
    }

    const updated = [...get().visualizations, newItem]
    set({ visualizations: updated })
    try {
      localStorage.setItem('visiora_2d_sims', JSON.stringify(updated))
      await fetch('/api/v1/admin/visualizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newItem)
      })
    } catch (e) {}
    return newItem
  },

  updateVisualization: async (id, changes) => {
    const updated = get().visualizations.map(v => (v.id === id ? { ...v, ...changes } : v))
    set({ visualizations: updated })
    try {
      localStorage.setItem('visiora_2d_sims', JSON.stringify(updated))
      await fetch(`/api/v1/admin/visualizations/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(changes)
      })
    } catch (e) {}
  },

  deleteVisualization: async (id) => {
    const updated = get().visualizations.filter(v => v.id !== id)
    set({ visualizations: updated })
    try {
      localStorage.setItem('visiora_2d_sims', JSON.stringify(updated))
      await fetch(`/api/v1/admin/visualizations/${id}`, { method: 'DELETE' })
    } catch (e) {}
  },

  toggleVisualizationActive: async (id) => {
    const target = get().visualizations.find(v => v.id === id)
    if (!target) return
    await get().updateVisualization(id, { isActive: !target.isActive })
  },

  trackVisualizationClick: (id) => {
    const updated = get().visualizations.map(v => (v.id === id ? { ...v, clicks: (v.clicks || 0) + 1 } : v))
    set({ visualizations: updated })
    try {
      localStorage.setItem('visiora_2d_sims', JSON.stringify(updated))
      fetch(`/api/v1/admin/visualizations/${id}/click`, { method: 'POST' }).catch(() => {})
    } catch (e) {}
  },

  // ── 5. User Login Tracking ──
  trackUserLogin: async (userData) => {
    if (!userData || !userData.uid) return
    const now = new Date().toISOString()
    const users = get().usersList
    const existingIndex = users.findIndex(u => u.uid === userData.uid || (userData.email && u.email === userData.email))

    let updatedUsers = [...users]
    if (existingIndex >= 0) {
      updatedUsers[existingIndex] = {
        ...updatedUsers[existingIndex],
        lastLogin: now,
        displayName: userData.displayName || updatedUsers[existingIndex].displayName,
        photoURL: userData.photoURL || updatedUsers[existingIndex].photoURL,
        provider: userData.provider || updatedUsers[existingIndex].provider
      }
    } else {
      const isAdm = get().authorizedEmails.includes(userData.email) || (userData.email && userData.email.includes('admin'))
      updatedUsers.unshift({
        uid: userData.uid,
        email: userData.email || `${userData.uid.substring(0, 8)}@visiora.user`,
        displayName: userData.displayName || 'Physicist Scholar',
        provider: userData.provider || 'google.com',
        photoURL: userData.photoURL || null,
        lastLogin: now,
        createdAt: now,
        role: isAdm ? 'Admin' : 'Student',
        streak: 1,
        mastery: 0
      })
    }

    set({ usersList: updatedUsers })
    try {
      localStorage.setItem('visiora_users_list', JSON.stringify(updatedUsers))
      fetch('/api/v1/admin/users/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      }).catch(() => {})
    } catch (e) {}
  }
}))
