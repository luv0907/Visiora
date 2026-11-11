/**
 * VISIORA Studio — drawing the drop: the planet's sky and ground, a height ruler, a release
 * clamp at the top, two lanes with the dropped things, and optional strobe images of where each
 * one was every tenth of a second. Heights are drawn to scale; the objects are drawn a little
 * larger than life so a feather stays visible from 20 m.
 */
const MONO = '"IBM Plex Mono", monospace', SANS = '"Instrument Sans", sans-serif'
const INK = '#1B1340'

/** Where things go: metres → canvas pixels for a drop from `height` in a w × h canvas. */
export function fallView(w, h, height) {
  const top = 28, ground = h - 46
  const span = Math.max(height * 1.12, height + 0.6)
  const k = (ground - top) / span
  return { k, ground, top, Y: m => ground - m * k, lanes: [w * 0.4, w * 0.68], ruler: 46 }
}

function drawObject(ctx, kind, x, y, scale = 1) {
  ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale)
  ctx.lineJoin = 'round'; ctx.lineCap = 'round'
  if (kind === 'hammer') {
    ctx.fillStyle = '#8B5A2B'; ctx.fillRect(-2.5, -26, 5, 26)
    ctx.fillStyle = '#5B6270'; ctx.strokeStyle = '#2E333C'; ctx.lineWidth = 1.2
    ctx.beginPath(); ctx.roundRect(-11, -32, 22, 9, 2); ctx.fill(); ctx.stroke()
  } else if (kind === 'feather') {
    ctx.strokeStyle = '#6B5A3A'; ctx.lineWidth = 1.2
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(2, -16, -1, -34); ctx.stroke()
    ctx.fillStyle = 'rgba(240,232,214,.95)'; ctx.strokeStyle = '#B9A882'; ctx.lineWidth = 0.8
    ctx.beginPath(); ctx.moveTo(0, -4); ctx.bezierCurveTo(-11, -12, -9, -28, -1, -34); ctx.bezierCurveTo(8, -26, 10, -12, 1, -4); ctx.closePath(); ctx.fill(); ctx.stroke()
  } else if (kind === 'steel') {
    const g = ctx.createRadialGradient(-3, -11, 1, 0, -8, 9); g.addColorStop(0, '#F4F6F9'); g.addColorStop(0.5, '#9AA3AF'); g.addColorStop(1, '#4B5360')
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, -8, 8, 0, 2 * Math.PI); ctx.fill()
  } else if (kind === 'beach') {
    const cols = ['#E5484D', '#FFFFFF', '#2F80ED', '#FFFFFF', '#F2C94C', '#FFFFFF']
    for (let i = 0; i < 6; i++) { ctx.fillStyle = cols[i]; ctx.beginPath(); ctx.moveTo(0, -18); ctx.arc(0, -18, 18, (i * Math.PI) / 3, ((i + 1) * Math.PI) / 3); ctx.closePath(); ctx.fill() }
    ctx.strokeStyle = 'rgba(27,19,64,.35)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(0, -18, 18, 0, 2 * Math.PI); ctx.stroke()
  } else if (kind === 'balloon') {
    ctx.strokeStyle = '#6B6888'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(5, 10, -2, 22); ctx.stroke()
    ctx.fillStyle = '#FF6A8E'; ctx.beginPath(); ctx.ellipse(0, -15, 12, 15, 0, 0, 2 * Math.PI); ctx.fill()
    ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.beginPath(); ctx.ellipse(-4, -20, 3, 5, -0.4, 0, 2 * Math.PI); ctx.fill()
    ctx.fillStyle = '#D6336C'; ctx.beginPath(); ctx.moveTo(-2, 0); ctx.lineTo(2, 0); ctx.lineTo(0, -3); ctx.closePath(); ctx.fill()
  } else if (kind === 'paper') {
    ctx.fillStyle = '#F7F5EE'; ctx.strokeStyle = '#B5B0A2'; ctx.lineWidth = 1
    ctx.beginPath()
    for (let i = 0; i < 9; i++) { const a = (i / 9) * 2 * Math.PI, r = 7 + (i % 2 ? 1.6 : -0.8); ctx[i ? 'lineTo' : 'moveTo'](Math.cos(a) * r, -8 + Math.sin(a) * r) }
    ctx.closePath(); ctx.fill(); ctx.stroke()
  }
  ctx.restore()
}

