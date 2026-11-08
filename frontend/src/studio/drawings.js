/**
 * VISIORA Studio — small technical figures for experiment cards, drawn like a textbook
 * diagram: graphite lines on grid paper with one orange accent.
 */
export const INK = '#16181D'
export const ACCENT = '#E4532A'
export const SOFT = '#B9B6AC'
export const DATA = '#2051C8'

export function paper(c, W, H) {
  c.fillStyle = '#FBFAF7'
  c.fillRect(0, 0, W, H)
  c.strokeStyle = 'rgba(22,24,29,.05)'
  c.lineWidth = 1
  for (let x = 0; x < W; x += 20) { c.beginPath(); c.moveTo(x + 0.5, 0); c.lineTo(x + 0.5, H); c.stroke() }
  for (let y = 0; y < H; y += 20) { c.beginPath(); c.moveTo(0, y + 0.5); c.lineTo(W, y + 0.5); c.stroke() }
}

/** Draw the figure named `art` on a 520 × 240 canvas. */
export function drawFigure(cv, art) {
  const c = cv.getContext('2d'), W = cv.width, H = cv.height
  paper(c, W, H)
  c.lineWidth = 3; c.lineCap = 'round'; c.lineJoin = 'round'; c.strokeStyle = INK
  const dot = (x, y, r, col = INK) => { c.fillStyle = col; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill() }
  const ring = (x, y, r) => { c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.stroke() }
  const line = (pts, col = INK, dash) => {
    c.strokeStyle = col; c.setLineDash(dash || []); c.beginPath()
    pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)))
    c.stroke(); c.setLineDash([]); c.strokeStyle = INK
  }
  const arrow = (x1, y1, x2, y2, col = ACCENT) => {
    line([[x1, y1], [x2, y2]], col)
    const a = Math.atan2(y2 - y1, x2 - x1)
    c.fillStyle = col; c.beginPath(); c.moveTo(x2, y2)
    c.lineTo(x2 - 14 * Math.cos(a - 0.45), y2 - 14 * Math.sin(a - 0.45))
    c.lineTo(x2 - 14 * Math.cos(a + 0.45), y2 - 14 * Math.sin(a + 0.45)); c.fill()
  }
  const ground = y => { line([[40, y], [W - 40, y]]); for (let x = 50; x < W - 40; x += 18) line([[x, y], [x - 10, y + 10]], SOFT) }
  const box = (x, y, w, h, fill) => { if (fill) { c.fillStyle = fill; c.fillRect(x, y, w, h) } else c.strokeRect(x, y, w, h) }
  switch (art) {
    case 'car': ground(180); box(150, 130, 120, 40); ring(180, 178, 12); ring(240, 178, 12); arrow(290, 150, 400, 150); break
    case 'track': ground(170); line([[70, 160], [450, 160]]); box(110, 132, 70, 26, ACCENT); line([[250, 80], [250, 160]], DATA); line([[360, 80], [360, 160]], DATA); arrow(195, 145, 240, 145, INK); break
    case 'fall': ground(200); dot(210, 50, 14); dot(310, 50, 7, ACCENT); line([[210, 75], [210, 185]], SOFT, [6, 8]); line([[310, 70], [310, 185]], SOFT, [6, 8]); arrow(380, 60, 380, 160); break
    case 'planets': ground(200); dot(140, 60, 10); dot(260, 60, 10); dot(380, 60, 10, ACCENT); line([[140, 80], [140, 120]], SOFT, [6, 8]); line([[260, 80], [260, 160]], SOFT, [6, 8]); line([[380, 80], [380, 190]], SOFT, [6, 8]); break
    case 'arc': ground(200); line([[80, 200], [120, 140], [190, 80], [260, 60], [330, 80], [400, 140], [440, 200]], SOFT, [6, 8]); dot(330, 80, 10, ACCENT); arrow(330, 80, 390, 100); break
    case 'pendulum': line([[190, 30], [330, 30]]); line([[260, 30], [330, 160]]); line([[260, 30], [260, 175]], SOFT, [6, 8]); dot(330, 165, 16, ACCENT); c.strokeStyle = SOFT; c.beginPath(); c.arc(260, 30, 120, Math.PI / 2 - 0.55, Math.PI / 2 + 0.55); c.stroke(); break
    case 'ramp': ground(200); line([[90, 200], [430, 80], [430, 200]]); c.save(); c.translate(320, 118); c.rotate(-0.34); c.strokeStyle = INK; c.strokeRect(-30, -36, 60, 36); c.restore(); arrow(300, 110, 250, 128); break
    case 'carts': ground(190); box(110, 150, 100, 36); box(320, 150, 100, 36, ACCENT); arrow(220, 168, 290, 168, INK); break
    case 'box': ground(190); box(230, 110, 100, 78); arrow(110, 150, 215, 150); arrow(345, 178, 400, 178, SOFT); break
    case 'float': line([[100, 110], [420, 110]], '#7FA3E0'); box(100, 70, 320, 140); box(101, 110, 318, 99, 'rgba(32,81,200,.08)'); box(220, 90, 80, 48); break
    case 'lens': line([[60, 120], [460, 120]], SOFT); c.beginPath(); c.ellipse(260, 120, 14, 80, 0, 0, Math.PI * 2); c.stroke(); line([[110, 120], [110, 80]]); line([[110, 80], [260, 80], [410, 175]], ACCENT); line([[110, 80], [260, 120], [410, 175]], ACCENT); break
    case 'ray': box(0, 120, W, 120, 'rgba(32,81,200,.07)'); line([[0, 120], [W, 120]]); line([[260, 20], [260, 220]], SOFT, [6, 8]); line([[140, 20], [260, 120], [330, 225]], ACCENT); break
    case 'circuit': box(130, 60, 260, 130); box(120, 105, 22, 40, '#FBFAF7'); line([[118, 112], [144, 112]]); line([[124, 128], [138, 128]]); ring(390, 125, 16); box(240, 50, 50, 20, '#FBFAF7'); box(240, 52, 50, 16); break
    case 'meters': box(110, 70, 300, 120); box(100, 110, 22, 40, '#FBFAF7'); ring(200, 70, 22); ring(320, 70, 22); line([[200, 70], [212, 58]], ACCENT); line([[320, 70], [332, 60]], ACCENT); dot(410, 130, 9, ACCENT); break
    default: break
  }
}
