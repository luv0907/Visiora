import { describe, it, expect } from 'vitest'
import {
  APPLIANCES, LEVELS, analyze, applyTool, edgeKey, movePart, newState, node, settle, starsFor, step, updatePart, warp, withIds,
} from './board'
import { FAN, MAINS_LAMP, TORCH_BULB, T_ROOM } from './components'

const E = (c1, r1, c2, r2) => edgeKey(node(c1, r1), node(c2, r2))
const level = id => LEVELS.find(l => l.id === id)
const BULB = E(1, 0, 1, 1), BATT = E(0, 0, 0, 1), TOP = E(0, 0, 1, 0), BOTTOM = E(0, 1, 1, 1)

// A unit square: battery on the left side (+ at the top), bulb on the right, wires top and bottom.
const loop = (right = { type: 'bulb' }, battery = { type: 'battery', cells: 2, flip: true }) => withIds({
  [BATT]: battery,
  [TOP]: { type: 'wire' },
  [BULB]: right,
  [BOTTOM]: { type: 'wire' },
})
/** Run the live simulation until `until` is true or `max` seconds pass; returns the time taken. */
function runUntil(board, state, until, max = 10, dt = 0.02, opts) {
  let t = 0, last
  while (t < max) {
    last = step(board, state, dt, opts)
    t += dt
    if (until(last.an, t, last)) break
  }
  return { t, ...last }
}

describe('bulbs: tungsten filaments', () => {
  it('a 3 V 0.3 A torch bulb on two fresh cells settles near 0.3 A and full brightness', () => {
    const { an } = settle(loop())
    const b = an.parts[BULB]
    expect(Math.abs(b.I)).toBeGreaterThan(0.28)
    expect(Math.abs(b.I)).toBeLessThan(0.32)
    expect(b.light).toBeGreaterThan(0.85)
    expect(b.light).toBeLessThan(1.3)
    expect(b.T).toBeGreaterThan(2600)
  })

  it('the same current flows all round a series loop', () => {
    const { an } = settle(loop())
    const I = Math.abs(an.parts[BULB].I)
    for (const k of [BATT, TOP, BOTTOM]) expect(Math.abs(an.parts[k].I)).toBeCloseTo(I, 9)
  })

  it('a cold filament takes a surge of current, then lights within a few hundredths of a second', () => {
    const board = loop(), state = newState()
    const cold = analyze(board, state)
    expect(Math.abs(cold.parts[BULB].I)).toBeGreaterThan(2) // about 1/14 of its hot resistance
    const lit = runUntil(board, state, an => an.parts[BULB].light > 0.8, 1, 0.002)
    expect(lit.t).toBeGreaterThan(0.005)
    expect(lit.t).toBeLessThan(0.15)
  })

  it('obeys the lamp law: 1.5 × the voltage gives about 4 × the light, and half the voltage a dull red glow', () => {
    const at = cells => settle(loop({ type: 'bulb' }, { type: 'supply', volts: cells, flip: true })).an.parts[BULB]
    const ratio = at(4.5).light / at(3).light
    expect(ratio).toBeGreaterThan(3.3)
    expect(ratio).toBeLessThan(4.6)
    const half = at(1.5)
    expect(half.light).toBeLessThan(0.08)
    expect(half.T).toBeLessThan(2100)
    // not Ohm's law: half the voltage gives about 70 % of the current, because the cooler filament has less resistance
    expect(Math.abs(half.I) / Math.abs(at(3).I)).toBeGreaterThan(0.64)
    expect(Math.abs(half.I) / Math.abs(at(3).I)).toBeLessThan(0.76)
  })

  it('a 3 V bulb survives 4.5 V but 6 V blows it, and then no current flows', () => {
    expect(settle(loop({ type: 'bulb' }, { type: 'supply', volts: 4.5, flip: true })).board[BULB].blown).toBeUndefined()
    const { board, an } = settle(loop({ type: 'bulb' }, { type: 'battery', cells: 4, flip: true }))
    expect(board[BULB].blown).toBe(true)
    expect(Math.abs(an.parts[TOP].I)).toBeLessThan(1e-9)
  })

  it('a 60 W mains lamp draws about 14 × its running current at switch-on', () => {
    const cold = 220 / MAINS_LAMP.R(T_ROOM), hot = 60 / 220
    expect(cold / hot).toBeGreaterThan(12)
    expect(cold / hot).toBeLessThan(16)
    expect(TORCH_BULB.R(TORCH_BULB.Top)).toBeCloseTo(10, 6)
  })
})

