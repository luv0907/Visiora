/**
 * VISIORA Studio — Explore tab of Light: a ray box in a darkened room. Put glass blocks, a
 * prism, a semicircular block, lenses, a water tank and a mirror on the bench, drag and turn
 * them and the ray box, and watch every ray (with its faint reflections) traced exactly.
 * White light splits into colours; the angles at the first surface are read out.
 */
import React, { useMemo, useRef, useState } from 'react'
import { useCanvas } from '../components/motion/useCanvas'
import { LIGHTS, MATERIALS, SHAPES, criticalAngle, dirOf, indexOf, mainPath, makeShape, traceBeam, vec } from '../engine/raybench'
import { paintBench } from './lightDraw'
import Ideas, { loadIdeas, nextIdea } from './LightIdeas'
import { ExperimentShell, Group, Icon, Options, Slider, Toggle } from './Shell'

const PRESETS = {
  prism: { label: 'Rainbow from a prism', light: 'white', beam: 'ray', box: { x: -115, y: 30, deg: -14 }, shapes: [['prism', 0, 0, 0]] },
  slab: { label: 'Through a glass slab', light: 'red', beam: 'ray', box: { x: -110, y: -75, deg: 35 }, shapes: [['slab', 0, 0, 0]] },
  critical: { label: 'Critical angle', light: 'green', beam: 'ray', box: { x: -63, y: 90, deg: -55 }, shapes: [['semi', 0, 0, 180]], hint: 'The light goes in through the curved side, aimed at the centre of the flat face, so it does not bend going in. Use the slider to swing the ray box round the curve, still aimed at the centre: past about 41° no light gets out.' },
  lens: { label: 'Convex lens focus', light: 'red', beam: 'beam', box: { x: -125, y: 0, deg: 0 }, shapes: [['lens', -40, 0, 0]] },
  concave: { label: 'Concave lens', light: 'blue', beam: 'beam', box: { x: -125, y: 0, deg: 0 }, shapes: [['concave', -40, 0, 0]] },
  water: { label: 'Into water', light: 'green', beam: 'ray', box: { x: -115, y: -75, deg: 30 }, shapes: [['tank', 10, 20, 0]] },
  mirror: { label: 'Plane mirror', light: 'red', beam: 'ray', box: { x: -115, y: -60, deg: 20 }, shapes: [['mirror', 0, 30, 0]] },
}
const BEAM_SPREAD = [-12, -6, 0, 6, 12] // a parallel beam: five rays 6 mm apart

function load(id) {
  const p = PRESETS[id]
  return { box: { ...p.box }, light: p.light, beam: p.beam, shapes: p.shapes.map(([k, x, y, r]) => makeShape(k, x, y, r)) }
}

export default function LightBench({ tabs, onTab }) {
  const [mode, setMode] = useState(() => (nextIdea(loadIdeas()) != null ? 'ideas' : 'free'))
  if (mode === 'ideas') return <Ideas tabs={tabs} onTab={onTab} onFree={() => setMode('free')} />
  return <FreeBench tabs={tabs} onTab={onTab} onIdeas={() => setMode('ideas')} />
}

