import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import * as api from '../api/client'

function calculateRealStreak(currentStreak, lastActiveDateStr) {
  const now = new Date()
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

  if (!lastActiveDateStr) {
    return { streak: 1, lastActiveDate: todayStr }
  }

  if (lastActiveDateStr === todayStr) {
    return { streak: Math.max(1, currentStreak || 1), lastActiveDate: todayStr }
  }

  // Calculate calendar day difference
  const [y1, m1, d1] = lastActiveDateStr.split('-').map(Number)
  const lastDate = new Date(Date.UTC(y1, m1 - 1, d1))
  const [y2, m2, d2] = todayStr.split('-').map(Number)
  const todayDate = new Date(Date.UTC(y2, m2 - 1, d2))
  
  const diffDays = Math.round((todayDate - lastDate) / (1000 * 60 * 60 * 24))

  if (diffDays === 1) {
    // Active yesterday! Streak increments by 1
    return { streak: (currentStreak || 1) + 1, lastActiveDate: todayStr }
  } else if (diffDays > 1) {
    // Missed a day! Resets to 1
    return { streak: 1, lastActiveDate: todayStr }
  } else {
    return { streak: Math.max(1, currentStreak || 1), lastActiveDate: todayStr }
  }
}

export const useProgressStore = create(
  persist(
    (set, get) => ({
      profile: {
        streak: 1,
        lastActiveDate: new Date().toISOString().slice(0, 10),
        mastery: {},
        grade: '11',
        name: 'Scholar'
      },
      isLoading: false,
      error: null,

      // Recalculates real streak based on calendar days and updates state
      recordDailyActivity: () => {
        const currentProfile = get().profile || {}
        const { streak, lastActiveDate } = calculateRealStreak(
          currentProfile.streak,
          currentProfile.lastActiveDate
        )

        set(state => ({
          profile: {
            ...state.profile,
            streak,
            lastActiveDate
          }
        }))

        return streak
      },

      fetchProfile: async () => {
        set({ isLoading: true, error: null })
        try {
          const remoteProfile = await api.getProgress()
          const currentProfile = get().profile || {}
          
          // Compute real streak incorporating remote or local last activity
          const { streak, lastActiveDate } = calculateRealStreak(
            remoteProfile?.streak ?? currentProfile.streak,
            remoteProfile?.lastActiveDate ?? currentProfile.lastActiveDate
          )

          set({
            profile: {
              ...currentProfile,
              ...remoteProfile,
              streak,
              lastActiveDate
            },
            isLoading: false
          })
        } catch (error) {
          // If offline/backend unreachable, still compute real streak on local profile
          const currentProfile = get().profile || {}
          const { streak, lastActiveDate } = calculateRealStreak(
            currentProfile.streak,
            currentProfile.lastActiveDate
          )
          set(state => ({
            profile: {
              ...state.profile,
              streak,
              lastActiveDate
            },
            error: error.message,
            isLoading: false
          }))
        }
      },

      updateProfile: async (data) => {
        set({ isLoading: true, error: null })
        try {
          const updatedProfile = await api.updateProfile(data)
          set(state => ({
            profile: {
              ...state.profile,
              ...updatedProfile
            },
            isLoading: false
          }))
        } catch (error) {
          // Update local profile directly if backend fails
          set(state => ({
            profile: {
              ...state.profile,
              ...data
            },
            isLoading: false
          }))
        }
      },

      updateClassCode: async (code) => {
        set({ isLoading: true, error: null })
        try {
          const profile = await api.updateClassCode(code)
          set({ profile, isLoading: false })
        } catch (error) {
          set(state => ({
            profile: {
              ...state.profile,
              classCode: code
            },
            isLoading: false
          }))
        }
      },

      submitQuiz: async (conceptId, answers) => {
        set({ isLoading: true, error: null })
        try {
          // Record streak on quiz submission
          get().recordDailyActivity()
          const result = await api.submitQuiz(conceptId, answers)
          
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
