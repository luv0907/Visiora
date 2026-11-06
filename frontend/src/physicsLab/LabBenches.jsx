/**
 * VISIORA — the benches in the 3D room. Each one has its state, how that state moves the
 * Blender parts, and its controls. The physics itself lives in engine/labBenches.js.
 *
 * To add a bench: add an entry to BENCHES and a matching station in labStations.js.
 */
import React, { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import {
  OHM_RANGE, OPTICS, PENDULUM_LENGTHS, RAMP, RAMP_SURFACES,
  blockAt, cartAt, gateReadings, glidersAt, glidersRun, needleAngle, ohmBench, opticsState, rampRun, smallAnglePeriod, stepSwing, swingPeriod,
} from '../engine/labBenches'

const DEG = Math.PI / 180
const MAX_BULB_WATTS = ohmBench(OHM_RANGE.volts[1], OHM_RANGE.rheostat[0]).bulbWatts
const n = (v, digits = 2) => (v == null ? '—' : v.toFixed(digits))

function Slider({ label, value, min, max, step, unit, onChange, disabled }) {
  return (
    <label className="lx-slider">
      <span className="lx-slider-head"><span>{label}</span><strong>{value}{unit ? ` ${unit}` : ''}</strong></span>
      <input type="range" min={min} max={max} step={step} value={value} disabled={disabled} onChange={e => onChange(Number(e.target.value))} />
    </label>
  )
}

function Choice({ label, options, value, onChange, disabled }) {
  return (
    <div className="lx-choice" role="group" aria-label={label}>
      <span className="pl-label">{label}</span>
      <div className="pv-seg">
        {options.map(o => (
          <button key={o.id} className={`pv-chip ${value === o.id ? 'is-on' : ''}`} aria-pressed={value === o.id} disabled={disabled} onClick={() => onChange(o.id)}>{o.label}</button>
        ))}
      </div>
    </div>
  )
}

function Readings({ rows }) {
  return <table className="pl-table"><tbody>{rows.map(([k, v]) => <tr key={k}><td>{k}</td><td>{v}</td></tr>)}</tbody></table>
}

function RunButtons({ s, set, label = 'Release', onRun, disabled }) {
  return (
    <div className="pl-actions">
      <button className="pl-btn is-go" disabled={s.running || disabled} onClick={onRun}>{label}</button>
      <button className="pl-btn is-ghost" disabled={!s.running && s.t === 0} onClick={() => set(BENCH_RESET)}>Reset</button>
    </div>
  )
}
const BENCH_RESET = { t: 0, running: false }

// ── Motion track ─────────────────────────────────────────────────────────────
const motion = {
  create: () => ({ u: 0.5, a: 0, t: 0, running: false }),
  run: s => { s.t = 0; s.running = true },
  step(s, dt) {
    if (!s.running) return
    s.t += dt
    if (cartAt(s.t, s.u, s.a).done) s.running = false
  },
  apply(s, get) {
    const cart = get('MT_CartBody')
    if (cart) cart.position.x = cartAt(s.t, s.u, s.a).x
  },
  Panel({ s, set, run }) {
    const gates = gateReadings(s.u, s.a)
    const passed = t => (t != null && s.t >= t ? `${t.toFixed(2)} s` : '—')
    const finished = !s.running && s.t > 0
    return (
      <>
        <Slider label="Push speed" value={s.u} min={0.2} max={1} step={0.05} unit="m/s" disabled={s.running} onChange={u => set({ u, ...BENCH_RESET })} />
        <Slider label="Acceleration" value={s.a} min={-0.3} max={0.5} step={0.05} unit="m/s²" disabled={s.running} onChange={a => set({ a, ...BENCH_RESET })} />
        <RunButtons s={s} set={set} onRun={run} />
        <Readings rows={[
          ['Reached gate 1', passed(gates.t1)],
          ['Reached gate 2', passed(gates.t2)],
          ['Speed between gates', finished && gates.speed != null ? `${gates.speed.toFixed(2)} m/s` : '—'],
          ['Speed now', `${cartAt(s.t, s.u, s.a).v.toFixed(2)} m/s`],
        ]} />
        {finished && (
          <p className="pv-result">{gates.t2 == null
            ? 'The cart stopped before the second gate, so slowing down won.'
            : s.a === 0 ? 'No acceleration: the speed stayed the same all the way.'
              : s.a > 0 ? 'The cart gained speed, so it moved faster between the gates than your push.'
                : 'The cart lost speed, so it moved slower between the gates than your push.'}</p>
        )}
      </>
    )
  },
}

// ── Friction ramp ────────────────────────────────────────────────────────────
const surfaceOf = s => RAMP_SURFACES.find(r => r.id === s.surface)
const friction = {
  create: () => ({ surface: 'wood', t: 0, running: false }),
  run: s => { s.t = 0; s.tried = s.surface; s.running = rampRun(surfaceOf(s)).slides },
  step(s, dt) {
    if (!s.running) return
    s.t += dt
    if (blockAt(s.t, surfaceOf(s)).done) s.running = false
  },
  apply() {},
  Scene({ s }) {
    const block = useRef(null)
    useFrame(() => {
      if (!block.current) return
      const surface = surfaceOf(s)
      const at = blockAt(s.t, surface)
      block.current.position.set(at.x, at.y + 0.05, surface.z)
    })
    return (
      <mesh ref={block} name="FR_Block" rotation={[0, 0, RAMP.angle]}>
        <boxGeometry args={[0.14, 0.08, 0.1]} />
        <meshStandardMaterial color="#B5763A" roughness={0.7} />
      </mesh>
    )
  },
  Panel({ s, set, run }) {
    const surface = surfaceOf(s)
    const r = rampRun(surface)
    const tan = Math.tan(RAMP.angle)
    const tried = s.tried === surface.id
    return (
      <>
        <Choice label="Surface" options={RAMP_SURFACES} value={s.surface} disabled={s.running} onChange={id => set({ surface: id, tried: null, ...BENCH_RESET })} />
        <RunButtons s={s} set={set} onRun={run} />
        <Readings rows={[
          ['Ramp steepness (tan θ)', n(tan)],
          ['Surface grip (μs)', n(surface.mus)],
          ['Acceleration', tried && r.slides ? `${r.a.toFixed(2)} m/s²` : '—'],
          ['Time to the bottom', tried && r.slides ? `${r.time.toFixed(2)} s` : '—'],
        ]} />
        {tried && (
          <p className="pv-result">{r.slides
            ? `It slides: the ramp’s steepness (${n(tan)}) is more than the surface’s grip (${n(surface.mus)}).`
            : `It stays put: the surface’s grip (${n(surface.mus)}) is more than the ramp’s steepness (${n(tan)}).`}</p>
        )}
      </>
    )
  },
}

// ── Air track ────────────────────────────────────────────────────────────────
const gliderRun = s => glidersRun({ ma: s.ma, mb: s.mb, ua: s.ua, e: s.e })
const collisions = {
  create: () => ({ ma: 0.2, mb: 0.2, ua: 0.4, e: 1, t: 0, running: false }),
  run: s => { s.t = 0; s.running = true },
  step(s, dt) {
    if (!s.running) return
    s.t += dt
    if (glidersAt(s.t, gliderRun(s)).done) s.running = false
  },
  apply(s, get) {
    const at = glidersAt(s.t, gliderRun(s))
    const a = get('AT_GliderA'), b = get('AT_GliderB')
    if (a) a.position.x = at.a
    if (b) b.position.x = at.b
  },
  Panel({ s, set, run }) {
    const r = gliderRun(s)
    const hit = s.t >= r.hit
    const fresh = v => ({ ...v, ...BENCH_RESET })
    return (
      <>
        <Slider label="Yellow glider mass" value={s.ma} min={0.1} max={0.6} step={0.1} unit="kg" disabled={s.running} onChange={ma => set(fresh({ ma }))} />
        <Slider label="Blue glider mass" value={s.mb} min={0.1} max={0.6} step={0.1} unit="kg" disabled={s.running} onChange={mb => set(fresh({ mb }))} />
        <Slider label="Yellow glider speed" value={s.ua} min={0.1} max={0.8} step={0.1} unit="m/s" disabled={s.running} onChange={ua => set(fresh({ ua }))} />
        <Choice label="When they meet" options={[{ id: 1, label: 'Bounce' }, { id: 0, label: 'Stick' }]} value={s.e} disabled={s.running} onChange={e => set(fresh({ e }))} />
        <RunButtons s={s} set={set} label="Push" onRun={run} />
        <Readings rows={[
          ['Momentum before', `${r.before.momentum.toFixed(3)} kg·m/s`],
          ['Momentum after', hit ? `${r.final.momentum.toFixed(3)} kg·m/s` : '—'],
          ['Energy before', `${r.before.energy.toFixed(3)} J`],
          ['Energy after', hit ? `${r.final.energy.toFixed(3)} J` : '—'],
          ['Speeds after', hit ? `${r.after.va.toFixed(2)} and ${r.after.vb.toFixed(2)} m/s` : '—'],
        ]} />
        {hit && <p className="pv-result">Momentum stayed the same. {s.e === 1 ? 'Energy did too, because this was a perfect bounce.' : 'Some energy was lost, because the gliders stuck together.'}</p>}
      </>
    )
  },
}

// ── Pendulums ────────────────────────────────────────────────────────────────
const SWINGS = ['PD_Swing0', 'PD_Swing1', 'PD_Swing2']
const pendulum = {
  create: () => ({ deg: 8, t: 0, running: false, swings: PENDULUM_LENGTHS.map(() => ({ theta: 0, omega: 0 })) }),
  run(s) {
    s.t = 0
    s.running = true
    s.swings = PENDULUM_LENGTHS.map(() => ({ theta: s.deg * DEG, omega: 0 }))
  },
  step(s, dt) {
    if (!s.running) return
    s.t += dt
    s.swings.forEach((sw, i) => stepSwing(sw, dt, PENDULUM_LENGTHS[i]))
  },
  apply(s, get) {
    SWINGS.forEach((name, i) => { const o = get(name); if (o) o.rotation.z = s.swings[i].theta })
  },
  Panel({ s, set, run }) {
    const stop = () => set({ ...BENCH_RESET, swings: PENDULUM_LENGTHS.map(() => ({ theta: 0, omega: 0 })) })
    return (
      <>
        <Slider label="Release angle" value={s.deg} min={2} max={15} step={1} unit="°" disabled={s.running} onChange={deg => set({ deg })} />
        <div className="pl-actions">
          <button className="pl-btn is-go" disabled={s.running} onClick={run}>Release</button>
          <button className="pl-btn is-ghost" disabled={!s.running} onClick={stop}>Stop</button>
        </div>
        <table className="pl-table lx-periods">
          <thead><tr><th>String</th><th>Formula</th><th>Exact</th></tr></thead>
          <tbody>
            {PENDULUM_LENGTHS.map(L => (
              <tr key={L}><td>{L.toFixed(2)} m</td><td>{smallAnglePeriod(L).toFixed(2)} s</td><td>{swingPeriod(L, s.deg * DEG).toFixed(2)} s</td></tr>
            ))}
          </tbody>
        </table>
        <p className="pv-result">Longer strings take longer for each swing. The formula T = 2π√(L/g) has no mass in it, and changing the release angle barely matters at small angles.</p>
      </>
    )
  },
}

// ── Optics bench ─────────────────────────────────────────────────────────────
const optics = {
  create: () => ({ lens: 9.5, screen: 10.8, f: 0.3 }),
  step() {},
  apply(s, get) {
    const lens = get('OB_LensStand'), screen = get('OB_ScreenStand')
    if (lens) lens.position.x = s.lens
    if (screen) screen.position.x = s.screen
  },
  Scene({ s }) {
    // The image on the screen: an upside-down arrow, faint and fading when out of focus.
    const group = useRef(null)
    const materials = useMemo(() => new THREE.MeshBasicMaterial({ color: '#2B1B0F', transparent: true, depthWrite: false }), [])
    useFrame(() => {
      const g = group.current
      if (!g) return
      const o = opticsState(s.lens, s.screen, s.f)
      g.visible = o.real && o.screenDistance > 0
      if (!g.visible) return
      g.position.x = s.screen - 0.012
      const height = Math.min(0.22, o.height)
      g.scale.set(1, height / 0.05, 1)
      materials.opacity = o.sharp ? 0.95 : Math.max(0.1, 0.5 - Math.abs(o.miss))
    })
    return (
      <group ref={group} position={[10.788, 1.22, 1.2]} rotation={[0, -Math.PI / 2, 0]}>
        <mesh material={materials} position={[0, 0.006, 0]}><planeGeometry args={[0.01, 0.038]} /></mesh>
        <mesh material={materials} position={[0, -0.02, 0]} rotation={[0, 0, Math.PI]}><circleGeometry args={[0.02, 3]} /></mesh>
      </group>
    )
  },
  Panel({ s, set }) {
    const o = opticsState(s.lens, s.screen, s.f)
    return (
      <>
        <Slider label="Lens position" value={Number((s.lens - OPTICS.object).toFixed(2))} min={0.25} max={1.85} step={0.01} unit="m from the object" onChange={d => set({ lens: OPTICS.object + d })} />
        <Slider label="Screen position" value={Number((s.screen - OPTICS.object).toFixed(2))} min={0.6} max={2.35} step={0.01} unit="m from the object" onChange={d => set({ screen: OPTICS.object + d })} />
        <Choice label="Lens strength" options={[{ id: 0.2, label: 'f = 20 cm' }, { id: 0.3, label: 'f = 30 cm' }]} value={s.f} onChange={f => set({ f })} />
        <Readings rows={[
          ['Object to lens (u)', `${n(o.u)} m`],
          ['Image forms at (v)', o.real ? `${n(o.v)} m behind the lens` : 'No real image'],
          ['Lens to screen', `${n(o.screenDistance)} m`],
          ['Image size', o.real ? `${n(o.magnification)} × the object` : '—'],
        ]} />
        <p className={`pv-result ${o.sharp ? 'lx-sharp' : ''}`}>{o.screenDistance <= 0
          ? 'The screen is behind the lens. Move it to the other side.'
          : !o.real ? 'The object is inside the focal length, so no image can fall on the screen.'
            : o.sharp ? 'In focus! The image is sharp and upside down.'
              : `Out of focus. Move the screen ${o.miss > 0 ? 'closer to' : 'further from'} the lens, or move the lens.`}</p>
      </>
    )
  },
}

// ── Ohm's law bench ──────────────────────────────────────────────────────────
const ohm = {
  create: () => ({ V: 6, R: 20 }),
  step() {},
  apply(s, get) {
    const b = ohmBench(s.V, s.R)
    const amm = get('OL_AmmeterNeedle'), volt = get('OL_VoltmeterNeedle'), slider = get('OL_Slider')
    if (amm) amm.rotation.z = -needleAngle(b.I, OHM_RANGE.ammeter)
    if (volt) volt.rotation.z = -needleAngle(b.rheostatVolts, OHM_RANGE.voltmeter)
    if (slider) slider.position.x = -0.2 + 0.5 * ((s.R - OHM_RANGE.rheostat[0]) / (OHM_RANGE.rheostat[1] - OHM_RANGE.rheostat[0]))
    for (const name of ['OL_LampA', 'OL_LampB']) {
      const lamp = get(name)
      if (!lamp?.material) continue
      if (!lamp.userData.own) {
        lamp.material = lamp.material.clone()
        lamp.userData.own = true
        lamp.material.color.set('#5A5248') // unlit glass, so a dim bulb really looks dim
        lamp.material.emissive = new THREE.Color('#FFB347')
      }
      lamp.material.emissiveIntensity = 4 * Math.min(1, b.bulbWatts / MAX_BULB_WATTS)
    }
  },
  // The needles are small from here, so each meter also shows its reading above it.
  Scene({ s, active }) {
    if (!active) return null
    const b = ohmBench(s.V, s.R)
    return (
      <>
        <Html position={[-1.705, 1.24, -7.3]} center zIndexRange={[3, 0]} style={{ pointerEvents: 'none' }}><span className="pv-tag">{b.I.toFixed(3)} A</span></Html>
        <Html position={[-1.25, 1.24, -7.3]} center zIndexRange={[3, 0]} style={{ pointerEvents: 'none' }}><span className="pv-tag">{b.rheostatVolts.toFixed(2)} V</span></Html>
      </>
    )
  },
  Panel({ s, set }) {
    const b = ohmBench(s.V, s.R)
    return (
      <>
        <Slider label="Power supply" value={s.V} min={OHM_RANGE.volts[0]} max={OHM_RANGE.volts[1]} step={1} unit="V" onChange={V => set({ V })} />
        <Slider label="Rheostat" value={s.R} min={OHM_RANGE.rheostat[0]} max={OHM_RANGE.rheostat[1]} step={1} unit="Ω" onChange={R => set({ R })} />
        <Readings rows={[
          ['Ammeter (current)', `${b.I.toFixed(3)} A`],
          ['Voltmeter (across rheostat)', `${b.rheostatVolts.toFixed(2)} V`],
          ['Total resistance', `${b.total} Ω`],
          ['V ÷ I on the rheostat', `${(b.rheostatVolts / b.I).toFixed(1)} Ω`],
        ]} />
        <p className="pv-result">V ÷ I across the rheostat always equals its resistance. That is Ohm’s law. Each bulb is treated as a fixed 10 Ω.</p>
      </>
    )
  },
}

export const BENCHES = { motion, friction, collisions, pendulum, optics, ohm }

export function createBenchStates() {
  return Object.fromEntries(Object.entries(BENCHES).map(([id, b]) => [id, b.create()]))
}

/** Runs the chosen bench each frame and keeps every bench's parts in their right place. */
export function BenchRunner({ states, activeId, onTick }) {
  const { scene } = useThree()
  const found = useRef({})
  const last = useRef(0)
  const get = name => {
    if (!found.current[name]) found.current[name] = scene.getObjectByName(name)
    return found.current[name]
  }
  useFrame((_, delta) => {
    const dt = Math.min(delta, 1)
    for (const [id, bench] of Object.entries(BENCHES)) {
      if (id === activeId) bench.step(states[id], dt)
      bench.apply(states[id], get)
    }
    const now = performance.now()
    if (activeId && states[activeId]?.running && now - last.current > 100) { last.current = now; onTick() }
    if (activeId && states[activeId]?.wasRunning && !states[activeId].running) onTick()
    if (activeId) states[activeId].wasRunning = states[activeId].running
  })
  return (
    <>
      {Object.entries(BENCHES).map(([id, b]) => b.Scene && <b.Scene key={id} s={states[id]} active={id === activeId} />)}
    </>
  )
}

export function BenchPanelBody({ id, state, update }) {
  const bench = BENCHES[id]
  const set = patch => { Object.assign(state, patch); update() }
  const run = () => { bench.run(state); update() }
  return <bench.Panel s={state} set={set} run={run} />
}

export const canRun = id => Boolean(BENCHES[id]?.run)
export const runBench = (id, state) => BENCHES[id].run(state)
