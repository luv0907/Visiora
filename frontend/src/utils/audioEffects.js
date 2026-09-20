/**
 * VISIORA ATELIER — Procedural Web Audio Physics Sound Synthesizer
 * Zero-dependency, 100% client-side synthesized sound effects:
 * - Burner flame whoosh / combustion noise
 * - Hot metal sizzle / steam hiss in water
 * - Glass / metal contact clinks
 * - Ice cooling crystallization sound
 * - Precision mechanical clicks
 */

let audioCtx = null
let isMuted = false
let burnerGainNode = null
let burnerNoiseSource = null

function getAudioContext() {
  if (typeof window === 'undefined') return null
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext
    if (AudioContextClass) {
      audioCtx = new AudioContextClass()
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {})
  }
  return audioCtx
}

export function toggleAudioMute() {
  isMuted = !isMuted
  if (isMuted && burnerGainNode) {
    burnerGainNode.gain.setValueAtTime(0, audioCtx?.currentTime || 0)
  }
  return isMuted
}

export function isAudioMuted() {
  return isMuted
}

/**
 * Procedural Hot Metal Sizzle / Steam Hiss (e.g. Hot iron dropped into water)
 */
export function playSizzleSound(intensity = 1.0) {
  if (isMuted) return
  const ctx = getAudioContext()
  if (!ctx) return

  try {
    const bufferSize = ctx.sampleRate * 0.8
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1
    }

    const noise = ctx.createBufferSource()
    noise.buffer = buffer

    // Bandpass filter centered at 3000 Hz to simulate sizzling steam
    const filter = ctx.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.setValueAtTime(2800 + Math.random() * 600, ctx.currentTime)
    filter.Q.setValueAtTime(1.8, ctx.currentTime)

    const gain = ctx.createGain()
    const now = ctx.currentTime
    const peak = Math.min(0.35, 0.25 * intensity)
    gain.gain.setValueAtTime(peak, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.75)

    noise.connect(filter)
    filter.connect(gain)
    gain.connect(ctx.destination)

    noise.start(now)
    noise.stop(now + 0.8)
  } catch (e) {
    // Audio context safely caught
  }
}

/**
 * Procedural Glass / Metal Impact Clink (e.g. Placing block on bench or stand)
 */
export function playClinkSound(isGlass = false) {
  if (isMuted) return
  const ctx = getAudioContext()
  if (!ctx) return

  try {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    const now = ctx.currentTime

    // Resonant frequencies: higher harmonic for glass (~1600Hz), lower for iron (~520Hz)
    osc.type = isGlass ? 'sine' : 'triangle'
    osc.frequency.setValueAtTime(isGlass ? 1550 : 540, now)
    osc.frequency.exponentialRampToValueAtTime(isGlass ? 800 : 280, now + 0.12)

    gain.gain.setValueAtTime(isGlass ? 0.2 : 0.25, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start(now)
    osc.stop(now + 0.15)
  } catch (e) {}
}

/**
 * Procedural Continuous Burner Flame Rumble
 */
export function updateBurnerAudio(maxLever) {
  if (isMuted) {
    if (burnerGainNode && audioCtx) {
      burnerGainNode.gain.setValueAtTime(0, audioCtx.currentTime)
    }
    return
  }
  const ctx = getAudioContext()
  if (!ctx) return

  try {
    if (!burnerNoiseSource) {
      // Create loopable noise buffer
      const bufferSize = ctx.sampleRate * 2
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
      const data = buffer.getChannelData(0)
      let lastOut = 0.0
      // Brown/Pink noise filter approximation for flame rumble
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1
        data[i] = (lastOut + (0.02 * white)) / 1.02
        lastOut = data[i]
        data[i] *= 3.5 // Volume boost
      }

      burnerNoiseSource = ctx.createBufferSource()
      burnerNoiseSource.buffer = buffer
      burnerNoiseSource.loop = true

      const filter = ctx.createBiquadFilter()
      filter.type = 'lowpass'
      filter.frequency.setValueAtTime(320, ctx.currentTime)

      burnerGainNode = ctx.createGain()
      burnerGainNode.gain.setValueAtTime(0, ctx.currentTime)

      burnerNoiseSource.connect(filter)
      filter.connect(burnerGainNode)
      burnerGainNode.connect(ctx.destination)

      burnerNoiseSource.start(0)
    }

    if (burnerGainNode) {
      const targetGain = maxLever > 0.05 ? Math.min(0.2, maxLever * 0.18) : 0
      burnerGainNode.gain.setTargetAtTime(targetGain, ctx.currentTime, 0.08)
    }
  } catch (e) {}
}

/**
 * Mechanical UI Click
 */
export function playClickSound() {
  if (isMuted) return
  const ctx = getAudioContext()
  if (!ctx) return

  try {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    const now = ctx.currentTime

    osc.type = 'sine'
    osc.frequency.setValueAtTime(800, now)
    gain.gain.setValueAtTime(0.08, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start(now)
    osc.stop(now + 0.05)
  } catch (e) {}
}
