import { create } from 'zustand'

export const usePhysicsStore = create((set, get) => ({
  // ── Scene ──────────────────────────────────────────────────
  activeScene: 'buoyancy',
  
  // ── Variables (For LMS forms) ─────────────────────────────────────────
  variables: {
    buoyancy: { gravity: 9.81, objectVolume: 0.1 }
  },

  // ── Simulation control ──────────────────────────────────────
  isPlaying: false,
  simSpeed: 1.0,
  simKey: 0, // Used to trigger remount

  setScene: (sceneId) => set({ 
    activeScene: sceneId, 
    isPlaying: false,
    simKey: get().simKey + 1
  }),

  setVariable: (sceneId, varName, value) => {
    set((state) => ({
      variables: {
        ...state.variables,
        [sceneId]: {
          ...state.variables[sceneId],
          [varName]: value
        }
      }
    }))
  },

  setIsPlaying: (playing) => set({ isPlaying: playing }),
  setSimSpeed: (speed) => set({ simSpeed: speed }),
  setSimKey: (key) => set({ simKey: key, isPlaying: false }),
}))
