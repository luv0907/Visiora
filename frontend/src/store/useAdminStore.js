import { create } from 'zustand'
import { auth, googleProvider } from '../lib/firebase'
import { signInWithPopup, signOut } from 'firebase/auth'

const DEFAULT_BANNER = '/images/physics_doodle_banner_16x9.jpg'
const DEFAULT_SHOWCASE = '/images/physics_doodle_portrait.jpg'

export const DEFAULT_EXPERIMENTS = [
  {
    id: 'ohmslaw',
    type: '3d',
    title: "Ohm's Law Virtual Lab",
    subtitle: 'Interactive 3D laboratory bench with analog meters, rheostat & V-I graph',
    category: 'Electromagnetism',
    formula: 'V = I · R',
    targetUrl: '/virtual-lab/index.html',
    imageUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80',
    badge: 'Unity 3D Lab',
    icon: 'ohmslaw',
    embedMode: 'embed',
    isActive: true,
    isFeatured: true,
    order: 1,
    clicks: 340,
    authorTeam: 'Visiora Virtual Labs Core',
    gradeLevel: 'Class 8-10',
    createdAt: '2026-09-10T10:00:00Z'
  },
  {
    id: 'projectile',
    type: '3d',
    title: 'Projectile Motion Simulator',
    subtitle: 'Parabolic trajectories, air drag, launch angles, and velocity vector components',
    category: 'Kinematics & Dynamics',
    formula: 'R = (v₀² sin 2θ)/g',
    targetUrl: '/sim?lab=projectile',
    imageUrl: 'https://images.unsplash.com/photo-1509228468518-180dd4864904?auto=format&fit=crop&w=800&q=80',
    badge: '3D Physics Engine',
    icon: 'projectile',
    embedMode: 'embed',
    isActive: true,
    isFeatured: true,
    order: 2,
    clicks: 285,
    authorTeam: 'Dynamics Lab Alpha',
    gradeLevel: 'Class 9-12',
    createdAt: '2026-09-10T11:00:00Z'
  },
  {
    id: 'gravity',
    type: '3d',
    title: 'Free Fall & Gravitational Orbits',
    subtitle: 'Mass-independent acceleration and Keplerian gravitational orbital mechanics',
    category: 'Gravitation & Astrophysics',
    formula: 'y(t) = h₀ - ½gt²',
    targetUrl: '/sim?lab=gravity',
    imageUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=800&q=80',
    badge: 'Galileo Lab',
    icon: 'gravity',
    embedMode: 'embed',
    isActive: true,
    isFeatured: false,
    order: 3,
    clicks: 195,
    authorTeam: 'Astrophysics Group',
    gradeLevel: 'Class 9-12',
    createdAt: '2026-09-10T11:30:00Z'
  },
  {
    id: 'pendulum',
    type: '3d',
    title: 'Pendulum Mechanics & Chaos',
    subtitle: 'Harmonic oscillation, phase space trajectories, and double pendulum chaos',
    category: 'Harmonics & Waves',
    formula: 'T = 2π√(L/g)',
    targetUrl: '/sim?lab=pendulum',
    imageUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80',
    badge: 'Harmonics 3D',
    icon: 'pendulum',
    embedMode: 'embed',
    isActive: true,
    isFeatured: false,
    order: 4,
    clicks: 160,
    authorTeam: 'Oscillations Team',
    gradeLevel: 'Class 10-12',
    createdAt: '2026-09-10T12:00:00Z'
  },
  {
    id: 'buoyancy',
    type: '3d',
    title: 'Fluid Buoyancy & Density',
    subtitle: 'Fluid displacement, density thresholds, and Archimedes upward buoyant force',
    category: 'Fluid Mechanics',
    formula: 'F_b = ρ_f · V_sub · g',
    targetUrl: '/sim?lab=buoyancy',
    imageUrl: 'https://images.unsplash.com/photo-1518837695005-2083093ee35b?auto=format&fit=crop&w=800&q=80',
    badge: 'Archimedes Lab',
    icon: 'buoyancy',
    embedMode: 'embed',
    isActive: true,
    isFeatured: false,
    order: 5,
    clicks: 140,
    authorTeam: 'Fluid Dynamics Lab',
    gradeLevel: 'Class 9-11',
    createdAt: '2026-09-10T12:30:00Z'
  },
  {
    id: 'collision',
    type: '3d',
    title: 'Elastic & Inelastic Collisions',
    subtitle: 'Conservation of linear momentum and kinetic energy exchange across velocities',
    category: 'Mechanics & Momentum',
    formula: 'p = m₁v₁ + m₂v₂',
    targetUrl: '/sim?lab=collision',
    imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80',
    badge: 'Conservation Law',
    icon: 'collision',
    embedMode: 'embed',
    isActive: true,
    isFeatured: false,
    order: 6,
    clicks: 115,
    authorTeam: 'Classical Mechanics Unit',
    gradeLevel: 'Class 11-12',
    createdAt: '2026-09-10T13:00:00Z'
  },
  {
    id: 'vis-energy-forms',
    type: '2d',
    title: 'Energy Forms & Changes: Thermal Physics & Systems',
    subtitle: 'Experiment with heat conduction, thermal equilibrium, floating energy packets, and multi-stage power generation',
    category: 'Thermodynamics',
    formula: 'Q = mcΔT',
    targetUrl: 'https://phet.colorado.edu/sims/html/energy-forms-and-changes/latest/energy-forms-and-changes_en.html',
    internalPath: '/sim-2d?lab=energy-forms-and-changes',
    imageUrl: '/images/energy_forms_changes_banner.jpg',
    badge: 'Featured 2D Lab',
    icon: 'flame',
    embedMode: 'embed',
    isActive: true,
    isFeatured: true,
    order: 7,
    clicks: 215,
    authorTeam: 'PhET & Visiora Atelier',
    gradeLevel: 'Class 8-12',
    createdAt: '2026-09-11T09:00:00Z'
  },
  {
    id: 'vis-phet-circuits',
    type: '2d',
    title: "Circuit Construction Kit: DC & Ohm's Law",
    subtitle: 'Interactive schematic builder for resistors, batteries, capacitors and voltage analysis',
    category: 'Electromagnetism',
    formula: 'V = I · R',
    targetUrl: 'https://phet.colorado.edu/sims/html/circuit-construction-kit-dc/latest/circuit-construction-kit-dc_all.html',
    internalPath: '/sim-2d?lab=circuit-construction-kit-dc',
    imageUrl: 'https://images.unsplash.com/photo-1517420704952-d9f39e95b43e?auto=format&fit=crop&w=800&q=80',
    badge: 'PhET Simulation',
    icon: 'zap',
    embedMode: 'embed',
    isActive: true,
    isFeatured: false,
    order: 8,
    clicks: 142,
    authorTeam: 'Circuits Studio',
    gradeLevel: 'Class 8-10',
    createdAt: '2026-09-10T12:00:00Z'
  },
  {
    id: 'vis-wave-string',
    type: '2d',
    title: 'Wave Interference & Standing Harmonics',
    subtitle: 'Explore frequency, amplitude, damping and boundary reflection in 2D mechanical strings',
    category: 'Wave Mechanics',
    formula: 'v = f · λ',
    targetUrl: 'https://phet.colorado.edu/sims/html/wave-on-a-string/latest/wave-on-a-string_all.html',
    internalPath: '/sim-2d?lab=wave-on-a-string',
    imageUrl: 'https://images.unsplash.com/photo-1509228468518-180dd4864904?auto=format&fit=crop&w=800&q=80',
    badge: 'Interactive 2D',
    icon: 'activity',
    embedMode: 'embed',
    isActive: true,
    isFeatured: false,
    order: 9,
    clicks: 98,
    authorTeam: 'Acoustics & Waves',
    gradeLevel: 'Class 9-12',
    createdAt: '2026-09-10T14:30:00Z'
  },
  {
    id: 'vis-optics-ray',
    type: '2d',
    title: "Geometric Optics & Snell's Refraction",
    subtitle: 'Precision ray tracing through convex lenses, concave mirrors and refractive prisms',
    category: 'Optics & Light',
    formula: 'n₁ sin θ₁ = n₂ sin θ₂',
    targetUrl: 'https://phet.colorado.edu/sims/html/geometric-optics/latest/geometric-optics_all.html',
    internalPath: '/sim-2d?lab=geometric-optics',
    imageUrl: 'https://images.unsplash.com/photo-1507668077129-56e32842fceb?auto=format&fit=crop&w=800&q=80',
    badge: 'Optics Lab',
    icon: 'eye',
    embedMode: 'embed',
    isActive: true,
    isFeatured: false,
    order: 10,
    clicks: 76,
    authorTeam: 'Photonics Team',
    gradeLevel: 'Class 10-12',
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

  // Unified Experiments State (Both 3D and 2D)
  experiments: (() => {
    try {
      const stored = localStorage.getItem('visiora_experiments')
      if (!stored) return DEFAULT_EXPERIMENTS
      const parsed = JSON.parse(stored)
      const existingIds = new Set(parsed.map(p => p.id))
      const missing = DEFAULT_EXPERIMENTS.filter(d => !existingIds.has(d.id))
      return [...missing, ...parsed]
    } catch {
      return DEFAULT_EXPERIMENTS
    }
  })(),

  // Computed helper selectors
  get3DExperiments: (activeOnly = false) => {
    const list = (get().experiments || []).filter(e => e.type === '3d')
    return activeOnly ? list.filter(e => e.isActive !== false) : list
  },

  get2DExperiments: (activeOnly = false) => {
    const list = (get().experiments || []).filter(e => e.type === '2d')
    return activeOnly ? list.filter(e => e.isActive !== false) : list
  },

  getExperimentById: (id) => {
    return (get().experiments || []).find(e => e.id === id) || null
  },

  // Backward compatibility alias for 2D visualizations
  visualizations: (() => {
    try {
      const stored = localStorage.getItem('visiora_experiments')
      if (stored) {
        const parsed = JSON.parse(stored)
        return parsed.filter(p => p.type === '2d')
      }
      return DEFAULT_EXPERIMENTS.filter(d => d.type === '2d')
    } catch {
      return DEFAULT_EXPERIMENTS.filter(d => d.type === '2d')
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
      let msg = err.message || 'Google sign-in was interrupted or failed.'
      if (err.code === 'auth/unauthorized-domain' || err.message?.includes('unauthorized-domain')) {
        const domain = typeof window !== 'undefined' ? window.location.hostname : 'your-domain.vercel.app'
        msg = `Domain unauthorized (${domain}). Please add "${domain}" to Firebase Console -> Authentication -> Settings -> Authorized Domains.`
      }
      set({
        isAuthLoading: false,
        authError: msg
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

      // Fetch Experiments (Unified 2D & 3D)
      const resExp = await fetch('/api/v1/admin/experiments').catch(() => null)
      if (resExp && resExp.ok) {
        const exps = await resExp.json()
        if (Array.isArray(exps) && exps.length > 0) {
          set({
            experiments: exps,
            visualizations: exps.filter(e => e.type === '2d')
          })
          localStorage.setItem('visiora_experiments', JSON.stringify(exps))
          localStorage.setItem('visiora_2d_sims', JSON.stringify(exps.filter(e => e.type === '2d')))
        }
      } else {
        // Fallback: fetch legacy 2D visualizations
        const resVis = await fetch('/api/v1/admin/visualizations').catch(() => null)
        if (resVis && resVis.ok) {
          const vis = await resVis.json()
          if (Array.isArray(vis) && vis.length > 0) {
            set({ visualizations: vis })
            localStorage.setItem('visiora_2d_sims', JSON.stringify(vis))
          }
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

  // ── 4. Unified Experiments CRUD Operations (3D and 2D) ──
  addExperiment: async (item) => {
    const is3D = (item.type || '3d').toLowerCase() === '3d'
    const newId = `exp-${is3D ? '3d' : '2d'}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`
    const defaultImg = is3D
      ? 'https://images.unsplash.com/photo-1509228468518-180dd4864904?auto=format&fit=crop&w=800&q=80'
      : '/images/energy_forms_changes_banner.jpg'

    const newItem = {
      id: item.id || newId,
      type: is3D ? '3d' : '2d',
      title: item.title,
      subtitle: item.subtitle || '',
      category: item.category || (is3D ? 'Mechanics & Kinematics' : 'General Physics'),
      formula: item.formula || '',
      targetUrl: item.targetUrl,
      imageUrl: item.imageUrl || defaultImg,
      badge: item.badge || (is3D ? '3D Physics Lab' : 'Interactive 2D'),
      icon: item.icon || (is3D ? 'atom' : 'activity'),
      embedMode: item.embedMode || 'embed',
      isActive: item.isActive !== false,
      isFeatured: Boolean(item.isFeatured),
      order: item.order || (get().experiments.length + 1),
      authorTeam: item.authorTeam || 'Visiora Atelier Core',
      gradeLevel: item.gradeLevel || 'Class 8-12',
      clicks: 0,
      createdAt: new Date().toISOString()
    }

    const updated = [...get().experiments, newItem]
    set({
      experiments: updated,
      visualizations: updated.filter(e => e.type === '2d')
    })
    try {
      localStorage.setItem('visiora_experiments', JSON.stringify(updated))
      localStorage.setItem('visiora_2d_sims', JSON.stringify(updated.filter(e => e.type === '2d')))
      await fetch('/api/v1/admin/experiments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newItem)
      })
    } catch (e) {}
    return newItem
  },

  updateExperiment: async (id, changes) => {
    const updated = get().experiments.map(e => (e.id === id ? { ...e, ...changes } : e))
    set({
      experiments: updated,
      visualizations: updated.filter(e => e.type === '2d')
    })
    try {
      localStorage.setItem('visiora_experiments', JSON.stringify(updated))
      localStorage.setItem('visiora_2d_sims', JSON.stringify(updated.filter(e => e.type === '2d')))
      await fetch(`/api/v1/admin/experiments/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(changes)
      })
    } catch (e) {}
  },

  deleteExperiment: async (id) => {
    const updated = get().experiments.filter(e => e.id !== id)
    set({
      experiments: updated,
      visualizations: updated.filter(e => e.type === '2d')
    })
    try {
      localStorage.setItem('visiora_experiments', JSON.stringify(updated))
      localStorage.setItem('visiora_2d_sims', JSON.stringify(updated.filter(e => e.type === '2d')))
      await fetch(`/api/v1/admin/experiments/${id}`, { method: 'DELETE' })
    } catch (e) {}
  },

  toggleExperimentActive: async (id) => {
    const target = get().experiments.find(e => e.id === id)
    if (!target) return
    await get().updateExperiment(id, { isActive: !target.isActive })
  },

  trackExperimentClick: (id) => {
    const updated = get().experiments.map(e => (e.id === id ? { ...e, clicks: (e.clicks || 0) + 1 } : e))
    set({
      experiments: updated,
      visualizations: updated.filter(e => e.type === '2d')
    })
    try {
      localStorage.setItem('visiora_experiments', JSON.stringify(updated))
      localStorage.setItem('visiora_2d_sims', JSON.stringify(updated.filter(e => e.type === '2d')))
      fetch(`/api/v1/admin/experiments/${id}/click`, { method: 'POST' }).catch(() => {})
    } catch (e) {}
  },

  // ── Backward-compatible 2D Visualizations CRUD wrappers ──
  addVisualization: async (item) => {
    return await get().addExperiment({ ...item, type: '2d' })
  },

  updateVisualization: async (id, changes) => {
    return await get().updateExperiment(id, changes)
  },

  deleteVisualization: async (id) => {
    return await get().deleteExperiment(id)
  },

  toggleVisualizationActive: async (id) => {
    return await get().toggleExperimentActive(id)
  },

  trackVisualizationClick: (id) => {
    return get().trackExperimentClick(id)
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
