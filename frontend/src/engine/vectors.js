/**
 * VISIORA — 2D vector helpers for the Graph Board.
 * Angles are in degrees from +x: positive anticlockwise (above), negative clockwise
 * (below), in (-180, 180] — the way textbooks say "14° below the x-axis".
 */

export function magnitude(v) {
  return Math.hypot(v.x, v.y)
}

export function angleDeg(v) {
  if (v.x === 0 && v.y === 0) return 0
  return (Math.atan2(v.y, v.x) * 180) / Math.PI
}

export function fromPolar(mag, deg) {
  const r = (deg * Math.PI) / 180
  // Round away float noise so 10∠90° gives x = 0, not 6e-16.
  const clean = n => (Math.abs(n) < 1e-12 ? 0 : n)
  return { x: clean(mag * Math.cos(r)), y: clean(mag * Math.sin(r)) }
}

export function add(a, b) {
  return { x: a.x + b.x, y: a.y + b.y }
}

export function dot(a, b) {
  return a.x * b.x + a.y * b.y
}

/** Angle between two vectors in degrees, [0, 180]. */
export function angleBetween(a, b) {
  const m = magnitude(a) * magnitude(b)
  if (m === 0) return 0
  const c = Math.min(1, Math.max(-1, dot(a, b) / m))
  return (Math.acos(c) * 180) / Math.PI
}
