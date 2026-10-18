/**
 * VISIORA — Pushing a box with friction (Class 9: Force and Laws of Motion).
 * Newton's second law with static and sliding friction:
 *   at rest:  stays put while |F| ≤ μs·m·g (friction cancels the push exactly)
 *   moving:   a = (F − μk·m·g·sign(v)) / m
 * The push can change at any moment, so the motion is stepped — but each step is
 * solved exactly (acceleration is constant within it), and the instant the box
 * stops is found exactly, so results don't depend on frame rate.
 */

export const G = 9.8

export const SURFACES = [
  { id: 'ice', label: 'Ice', mus: 0.1, muk: 0.05 },
  { id: 'wood', label: 'Wood', mus: 0.4, muk: 0.25 },
  { id: 'carpet', label: 'Carpet', mus: 0.8, muk: 0.5 },
  { id: 'none', label: 'No friction', mus: 0, muk: 0 },
]

/** All the forces on the box right now (newtons, + is to the right). */
export function forcesAt({ v }, F, m, surface) {
  const weight = m * G
  const normal = weight
  const maxStatic = surface.mus * normal
  const sliding = surface.muk * normal
  if (v === 0) {
    if (Math.abs(F) <= maxStatic) {
      return { applied: F, friction: -F, net: 0, a: 0, weight, normal, maxStatic, sliding, moving: false }
    }
    const friction = -Math.sign(F) * sliding
    return { applied: F, friction, net: F + friction, a: (F + friction) / m, weight, normal, maxStatic, sliding, moving: true }
  }
  const friction = -Math.sign(v) * sliding
  return { applied: F, friction, net: F + friction, a: (F + friction) / m, weight, normal, maxStatic, sliding, moving: true }
}

/**
 * Advance the state { t, x, v } by dt with a constant push F.
 * Returns the new state plus `events` (the exact moments the box stopped).
 */
export function step(state, dt, F, m, surface) {
  let { t, x, v } = state
  let left = dt
  const events = []
  for (let guard = 0; guard < 4 && left > 0; guard++) {
    const f = forcesAt({ v }, F, m, surface)
    if (!f.moving) {
      t += left
      left = 0
      break
    }
    const a = f.a
    const vEnd = v + a * left
    // Does friction bring the box to rest inside this step?
    if (v !== 0 && Math.sign(vEnd) !== Math.sign(v) && Math.sign(a) !== Math.sign(v)) {
      const t0 = -v / a
      x += v * t0 + 0.5 * a * t0 * t0
      t += t0
      left -= t0
      v = 0
      events.push({ t, x, v: 0 })
      continue
    }
    x += v * left + 0.5 * a * left * left
    v = vEnd
    t += left
    left = 0
  }
  if (Math.abs(v) < 1e-12) v = 0
  return { state: { t, x, v }, events }
}

export function insight(st, f, F, surface, m) {
  if (!f.moving && F === 0 && st.v === 0) return 'No push, no motion. Newton’s first law: a box at rest stays at rest unless a force acts on it.'
  if (!f.moving) return `Friction is holding on: it can grip with up to ${f.maxStatic.toFixed(1)} N, so it cancels your ${Math.abs(F)} N push exactly. Net force 0 → no motion.`
  if (Math.abs(f.a) < 1e-9) return 'Forces are balanced (net force 0), yet the box keeps sliding at a steady speed. That is Newton’s first law: no net force means no change in motion — not no motion!'
  if (F === 0 && surface.muk === 0) return 'No push and no friction: nothing changes its motion, so it slides on forever at the same speed.'
  if (F === 0) return `You let go, so only friction acts. It slows the box by ${(surface.muk * G).toFixed(2)} m/s every second until it stops.`
  if (Math.sign(f.a) === Math.sign(st.v || F)) return `Your push beats friction by ${Math.abs(f.net).toFixed(1)} N, so the box speeds up: a = F_net ÷ m = ${Math.abs(f.net).toFixed(1)} ÷ ${m} = ${Math.abs(f.a).toFixed(2)} m/s².`
  return 'Friction (and your push) point against the motion, so the box is slowing down.'
}
