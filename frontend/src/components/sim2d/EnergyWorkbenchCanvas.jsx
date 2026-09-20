/**
 * VISIORA ATELIER — Thermal Energy Workbench v4.0
 *
 * PhET-Accurate Energy Chunk Physics:
 * - Energy chunks (E) are discrete packets of fixed energy (like PhET's model)
 * - Burner injects E chunks into objects on the stand at a rate proportional to lever position
 * - E chunks have Brownian jitter speed proportional to sqrt(T_kelvin) — hotter = faster
 * - When two objects touch, E chunks migrate from hot→cold across the contact boundary
 * - When water reaches 100°C and has been boiling for >5s, E chunks escape (float upward) 1-2 at a time
 * - Same escape mechanism for oil at 190°C (smoke point)
 * - Cold source (lever < 0) REMOVES E chunks from objects (cold absorbs energy)
 * - Multi-object submersion: E chunks migrate from block into liquid the moment of contact
 *
 * Child-Friendly Colorful UI:
 * - Bright, vibrant colors with rounded forms
 * - Clear glowing labels and temperature readouts
 * - Fun animated particles and effects
 * - Large beakers matching reference image with perspective cylinders
 */

import React, { useRef, useEffect, useCallback } from 'react'
import {
  playSizzleSound,
  playClinkSound,
  updateBurnerAudio,
  playClickSound
} from '../../utils/audioEffects'

const T_ROOM = 20.0
// Each E chunk represents this many joules (like PhET's model)
const JOULES_PER_CHUNK = 1000

