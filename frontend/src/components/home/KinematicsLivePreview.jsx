import React, { useEffect, useRef } from 'react'

export default function KinematicsLivePreview() {
  const projectileRef = useRef(null)
  const trailRef = useRef(null)
  const rippleRef = useRef(null)
  const apexRef = useRef(null)
  const targetRef = useRef(null)

  useEffect(() => {
    const projectile = projectileRef.current
    const trail = trailRef.current
    const ripple = rippleRef.current
    const apex = apexRef.current
    const target = targetRef.current

    if (!projectile || !trail) return

    let animationFrameId
    let startTime = null
    const flightDuration = 1800 // ms of exact projectile flight
    const pauseDuration = 650   // ms of impact shockwave & rest
    const cycleDuration = flightDuration + pauseDuration

    // Mathematical parameters:
    // Launch: (x0=24, y0=76)
    // Target: (x1=236, y1=76)
    // Range R = 212 px, Apex height H = 50 px (y_apex = 26)
    const x0 = 24
    const y0 = 76
    const R = 212
    const H = 50

    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp
      const elapsed = (timestamp - startTime) % cycleDuration

      if (elapsed < flightDuration) {
        // --- 1. In-Flight Phase (Linear time t = Newtonian projectile motion) ---
        const t = Math.min(Math.max(elapsed / flightDuration, 0), 1)

        // Exact physical kinematics equations:
        // x(t) moves with constant horizontal velocity: dx/dt = R
        // y(t) decelerates upward and accelerates downward under constant gravity: d²y/dt² = 8H
        const x = x0 + R * t
        const y = y0 - 4 * H * t * (1 - t)

        // Update flying projectile position
        projectile.setAttribute('cx', x.toFixed(2))
        projectile.setAttribute('cy', y.toFixed(2))
        projectile.setAttribute('opacity', '1')

        // Exact quadratic Bezier sub-curve from launch (x0, y0) to current (x, y)
        // By de Casteljau's algorithm:
        // Control point Q1(t) = (1-t)*P0 + t*P_ctrl = (24 + 106*t, 76 - 100*t)
        const ctrlX = (x0 + 106 * t).toFixed(2)
        const ctrlY = (y0 - 100 * t).toFixed(2)
        trail.setAttribute('d', `M ${x0} ${y0} Q ${ctrlX} ${ctrlY}, ${x.toFixed(2)} ${y.toFixed(2)}`)
        trail.setAttribute('opacity', '0.95')

        // Apex indicator flash when projectile crosses apex (t ≈ 0.50)
        if (apex) {
          const isAtApex = Math.abs(t - 0.50) < 0.04
          apex.setAttribute('r', isAtApex ? '5.5' : '4')
          apex.setAttribute('fill', isAtApex ? '#FFFFFF' : '#F0D49B')
        }

        // Reset ripple & target during flight
        if (ripple) {
          ripple.setAttribute('opacity', '0')
          ripple.setAttribute('r', '5')
        }
        if (target) {
          target.setAttribute('r', '4')
        }
      } else {
        // --- 2. Target Impact & Shockwave Phase ---
        const impactTime = elapsed - flightDuration
        const impactProgress = Math.min(impactTime / pauseDuration, 1)

        // Projectile rests on target and fades out
        projectile.setAttribute('cx', '236')
        projectile.setAttribute('cy', '76')
        projectile.setAttribute('opacity', `${Math.max(0, 1 - impactProgress * 2.8)}`)

        // Sonar radar shockwave expands from target
        if (ripple) {
          const currentRadius = 5 + impactProgress * 16
          const currentOpacity = Math.max(0, (1 - impactProgress) * 0.9)
          ripple.setAttribute('r', `${currentRadius}`)
          ripple.setAttribute('opacity', `${currentOpacity}`)
        }

        // Target bullseye pings on impact
        if (target) {
          const pingScale = 4 + Math.sin(impactProgress * Math.PI) * 2
          target.setAttribute('r', `${pingScale}`)
        }

        // Trail softly dissolves before reset
        trail.setAttribute('opacity', `${Math.max(0, 0.95 - impactProgress * 1.8)}`)
      }

      animationFrameId = requestAnimationFrame(animate)
    }

    animationFrameId = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animationFrameId)
  }, [])

  return (
    <div
      style={{
        background: '#12100E',
        border: '1px solid rgba(203, 163, 88, 0.35)',
        borderRadius: 0,
        padding: '20px 24px',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        boxShadow: '0 16px 36px rgba(0, 0, 0, 0.45)'
      }}
    >
      {/* Header: Title with Live Pulsing Radar Beacon & Gravity Constant */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: 'var(--gold-400)',
              boxShadow: '0 0 8px var(--gold-400)',
              display: 'inline-block'
            }}
          />
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: 'var(--gold-400)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em'
            }}
          >
            Live Kinematics Preview
          </span>
        </div>
        <span className="mono" style={{ fontSize: 11, color: '#A29482' }}>
          g = 9.81 m/s²
        </span>
      </div>

      {/* Trajectory Vector Diagram SVG with Exact Projectile Kinematics Motion */}
      <div style={{ width: '100%', height: 86, position: 'relative' }}>
        <svg width="100%" height="86" viewBox="0 0 280 86" style={{ overflow: 'visible' }}>
          <defs>
            {/* Luminous Glow Filter for Flying Shell & Trail */}
            <filter id="projectileGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="0" dy="0" stdDeviation="2.5" floodColor="#FFD392" floodOpacity="0.95" />
              <feDropShadow dx="0" dy="0" stdDeviation="5" floodColor="#CBA358" floodOpacity="0.5" />
            </filter>
            <filter id="targetGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#E05247" floodOpacity="0.8" />
            </filter>
          </defs>

          {/* Ground Line */}
          <line x1="12" y1="76" x2="268" y2="76" stroke="rgba(255,255,255,0.22)" strokeWidth="1.5" />

          {/* Range Grid Ticks */}
          <line x1="75" y1="73" x2="75" y2="79" stroke="rgba(255,255,255,0.25)" />
          <line x1="130" y1="73" x2="130" y2="79" stroke="rgba(255,255,255,0.25)" />
          <line x1="185" y1="73" x2="185" y2="79" stroke="rgba(255,255,255,0.25)" />

          {/* Reference Mathematical Trajectory Curve (Dashed Parabola) */}
          <path
            d="M 24 76 Q 130 -24, 236 76"
            fill="none"
            stroke="rgba(226, 193, 125, 0.45)"
            strokeWidth="2"
            strokeDasharray="4 3"
          />

          {/* Dynamic Luminous Flight Trail (Drawn in Real-time) */}
          <path
            ref={trailRef}
            d="M 24 76 Q 24 76, 24 76"
            fill="none"
            stroke="#FFE6B0"
            strokeWidth="2.5"
            strokeLinecap="round"
            opacity="0"
          />

          {/* Launch Origin Station: Completely Dark Solid Iron Cannonball & Platform */}
          <rect x="17" y="74" width="14" height="4" rx="1.5" fill="#1C1815" stroke="#332B25" strokeWidth="1" />
          <circle cx="24" cy="74" r="5" fill="#0A0908" stroke="#332B25" strokeWidth="1.5" />
          <circle cx="24" cy="74" r="2" fill="#1A1715" />

          {/* Apex Point Indicator */}
          <circle ref={apexRef} cx="130" cy="26" r="4" fill="#F0D49B" />

          {/* Target Impact Radar Ripple */}
          <circle
            ref={rippleRef}
            cx="236"
            cy="76"
            r="5"
            fill="none"
            stroke="#E05247"
            strokeWidth="1.8"
            opacity="0"
          />

          {/* Target Marker: Permanent Red Bullseye on Ground Line */}
          <circle
            cx="236"
            cy="76"
            r="6.5"
            fill="none"
            stroke="#E05247"
            strokeWidth="1.5"
            strokeDasharray="3 2"
          />
          <circle
            ref={targetRef}
            cx="236"
            cy="76"
            r="4"
            fill="#C23B30"
            filter="url(#targetGlow)"
          />
          <circle
            cx="236"
            cy="76"
            r="1.5"
            fill="#FFFFFF"
          />

          {/* Animated Flying Projectile Tracer Shell */}
          <circle
            ref={projectileRef}
            cx="24"
            cy="76"
            r="4.5"
            fill="#FFF7E6"
            stroke="#E2C17D"
            strokeWidth="1.5"
            filter="url(#projectileGlow)"
            opacity="0"
          />

          {/* Apex Measurement Label */}
          <text
            x="130"
            y="16"
            fill="#E2C17D"
            fontSize="10"
            textAnchor="middle"
            fontFamily="var(--font-mono)"
            style={{ userSelect: 'none' }}
          >
            H_max = 25.9m
          </text>

          {/* Target Distance Label */}
          <text
            x="236"
            y="66"
            fill="#FAF3E6"
            fontSize="10"
            textAnchor="middle"
            fontFamily="var(--font-mono)"
            style={{ userSelect: 'none' }}
          >
            Target: 65m
          </text>
        </svg>
      </div>

      {/* Telemetry Data Chips */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 8,
          borderTop: '1px solid rgba(255,255,255,0.08)',
          paddingTop: 8
        }}
      >
        <div>
          <span style={{ fontSize: 10, color: '#A29482', textTransform: 'uppercase' }}>Angle</span>
          <div className="mono" style={{ fontSize: 13, fontWeight: 700, color: '#FFFFFF' }}>
            45.0°
          </div>
        </div>
        <div>
          <span style={{ fontSize: 10, color: '#A29482', textTransform: 'uppercase' }}>Speed</span>
          <div className="mono" style={{ fontSize: 13, fontWeight: 700, color: 'var(--gold-400)' }}>
            25 m/s
          </div>
        </div>
        <div>
          <span style={{ fontSize: 10, color: '#A29482', textTransform: 'uppercase' }}>Cliff</span>
          <div className="mono" style={{ fontSize: 13, fontWeight: 700, color: '#FFFFFF' }}>
            0 m
          </div>
        </div>
      </div>
    </div>
  )
}
