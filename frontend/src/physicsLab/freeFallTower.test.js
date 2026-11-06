import { describe, it, expect } from 'vitest'
import { createTower, startPump, letAirIn, release, replay, stepTower, DROP_HEIGHT, PUMP_SECONDS } from './freeFallTower'
import { vacuumFallTime, terminalSpeed } from '../engine/dropTower'

const run = (tower, seconds, dt = 1 / 60) => {
  for (let t = 0; t < seconds; t += dt) stepTower(tower, dt)
  return tower
}

describe('free fall tower station', () => {
  it('in air, the ball lands long before the feather', () => {
    const t = release(createTower())
    run(t, 20)
    expect(t.ball.firstImpact.t).toBeLessThan(1.5)
    expect(t.feather.firstImpact.t).toBeGreaterThan(8)
  })

  it('the feather drifts down at about its terminal speed', () => {
    const t = release(createTower())
    run(t, 20)
    expect(t.feather.firstImpact.speed).toBeCloseTo(terminalSpeed(0.003, 0.26, 9.81), 1)
    expect(t.feather.firstImpact.speed).toBeLessThan(1)
  })

  it('pumping takes a few seconds and blocks release until done', () => {
    const t = startPump(createTower())
    run(t, PUMP_SECONDS / 2)
    expect(t.air).toBe('pumping')
    expect(release(t).phase).toBe('ready')
    run(t, PUMP_SECONDS)
    expect(t.air).toBe('vacuum')
    expect(t.pressure).toBe(0)
  })

  it('in vacuum, ball and feather land together at √(2h/g)', () => {
    const t = startPump(createTower())
    run(t, PUMP_SECONDS + 1)
    release(t)
    run(t, 3)
    const exact = vacuumFallTime(DROP_HEIGHT, 9.81)
    expect(Math.abs(t.ball.firstImpact.t - exact)).toBeLessThan(1e-3)
    expect(Math.abs(t.feather.firstImpact.t - exact)).toBeLessThan(1e-3)
  })

  it('the steel ball bounces on the oak plinth; the feather does not', () => {
    const t = startPump(createTower())
    run(t, PUMP_SECONDS + 1)
    release(t)
    run(t, 8)
    expect(t.ball.bounces).toBeGreaterThan(2)
    expect(t.feather.bounces).toBe(0)
    expect(t.phase).toBe('done')
  })

  it('slow motion only changes how fast it plays, not the landing times', () => {
    const normal = release(createTower())
    run(normal, 20)
    const slow = release(createTower())
    run(slow, 20, 1 / 60 / 4)
    expect(slow.ball.firstImpact.t).toBeCloseTo(normal.ball.firstImpact.t, 3)
    expect(slow.feather.firstImpact.t).toBeCloseTo(normal.feather.firstImpact.t, 3)
  })

  it('a replay restarts the drop with the same air and gives the same result', () => {
    const t = startPump(createTower())
    run(t, PUMP_SECONDS + 1)
    release(t)
    run(t, 8)
    const first = t.ball.firstImpact.t
    replay(t)
    expect(t.phase).toBe('falling')
    expect(t.t).toBe(0)
    expect(t.air).toBe('vacuum')
    run(t, 8)
    expect(t.ball.firstImpact.t).toBeCloseTo(first, 6)
  })

  it('a replay waits while the pump is running', () => {
    const t = startPump(createTower())
    expect(replay(t).phase).toBe('ready')
  })

  it('letting air in refills the tubes', () => {
    const t = startPump(createTower())
    run(t, PUMP_SECONDS + 1)
    letAirIn(t)
    run(t, 2)
    expect(t.air).toBe('air')
    expect(t.pressure).toBe(1)
  })
})