export default function EnergyWorkbenchCanvas({
  showEnergySymbols = true,
  linkHeaters = false,
  isPaused = false,
  simSpeed = 1.0,
  onTelemetryUpdate
}) {
  const canvasRef = useRef(null)

  const stateRef = useRef({
    burner1: { x: 330, lever: 0, iceLevel: 0, prevSnapped: false },
    burner2: { x: 670, lever: 0, iceLevel: 0, prevSnapped: false },
    objects: {
      iron: {
        id: 'iron', name: 'Iron', emoji: '🔩', type: 'block',
        x: 195, y: 440, w: 70, h: 66, depth: 20,
        mass: 2.0, c: 450, density: 7870, volumeMl: 254,
        temp: T_ROOM,
        // Internal energy in joules (tracks with chunks)
        internalEnergy: 2.0 * 450 * (T_ROOM + 273.15),
        boilTimer: 0,
        submergedIn: null, onStand: null,
        color: '#94A3B8', topColor: '#CBD5E1', sideColor: '#64748B',
        wetTimer: 0
      },
      brick: {
        id: 'brick', name: 'Brick', emoji: '🧱', type: 'block',
        x: 500, y: 445, w: 82, h: 64, depth: 22,
        mass: 1.5, c: 840, density: 2000, volumeMl: 750,
        temp: T_ROOM,
        internalEnergy: 1.5 * 840 * (T_ROOM + 273.15),
        boilTimer: 0,
        submergedIn: null, onStand: null,
        color: '#D97706', topColor: '#FBBF24', sideColor: '#B45309',
        wetTimer: 0
      },
      water: {
        id: 'water', name: 'Water', type: 'beaker',
        x: 55, y: 290, w: 200, h: 240,
        baseVolumeMl: 500, currentVolumeMl: 500,
        mass: 0.5, c: 4184,
        temp: T_ROOM,
        internalEnergy: 0.5 * 4184 * (T_ROOM + 273.15),
        boilTimer: 0,
        boilEscapeTimer: 0,
        onStand: null, contents: [],
        color: 'rgba(147,210,255,0.72)',
        liquidGrad: ['rgba(224,242,254,0.6)', 'rgba(56,189,248,0.85)']
      },
      oil: {
        id: 'oil', name: 'Olive Oil', type: 'beaker',
        x: 745, y: 290, w: 200, h: 240,
        baseVolumeMl: 500, currentVolumeMl: 500,
        mass: 0.46, c: 1970,
        temp: T_ROOM,
        internalEnergy: 0.46 * 1970 * (T_ROOM + 273.15),
        boilTimer: 0,
        boilEscapeTimer: 0,
        onStand: null, contents: [],
        color: 'rgba(253,224,71,0.72)',
        liquidGrad: ['rgba(254,249,195,0.65)', 'rgba(234,179,8,0.9)']
      }
    },
    // Energy chunks — the core physics objects!
    chunks: [],
    // Thermometers
    thermometers: [
      { id: 'th_1', x: 230, y: 100, temp: T_ROOM, attachedTo: null }
    ],
    // Particles
    flameParticles: [],
    meltDroplets: [],
    steamParticles: [],
    sizzleBubbles: [],
    escapingChunks: [], // E chunks that have broken free and float upward
    draggingItem: null,
    sizzleCooldown: 0,
    time: 0
  })

  // ── Helper: Compute temp from internal energy ──
  const computeTemp = (obj) => {
    // T_celsius = (U / (mass * c)) - 273.15
    return (obj.internalEnergy / (obj.mass * obj.c)) - 273.15
  }

  // ── Helper: Sync obj.temp from internalEnergy ──
  const syncTemp = (obj) => {
    obj.temp = Math.max(-50, Math.min(500, computeTemp(obj)))
  }

  // ── Helper: Count chunks belonging to object ──
  const countChunks = (objectId) => {
    return stateRef.current.chunks.filter(c => c.parentId === objectId).length
  }

  // ── Helper: Target chunk count for a given temperature ──
  const targetChunkCount = (obj) => {
    // At room temp → base count; as temp rises, more chunks needed
    const excessEnergy = obj.internalEnergy - (obj.mass * obj.c * (T_ROOM + 273.15))
    return Math.max(2, Math.floor(2 + excessEnergy / JOULES_PER_CHUNK))
  }

  // ── Spawn an energy chunk inside an object ──
  const spawnChunk = (obj, fromBottom = false) => {
    const s = stateRef.current
    // Determine chunk hue based on object temperature
    let hue = 210 // default cool blue
    if (obj.temp > 100) hue = 30  // hot orange
    else if (obj.temp > 60) hue = 50  // warm yellow
    else if (obj.temp > 30) hue = 75  // warm green-yellow
    else hue = 200 // cool blue

    const chunk = {
      id: Math.random(),
      parentId: obj.id,
      // Position relative to parent
      rx: 14 + Math.random() * (obj.w - 28),
      ry: fromBottom ? obj.h - 14 : 14 + Math.random() * (obj.h - 28),
      // Velocity for Brownian motion
      vx: (Math.random() - 0.5) * 0.8,
      vy: fromBottom ? -0.6 : (Math.random() - 0.5) * 0.8,
      hue,
      scale: 1.0,
      alpha: 1.0
    }
    s.chunks.push(chunk)
    return chunk
  }

  // ── Remove one chunk from an object ──
  const removeChunkFrom = (objectId) => {
    const s = stateRef.current
    const idx = s.chunks.findIndex(c => c.parentId === objectId)
    if (idx !== -1) s.chunks.splice(idx, 1)
  }

  // ── Migrate one chunk between objects ──
  const migrateChunk = (fromId, toId) => {
    const s = stateRef.current
    const chunk = s.chunks.find(c => c.parentId === fromId)
    if (!chunk) return
    const toObj = s.objects[toId]
    if (!toObj) return
    chunk.parentId = toId
    chunk.rx = 14 + Math.random() * (toObj.w - 28)
    chunk.ry = 14 + Math.random() * (toObj.h - 28)
    chunk.vx = (Math.random() - 0.5) * 0.8
    chunk.vy = (Math.random() - 0.5) * 0.8
  }

  // ── Initialize energy chunk population ──
  const initChunks = useCallback(() => {
    const s = stateRef.current
    s.chunks = []
    Object.values(s.objects).forEach(obj => {
      const count = Math.max(2, Math.floor(4))
      for (let i = 0; i < count; i++) spawnChunk(obj)
    })
  }, [])

  useEffect(() => { initChunks() }, [initChunks])

  // ── Reset ──
  const resetWorkbench = useCallback(() => {
    playClickSound()
    const s = stateRef.current
    s.burner1.lever = 0; s.burner1.iceLevel = 0
    s.burner2.lever = 0; s.burner2.iceLevel = 0
    updateBurnerAudio(0)
    const objs = s.objects
    ;['iron', 'brick'].forEach(k => {
      objs[k].x = k === 'iron' ? 195 : 500
      objs[k].y = k === 'iron' ? 440 : 445
      objs[k].temp = T_ROOM
      objs[k].internalEnergy = objs[k].mass * objs[k].c * (T_ROOM + 273.15)
      objs[k].submergedIn = null; objs[k].onStand = null; objs[k].wetTimer = 0
    })
    ;['water', 'oil'].forEach(k => {
      objs[k].x = k === 'water' ? 55 : 745
      objs[k].y = 290
      objs[k].temp = T_ROOM
      objs[k].internalEnergy = objs[k].mass * objs[k].c * (T_ROOM + 273.15)
      objs[k].currentVolumeMl = objs[k].baseVolumeMl
      objs[k].onStand = null; objs[k].contents = []
      objs[k].boilTimer = 0; objs[k].boilEscapeTimer = 0
    })
    s.thermometers = [{ id: 'th_1', x: 230, y: 100, temp: T_ROOM, attachedTo: null }]
    s.flameParticles = []; s.meltDroplets = []; s.steamParticles = []
    s.sizzleBubbles = []; s.escapingChunks = []
    initChunks()
  }, [initChunks])

  useEffect(() => {
    window.__visiora_reset_workbench = resetWorkbench
    return () => { delete window.__visiora_reset_workbench }
  }, [resetWorkbench])

  // ── Real-time Archimedes fluid volume ──
  const getBeakerTotalVolume = (beaker, s) => {
    let totalDisp = 0
    ;['iron', 'brick'].forEach(k => {
      const b = s.objects[k]
      if (b.submergedIn === beaker.id) {
        totalDisp += b.volumeMl
      } else if (s.draggingItem?.id === k) {
        const bCX = b.x + b.w / 2
        if (bCX >= beaker.x && bCX <= beaker.x + beaker.w) {
          const approxSurface = beaker.y + beaker.h - (beaker.currentVolumeMl / 1000) * 145
          const bBottom = b.y + b.h
          if (bBottom > approxSurface && b.y < beaker.y + beaker.h) {
            const depth = Math.min(b.h, bBottom - approxSurface)
            totalDisp += b.volumeMl * Math.min(1, depth / b.h)
          }
        }
      }
    })
    return beaker.currentVolumeMl + totalDisp
  }

  // ── 60 FPS Physics Loop ──
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let animId

    const STAND1_X = 330, STAND2_X = 670, STAND_Y = 355

    let lastTime = performance.now()

    const step = (now) => {
      const dt = Math.min((now - lastTime) / 1000, 0.05) * simSpeed
      lastTime = now

      const s = stateRef.current
      const { burner1, burner2, objects, chunks } = s

      if (!isPaused) {
        s.time += dt
        if (s.sizzleCooldown > 0) s.sizzleCooldown -= dt

        // ── 1. Wet brick drying ──
        if (objects.brick.wetTimer > 0) objects.brick.wetTimer -= dt

        // ── 2. Ice level accumulation & gradual melt ──
        ;[burner1, burner2].forEach(b => {
          if (b.lever < -0.05) {
            b.iceLevel = Math.min(1.0, b.iceLevel + dt * 1.6)
          } else if (b.iceLevel > 0) {
            b.iceLevel = Math.max(0, b.iceLevel - dt * 0.2)
            if (Math.random() < 0.3) {
              s.meltDroplets.push({
                x: (b === burner1 ? STAND1_X : STAND2_X) + (Math.random() - 0.5) * 70,
                y: STAND_Y + 90, vy: 2 + Math.random() * 2, alpha: 0.85
              })
            }
          }
        })

        // ── 3. Burner heat/cool source → Energy Chunk injection/removal ──
        const applyBurner = (burner, standX, standId) => {
          const lever = burner.lever

          // Flame particle emission
          if (lever > 0.04) {
            const n = Math.ceil(lever * 5)
            for (let i = 0; i < n; i++) {
              s.flameParticles.push({
                x: standX + (Math.random() - 0.5) * 55,
                y: STAND_Y + 64 + Math.random() * 10,
                vx: (Math.random() - 0.5) * 1.8,
                vy: -Math.random() * 3.8 - 2.2,
                size: 5 + Math.random() * 8, alpha: 1,
                hue: Math.random() > 0.4 ? 205 + Math.random() * 25 : 32 + Math.random() * 22
              })
            }
          }

          // Energy transfer to objects on/near stand
          Object.values(objects).forEach(obj => {
            if (obj.submergedIn) return

            const cx = obj.x + obj.w / 2
            const cy = obj.y + obj.h / 2
            const dist = Math.hypot(cx - standX, cy - STAND_Y)

            let power = 0
            if (obj.onStand === standId) {
              // Direct conduction on stand
              power = lever * 2800
            } else if (lever > 0 && dist < 130 && cy < STAND_Y + 80) {
              // Convective plume proximity
              const dx = Math.abs(cx - standX)
              power = lever * 1200 * Math.exp(-dx / 55)
            }

            if (Math.abs(power) < 5) return

            const dU = power * dt  // Joules transferred
            obj.internalEnergy = Math.max(0, obj.internalEnergy + dU)
            syncTemp(obj)

            // ── ENERGY CHUNK INJECTION (heat) or REMOVAL (cool) ──
            if (showEnergySymbols) {
              const target = targetChunkCount(obj)
              const current = countChunks(obj.id)

              if (lever > 0 && current < target && Math.random() < lever * 0.25) {
                // Inject one chunk from bottom (looks like it comes from burner)
                const chunk = spawnChunk(obj, true)
                chunk.hue = 32 + Math.random() * 25  // hot orange hue
              } else if (lever < -0.05 && current > 1 && Math.random() < Math.abs(lever) * 0.25) {
                // Cold source absorbs one chunk
                removeChunkFrom(obj.id)
              }
            }
          })
        }

        applyBurner(burner1, STAND1_X, 1)
        applyBurner(burner2, STAND2_X, 2)

        // ── 4. Contact Calorimetry: blocks ↔ liquids ──
        ;['water', 'oil'].forEach(bKey => {
          const beaker = objects[bKey]
          const liquidSurfaceY = beaker.y + beaker.h - (beaker.currentVolumeMl / beaker.baseVolumeMl) * 150

          ;['iron', 'brick'].forEach(blockKey => {
            const block = objects[blockKey]
            const bCX = block.x + block.w / 2
            const bBottom = block.y + block.h

            const isSubmerged = block.submergedIn === beaker.id
            const isTouching = s.draggingItem?.id === blockKey &&
              bCX >= beaker.x && bCX <= beaker.x + beaker.w &&
              bBottom > liquidSurfaceY && block.y < beaker.y + beaker.h

            if (!isSubmerged && !isTouching) return

            // dQ/dt = k * A * ΔT  (Newton's law of cooling)
            const kContact = 200.0
            const tempDiff = block.temp - beaker.temp
            const dQ = kContact * tempDiff * dt

            // Transfer internal energy
            block.internalEnergy -= dQ
            beaker.internalEnergy += dQ
            syncTemp(block)
            syncTemp(beaker)

            // ── ENERGY CHUNK MIGRATION from hot → cold ──
            if (showEnergySymbols && Math.abs(tempDiff) > 2.5 && Math.random() < 0.2) {
              if (tempDiff > 0) {
                // Block is hotter → migrate one chunk from block to beaker
                migrateChunk(block.id, beaker.id)
              } else {
                // Beaker is hotter → migrate one chunk from beaker to block
                migrateChunk(beaker.id, block.id)
              }
            }

            // Sizzle bubbles + steam if hot iron enters cold water
            if (block.temp > 70 && beaker.id === 'water') {
              const sizzle = Math.min(1, (block.temp - 70) / 120)
              if (Math.random() < 0.7) {
                s.sizzleBubbles.push({
                  x: block.x + 6 + Math.random() * (block.w - 12),
                  y: Math.min(beaker.y + beaker.h - 8, bBottom - Math.random() * 24),
                  vx: (Math.random() - 0.5) * 2,
                  vy: -2 - Math.random() * 3,
                  size: 2 + Math.random() * 4, alpha: 0.9
                })
              }
              if (Math.random() < sizzle * 0.5) {
                s.steamParticles.push({
                  x: beaker.x + 20 + Math.random() * (beaker.w - 40),
                  y: liquidSurfaceY - 4,
                  vx: (Math.random() - 0.5) * 1.5,
                  vy: -2 - Math.random() * 3,
                  size: 10 + Math.random() * 16, alpha: 0.9
                })
              }
              if (s.sizzleCooldown <= 0 && block.temp > 90) {
                playSizzleSound(sizzle)
                s.sizzleCooldown = 0.5
              }
            }
          })
        })

        // ── 5. Water Boiling & E-Chunk Escape after >5s ──
        // Water boils at 100°C, oil "boils" (smokes) at 190°C
        ;['water', 'oil'].forEach(bKey => {
          const beaker = objects[bKey]
          const boilPoint = bKey === 'water' ? 100 : 190

          if (beaker.temp >= boilPoint - 0.5) {
            beaker.temp = boilPoint
            beaker.internalEnergy = beaker.mass * beaker.c * (boilPoint + 273.15)

            beaker.boilTimer = (beaker.boilTimer || 0) + dt

            // Steam/smoke emission
            if (Math.random() < 0.65) {
              s.steamParticles.push({
                x: beaker.x + 20 + Math.random() * (beaker.w - 40),
                y: beaker.y + 60,
                vx: (Math.random() - 0.5) * 1.5,
                vy: -2.2 - Math.random() * 2.8,
                size: 12 + Math.random() * 18, alpha: 0.85
              })
            }

            // After 5s, start releasing E chunks 1-2 at a time!
            if (beaker.boilTimer > 5 && showEnergySymbols) {
              beaker.boilEscapeTimer = (beaker.boilEscapeTimer || 0) + dt
              // Release a chunk every ~0.8s
              if (beaker.boilEscapeTimer > 0.8) {
                beaker.boilEscapeTimer = 0
                const chunkCount = countChunks(beaker.id)
                const toEscape = Math.min(2, chunkCount > 3 ? 2 : 1)
                for (let e = 0; e < toEscape; e++) {
                  const chunk = chunks.find(c => c.parentId === beaker.id)
                  if (chunk) {
                    // Remove from parent
                    chunk.parentId = null
                    chunk.hue = 200  // steam = cool blue
                    // Convert to escaping chunk with absolute position
                    const absX = beaker.x + chunk.rx
                    const absY = beaker.y + chunk.ry
                    s.escapingChunks.push({
                      id: chunk.id,
                      x: absX,
                      y: absY,
                      vx: (Math.random() - 0.5) * 1.5,
                      vy: -2.5 - Math.random() * 1.5,
                      alpha: 1.0,
                      hue: bKey === 'water' ? 190 : 45,
                      scale: 1.0
                    })
                    const idx = chunks.findIndex(c => c.id === chunk.id)
                    if (idx !== -1) chunks.splice(idx, 1)
                  }
                }
              }
            }

            // Evaporate liquid volume slowly
            const heatSource = [burner1, burner2].find(b => b.lever > 0.05)
            if (heatSource) {
              beaker.currentVolumeMl = Math.max(0, beaker.currentVolumeMl - 5 * heatSource.lever * dt)
            }

          } else {
            beaker.boilTimer = 0
            beaker.boilEscapeTimer = 0
          }
        })

        // ── 6. Ambient Cooling ──
        Object.values(objects).forEach(obj => {
          const coolRate = 0.008
          const T_k = obj.temp + 273.15
          const T_room_k = T_ROOM + 273.15
          if (Math.abs(obj.temp - T_ROOM) > 0.05) {
            const dU = -coolRate * (T_k - T_room_k) * (obj.mass * obj.c) * dt
            obj.internalEnergy = Math.max(obj.mass * obj.c * (T_ROOM - 15 + 273.15), obj.internalEnergy + dU)
            syncTemp(obj)
          }

          // Adjust chunk count to match temperature
          if (showEnergySymbols && Math.random() < 0.05) {
            const target = targetChunkCount(obj)
            const current = countChunks(obj.id)
            if (current < target && current < 18) spawnChunk(obj)
            else if (current > target && current > 2) removeChunkFrom(obj.id)
          }
        })

        // ── 7. Brownian Motion of E Chunks ──
        chunks.forEach(chunk => {
          const obj = objects[chunk.parentId]
          if (!obj) return

          const tK = Math.max(50, obj.temp + 273.15)
          // Speed proportional to sqrt(T) — the key PhET mechanic!
          const speed = Math.sqrt(tK) / 14

          // Update chunk hue based on current temperature
          if (obj.temp > 100) chunk.hue = 28 + Math.random() * 15
          else if (obj.temp > 60) chunk.hue = 48 + Math.random() * 12
          else if (obj.temp > 30) chunk.hue = 80 + Math.random() * 20
          else chunk.hue = 200 + Math.random() * 20

          chunk.rx += chunk.vx * speed
          chunk.ry += chunk.vy * speed

          // Bounce inside object bounds
          const pad = 13
          const maxRx = obj.w - 22, maxRy = obj.h - 22
          if (chunk.rx < pad) { chunk.rx = pad; chunk.vx = Math.abs(chunk.vx) }
          if (chunk.rx > maxRx) { chunk.rx = maxRx; chunk.vx = -Math.abs(chunk.vx) }
          if (chunk.ry < pad) { chunk.ry = pad; chunk.vy = Math.abs(chunk.vy) }
          if (chunk.ry > maxRy) { chunk.ry = maxRy; chunk.vy = -Math.abs(chunk.vy) }
        })

        // ── 8. Escaping Chunks (floating upward & fading) ──
        s.escapingChunks.forEach(ec => {
          ec.x += ec.vx
          ec.y += ec.vy
          ec.vy -= 0.03  // accelerate upward slightly
          ec.alpha -= 0.012
          ec.scale = Math.max(0.2, ec.scale - 0.008)
        })
        s.escapingChunks = s.escapingChunks.filter(ec => ec.alpha > 0.05)

        // ── 9. Particle Lifecycle ──
        s.flameParticles.forEach(p => {
          p.x += p.vx; p.y += p.vy; p.alpha -= 0.042; p.size *= 0.94
        })
        s.flameParticles = s.flameParticles.filter(p => p.alpha > 0.05)

        s.meltDroplets.forEach(d => { d.y += d.vy; d.alpha -= 0.03 })
        s.meltDroplets = s.meltDroplets.filter(d => d.alpha > 0.05)

        s.steamParticles.forEach(p => {
          p.x += p.vx; p.y += p.vy; p.size += 0.4; p.alpha -= 0.018
        })
        s.steamParticles = s.steamParticles.filter(p => p.alpha > 0.05)

        s.sizzleBubbles.forEach(b => { b.x += b.vx; b.y += b.vy; b.alpha -= 0.03 })
        s.sizzleBubbles = s.sizzleBubbles.filter(b => b.alpha > 0.05)

        // ── 10. Thermometer Sensor Reading ──
        s.thermometers.forEach(th => {
          const tipX = th.x
          const tipY = th.y + 132
          let target = T_ROOM
          let parent = null

          for (const k of ['iron', 'brick']) {
            const b = objects[k]
            if (tipX >= b.x && tipX <= b.x + b.w && tipY >= b.y && tipY <= b.y + b.h) {
              target = b.temp; parent = k; break
            }
          }
          if (!parent) {
            for (const k of ['water', 'oil']) {
              const bk = objects[k]
              if (tipX >= bk.x && tipX <= bk.x + bk.w && tipY >= bk.y + 30 && tipY <= bk.y + bk.h) {
                target = bk.temp; parent = k; break
              }
            }
          }
          if (!parent) {
            if (Math.abs(tipX - STAND1_X) < 60 && Math.abs(tipY - STAND_Y) < 45) {
              target = burner1.lever > 0 ? T_ROOM + burner1.lever * 260 : T_ROOM - burner1.iceLevel * 22
            } else if (Math.abs(tipX - STAND2_X) < 60 && Math.abs(tipY - STAND_Y) < 45) {
              target = burner2.lever > 0 ? T_ROOM + burner2.lever * 260 : T_ROOM - burner2.iceLevel * 22
            }
          }
          th.attachedTo = parent
          th.temp += (target - th.temp) * 0.2
        })

        // Telemetry
        if (onTelemetryUpdate) {
          onTelemetryUpdate({
            ironTemp: objects.iron.temp.toFixed(1),
            brickTemp: objects.brick.temp.toFixed(1),
            waterTemp: objects.water.temp.toFixed(1),
            oilTemp: objects.oil.temp.toFixed(1),
            burner1Power: (burner1.lever > 0 ? burner1.lever * 2800 : 0).toFixed(0),
            burner2Power: (burner2.lever > 0 ? burner2.lever * 2800 : 0).toFixed(0)
          })
        }
      }

      render(ctx, s)
      animId = requestAnimationFrame(step)
    }

    animId = requestAnimationFrame(step)
    return () => cancelAnimationFrame(animId)
  }, [isPaused, simSpeed, showEnergySymbols, linkHeaters, onTelemetryUpdate])

  // ════════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════════
  const render = (ctx, s) => {
    const W = 1000, H = 620
    const { burner1, burner2, objects, chunks } = s

    ctx.clearRect(0, 0, W, H)

    // ── BACKGROUND: Warm sunny lab for children ──
    const bgGrad = ctx.createLinearGradient(0, 0, 0, 520)
    bgGrad.addColorStop(0, '#FFFBF0')
    bgGrad.addColorStop(0.7, '#FFF3DC')
    bgGrad.addColorStop(1, '#F5E6C8')
    ctx.fillStyle = bgGrad
    ctx.fillRect(0, 0, W, 520)

    // ── BENCH (warm wood) ──
    const benchGrad = ctx.createLinearGradient(0, 520, 0, H)
    benchGrad.addColorStop(0, '#F0D9AE')
    benchGrad.addColorStop(0.3, '#E2C48A')
    benchGrad.addColorStop(1, '#C9A86C')
    ctx.fillStyle = benchGrad
    ctx.fillRect(0, 520, W, H - 520)

    // Wood grain
    ctx.strokeStyle = 'rgba(160, 110, 55, 0.14)'
    ctx.lineWidth = 1.3
    for (let wy = 535; wy < H; wy += 14) {
      ctx.beginPath(); ctx.moveTo(0, wy); ctx.lineTo(W, wy); ctx.stroke()
    }

    // ── Thermometer Rack ──
    renderThermometerRack(ctx, s)

    // ── Burner Systems ──
    renderBurnerSystem(ctx, burner1, STAND1_X, 'HEATER 1', s)
    renderBurnerSystem(ctx, burner2, STAND2_X, 'HEATER 2', s)

    // ── Contact Shadows ──
    renderContactShadows(ctx, objects)

    // ── FLAME PARTICLES ──
    s.flameParticles.forEach(p => {
      ctx.save()
      ctx.globalAlpha = p.alpha
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
      ctx.fillStyle = `hsl(${p.hue}, 100%, 60%)`
      ctx.fill()
      ctx.restore()
    })

    // ── MELT DROPLETS ──
    s.meltDroplets.forEach(d => {
      ctx.save(); ctx.globalAlpha = d.alpha
      ctx.beginPath(); ctx.arc(d.x, d.y, 3, 0, Math.PI * 2)
      ctx.fillStyle = '#BAE6FD'; ctx.fill(); ctx.restore()
    })

    // ── BEAKERS (render beaker back, then liquid, then submerged blocks, then front glass) ──
    renderBeaker(ctx, objects.water, objects, s)
    renderBeaker(ctx, objects.oil, objects, s)

    // ── DRY BLOCKS ON TOP ──
    if (!objects.iron.submergedIn) render3DBlock(ctx, objects.iron)
    if (!objects.brick.submergedIn) render3DBlock(ctx, objects.brick)

    // ── SIZZLE BUBBLES ──
    s.sizzleBubbles.forEach(b => {
      ctx.save(); ctx.globalAlpha = b.alpha
      ctx.beginPath(); ctx.arc(b.x, b.y, b.size, 0, Math.PI * 2)
      ctx.fillStyle = '#FFFFFF'; ctx.fill()
      ctx.strokeStyle = '#38BDF8'; ctx.lineWidth = 1; ctx.stroke()
      ctx.restore()
    })

    // ── STEAM CLOUDS ──
    s.steamParticles.forEach(p => {
      ctx.save(); ctx.globalAlpha = p.alpha
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
      ctx.fillStyle = '#FFFFFF'; ctx.fill(); ctx.restore()
    })

    // ── ENERGY CHUNKS inside objects ──
    if (showEnergySymbols) {
      renderEnergyChunks(ctx, s)
    }

    // ── ESCAPING ENERGY CHUNKS (float upward after boiling) ──
    if (showEnergySymbols) {
      s.escapingChunks.forEach(ec => {
        ctx.save()
        ctx.globalAlpha = ec.alpha
        ctx.translate(ec.x, ec.y)
        ctx.scale(ec.scale, ec.scale)
        drawEChunk(ctx, 0, 0, ec.hue)
        ctx.restore()
      })
    }

    // ── THERMOMETERS ──
    s.thermometers.forEach(th => renderThermometer(ctx, th, false))

    // ── LEGEND ──
    if (showEnergySymbols) renderLegend(ctx, W)
  }

  // ── Sub-Renderers ──

  const STAND1_X = 330, STAND2_X = 670, STAND_Y = 355

  const renderThermometerRack = (ctx, s) => {
    const rx = 30, ry = 22, rw = 170, rh = 36
    // Background panel with rounded rect
    ctx.fillStyle = '#C4B196'
    roundRect(ctx, rx, ry, rw, rh, 8)
    ctx.fill()
    ctx.strokeStyle = '#8E7B62'; ctx.lineWidth = 2
    roundRect(ctx, rx, ry, rw, rh, 8)
    ctx.stroke()

    ctx.fillStyle = '#C97006'
    ctx.fillRect(rx + 48, ry + rh, 9, 18)
    ctx.fillRect(rx + 113, ry + rh, 9, 18)

    ctx.font = 'bold 10px "Inter", system-ui, sans-serif'
    ctx.fillStyle = '#2C1810'
    ctx.fillText('🌡️ THERMOMETER DISPENSER', rx + 14, ry + 14)
    ctx.font = '8.5px "Inter", system-ui, sans-serif'
    ctx.fillStyle = '#6B4C2A'
    ctx.fillText('Drag out probes · Drop on rack to remove', rx + 14, ry + 27)

    const master = { x: rx + 85, y: ry + rh + 4, temp: T_ROOM }
    renderThermometer(ctx, master, true)
  }

  // Child-friendly colorful burner system
  const renderBurnerSystem = (ctx, burner, standX, label, s) => {
    const standW = 210

    // Stand legs
    ctx.strokeStyle = '#1C1C1E'; ctx.lineWidth = 5; ctx.lineCap = 'square'
    const legs = [
      [standX - standW / 2, standX - standW / 2],
      [standX + standW / 2, standX + standW / 2]
    ]
    legs.forEach(([lx]) => {
      ctx.beginPath(); ctx.moveTo(lx, STAND_Y); ctx.lineTo(lx, 520); ctx.stroke()
      // Rear legs
      ctx.beginPath()
      ctx.moveTo(lx + 16, STAND_Y + 6); ctx.lineTo(lx + 16, 520)
      ctx.strokeStyle = '#3C3C3E'; ctx.stroke()
      ctx.strokeStyle = '#1C1C1E'
    })

    // Stand horizontal rail
    ctx.beginPath()
    ctx.moveTo(standX - standW / 2, STAND_Y)
    ctx.lineTo(standX + standW / 2, STAND_Y)
    ctx.stroke()

    // ── FLAME (when heating) ──
    if (burner.lever > 0.04) {
      const fh = 28 + burner.lever * 58
      const baseY = STAND_Y + 68

      // Outer mantle
      ctx.save()
      ctx.beginPath()
      ctx.moveTo(standX - 30, baseY)
      ctx.quadraticCurveTo(standX - 35, baseY - fh * 0.65, standX, baseY - fh)
      ctx.quadraticCurveTo(standX + 35, baseY - fh * 0.65, standX + 30, baseY)
      ctx.closePath()
      const fg = ctx.createLinearGradient(standX, baseY, standX, baseY - fh)
      fg.addColorStop(0, 'rgba(6,182,212,0.45)')
      fg.addColorStop(0.5, 'rgba(251,146,60,0.9)')
      fg.addColorStop(1, 'rgba(239,68,68,0.98)')
      ctx.fillStyle = fg; ctx.fill()

      // Inner blue core
      ctx.beginPath()
      ctx.moveTo(standX - 12, baseY)
      ctx.lineTo(standX, baseY - fh * 0.58)
      ctx.lineTo(standX + 12, baseY)
      ctx.closePath()
      const ig = ctx.createLinearGradient(standX, baseY, standX, baseY - fh * 0.58)
      ig.addColorStop(0, 'rgba(6,182,212,0.95)')
      ig.addColorStop(1, 'rgba(224,242,254,0.98)')
      ctx.fillStyle = ig; ctx.fill()
      ctx.restore()
    }

    // ── ICE CUBES (when cooling) ──
    if (burner.iceLevel > 0.02) {
      renderIceCubes(ctx, standX, STAND_Y, burner.iceLevel)
    }

    // Bucket body
    const btY = 425, bbY = 516, btW = 130, bbW = 104
    ctx.save()
    ctx.beginPath()
    ctx.moveTo(standX - btW / 2, btY)
    ctx.lineTo(standX + btW / 2, btY)
    ctx.lineTo(standX + bbW / 2, bbY)
    ctx.lineTo(standX - bbW / 2, bbY)
    ctx.closePath()
    const bg = ctx.createLinearGradient(standX - btW / 2, 0, standX + btW / 2, 0)
    bg.addColorStop(0, '#8B9EB5')
    bg.addColorStop(0.3, '#DDEAF4')
    bg.addColorStop(0.7, '#C2D4E8')
    bg.addColorStop(1, '#5A7A95')
    ctx.fillStyle = bg; ctx.fill()
    ctx.strokeStyle = '#2C4A6A'; ctx.lineWidth = 2; ctx.stroke()

    // Bucket top ellipse
    ctx.beginPath()
    ctx.ellipse(standX, btY, btW / 2, 10, 0, 0, Math.PI * 2)
    ctx.fillStyle = '#4A6880'; ctx.fill(); ctx.stroke()

    // Gas pipe
    ctx.strokeStyle = '#B8C9D4'; ctx.lineWidth = 5; ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(standX - bbW / 2 + 8, bbY - 8)
    ctx.quadraticCurveTo(standX - bbW / 2 - 22, bbY + 5, standX - bbW / 2 - 28, 520)
    ctx.stroke()

    // ── SLIDER (child-friendly colorful design) ──
    const sliderX = standX + 20
    const sTop = 453, sBot = 507, sMid = (sTop + sBot) / 2

    // Slider container
    ctx.fillStyle = '#1E2A38'
    roundRect(ctx, sliderX - 8, sTop, 16, sBot - sTop, 6)
    ctx.fill()

    // RED HEAT bar
    ctx.fillStyle = '#EF4444'
    roundRect(ctx, sliderX - 7, sTop + 1, 14, sMid - sTop - 1, 4)
    ctx.fill()

    // BLUE COOL bar
    ctx.fillStyle = '#3B82F6'
    roundRect(ctx, sliderX - 7, sMid, 14, sBot - sMid - 1, 4)
    ctx.fill()

    // Neutral center line
    ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 2
    ctx.beginPath(); ctx.moveTo(sliderX - 7, sMid); ctx.lineTo(sliderX + 7, sMid); ctx.stroke()

    // Labels
    ctx.font = 'bold 11px "Inter", system-ui'
    ctx.fillStyle = '#2C1810'
    ctx.textAlign = 'right'
    ctx.fillText('Heat', sliderX - 12, sTop + 11)
    ctx.fillText('Cool', sliderX - 12, sBot - 2)
    ctx.textAlign = 'left'

    // Slider knob (cyan handle)
    const knobY = sMid - burner.lever * ((sBot - sTop) / 2 - 5)
    ctx.save()
    ctx.shadowColor = '#06B6D4'; ctx.shadowBlur = 8
    ctx.fillStyle = '#A5F3FC'
    roundRect(ctx, sliderX - 18, knobY - 7, 36, 14, 5)
    ctx.fill()
    ctx.strokeStyle = '#0891B2'; ctx.lineWidth = 2
    roundRect(ctx, sliderX - 18, knobY - 7, 36, 14, 5)
    ctx.stroke()
    ctx.restore()
    // Grip line
    ctx.strokeStyle = '#0E7490'; ctx.lineWidth = 1.5
    ctx.beginPath(); ctx.moveTo(sliderX - 10, knobY); ctx.lineTo(sliderX + 10, knobY); ctx.stroke()

    // Label
    ctx.font = 'bold 11px "Inter", system-ui'; ctx.fillStyle = '#1E2A38'
    ctx.fillText(label, standX - 28, 440)
    ctx.restore()
  }

  // Crystalline 3D ice cubes
  const renderIceCubes = (ctx, standX, standY, iceLevel) => {
    const positions = [
      { ox: -22, oy: -6, s: 17 }, { ox: 2, oy: -12, s: 20 }, { ox: 24, oy: -6, s: 17 },
      { ox: -12, oy: -26, s: 19 }, { ox: 16, oy: -24, s: 19 }, { ox: 2, oy: -40, s: 21 },
      { ox: -20, oy: -48, s: 17 }, { ox: 20, oy: -46, s: 17 }
    ]
    const count = Math.ceil(iceLevel * positions.length)
    ctx.save()
    for (let i = 0; i < Math.min(count, positions.length); i++) {
      const { ox, oy, s } = positions[i]
      const sc = Math.min(1, iceLevel * 1.4)
      const ss = s * sc
      const cx = standX + ox, cy = standY + 96 + oy * sc

      // Main face
      ctx.fillStyle = 'rgba(219,245,255,0.9)'
      ctx.fillRect(cx - ss / 2, cy - ss / 2, ss, ss)
      ctx.strokeStyle = '#38BDF8'; ctx.lineWidth = 1.6
      ctx.strokeRect(cx - ss / 2, cy - ss / 2, ss, ss)

      // Top facet
      ctx.beginPath()
      ctx.moveTo(cx - ss / 2, cy - ss / 2)
      ctx.lineTo(cx - ss / 2 + 5, cy - ss / 2 - 5)
      ctx.lineTo(cx + ss / 2 + 5, cy - ss / 2 - 5)
      ctx.lineTo(cx + ss / 2, cy - ss / 2)
      ctx.closePath()
      ctx.fillStyle = 'rgba(240,252,255,0.97)'; ctx.fill(); ctx.stroke()

      // Right facet
      ctx.beginPath()
      ctx.moveTo(cx + ss / 2, cy - ss / 2)
      ctx.lineTo(cx + ss / 2 + 5, cy - ss / 2 - 5)
      ctx.lineTo(cx + ss / 2 + 5, cy + ss / 2 - 5)
      ctx.lineTo(cx + ss / 2, cy + ss / 2)
      ctx.closePath()
      ctx.fillStyle = 'rgba(186,230,253,0.88)'; ctx.fill(); ctx.stroke()
    }
    ctx.restore()
  }

  const renderContactShadows = (ctx, objects) => {
    Object.values(objects).forEach(obj => {
      if (obj.submergedIn) return
      const sy = obj.onStand ? STAND_Y : 520
      ctx.fillStyle = 'rgba(0,0,0,0.14)'
      ctx.beginPath()
      ctx.ellipse(obj.x + obj.w / 2, sy, obj.w / 2 - 8, 5, 0, 0, Math.PI * 2)
      ctx.fill()
    })
  }

  // Large 3D Perspective Beaker (matching reference image)
  const renderBeaker = (ctx, beaker, allObjects, s) => {
    const isWater = beaker.id === 'water'
    const totalVol = getBeakerTotalVolume(beaker, s)
    const liquidH = Math.max(0, Math.min(180, (totalVol / 1000) * 148))
    const liquidTopY = beaker.y + beaker.h - liquidH

    // Back wall (subtle glass tint)
    ctx.fillStyle = 'rgba(255,255,255,0.22)'
    ctx.fillRect(beaker.x, beaker.y, beaker.w, beaker.h)

    // Liquid fill
    if (beaker.currentVolumeMl > 0) {
      const lg = ctx.createLinearGradient(beaker.x, liquidTopY, beaker.x, beaker.y + beaker.h)
      if (isWater) {
        lg.addColorStop(0, 'rgba(186,230,253,0.62)')
        lg.addColorStop(0.6, 'rgba(56,189,248,0.82)')
        lg.addColorStop(1, 'rgba(2,132,199,0.92)')
      } else {
        lg.addColorStop(0, 'rgba(254,240,138,0.68)')
        lg.addColorStop(0.6, 'rgba(234,179,8,0.85)')
        lg.addColorStop(1, 'rgba(161,98,7,0.92)')
      }
      ctx.fillStyle = lg
      ctx.fillRect(beaker.x + 3, liquidTopY, beaker.w - 6, liquidH)

      // Elliptical meniscus
      ctx.beginPath()
      ctx.ellipse(beaker.x + beaker.w / 2, liquidTopY, (beaker.w - 6) / 2, 18, 0, 0, Math.PI * 2)
      ctx.fillStyle = isWater ? 'rgba(224,242,254,0.95)' : 'rgba(254,252,232,0.95)'
      ctx.fill()
      ctx.strokeStyle = isWater ? '#38BDF8' : '#CA8A04'; ctx.lineWidth = 1.8; ctx.stroke()
    } else {
      ctx.font = 'bold 12px "Inter"'; ctx.fillStyle = '#EF4444'; ctx.textAlign = 'center'
      ctx.fillText('[ EVAPORATED ]', beaker.x + beaker.w / 2, beaker.y + beaker.h / 2)
      ctx.textAlign = 'left'
    }

    // Submerged blocks (inside the liquid!)
    beaker.contents.forEach(id => {
      const block = allObjects[id]
      if (block) render3DBlock(ctx, block, true, isWater ? 'water' : 'oil')
    })

    // Front glass walls
    ctx.strokeStyle = 'rgba(80,100,130,0.75)'; ctx.lineWidth = 3.5
    ctx.beginPath(); ctx.moveTo(beaker.x, beaker.y); ctx.lineTo(beaker.x, beaker.y + beaker.h); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(beaker.x + beaker.w, beaker.y); ctx.lineTo(beaker.x + beaker.w, beaker.y + beaker.h); ctx.stroke()

    // Bottom curved edge
    ctx.beginPath()
    ctx.ellipse(beaker.x + beaker.w / 2, beaker.y + beaker.h, beaker.w / 2, 22, 0, 0, Math.PI)
    ctx.stroke()

    // Top rim ellipse
    ctx.beginPath()
    ctx.ellipse(beaker.x + beaker.w / 2, beaker.y, beaker.w / 2, 24, 0, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.fill()
    ctx.strokeStyle = 'rgba(80,100,130,0.75)'; ctx.stroke()

    // Inner rim highlight
    ctx.beginPath()
    ctx.ellipse(beaker.x + beaker.w / 2, beaker.y, beaker.w / 2 - 4, 20, 0, 0, Math.PI * 2)
    ctx.strokeStyle = 'rgba(255,255,255,0.88)'; ctx.lineWidth = 1.6; ctx.stroke()

    // Measurement tick marks (left wall — matching reference image)
    ctx.strokeStyle = '#334155'; ctx.lineWidth = 1.8
    for (let gy = beaker.y + 38; gy < beaker.y + beaker.h - 14; gy += 16) {
      ctx.beginPath(); ctx.moveTo(beaker.x + 3, gy); ctx.lineTo(beaker.x + 20, gy); ctx.stroke()
    }

    // Glossy specular streak
    const sp = ctx.createLinearGradient(beaker.x + 8, 0, beaker.x + 26, 0)
    sp.addColorStop(0, 'rgba(255,255,255,0.55)')
    sp.addColorStop(0.5, 'rgba(255,255,255,0.18)')
    sp.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = sp
    ctx.fillRect(beaker.x + 8, beaker.y + 8, 18, beaker.h - 16)

    // Label (big, child-friendly!)
    ctx.font = 'bold 28px "Inter", system-ui, sans-serif'
    ctx.fillStyle = 'rgba(15,23,42,0.82)'
    ctx.textAlign = 'center'
    ctx.fillText(beaker.name, beaker.x + beaker.w / 2, beaker.y + beaker.h / 2 + 12)

    // Temperature badge (colorful!)
    const t = beaker.temp
    const badgeColor = t > 80 ? '#EF4444' : t > 50 ? '#F97316' : t > 30 ? '#EAB308' : '#3B82F6'
    ctx.fillStyle = badgeColor
    roundRect(ctx, beaker.x + beaker.w / 2 - 34, beaker.y + beaker.h + 22, 68, 24, 8)
    ctx.fill()
    ctx.font = 'bold 12px monospace'
    ctx.fillStyle = '#FFFFFF'
    ctx.fillText(`${t.toFixed(1)}°C`, beaker.x + beaker.w / 2, beaker.y + beaker.h + 38)
    ctx.textAlign = 'left'

    // Boiling indicator
    if (beaker.boilTimer > 0) {
      ctx.font = 'bold 12px "Inter"'
      ctx.fillStyle = '#EF4444'
      ctx.textAlign = 'center'
      ctx.fillText('🔥 Boiling!', beaker.x + beaker.w / 2, beaker.y + beaker.h + 58)
      ctx.textAlign = 'left'
    }

    // If >5s boiling, show escape indicator
    if (beaker.boilTimer > 5) {
      ctx.font = 'bold 11px "Inter"'
      ctx.fillStyle = '#7C3AED'
      ctx.textAlign = 'center'
      ctx.fillText('↑ Energy escaping!', beaker.x + beaker.w / 2, beaker.y + beaker.h + 72)
      ctx.textAlign = 'left'
    }
  }

  // 3D Isometric Block (child-friendly bold colors)
  const render3DBlock = (ctx, block, isSubmerged = false, liquid = null) => {
    const isIron = block.id === 'iron'
    const { x, y, w, h, depth } = block

    // Temperature-based color
    let faceColor = block.color
    let topColor = block.topColor
    let sideColor = block.sideColor

    if (block.wetTimer > 0 && !isIron) {
      faceColor = '#92400E'; topColor = '#B45309'; sideColor = '#78350F'
    } else if (block.temp > 180) {
      // Glowing incandescent
      faceColor = '#FCD34D'; topColor = '#FDE68A'; sideColor = '#F59E0B'
      ctx.save(); ctx.shadowColor = '#F97316'; ctx.shadowBlur = 20
    } else if (block.temp > 100) {
      const t = (block.temp - 100) / 80
      faceColor = `rgb(${Math.round(220 + t * 35)}, ${Math.round(60 - t * 40)}, ${Math.round(20)})`
      topColor = `rgb(${Math.round(240 + t * 15)}, ${Math.round(100 - t * 60)}, ${Math.round(30)})`
      sideColor = `rgb(${Math.round(180 + t * 20)}, ${Math.round(40 - t * 30)}, ${Math.round(10)})`
    } else if (block.temp > 50) {
      const t = (block.temp - 50) / 50
      if (isIron) {
        faceColor = `rgb(${Math.round(148 + t * 72)}, ${Math.round(163 + t * 10)}, ${Math.round(184 - t * 80)})`
      } else {
        faceColor = `rgb(${Math.round(217 + t * 38)}, ${Math.round(119 + t * 40)}, ${Math.round(6)})`
      }
    } else if (block.temp < 5) {
      faceColor = '#BFDBFE'; topColor = '#DBEAFE'; sideColor = '#93C5FD'
    }

    // Front face
    ctx.fillStyle = faceColor
    ctx.fillRect(x, y, w, h)
    ctx.strokeStyle = '#09090B'; ctx.lineWidth = 2.5
    ctx.strokeRect(x, y, w, h)

    // Top face
    ctx.beginPath()
    ctx.moveTo(x, y); ctx.lineTo(x + depth, y - depth)
    ctx.lineTo(x + w + depth, y - depth); ctx.lineTo(x + w, y)
    ctx.closePath()
    ctx.fillStyle = topColor; ctx.fill()
    ctx.stroke()

    // Right face
    ctx.beginPath()
    ctx.moveTo(x + w, y); ctx.lineTo(x + w + depth, y - depth)
    ctx.lineTo(x + w + depth, y + h - depth); ctx.lineTo(x + w, y + h)
    ctx.closePath()
    ctx.fillStyle = sideColor; ctx.fill()
    ctx.stroke()

    if (block.temp > 180) ctx.restore()

    // Texture
    if (isIron) {
      ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 1
      for (let ly = y + 7; ly < y + h; ly += 8) {
        ctx.beginPath(); ctx.moveTo(x + 3, ly); ctx.lineTo(x + w - 3, ly); ctx.stroke()
      }
    } else {
      ctx.fillStyle = 'rgba(0,0,0,0.18)'
      for (let i = 0; i < 14; i++) {
        const px = x + 8 + ((i * 19) % (w - 16))
        const py = y + 8 + ((i * 27) % (h - 16))
        ctx.fillRect(px, py, 3, 3)
      }
    }

    // Liquid tint if submerged
    if (isSubmerged) {
      ctx.fillStyle = liquid === 'water' ? 'rgba(56,189,248,0.38)' : 'rgba(234,179,8,0.42)'
      ctx.fillRect(x, y, w, h)
    }

    // Label & temp (child-friendly big text)
    ctx.font = 'bold 15px "Inter", system-ui'
    ctx.fillStyle = '#FFFFFF'
    ctx.textAlign = 'center'
    ctx.fillText(block.name, x + w / 2, y + h / 2 + 4)
    ctx.font = 'bold 10.5px monospace'
    const tempColor = block.temp > 80 ? '#FDE68A' : block.temp < 10 ? '#BAE6FD' : '#F9F9F9'
    ctx.fillStyle = tempColor
    ctx.fillText(`${block.temp.toFixed(1)}°C`, x + w / 2, y + h / 2 + 18)
    ctx.textAlign = 'left'
  }

  // Core E-chunk drawing function
  const drawEChunk = (ctx, x, y, hue) => {
    // Glowing filled square — bright & visible for children
    ctx.save()
    ctx.shadowColor = `hsl(${hue}, 100%, 50%)`
    ctx.shadowBlur = 8

    ctx.fillStyle = `hsl(${hue}, 95%, 55%)`
    roundRect(ctx, x - 9, y - 9, 18, 18, 4)
    ctx.fill()

    ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 1.5
    roundRect(ctx, x - 9, y - 9, 18, 18, 4)
    ctx.stroke()

    ctx.font = 'bold 12px "Inter", system-ui'
    ctx.fillStyle = '#FFFFFF'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('E', x, y)
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'
    ctx.restore()
  }

  // Render all energy chunks inside objects
  const renderEnergyChunks = (ctx, s) => {
    const { chunks, objects } = s
    chunks.forEach(chunk => {
      const obj = objects[chunk.parentId]
      if (!obj) return
      const ax = obj.x + chunk.rx
      const ay = obj.y + chunk.ry
      drawEChunk(ctx, ax, ay, chunk.hue)
    })
  }

  // Glass laboratory thermometer
  const renderThermometer = (ctx, th, isMaster) => {
    const sw = 14, sh = 136, br = 11
    ctx.fillStyle = 'rgba(255,255,255,0.92)'; ctx.strokeStyle = '#1C2B3A'; ctx.lineWidth = 1.6
    ctx.fillRect(th.x - sw / 2, th.y, sw, sh - 12); ctx.strokeRect(th.x - sw / 2, th.y, sw, sh - 12)

    ctx.beginPath(); ctx.arc(th.x, th.y + 4, sw / 2, Math.PI, 0)
    ctx.fillStyle = 'rgba(255,255,255,0.98)'; ctx.fill(); ctx.stroke()

    ctx.beginPath(); ctx.arc(th.x, th.y + sh - 6, br, 0, Math.PI * 2)
    ctx.fillStyle = '#DC2626'; ctx.fill(); ctx.stroke()

    const mh = Math.max(6, Math.min(108, ((th.temp + 10) / 260) * 108))
    ctx.fillStyle = '#DC2626'
    ctx.fillRect(th.x - 3, th.y + (sh - 14) - mh, 6, mh)

    ctx.strokeStyle = '#334155'; ctx.lineWidth = 1
    for (let gy = th.y + 16; gy < th.y + sh - 24; gy += 14) {
      ctx.beginPath(); ctx.moveTo(th.x - sw / 2, gy); ctx.lineTo(th.x - 1, gy); ctx.stroke()
    }

    // Triangular tip
    ctx.fillStyle = '#002B66'
    ctx.beginPath()
    ctx.moveTo(th.x, th.y + sh + 7)
    ctx.lineTo(th.x - 5, th.y + sh - 2)
    ctx.lineTo(th.x + 5, th.y + sh - 2)
    ctx.closePath(); ctx.fill()

    if (!isMaster) {
      ctx.fillStyle = '#0F172A'
      roundRect(ctx, th.x + 12, th.y + 18, 64, 24, 6); ctx.fill()
      ctx.strokeStyle = '#E2C17D'; ctx.lineWidth = 1
      roundRect(ctx, th.x + 12, th.y + 18, 64, 24, 6); ctx.stroke()
      ctx.font = 'bold 12px monospace'; ctx.fillStyle = '#E2C17D'
      ctx.fillText(`${th.temp.toFixed(1)}°C`, th.x + 18, th.y + 34)
      ctx.font = 'bold 10px sans-serif'; ctx.fillStyle = '#EF4444'
      ctx.fillText('✕', th.x + 66, th.y + 30)
    }
  }

  // Legend
  const renderLegend = (ctx, W) => {
    ctx.save()
    ctx.fillStyle = 'rgba(255,255,255,0.95)'
    roundRect(ctx, W - 220, 14, 200, 64, 10); ctx.fill()
    ctx.strokeStyle = 'rgba(0,0,0,0.12)'; ctx.lineWidth = 1.5
    roundRect(ctx, W - 220, 14, 200, 64); ctx.stroke()

    ctx.font = 'bold 11px "Inter", system-ui'; ctx.fillStyle = '#1E293B'
    ctx.fillText('⚡ Energy Chunk Key:', W - 210, 30)

    const demos = [
      { hue: 30, label: 'Hot (>100°C)' },
      { hue: 75, label: 'Warm (30-60°C)' },
      { hue: 200, label: 'Cool (room temp)' }
    ]
    demos.forEach((d, i) => {
      drawEChunk(ctx, W - 210 + i * 64, 52, d.hue)
      ctx.font = '8px "Inter"'; ctx.fillStyle = '#374151'
      ctx.fillText(d.label, W - 220 + i * 64, 68)
    })
    ctx.restore()
  }

  // ── Utility: Rounded Rect ──
  const roundRect = (ctx, x, y, w, h, r = 0) => {
    ctx.beginPath()
    ctx.moveTo(x + r, y)
    ctx.lineTo(x + w - r, y); ctx.arcTo(x + w, y, x + w, y + r, r)
    ctx.lineTo(x + w, y + h - r); ctx.arcTo(x + w, y + h, x + w - r, y + h, r)
    ctx.lineTo(x + r, y + h); ctx.arcTo(x, y + h, x, y + h - r, r)
    ctx.lineTo(x, y + r); ctx.arcTo(x, y, x + r, y, r)
    ctx.closePath()
  }

  // ── Coordinates & Interaction ──
  const getCoords = (e) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    return {
      x: (e.clientX - rect.left) * (1000 / rect.width),
      y: (e.clientY - rect.top) * (620 / rect.height)
    }
  }

  const handlePointerDown = (e) => {
    const { x, y } = getCoords(e)
    const s = stateRef.current

    // Slider 1 (standX=330, sliderX=350)
    if (Math.abs(x - 350) <= 24 && y >= 440 && y <= 520) {
      s.draggingItem = { type: 'lever', id: 'burner1' }; return
    }
    // Slider 2 (standX=670, sliderX=690)
    if (Math.abs(x - 690) <= 24 && y >= 440 && y <= 520) {
      s.draggingItem = { type: 'lever', id: 'burner2' }; return
    }

    // Thermometers — delete badge
    for (let i = s.thermometers.length - 1; i >= 0; i--) {
      const th = s.thermometers[i]
      if (x >= th.x + 64 && x <= th.x + 78 && y >= th.y + 16 && y <= th.y + 32) {
        s.thermometers.splice(i, 1); playClickSound(); return
      }
      if (x >= th.x - 14 && x <= th.x + 78 && y >= th.y && y <= th.y + 145) {
        s.draggingItem = { type: 'thermometer', id: th.id, offsetX: x - th.x, offsetY: y - th.y }; return
      }
    }

    // Dispenser rack
    if (x >= 30 && x <= 205 && y >= 22 && y <= 190) {
      playClickSound()
      const id = `th_${Date.now()}`
      s.thermometers.push({ id, x, y: y - 20, temp: T_ROOM, attachedTo: null })
      s.draggingItem = { type: 'thermometer', id, offsetX: 0, offsetY: 20 }; return
    }

    // Submerged blocks
    for (const k of ['iron', 'brick']) {
      const b = s.objects[k]
      if (b.submergedIn && x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
        s.draggingItem = { type: 'submerged_block', id: k, beakerId: b.submergedIn, offsetX: x - b.x, offsetY: y - b.y }; return
      }
    }

    // Dry blocks
    for (const k of ['iron', 'brick']) {
      const b = s.objects[k]
      if (!b.submergedIn && x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
        b.onStand = null
        s.draggingItem = { type: 'object', id: k, offsetX: x - b.x, offsetY: y - b.y }; return
      }
    }

    // Beakers
    for (const k of ['water', 'oil']) {
      const b = s.objects[k]
      if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
        b.onStand = null
        s.draggingItem = { type: 'beaker', id: k, offsetX: x - b.x, offsetY: y - b.y }; return
      }
    }
  }

  const handlePointerMove = (e) => {
    const { x, y } = getCoords(e)
    const s = stateRef.current
    if (!s.draggingItem) return
    const { type, id, offsetX, offsetY } = s.draggingItem

    if (type === 'lever') {
      const sliderMidY = 470
      let raw = (sliderMidY - y) / 26
      if (Math.abs(raw) < 0.1) { raw = 0; if (!s[id].prevSnapped) playClickSound(); s[id].prevSnapped = true }
      else { s[id].prevSnapped = false }
      s[id].lever = Math.max(-1, Math.min(1, raw))
      if (linkHeaters) { s.burner1.lever = s[id].lever; s.burner2.lever = s[id].lever }
      updateBurnerAudio(Math.max(s.burner1.lever, s.burner2.lever))
      return
    }

    if (type === 'thermometer') {
      const th = s.thermometers.find(t => t.id === id)
      if (th) { th.x = Math.max(10, Math.min(975, x - offsetX)); th.y = Math.max(10, Math.min(470, y - offsetY)); th.attachedTo = null }
      return
    }

    if (type === 'submerged_block') {
      const block = s.objects[id]
      const beaker = s.objects[s.draggingItem.beakerId]
      if (block && beaker) {
        const proposedY = y - offsetY
        if (proposedY < beaker.y + 36) {
          // Extract from beaker!
          block.submergedIn = null
          beaker.contents = beaker.contents.filter(c => c !== id)
          if (id === 'brick') block.wetTimer = 10
          block.x = Math.max(10, Math.min(985 - block.w, x - offsetX))
          block.y = proposedY
          s.draggingItem = { type: 'object', id, offsetX, offsetY }
          playClinkSound(false)
        } else {
          block.x = beaker.x + Math.max(6, Math.min(beaker.w - block.w - 6, x - offsetX - beaker.x))
          block.y = Math.max(beaker.y + 36, Math.min(beaker.y + beaker.h - block.h - 8, proposedY))
        }
      }
      return
    }

    if (type === 'object') {
      const obj = s.objects[id]
      if (obj) { obj.x = Math.max(10, Math.min(990 - obj.w, x - offsetX)); obj.y = Math.max(20, Math.min(520 - obj.h, y - offsetY)); obj.onStand = null; obj.submergedIn = null }
      return
    }

    if (type === 'beaker') {
      const beaker = s.objects[id]
      if (beaker) {
        const nx = Math.max(10, Math.min(990 - beaker.w, x - offsetX))
        const ny = Math.max(20, Math.min(520 - beaker.h, y - offsetY))
        const dx = nx - beaker.x, dy = ny - beaker.y
        beaker.x = nx; beaker.y = ny; beaker.onStand = null
        beaker.contents.forEach(cid => { const c = s.objects[cid]; if (c) { c.x += dx; c.y += dy } })
        s.thermometers.forEach(th => { if (th.attachedTo === id || beaker.contents.includes(th.attachedTo)) { th.x += dx; th.y += dy } })
      }
    }
  }

  const handlePointerUp = () => {
    const s = stateRef.current
    if (!s.draggingItem) return
    const { type, id } = s.draggingItem

    if (type === 'thermometer') {
      const idx = s.thermometers.findIndex(t => t.id === id)
      if (idx !== -1 && s.thermometers[idx].x < 205 && s.thermometers[idx].y < 190) {
        s.thermometers.splice(idx, 1); playClinkSound(false)
      }
    }

    if (type === 'object') {
      const obj = s.objects[id]
      if (!obj) { s.draggingItem = null; return }
      const cx = obj.x + obj.w / 2, cy = obj.y + obj.h / 2

      // Stand snap
      if (Math.abs(cx - STAND1_X) < 75 && Math.abs(cy - 325) < 75) {
        obj.x = STAND1_X - obj.w / 2; obj.y = STAND_Y - obj.h; obj.onStand = 1; playClinkSound(false)
      } else if (Math.abs(cx - STAND2_X) < 75 && Math.abs(cy - 325) < 75) {
        obj.x = STAND2_X - obj.w / 2; obj.y = STAND_Y - obj.h; obj.onStand = 2; playClinkSound(false)
      } else {
        // Submerge into beaker
        let submerged = false
        for (const bk of ['water', 'oil']) {
          const b = s.objects[bk]
          if (cx >= b.x && cx <= b.x + b.w && cy >= b.y && cy <= b.y + b.h) {
            obj.submergedIn = bk
            if (!b.contents.includes(id)) b.contents.push(id)
            if (b.contents.length === 1) { obj.x = b.x + (b.w - obj.w) / 2; obj.y = b.y + b.h - obj.h - 12 }
            else { const isFirst = b.contents[0] === id; obj.x = isFirst ? b.x + 10 : b.x + b.w - obj.w - 10; obj.y = b.y + b.h - obj.h - 12 }
            submerged = true
            if (obj.temp > 80 && bk === 'water') playSizzleSound(Math.min(1, (obj.temp - 80) / 100))
            else playClinkSound(true)
            break
          }
        }
        if (!submerged && obj.y > 500) obj.y = 520 - obj.h
      }
    }

    if (type === 'beaker') {
      const beaker = s.objects[id]
      if (!beaker) { s.draggingItem = null; return }
      const cx = beaker.x + beaker.w / 2, cy = beaker.y + beaker.h / 2
      let sx = null, sy = null, stId = null

      if (Math.abs(cx - STAND1_X) < 82 && Math.abs(cy - 325) < 82) { sx = STAND1_X - beaker.w / 2; sy = STAND_Y - beaker.h; stId = 1 }
      else if (Math.abs(cx - STAND2_X) < 82 && Math.abs(cy - 325) < 82) { sx = STAND2_X - beaker.w / 2; sy = STAND_Y - beaker.h; stId = 2 }
      else if (beaker.y > 500) { sx = beaker.x; sy = 520 - beaker.h }

      if (sx !== null) {
        const dx = sx - beaker.x, dy = sy - beaker.y
        beaker.x = sx; beaker.y = sy; beaker.onStand = stId
        beaker.contents.forEach(cid => { const c = s.objects[cid]; if (c) { c.x += dx; c.y += dy } })
        s.thermometers.forEach(th => { if (th.attachedTo === id || beaker.contents.includes(th.attachedTo)) { th.x += dx; th.y += dy } })
        playClinkSound(true)
      }
    }

    s.draggingItem = null
  }

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', background: '#FFF8EE' }}>
      <canvas
        ref={canvasRef}
        width={1000}
        height={620}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        style={{
          width: '100%',
          maxWidth: 1200,
          maxHeight: '100%',
          aspectRatio: '1000/620',
          objectFit: 'contain',
          touchAction: 'none',
          userSelect: 'none',
          cursor: stateRef.current.draggingItem ? 'grabbing' : 'grab',
          borderRadius: 16,
          boxShadow: '0 20px 60px rgba(0,0,0,0.15), 0 4px 16px rgba(0,0,0,0.08)'
        }}
      />
    </div>
  )
}
