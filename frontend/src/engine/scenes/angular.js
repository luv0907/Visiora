/**
 * VISIORA Formula Engine — Angular Momentum Scene
 * Models a figure-skater-style spinning body pulling arms in/out.
 */

export const angularScene = {
  id: 'angular',

  computeFormulaState(vars) {
    const ω0 = vars.angularVelocity ?? 3    // initial angular velocity (rad/s)
    const r1  = vars.armRadius       ?? 1.5  // initial arm radius (m)
    const M   = vars.mass1           ?? 60   // total body mass (kg)

    // Model: arms are 20% of body mass each (two arms = 40% total)
    // Moment of inertia arms: I_arms = m_arms * r²  (treating as point masses)
    // Body core: I_core = 0.4 * M_core * R_core²  (cylinder approximation)
    const armMassFraction = 0.20  // each arm is 20% of total mass
    const m_arms    = M * 2 * armMassFraction  // both arms
    const m_core    = M * (1 - 2 * armMassFraction)
    const R_core    = 0.25  // core radius (m)

    // "Arms out" configuration
    const I1 = 0.5 * m_core * R_core * R_core + m_arms * r1 * r1

    // "Arms in" configuration (user reduces r)
    const r2 = Math.max(0.1, R_core + 0.05)  // arms fully in ≈ core radius
    const I2 = 0.5 * m_core * R_core * R_core + m_arms * r2 * r2

    // Conservation: L = I₁ω₁ = I₂ω₂
    const L  = I1 * ω0
    const ω2 = L / I2  // final angular velocity (arms pulled in)

    // Kinetic energy (arms-in rotation is faster, more KE from muscle work)
    const KE1 = 0.5 * I1 * ω0 * ω0
    const KE2 = 0.5 * I2 * ω2 * ω2
    const KE_gain = KE2 - KE1  // positive = muscles did work

    // Periods
    const T1 = (2 * Math.PI) / ω0
    const T2 = (2 * Math.PI) / ω2

    return {
      values: { ω0, r1, r2, M, I1, I2, L, ω2, KE1, KE2, KE_gain, T1, T2 },

      formulas: [
        { symbol: 'L',  expression: 'I · ω = const',         unit: 'kg·m²/s', label: 'Angular Momentum (conserved)' },
        { symbol: 'I₁', expression: 'I_core + m_arms·r₁²',  unit: 'kg·m²',   label: 'Moment of Inertia (arms out)' },
        { symbol: 'ω₂', expression: 'L / I₂',               unit: 'rad/s',   label: 'Angular Velocity (arms in)' },
        { symbol: 'KE', expression: '½Iω²',                  unit: 'J',       label: 'Rotational Kinetic Energy' },
      ],

      steps: [
        {
          formula: 'I₁ = ½m_core·R² + m_arms·r₁²',
          substituted: `I₁ = ½×${m_core.toFixed(1)}×${R_core}² + ${m_arms.toFixed(1)}×${r1.toFixed(2)}²`,
          result: `I₁ = ${I1.toFixed(4)} kg·m²`,
          label: 'Moment of inertia (arms extended)',
        },
        {
          formula: 'L = I₁ω₁',
          substituted: `L = ${I1.toFixed(4)} × ${ω0.toFixed(2)}`,
          result: `L = ${L.toFixed(4)} kg·m²/s`,
          label: 'Angular momentum (conserved quantity)',
        },
        {
          formula: 'I₂ = ½m_core·R² + m_arms·r₂²',
          substituted: `I₂ = ½×${m_core.toFixed(1)}×${R_core}² + ${m_arms.toFixed(1)}×${r2.toFixed(2)}²`,
          result: `I₂ = ${I2.toFixed(4)} kg·m²`,
          label: 'Moment of inertia (arms pulled in)',
        },
        {
          formula: 'ω₂ = L / I₂',
          substituted: `ω₂ = ${L.toFixed(4)} / ${I2.toFixed(4)}`,
          result: `ω₂ = ${ω2.toFixed(4)} rad/s  (${(ω2 / ω0).toFixed(2)}× faster)`,
          label: 'New angular velocity',
        },
        {
          formula: 'KE = ½Iω²',
          substituted: `KE₁ = ½×${I1.toFixed(4)}×${ω0.toFixed(2)}², KE₂ = ½×${I2.toFixed(4)}×${ω2.toFixed(2)}²`,
          result: `KE₁ = ${KE1.toFixed(2)} J → KE₂ = ${KE2.toFixed(2)} J  (ΔKE = +${KE_gain.toFixed(2)} J from muscles)`,
          label: 'Kinetic energy increase (muscles do work)',
        },
      ],

      graphSeries: buildAngularGraphs(ω0, I1, I2, L, KE1, KE2, r1, r2, m_arms),
    }
  },

  seedSimulation(vars) {
    const ω0  = vars.angularVelocity ?? 3
    const r1  = vars.armRadius       ?? 1.5
    const M   = vars.mass1           ?? 60

    return {
      gravity: { x: 0, y: -9.81, z: 0 },
      spinner: {
        angularVelocity: ω0,
        armRadius: r1,
        mass: M,
      },
    }
  },

  graphs: [
    { id: 'omega-r',  label: 'ω vs Arm Radius',    xLabel: 'Arm Radius (m)', yLabel: 'Angular Velocity (rad/s)' },
    { id: 'energy-r', label: 'KE vs Arm Radius',   xLabel: 'Arm Radius (m)', yLabel: 'KE (J)' },
    { id: 'L-const',  label: 'Angular Momentum',   xLabel: 'Configuration',  yLabel: 'L (kg·m²/s)' },
  ],
}

function buildAngularGraphs(ω0, I1, I2, L, KE1, KE2, r1, r2, m_arms) {
  const steps = 60
  const omegaR = []
  const energyR = []

  for (let i = 0; i <= steps; i++) {
    const r = r2 + (r1 - r2) * (i / steps)
    const I_r = I1 - m_arms * (r1 * r1) + m_arms * r * r
    const ω_r = Math.max(0, L / I_r)
    const KE_r = 0.5 * I_r * ω_r * ω_r

    omegaR.push({ x: r, y: ω_r })
    energyR.push({ x: r, y: KE_r })
  }

  const lConst = [
    { label: 'Arms Out', L: L, ω: ω0, I: I1 },
    { label: 'Arms In',  L: L, ω: L / I2, I: I2 },
  ]

  return { omegaR, energyR, lConst }
}
