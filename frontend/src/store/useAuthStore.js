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

/**
 * Maps a Firebase user to a local user object so the app works
 * even when the backend is unreachable.
 */
function firebaseUserToLocal(firebaseUser) {
  return {
    uid: firebaseUser.uid,
    email: firebaseUser.email,
    displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
    photoURL: firebaseUser.photoURL,
    emailVerified: firebaseUser.emailVerified,
  }
}

export const useAuthStore = create((set, get) => ({
  user: null,
  isAuthenticated: false,
  isJustSignedIn: false, // true only during the session where login occurred (to show class code step)
  isLoading: true, // start loading to check redirect result
  error: null,
  backendConnected: null, // null = unknown, true/false

  /**
   * Sync Firebase user to backend. If backend is down, fall back to Firebase user data.
   * This ensures auth NEVER fails just because the backend is unreachable.
   */
  _handleFirebaseUser: async (firebaseUser, isFreshLogin = false) => {
    if (!firebaseUser) {
      set({ user: null, isAuthenticated: false, isJustSignedIn: false, isLoading: false })
      return
    }
    try {
      const idToken = await firebaseUser.getIdToken()
      const res = await loginWithFirebase(idToken)
      set({
        user: res,
        isAuthenticated: true,
        isJustSignedIn: isFreshLogin,
        error: null,
        backendConnected: true,
      })
    } catch (error) {
      // Backend is down — still allow login using Firebase user data
      console.warn('Backend auth sync failed (backend may be offline), using Firebase user data:', error.message)
      set({
        user: firebaseUserToLocal(firebaseUser),
        isAuthenticated: true,
        isJustSignedIn: isFreshLogin,
        error: null,
        backendConnected: false,
      })
    } finally {
      try {
        const { useAdminStore } = await import('./useAdminStore')
        useAdminStore.getState().trackUserLogin({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
          provider: firebaseUser.providerData?.[0]?.providerId || 'google.com'
        })
      } catch (e) {}
      set({ isLoading: false })
    }
  },

  init: () => {
    set({ isLoading: true })
    
    // 1. Check for redirect result first (mobile Google sign-in return)
    getRedirectResult(auth)
      .then(async (credential) => {
        if (credential) {
          // Fresh login from redirect
          await get()._handleFirebaseUser(credential.user, true)
        }
      })
      .catch(err => {
        set({ error: err.message, isLoading: false })
      })

    // 2. Listen to ongoing changes (persisted sessions)
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      // Only run if not already authenticated by the redirect result above
      if (firebaseUser && !get().isAuthenticated) {
        // Not a fresh login, just restoring an existing session
        await get()._handleFirebaseUser(firebaseUser, false)
      } else if (!firebaseUser) {
        // If Firebase says no user, check if we have a persisted dev bypass token
        const devToken = localStorage.getItem('dev_token_bypass')
        if (devToken && import.meta.env.VITE_ENVIRONMENT === 'development') {
          try {
            const res = await loginWithFirebase(devToken)
            set({ user: res, isAuthenticated: true, isJustSignedIn: false, isLoading: false, error: null, backendConnected: true })
            return
          } catch (e) {
            // Backend offline in dev — use a mock dev user
            console.warn('Dev token backend sync failed, using mock dev user')
            set({
              user: { uid: 'dev_user', email: 'dev@visiora.local', displayName: 'Dev User', photoURL: null },
              isAuthenticated: true,
              isJustSignedIn: false,
              isLoading: false,
              error: null,
              backendConnected: false,
            })
            return
          }
        }
        set({ user: null, isAuthenticated: false, isJustSignedIn: false, isLoading: false })
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
      const errorMessage = err.code === 'auth/operation-not-allowed' 
        ? 'Email/Password authentication is not enabled in your Firebase Console.' 
        : err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential'
        ? 'Invalid email or password.'
        : err.message
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
      const errorMessage = err.code === 'auth/operation-not-allowed' 
        ? 'Email/Password authentication is not enabled in your Firebase Console.' 
        : err.code === 'auth/email-already-in-use'
        ? 'An account with this email already exists.'
        : err.code === 'auth/weak-password'
        ? 'Password should be at least 6 characters.'
        : err.message
      set({ error: errorMessage, isLoading: false })
      throw err
    }
  },

  signInWithGoogle: async () => {
    set({ isLoading: true, error: null })
    try {
      // Use redirect on mobile web, popup on desktop
      const isMobile = window.innerWidth <= 768 || /Mobi|Android/i.test(navigator.userAgent)
      if (isMobile) {
        await signInWithRedirect(auth, googleProvider)
      } else {
        const userCredential = await signInWithPopup(auth, googleProvider)
        await get()._handleFirebaseUser(userCredential.user, true)
      }
    } catch (err) {
      set({ error: err.message, isLoading: false })
      throw err
    }
  },

  signInDev: async () => {
    set({ isLoading: true, error: null })
    try {
      localStorage.setItem('dev_token_bypass', 'dev_token_bypass')
      try {
        const res = await loginWithFirebase('dev_token_bypass')
        set({ user: res, isAuthenticated: true, isJustSignedIn: true, error: null, isLoading: false, backendConnected: true })
      } catch (backendErr) {
        // Backend offline — use mock dev user
        console.warn('Dev mode: backend offline, using mock user')
        set({
          user: { uid: 'dev_user', email: 'dev@visiora.local', displayName: 'Dev User', photoURL: null },
          isAuthenticated: true,
          isJustSignedIn: true,
          error: null,
          isLoading: false,
          backendConnected: false,
        })
      }
    } catch (error) {
      console.error('Mock auth sync failed:', error)
      localStorage.removeItem('dev_token_bypass')
      set({ error: error.message, isLoading: false })
    }
  },

  logout: async () => {
    set({ isLoading: true })
    try {
      localStorage.removeItem('dev_token_bypass')
      await signOut(auth)
      await apiLogout().catch(() => {}) // best-effort
      set({ user: null, isAuthenticated: false, isJustSignedIn: false, error: null, backendConnected: null })
    } finally {
      set({ isLoading: false })
    }
  },
  
  clearError: () => set({ error: null }),
  
  clearJustSignedIn: () => set({ isJustSignedIn: false })
}))
