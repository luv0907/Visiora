/**
 * VISIORA Formula Engine — Collision Scene (Elastic & Inelastic)
 */

export const collisionScene = {
  id: 'collision',

  computeFormulaState(vars) {
    const m1 = vars.mass1       ?? 2    // kg
    const m2 = vars.mass2       ?? 1    // kg
    const u1 = vars.velocity1   ?? 5    // m/s (initial velocity ball 1)
    const u2 = vars.velocity2   ?? -2   // m/s (initial velocity ball 2)
    const e  = vars.restitution ?? 1    // coefficient of restitution (0=perfectly inelastic, 1=elastic)

    // Conservation of momentum: m₁u₁ + m₂u₂ = m₁v₁ + m₂v₂
    // Newton's law of restitution: v₂ - v₁ = e(u₁ - u₂)
    //
    // Solving:
    // v₁ = ((m₁ - e·m₂)u₁ + m₂(1+e)u₂) / (m₁ + m₂)
    // v₂ = ((m₂ - e·m₁)u₂ + m₁(1+e)u₁) / (m₁ + m₂)

    const v1 = ((m1 - e * m2) * u1 + m2 * (1 + e) * u2) / (m1 + m2)
    const v2 = ((m2 - e * m1) * u2 + m1 * (1 + e) * u1) / (m1 + m2)

    // Momenta
    const p_before = m1 * u1 + m2 * u2
    const p_after  = m1 * v1 + m2 * v2
    const p_conserved = Math.abs(p_before - p_after) < 1e-9

    // Kinetic energies
    const KE1_before = 0.5 * m1 * u1 * u1
    const KE2_before = 0.5 * m2 * u2 * u2
    const KE1_after  = 0.5 * m1 * v1 * v1
    const KE2_after  = 0.5 * m2 * v2 * v2

    const KE_before = KE1_before + KE2_before
    const KE_after  = KE1_after  + KE2_after
    const KE_lost   = KE_before - KE_after

    const collisionType = e >= 0.99 ? 'Perfectly Elastic' : e <= 0.01 ? 'Perfectly Inelastic' : 'Partially Inelastic'

    return {
      values: {
        m1, m2, u1, u2, e, v1, v2,
        p_before, p_after,
        KE_before, KE_after, KE_lost,
        KE1_before, KE2_before, KE1_after, KE2_after,
        collisionType,
      },

      formulas: [
        { symbol: 'p',  expression: 'm₁u₁ + m₂u₂ = const', unit: 'kg·m/s', label: 'Momentum Conservation' },
        { symbol: 'v₁', expression: '((m₁ − e·m₂)u₁ + m₂(1+e)u₂) / (m₁+m₂)', unit: 'm/s', label: 'Ball 1 Post-Collision Velocity' },
        { symbol: 'v₂', expression: '((m₂ − e·m₁)u₂ + m₁(1+e)u₁) / (m₁+m₂)', unit: 'm/s', label: 'Ball 2 Post-Collision Velocity' },
        { symbol: 'ΔKE', expression: 'KE_before − KE_after', unit: 'J', label: 'Kinetic Energy Lost' },
      ],

      steps: [
        {
          formula: 'p = m₁u₁ + m₂u₂',
          substituted: `p = ${m1}×${u1} + ${m2}×${u2}`,
          result: `p = ${p_before.toFixed(4)} kg·m/s`,
          label: 'Total momentum (conserved)',
        },
        {
          formula: 'v₁ = ((m₁ − e·m₂)u₁ + m₂(1+e)u₂) / (m₁+m₂)',
          substituted: `v₁ = ((${m1} − ${e}×${m2})×${u1} + ${m2}(1+${e})×${u2}) / ${m1+m2}`,
          result: `v₁ = ${v1.toFixed(4)} m/s`,
          label: 'Ball 1 velocity after collision',
        },
        {
          formula: 'v₂ = ((m₂ − e·m₁)u₂ + m₁(1+e)u₁) / (m₁+m₂)',
          substituted: `v₂ = ((${m2} − ${e}×${m1})×${u2} + ${m1}(1+${e})×${u1}) / ${m1+m2}`,
          result: `v₂ = ${v2.toFixed(4)} m/s`,
          label: 'Ball 2 velocity after collision',
        },
        {
          formula: 'KE = ½mv²',
          substituted: `KE_before = ½×${m1}×${u1}² + ½×${m2}×${u2}² = ${KE_before.toFixed(4)} J`,
          result: `KE_after = ${KE_after.toFixed(4)} J  |  ΔKE = ${KE_lost.toFixed(4)} J`,
          label: `Kinetic energy (${collisionType})`,
        },
      ],

      graphSeries: buildCollisionGraphs(m1, m2, u1, u2, v1, v2, KE_before, KE_after, e),
    }
  },

  seedSimulation(vars) {
    const m1 = vars.mass1       ?? 2
    const m2 = vars.mass2       ?? 1
    const u1 = vars.velocity1   ?? 5
    const u2 = vars.velocity2   ?? -2
    const e  = vars.restitution ?? 1

    const { v1, v2 } = computePostCollision(m1, m2, u1, u2, e)

    return {
      gravity: { x: 0, y: -0.1, z: 0 },  // near-frictionless surface
      bodies: [
        {
          id: 'ball1', mass: m1,
          position: { x: -4, y: 0.5, z: 0 },
          velocity: { x: u1 * 0.8, y: 0, z: 0 },
          radius: Math.max(0.25, Math.min(1.0, 0.25 + Math.sqrt(m1) * 0.1)),
          postCollisionVelocity: v1,
        },
        {
          id: 'ball2', mass: m2,
          position: { x: 1, y: 0.5, z: 0 },
          velocity: { x: u2 * 0.8, y: 0, z: 0 },
          radius: Math.max(0.25, Math.min(1.0, 0.25 + Math.sqrt(m2) * 0.1)),
          postCollisionVelocity: v2,
        },
      ],
      restitution: e,
    }
  },

  graphs: [
    { id: 'momentum',   label: 'Momentum',           xLabel: 'Ball', yLabel: 'Momentum (kg·m/s)' },
    { id: 'energy',     label: 'Kinetic Energy',     xLabel: 'Ball', yLabel: 'KE (J)' },
    { id: 'velocity',   label: 'Velocity',           xLabel: 'Ball', yLabel: 'Velocity (m/s)' },
  ],
}

