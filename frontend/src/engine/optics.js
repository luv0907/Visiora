/**
 * VISIORA — Exact reflection and refraction at a flat boundary (Class 10: Light).
 *   Reflection: angle of reflection = angle of incidence.
 *   Refraction (Snell's law): n₁·sin θ₁ = n₂·sin θ₂.
 *   Total internal reflection when n₁·sin θ₁ / n₂ > 1.
 * How much light reflects vs passes through comes from the Fresnel equations
 * for unpolarised light, so brightness on screen is physically right too.
 * Angles are in degrees from the normal.
 */

export const MEDIA = [
  { id: 'air', label: 'Air', n: 1.0 },
  { id: 'water', label: 'Water', n: 1.33 },
  { id: 'glass', label: 'Glass', n: 1.5 },
  { id: 'diamond', label: 'Diamond', n: 2.42 },
]

const D2R = Math.PI / 180

/** Critical angle for light going from n1 into n2, or null if none (n1 ≤ n2). */
export function criticalAngle(n1, n2) {
  if (n1 <= n2) return null
  return Math.asin(n2 / n1) / D2R
}

/**
 * Full result at the boundary.
 * Returns { theta1, theta2 (null if TIR), thetaR, R, T, tir, sin2 }.
 */
export function interact(theta1, n1, n2) {
  const s1 = Math.sin(theta1 * D2R)
  const c1 = Math.cos(theta1 * D2R)
  const sin2 = (n1 * s1) / n2
  if (sin2 > 1) return { theta1, theta2: null, thetaR: theta1, R: 1, T: 0, tir: true, sin2 }
  const c2 = Math.sqrt(1 - sin2 * sin2)
  const rs = (n1 * c1 - n2 * c2) / (n1 * c1 + n2 * c2)
  const rp = (n2 * c1 - n1 * c2) / (n2 * c1 + n1 * c2)
  const R = (rs * rs + rp * rp) / 2
  return { theta1, theta2: Math.asin(sin2) / D2R, thetaR: theta1, R, T: 1 - R, tir: false, sin2 }
}

/** Brewster angle (reflected light fully polarised, Rp = 0). */
export function brewsterAngle(n1, n2) {
  return Math.atan(n2 / n1) / D2R
}

export function insight(n1, n2, res, names) {
  if (res.tir) return `Total internal reflection! Going from ${names[0].toLowerCase()} into ${names[1].toLowerCase()} past ${criticalAngle(n1, n2).toFixed(1)}°, no light can get out — it all bounces back. This is how optical fibres work.`
  if (res.theta1 === 0) return 'Straight in along the normal: the light slows down or speeds up, but does not bend.'
  if (n1 === n2) return 'Same material on both sides, so the light goes straight through without bending.'
  if (n2 > n1) return `${names[1]} is optically denser (n = ${n2}), so light slows down and bends towards the normal: θ₂ < θ₁.`
  return `${names[1]} is optically rarer (n = ${n2}), so light speeds up and bends away from the normal: θ₂ > θ₁. Push the angle further…`
}
