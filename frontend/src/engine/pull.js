/**
 * VISIORA — pulling a block along a bench with a spring balance (Class 9: friction).
 * The hand walks steadily; the spring stretches, and its pull grows, while friction holds the
 * block still. Static friction can only grip up to μs·N, so the moment the pull passes that the
 * block slips. Sliding friction is smaller (μk·N), so the reading drops and settles there while
 * the block follows the hand at a steady speed. The bench is not perfectly even: μk wanders by
 * about ±3 % along it, so the pointer flickers a little, as a real one does.
 *   spring balance   k = 50 N/m (a 10 N balance with a 20 cm scale), read to 0.1 N
 *   a steady hand    once the block is going, the hand evens out the pull (like a damper,
 *                    c = 20 N·s/m, eased in over 0.2 s), so the block never sticks again
 * Steps are 1 ms (RK4); the moment the block slips or stops is found inside its step.
 */
export const G = 9.8
export const BALANCE = { k: 50, c: 20, leastCount: 0.1, max: 10 }
export const HAND = 0.05 // m/s
export const BENCH = { label: 'Wooden bench', mus: 0.45, muk: 0.32 }
const STEP = 0.001

/** How rough the bench is just here: μk wanders gently along it. */
export const mukAt = (surface, x) => surface.muk * (1 + 0.02 * Math.sin(x * 61) + 0.012 * Math.sin(x * 157 + 1.3))

export function makePull(m, surface = BENCH) {
  return { t: 0, m, surface, N: m * G, xh: 0, xb: 0, vb: 0, sliding: false, peak: 0, slippedAt: null }
}

/** What the balance reads: the spring's stretch × k (newtons). */
export const reading = s => BALANCE.k * (s.xh - s.xb)

function accel(s, xb, vb, t) {
  const ease = Math.min(1, (t - s.slippedAt) / 0.2)
  const pull = BALANCE.k * (s.xh - xb) + ease * BALANCE.c * (HAND - vb)
  return (pull - mukAt(s.surface, xb) * s.N * Math.sign(vb || 1)) / s.m
}

/** Advance by dt seconds. Mutates and returns the state. */
export function stepPull(s, dt) {
  let left = dt
  while (left > 1e-12) {
    const h = Math.min(STEP, left)
    if (!s.sliding) {
      // held still: the hand stretches the spring until the pull reaches the grip
      const grip = s.surface.mus * s.N
      const pull0 = BALANCE.k * (s.xh - s.xb)
      const pull1 = pull0 + BALANCE.k * HAND * h
      if (pull1 > grip) {
        const frac = Math.max(0, (grip - pull0) / (pull1 - pull0))
        s.xh += HAND * h * frac; s.t += h * frac; left -= h * frac
        s.sliding = true; s.slippedAt = s.t
        continue
      }
      s.xh += HAND * h; s.t += h; left -= h
    } else {
      // sliding: RK4 on the block, with the hand moving on steadily
      const x0 = s.xb, v0 = s.vb, xh0 = s.xh
      const f = (dtt, x, v) => { s.xh = xh0 + HAND * dtt; return [v, accel(s, x, v, s.t + dtt)] }
      const [k1x, k1v] = f(0, x0, v0)
      const [k2x, k2v] = f(h / 2, x0 + (h / 2) * k1x, v0 + (h / 2) * k1v)
      const [k3x, k3v] = f(h / 2, x0 + (h / 2) * k2x, v0 + (h / 2) * k2v)
      const [k4x, k4v] = f(h, x0 + h * k3x, v0 + h * k3v)
      s.xh = xh0 + HAND * h
      s.xb = x0 + (h / 6) * (k1x + 2 * k2x + 2 * k3x + k4x)
      s.vb = v0 + (h / 6) * (k1v + 2 * k2v + 2 * k3v + k4v)
      if (s.vb <= 0) { s.vb = 0; s.sliding = false } // friction never pushes it backwards
      s.t += h; left -= h
    }
    s.peak = Math.max(s.peak, reading(s))
  }
  return s
}

/** The pointer as you would read it: to the nearest 0.1 N. */
export const shown = s => Math.round(reading(s) / BALANCE.leastCount) * BALANCE.leastCount

/** Is it sliding steadily now (settled after the slip)? */
export const steady = s => s.sliding && s.t - s.slippedAt > 1.2 && Math.abs(s.vb - HAND) < 0.01

/** Pull for T seconds; returns the state. */
export function simulatePull(m, T = 6, surface = BENCH) {
  const s = makePull(m, surface)
  while (s.t < T) stepPull(s, 0.01)
  return s
}