function FreeBench({ tabs, onTab, onIdeas }) {
  const [preset, setPreset] = useState('prism')
  const [state, setState] = useState(() => load('prism'))
  const [selected, setSelected] = useState(null)
  const [faint, setFaint] = useState(true)
  const [angles, setAngles] = useState(true)
  const { box, light, beam, shapes } = state
  const set = ch => setState(s => ({ ...s, ...ch }))
  const sel = shapes.find(s => s.id === selected)
  const change = ch => set({ shapes: shapes.map(s => (s.id === selected ? { ...s, ...ch } : s)) })

  const rays = useMemo(() => {
    const d = dirOf(box.deg), perp = [-d[1], d[0]]
    const starts = (beam === 'beam' ? BEAM_SPREAD : [0]).map(o => vec.add([box.x, box.y], perp, o))
    return starts.flatMap(p => traceBeam(shapes, vec.add(p, d, 9), d, { lams: LIGHTS[light].lams, minI: faint ? 0.004 : 0.08 }))
  }, [box, light, beam, shapes, faint])
  // the angles where the central ray first meets glass
  const first = useMemo(() => {
    const d = dirOf(box.deg)
    const path = mainPath(shapes, vec.add([box.x, box.y], d, 9), d, { lam: LIGHTS[light].lams[Math.floor(LIGHTS[light].lams.length / 2)] })
    return path.events
  }, [box, light, shapes])

  const viewRef = useRef(null)
  const drag = useRef(null)
  const { ref } = useCanvas((ctx, w, h) => {
    viewRef.current = paintBench(ctx, w, h, { shapes, selected, rays, first, angles, light, box })
  }, [rays, shapes, selected, box, angles, first, light])

  const pointer = e => { const r = e.currentTarget.getBoundingClientRect(); return viewRef.current?.inv(e.clientX - r.left, e.clientY - r.top) }
  const inside = (s, p) => {
    const lp = vec.sub(p, [s.x, s.y]), c = Math.cos((-s.rot * Math.PI) / 180), sn = Math.sin((-s.rot * Math.PI) / 180)
    const q = [lp[0] * c - lp[1] * sn, lp[0] * sn + lp[1] * c]
    const size = s.kind === 'slab' || s.kind === 'tank' ? [s.w / 2, s.h / 2] : s.kind === 'prism' ? [s.s / 2, s.s / 2] : s.kind === 'semi' ? [s.r, s.r] : s.kind === 'mirror' ? [s.len / 2, 6] : [12, s.a]
    return Math.abs(q[0]) <= size[0] + 3 && Math.abs(q[1]) <= size[1] + 3
  }
  const onDown = e => {
    const p = pointer(e); if (!p) return
    const d = dirOf(box.deg), hnd = vec.add([box.x, box.y], d, -20)
    if (Math.hypot(p[0] - hnd[0], p[1] - hnd[1]) < 8) drag.current = { kind: 'turn' }
    else if (Math.hypot(p[0] - box.x, p[1] - box.y) < 14) drag.current = { kind: 'box', off: vec.sub([box.x, box.y], p) }
    else {
      const s = [...shapes].reverse().find(s => inside(s, p))
      setSelected(s?.id ?? null)
      if (!s) return
      drag.current = { kind: 'shape', id: s.id, off: vec.sub([s.x, s.y], p) }
    }
    e.currentTarget.setPointerCapture?.(e.pointerId)
  }
  const onMove = e => {
    const g = drag.current; if (!g) return
    const p = pointer(e); if (!p) return
    if (g.kind === 'turn') set({ box: { ...box, deg: Math.round((Math.atan2(box.y - p[1], box.x - p[0]) * 180) / Math.PI * 2) / 2 } })
    else if (g.kind === 'box') set({ box: { ...box, x: p[0] + g.off[0], y: p[1] + g.off[1] } })
    else set({ shapes: shapes.map(s => (s.id === g.id ? { ...s, x: Math.round(p[0] + g.off[0]), y: Math.round(p[1] + g.off[1]) } : s)) })
  }
  const onUp = () => { drag.current = null }
  const add = kind => { const s = makeShape(kind, 20, 0, 0); set({ shapes: [...shapes, s] }); setSelected(s.id) }

  const orbit = shapes[0] ? Math.max(0, Math.min(70, (Math.atan2(shapes[0].x - box.x, box.y - shapes[0].y) * 180) / Math.PI)) : 0
  const e0 = first.find(e => !e.mirror && e.i > 0.2) ?? first[0]
  const lamMid = LIGHTS[light].lams[Math.floor(LIGHTS[light].lams.length / 2)]
  const panel = (
    <>
      <button className="st-btn st-btn-secondary st-btn-wide" onClick={onIdeas}><Icon name="target" />Guided ideas: predict, try, explain</button>
      <Group label="Try one">
        <div className="st-chipset">
          {Object.entries(PRESETS).map(([id, p]) => (
            <button key={id} className={`st-chip ${preset === id ? 'is-on' : ''}`} onClick={() => { setPreset(id); setState(load(id)); setSelected(null) }}>{p.label}</button>
          ))}
        </div>
      </Group>
      {PRESETS[preset].hint && <p className="st-callout">{PRESETS[preset].hint}</p>}
      <Group label="Ray box">
        <Options label="Light" value={light} onChange={l => set({ light: l })} options={Object.entries(LIGHTS).map(([id, l]) => ({ id, label: l.label.replace(' laser', '') }))} />
        <Options label="Beam" value={beam} onChange={b => set({ beam: b })} options={[{ id: 'ray', label: 'One ray' }, { id: 'beam', label: 'Parallel beam' }]} />
        {preset === 'critical' && shapes[0]?.kind === 'semi' && (
          <Slider label="Angle at the flat face" value={orbit} display={`${orbit.toFixed(1)}°`} min={0} max={70} step={0.5} scale={['0°', '70°']}
            onChange={a => { const r = (a * Math.PI) / 180, c = shapes[0]; set({ box: { x: c.x - 110 * Math.sin(r), y: c.y + 110 * Math.cos(r), deg: (Math.atan2(-Math.cos(r), Math.sin(r)) * 180) / Math.PI } }) }} />
        )}
        <Slider label="Aim" value={box.deg} display={`${box.deg.toFixed(1)}°`} min={-90} max={90} step={0.5} onChange={deg => set({ box: { ...box, deg } })} />
        <p className="st-muted st-small">Drag the box to move it, or the orange dot to turn it.</p>
      </Group>
      {e0 && !e0.mirror && (
        <Group label="Where the ray bends">
          <div className="st-work">
            <p>Going from <b>{e0.entering ? 'air' : MATERIALS[e0.shape.mat].label.toLowerCase()}</b> into <b>{e0.entering ? MATERIALS[e0.shape.mat].label.toLowerCase() : 'air'}</b></p>
            <p>i = <b>{e0.i.toFixed(1)}°</b>{e0.r != null ? <>, r = <b>{e0.r.toFixed(1)}°</b></> : <>, <b>totally internally reflected</b></>}</p>
            {e0.r != null && <p>n₁ sin i = {(e0.n1 * Math.sin((e0.i * Math.PI) / 180)).toFixed(3)} · n₂ sin r = {(e0.n2 * Math.sin((e0.r * Math.PI) / 180)).toFixed(3)}</p>}
            <p>Reflected: <b>{(e0.R * 100).toFixed(1)} %</b> · passes through: <b>{(e0.T * 100).toFixed(1)} %</b></p>
            {!e0.entering && <p>Critical angle out of {MATERIALS[e0.shape.mat].label.toLowerCase()}: <b>{criticalAngle(e0.shape.mat, lamMid).toFixed(1)}°</b></p>}
          </div>
        </Group>
      )}
      <Group label="Add to the bench">
        <div className="st-chipset">
          {Object.keys(SHAPES).map(k => <button key={k} className="st-chip" onClick={() => add(k)}>{SHAPES[k].label}</button>)}
        </div>
      </Group>
      {sel && (
        <Group label={`Selected · ${SHAPES[sel.kind].label}`}>
          <Slider label="Turn it" value={sel.rot} display={`${sel.rot}°`} min={-180} max={180} step={1} onChange={rot => change({ rot })} />
          {sel.kind !== 'mirror' && <Options label="Made of" value={sel.mat} onChange={mat => change({ mat })} options={Object.entries(MATERIALS).map(([id, m]) => ({ id, label: m.label.replace(' (Perspex)', ''), sub: indexOf(id, 589).toFixed(2) }))} />}
          <button className="st-btn st-btn-secondary" onClick={() => { set({ shapes: shapes.filter(s => s.id !== selected) }); setSelected(null) }}><Icon name="reset" />Remove</button>
        </Group>
      )}
      <Group label="Show">
        <Toggle label="Faint reflections" checked={faint} onChange={setFaint} />
        <Toggle label="Normal and angles" checked={angles} onChange={setAngles} />
      </Group>
    </>
  )
  return (
    <ExperimentShell code="Class 10 · Light" title="Light" tabs={tabs} tab="explore" onTab={onTab} panel={panel}>
      <div className="st-circ is-bare">
        <div>
          <canvas ref={ref} className="st-fill" role="img" aria-label="Ray box bench" style={{ touchAction: 'none', cursor: 'grab' }}
            onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} />
        </div>
      </div>
    </ExperimentShell>
  )
}
