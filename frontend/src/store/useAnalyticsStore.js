/**
 * VISIORA — Analytics Store
 * Lightweight local event tracking. Events are stored in-memory and localStorage.
 * Structure designed for easy pipe-to-backend later without re-architecting.
 */
import { create } from 'zustand'

const SESSION_ID = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

export const useAnalyticsStore = create((set, get) => ({
  sessionId: SESSION_ID,
  events: [],
  sceneStartTime: null,
  sceneVariableChanges: {},  // { [sceneId]: count }
  sceneResets: {},           // { [sceneId]: count }
  sceneTimeSpent: {},        // { [sceneId]: ms }

  /** Call when a scene is entered */
  trackSceneEnter(sceneId) {
    set({
      sceneStartTime: Date.now(),
      sceneVariableChanges: { ...get().sceneVariableChanges, [sceneId]: 0 }
    })
    get()._pushEvent('scene_enter', { sceneId })
  },

  /** Call when a scene is left (or when scene changes) */
  trackSceneLeave(sceneId) {
    const { sceneStartTime, sceneTimeSpent } = get()
    if (!sceneStartTime) return
    const ms = Date.now() - sceneStartTime
    set({
      sceneTimeSpent: { ...sceneTimeSpent, [sceneId]: (sceneTimeSpent[sceneId] || 0) + ms },
      sceneStartTime: null,
    })
    get()._pushEvent('scene_leave', { sceneId, durationMs: ms })
  },

  trackVariableChange(sceneId, varName, value) {
    set(s => ({
      sceneVariableChanges: {
        ...s.sceneVariableChanges,
        [sceneId]: (s.sceneVariableChanges[sceneId] || 0) + 1
      }
    }))
    // Throttle — don't log every slider tick, just log on "settle"
    // Actual settle logic handled in VariableSlider via debounce
    get()._pushEvent('variable_change', { sceneId, varName, value })
  },

  trackReset(sceneId) {
    set(s => ({
      sceneResets: { ...s.sceneResets, [sceneId]: (s.sceneResets[sceneId] || 0) + 1 }
    }))
    get()._pushEvent('sim_reset', { sceneId })
  },

  trackTutorQuery(query, sceneId) {
    get()._pushEvent('tutor_query', { query: query.slice(0, 200), sceneId })
  },

  trackViewModeChange(mode) {
    get()._pushEvent('view_mode_change', { mode })
  },

  getSceneSummary(sceneId) {
    const { sceneTimeSpent, sceneVariableChanges, sceneResets } = get()
    return {
      timeSpentMs: sceneTimeSpent[sceneId] || 0,
      variableChanges: sceneVariableChanges[sceneId] || 0,
      resets: sceneResets[sceneId] || 0,
    }
  },

  _pushEvent(type, data) {
    const event = {
      id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      sessionId: SESSION_ID,
      type,
      data,
      ts: new Date().toISOString(),
    }
    set(s => {
      const events = [...s.events, event].slice(-200) // keep last 200 events
      // Persist to localStorage
      try {
        localStorage.setItem('visiora_analytics', JSON.stringify(events))
      } catch {}
      return { events }
    })
  },
}))
