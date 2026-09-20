/**
 * VISIORA ATELIER — Native 2D Energy Transformation Systems Engine
 * Models multi-stage energy conversion chains:
 * Source (Bicycle / Faucet / Sun / Kettle) ->
 * Converter (Turbine Generator / Solar Cell) ->
 * Output (Water Heater / Incandescent Bulb / Fluorescent Bulb / Fan).
 * Features live animated colored [E] energy symbols showing energy conservation.
 */

import React, { useRef, useEffect, useState } from 'react'

export default function EnergySystemsCanvas({
  showEnergySymbols = true,
  isPaused = false,
  simSpeed = 1.0,
  onTelemetryUpdate
}) {
  const canvasRef = useRef(null)

  // System Setup Selection
  const [sourceType, setSourceType] = useState('bicycle') // 'bicycle' | 'faucet' | 'sun' | 'kettle'
  const [converterType, setConverterType] = useState('generator') // 'generator' | 'solar'
  const [outputType, setOutputType] = useState('water') // 'water' | 'incandescent' | 'fluorescent' | 'fan'

  // Variable Inputs
  const [sourceInputLevel, setSourceInputLevel] = useState(65) // 0 to 100%

  // Simulation State Refs
  const stateRef = useRef({
    wheelAngle: 0,
    fanAngle: 0,
    waterTemp: 22,
    steamClouds: [],
    waterDrops: [],
    sunPhotons: [],
    energyPackets: [],
    lastTime: performance.now()
  })

  // Spawn Energy Packets Loop
  useEffect(() => {
    const interval = setInterval(() => {
      if (isPaused || sourceInputLevel <= 5) return
      const s = stateRef.current
      const rate = sourceInputLevel / 100

      // Only spawn if valid configuration
      // E.g. Solar panel needs Sun, Generator needs physical kinetic inputs
      if (converterType === 'solar' && sourceType !== 'sun') return
      if (converterType === 'generator' && sourceType === 'sun') return

      // Spawn at source
      if (s.energyPackets.length < 35) {
        let initialType = 'mechanical' // gray
        if (sourceType === 'bicycle') initialType = 'chemical' // green
        if (sourceType === 'sun') initialType = 'light' // yellow
        if (sourceType === 'kettle') initialType = 'thermal' // orange

        s.energyPackets.push({
          id: Math.random(),
          stage: 'source', // 'source' -> 'cable' -> 'output' -> 'spent'
          x: 180 + (Math.random() - 0.5) * 40,
          y: 300 + (Math.random() - 0.5) * 40,
          type: initialType,
          progress: 0
        })
      }
    }, 280)
    return () => clearInterval(interval)
  }, [isPaused, sourceInputLevel, sourceType, converterType])

  // Main Canvas Loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let animationId

    const step = (currentTime) => {
      const dt = Math.min((currentTime - stateRef.current.lastTime) / 1000, 0.05) * simSpeed
      stateRef.current.lastTime = currentTime
      const s = stateRef.current

      const inputRatio = sourceInputLevel / 100
      const isCompatible = (converterType === 'solar' && sourceType === 'sun') || (converterType === 'generator' && sourceType !== 'sun')
      const activePower = isCompatible ? inputRatio * 500 : 0 // Watts

      if (!isPaused) {
        // Spin wheels
        if (converterType === 'generator' && sourceType !== 'sun') {
          s.wheelAngle += dt * inputRatio * 12
        }
        if (outputType === 'fan' && activePower > 10) {
          s.fanAngle += dt * (activePower / 500) * 20
        }

        // Water heater temp increase
        if (outputType === 'water') {
          if (activePower > 10) {
            s.waterTemp = Math.min(100, s.waterTemp + dt * (activePower / 500) * 1.5)
          } else {
            s.waterTemp = Math.max(22, s.waterTemp - dt * 0.4) // natural cooling
          }
        }

        // Faucet droplets
        if (sourceType === 'faucet' && inputRatio > 0.05) {
          if (Math.random() < inputRatio * 0.8) {
            s.waterDrops.push({ x: 215 + (Math.random() - 0.5) * 8, y: 190, vy: 5 + inputRatio * 5 })
          }
        }
        s.waterDrops.forEach(d => { d.y += d.vy })
        s.waterDrops = s.waterDrops.filter(d => d.y < 330)

        // Sun Photons
        if (sourceType === 'sun' && inputRatio > 0.05) {
          if (Math.random() < inputRatio * 0.6) {
            s.sunPhotons.push({
              x: 180 + Math.random() * 80,
              y: 160,
              vx: 3 + Math.random() * 2,
              vy: 2.5 + Math.random() * 2
            })
          }
        }
        s.sunPhotons.forEach(p => { p.x += p.vx; p.y += p.vy })
        s.sunPhotons = s.sunPhotons.filter(p => p.x < 500 && p.y < 360)

        // Steam from Kettle
        if (sourceType === 'kettle' && inputRatio > 0.05) {
          if (Math.random() < inputRatio * 0.7) {
            s.steamClouds.push({
              x: 245,
              y: 260,
              vx: 4 + inputRatio * 4,
              vy: (Math.random() - 0.5) * 1.5,
              size: 6,
              alpha: 0.8
            })
          }
        }
        s.steamClouds.forEach(c => {
          c.x += c.vx
          c.y += c.vy
          c.size += 0.4
          c.alpha -= 0.02
        })
        s.steamClouds = s.steamClouds.filter(c => c.alpha > 0.05)

        // Move Energy Packets
        s.energyPackets.forEach(pkt => {
          pkt.progress += dt * 0.45 * (0.5 + inputRatio * 0.8)

          // Transmission trajectory: Source (x: 200, y: 280) -> Converter (x: 460, y: 280) -> Output (x: 740, y: 260)
          if (pkt.progress < 0.35) {
            // In source / moving to converter
            const t = pkt.progress / 0.35
            pkt.x = 200 + t * 240
            pkt.y = 280 + Math.sin(t * Math.PI) * -20
          } else if (pkt.progress < 0.7) {
            // Electrical Cable: Converter to Output
            pkt.type = 'electrical' // Transformed to electricity in converter!
            const t = (pkt.progress - 0.35) / 0.35
            pkt.x = 440 + t * 280
            pkt.y = 350 + Math.sin(t * 8) * 4
          } else if (pkt.progress <= 1.0) {
            // At Output: converts to final form
            if (outputType === 'water') pkt.type = 'thermal'
            else if (outputType === 'incandescent') pkt.type = Math.random() > 0.3 ? 'thermal' : 'light'
            else if (outputType === 'fluorescent') pkt.type = Math.random() > 0.15 ? 'light' : 'thermal'
            else if (outputType === 'fan') pkt.type = 'mechanical'

            const t = (pkt.progress - 0.7) / 0.3
            pkt.x = 720 + t * 60 + (Math.random() - 0.5) * 10
            pkt.y = 250 - t * 60 + (Math.random() - 0.5) * 10
          }
        })
        s.energyPackets = s.energyPackets.filter(pkt => pkt.progress <= 1.0)

        // Telemetry
        if (onTelemetryUpdate) {
          const eff = outputType === 'fluorescent' ? 88 : outputType === 'incandescent' ? 22 : outputType === 'fan' ? 74 : 95
          onTelemetryUpdate({
            inputPower: (inputRatio * 500).toFixed(0),
            generatedPower: activePower.toFixed(0),
            systemEfficiency: isCompatible ? eff : 0,
            activeOutput: outputType
          })
        }
      }

      // Render
      render(ctx, s, activePower, isCompatible)
      animationId = requestAnimationFrame(step)
    }

    animationId = requestAnimationFrame(step)
    return () => cancelAnimationFrame(animationId)
  }, [sourceType, converterType, outputType, sourceInputLevel, isPaused, simSpeed, onTelemetryUpdate])

  // ── Render Function ──
  const render = (ctx, s, activePower, isCompatible) => {
    const width = 1000
    const height = 540

    ctx.clearRect(0, 0, width, height)

    // Background Studio Wall
    const bg = ctx.createLinearGradient(0, 0, 0, 440)
    bg.addColorStop(0, '#FAF5EB')
    bg.addColorStop(1, '#F3EBDD')
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, width, 440)

    // Table
    ctx.fillStyle = '#E5D8C5'
    ctx.fillRect(0, 440, width, 100)
    ctx.fillStyle = '#D6C6B0'
    ctx.fillRect(0, 440, width, 6)

    // 1. Render Energy Source Station (Left: x ~ 100-300)
    ctx.fillStyle = '#111827'
    ctx.font = 'bold 11px sans-serif'
    ctx.fillText('1. ENERGY SOURCE', 140, 60)

    if (sourceType === 'bicycle') {
      // Bicycle Frame & Rider
      ctx.strokeStyle = '#2563EB'
      ctx.lineWidth = 4
      // Rear wheel
      ctx.beginPath(); ctx.arc(200, 340, 36, 0, Math.PI * 2); ctx.stroke()
      // Front wheel
      ctx.beginPath(); ctx.arc(90, 340, 36, 0, Math.PI * 2); ctx.stroke()
      // Frame
      ctx.beginPath()
      ctx.moveTo(90, 340); ctx.lineTo(145, 270); ctx.lineTo(165, 340); ctx.lineTo(200, 340); ctx.lineTo(145, 270)
      ctx.stroke()
      // Pedaling belt connecting to generator
      if (converterType === 'generator') {
        ctx.strokeStyle = '#1F2937'
        ctx.lineWidth = 2.5
        ctx.beginPath(); ctx.moveTo(200, 304); ctx.lineTo(440, 240); ctx.stroke()
        ctx.beginPath(); ctx.moveTo(200, 376); ctx.lineTo(440, 320); ctx.stroke()
      }
      // Rider Stylized Body
      ctx.fillStyle = '#DC2626'
      ctx.beginPath(); ctx.arc(150, 215, 12, 0, Math.PI * 2); ctx.fill() // Head
      ctx.strokeStyle = '#1E3A8A'
      ctx.lineWidth = 6
      ctx.beginPath(); ctx.moveTo(150, 227); ctx.lineTo(158, 265); ctx.lineTo(165, 335); ctx.stroke()
    } else if (sourceType === 'faucet') {
      // Water Faucet
      ctx.fillStyle = '#4B5563'
      ctx.fillRect(160, 110, 80, 24)
      ctx.fillRect(210, 134, 30, 45) // Spout
      // Water drops
      ctx.fillStyle = 'rgba(56, 189, 248, 0.85)'
      s.waterDrops.forEach(d => {
        ctx.beginPath(); ctx.arc(d.x, d.y, 4, 0, Math.PI * 2); ctx.fill()
      })
    } else if (sourceType === 'sun') {
      // Radiating Sun
      ctx.fillStyle = '#F59E0B'
      ctx.beginPath(); ctx.arc(160, 140, 35, 0, Math.PI * 2); ctx.fill()
      // Sunbeams / Photons
      ctx.fillStyle = '#FDE047'
      s.sunPhotons.forEach(p => {
        ctx.beginPath(); ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2); ctx.fill()
      })
    } else if (sourceType === 'kettle') {
      // Tea Kettle on Burner
      ctx.fillStyle = '#B91C1C'
      ctx.fillRect(160, 380, 70, 30) // Stand
      ctx.fillStyle = '#374151'
      ctx.beginPath(); ctx.arc(195, 330, 32, 0, Math.PI * 2); ctx.fill() // Kettle
      ctx.fillRect(215, 305, 35, 12) // Spout
      // Steam clouds
      s.steamClouds.forEach(c => {
        ctx.beginPath()
        ctx.arc(c.x, c.y, c.size, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255, 255, 255, ${c.alpha})`
        ctx.fill()
      })
    }

    // 2. Render Energy Converter Station (Center: x ~ 400-500)
    ctx.fillStyle = '#111827'
    ctx.font = 'bold 11px sans-serif'
    ctx.fillText('2. ENERGY CONVERTER', 410, 60)

    if (converterType === 'generator') {
      // Generator Box
      ctx.fillStyle = '#E5E7EB'
      ctx.strokeStyle = '#4B5563'
      ctx.lineWidth = 3
      ctx.fillRect(410, 210, 85, 130)
      ctx.strokeRect(410, 210, 85, 130)

      // Turbine Wheel
      ctx.save()
      ctx.translate(452, 275)
      ctx.rotate(s.wheelAngle)
      ctx.beginPath(); ctx.arc(0, 0, 36, 0, Math.PI * 2); ctx.stroke()
      // Spokes
      for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * 36, Math.sin(a) * 36); ctx.stroke()
      }
      ctx.restore()

      ctx.font = 'bold 10px sans-serif'
      ctx.fillStyle = '#374151'
      ctx.fillText('GENERATOR', 422, 326)
    } else {
      // Solar Panel
      ctx.fillStyle = '#1E3A8A'
      ctx.strokeStyle = '#93C5FD'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(420, 230); ctx.lineTo(490, 210); ctx.lineTo(480, 320); ctx.lineTo(410, 330)
      ctx.closePath(); ctx.fill(); ctx.stroke()
      ctx.font = 'bold 10px sans-serif'
      ctx.fillStyle = '#FFFFFF'
      ctx.fillText('SOLAR CELL', 416, 280)
    }

    // Heavy Electrical Cable to Output (Black Cable)
    ctx.strokeStyle = '#1F2937'
    ctx.lineWidth = 5
    ctx.beginPath()
    ctx.moveTo(495, 340)
    ctx.quadraticCurveTo(600, 390, 710, 340)
    ctx.stroke()

    // 3. Render Energy Output / User (Right: x ~ 680-880)
    ctx.fillStyle = '#111827'
    ctx.font = 'bold 11px sans-serif'
    ctx.fillText('3. ENERGY OUTPUT', 730, 60)

    if (outputType === 'water') {
      // Immersion Heater in Water Beaker
      ctx.fillStyle = 'rgba(56, 189, 248, 0.4)'
      ctx.fillRect(710, 240, 85, 110)
      ctx.strokeStyle = '#1F2937'
      ctx.lineWidth = 2
      ctx.strokeRect(710, 240, 85, 110)
      // Heating coil inside beaker
      ctx.strokeStyle = activePower > 20 ? '#EF4444' : '#4B5563'
      ctx.lineWidth = 4
      ctx.beginPath()
      ctx.arc(752, 310, 22, 0, Math.PI * 2)
      ctx.stroke()
      // Temp display
      ctx.font = 'bold 12px monospace'
      ctx.fillStyle = '#002B66'
      ctx.fillText(`${s.waterTemp.toFixed(1)}°C`, 735, 230)
    } else if (outputType === 'incandescent') {
      // Incandescent Bulb
      ctx.fillStyle = activePower > 10 ? 'rgba(254, 240, 138, 0.6)' : 'rgba(255, 255, 255, 0.6)'
      ctx.beginPath(); ctx.arc(752, 270, 35, 0, Math.PI * 2); ctx.fill()
      ctx.strokeStyle = '#4B5563'; ctx.lineWidth = 2; ctx.stroke()
      // Glow rays if active
      if (activePower > 10) {
        ctx.strokeStyle = '#EAB308'
        ctx.lineWidth = 2
        for (let a = 0; a < Math.PI * 2; a += Math.PI / 6) {
          ctx.beginPath()
          ctx.moveTo(752 + Math.cos(a) * 40, 270 + Math.sin(a) * 40)
          ctx.lineTo(752 + Math.cos(a) * 55, 270 + Math.sin(a) * 55)
          ctx.stroke()
        }
      }
    } else if (outputType === 'fluorescent') {
      // Fluorescent Spiral Tube
      ctx.fillStyle = activePower > 10 ? 'rgba(240, 253, 250, 0.9)' : 'rgba(229, 231, 235, 0.6)'
      ctx.fillRect(735, 240, 34, 70)
      ctx.strokeStyle = activePower > 10 ? '#38BDF8' : '#6B7280'
      ctx.lineWidth = 2; ctx.strokeRect(735, 240, 34, 70)
      if (activePower > 10) {
        ctx.font = 'bold 10px sans-serif'; ctx.fillStyle = '#0284C7'; ctx.fillText('90% LUMENS', 720, 230)
      }
    } else if (outputType === 'fan') {
      // Fan Stand & Blades
      ctx.fillStyle = '#374151'
      ctx.fillRect(748, 300, 8, 80)
      ctx.fillRect(730, 375, 44, 8)
      // Fan Propeller
      ctx.save()
      ctx.translate(752, 270)
      ctx.rotate(s.fanAngle)
      ctx.fillStyle = '#2563EB'
      for (let i = 0; i < 3; i++) {
        ctx.rotate((Math.PI * 2) / 3)
        ctx.beginPath(); ctx.ellipse(0, 24, 8, 20, 0, 0, Math.PI * 2); ctx.fill()
      }
      ctx.restore()
    }

    // 4. Render Energy [E] Packets
    if (showEnergySymbols) {
      s.energyPackets.forEach(pkt => {
        let color = '#6B7280' // mechanical gray
        if (pkt.type === 'chemical') color = '#10B981' // green
        if (pkt.type === 'light') color = '#EAB308' // yellow
        if (pkt.type === 'thermal') color = '#EF4444' // red/orange
        if (pkt.type === 'electrical') color = '#2563EB' // blue

        ctx.fillStyle = color
        ctx.fillRect(pkt.x - 7, pkt.y - 7, 14, 14)
        ctx.strokeStyle = '#FFFFFF'
        ctx.lineWidth = 1
        ctx.strokeRect(pkt.x - 7, pkt.y - 7, 14, 14)
        ctx.font = 'bold 9px sans-serif'
        ctx.fillStyle = '#FFFFFF'
        ctx.fillText('E', pkt.x - 3, pkt.y + 3)
      })
    }

    // 5. System Status Readout at Top
    ctx.fillStyle = 'rgba(18, 14, 11, 0.88)'
    ctx.fillRect(width / 2 - 170, 80, 340, 30)
    ctx.strokeStyle = 'rgba(226, 193, 125, 0.3)'
    ctx.lineWidth = 1
    ctx.strokeRect(width / 2 - 170, 80, 340, 30)
    ctx.font = 'bold 11px monospace'
    ctx.fillStyle = isCompatible ? '#E2C17D' : '#EF4444'
    ctx.textAlign = 'center'
    ctx.fillText(
      isCompatible ? `POWER CONVERTED: ${activePower.toFixed(0)} W | ACTIVE FLOW` : `⚠️ INCOMPATIBLE PAIR (MATCH SOURCE TO CONVERTER)`,
      width / 2,
      99
    )
    ctx.textAlign = 'left'
  }

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', background: '#FAF5EB' }}>
      {/* Interactive System Selectors Toolbar */}
      <div
        style={{
          width: '100%',
          maxWidth: 1000,
          background: '#FFFFFF',
          borderBottom: '1px solid #E5E7EB',
          padding: '12px 20px',
          boxSizing: 'border-box',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 16
        }}
      >
        {/* Source Picker */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 11, fontWeight: 800, color: '#4B5563' }}>Source:</span>
          {[
            { id: 'bicycle', label: '🚴 Bicycle' },
            { id: 'faucet', label: '🚰 Faucet' },
            { id: 'sun', label: '☀️ Sun' },
            { id: 'kettle', label: '🫖 Kettle' }
          ].map(s => (
            <button
              key={s.id}
              onClick={() => setSourceType(s.id)}
              style={{
                padding: '5px 9px',
                fontSize: 11,
                fontWeight: 700,
                border: '1px solid',
                borderColor: sourceType === s.id ? '#002B66' : '#D1D5DB',
                background: sourceType === s.id ? '#002B66' : '#FFFFFF',
                color: sourceType === s.id ? '#FFFFFF' : '#374151',
                cursor: 'pointer',
                borderRadius: 0
              }}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Converter Picker */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 11, fontWeight: 800, color: '#4B5563' }}>Converter:</span>
          {[
            { id: 'generator', label: '⚙️ Generator' },
            { id: 'solar', label: '⚡ Solar Panel' }
          ].map(c => (
            <button
              key={c.id}
              onClick={() => setConverterType(c.id)}
              style={{
                padding: '5px 9px',
                fontSize: 11,
                fontWeight: 700,
                border: '1px solid',
                borderColor: converterType === c.id ? '#002B66' : '#D1D5DB',
                background: converterType === c.id ? '#002B66' : '#FFFFFF',
                color: converterType === c.id ? '#FFFFFF' : '#374151',
                cursor: 'pointer',
                borderRadius: 0
              }}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Output Picker */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 11, fontWeight: 800, color: '#4B5563' }}>Load:</span>
          {[
            { id: 'water', label: '💧 Water' },
            { id: 'incandescent', label: '💡 Incandescent' },
            { id: 'fluorescent', label: '💡 Fluorescent' },
            { id: 'fan', label: '🌀 Fan' }
          ].map(o => (
            <button
              key={o.id}
              onClick={() => setOutputType(o.id)}
              style={{
                padding: '5px 9px',
                fontSize: 11,
                fontWeight: 700,
                border: '1px solid',
                borderColor: outputType === o.id ? '#002B66' : '#D1D5DB',
                background: outputType === o.id ? '#002B66' : '#FFFFFF',
                color: outputType === o.id ? '#FFFFFF' : '#374151',
                cursor: 'pointer',
                borderRadius: 0
              }}
            >
              {o.label}
            </button>
          ))}
        </div>

        {/* Input Throttle Slider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 800, color: '#002B66' }}>Input: {sourceInputLevel}%</span>
          <input
            type="range"
            min="0"
            max="100"
            value={sourceInputLevel}
            onChange={(e) => setSourceInputLevel(parseInt(e.target.value))}
            style={{ width: 80, accentColor: '#002B66' }}
          />
        </div>
      </div>

      {/* Main Systems Canvas */}
      <canvas
        ref={canvasRef}
        width={1000}
        height={540}
        style={{
          width: '100%',
          maxWidth: 1000,
          height: 'auto',
          aspectRatio: '1000 / 540',
          background: '#FAF5EB',
          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.1)',
          border: '1px solid rgba(18, 14, 11, 0.15)'
        }}
      />
    </div>
  )
}
