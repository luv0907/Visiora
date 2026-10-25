/**
 * VISIORA — Free Fall Tower station (walk-in lab).
 *
 * Two glass tubes on an oak plinth. One holds a steel ball, the other a feather.
 * A vacuum pump can empty the tubes. Both are released from the same height and
 * moved by the exact drop-tower engine (engine/dropTower.js).
 *
 *   Steel ball: r = 9 cm solid steel → m ≈ 24 kg, bounces on oak with e ≈ 0.5.
 *   Feather:    m ≈ 3 g. Its fluffy vanes give it a huge drag for its weight;
 *               modelled as a sphere with an effective radius of 0.26 m, which
 *               gives a terminal speed of about 0.7 m/s. It crumples on impact (e = 0).
 *   In vacuum, drag vanishes and both land together after √(2h/g).
 */
import { createBall, stepBall } from '../engine/dropTower'

export const DROP_HEIGHT = 8.66 // m from the lowest point of each object to the plinth
export const PUMP_SECONDS = 4.0 // pumping the air out
export const VENT_SECONDS = 1.5 // letting the air back in

export const OBJECTS = {
  ball: { label: 'Steel ball', mass: 24, radius: 0.09, restitution: 0.5 },
  feather: { label: 'Feather', mass: 0.003, radius: 0.26, restitution: 0 },
}

export function createTower() {
  return {
    air: 'air', // 'air' | 'pumping' | 'vacuum' | 'venting'
    pressure: 1, // 1 = full air, 0 = vacuum
    phase: 'ready', // 'ready' | 'falling' | 'done'
    t: 0,
    ball: null,
    feather: null,
  }
}

const makeRun = () => ({
  ball: createBall({ height: DROP_HEIGHT, ...OBJECTS.ball }),
  feather: createBall({ height: DROP_HEIGHT, ...OBJECTS.feather }),
})

export function startPump(tower) {
  if (tower.phase === 'falling' || tower.air === 'vacuum' || tower.air === 'pumping') return tower
  tower.air = 'pumping'
  return tower
}

export function letAirIn(tower) {
  if (tower.phase === 'falling' || tower.air === 'air' || tower.air === 'venting') return tower
  tower.air = 'venting'
  return tower
}

export function release(tower) {
  if (tower.phase === 'falling' || tower.air === 'pumping' || tower.air === 'venting') return tower
  Object.assign(tower, makeRun(), { phase: 'falling', t: 0 })
  return tower
}

export function reset(tower) {
  return Object.assign(tower, { phase: 'ready', t: 0, ball: null, feather: null })
}

/** Advance pump and objects by dt seconds of simulated time. */
export function stepTower(tower, dt, g = 9.81) {
  if (tower.air === 'pumping') {
    // a real rotary pump: pressure falls roughly exponentially; call it a vacuum below 1 %
    tower.pressure = Math.max(0, tower.pressure - (dt / PUMP_SECONDS) * 1.2)
    if (tower.pressure <= 0.01) { tower.pressure = 0; tower.air = 'vacuum' }
  } else if (tower.air === 'venting') {
    tower.pressure = Math.min(1, tower.pressure + dt / VENT_SECONDS)
    if (tower.pressure >= 1) { tower.pressure = 1; tower.air = 'air' }
  }
  if (tower.phase === 'falling') {
    const air = tower.air === 'air'
    stepBall(tower.ball, dt, { g, air, t0: tower.t })
    stepBall(tower.feather, dt, { g, air, t0: tower.t })
    tower.t += dt
    if (tower.ball.atRest && tower.feather.atRest) tower.phase = 'done'
  }
  return tower
}