describe('switches, shorts, supplies', () => {
  it('an open switch stops the current, but a multimeter across it reads the whole battery', () => {
    const b = { ...loop(), [BOTTOM]: { type: 'switch', closed: false, id: 'sw' } }
    const probes = { plus: node(0, 1), minus: node(1, 1) }
    const an = analyze(b, null, { probes })
    for (const k of [BATT, TOP, BULB]) expect(Math.abs(an.parts[k].I)).toBeLessThan(1e-6)
    expect(Math.abs(an.probe)).toBeGreaterThan(3.1) // fresh alkaline cells: about 1.6 V each
  })

  it('a wire straight across the battery is a short circuit: big current, and the cells overheat and fail', () => {
    const shorted = loop({ type: 'wire' })
    const an = analyze(shorted)
    expect(an.short).toBe(true)
    expect(Math.abs(an.parts[TOP].I)).toBeGreaterThan(7)
    expect(analyze(loop()).short).toBe(false)
    expect(settle(shorted).board[BATT].blown).toBe(true)
  })

  it('turning the battery round reverses the current but not the brightness', () => {
    const a = settle(loop()).an.parts[BULB]
    const b = settle(loop({ type: 'bulb' }, { type: 'battery', cells: 2, flip: false })).an.parts[BULB]
    expect(b.I).toBeCloseTo(-a.I, 6)
    expect(b.light).toBeCloseTo(a.light, 6)
  })

  it('cells run down: a torch left on dims over hours, and its cells end up flat', () => {
    const board = loop(), state = settle(board).state
    const fresh = analyze(board, state).parts[BULB].light
    const after5h = warp(board, state, 5 * 3600).parts[BULB]
    expect(after5h.light).toBeLessThan(fresh * 0.75)
    for (let i = 0; i < 20; i++) warp(board, state, 3600)
    const flat = analyze(board, state).parts[BULB]
    expect(flat.light).toBeLessThan(0.01)
    expect(Math.abs(flat.I)).toBeLessThan(0.1) // a flat cell's internal resistance shoots up
  })

  it('a battery eliminator holds its voltage until it reaches its 2 A limit, then holds the current', () => {
    const at = R => analyze(loop({ type: 'resistor', R }, { type: 'supply', volts: 12, flip: true })).parts[BULB]
    expect(Math.abs(at(20).V)).toBeGreaterThan(11.9)
    expect(Math.abs(at(1).I)).toBeCloseTo(2, 6)
    expect(Math.abs(at(1).V)).toBeLessThan(2.1)
  })
})

describe('meters', () => {
  const metered = (meter, extra = {}) => withIds({ ...loop(), [BOTTOM]: meter, ...extra })

  it('an ammeter reads the current going in at its + terminal, and backwards when wired backwards', () => {
    // current runs + (top left) → bulb → bottom right → bottom left: through BOTTOM from dot (1,1) to (0,1)
    const fwd = settle(metered({ type: 'ammeter', range: 0.5, flip: true })).an.parts[BOTTOM]
    const back = settle(metered({ type: 'ammeter', range: 0.5 })).an.parts[BOTTOM]
    expect(fwd.reading).toBeGreaterThan(0.28)
    expect(back.reading).toBeCloseTo(-fwd.reading, 6)
  })

  it('its needle swings and settles on the reading, plus any zero error', () => {
    const board = metered({ type: 'ammeter', range: 0.5, flip: true, zero: 1 }), state = newState()
    const { an } = runUntil(board, state, () => false, 4)
    const want = an.parts[BOTTOM].reading / 0.5 + 1 / 50
    expect(an.parts[BOTTOM].needle).toBeCloseTo(want, 3)
  })

  it('an ammeter joined straight across the cells burns out almost at once', () => {
    const b = withIds({ [BATT]: { type: 'battery', cells: 2, flip: true }, [TOP]: { type: 'wire' }, [BULB]: { type: 'ammeter', range: 0.5 }, [BOTTOM]: { type: 'wire' } })
    const state = newState()
    let failedAt = null
    for (let t = 0; t < 1 && !failedAt; t += 0.01) if (step(b, state, 0.01).failed.includes(BULB)) failedAt = t
    expect(failedAt).not.toBeNull()
    expect(failedAt).toBeLessThan(0.1)
  })

  it('a voltmeter put in series by mistake stops the bulb lighting, and reads almost the full voltage', () => {
    const { an } = settle(withIds({ ...loop(), [BOTTOM]: { type: 'voltmeter', range: 5 } }))
    expect(an.parts[BULB].light).toBeLessThan(1e-3)
    expect(Math.abs(an.parts[BOTTOM].reading)).toBeGreaterThan(3.1)
  })
})

