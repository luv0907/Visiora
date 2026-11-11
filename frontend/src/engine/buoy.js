/**
 * VISIORA — floating and sinking (Class 9: Gravitation · thrust, pressure and buoyancy).
 * A cube of side L in a tank of liquid (surface at y = 0, y up, metres; y is the cube's bottom).
 *   weight     −ρ_object·L³·g
 *   buoyancy   +ρ_liquid·L²·s·g          s = how deep it is in (0…L): Archimedes
 *   drag       −(½ρCdA·v|v| + 3πηL·v)·s/L  pushing liquid aside, and the liquid's own stickiness
 *   waves      a floating cube bobbing at the surface makes ripples that carry energy away
 *   inertia    m + ½·ρ_liquid·L²·s        the liquid it pushes has to move too
 * A floating cube settles with ρ_object/ρ_liquid of it under the surface. On the tank floor it
 * stops with a soft bump. 1 ms RK4 steps.
 * Also a spring balance: the cube hangs from a spring whose top is lowered into the liquid, and
 * the balance reads the spring's pull, swinging and settling as it would on a real bench.
 */
export const STEP = 0.001
export const G = 9.81

/** Liquids: density (kg/m³), viscosity (Pa·s), colour. */
export const LIQUIDS = {
  water: { label: 'Water', rho: 1000, eta: 0.001, colour: 'rgba(90,160,230,.35)' },
  salt: { label: 'Very salty water', rho: 1100, eta: 0.0013, colour: 'rgba(110,175,220,.4)' },
  oil: { label: 'Cooking oil', rho: 920, eta: 0.06, colour: 'rgba(230,190,60,.4)' },
  honey: { label: 'Honey', rho: 1420, eta: 5, colour: 'rgba(214,140,30,.6)' },
  mercury: { label: 'Mercury', rho: 13534, eta: 0.0015, colour: 'rgba(170,175,185,.85)' },
}

/** Solids: density (kg/m³), colour. */
export const SOLIDS = {
  cork: { label: 'Cork', rho: 240, colour: '#C49A6C' },
  wood: { label: 'Pine wood', rho: 500, colour: '#D9B26F' },
  ice: { label: 'Ice', rho: 917, colour: '#E6F4FA' },
  plastic: { label: 'Plastic (PE)', rho: 950, colour: '#F1F1F1' },
  aluminium: { label: 'Aluminium', rho: 2700, colour: '#B9C0C9' },
  steel: { label: 'Steel', rho: 7850, colour: '#7D8590' },
  gold: { label: 'Gold', rho: 19300, colour: '#E2B33C' },
}

const CD = 1.05 // a cube moving face first
const WAVE_DAMPING = 0.12 // fraction of critical damping lost to ripples while floating

/** The forces on a cube at height y (bottom face) moving at v: { net, mass, buoy, sub }. */
export function forces(solid, liquid, L, y, v) {
  const s = Math.max(0, Math.min(L, -y)) // how deep it is in
  const m = solid.rho * L ** 3
  const buoy = liquid.rho * L * L * s * G
  let net = -m * G + buoy
  if (s > 0) {
    net += -(0.5 * liquid.rho * CD * L * L * v * Math.abs(v) + 3 * Math.PI * liquid.eta * L * v) * (s / L)
    if (s < L) { // floating at the surface: ripples
      const k = liquid.rho * G * L * L, mEff = m + 0.5 * liquid.rho * L * L * s
      net += -2 * WAVE_DAMPING * Math.sqrt(k * mEff) * v
    }
  }
  return { net, mass: m + 0.5 * liquid.rho * L * L * s, buoy, sub: s / L, weight: m * G }
}

export function placeBlock(solid, liquid, { L = 0.05, y = 0.02, depth = 0.3 } = {}) {
  return { solid: SOLIDS[solid], liquid: LIQUIDS[liquid], L, y, v: 0, t: 0, depth, onFloor: false, rest: false }
}