function computePostCollision(m1, m2, u1, u2, e) {
  const v1 = ((m1 - e * m2) * u1 + m2 * (1 + e) * u2) / (m1 + m2)
  const v2 = ((m2 - e * m1) * u2 + m1 * (1 + e) * u1) / (m1 + m2)
  return { v1, v2 }
}

function buildCollisionGraphs(m1, m2, u1, u2, v1, v2, KE_before, KE_after, e) {
  // Bar chart data (before/after comparison)
  const momentum = [
    { label: 'Ball 1 Before', value: m1 * u1, color: 'before' },
    { label: 'Ball 2 Before', value: m2 * u2, color: 'before' },
    { label: 'Ball 1 After',  value: m1 * v1, color: 'after' },
    { label: 'Ball 2 After',  value: m2 * v2, color: 'after' },
  ]

  const energy = [
    { label: 'Ball 1 Before', value: 0.5 * m1 * u1 * u1, color: 'before' },
    { label: 'Ball 2 Before', value: 0.5 * m2 * u2 * u2, color: 'before' },
    { label: 'Ball 1 After',  value: 0.5 * m1 * v1 * v1, color: 'after' },
    { label: 'Ball 2 After',  value: 0.5 * m2 * v2 * v2, color: 'after' },
    { label: 'Total Before', value: KE_before, color: 'total' },
    { label: 'Total After',  value: KE_after,  color: 'total' },
  ]

  const velocity = [
    { label: 'Ball 1 Before', value: u1 },
    { label: 'Ball 2 Before', value: u2 },
    { label: 'Ball 1 After',  value: v1 },
    { label: 'Ball 2 After',  value: v2 },
  ]

  return { momentum, energy, velocity }
}
