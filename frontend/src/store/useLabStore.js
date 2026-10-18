import { useCallback, useMemo } from 'react'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * Which lab challenges each student has completed, saved on the device.
 * won: { [labId]: string[] of challenge ids }
 */
export const useLabStore = create(
  persist(
    set => ({
      won: {},
      addWon: (labId, ids) =>
        set(state => {
          const prev = state.won[labId] || []
          const next = [...new Set([...prev, ...ids])]
          return next.length === prev.length ? state : { won: { ...state.won, [labId]: next } }
        }),
    }),
    { name: 'visiora.labs.v1' }
  )
)

/**
 * Drop-in for `useState(() => new Set())` in a lab screen: returns [wonSet, setWon],
 * where setWon takes an updater (prev Set → new Set) and saves the result.
 */
export function useLabChallenges(labId) {
  const list = useLabStore(s => s.won[labId])
  const addWon = useLabStore(s => s.addWon)
  const won = useMemo(() => new Set(list || []), [list])
  const setWon = useCallback(
    updater => {
      const next = typeof updater === 'function' ? updater(new Set(useLabStore.getState().won[labId] || [])) : updater
      addWon(labId, [...next])
    },
    [labId, addWon]
  )
  return [won, setWon]
}
