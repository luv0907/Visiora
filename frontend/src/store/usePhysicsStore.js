/**
 * VISIORA — Physics Store (Source of Truth for all physics state)
 * 
 * Manages:
 * - Active scene + variable values (persisted to localStorage)
 * - Live formula state (computed by Formula Engine, never from Rapier)
 * - Simulation controls (play/pause/reset/slow-mo)
 * - View mode (3D / 2D / split)
 */

import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { SCENE_VARIABLES, SCENE_META } from '../config/physics'
import { computeFormulaState } from '../engine/formulaEngine'

// Build default variable values from scene definitions
function buildDefaults() {
  const defaults = {}
  for (const [sceneId, vars] of Object.entries(SCENE_VARIABLES)) {
    defaults[sceneId] = {}
    for (const v of vars) {
      defaults[sceneId][v.name] = v.default
    }
  }
  return defaults
}

// Hydrate from localStorage if available
function hydrateState() {
  try {
    const raw = localStorage.getItem('visiora_physics_state')
    if (!raw) return null
    const parsed = JSON.parse(raw)
    // Validate structure before trusting it
    if (parsed.activeScene && parsed.variables) return parsed
  } catch { /* ignore */ }
  return null
}

const defaultVars = buildDefaults()
const hydrated = hydrateState()

export const usePhysicsStore = create(
  subscribeWithSelector((set, get) => ({
    // ── Scene ──────────────────────────────────────────────────
    activeScene: hydrated?.activeScene ?? 'gravity',
    sceneMeta: SCENE_META,

    // ── Variables ──────────────────────────────────────────────
    variables: hydrated?.variables ?? defaultVars,

    // ── Computed formula state (recomputed on variable change) ──
    formulaState: null,

    // ── Simulation control ──────────────────────────────────────
    isPlaying:      false,
    isPaused:       false,
    simSpeed:       1.0,    // 1x = realtime, 0.25x = slow-mo
    simTime:        0,      // elapsed sim time in seconds
    simKey:         0,      // increment to force scene remount/reset

    // ── View mode ───────────────────────────────────────────────
    viewMode: hydrated?.viewMode ?? '3d', // '3d' | '2d' | 'split'

    // ────────────────── ACTIONS ──────────────────────────────────

    setScene(sceneId) {
      const state = get()
      // Allow 'create' even though it has no SCENE_VARIABLES
      if (sceneId !== 'create' && !SCENE_VARIABLES[sceneId]) return
      
      const newFormula = sceneId === 'create' ? null : computeFormulaState(sceneId, state.variables[sceneId])
      set({
        activeScene: sceneId,
        formulaState: newFormula,
        isPlaying: false,
        isPaused: false,
        simTime: 0,
        simKey: state.simKey + 1,
      })
      get()._persist()
    },

    setVariable(varName, rawValue) {
      const { activeScene, variables } = get()
      // Clamp to limits defined in SCENE_VARIABLES
      const varDef = SCENE_VARIABLES[activeScene]?.find(v => v.name === varName)
      let value = parseFloat(rawValue)
      if (isNaN(value)) return
      if (varDef) {
        value = Math.max(varDef.min, Math.min(varDef.max, value))
      }

      const updatedSceneVars = { ...variables[activeScene], [varName]: value }
      const updatedVars = { ...variables, [activeScene]: updatedSceneVars }
      const newFormula = computeFormulaState(activeScene, updatedSceneVars)

      set({
        variables: updatedVars,
        formulaState: newFormula,
      })
      get()._persist()
    },

    setSimTime(time) {
      const maxT = get().formulaState?.values?.T ?? 10
      const clampedTime = Math.max(0, Math.min(maxT, parseFloat(time) || 0))
      set({ simTime: clampedTime })
    },

    /** Force-recompute formula (call once on scene mount) */
    recomputeFormula() {
      const { activeScene, variables } = get()
      const newFormula = computeFormulaState(activeScene, variables[activeScene])
      set({ formulaState: newFormula })
    },

    // ── Simulation Controls ─────────────────────────────────────
    play() {
      set({ isPlaying: true, isPaused: false })
    },

    pause() {
      set({ isPlaying: false, isPaused: true })
    },

    resume() {
      set({ isPlaying: true, isPaused: false })
    },

    reset() {
      const state = get()
      set({
        isPlaying: false,
        isPaused: false,
        simTime: 0,
        simKey: state.simKey + 1,
      })
    },

    stepFrame() {
      // Advance by one fixed step (for frame-by-frame)
      set(s => ({ simTime: s.simTime + (1 / 60) }))
    },

    setSimSpeed(speed) {
      set({ simSpeed: Math.max(0.1, Math.min(4.0, speed)) })
    },

    tickSimTime(dt) {
      set(s => ({ simTime: s.simTime + dt * s.simSpeed }))
    },

    // ── View Mode ───────────────────────────────────────────────
    setViewMode(mode) {
      set({ viewMode: mode })
      get()._persist()
    },

    // ── Internal: Persist to localStorage ──────────────────────
    _persist() {
      const { activeScene, variables, viewMode } = get()
      try {
        localStorage.setItem('visiora_physics_state', JSON.stringify({
          activeScene, variables, viewMode
        }))
      } catch { /* quota exceeded etc */ }
    },
  }))
)

// Initialize formula state on load
const initialStore = usePhysicsStore.getState()
initialStore.recomputeFormula()