/** Advance a free block by dt. Mutates and returns it. */
export function stepBlock(s, dt) {
  let left = dt
  const a = (y, v) => { const f = forces(s.solid, s.liquid, s.L, y, v); return f.net / f.mass }
  while (left > 1e-12) {
    const h = Math.min(STEP, left)
    const k1v = a(s.y, s.v), k1y = s.v
    const k2v = a(s.y + (h / 2) * k1y, s.v + (h / 2) * k1v), k2y = s.v + (h / 2) * k1v
    const k3v = a(s.y + (h / 2) * k2y, s.v + (h / 2) * k2v), k3y = s.v + (h / 2) * k2v
    const k4v = a(s.y + h * k3y, s.v + h * k3v), k4y = s.v + h * k3v
    s.v += (h / 6) * (k1v + 2 * k2v + 2 * k3v + k4v)
    s.y += (h / 6) * (k1y + 2 * k2y + 2 * k3y + k4y)
    s.onFloor = false
    if (s.y <= -s.depth) { s.y = -s.depth; s.v = s.v < 0 ? -0.2 * s.v : s.v; if (Math.abs(s.v) < 0.01) s.v = 0; s.onFloor = true }
    s.t += h; left -= h
  }
  // settled: barely moving, and either lying on the floor or floating with the forces balanced
  const balanced = Math.abs(forces(s.solid, s.liquid, s.L, s.y, 0).net) < 0.002 * s.solid.rho * s.L ** 3 * G
  s.rest = Math.abs(s.v) < 0.0005 && (s.onFloor || balanced)
  return s
}

/** Where a floating cube settles: the fraction under the surface (1 if it sinks). */
export const floatFraction = (solid, liquid) => Math.min(1, SOLIDS[solid].rho / LIQUIDS[liquid].rho)
export const sinks = (solid, liquid) => SOLIDS[solid].rho > LIQUIDS[liquid].rho

/** Let a block go and run until it has settled (or tMax). */
export function settleBlock(solid, liquid, opts = {}, tMax = 30) {
  const s = placeBlock(solid, liquid, opts)
  while (!s.rest && s.t < tMax) stepBlock(s, 0.01)
  return s
}

// ——— the spring balance ———
export const BALANCE = { k: 60, range: 5, leastCount: 0.05, airDamping: 0.1 } // N/m, N, N; damping includes the spring's own friction

/**
 * A cube hanging from a spring balance. `hook` is the height of the spring's top above the
 * surface; lowering it dips the cube in. The spring stretches by e: the balance reads k·e.
 */
export function hangBlock(solid, liquid, { L = 0.05, hook = 0.25, cord = 0.05 } = {}) {
  const m = SOLIDS[solid].rho * L ** 3
  const e = (m * G) / BALANCE.k
  return { solid: SOLIDS[solid], liquid: LIQUIDS[liquid], L, hook, cord, e, v: 0, t: 0 }
}
/** The cube's bottom face for a given stretch. */
export const hangY = (s, e = s.e) => s.hook - e - s.cord - s.L

export function stepHang(s, dt) {
  let left = dt
  const m = s.solid.rho * s.L ** 3
  const cAir = 2 * BALANCE.airDamping * Math.sqrt(BALANCE.k * m)
  const a = (e, v) => {
    // e grows downward: the object's downward velocity is v
    const f = forces(s.solid, s.liquid, s.L, hangY(s, e), -v)
    return (-f.net - BALANCE.k * e - cAir * v) / f.mass
  }
  while (left > 1e-12) {
    const h = Math.min(STEP, left)
    const k1v = a(s.e, s.v), k1e = s.v
    const k2v = a(s.e + (h / 2) * k1e, s.v + (h / 2) * k1v), k2e = s.v + (h / 2) * k1v
    const k3v = a(s.e + (h / 2) * k2e, s.v + (h / 2) * k2v), k3e = s.v + (h / 2) * k2v
    const k4v = a(s.e + h * k3e, s.v + h * k3v), k4e = s.v + h * k3v
    s.v += (h / 6) * (k1v + 2 * k2v + 2 * k3v + k4v)
    s.e += (h / 6) * (k1e + 2 * k2e + 2 * k3e + k4e)
    s.t += h; left -= h
  }
  return s
}
/** What the balance shows (N), and the reading to its least count. */
export const balanceForce = s => BALANCE.k * s.e
export const balanceReading = s => Math.round(balanceForce(s) / BALANCE.leastCount) * BALANCE.leastCount
/** The steady pull when hung at a given immersion: weight − buoyancy. */
export function steadyPull(solid, liquid, L, sub) {
  return SOLIDS[solid].rho * L ** 3 * G - LIQUIDS[liquid].rho * L * L * (sub * L) * G
}
