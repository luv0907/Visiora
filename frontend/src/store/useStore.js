import { create } from 'zustand'

export const useStore = create((set, get) => ({
  scene: 'gravity', // 'gravity' | 'angular' | 'pendulum' | 'projectile' | 'collision'
  objective: 'Drop objects of different mass to observe equal acceleration.',
  tutorMessage: null,
  lastInteractionTime: Date.now(),
  keyEventsTriggered: 0,
  
  setScene: (scene, objective) => set({ scene, objective, keyEventsTriggered: 0 }),
  setTutorMessage: (tutorMessage) => set({ tutorMessage }),
  logInteraction: () => set({ lastInteractionTime: Date.now() }),
  triggerKeyEvent: () => set((state) => ({ keyEventsTriggered: state.keyEventsTriggered + 1, lastInteractionTime: Date.now() })),
  resetIdleTimer: () => set({ lastInteractionTime: Date.now() })
}))
