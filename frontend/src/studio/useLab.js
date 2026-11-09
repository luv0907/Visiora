/**
 * VISIORA Studio — runs a breadboard live. The physics steps every animation frame while
 * anything is still changing (a filament heating, a needle swinging, a fan spinning up, a fuse
 * warming), and stops when everything has settled so an idle page costs nothing.
 * Parts that burn out, blow or melt are marked on the board, which plays their sound and smoke.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { activity, analyze, fail, newState, step, warp as warpBoard, withIds } from '../engine/board'

/**
 * initial: the starting board. opts.probes: multimeter probe dots (or null).
 * Returns { board, setBoard, an, sim, warp }: `an` is refreshed about 12 times a second for the
 * panel; `sim.current` holds the state and the latest analysis for the canvas and meter dials.
 */
export function useLab(initial, { probes = null, paused = false } = {}) {
  const [board, setRaw] = useState(() => withIds(typeof initial === 'function' ? initial() : initial))
  const sim = useRef(null)
  if (!sim.current) sim.current = { state: newState(), an: null, wake: 0 }
  // the latest analysis, tagged with the board it was made for
  const [snap, setSnap] = useState(() => ({ board, an: analyze(board, sim.current.state, { probes }) }))
  // a part placed a moment ago is not in the last frame's analysis yet: solve the new board now
  const fresh = useMemo(() => (snap.board === board ? null : analyze(board, sim.current.state, { probes })), [snap, board])
  const an = fresh ?? snap.an
  const live = useRef({ board, probes })
  live.current = { board, probes }
  const [wake, setWake] = useState(0)

  const setBoard = next => setRaw(prev => withIds(typeof next === 'function' ? next(prev) : next))

  useEffect(() => {
    if (paused) return undefined
    let id = 0, last = performance.now(), pushed = 0, quiet = 0
    const tick = now => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const { board: b, probes: pr } = live.current
      const { an: a, failed } = step(b, sim.current.state, dt, { probes: pr })
      sim.current.an = a
      if (failed.length) {
        const ids = new Set(failed.map(k => b[k]?.id))
        setRaw(cur => Object.fromEntries(Object.entries(cur).map(([k, p]) => [k, ids.has(p.id) ? fail(p) : p])))
      }
      if (now - pushed > 80) { setSnap({ board: b, an: a }); pushed = now }
      quiet = activity(b, sim.current.state, a) < 0.02 ? quiet + dt : 0
      if (quiet > 0.8) { setSnap({ board: b, an: a }); return } // settled: sleep until something changes
      id = requestAnimationFrame(tick)
    }
    id = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(id)
  }, [board, probes?.plus, probes?.minus, paused, wake])

  /** Leave it running for `seconds` (hours, for a torch) in one jump. */
  const warp = seconds => {
    const a = warpBoard(live.current.board, sim.current.state, seconds, { probes: live.current.probes })
    sim.current.an = a
    setSnap({ board: live.current.board, an: a })
    setWake(w => w + 1)
  }
  /** Fresh parts: forget every temperature, charge and needle. */
  const reset = next => { sim.current.state = newState(); setBoard(next); setWake(w => w + 1) }

  return { board, setBoard, an, sim, warp, reset }
}
