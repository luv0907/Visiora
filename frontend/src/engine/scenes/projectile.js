/**
 * VISIORA Formula Engine — Projectile Motion Scene
 */

import { PHYSICS_CONSTANTS } from '../../config/physics'

export const projectileScene = {
  id: 'projectile',

  computeFormulaState(vars) {
    const v0  = vars.velocity ?? 20    // m/s
    const θ_deg = vars.angle  ?? 45    // degrees
    const h0  = vars.height   ?? 0     // launch height
    const g   = vars.gravity  ?? PHYSICS_CONSTANTS.G_EARTH

    const θ = (θ_deg * Math.PI) / 180

    const v0x = v0 * Math.cos(θ)
    const v0y = v0 * Math.sin(θ)

    // Time of flight (from launch height h0, landing at y=0)
    // 0 = h0 + v0y*t - ½g*t²  → quadratic: ½g*t² - v0y*t - h0 = 0
    let T
    if (h0 === 0) {
      T = (2 * v0y) / g
    } else {
      const discriminant = v0y * v0y + 2 * g * h0
      T = (v0y + Math.sqrt(discriminant)) / g
    }
    T = Math.max(0, T)

    const R     = v0x * T                           // horizontal range (m)
    const H_max = h0 + (v0y * v0y) / (2 * g)        // max height (m)
    const t_peak = v0y / g                           // time to peak (s)
    const v_impact = Math.sqrt(v0x * v0x + (v0y - g * T) ** 2)  // speed at landing

    return {
      values: { v0, θ_deg, θ, v0x, v0y, T, R, H_max, t_peak, v_impact, h0, g },

      formulas: [
        { symbol: 'v₀ₓ',   expression: 'v₀ cos θ',             unit: 'm/s', label: 'Horizontal Velocity' },
        { symbol: 'v₀ᵧ',   expression: 'v₀ sin θ',             unit: 'm/s', label: 'Vertical Velocity' },
        { symbol: 'R',     expression: 'v₀ cos θ · T',          unit: 'm',   label: 'Horizontal Range' },
        { symbol: 'H_max', expression: 'h₀ + v₀ᵧ² / (2g)',     unit: 'm',   label: 'Maximum Height' },
        { symbol: 'T',     expression: '(v₀ᵧ + √(v₀ᵧ² + 2gh₀)) / g', unit: 's', label: 'Time of Flight' },
      ],

      steps: [
        {
          formula: 'v₀ₓ = v₀ cos θ',
          substituted: `v₀ₓ = ${v0.toFixed(2)} × cos(${θ_deg}°)`,
          result: `v₀ₓ = ${v0x.toFixed(3)} m/s`,
          label: 'Horizontal velocity component',
        },
        {
          formula: 'v₀ᵧ = v₀ sin θ',
          substituted: `v₀ᵧ = ${v0.toFixed(2)} × sin(${θ_deg}°)`,
          result: `v₀ᵧ = ${v0y.toFixed(3)} m/s`,
          label: 'Vertical velocity component',
        },
        {
          formula: 'H_max = h₀ + v₀ᵧ² / (2g)',
          substituted: `H_max = ${h0.toFixed(2)} + ${v0y.toFixed(2)}² / (2 × ${g.toFixed(2)})`,
          result: `H_max = ${H_max.toFixed(3)} m`,
          label: 'Maximum height reached',
        },
        {
          formula: 'T = (v₀ᵧ + √(v₀ᵧ² + 2gh₀)) / g',
          substituted: `T = (${v0y.toFixed(2)} + √(${v0y.toFixed(2)}² + 2×${g.toFixed(2)}×${h0.toFixed(2)})) / ${g.toFixed(2)}`,
          result: `T = ${T.toFixed(3)} s`,
          label: 'Time of flight',
        },
        {
          formula: 'R = v₀ₓ × T',
          substituted: `R = ${v0x.toFixed(3)} × ${T.toFixed(3)}`,
          result: `R = ${R.toFixed(3)} m`,
          label: 'Horizontal range',
        },
      ],

      graphSeries: buildProjectileGraphs(v0x, v0y, h0, g, T),
    }
  },

  seedSimulation(vars) {
    const v0   = vars.velocity ?? 20
    const θ_deg = vars.angle  ?? 45
    const h0   = vars.height  ?? 0
    const g    = vars.gravity ?? PHYSICS_CONSTANTS.G_EARTH

    const θ = (θ_deg * Math.PI) / 180
    const v0x = v0 * Math.cos(θ)
    const v0y = v0 * Math.sin(θ)

    return {
      gravity: { x: 0, y: -g, z: 0 },
      bodies: [
        {
          id: 'projectile',
          mass: 1,
          position: { x: -8, y: h0 * 0.5 + 0.3, z: 0 },
          velocity: { x: v0x * 0.5, y: v0y * 0.5, z: 0 }, // scaled for 3D view
          radius: 0.3,
        },
      ],
    }
  },

  graphs: [
    { id: 'trajectory',    label: 'Trajectory (x vs y)',      xLabel: 'x (m)',    yLabel: 'y (m)' },
    { id: 'height-time',   label: 'Height vs Time',           xLabel: 'Time (s)', yLabel: 'Height (m)' },
    { id: 'velocity-time', label: 'Velocity vs Time',         xLabel: 'Time (s)', yLabel: 'Velocity (m/s)' },
  ],
}

function buildProjectileGraphs(v0x, v0y, h0, g, T) {
  const steps = 100
  const dt = T / steps
  const trajectory = []
  const heightTime = []
  const velocityTime = []

  for (let i = 0; i <= steps; i++) {
    const t = i * dt
    const x = v0x * t
    const y = Math.max(0, h0 + v0y * t - 0.5 * g * t * t)
    const vx = v0x
    const vy = v0y - g * t
    const speed = Math.sqrt(vx * vx + vy * vy)

    trajectory.push({ x, y })
    heightTime.push({ x: t, y })
    velocityTime.push({ x: t, vx, vy, speed })
  }

  return { trajectory, heightTime, velocityTime }
}
