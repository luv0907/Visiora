/** View math for the Graph Board plane: view = { cx, cy, sx, sy }. */

export function visibleRange(view, size) {
  const hw = size.w / 2 / view.sx
  const hh = size.h / 2 / view.sy
  return { x0: view.cx - hw, x1: view.cx + hw, y0: view.cy - hh, y1: view.cy + hh }
}

export function zoomAt(view, [px, py], k, size) {
  const sx = clampScale(view.sx * k)
  const sy = clampScale(view.sy * (sx / view.sx))
  const wx = view.cx + (px - size.w / 2) / view.sx
  const wy = view.cy - (py - size.h / 2) / view.sy
  return { cx: wx - (px - size.w / 2) / sx, cy: wy + (py - size.h / 2) / sy, sx, sy }
}

const clampScale = s => Math.min(1e6, Math.max(1e-4, s))