/**
 * Paint a frame. world: the planet; drops: [{ kind, y, trail: [y…], landed, stuck }] (one per
 * lane); height: the release height; t: the clock; opts.strobe, opts.labels, opts.vacuum.
 */
export function paintFall(ctx, w, h, { world, drops, height, t, strobe = false, vacuum = false, gate = null }) {
  const v = fallView(w, h, height)
  const sky = ctx.createLinearGradient(0, 0, 0, v.ground)
  sky.addColorStop(0, world.sky[0]); sky.addColorStop(1, world.sky[1])
  ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h)
  if (world.id === 'moon') { ctx.fillStyle = 'rgba(255,255,255,.7)'; for (let i = 0; i < 40; i++) { const x = (i * 97) % w, y = (i * 53) % (v.ground - 20); ctx.fillRect(x, y, 1.2, 1.2) } }
  if (vacuum) { ctx.fillStyle = 'rgba(27,19,64,.06)'; ctx.fillRect(0, 0, w, v.ground) }
  // ground
  ctx.fillStyle = world.ground; ctx.fillRect(0, v.ground, w, h - v.ground)
  ctx.fillStyle = 'rgba(0,0,0,.12)'; ctx.fillRect(0, v.ground, w, 3)
  // height ruler
  ctx.fillStyle = 'rgba(255,255,255,.82)'; ctx.fillRect(0, 0, v.ruler, v.ground)
  ctx.strokeStyle = INK; ctx.fillStyle = INK; ctx.lineWidth = 1; ctx.font = `500 10px ${MONO}`; ctx.textAlign = 'right'; ctx.textBaseline = 'middle'
  const span = (v.ground - v.top) / v.k
  const step = span > 12 ? 2 : span > 5 ? 1 : span > 2 ? 0.5 : 0.2
  for (let m = 0; m <= span + 1e-9; m += step / 2) {
    const y = v.Y(m), major = Math.abs(m / step - Math.round(m / step)) < 1e-6
    ctx.beginPath(); ctx.moveTo(v.ruler, y); ctx.lineTo(v.ruler - (major ? 10 : 5), y); ctx.stroke()
    if (major) ctx.fillText(`${+m.toFixed(1)} m`, v.ruler - 12, y)
  }
  // the release bar at the top
  const relY = v.Y(height)
  const dark = world.id === 'moon' || world.id === 'x' // night-dark skies need light lines
  ctx.strokeStyle = dark ? 'rgba(255,255,255,.45)' : 'rgba(27,19,64,.4)'; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(v.ruler, relY); ctx.lineTo(w, relY); ctx.stroke(); ctx.setLineDash([])
  ctx.fillStyle = dark ? '#D6D3E3' : INK; ctx.fillRect(v.lanes[0] - 40, relY - 8, v.lanes[1] - v.lanes[0] + 80, 4)
  if (gate != null) {
    // a light gate just above the ground: a beam across the lane
    const gy = v.Y(gate)
    ctx.strokeStyle = 'rgba(229,72,77,.8)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(v.lanes[0] - 30, gy); ctx.lineTo(v.lanes[0] + 30, gy); ctx.stroke()
    ctx.fillStyle = INK; ctx.fillRect(v.lanes[0] - 36, gy - 6, 6, 12); ctx.fillRect(v.lanes[0] + 30, gy - 6, 6, 12)
  }
  drops.forEach((d, i) => {
    if (!d) return
    const x = v.lanes[i]
    if (strobe) for (const y of d.trail) { ctx.globalAlpha = dark ? 0.4 : 0.25; drawObject(ctx, d.kind, x, v.Y(y)); ctx.globalAlpha = 1 }
    drawObject(ctx, d.kind, x, v.Y(d.y))
    ctx.fillStyle = INK; ctx.font = `600 12px ${SANS}`; ctx.textAlign = 'center'; ctx.textBaseline = 'top'
    ctx.fillText(d.label, x, v.ground + 8)
    if (d.landed) { ctx.font = `600 12px ${MONO}`; ctx.fillText(`${d.landed.t.toFixed(2)} s`, x, v.ground + 24) }
    else if (d.stuck) { ctx.font = `600 12px ${MONO}`; ctx.fillText('rose!', x, v.ground + 24) }
  })
  // the clock
  ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.beginPath(); ctx.roundRect(w - 112, 10, 100, 34, 8); ctx.fill()
  ctx.fillStyle = INK; ctx.font = `600 18px ${MONO}`; ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; ctx.fillText(`${t.toFixed(2)} s`, w - 22, 27)
  return v
}
