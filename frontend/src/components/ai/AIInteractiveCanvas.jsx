/**
 * VISIORA — AIInteractiveCanvas.jsx
 * 
 * 60 FPS HTML5 Canvas engine rendering real-time interactive 2D physics visuals
 * generated dynamically by the AI Tutor.
 * 
 * Supports:
 *   - 'projectile' (ballistics, parabolic trajectory, velocity vectors)
 *   - 'pendulum' (simple harmonic oscillation, restoring forces, energy bars)
 *   - 'refraction' (Snell's law, boundary transition, total internal reflection)
 *   - 'circuit' (DC Ohm's law, drifting electrons, Joule resistor heating)
 */

import React, { useRef, useEffect, useState, useMemo } from 'react'
import { Play, Pause, RotateCcw, Sliders, Zap, Activity, Maximize2, Minimize2, X } from 'lucide-react'

export default function AIInteractiveCanvas({
  visualType = 'projectile',
  sliders = [],
  telemetryMetrics = [],
  initialParams = {},
  inline = false,
  topic = '',
  concept = ''
}) {
  const canvasRef = useRef(null)
  const [isFullscreen, setIsFullscreen] = useState(false)

  // Manage current slider values
  const [params, setParams] = useState(() => {
    const initial = {}
    sliders.forEach(s => {
      initial[s.id] = initialParams[s.id] ?? s.default
    })
    return initial
  })

  // Synchronize when sliders change
  useEffect(() => {
    setParams(prev => {
      const next = { ...prev }
      sliders.forEach(s => {
        if (next[s.id] === undefined) {
          next[s.id] = s.default
        }
      })
      return next
    })
  }, [sliders])

  const [isPlaying, setIsPlaying] = useState(true)
  const [simTime, setSimTime] = useState(0)

  const handleSliderChange = (id, val) => {
    setParams(prev => ({ ...prev, [id]: parseFloat(val) }))
  }

  const handleReset = () => {
    setSimTime(0)
  }

  // ── Physics Telemetry Computations ──
  const telemetry = useMemo(() => {
    if (visualType === 'projectile') {
      const isBounce =
        params.COR !== undefined ||
        params.cor !== undefined ||
        params.restitution !== undefined ||
        params.height !== undefined ||
        /bounce|tennis|basketball|restitution/i.test(`${topic} ${concept}`)

      if (isBounce) {
        const dropH = params.height ?? params.dropHeight ?? 1.5
        const cor = params.COR ?? params.cor ?? params.restitution ?? 0.75
        const h1 = dropH * cor * cor
        const energyRetained = (cor * cor * 100).toFixed(1)
        return {
          dropHeight: dropH.toFixed(2) + ' m',
          bounceHeight: h1.toFixed(2) + ' m',
          restitution: cor.toFixed(2),
          energyRetained: energyRetained + '%'
        }
      }

      const v0 = params.launchVelocity ?? 24
      const deg = params.launchAngle ?? 45
      const g = params.gravity ?? 9.8
      const rad = (deg * Math.PI) / 180
      const vx = v0 * Math.cos(rad)
      const vy = v0 * Math.sin(rad)
      const flightTime = (2 * vy) / g
      const range = (v0 * v0 * Math.sin(2 * rad)) / g
      const maxHeight = (vy * vy) / (2 * g)
      return {
        range: range.toFixed(2) + ' m',
        maxHeight: maxHeight.toFixed(2) + ' m',
        timeOfFlight: flightTime.toFixed(2) + ' s',
        vx: vx.toFixed(2) + ' m/s'
      }
    }

    if (visualType === 'pendulum') {
      const L = params.length ?? 1.5
      const g = params.gravity ?? 9.8
      const theta0Deg = params.initialAngle ?? 25
      const theta0Rad = (theta0Deg * Math.PI) / 180
      const period = 2 * Math.PI * Math.sqrt(L / g)
      const frequency = 1 / period
      const maxSpeed = Math.sqrt(2 * g * L * (1 - Math.cos(theta0Rad)))
      const totalEnergy = (1.0 * g * L * (1 - Math.cos(theta0Rad))).toFixed(2)
      return {
        period: period.toFixed(2) + ' s',
        frequency: frequency.toFixed(2) + ' Hz',
        maxSpeed: maxSpeed.toFixed(2) + ' m/s',
        totalEnergy: totalEnergy + ' J'
      }
    }

    if (visualType === 'refraction') {
      const theta1Deg = params.incidentAngle ?? 40
      const n1 = params.n1 ?? 1.0
      const n2 = params.n2 ?? 1.52
      const theta1Rad = (theta1Deg * Math.PI) / 180
      const sinTheta2 = (n1 / n2) * Math.sin(theta1Rad)
      const isTIR = sinTheta2 > 1.0
      const theta2Deg = isTIR ? 'N/A (TIR)' : ((Math.asin(sinTheta2) * 180) / Math.PI).toFixed(1) + '°'
      const critAngle = n1 > n2 ? ((Math.asin(n2 / n1) * 180) / Math.PI).toFixed(1) + '°' : 'None'
      const v2 = (3.0 / n2).toFixed(2)
      return {
        refractedAngle: theta2Deg,
        criticalAngle: critAngle,
        v2: v2 + ' ×10⁸ m/s',
        isTIR: isTIR ? 'YES (TIR)' : 'NO'
      }
    }

    if (visualType === 'circuit') {
      const V = params.voltage ?? 9.0
      const R = params.resistance ?? 10.0
      const r = params.internalR ?? 0.5
      const totalR = R + r
      const I = V / totalR
      const power = I * I * R
      const vLoad = I * R
      return {
        current: I.toFixed(2) + ' A',
        power: power.toFixed(2) + ' W',
        vLoad: vLoad.toFixed(2) + ' V',
        electronSpeed: (I * 2.5).toFixed(1) + ' px/s'
      }
    }

    if (visualType === 'buoyancy') {
      const isBalloon =
        params.balloonTemperature !== undefined ||
        params.airTemperature !== undefined ||
        params.tempInside !== undefined ||
        params.tempOutside !== undefined ||
        params.temperatureInside !== undefined ||
        params.temperatureOutside !== undefined ||
        params.balloonVolume !== undefined ||
        /balloon|air/i.test(`${topic} ${concept}`)

      const tInside = params.balloonTemperature ?? params.tempInside ?? params.temperatureInside ?? 95
      const tOutside = params.airTemperature ?? params.tempOutside ?? params.temperatureOutside ?? 10
      const rho_f = isBalloon
        ? 101325 / (287 * (tOutside + 273.15))
        : (params.fluidDensity ?? 1000)
      const rho_obj = isBalloon
        ? 101325 / (287 * (tInside + 273.15))
        : (params.objectDensity ?? 650)
      const V = params.balloonVolume ?? params.objectVolume ?? params.volume ?? (isBalloon ? 2200 : 0.1)
      const g = params.gravity ?? 9.8
      const Fb = rho_f * V * g
      const Fg = rho_obj * V * g
      const Fnet = Fb - Fg
      const status = Fnet > 10 ? 'Rises ⬆' : Fnet < -10 ? 'Sinks ⬇' : 'Equilibrium ⚖'

      return {
        buoyantForce: (Fb > 1000 ? (Fb / 1000).toFixed(2) + ' kN' : Fb.toFixed(1) + ' N'),
        weight: (Fg > 1000 ? (Fg / 1000).toFixed(2) + ' kN' : Fg.toFixed(1) + ' N'),
        netForce: (Fnet >= 0 ? '+' : '') + (Math.abs(Fnet) > 1000 ? (Fnet / 1000).toFixed(2) + ' kN' : Fnet.toFixed(1) + ' N'),
        state: status
      }
    }

    if (visualType === 'wave') {
      const f = params.frequency ?? 1.5
      const lambda = params.wavelength ?? 150
      const v = params.waveSpeed ?? (f * lambda)
      const T = 1 / f
      return {
        frequency: f.toFixed(1) + ' Hz',
        wavelength: lambda.toFixed(0) + ' px',
        period: T.toFixed(2) + ' s',
        speed: v.toFixed(0) + ' px/s'
      }
    }

    if (visualType === 'spring') {
      const k = params.k ?? 25
      const m = params.mass ?? 1.0
      const A = params.amplitude ?? 0.4
      const omega = Math.sqrt(k / m)
      const period = (2 * Math.PI) / omega
      const maxF = (k * A).toFixed(1)
      const totalE = (0.5 * k * A * A).toFixed(2)
      return {
        period: period.toFixed(2) + ' s',
        frequency: (1 / period).toFixed(2) + ' Hz',
        maxForce: maxF + ' N',
        elasticEnergy: totalE + ' J'
      }
    }

    if (visualType === 'collision') {
      const m1 = params.m1 ?? 2.0
      const v1 = params.v1 ?? 6.0
      const m2 = params.m2 ?? 3.0
      const cor = params.cor ?? params.COR ?? 0.85
      const P_init = (m1 * v1).toFixed(1)
      const KE_init = (0.5 * m1 * v1 * v1).toFixed(1)
      const v1f = ((m1 - cor * m2) * v1) / (m1 + m2)
      const v2f = ((1 + cor) * m1 * v1) / (m1 + m2)
      return {
        totalMomentum: P_init + ' kg·m/s',
        initialKE: KE_init + ' J',
        v1PostImpact: v1f.toFixed(2) + ' m/s',
        v2PostImpact: v2f.toFixed(2) + ' m/s'
      }
    }

    if (visualType === 'gravity') {
      const M = params.centralMass ?? 6.0
      const r = params.orbitRadius ?? 130
      const v = params.satelliteSpeed ?? 7.8
      const T = (2 * Math.PI * r) / (v * 10)
      return {
        orbitalRadius: r.toFixed(0) + ' km',
        velocity: v.toFixed(1) + ' km/s',
        period: T.toFixed(1) + ' min',
        centralMass: M.toFixed(1) + ' ×10²⁴ kg'
      }
    }

    return {}
  }, [visualType, params, topic, concept])

  // ── Background Grid Helper ──
  const drawGrid = (ctx, w, h) => {
    ctx.strokeStyle = 'rgba(0, 43, 102, 0.04)'
    ctx.lineWidth = 1
    const step = 30
    for (let x = 0; x < w; x += step) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, h)
      ctx.stroke()
    }
    for (let y = 0; y < h; y += step) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(w, y)
      ctx.stroke()
    }
  }

  // ── 60 FPS Render Loop ──
  useEffect(() => {
    let animFrameId
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    const render = () => {
      const width = canvas.parentElement?.clientWidth || canvas.clientWidth || 600
      const height = canvas.parentElement?.clientHeight || canvas.clientHeight || 320

      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width
        canvas.height = height
      }

      ctx.clearRect(0, 0, width, height)

      // Background graph paper grid
      ctx.fillStyle = '#FAF8F5'
      ctx.fillRect(0, 0, width, height)
      drawGrid(ctx, width, height)

      if (isPlaying) {
        setSimTime(prev => prev + 0.016)
      }

      // 1. PROJECTILE MOTION / BOUNCING BALL
      if (visualType === 'projectile') {
        const isBounce =
          params.COR !== undefined ||
          params.cor !== undefined ||
          params.restitution !== undefined ||
          params.height !== undefined ||
          /bounce|tennis|basketball|restitution/i.test(`${topic} ${concept}`)

        if (isBounce) {
          renderBouncingBall(ctx, width, height, params, simTime)
        } else {
          renderProjectile(ctx, width, height, params, simTime)
        }
      }
      // 2. SIMPLE PENDULUM
      else if (visualType === 'pendulum') {
        renderPendulum(ctx, width, height, params, simTime)
      }
      // 3. SNELL'S REFRACTION
      else if (visualType === 'refraction') {
        renderRefraction(ctx, width, height, params, simTime)
      }
      // 4. OHM'S DC CIRCUIT
      else if (visualType === 'circuit') {
        renderCircuit(ctx, width, height, params, simTime)
      }
      // 5. BUOYANCY & FLOTATION
      else if (visualType === 'buoyancy') {
        renderBuoyancy(ctx, width, height, params, simTime)
      }
      // 6. HARMONIC WAVE
      else if (visualType === 'wave') {
        renderWave(ctx, width, height, params, simTime)
      }
      // 7. HOOKE'S SPRING
      else if (visualType === 'spring') {
        renderSpring(ctx, width, height, params, simTime)
      }
      // 8. COLLISION & MOMENTUM
      else if (visualType === 'collision') {
        renderCollision(ctx, width, height, params, simTime)
      }
      // 9. GRAVITATION & ORBIT
      else if (visualType === 'gravity') {
        renderGravity(ctx, width, height, params, simTime)
      }
      else {
        renderProjectile(ctx, width, height, params, simTime)
      }

      animFrameId = requestAnimationFrame(render)
    }

    animFrameId = requestAnimationFrame(render)
    return () => cancelAnimationFrame(animFrameId)
  }, [visualType, params, isPlaying, simTime, topic, concept])

  // ── Renderer: Projectile ──
  const renderProjectile = (ctx, w, h, p, t) => {
    const groundY = h - 60
    const startX = 60
    const v0 = p.launchVelocity ?? 24
    const angleDeg = p.launchAngle ?? 45
    const g = p.gravity ?? 9.8
    const rad = (angleDeg * Math.PI) / 180

    const vx = v0 * Math.cos(rad)
    const vy = v0 * Math.sin(rad)
    const totalT = (2 * vy) / g
    const scale = Math.min((w - 120) / Math.max(30, (v0 * v0 * Math.sin(2 * rad)) / g), 12)

    // Ground line
    ctx.strokeStyle = '#002B66'
    ctx.lineWidth = 2.5
    ctx.beginPath()
    ctx.moveTo(0, groundY)
    ctx.lineTo(w, groundY)
    ctx.stroke()

    // Sub-ground hatch
    ctx.fillStyle = 'rgba(0, 43, 102, 0.05)'
    ctx.fillRect(0, groundY, w, h - groundY)

    // Parabolic trajectory path
    ctx.strokeStyle = 'rgba(0, 43, 102, 0.25)'
    ctx.lineWidth = 2
    ctx.setLineDash([5, 5])
    ctx.beginPath()
    const steps = 60
    for (let i = 0; i <= steps; i++) {
      const stepT = (i / steps) * totalT
      const px = startX + vx * stepT * scale
      const py = groundY - (vy * stepT - 0.5 * g * stepT * stepT) * scale
      if (i === 0) ctx.moveTo(px, py)
      else ctx.lineTo(px, py)
    }
    ctx.stroke()
    ctx.setLineDash([])

    // Cannon base
    ctx.save()
    ctx.translate(startX, groundY)
    ctx.fillStyle = '#0A192F'
    ctx.beginPath()
    ctx.arc(0, 0, 14, Math.PI, 0)
    ctx.fill()
    // Cannon barrel
    ctx.rotate(-rad)
    ctx.fillStyle = '#002B66'
    ctx.fillRect(0, -6, 28, 12)
    ctx.restore()

    // Flying Ball
    const currentLoopT = totalT > 0 ? (t % (totalT + 0.8)) : 0
    const activeT = Math.min(currentLoopT, totalT)
    const ballX = startX + vx * activeT * scale
    const ballY = groundY - (vy * activeT - 0.5 * g * activeT * activeT) * scale

    // Projectile trail glow
    ctx.fillStyle = '#002B66'
    ctx.beginPath()
    ctx.arc(ballX, ballY, 7, 0, Math.PI * 2)
    ctx.fill()

    // Live Velocity Vector Arrows
    if (activeT < totalT) {
      const currVx = vx
      const currVy = vy - g * activeT
      ctx.strokeStyle = '#D97706'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(ballX, ballY)
      ctx.lineTo(ballX + currVx * 1.5, ballY - currVy * 1.5)
      ctx.stroke()
    }
  }

  // ── Renderer: Pendulum ──
  const renderPendulum = (ctx, w, h, p, t) => {
    const pivotX = w / 2
    const pivotY = 50
    const L_meters = p.length ?? 1.5
    const g = p.gravity ?? 9.8
    const theta0Deg = p.initialAngle ?? 25
    const theta0 = (theta0Deg * Math.PI) / 180
    const damping = p.damping ?? 0.01

    const omega = Math.sqrt(g / L_meters)
    const currentTheta = theta0 * Math.exp(-damping * t) * Math.cos(omega * t)

    const pixelLength = Math.min(h - 130, L_meters * 110)
    const bobX = pivotX + pixelLength * Math.sin(currentTheta)
    const bobY = pivotY + pixelLength * Math.cos(currentTheta)

    // Support bar
    ctx.fillStyle = '#002B66'
    ctx.fillRect(pivotX - 50, pivotY - 8, 100, 8)

    // Pivot pin
    ctx.fillStyle = '#D97706'
    ctx.beginPath()
    ctx.arc(pivotX, pivotY, 6, 0, Math.PI * 2)
    ctx.fill()

    // Equilibrium vertical reference
    ctx.strokeStyle = 'rgba(0, 43, 102, 0.15)'
    ctx.setLineDash([4, 4])
    ctx.beginPath()
    ctx.moveTo(pivotX, pivotY)
    ctx.lineTo(pivotX, pivotY + pixelLength + 20)
    ctx.stroke()
    ctx.setLineDash([])

    // String
    ctx.strokeStyle = '#002B66'
    ctx.lineWidth = 2.5
    ctx.beginPath()
    ctx.moveTo(pivotX, pivotY)
    ctx.lineTo(bobX, bobY)
    ctx.stroke()

    // Heavy Bob
    ctx.fillStyle = '#002B66'
    ctx.beginPath()
    ctx.arc(bobX, bobY, 18, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = '#FFFFFF'
    ctx.lineWidth = 2
    ctx.stroke()

    // Restoring Force Arrow
    const forceMag = -Math.sin(currentTheta) * 35
    ctx.strokeStyle = '#D97706'
    ctx.lineWidth = 2.5
    ctx.beginPath()
    ctx.moveTo(bobX, bobY)
    ctx.lineTo(bobX + forceMag * Math.cos(currentTheta), bobY - forceMag * Math.sin(currentTheta))
    ctx.stroke()
  }

  // ── Renderer: Snell Refraction ──
  const renderRefraction = (ctx, w, h, p, t) => {
    const centerY = h / 2
    const centerX = w / 2
    const theta1Deg = p.incidentAngle ?? 40
    const n1 = p.n1 ?? 1.0
    const n2 = p.n2 ?? 1.52
    const theta1Rad = (theta1Deg * Math.PI) / 180
    const sinTheta2 = (n1 / n2) * Math.sin(theta1Rad)
    const isTIR = sinTheta2 > 1.0

    // Top Medium (n1)
    ctx.fillStyle = '#FAF8F5'
    ctx.fillRect(0, 0, w, centerY)

    // Bottom Medium (n2)
    ctx.fillStyle = 'rgba(0, 43, 102, 0.08)'
    ctx.fillRect(0, centerY, w, h - centerY)

    // Boundary Line
    ctx.strokeStyle = '#002B66'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(0, centerY)
    ctx.lineTo(w, centerY)
    ctx.stroke()

    // Normal Line
    ctx.strokeStyle = 'rgba(0, 43, 102, 0.3)'
    ctx.setLineDash([4, 4])
    ctx.beginPath()
    ctx.moveTo(centerX, 20)
    ctx.lineTo(centerX, h - 20)
    ctx.stroke()
    ctx.setLineDash([])

    // Medium Labels
    ctx.fillStyle = '#002B66'
    ctx.font = 'bold 12px Inter, sans-serif'
    ctx.fillText(`Medium 1 (n₁ = ${n1.toFixed(2)})`, 20, centerY - 15)
    ctx.fillText(`Medium 2 (n₂ = ${n2.toFixed(2)})`, 20, centerY + 25)

    const rayLength = Math.min(w, h) * 0.38
    // Incident Ray
    const inX = centerX - rayLength * Math.sin(theta1Rad)
    const inY = centerY - rayLength * Math.cos(theta1Rad)
    ctx.strokeStyle = '#D97706'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(inX, inY)
    ctx.lineTo(centerX, centerY)
    ctx.stroke()

    // Refracted or Reflected Ray
    if (isTIR) {
      // Total Internal Reflection
      const tirX = centerX + rayLength * Math.sin(theta1Rad)
      const tirY = centerY - rayLength * Math.cos(theta1Rad)
      ctx.strokeStyle = '#DC2626'
      ctx.beginPath()
      ctx.moveTo(centerX, centerY)
      ctx.lineTo(tirX, tirY)
      ctx.stroke()
      ctx.fillStyle = '#DC2626'
      ctx.fillText('⚡ TOTAL INTERNAL REFLECTION', centerX + 10, centerY - 30)
    } else {
      const theta2Rad = Math.asin(sinTheta2)
      const outX = centerX + rayLength * Math.sin(theta2Rad)
      const outY = centerY + rayLength * Math.cos(theta2Rad)
      ctx.strokeStyle = '#002B66'
      ctx.beginPath()
      ctx.moveTo(centerX, centerY)
      ctx.lineTo(outX, outY)
      ctx.stroke()
    }
  }

  // ── Renderer: DC Circuit ──
  const renderCircuit = (ctx, w, h, p, t) => {
    const padX = 70
    const padY = 50
    const left = padX
    const right = w - padX
    const top = padY
    const bottom = h - padY

    // Circuit Wire Loop
    ctx.strokeStyle = '#002B66'
    ctx.lineWidth = 3
    ctx.strokeRect(left, top, right - left, bottom - top)

    // Battery on Left Wire
    const batY = (top + bottom) / 2
    ctx.fillStyle = '#FAF8F5'
    ctx.fillRect(left - 15, batY - 24, 30, 48)
    ctx.strokeStyle = '#002B66'
    ctx.lineWidth = 4
    ctx.beginPath()
    ctx.moveTo(left - 18, batY - 10)
    ctx.lineTo(left + 18, batY - 10)
    ctx.stroke()
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(left - 10, batY + 10)
    ctx.lineTo(left + 10, batY + 10)
    ctx.stroke()
    ctx.fillStyle = '#002B66'
    ctx.font = 'bold 11px Inter, sans-serif'
    ctx.fillText(`+ ${(p.voltage ?? 9)}V -`, left + 24, batY + 4)

    // Resistor on Right Wire (Zigzag)
    const resY = (top + bottom) / 2
    ctx.fillStyle = '#FAF8F5'
    ctx.fillRect(right - 20, resY - 30, 40, 60)
    ctx.strokeStyle = '#D97706'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(right, resY - 25)
    ctx.lineTo(right + 12, resY - 15)
    ctx.lineTo(right - 12, resY - 5)
    ctx.lineTo(right + 12, resY + 5)
    ctx.lineTo(right - 12, resY + 15)
    ctx.lineTo(right, resY + 25)
    ctx.stroke()
    ctx.fillStyle = '#D97706'
    ctx.fillText(`${p.resistance ?? 10} Ω`, right - 50, resY + 4)

    // Drifting Electron Particles
    const I = (p.voltage ?? 9) / ((p.resistance ?? 10) + (p.internalR ?? 0.5))
    const speed = I * 60
    const perimeter = 2 * (right - left + bottom - top)
    const particleCount = 18

    for (let i = 0; i < particleCount; i++) {
      const dist = ((i / particleCount) * perimeter + t * speed) % perimeter
      let px, py
      const topLen = right - left
      const rightLen = bottom - top
      const botLen = right - left

      if (dist < topLen) {
        px = left + dist
        py = top
      } else if (dist < topLen + rightLen) {
        px = right
        py = top + (dist - topLen)
      } else if (dist < topLen + rightLen + botLen) {
        px = right - (dist - topLen - rightLen)
        py = bottom
      } else {
        px = left
        py = bottom - (dist - topLen - rightLen - botLen)
      }

      ctx.fillStyle = '#3B82F6'
      ctx.beginPath()
      ctx.arc(px, py, 4, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  // ── Renderer: Buoyancy & Flotation ──
  const renderBuoyancy = (ctx, w, h, p, t) => {
    const isHotAirBalloon =
      p.balloonTemperature !== undefined ||
      p.airTemperature !== undefined ||
      p.tempInside !== undefined ||
      p.tempOutside !== undefined ||
      p.temperatureInside !== undefined ||
      p.temperatureOutside !== undefined ||
      p.balloonVolume !== undefined ||
      /balloon|air/i.test(`${topic} ${concept}`)

    const tInside = p.balloonTemperature ?? p.tempInside ?? p.temperatureInside ?? 95
    const tOutside = p.airTemperature ?? p.tempOutside ?? p.temperatureOutside ?? 10
    const rho_f = isHotAirBalloon
      ? 101325 / (287 * (tOutside + 273.15))
      : (p.fluidDensity ?? 1000)
    const rho_obj = isHotAirBalloon
      ? 101325 / (287 * (tInside + 273.15))
      : (p.objectDensity ?? 650)
    const V = p.balloonVolume ?? p.objectVolume ?? p.volume ?? (isHotAirBalloon ? 2200 : 0.1)
    const g = p.gravity ?? 9.8
    const Fb = rho_f * V * g
    const Fg = rho_obj * V * g
    const Fnet = Fb - Fg

    const centerX = w / 2
    const targetY = isHotAirBalloon
      ? (Fnet > 500 ? h * 0.22 : Fnet < -500 ? h * 0.72 : h * 0.46)
      : (Fnet > 5 ? h * 0.25 : Fnet < -5 ? h * 0.72 : h * 0.48)
    const y = targetY + Math.sin(t * 2) * 5

    if (isHotAirBalloon) {
      // Sky backdrop with warm morning horizon
      const skyGrad = ctx.createLinearGradient(0, 0, 0, h)
      skyGrad.addColorStop(0, '#BAE6FD')
      skyGrad.addColorStop(0.65, '#FEF3C7')
      skyGrad.addColorStop(1, '#FAF8F5')
      ctx.fillStyle = skyGrad
      ctx.fillRect(0, 0, w, h)

      // Mountain ridges on horizon
      ctx.fillStyle = 'rgba(0, 43, 102, 0.08)'
      ctx.beginPath()
      ctx.moveTo(0, h - 30)
      ctx.lineTo(80, h - 90)
      ctx.lineTo(190, h - 45)
      ctx.lineTo(310, h - 110)
      ctx.lineTo(440, h - 40)
      ctx.lineTo(w, h - 70)
      ctx.lineTo(w, h)
      ctx.lineTo(0, h)
      ctx.fill()

      // Clouds
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)'
      ctx.beginPath()
      ctx.arc(80, 50, 22, 0, Math.PI * 2)
      ctx.arc(105, 45, 28, 0, Math.PI * 2)
      ctx.arc(130, 50, 18, 0, Math.PI * 2)
      ctx.fill()

      ctx.beginPath()
      ctx.arc(w - 110, 65, 20, 0, Math.PI * 2)
      ctx.arc(w - 85, 60, 26, 0, Math.PI * 2)
      ctx.arc(w - 60, 65, 16, 0, Math.PI * 2)
      ctx.fill()

      // Hot air balloon
      ctx.save()
      ctx.translate(centerX, y)

      // Burner flame
      if (tInside > tOutside) {
        ctx.fillStyle = '#F97316'
        ctx.beginPath()
        ctx.moveTo(-5, 26)
        ctx.lineTo(0, 14 + Math.sin(t * 18) * 4)
        ctx.lineTo(5, 26)
        ctx.closePath()
        ctx.fill()

        ctx.fillStyle = '#FBBF24'
        ctx.beginPath()
        ctx.moveTo(-3, 26)
        ctx.lineTo(0, 18 + Math.sin(t * 22) * 3)
        ctx.lineTo(3, 26)
        ctx.closePath()
        ctx.fill()
      }

      // Balloon Envelope
      ctx.beginPath()
      ctx.arc(0, -18, 38, Math.PI * 0.15, Math.PI * 0.85, true)
      ctx.lineTo(0, 24)
      ctx.closePath()
      ctx.fillStyle = '#EF4444'
      ctx.fill()
      ctx.strokeStyle = '#002B66'
      ctx.lineWidth = 2
      ctx.stroke()

      // Vertical Gold Stripes
      ctx.beginPath()
      ctx.arc(0, -18, 18, Math.PI * 0.15, Math.PI * 0.85, true)
      ctx.lineTo(0, 24)
      ctx.closePath()
      ctx.fillStyle = '#F59E0B'
      ctx.fill()
      ctx.strokeStyle = '#002B66'
      ctx.lineWidth = 1
      ctx.stroke()

      // Basket
      ctx.fillStyle = '#78350F'
      ctx.fillRect(-10, 32, 20, 14)
      ctx.strokeStyle = '#002B66'
      ctx.lineWidth = 1.5
      ctx.strokeRect(-10, 32, 20, 14)

      // Rigging lines
      ctx.strokeStyle = '#002B66'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(-6, 24)
      ctx.lineTo(-8, 32)
      ctx.moveTo(6, 24)
      ctx.lineTo(8, 32)
      ctx.stroke()
      ctx.restore()
    } else {
      // Fluid tank
      const tankTop = h * 0.28
      const tankBottom = h - 25
      const tankLeft = 60
      const tankRight = w - 60

      const waterGrad = ctx.createLinearGradient(0, tankTop, 0, tankBottom)
      waterGrad.addColorStop(0, 'rgba(56, 189, 248, 0.35)')
      waterGrad.addColorStop(1, 'rgba(2, 132, 199, 0.65)')
      ctx.fillStyle = waterGrad
      ctx.fillRect(tankLeft, tankTop, tankRight - tankLeft, tankBottom - tankTop)
      ctx.strokeStyle = '#0284C7'
      ctx.lineWidth = 2.5
      ctx.strokeRect(tankLeft, tankTop, tankRight - tankLeft, tankBottom - tankTop)

      // Surface line with subtle wave
      ctx.strokeStyle = '#0284C7'
      ctx.lineWidth = 2
      ctx.beginPath()
      for (let x = tankLeft; x <= tankRight; x += 4) {
        const wy = tankTop + Math.sin((x * 0.05) + t * 3) * 2
        if (x === tankLeft) ctx.moveTo(x, wy)
        else ctx.lineTo(x, wy)
      }
      ctx.stroke()

      // Submerged box
      const boxSize = 44
      ctx.fillStyle = rho_obj < rho_f ? '#FDE047' : '#94A3B8'
      ctx.fillRect(centerX - boxSize / 2, y - boxSize / 2, boxSize, boxSize)
      ctx.strokeStyle = '#002B66'
      ctx.lineWidth = 2
      ctx.strokeRect(centerX - boxSize / 2, y - boxSize / 2, boxSize, boxSize)
    }

    // Force vectors (Fb up in green, Fg down in red)
    const arrowLenFb = isHotAirBalloon
      ? Math.min(Math.max(Fb / 450, 24), 72)
      : Math.min(Math.max(Fb * 0.06, 22), 70)
    const arrowLenFg = isHotAirBalloon
      ? Math.min(Math.max(Fg / 450, 24), 72)
      : Math.min(Math.max(Fg * 0.06, 22), 70)

    // Fb Arrow Up
    ctx.strokeStyle = '#10B981'
    ctx.fillStyle = '#10B981'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(centerX + 65, y)
    ctx.lineTo(centerX + 65, y - arrowLenFb)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(centerX + 60, y - arrowLenFb + 8)
    ctx.lineTo(centerX + 65, y - arrowLenFb)
    ctx.lineTo(centerX + 70, y - arrowLenFb + 8)
    ctx.fill()
    ctx.font = 'bold 11px Inter, sans-serif'
    const fbText = isHotAirBalloon && Fb > 1000 ? `${(Fb / 1000).toFixed(1)} kN` : `${Fb.toFixed(0)} N`
    ctx.fillText(`Fb (${fbText})`, centerX + 78, y - arrowLenFb / 2)

    // Fg Arrow Down
    ctx.strokeStyle = '#EF4444'
    ctx.fillStyle = '#EF4444'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(centerX - 65, y)
    ctx.lineTo(centerX - 65, y + arrowLenFg)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(centerX - 70, y + arrowLenFg - 8)
    ctx.lineTo(centerX - 65, y + arrowLenFg)
    ctx.lineTo(centerX - 60, y + arrowLenFg - 8)
    ctx.fill()
    const fgText = isHotAirBalloon && Fg > 1000 ? `${(Fg / 1000).toFixed(1)} kN` : `${Fg.toFixed(0)} N`
    ctx.fillText(`Fg (${fgText})`, centerX - 145, y + arrowLenFg / 2)
  }

  // ── Renderer: Harmonic Wave ──
  const renderWave = (ctx, w, h, p, t) => {
    const centerY = h / 2
    const A = Math.min(p.amplitude ?? 35, h * 0.35)
    const f = p.frequency ?? 1.5
    const lambda = p.wavelength ?? 140

    // Reference axis
    ctx.strokeStyle = '#CBD5E1'
    ctx.setLineDash([4, 4])
    ctx.beginPath()
    ctx.moveTo(30, centerY)
    ctx.lineTo(w - 30, centerY)
    ctx.stroke()
    ctx.setLineDash([])

    // Draw propagating wave
    ctx.strokeStyle = '#002B66'
    ctx.lineWidth = 3
    ctx.beginPath()
    for (let x = 30; x <= w - 30; x += 2) {
      const phase = 2 * Math.PI * ((x - 30) / lambda - f * t)
      const y = centerY + A * Math.sin(phase)
      if (x === 30) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.stroke()

    // Oscillating particle dots
    for (let x = 60; x < w - 40; x += lambda / 2) {
      const phase = 2 * Math.PI * ((x - 30) / lambda - f * t)
      const y = centerY + A * Math.sin(phase)
      ctx.fillStyle = '#D97706'
      ctx.beginPath()
      ctx.arc(x, y, 5, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  // ── Renderer: Bouncing Ball with Restitution ──
  const renderBouncingBall = (ctx, w, h, p, t) => {
    const groundY = h - 50
    const dropH = p.height ?? p.dropHeight ?? 1.5
    const cor = p.COR ?? p.cor ?? p.restitution ?? 0.72
    const g = p.gravity ?? 9.8

    // Draw ground
    ctx.strokeStyle = '#002B66'
    ctx.lineWidth = 2.5
    ctx.beginPath()
    ctx.moveTo(30, groundY)
    ctx.lineTo(w - 30, groundY)
    ctx.stroke()
    ctx.fillStyle = 'rgba(0, 43, 102, 0.05)'
    ctx.fillRect(30, groundY, w - 60, 40)

    const maxPixels = h * 0.55
    const scale = maxPixels / Math.max(dropH, 0.5)

    const tDrop = Math.sqrt((2 * dropH) / g)
    const vBounce1 = cor * Math.sqrt(2 * g * dropH)
    const tBounce1 = (2 * vBounce1) / g
    const cycleTotal = tDrop + tBounce1 + 0.6
    const cycleT = t % cycleTotal

    let curY, r = 16
    const ballX = w / 2

    if (cycleT < tDrop) {
      const d = 0.5 * g * cycleT * cycleT
      curY = (groundY - dropH * scale) + d * scale
    } else if (cycleT < tDrop + tBounce1) {
      const tb = cycleT - tDrop
      const d = vBounce1 * tb - 0.5 * g * tb * tb
      curY = groundY - d * scale
    } else {
      curY = groundY - r
    }

    const isImpact = Math.abs(curY - (groundY - r)) < 6
    const rx = isImpact ? r * 1.3 : r
    const ry = isImpact ? r * 0.7 : r

    // Ghost bounce paths
    const h1 = dropH * cor * cor
    ctx.strokeStyle = 'rgba(217, 119, 6, 0.35)'
    ctx.setLineDash([4, 4])
    ctx.beginPath()
    ctx.moveTo(ballX - 70, groundY - dropH * scale)
    ctx.lineTo(ballX - 70, groundY)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(ballX + 70, groundY - h1 * scale)
    ctx.lineTo(ballX + 70, groundY)
    ctx.stroke()
    ctx.setLineDash([])

    ctx.fillStyle = '#64748B'
    ctx.font = '10px Inter, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(`Drop: ${dropH.toFixed(1)}m`, ballX - 70, groundY - dropH * scale - 8)
    ctx.fillText(`1st Bounce: ${h1.toFixed(2)}m`, ballX + 70, groundY - h1 * scale - 8)

    // Ball
    ctx.fillStyle = '#002B66'
    ctx.beginPath()
    ctx.ellipse(ballX, Math.min(curY, groundY - ry), rx, ry, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = '#D97706'
    ctx.lineWidth = 2
    ctx.stroke()

    ctx.fillStyle = '#002B66'
    ctx.font = 'bold 11px Inter, sans-serif'
    ctx.fillText(`Restitution COR: ${cor.toFixed(2)}  (Energy: ${(cor * cor * 100).toFixed(0)}%)`, w / 2, 28)
  }

  // ── Renderer: Hooke's Law Spring-Mass System ──
  const renderSpring = (ctx, w, h, p, t) => {
    const k = p.k ?? 25
    const m = p.mass ?? 1.0
    const A = (p.amplitude ?? 0.4) * 110
    const b = p.damping ?? 0.04
    const omega = Math.sqrt(k / m)

    const x = A * Math.cos(omega * t) * Math.exp(-b * t * 0.25)
    const centerY = h * 0.52
    const wallX = 50
    const eqX = w * 0.52
    const blockX = eqX + x
    const blockSize = 46

    // Floor
    ctx.strokeStyle = '#002B66'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(wallX, centerY + blockSize / 2)
    ctx.lineTo(w - 30, centerY + blockSize / 2)
    ctx.stroke()

    // Wall
    ctx.fillStyle = '#E2E8F0'
    ctx.fillRect(wallX - 16, centerY - 55, 16, 110)
    ctx.strokeStyle = '#002B66'
    ctx.lineWidth = 2
    ctx.strokeRect(wallX - 16, centerY - 55, 16, 110)

    // Spring coils
    const springStart = wallX
    const springEnd = blockX - blockSize / 2
    const springLen = springEnd - springStart
    const coils = 12
    ctx.strokeStyle = '#D97706'
    ctx.lineWidth = 3.5
    ctx.lineJoin = 'round'
    ctx.beginPath()
    ctx.moveTo(springStart, centerY)
    for (let i = 1; i <= coils; i++) {
      const cx = springStart + (i / coils) * springLen
      const cy = centerY + (i % 2 === 1 ? -15 : 15)
      if (i === coils) ctx.lineTo(springEnd, centerY)
      else ctx.lineTo(cx, cy)
    }
    ctx.stroke()

    // Block
    ctx.fillStyle = '#002B66'
    ctx.fillRect(blockX - blockSize / 2, centerY - blockSize / 2, blockSize, blockSize)
    ctx.fillStyle = '#FFFFFF'
    ctx.font = 'bold 11px Inter, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(`${m.toFixed(1)} kg`, blockX, centerY + 4)

    // Equilibrium marker
    ctx.strokeStyle = '#94A3B8'
    ctx.setLineDash([4, 4])
    ctx.beginPath()
    ctx.moveTo(eqX, centerY - 45)
    ctx.lineTo(eqX, centerY + 45)
    ctx.stroke()
    ctx.setLineDash([])
    ctx.fillStyle = '#64748B'
    ctx.font = '10px Inter, sans-serif'
    ctx.fillText('Equilibrium (x=0)', eqX, centerY - 50)

    // Restoring force arrow
    const F = -k * (x / 110)
    const arrowLen = Math.min(Math.max(Math.abs(F) * 3, 14), 85)
    const arrowDir = F >= 0 ? 1 : -1
    ctx.strokeStyle = '#10B981'
    ctx.fillStyle = '#10B981'
    ctx.lineWidth = 2.5
    ctx.beginPath()
    ctx.moveTo(blockX, centerY - blockSize / 2 - 12)
    ctx.lineTo(blockX + arrowDir * arrowLen, centerY - blockSize / 2 - 12)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(blockX + arrowDir * arrowLen, centerY - blockSize / 2 - 12)
    ctx.lineTo(blockX + arrowDir * (arrowLen - 6), centerY - blockSize / 2 - 16)
    ctx.lineTo(blockX + arrowDir * (arrowLen - 6), centerY - blockSize / 2 - 8)
    ctx.fill()
    ctx.fillText(`F = ${Math.abs(F).toFixed(1)} N`, blockX + arrowDir * (arrowLen / 2), centerY - blockSize / 2 - 18)
  }

  // ── Renderer: Linear Collision & Momentum ──
  const renderCollision = (ctx, w, h, p, t) => {
    const m1 = p.m1 ?? 2.0
    const v1 = p.v1 ?? 6.0
    const m2 = p.m2 ?? 3.0
    const cor = p.cor ?? p.COR ?? 0.85

    const centerY = h * 0.55
    const r1 = Math.min(Math.max(16 + m1 * 2, 18), 32)
    const r2 = Math.min(Math.max(16 + m2 * 2, 18), 32)

    // Track
    ctx.strokeStyle = '#002B66'
    ctx.lineWidth = 2.5
    ctx.beginPath()
    ctx.moveTo(30, centerY + 30)
    ctx.lineTo(w - 30, centerY + 30)
    ctx.stroke()

    const cycleTime = 4.0
    const phase = t % cycleTime
    const impactTime = 1.8

    const v1f = ((m1 - cor * m2) * v1) / (m1 + m2)
    const v2f = ((1 + cor) * m1 * v1) / (m1 + m2)

    let x1, x2
    const meetX = w * 0.48
    if (phase < impactTime) {
      const progress = phase / impactTime
      x1 = 60 + progress * (meetX - r1 - 60)
      x2 = meetX + r2
    } else {
      const postT = phase - impactTime
      x1 = (meetX - r1) + v1f * postT * 18
      x2 = (meetX + r2) + v2f * postT * 18

      if (postT < 0.25) {
        ctx.fillStyle = `rgba(245, 158, 11, ${(0.25 - postT) * 3})`
        ctx.beginPath()
        ctx.arc(meetX, centerY, 36, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    // Sphere 1
    ctx.fillStyle = '#002B66'
    ctx.beginPath()
    ctx.arc(x1, centerY, r1, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = '#FAF8F5'
    ctx.lineWidth = 1.5
    ctx.stroke()
    ctx.fillStyle = '#FFFFFF'
    ctx.font = 'bold 10px Inter, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(`${m1}kg`, x1, centerY + 3)

    // Sphere 2
    ctx.fillStyle = '#D97706'
    ctx.beginPath()
    ctx.arc(x2, centerY, r2, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = '#FAF8F5'
    ctx.lineWidth = 1.5
    ctx.stroke()
    ctx.fillStyle = '#FFFFFF'
    ctx.fillText(`${m2}kg`, x2, centerY + 3)

    const curV1 = phase < impactTime ? v1 : v1f
    const curV2 = phase < impactTime ? 0 : v2f

    if (Math.abs(curV1) > 0.1) {
      const len1 = Math.min(Math.abs(curV1) * 7, 50) * (curV1 >= 0 ? 1 : -1)
      ctx.strokeStyle = '#3B82F6'
      ctx.fillStyle = '#3B82F6'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(x1, centerY - r1 - 10)
      ctx.lineTo(x1 + len1, centerY - r1 - 10)
      ctx.stroke()
      ctx.font = '10px Inter, sans-serif'
      ctx.fillText(`${curV1.toFixed(1)} m/s`, x1 + len1 / 2, centerY - r1 - 15)
    }

    if (Math.abs(curV2) > 0.1) {
      const len2 = Math.min(Math.abs(curV2) * 7, 50) * (curV2 >= 0 ? 1 : -1)
      ctx.strokeStyle = '#10B981'
      ctx.fillStyle = '#10B981'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(x2, centerY - r2 - 10)
      ctx.lineTo(x2 + len2, centerY - r2 - 10)
      ctx.stroke()
      ctx.font = '10px Inter, sans-serif'
      ctx.fillText(`${curV2.toFixed(1)} m/s`, x2 + len2 / 2, centerY - r2 - 15)
    }
  }

  // ── Renderer: Gravitation & Orbit ──
  const renderGravity = (ctx, w, h, p, t) => {
    const M = p.centralMass ?? 6.0
    const r = Math.min(Math.max(p.orbitRadius ?? 130, 60), Math.min(w, h) * 0.42)
    const ecc = p.eccentricity ?? 0.12
    const centerX = w / 2
    const centerY = h / 2

    // Space backdrop
    ctx.fillStyle = '#050B14'
    ctx.fillRect(0, 0, w, h)

    // Stars
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)'
    for (let i = 0; i < 35; i++) {
      const sx = ((i * 97) % w)
      const sy = ((i * 73) % h)
      ctx.fillRect(sx, sy, 1.5, 1.5)
    }

    // Orbit ellipse
    const a = r
    const b = r * Math.sqrt(Math.max(1 - ecc * ecc, 0.2))
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)'
    ctx.lineWidth = 1.5
    ctx.setLineDash([4, 4])
    ctx.beginPath()
    ctx.ellipse(centerX, centerY, a, b, 0, 0, Math.PI * 2)
    ctx.stroke()
    ctx.setLineDash([])

    // Central Star/Planet
    const planetRadius = Math.min(18 + M * 1.5, 34)
    const sunGrad = ctx.createRadialGradient(centerX, centerY, 4, centerX, centerY, planetRadius + 12)
    sunGrad.addColorStop(0, '#F59E0B')
    sunGrad.addColorStop(0.5, '#D97706')
    sunGrad.addColorStop(1, 'rgba(217, 119, 6, 0)')
    ctx.fillStyle = sunGrad
    ctx.beginPath()
    ctx.arc(centerX, centerY, planetRadius + 12, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#F59E0B'
    ctx.beginPath()
    ctx.arc(centerX, centerY, planetRadius, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = '#FFFFFF'
    ctx.lineWidth = 1.5
    ctx.stroke()

    // Satellite
    const angle = t * 1.2
    const satX = centerX + a * Math.cos(angle)
    const satY = centerY + b * Math.sin(angle)

    ctx.fillStyle = '#38BDF8'
    ctx.beginPath()
    ctx.arc(satX, satY, 6, 0, Math.PI * 2)
    ctx.fill()

    // Gravity pull vector
    ctx.strokeStyle = '#EF4444'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(satX, satY)
    const dx = centerX - satX
    const dy = centerY - satY
    const dist = Math.hypot(dx, dy)
    ctx.lineTo(satX + (dx / dist) * 26, satY + (dy / dist) * 26)
    ctx.stroke()

    // Tangent velocity vector
    ctx.strokeStyle = '#10B981'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(satX, satY)
    ctx.lineTo(satX - Math.sin(angle) * 22, satY + Math.cos(angle) * 22)
    ctx.stroke()
  }

  const containerStyle = isFullscreen
    ? {
        position: 'fixed',
        inset: '24px',
        zIndex: 9999,
        background: '#FAF8F5',
        borderRadius: 16,
        boxShadow: '0 24px 64px rgba(0, 0, 0, 0.45)',
        border: '1.5px solid rgba(0, 43, 102, 0.25)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }
    : inline
    ? {
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        background: '#FAF8F5',
        borderRadius: 12,
        border: '1.5px solid rgba(0, 43, 102, 0.14)',
        boxShadow: '0 3px 12px rgba(0, 43, 102, 0.05)',
        overflow: 'hidden',
        marginTop: 10
      }
    : {
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: '#FAF8F5',
        border: '1px solid rgba(0, 43, 102, 0.16)',
        boxShadow: '0 4px 20px rgba(0, 43, 102, 0.06)',
        overflow: 'hidden'
      }

  return (
    <>
      {isFullscreen && (
        <div
          onClick={() => setIsFullscreen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(5px)',
            zIndex: 9998
          }}
        />
      )}
      <div style={containerStyle}>
        {/* ── Visual Stage Header Bar ── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: inline && !isFullscreen ? '8px 14px' : '10px 18px',
            background: '#FFFFFF',
            borderBottom: '1px solid rgba(0, 43, 102, 0.08)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: isPlaying ? '#10B981' : '#F59E0B',
                boxShadow: isPlaying ? '0 0 8px rgba(16, 185, 129, 0.5)' : 'none'
              }}
            />
            <span style={{ fontSize: inline && !isFullscreen ? 12 : 13, fontWeight: 700, color: '#002B66' }}>
              Interactive 2D Simulation
            </span>
            <span style={{
              fontSize: 10,
              fontWeight: 700,
              color: '#002B66',
              background: 'rgba(0, 43, 102, 0.07)',
              padding: '1px 6px',
              borderRadius: 4,
              textTransform: 'uppercase'
            }}>
              {visualType}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              style={{
                padding: '4px 10px',
                background: isPlaying ? '#FFFFFF' : '#002B66',
                border: '1px solid #002B66',
                color: isPlaying ? '#002B66' : '#FFFFFF',
                fontWeight: 700,
                fontSize: 11.5,
                borderRadius: 4,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                transition: 'all 0.15s ease'
              }}
            >
              {isPlaying ? <Pause size={12} /> : <Play size={12} />}
              <span>{isPlaying ? 'Pause' : 'Play'}</span>
            </button>

            <button
              onClick={handleReset}
              style={{
                padding: '4px 9px',
                background: '#FAF8F5',
                border: '1px solid rgba(0, 43, 102, 0.2)',
                color: '#002B66',
                fontWeight: 600,
                fontSize: 11.5,
                borderRadius: 4,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                transition: 'all 0.15s ease'
              }}
            >
              <RotateCcw size={12} />
              <span>Reset</span>
            </button>

            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              title={isFullscreen ? "Exit Fullscreen" : "Expand Simulation"}
              style={{
                padding: '4px 8px',
                background: '#FAF8F5',
                border: '1px solid rgba(0, 43, 102, 0.2)',
                color: '#002B66',
                fontWeight: 600,
                fontSize: 11.5,
                borderRadius: 4,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                transition: 'all 0.15s ease'
              }}
            >
              {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
            </button>
          </div>
        </div>

        {/* ── Main Canvas Viewport ── */}
        <div style={{
          flex: isFullscreen || !inline ? 1 : 'none',
          height: isFullscreen ? 'auto' : inline ? 260 : 'auto',
          minHeight: isFullscreen ? 380 : inline ? 240 : 280,
          position: 'relative'
        }}>
          <canvas
            ref={canvasRef}
            style={{ width: '100%', height: '100%', display: 'block' }}
          />

          {/* Live Telemetry Floating Strip */}
          <div
            style={{
              position: 'absolute',
              bottom: 8,
              left: 10,
              right: 10,
              background: 'rgba(255, 255, 255, 0.94)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(0, 43, 102, 0.12)',
              borderRadius: 6,
              padding: '5px 10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-around',
              flexWrap: 'wrap',
              gap: 8,
              fontSize: 11.5,
              color: '#002B66',
              fontWeight: 600,
              boxShadow: '0 3px 10px rgba(0, 43, 102, 0.06)'
            }}
          >
            {Object.entries(telemetry).map(([key, val]) => (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ color: '#64748B', textTransform: 'uppercase', fontSize: 9.5, fontWeight: 700 }}>
                  {key.replace(/([A-Z])/g, ' $1')}:
                </span>
                <strong style={{ color: '#002B66', fontFamily: 'monospace', fontSize: 11.5 }}>
                  {val}
                </strong>
              </div>
            ))}
          </div>
        </div>

        {/* ── Interactive Sliders Control Panel ── */}
        {sliders?.length > 0 && (
          <div
            style={{
              background: '#FFFFFF',
              borderTop: '1px solid rgba(0, 43, 102, 0.12)',
              padding: inline && !isFullscreen ? '10px 14px' : '12px 18px',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: inline && !isFullscreen ? 10 : 14
            }}
          >
            {sliders.map(s => {
              const val = params[s.id] ?? s.default
              return (
                <div key={s.id} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 700, color: '#002B66' }}>
                    <span>{s.label}</span>
                    <span style={{ fontFamily: 'monospace', color: '#D97706' }}>
                      {val} {s.unit}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={s.min}
                    max={s.max}
                    step={s.step}
                    value={val}
                    onChange={e => handleSliderChange(s.id, e.target.value)}
                    style={{
                      width: '100%',
                      accentColor: '#002B66',
                      cursor: 'pointer'
                    }}
                  />
                </div>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}
