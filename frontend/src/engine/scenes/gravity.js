/**
 * VISIORA Formula Engine — Free Fall / Gravity Scene
 * 
 * Implements the PhysicsScene interface.
 * All values computed here are the authoritative source of truth.
 * The Rapier simulation reads FROM these values, never the other way around.
 */

import { PHYSICS_CONSTANTS } from '../../config/physics'

/** @implements {PhysicsScene} */
export const gravityScene = {
  id: 'gravity',

  /**
   * Compute all physics quantities from raw variable values.
   * Returns { values, steps, formulas, graphData }
   */
  computeFormulaState(vars) {
    const h  = vars.height  ?? 20
    const m1 = vars.mass1   ?? 1
    const m2 = vars.mass2   ?? 50
    const g  = vars.gravity ?? PHYSICS_CONSTANTS.G_EARTH

    // Core equations
    const t  = Math.sqrt((2 * h) / g)          // fall time (s)
    const v  = Math.sqrt(2 * g * h)             // final velocity (m/s)
    const a  = g                                // acceleration (m/s²)
    const KE1 = 0.5 * m1 * v * v              // kinetic energy ball 1 (J)
    const KE2 = 0.5 * m2 * v * v              // kinetic energy ball 2 (J)
    const PE1 = m1 * g * h                    // potential energy ball 1 (J)
    const PE2 = m2 * g * h                    // potential energy ball 2 (J)

    return {
      values: { t, T: t, v, a, KE1, KE2, PE1, PE2, h, m1, m2, g },

      formulas: [
        { symbol: 't',  expression: '√(2h / g)',             unit: 's',    label: 'Fall Time' },
        { symbol: 'v',  expression: '√(2gh)',                 unit: 'm/s',  label: 'Impact Velocity' },
        { symbol: 'a',  expression: 'g',                      unit: 'm/s²', label: 'Acceleration' },
        { symbol: 'PE', expression: 'mgh',                    unit: 'J',    label: 'Initial Potential Energy' },
        { symbol: 'KE', expression: '½mv²',                   unit: 'J',    label: 'Final Kinetic Energy' },
      ],

      steps: [
        {
          formula: 't = √(2h / g)',
          substituted: `t = √(2 × ${h.toFixed(2)} / ${g.toFixed(2)})`,
          result: `t = ${t.toFixed(3)} s`,
          label: 'Fall Time',
        },
        {
          formula: 'v = √(2gh)',
          substituted: `v = √(2 × ${g.toFixed(2)} × ${h.toFixed(2)})`,
          result: `v = ${v.toFixed(3)} m/s`,
          label: 'Impact Velocity',
        },
        {
          formula: 'a = g',
          substituted: `a = ${g.toFixed(2)} m/s²`,
          result: `a = ${a.toFixed(2)} m/s²`,
          label: 'Acceleration (same for both masses)',
        },
        {
          formula: 'PE = mgh',
          substituted: `PE₁ = ${m1} × ${g.toFixed(2)} × ${h.toFixed(2)}, PE₂ = ${m2} × ${g.toFixed(2)} × ${h.toFixed(2)}`,
          result: `PE₁ = ${PE1.toFixed(2)} J,  PE₂ = ${PE2.toFixed(2)} J`,
          label: 'Potential Energy',
        },
        {
          formula: 'KE = ½mv²',
          substituted: `KE₁ = ½ × ${m1} × ${v.toFixed(2)}²,  KE₂ = ½ × ${m2} × ${v.toFixed(2)}²`,
          result: `KE₁ = ${KE1.toFixed(2)} J,  KE₂ = ${KE2.toFixed(2)} J`,
          label: 'Kinetic Energy at Impact (same velocity!)',
        },
      ],

      /** Time-series for 2D graphs — sampled at Δt intervals */
      graphSeries: buildGravityGraphs(h, g, m1, m2),
    }
  },

  /**
   * Translate computed state into Rapier simulation seed config.
   * Called by the scene to set initial rigid body state.
   */
  seedSimulation(vars) {
    const h  = vars.height  ?? 20
    const m1 = vars.mass1   ?? 1
    const m2 = vars.mass2   ?? 50
    const g  = vars.gravity ?? PHYSICS_CONSTANTS.G_EARTH

    return {
      gravity: { x: 0, y: -g, z: 0 },
      bodies: [
        { id: 'ball1', mass: m1, position: { x: -2.5, y: h * 0.5, z: 0 }, velocity: { x: 0, y: 0, z: 0 }, radius: clampRadius(m1) },
        { id: 'ball2', mass: m2, position: { x:  2.5, y: h * 0.5, z: 0 }, velocity: { x: 0, y: 0, z: 0 }, radius: clampRadius(m2) },
      ],
    }
  },

  graphs: [
    { id: 'velocity-time',  label: 'Velocity vs Time',  xLabel: 'Time (s)', yLabel: 'Velocity (m/s)' },
    { id: 'height-time',    label: 'Height vs Time',    xLabel: 'Time (s)', yLabel: 'Height (m)' },
    { id: 'energy-time',    label: 'Energy vs Time',    xLabel: 'Time (s)', yLabel: 'Energy (J)' },
  ],
}

// ── Helpers ────────────────────────────────────────────────────────

function clampRadius(mass) {
  return Math.max(0.2, Math.min(1.5, 0.2 + Math.log(mass + 1) * 0.25))
}

function buildGravityGraphs(h, g, m1, m2) {
  const tMax = Math.sqrt((2 * h) / g)
  const steps = 80
  const dt = tMax / steps
  const velocityTime = []
  const heightTime = []
  const energyTime = []

  for (let i = 0; i <= steps; i++) {
    const t = i * dt
    const v = g * t
    const hCurrent = Math.max(0, h - 0.5 * g * t * t)
    const ke1 = 0.5 * m1 * v * v
    const pe1 = m1 * g * hCurrent
    const ke2 = 0.5 * m2 * v * v
    const pe2 = m2 * g * hCurrent

    velocityTime.push({ x: t, y: v })
    heightTime.push({ x: t, y: hCurrent })
    energyTime.push({ x: t, ke1, pe1, ke2, pe2, te1: ke1 + pe1, te2: ke2 + pe2 })
  }

  return { velocityTime, heightTime, energyTime }
}
