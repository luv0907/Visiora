/**
 * VISIORA Studio — running drops in real time (or slowed down) for the planets experiment.
 * The physics steps in 1 ms pieces inside engine/fall.js whatever the frame rate; the loop
 * stops when everything has settled, so an idle page does no work.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { dropObject, stepObject } from '../engine/fall'

const MARK = 0.1 // s between strobe images

/** The ceiling a rising balloon stops at: the top of what the scene shows. */
const ceilingFor = height => Math.max(height * 1.12, height + 0.6)

/** Run drops side by side; returns { sim, start, reset }. */
export function useDrops({ world, kinds, height, rate = 1 }) {
  const sim = useRef(null)
  const raf = useRef(0)
  const [, setTick] = useState(0)
  const make = useCallback(() => ({
    t: 0, running: false, done: false, next: MARK,
    drops: kinds.map(k => dropObject(k, height, { ceiling: ceilingFor(height) })),
    trails: kinds.map(() => []),
  }), [kinds.join(), height]) // eslint-disable-line react-hooks/exhaustive-deps
  if (!sim.current) sim.current = make()
  const reset = useCallback(() => { cancelAnimationFrame(raf.current); sim.current = make(); setTick(n => n + 1) }, [make])
  useEffect(() => { reset() }, [reset, world.g, world.rho])
  useEffect(() => () => cancelAnimationFrame(raf.current), [])
  const start = useCallback(() => {
    if (sim.current.done || sim.current.t > 0) sim.current = make()
    sim.current.running = true
    let last = performance.now()
    const frame = now => {
      const s = sim.current
      const dt = Math.min(0.05, (now - last) / 1000) * rate
      last = now
      for (const d of s.drops) stepObject(d, dt, world)
      s.t += dt
      while (s.t >= s.next) { s.drops.forEach((d, i) => { if (!d.rest) s.trails[i].push(d.y) }); s.next += MARK }
      if (s.drops.every(d => d.rest) || s.t > 90) { s.running = false; s.done = true }
      setTick(n => n + 1)
      if (s.running) raf.current = requestAnimationFrame(frame)
    }
    raf.current = requestAnimationFrame(frame)
    setTick(n => n + 1)
  }, [make, rate, world])
  return { sim: sim.current, start, reset }
}

