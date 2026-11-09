/**
 * VISIORA — the Drive game in Speed & acceleration: the student brakes the bus themself.
 * The bus cruises at a steady speed and decelerates at the road's grip only while the brake
 * is held. Each step is solved exactly (constant acceleration), so a hit or a stop is found
 * at the exact moment, whatever the frame rate.
 *   judge levels:    the cow is in view; stop as close to it as you can.
 *   surprise levels: the cow steps out at a random moment; your own reaction time is measured,
 *                    so stopping distance = thinking distance + braking distance.
 */

export const SURFACES = {
  dry: { label: 'Dry road', a: 7 },
  wet: { label: 'Wet road', a: 4 },
  gravel: { label: 'Gravel, loaded bus', a: 3 },
}

export const LEVELS = [
  { id: 'dry', title: 'Dry road', kind: 'judge', u: 15, surface: 'dry', cowAt: 60, roadM: 80,
    goal: 'The cow is standing on the road. Brake so the bus stops as close to it as you can without touching it.' },
  { id: 'stepout', title: 'Cow steps out', kind: 'surprise', u: 15, surface: 'dry', ahead: 35, roadM: 110,
    goal: 'Keep driving. The moment the cow steps onto the road, brake as fast as you can. Braking early does not count!' },
  { id: 'rain', title: 'Rainy road', kind: 'judge', u: 20, surface: 'wet', cowAt: 100, roadM: 120,
    goal: 'A wet road grips less, so the bus needs longer to stop. Stop close to the cow.' },
  { id: 'gravel', title: 'Loaded bus on gravel', kind: 'surprise', u: 15, surface: 'gravel', ahead: 60, roadM: 135,
    goal: 'A full bus on loose gravel brakes gently. React fast when the cow steps out.' },
]

/** Braking distance u² ÷ 2a for braking at a (positive) from speed u. */
export const brakingDistance = (u, a) => (u * u) / (2 * a)

/** A fresh run. For a surprise level the cow steps out 1.5–3 s after the start. */
export function newDrive(level, rand = Math.random) {
  const appearT = level.kind === 'surprise' ? 1.5 + 1.5 * rand() : 0
  const appearS = level.u * appearT
  return {
    t: 0, s: 0, v: level.u, a: 0,
    appearT, appearS,
    cowAt: level.kind === 'surprise' ? appearS + level.ahead : level.cowAt,
    pressT: null, brakeS: null, early: false,
    end: null,
  }
}

/** Advance a run by dt seconds with the brake held or not. Returns a new state. */
export function stepDrive(st, dt, held, level) {
  if (st.end || dt <= 0) return st
  const next = { ...st }
  if (held && next.pressT === null) {
    next.pressT = st.t
    next.brakeS = st.s
    next.early = level.kind === 'surprise' && st.t < st.appearT
  }
  const a = held && st.v > 0 ? -SURFACES[level.surface].a : 0
  // the brakes can only bring the bus to rest, never reverse it
  const h = a < 0 ? Math.min(dt, st.v / -a) : dt
  const s1 = st.s + st.v * h + 0.5 * a * h * h
  const d = st.cowAt - st.s
  if (s1 >= st.cowAt) {
    // exact moment the front reaches the cow: ½at² + vt − d = 0, stable root
    const th = (2 * d) / (st.v + Math.sqrt(Math.max(0, st.v * st.v + 2 * a * d)))
    next.t = st.t + th; next.s = st.cowAt; next.v = st.v + a * th; next.a = a
    next.end = { reason: 'hit', speed: next.v }
    return next
  }
  next.t = st.t + h; next.s = s1; next.v = Math.max(0, st.v + a * h); next.a = a
  if (next.v <= 1e-9) { next.v = 0; next.end = { reason: 'stopped', gap: st.cowAt - s1 } }
  else if (h < dt) next.t = st.t + dt
  return next
}

/** What happened, in numbers a student can check, plus 0–3 stars. */
export function driveResult(st, level) {
  if (!st.end) return null
  const reaction = level.kind === 'surprise' && st.pressT !== null && !st.early ? st.pressT - st.appearT : null
  const thinking = reaction === null ? null : level.u * reaction
  const braking = st.brakeS === null ? null : st.s - st.brakeS
  const gap = st.end.reason === 'stopped' ? st.end.gap : 0
  let stars = 0
  if (st.end.reason === 'stopped' && !st.early) {
    if (level.kind === 'judge') stars = gap <= 2 ? 3 : gap <= 5 ? 2 : 1
    else stars = reaction <= 0.6 ? 3 : reaction <= 0.9 ? 2 : 1
  }
  return { reason: st.end.reason, early: st.early, gap, reaction, thinking, braking, stars, hitSpeed: st.end.speed ?? 0 }
}
