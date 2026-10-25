/**
 * VISIORA — walking collision for the physics lab.
 *
 * The player is a circle of radius r on the floor plane (x, z). Obstacles are
 * axis-aligned rectangles exported from Blender (benches, walls, columns…).
 * Movement is resolved one axis at a time, so walking into a bench at an angle
 * slides along it instead of stopping dead.
 */

/** Convert Blender footprints (x, y) to the browser floor plane (x, z = −y). */
export function toFloorRects(rects) {
  return rects.map(r => ({ name: r.name, x0: r.x0, x1: r.x1, z0: -r.y1, z1: -r.y0 }))
}

function hits(x, z, r, rect) {
  const cx = Math.max(rect.x0, Math.min(x, rect.x1))
  const cz = Math.max(rect.z0, Math.min(z, rect.z1))
  const dx = x - cx
  const dz = z - cz
  return dx * dx + dz * dz < r * r
}

export function blocked(x, z, r, rects) {
  for (const rect of rects) if (hits(x, z, r, rect)) return true
  return false
}

/**
 * Move from (x, z) by (dx, dz), sliding along obstacles.
 * Large steps are split so a fast frame can't tunnel through a thin wall.
 */
export function moveWithCollisions(x, z, dx, dz, r, rects) {
  const dist = Math.hypot(dx, dz)
  const steps = Math.max(1, Math.ceil(dist / (r * 0.5)))
  const sx = dx / steps
  const sz = dz / steps
  for (let i = 0; i < steps; i++) {
    if (!blocked(x + sx, z, r, rects)) x += sx
    if (!blocked(x, z + sz, r, rects)) z += sz
  }
  return { x, z }
}
