/**
 * VISIORA Formula Engine — Simple Pendulum Scene
 */

import { PHYSICS_CONSTANTS } from '../../config/physics'

export const pendulumScene = {
  id: 'pendulum',

  computeFormulaState(vars) {
    const L   = vars.length  ?? 2     // m
    const m   = vars.mass1   ?? 1     // kg
    const θ0_deg = vars.angle ?? 30   // degrees (initial angle)
    const g   = vars.gravity ?? PHYSICS_CONSTANTS.G_EARTH

    const θ0 = (θ0_deg * Math.PI) / 180

    // Period: small-angle approximation T = 2π√(L/g)
    // Large-angle correction: T = 2π√(L/g) × (1 + θ²/16 + ...)
    const T_simple = 2 * Math.PI * Math.sqrt(L / g)
    const T_corrected = T_simple * (1 + (θ0 * θ0) / 16 + (11 * θ0 * θ0 * θ0 * θ0) / 3072)

    const f = 1 / T_corrected     // frequency (Hz)
    const ω = (2 * Math.PI) / T_corrected  // angular frequency (rad/s)

    // Max speed at bottom: v_max = √(2gL(1 - cosθ₀))
    const v_max = Math.sqrt(2 * g * L * (1 - Math.cos(θ0)))

    // Max height: h = L(1 - cosθ₀)
    const h_max = L * (1 - Math.cos(θ0))

    // Energy at top (relative to bottom)
    const E_total = m * g * h_max   // = ½mv²_max
    const E_kinetic_max = 0.5 * m * v_max * v_max

    return {
      values: { L, m, θ0_deg, θ0, T_simple, T_corrected, f, ω, v_max, h_max, E_total, g },

      formulas: [
        { symbol: 'T',     expression: '2π√(L/g)',          unit: 's',     label: 'Period (simple)' },
        { symbol: 'T_adj', expression: 'T × (1 + θ²/16)',   unit: 's',     label: 'Period (corrected)' },
        { symbol: 'f',     expression: '1/T',               unit: 'Hz',    label: 'Frequency' },
        { symbol: 'v_max', expression: '√(2gL(1 − cosθ₀))', unit: 'm/s',   label: 'Max Speed (at bottom)' },
        { symbol: 'E',     expression: 'mgL(1 − cosθ₀)',    unit: 'J',     label: 'Total Mechanical Energy' },
      ],

      steps: [
        {
          formula: 'T = 2π√(L/g)',
          substituted: `T = 2π × √(${L.toFixed(2)} / ${g.toFixed(2)})`,
          result: `T = ${T_simple.toFixed(4)} s (small angle)`,
          label: 'Period — small angle approximation',
        },
        {
          formula: 'T = T₀(1 + θ₀²/16)',
          substituted: `T = ${T_simple.toFixed(4)} × (1 + ${θ0.toFixed(4)}²/16)`,
          result: `T = ${T_corrected.toFixed(4)} s`,
          label: 'Period — corrected for large angle',
        },
        {
          formula: 'f = 1/T',
          substituted: `f = 1 / ${T_corrected.toFixed(4)}`,
          result: `f = ${f.toFixed(4)} Hz`,
          label: 'Frequency',
        },
        {
          formula: 'v_max = √(2gL(1 − cosθ₀))',
          substituted: `v_max = √(2 × ${g.toFixed(2)} × ${L.toFixed(2)} × (1 − cos(${θ0_deg}°)))`,
          result: `v_max = ${v_max.toFixed(4)} m/s`,
          label: 'Maximum speed at bottom of swing',
        },
        {
          formula: 'E = mgL(1 − cosθ₀)',
          substituted: `E = ${m} × ${g.toFixed(2)} × ${L.toFixed(2)} × (1 − cos(${θ0_deg}°))`,
          result: `E = ${E_total.toFixed(4)} J`,
          label: 'Total mechanical energy',
        },
      ],

      graphSeries: buildPendulumGraphs(L, m, θ0, g, T_corrected, ω),
    }
  },

  seedSimulation(vars) {
    const L = vars.length  ?? 2
    const m = vars.mass1   ?? 1
    const θ0_deg = vars.angle ?? 30
    const g = vars.gravity ?? PHYSICS_CONSTANTS.G_EARTH

    const θ0 = (θ0_deg * Math.PI) / 180
    // Pivot at y=5; bob starts displaced
    const bx = Math.sin(θ0) * L
    const by = 5 - Math.cos(θ0) * L

    return {
      gravity: { x: 0, y: -g, z: 0 },
      pivot: { x: 0, y: 5, z: 0 },
      bodies: [
        {
          id: 'bob',
          mass: m,
          position: { x: bx, y: by, z: 0 },
          velocity: { x: 0, y: 0, z: 0 },
          radius: Math.max(0.15, Math.min(0.5, 0.15 + Math.log(m + 1) * 0.1)),
        },
      ],
      rodLength: L,
    }
  },

  graphs: [
    { id: 'angle-time',  label: 'Angle vs Time',   xLabel: 'Time (s)', yLabel: 'Angle (°)' },
    { id: 'energy-time', label: 'Energy vs Time',  xLabel: 'Time (s)', yLabel: 'Energy (J)' },
    { id: 'phase',       label: 'Phase Portrait',  xLabel: 'Angle (°)', yLabel: 'Angular Velocity (rad/s)' },
  ],
}

function buildPendulumGraphs(L, m, θ0, g, T, ω) {
  const steps = 200
  const duration = T * 3 // show 3 periods
  const dt = duration / steps
  const angleTime = []
  const energyTime = []
  const phase = []

  for (let i = 0; i <= steps; i++) {
    const t = i * dt
    // Approximate solution for small-medium angles: θ(t) = θ₀ cos(ωt)
    const θ = θ0 * Math.cos(ω * t)
    const dθdt = -θ0 * ω * Math.sin(ω * t)

    const h = L * (1 - Math.cos(θ))
    const v = L * Math.abs(dθdt)
    const ke = 0.5 * m * v * v
    const pe = m * g * h
    const te = ke + pe

    angleTime.push({ x: t, y: θ * (180 / Math.PI) })
    energyTime.push({ x: t, ke, pe, te })
    phase.push({ x: θ * (180 / Math.PI), y: dθdt })
  }

  return { angleTime, energyTime, phase }
}