describe('heat: resistors, rheostats, coils, fuses', () => {
  it('a coil of nichrome wire warms up while the current flows, so its resistance creeps up', () => {
    const board = loop({ type: 'coil', R: 10 }, { type: 'battery', cells: 4, flip: true }), state = newState()
    const r0 = analyze(board, state).parts[BULB].R
    runUntil(board, state, () => false, 60, 0.5)
    const r1 = analyze(board, state).parts[BULB].R
    expect(r1 / r0).toBeGreaterThan(1.01)
    expect(r1 / r0).toBeLessThan(1.06)
  })

  it('a rheostat dims the bulb as it slides up, and at 0 Ω a 6 V supply blows it', () => {
    const dimmer = R => ({ ...loop({ type: 'bulb' }, { type: 'battery', cells: 4, flip: true }), [BOTTOM]: { type: 'rheostat', R, id: 'rh' } })
    const light = R => { const s = settle(dimmer(R)); return s.board[BULB].blown ? -1 : s.an.parts[BULB].light }
    expect(light(10)).toBeGreaterThan(light(30))
    expect(light(30)).toBeGreaterThan(0)
    expect(light(0)).toBe(-1)
  })

  it('a 2 W resistor run at 9 W burns out after a while, not at once', () => {
    const board = loop({ type: 'resistor', R: 10 }, { type: 'supply', volts: 9.5, flip: true }), state = newState()
    let t = 0, gone = false
    for (; t < 120 && !gone; t += 0.5) gone = step(board, state, 0.5).failed.includes(BULB)
    expect(gone).toBe(true)
    expect(t).toBeGreaterThan(3)
  })

  // the house: 220 V mains, a fuse in the live wire, and three appliances in parallel
  const house = (on, fuse = { type: 'fuse', rating: 5 }) => withIds({
    [E(0, 0, 0, 1)]: { type: 'mains', flip: true },
    [E(0, 1, 0, 2)]: { type: 'wire' },
    [E(0, 0, 1, 0)]: fuse,
    ...Object.fromEntries([1, 2, 3, 4, 5].map(c => [E(c, 0, c + 1, 0), { type: 'wire' }])),
    ...Object.fromEntries([0, 1, 2, 3, 4, 5].map(c => [E(c, 2, c + 1, 2), { type: 'wire' }])),
    ...Object.fromEntries([['lamp', 2], ['fan', 4], ['heater', 6]].flatMap(([type, c]) => [
      [E(c, 0, c, 1), { type: 'switch', closed: on.includes(type) }],
      [E(c, 1, c, 2), { type }],
    ])),
  })
  const FUSE_KEY = E(0, 0, 1, 0)

  it('house appliances in parallel each get the full 220 V and run at their rated power', () => {
    const { board, an } = settle(house(['lamp', 'fan']))
    expect(board[FUSE_KEY].melted).toBeUndefined()
    expect(an.parts[E(2, 1, 2, 2)].P).toBeGreaterThan(APPLIANCES.lamp.P * 0.97)
    expect(an.parts[E(2, 1, 2, 2)].P).toBeLessThan(APPLIANCES.lamp.P * 1.03)
    expect(an.parts[E(4, 1, 4, 2)].P).toBeGreaterThan(APPLIANCES.fan.P * 0.95)
    expect(an.parts[E(4, 1, 4, 2)].P).toBeLessThan(APPLIANCES.fan.P * 1.05)
    expect(an.short).toBe(false)
  })

  it('a ceiling fan takes seconds to come up to speed', () => {
    const board = house(['fan']), state = newState(), FANK = E(4, 1, 4, 2)
    runUntil(board, state, () => false, 1, 0.02)
    expect(state.parts[board[FANK].id].w).toBeLessThan(0.6 * FAN.wRun)
    runUntil(board, state, () => false, 40, 0.05)
    expect(state.parts[board[FANK].id].w).toBeGreaterThan(0.95 * FAN.wRun)
  })

  it('once the fuse melts, a still-spinning fan drives no current round the house and slows to a stop', () => {
    const board = house(['lamp', 'fan']), state = newState(), FANK = E(4, 1, 4, 2)
    runUntil(board, state, () => false, 20, 0.05)
    const cut = { ...board, [FUSE_KEY]: { ...board[FUSE_KEY], melted: true } }
    const an = step(cut, state, 0.05).an
    expect(Math.abs(an.parts[E(2, 1, 2, 2)].I)).toBeLessThan(1e-6)
    expect(Math.abs(an.parts[FANK].I)).toBeLessThan(1e-6)
    // a ceiling fan coasts for a minute or two, like a real one
    runUntil(cut, state, () => false, 60, 0.1)
    expect(state.parts[board[FANK].id].w).toBeLessThan(0.3 * FAN.wRun)
    runUntil(cut, state, () => false, 300, 0.2)
    expect(state.parts[board[FANK].id].w).toBe(0)
  })

  it('a 2000 W heater overloads a 5 A fuse: it melts after a second or two, not at once', () => {
    const board = house(['heater']), state = newState()
    let t = 0, melted = false
    for (; t < 20 && !melted; t += 0.02) melted = step(board, state, 0.02).failed.includes(FUSE_KEY)
    expect(melted).toBe(true)
    expect(t).toBeGreaterThan(0.8)
    expect(t).toBeLessThan(8)
  })

  it('on the 15 A power circuit, the heater runs and the fuse holds', () => {
    const { board, an } = settle(house(['lamp', 'fan', 'heater'], { type: 'fuse', rating: 15 }))
    expect(board[FUSE_KEY].melted).toBeUndefined()
    expect(an.parts[E(6, 1, 6, 2)].P).toBeGreaterThan(1850) // the mains sags a little under 10 A
  })

  it('a short across the mains melts a 5 A fuse within milliseconds', () => {
    const board = withIds({ ...house(['lamp']), [E(1, 0, 1, 1)]: { type: 'wire' }, [E(1, 1, 1, 2)]: { type: 'wire' } }), state = newState()
    let t = 0, melted = false
    for (; t < 1 && !melted; t += 0.001) melted = step(board, state, 0.001).failed.includes(FUSE_KEY)
    expect(melted).toBe(true)
    expect(t).toBeLessThan(0.05)
  })

  it('with thick copper wire in place of the fuse, a short overheats the house wiring instead', () => {
    const shorted = withIds({ ...house(['lamp'], { type: 'fuse', rating: 5, wire: 'copper' }), [E(1, 0, 1, 1)]: { type: 'wire' }, [E(1, 1, 1, 2)]: { type: 'wire' } })
    const state = newState()
    let failed = [], t = 0, smoking = false
    for (; t < 5 && !failed.length; t += 0.002) {
      const r = step(shorted, state, 0.002)
      failed = r.failed
      smoking ||= Object.entries(shorted).some(([k, p]) => p.type === 'wire' && r.an.parts[k].T > 433)
    }
    expect(smoking).toBe(true) // the PVC insulation passes 160 °C
    expect(failed.length).toBeGreaterThan(0)
    expect(failed.every(k => shorted[k].type === 'wire')).toBe(true) // a wire melts; the copper “fuse” survives
  })

  it('the lamp’s switch-on surge does not melt the fuse', () => {
    const board = house(['lamp']), state = newState()
    const r = runUntil(board, state, (an, t, x) => x.failed.length > 0, 2, 0.005)
    expect(r.failed).toEqual([])
  })
})

