import { create } from 'zustand'
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  onAuthStateChanged,
  signOut,
} from 'firebase/auth'
import { auth, googleProvider } from '../lib/firebase'
import { loginWithFirebase, logout as apiLogout } from '../api/client'
import { useProgressStore } from './useProgressStore'

/**
 * Maps a Firebase user to a local user object with Google profile avatar.
 */
function firebaseUserToLocal(firebaseUser) {
  return {
    uid: firebaseUser.uid,
    email: firebaseUser.email,
    displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Scholar',
    photoURL: firebaseUser.photoURL || null,
    emailVerified: firebaseUser.emailVerified,
    provider: firebaseUser.providerData?.[0]?.providerId || 'google.com'
  }
}

export const useAuthStore = create((set, get) => ({
  user: null,
  isAuthenticated: false,
  isJustSignedIn: false,
  isLoading: true,
  error: null,
  backendConnected: null,

  /**
   * Handle Firebase user state changes.
   * Authenticates the user immediately so there is zero delay for the user,
   * then updates daily activity streak and performs background sync.
   */
  _handleFirebaseUser: async (firebaseUser, isFreshLogin = false) => {
    if (!firebaseUser) {
      set({ user: null, isAuthenticated: false, isJustSignedIn: false, isLoading: false })
      return
    }

    const localUser = firebaseUserToLocal(firebaseUser)

    // 1. Immediately authenticate in frontend
    set({
      user: localUser,
      isAuthenticated: true,
      isJustSignedIn: isFreshLogin,
      error: null,
      isLoading: false,
    })

    // 2. Trigger real daily streak calculation
    try {
      useProgressStore.getState().recordDailyActivity()
    } catch (e) {}

    // 3. Track user login in admin store (audit log)
    try {
      const { useAdminStore } = await import('./useAdminStore')
      useAdminStore.getState().trackUserLogin({
        uid: localUser.uid,
        email: localUser.email,
        displayName: localUser.displayName,
        photoURL: localUser.photoURL,
        provider: localUser.provider
      })
    } catch (e) {}

    // 4. Background best-effort sync with backend API (non-blocking)
    try {
      const idToken = await firebaseUser.getIdToken()
      const res = await loginWithFirebase(idToken)
      if (res && typeof res === 'object') {
        set(state => ({
          user: {
            ...state.user,
            ...res,
            // Ensure Google photoURL is NEVER overwritten by backend
            photoURL: localUser.photoURL || res.photoURL
          },
          backendConnected: true
        }))
      }
    } catch (err) {
      // Backend not running or unreachable — completely normal in frontend-only / serverless setups
      set({ backendConnected: false })
    }
  },

  init: () => {
    set({ isLoading: true })
    
    // 1. Check for redirect result (mobile Google sign-in return)
    getRedirectResult(auth)
      .then(async (credential) => {
        if (credential?.user) {
          await get()._handleFirebaseUser(credential.user, true)
        }
      })
      .catch(err => {
        console.warn('Redirect auth result info:', err.message)
      })

    // 2. Check for stored scholar session
    const storedScholar = localStorage.getItem('visiora_scholar_user')
    if (storedScholar) {
      try {
        const parsed = JSON.parse(storedScholar)
        set({
          user: parsed,
          isAuthenticated: true,
          isJustSignedIn: false,
          isLoading: false,
          error: null
        })
        try {
          useProgressStore.getState().recordDailyActivity()
        } catch (e) {}
      } catch (e) {}
    }

    // 3. Listen to Firebase auth changes
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        await get()._handleFirebaseUser(firebaseUser, false)
      } else if (!localStorage.getItem('visiora_scholar_user')) {
        set({ user: null, isAuthenticated: false, isJustSignedIn: false, isLoading: false })
      } else {
        set({ isLoading: false })
      }
    })
    
    return unsubscribe
  },

  signIn: async (email, password) => {
    set({ isLoading: true, error: null })
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password)
      await get()._handleFirebaseUser(userCredential.user, true)
    } catch (err) {
      let errorMessage = err.message
      if (err.code === 'auth/operation-not-allowed') {
        errorMessage = 'Email/password is currently restricted. Please use Continue with Google or Scholar Access.'
      } else if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        errorMessage = 'Invalid email or password. You can also sign in with Google or Scholar Access.'
      }
      set({ error: errorMessage, isLoading: false })
      throw err
    }
  },

  signUp: async (email, password) => {
    set({ isLoading: true, error: null })
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password)
      await get()._handleFirebaseUser(userCredential.user, true)
    } catch (err) {
      let errorMessage = err.message
      if (err.code === 'auth/operation-not-allowed') {
        errorMessage = 'Email/password registration is restricted. Please use Continue with Google or Scholar Access.'
      } else if (err.code === 'auth/email-already-in-use') {
        errorMessage = 'An account with this email already exists. Please sign in.'
      } else if (err.code === 'auth/weak-password') {
        errorMessage = 'Password must be at least 6 characters.'
      }
      set({ error: errorMessage, isLoading: false })
      throw err
    }
  },

  signInWithGoogle: async () => {
    set({ isLoading: true, error: null })
    try {
      // Configure prompt for account selection
      googleProvider.setCustomParameters({ prompt: 'select_account' })
      const userCredential = await signInWithPopup(auth, googleProvider)
      if (userCredential?.user) {
        await get()._handleFirebaseUser(userCredential.user, true)
      }
    } catch (err) {
      console.warn('Google Popup sign-in error:', err)
      // If popup was blocked or mobile, try redirect fallback
      if (err.code === 'auth/popup-blocked' || err.code === 'auth/cancelled-popup-request') {
        try {
          await signInWithRedirect(auth, googleProvider)
          return
        } catch (redirectErr) {
          set({ error: redirectErr.message, isLoading: false })
          throw redirectErr
        }
      }
      
      let msg = err.message
      if (err.code === 'auth/unauthorized-domain') {
        msg = 'This domain is awaiting Firebase OAuth authorization. You can click "Instant Scholar Access" to enter immediately!'
      } else if (err.code === 'auth/popup-closed-by-user') {
        msg = 'Google Sign-In was cancelled.'
      }
      set({ error: msg, isLoading: false })
      throw err
    }
  },

  // Instant Scholar Access (Guest / Demo mode with full persistence)
  signInAsScholar: (customName = 'Physics Scholar', customEmail = 'scholar@visiora.edu') => {
    set({ isLoading: true, error: null })
    const scholarUser = {
      uid: `scholar_${Date.now()}`,
      email: customEmail,
      displayName: customName,
      photoURL: null,
      provider: 'scholar.visiora'
    }

    localStorage.setItem('visiora_scholar_user', JSON.stringify(scholarUser))
    set({
      user: scholarUser,
      isAuthenticated: true,
      isJustSignedIn: true,
      isLoading: false,
      error: null
    })

    try {
      useProgressStore.getState().recordDailyActivity()
    } catch (e) {}

    try {
      import('./useAdminStore').then(m => {
        m.useAdminStore.getState().trackUserLogin({
          uid: scholarUser.uid,
          email: scholarUser.email,
          displayName: scholarUser.displayName,
          photoURL: null,
          provider: 'Scholar Access'
        })
      })
    } catch (e) {}
  },

  signInDev: async () => {
    get().signInAsScholar('Research Fellow', 'fellow@visiora.edu')
  },

  logout: async () => {
    set({ isLoading: true })
    try {
      localStorage.removeItem('visiora_scholar_user')
      localStorage.removeItem('dev_token_bypass')
      await signOut(auth).catch(() => {})
      await apiLogout().catch(() => {})
      set({ user: null, isAuthenticated: false, isJustSignedIn: false, error: null, backendConnected: null })
    } finally {
      set({ isLoading: false })
    }
  },
  
  clearError: () => set({ error: null }),
  clearJustSignedIn: () => set({ isJustSignedIn: false })
}))
