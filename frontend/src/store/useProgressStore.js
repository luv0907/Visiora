import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import * as api from '../api/client'

export const useProgressStore = create(
  persist(
    (set, get) => ({
      profile: null,
      isLoading: false,
      error: null,

      fetchProfile: async () => {
        set({ isLoading: true, error: null })
        try {
          const profile = await api.getProgress()
          set({ profile, isLoading: false })
        } catch (error) {
          set({ error: error.message, isLoading: false })
        }
      },

      updateProfile: async (data) => {
        set({ isLoading: true, error: null })
        try {
          const updatedProfile = await api.updateProfile(data)
          // Profile endpoint returns the updated user document, but getProgress
          // returns the full compound document (profile + mastery + history).
          // We patch the top-level profile fields locally to avoid a full refetch.
          set(state => ({
            profile: {
              ...state.profile,
              ...updatedProfile
            },
            isLoading: false
          }))
        } catch (error) {
          set({ error: error.message, isLoading: false })
          throw error
        }
      },

      updateClassCode: async (code) => {
        set({ isLoading: true, error: null })
        try {
          const profile = await api.updateClassCode(code)
          set({ profile, isLoading: false })
        } catch (error) {
          set({ error: error.message, isLoading: false })
        }
      },

      submitQuiz: async (conceptId, answers) => {
        set({ isLoading: true, error: null })
        try {
          // Backend grades, updates Firestore, and returns updated mastery in one call.
          // No follow-up fetchProfile() needed — avoids double-round-trip and
          // double-submit-on-retry risk.
          const result = await api.submitQuiz(conceptId, answers)
          
          // Patch mastery for this concept in-place from the submit response.
          set(state => {
            const prev = state.profile || {}
            const prevMastery = prev.mastery || {}
            return {
              isLoading: false,
              profile: {
                ...prev,
                mastery: {
                  ...prevMastery,
                  [conceptId]: { score: result.mastery ?? prevMastery[conceptId]?.score ?? 0 }
                }
              }
            }
          })
          
          return result
        } catch (error) {
          set({ error: error.message, isLoading: false })
          throw error
        }
      },
    }),
    {
      name: 'visiora-progress-storage',
    }
  )
)