describe('bell', () => {
  it('rings by breaking its own circuit about 16 times a second, so the meter shows the average current', () => {
    const AM = BOTTOM
    const board = withIds({ ...loop({ type: 'bell' }, { type: 'supply', volts: 9, flip: true }), [AM]: { type: 'ammeter', range: 0.5, flip: true } })
    const state = newState()
    runUntil(board, state, () => false, 2, 0.01)
    const s = state.parts[board[BULB].id]
    expect(s.breaks).toBeGreaterThan(24)
    expect(s.breaks).toBeLessThan(40)
    const needle = state.parts[board[AM].id].x * 0.5
    expect(needle).toBeGreaterThan(0.1)
    expect(needle).toBeLessThan(0.22) // about 55 % of the 0.3 A that flows while the contact is closed
  })
})

describe('editing and puzzles', () => {
  it('tools place, operate and erase parts', () => {
    const k = E(2, 2, 3, 2)
    let b = applyTool({}, k, { type: 'switch' })
    expect(b[k]).toMatchObject({ type: 'switch', closed: true })
    b = applyTool(b, k, { type: 'hand' })
    expect(b[k].closed).toBe(false)
    b = applyTool(b, k, { type: 'resistor', R: 10 })
    b = applyTool(b, k, { type: 'hand' })
    expect(b[k]).toMatchObject({ type: 'resistor', R: 20 })
    expect(applyTool(b, k, { type: 'erase' })).toEqual({})
  })

  it('parts can be picked up and moved, keeping who they are', () => {
    const before = loop()
    const b = movePart(before, BULB, BOTTOM)
    expect(b[BOTTOM].type).toBe('bulb')
    expect(b[BOTTOM].id).toBe(before[BULB].id)
    expect(b[BULB].type).toBe('wire')
  })

  it('level checks: series bulbs are too dim, parallel bulbs pass', () => {
    const series = withIds({ ...loop(), [BOTTOM]: { type: 'bulb' } })
    expect(level('parallel').check(series, settle(series).an)).toBe(false)
    const parallel = withIds({ ...loop(), [E(1, 0, 2, 0)]: { type: 'wire' }, [E(2, 0, 2, 1)]: { type: 'bulb' }, [E(1, 1, 2, 1)]: { type: 'wire' } })
    expect(level('parallel').check(parallel, settle(parallel).an)).toBe(true)
    expect(starsFor(level('parallel'), Object.keys(parallel).length)).toBe(3)
  })

  it('the switch level needs the bulb to go dark when the switch opens', () => {
    const b = withIds({ ...loop(), [BOTTOM]: { type: 'switch', closed: true } })
    expect(level('switch').check(b, settle(b).an)).toBe(true)
    const bypassed = withIds({ ...b, [E(0, 1, 0, 2)]: { type: 'wire' }, [E(0, 2, 1, 2)]: { type: 'wire' }, [E(1, 1, 1, 2)]: { type: 'wire' } })
    expect(level('switch').check(bypassed, settle(bypassed).an)).toBe(false)
  })

  it('a 20 Ω resistor on 3 V makes a correctly wired ammeter read about 0.15 A', () => {
    const b = withIds({ ...loop({ type: 'resistor', R: 20 }), [BOTTOM]: { type: 'ammeter', range: 1, flip: true } })
    expect(level('ammeter').check(b, settle(b).an)).toBe(true)
  })

  it('two batteries with a 10 Ω resistor light the bulb safely; without it the bulb blows', () => {
    const b = withIds({
      [BATT]: { type: 'battery', cells: 2, flip: true },
      [TOP]: { type: 'battery', cells: 2, flip: false },
      [BULB]: { type: 'bulb' },
      [BOTTOM]: { type: 'resistor', R: 10 },
    })
    const s = settle(b)
    expect(level('safe').check(s.board, s.an)).toBe(true)
    const direct = settle(withIds({ ...b, [BOTTOM]: { type: 'wire' } }))
    expect(level('safe').check(direct.board, direct.an)).toBe(false)
  })

  it('a setting can be changed in place', () => {
    const b = updatePart(loop(), BATT, { cells: 3 })
    expect(b[BATT].cells).toBe(3)
  })
})
