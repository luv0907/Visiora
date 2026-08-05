/**
 * VISIORA — UI Store
 * Manages all pure UI state: panels, tutor, toasts, knowledge graph, auth modal.
 */
import { create } from 'zustand'

export const useUIStore = create((set, get) => ({
  // ── Tutor ───────────────────────────────────────────────────
  tutorMessages: {},        // { sceneId: array of { id, text, type: 'reactive'|'proactive', ts } }
  tutorLoading:  false,
  voiceEnabled:  true,
  voiceSpeed:    1.0,
  proactiveTutor: true,
  currentAudio:  null,      // Audio object for TTS playback

  // ── Panels (desktop sidebar / mobile sheet) ─────────────────
  sidebarOpen:          true,   // variable controls sidebar
  formulaPanelOpen:     true,
  tutorPanelOpen:       false,
  knowledgeGraphOpen:   false,

  // ── Mobile bottom sheet ──────────────────────────────────────
  bottomSheetTab:  'variables', // 'variables' | 'formula' | 'graph' | 'tutor'
  bottomSheetOpen: false,

  // ── Auth modal ───────────────────────────────────────────────
  authModalOpen: false,
  authMode:      'login',   // 'login' | 'register'

  // ── Toast notifications ──────────────────────────────────────
  toasts: [],

  // ── Global Status ──────────────────────────────────────────────
  backendStatus: 'unknown', // 'unknown' | 'online' | 'offline'

  // ── Graph tab (2D view) ──────────────────────────────────────
  activeGraphTab: 0,

  // ── Actions ──────────────────────────────────────────────────

  addTutorMessage(sceneId, text, type = 'reactive') {
    const msg = { id: Date.now(), text, type, ts: new Date() }
    set(s => {
      const currentMessages = s.tutorMessages[sceneId] || []
      return {
        tutorMessages: {
          ...s.tutorMessages,
          [sceneId]: [...currentMessages.slice(-19), msg]
        }
      }
    })
    return msg.id
  },

  clearTutorMessages(sceneId) { 
    set(s => ({
      tutorMessages: {
        ...s.tutorMessages,
        [sceneId]: []
      }
    }))
  },

  setTutorLoading(v) { set({ tutorLoading: v }) },

  setVoiceEnabled(v) { set({ voiceEnabled: v }) },
  setVoiceSpeed(v) { set({ voiceSpeed: v }) },
  setProactiveTutor(v) { set({ proactiveTutor: v }) },

  stopCurrentAudio() {
    const audio = get().currentAudio
    if (audio) { try { audio.pause(); audio.currentTime = 0 } catch {} }
    set({ currentAudio: null })
  },

  setCurrentAudio(audio) {
    get().stopCurrentAudio()
    set({ currentAudio: audio })
  },

  setSidebarOpen(v) { set({ sidebarOpen: v }) },
  setFormulaPanelOpen(v) { set({ formulaPanelOpen: v }) },
  setTutorPanelOpen(v) { set({ tutorPanelOpen: v }) },
  setKnowledgeGraphOpen(v) { set({ knowledgeGraphOpen: v }) },

  setBottomSheetTab(tab) { set({ bottomSheetTab: tab, bottomSheetOpen: true }) },
  setBottomSheetOpen(v) { set({ bottomSheetOpen: v }) },

  openAuthModal(mode = 'login') { set({ authModalOpen: true, authMode: mode }) },
  closeAuthModal() { set({ authModalOpen: false }) },

  setActiveGraphTab(i) { set({ activeGraphTab: i }) },

  addToast(message, type = 'info', duration = 4000) {
    const id = Date.now()
    set(s => ({ toasts: [...s.toasts, { id, message, type }] }))
    setTimeout(() => {
      set(s => ({ toasts: s.toasts.filter(t => t.id !== id) }))
    }, duration)
  },

  removeToast(id) {
    set(s => ({ toasts: s.toasts.filter(t => t.id !== id) }))
  },

  setBackendStatus(status) { set({ backendStatus: status }) },
}))
