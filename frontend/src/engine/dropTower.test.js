import { describe, it, expect } from 'vitest'
import { createBall, stepBall, vacuumFallTime, terminalSpeed, RESTITUTION } from './dropTower'

// Run a ball with animation-sized frames, like the 3D lab does.
function run(ball, { g, air = false, frame = 1 / 60, until = 60, stop = b => b.atRest }) {
  let t = 0
  const path = []
  while (t < until && !stop(ball)) {
    stepBall(ball, frame, { g, air, t0: t })
    t += frame
    path.push({ t, y: ball.y, v: ball.v })
  }
  return { t, path }
}

const beach = h => createBall({ height: h, mass: 1, radius: 0.6, restitution: RESTITUTION.beachBall })
const heavy = h => createBall({ height: h, mass: 50, radius: 0.9, restitution: RESTITUTION.heavyBall })

describe('drop tower: vacuum', () => {
  it('first impact matches √(2h/g) to under a millisecond', () => {
    for (const [h, g] of [[10, 9.81], [30, 9.81], [50, 1.62], [5, 24.79]]) {
      const b = beach(h)
      run(b, { g, stop: x => x.firstImpact })
      expect(Math.abs(b.firstImpact.t - vacuumFallTime(h, g))).toBeLessThan(1e-3)
    }
  })

  it('mass does not matter: both balls land together', () => {
    const a = beach(30), b = heavy(30)
    run(a, { g: 9.81, stop: x => x.firstImpact })
    run(b, { g: 9.81, stop: x => x.firstImpact })
    expect(Math.abs(a.firstImpact.t - b.firstImpact.t)).toBeLessThan(1e-6)
  })

  it('impact speed is √(2gh)', () => {
    const b = beach(20)
    run(b, { g: 9.81, stop: x => x.firstImpact })
    expect(b.firstImpact.speed).toBeCloseTo(Math.sqrt(2 * 9.81 * 20), 2)
  })

  it('the first rebound rises to e²·h', () => {
    const h = 10, g = 9.81, e = RESTITUTION.beachBall
    const b = beach(h)
    const { path } = run(b, { g, stop: x => x.bounces >= 1 && x.v < 0 })
    const apex = Math.max(...path.filter(p => p.t > vacuumFallTime(h, g) + 0.01).map(p => p.y))
    expect(apex).toBeCloseTo(e * e * h, 1)
  })

  it('keeps bouncing lower and settles; never goes below the pad', () => {
    const b = beach(10)
    const { t, path } = run(b, { g: 9.81 })
    expect(b.atRest).toBe(true)
    expect(b.bounces).toBeGreaterThan(3)
    expect(t).toBeLessThan(15)
    expect(Math.min(...path.map(p => p.y))).toBeGreaterThanOrEqual(0)
  })

  it('the heavy ball barely bounces', () => {
    const b = heavy(10)
    const { path } = run(b, { g: 9.81 })
    const apex = Math.max(...path.filter(p => p.t > vacuumFallTime(10, 9.81) + 0.01).map(p => p.y), 0)
    expect(apex).toBeLessThan(0.3) // e² · 10 m = 0.225 m
    expect(b.atRest).toBe(true)
  })
})

describe('drop tower: with air', () => {
  it('the heavy ball lands first', () => {
    const a = beach(30), b = heavy(30)
    run(a, { g: 9.81, air: true, stop: x => x.firstImpact })
    run(b, { g: 9.81, air: true, stop: x => x.firstImpact })
    expect(b.firstImpact.t).toBeLessThan(a.firstImpact.t)
  })

  it('the beach ball reaches its terminal speed', () => {
    const a = beach(50)
    run(a, { g: 9.81, air: true, stop: x => x.firstImpact })
    expect(a.firstImpact.speed).toBeCloseTo(terminalSpeed(1, 0.6, 9.81), 1)
  })

  it('drag also acts on the way up: rebounds are lower than in vacuum', () => {
    const h = 10, g = 9.81
    const inAir = beach(h)
    const { path } = run(inAir, { g, air: true, stop: x => x.bounces >= 1 && x.v < 0 })
    const tImpact = inAir.firstImpact.t
    const apex = Math.max(...path.filter(p => p.t > tImpact + 0.01).map(p => p.y))
    const e = RESTITUTION.beachBall
    // Rebound speed is e·v_impact; without drag it would reach (e·v)²/2g.
    const noDragApex = (e * inAir.firstImpact.speed) ** 2 / (2 * g)
    expect(apex).toBeLessThan(noDragApex)
    expect(apex).toBeGreaterThan(0)
  })
})
