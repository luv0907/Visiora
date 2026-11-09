/**
 * VISIORA Studio — small sound effects made on the fly with Web Audio (no files to load).
 * click (switches), snap (placing a part), spark (a circuit closing), pop (a bulb blowing),
 * fizz (a fuse melting), and two loops that run while something is happening: a short-circuit
 * buzz and a doorbell ring. Muting is remembered in the browser.
 */

const MUTE_KEY = 'visiora.sound.muted'
let ctx = null
let muted = (() => { try { return localStorage.getItem(MUTE_KEY) === '1' } catch { return false } })()
const loops = {}

function audio() {
  if (muted || typeof window === 'undefined') return null
  const AC = window.AudioContext || window.webkitAudioContext
  if (!AC) return null
  if (!ctx) ctx = new AC()
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

export const isMuted = () => muted
export function setMuted(m) {
  muted = m
  try { localStorage.setItem(MUTE_KEY, m ? '1' : '0') } catch { /* private mode */ }
  if (m) for (const k of Object.keys(loops)) stopLoop(k)
}

function tone(freq, dur, { type = 'sine', gain = 0.15, slide = 0, delay = 0 } = {}) {
  const a = audio(); if (!a) return
  const t = a.currentTime + delay
  const o = a.createOscillator(), g = a.createGain()
  o.type = type; o.frequency.setValueAtTime(freq, t)
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t + dur)
  g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  o.connect(g).connect(a.destination); o.start(t); o.stop(t + dur + 0.02)
}

function noise(dur, { gain = 0.2, filter = 2000, q = 1, delay = 0 } = {}) {
  const a = audio(); if (!a) return
  const t = a.currentTime + delay
  const buf = a.createBuffer(1, Math.ceil(a.sampleRate * dur), a.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length)
  const src = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain()
  src.buffer = buf; f.type = 'bandpass'; f.frequency.value = filter; f.Q.value = q
  g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  src.connect(f).connect(g).connect(a.destination); src.start(t)
}

export const sfx = {
  click: () => { noise(0.03, { gain: 0.35, filter: 3500, q: 2 }); tone(1800, 0.04, { type: 'square', gain: 0.03 }) },
  snap: () => { tone(520, 0.06, { type: 'triangle', gain: 0.12 }); tone(780, 0.05, { type: 'triangle', gain: 0.08, delay: 0.03 }) },
  spark: () => { for (let i = 0; i < 4; i++) noise(0.02, { gain: 0.18, filter: 5000 + i * 900, q: 3, delay: i * 0.018 }) },
  pop: () => { noise(0.18, { gain: 0.5, filter: 900, q: 0.7 }); tone(140, 0.2, { type: 'sine', gain: 0.25, slide: -90 }) },
  fizz: () => { noise(0.5, { gain: 0.25, filter: 6000, q: 0.5 }); tone(300, 0.3, { type: 'sawtooth', gain: 0.04, slide: -200 }) },
  ding: () => { tone(880, 0.6, { gain: 0.12 }); tone(660, 0.8, { gain: 0.12, delay: 0.35 }) },
}

/** Start or stop a looping sound ('buzz' for a short circuit, 'ring' for the doorbell). */
export function loop(name, on) {
  if (on) startLoop(name)
  else stopLoop(name)
}

function startLoop(name) {
  if (loops[name]) return
  const a = audio(); if (!a) return
  const g = a.createGain(); g.gain.value = 0
  g.connect(a.destination)
  const nodes = []
  if (name === 'buzz') {
    const o = a.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 100
    const f = a.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 700
    o.connect(f).connect(g); o.start(); nodes.push(o)
    g.gain.linearRampToValueAtTime(0.05, a.currentTime + 0.1)
  } else if (name === 'ring') {
    // an electric bell: a clapper hitting the gong about 18 times a second
    const o = a.createOscillator(); o.type = 'triangle'; o.frequency.value = 1250
    const lfo = a.createOscillator(), depth = a.createGain()
    lfo.type = 'square'; lfo.frequency.value = 18; depth.gain.value = 0.05
    lfo.connect(depth).connect(g.gain); o.connect(g); o.start(); lfo.start(); nodes.push(o, lfo)
    g.gain.setValueAtTime(0.05, a.currentTime)
  }
  loops[name] = { g, nodes }
}

function stopLoop(name) {
  const l = loops[name]; if (!l || !ctx) return
  l.g.gain.cancelScheduledValues(ctx.currentTime)
  l.g.gain.setValueAtTime(l.g.gain.value, ctx.currentTime)
  l.g.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.08)
  for (const n of l.nodes) n.stop(ctx.currentTime + 0.1)
  delete loops[name]
}
