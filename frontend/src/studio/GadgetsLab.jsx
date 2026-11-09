/**
 * VISIORA Studio — Gadgets tab of Circuits: everyday circuits to operate, not to build.
 *   Torch: two alkaline cells; leave it on for hours and watch the cells run down and the
 *     filament cool from white to dull orange.
 *   Room: 220 V, a fuse in the live wire, and a lamp, a fan and a 2000 W heater in parallel. The
 *     fuse wire heats and melts after a delay; a frayed-wire fault melts it at once — or, with
 *     thick copper wire in the fuse, burns the house wiring.
 *   Dimmer: a rheostat in series with a torch bulb, and the heat it wastes.
 *   Doorbell: a contact breaker that opens and closes the circuit 16 times a second.
 * Each one is a real circuit on the breadboard, run live by engine/board.js.
 */
import React, { useState } from 'react'
import { APPLIANCES, edgeKey, node, repaired, updatePart } from '../engine/board'
import { FUSE, T_ROOM } from '../engine/components'
import { CircuitBoard, ViewSwitches, useLab } from './CircuitBoard'
import { ExperimentShell, Group, Options, Slider } from './Shell'

const E = (c1, r1, c2, r2) => edgeKey(node(c1, r1), node(c2, r2))
const RUPEES_PER_UNIT = 8 // a typical price for 1 kWh ("one unit") of electricity
const w = () => ({ type: 'wire' })
const celsius = T => `${Math.round(T - 273)} °C`
const watts = P => (P >= 10 ? `${P.toFixed(0)} W` : `${P.toFixed(2)} W`)

const ROOM_APPLIANCES = [['lamp', 2], ['fan', 4], ['heater', 6]]
const FAULT = [E(1, 0, 1, 1), E(1, 1, 1, 2)]
const room = () => ({
  [E(0, 0, 0, 1)]: { type: 'mains', flip: true },
  [E(0, 1, 0, 2)]: w(),
  [E(0, 0, 1, 0)]: { type: 'fuse', rating: 5 },
  ...Object.fromEntries([1, 2, 3, 4, 5].map(c => [E(c, 0, c + 1, 0), w()])),
  ...Object.fromEntries([0, 1, 2, 3, 4, 5].map(c => [E(c, 2, c + 1, 2), w()])),
  ...Object.fromEntries(ROOM_APPLIANCES.flatMap(([type, c]) => [[E(c, 0, c, 1), { type: 'switch', closed: false }], [E(c, 1, c, 2), { type }]])),
})
/** A simple loop: source on the left, `top` along the top, `load` on the right. */
const loop = (source, top, load, extra = {}) => ({
  [E(1, 1, 1, 2)]: source,
  [E(1, 1, 2, 1)]: w(),
  [E(2, 1, 3, 1)]: top,
  [E(3, 1, 4, 1)]: extra.meter ?? w(),
  [E(4, 1, 4, 2)]: load,
  [E(3, 2, 4, 2)]: w(),
  [E(2, 2, 3, 2)]: w(),
  [E(1, 2, 2, 2)]: w(),
})

const GADGETS = [
  { id: 'torch', title: 'A torch', blurb: 'Two alkaline cells, a switch and a 3 V 0.3 A bulb. Fresh cells give about 1.6 V each. As they are used, their voltage falls and their internal resistance rises, so the bulb dims and its filament cools from white towards orange.',
    make: () => loop({ type: 'battery', cells: 2, flip: true }, { type: 'switch', closed: false }, { type: 'bulb' }) },
  { id: 'room', title: 'Wiring a room', blurb: 'The supply is 220 V. The lamp, fan and heater are in parallel, so each gets the full 220 V and has its own switch. The fuse is in the live wire. A 5 A fuse is for a lighting circuit; heaters belong on the 15 A power circuit.',
    make: room },
  { id: 'dimmer', title: 'A dimmer', blurb: 'Four cells (6 V), a rheostat and a 3 V bulb. Sliding the rheostat changes the resistance, so it changes the current. Too little resistance and the bulb gets more than it can take.',
    make: () => loop({ type: 'battery', cells: 4, flip: true }, { type: 'rheostat', R: 25, Rmax: 50 }, { type: 'bulb' }, { meter: { type: 'ammeter', range: 0.5 } }) },
  { id: 'bell', title: 'A doorbell', blurb: 'A 9 V supply, a push button and an electric bell. The bell’s electromagnet pulls the hammer, which opens a contact and switches the magnet off; a spring pulls it back and it starts again — about 16 times a second.',
    make: () => loop({ type: 'supply', volts: 9, flip: true }, { type: 'push', closed: false }, { type: 'bell' }, { meter: { type: 'ammeter', range: 0.5 } }) },
]

const TORCH = E(1, 1, 1, 2), SW = E(2, 1, 3, 1), FUSE_KEY = E(0, 0, 1, 0), RHEO = E(2, 1, 3, 1), LOAD = E(4, 1, 4, 2), METER = E(3, 1, 4, 1)

export default function GadgetsLab({ tabs, onTab }) {
  const [id, setId] = useState('torch')
  return <Gadget key={id} id={id} setId={setId} tabs={tabs} onTab={onTab} />
}

function Gadget({ id, setId, tabs, onTab }) {
  const gadget = GADGETS.find(g => g.id === id)
  const { board, setBoard, an, sim, warp, reset } = useLab(gadget.make)
  const [symbols, setSymbols] = useState(false)
  const [electrons, setElectrons] = useState(false)
  const [hours, setHours] = useState(0)
  // only switches and buttons can be operated; everything else is fixed wiring
  const locked = new Set(Object.keys(board).filter(k => board[k].type !== 'switch' && board[k].type !== 'push'))
  const onEdge = key => board[key]?.type === 'switch' && setBoard(b => updatePart(b, key, { closed: !b[key].closed }))
  const onPress = (key, down) => setBoard(b => updatePart(b, key, { closed: down }))

  let controls = null
  if (id === 'torch') {
    const cell = an.parts[TORCH], bulb = an.parts[LOAD], on = board[SW].closed
    const leave = h => { warp(h * 3600); setHours(x => x + h) }
    controls = (
      <>
        <Group label="Leave it switched on">
          <div className="st-row">
            {[[1 / 6, '10 min'], [1, '1 hour'], [3, '3 hours']].map(([h, l]) => <button key={l} className="st-btn st-btn-secondary" disabled={!on || board[TORCH].blown} onClick={() => leave(h)}>+{l}</button>)}
          </div>
          {!on && <p className="st-muted st-small">Click the switch on the board to turn the torch on.</p>}
          <p className="st-num st-small">On for {hours < 1 ? `${Math.round(hours * 60)} min` : `${hours.toFixed(1)} h`}</p>
          <button className="st-btn st-btn-secondary" onClick={() => { setHours(0); setBoard(b => ({ ...b, [TORCH]: repaired(b[TORCH]) })) }}>Put in fresh cells</button>
        </Group>
        <Group label="Readings">
          <div className="st-work">
            <p>Cells: EMF <b>{cell.emf.toFixed(2)} V</b>, charge left <b>{Math.round(cell.soc * 100)} %</b></p>
            <p>Internal resistance = <b>{cell.r.toFixed(2)} Ω</b></p>
            <p>Voltage at the bulb = <b>{Math.abs(bulb.V).toFixed(2)} V</b></p>
            <p>Current = <b>{Math.abs(bulb.I).toFixed(3)} A</b></p>
            <p>Filament = <b>{bulb.T > T_ROOM + 5 ? celsius(bulb.T) : 'cold'}</b>, light <b>{Math.round(bulb.light * 100)} %</b></p>
            <p className="st-label">The light falls much faster than the voltage: a filament only a little cooler gives far less visible light.</p>
          </div>
        </Group>
      </>
    )
  } else if (id === 'room') {
    const fuse = board[FUSE_KEY], f = an.parts[FUSE_KEY], I = Math.abs(f?.I ?? 0)
    const total = ROOM_APPLIANCES.reduce((s, [, c]) => s + Math.max(0, an.parts[E(c, 1, c, 2)]?.P ?? 0), 0)
    const fault = FAULT.every(k => board[k])
    const burntWiring = Object.values(board).some(p => p.type === 'wire' && p.blown)
    controls = (
      <>
        <Group label="Switches">
          <p className="st-muted st-small">Click a switch on the board to turn that appliance on or off.</p>
          <div className="st-work">
            {ROOM_APPLIANCES.map(([type, c]) => {
              const a = an.parts[E(c, 1, c, 2)]
              return <p key={type}>{APPLIANCES[type].label}: <b>{board[E(c, 0, c, 1)].closed && Math.abs(a?.I ?? 0) > 1e-3 ? `${watts(a.P)}, ${Math.abs(a.I).toFixed(2)} A` : 'off'}</b></p>
            })}
          </div>
        </Group>
        <Group label="The fuse">
          <Options label="Fuse" value={fuse.wire === 'copper' ? 'copper' : fuse.rating} onChange={v => setBoard(b => ({ ...b, [FUSE_KEY]: v === 'copper' ? { ...repaired(b[FUSE_KEY]), wire: 'copper' } : { ...repaired(b[FUSE_KEY]), rating: v, wire: undefined } }))}
            options={[{ id: 5, label: '5 A', sub: 'lighting' }, { id: 15, label: '15 A', sub: 'power' }, { id: 'copper', label: 'Copper', sub: 'unsafe' }]} />
          <div className="st-loadbar" aria-label={`${I.toFixed(2)} amps`}>
            <span style={{ width: `${Math.min(100, (I / (fuse.wire === 'copper' ? 60 : fuse.rating * FUSE.factor)) * 100)}%` }} className={I > fuse.rating ? 'is-hot' : ''} />
          </div>
          <div className="st-work">
            <p>Current = <b>{I.toFixed(2)} A</b>{fuse.wire !== 'copper' && <> of {fuse.rating} A</>}</p>
            {!fuse.melted && <p>Fuse wire = <b>{celsius(f?.T ?? T_ROOM)}</b>{fuse.wire !== 'copper' && ' (tin–lead melts at 183 °C)'}</p>}
          </div>
          {fuse.melted && (
            <>
              <p className="st-callout">The fuse melted: too much current flowed through the live wire, so it broke the circuit and protected the wiring. Switch something off (or fix the fault), then fit a new fuse wire.</p>
              <button className="st-btn st-btn-secondary" onClick={() => setBoard(b => ({ ...b, [FUSE_KEY]: repaired(b[FUSE_KEY]) }))}>Fit new fuse wire</button>
            </>
          )}
          {I > (fuse.rating ?? 0) && !fuse.melted && fuse.wire !== 'copper' && <p className="st-callout">Overloaded: the fuse wire is heating up. It will melt in a moment.</p>}
        </Group>
        <Group label="A fault">
          <button className="st-btn st-btn-secondary" onClick={() => setBoard(b => {
            if (fault) { const n = { ...b }; FAULT.forEach(k => delete n[k]); return Object.fromEntries(Object.entries(n).map(([k, p]) => [k, p.type === 'wire' && p.blown ? repaired(p) : p])) }
            return { ...b, [FAULT[0]]: w(), [FAULT[1]]: w() }
          })}>{fault ? 'Repair the frayed wire' : 'Fray a wire: live touches neutral'}</button>
          {fault && !fuse.melted && !burntWiring && fuse.wire === 'copper' && <p className="st-callout is-danger">Hundreds of amps are flowing and the copper “fuse” will not melt first. The house wiring is overheating!</p>}
          {burntWiring && <p className="st-callout is-danger">The house wiring overheated, its insulation burned, and a wire melted through. In a real house this starts fires. That is why a fuse must never be replaced with thick copper wire.</p>}
        </Group>
        <Group label="Energy">
          <div className="st-work">
            <p>Total power = <b>{watts(total)}</b></p>
            <p>Cost for one hour = {(total / 1000).toFixed(2)} kWh × ₹{RUPEES_PER_UNIT} = <b>₹{((total / 1000) * RUPEES_PER_UNIT).toFixed(2)}</b></p>
            <p className="st-label">Mains is AC; these are its RMS values, which do the same heating as a steady 220 V.</p>
          </div>
        </Group>
      </>
    )
  } else if (id === 'dimmer') {
    const R = board[RHEO].R, bulb = an.parts[LOAD], rheo = an.parts[RHEO]
    controls = (
      <>
        <Group label="The rheostat">
          <Slider label="Slide the contact" value={R} display={`${R.toFixed(1)} Ω`} min={0} max={50} step={0.5} scale={['0 Ω', '50 Ω']} onChange={x => setBoard(b => updatePart(b, RHEO, { R: x }))} />
          {board[LOAD].blown && (
            <>
              <p className="st-callout">Pop! With almost no resistance in series, the bulb got nearly 6 V. It is made for 3 V: its filament passed 3400 °C and broke.</p>
              <button className="st-btn st-btn-secondary" onClick={() => setBoard(b => ({ ...b, [RHEO]: { ...b[RHEO], R: 20 }, [LOAD]: repaired(b[LOAD]) }))}>Fit a new bulb</button>
            </>
          )}
        </Group>
        <Group label="Readings">
          <div className="st-work">
            <p>Ammeter = <b>{((an.parts[METER]?.needle ?? 0) * board[METER].range).toFixed(3)} A</b></p>
            <p>Bulb: <b>{watts(bulb?.P ?? 0)}</b>, light <b>{Math.round((bulb?.light ?? 0) * 100)} %</b>, filament <b>{bulb.T > T_ROOM + 5 ? celsius(bulb.T) : 'cold'}</b></p>
            <p>Lost as heat in the rheostat = <b>{watts(rheo?.P ?? 0)}</b> ({celsius(rheo?.T ?? T_ROOM)})</p>
            <p className="st-label">Half the voltage gives far less than half the light. A rheostat dimmer also wastes energy as heat, which is why modern dimmers use electronics instead.</p>
          </div>
        </Group>
      </>
    )
  } else if (id === 'bell') {
    const bell = an.parts[LOAD]
    controls = (
      <Group label="Readings">
        <p className="st-muted st-small">Press and hold the red button on the board.</p>
        <div className="st-work">
          <p>Ammeter needle = <b>{((an.parts[METER]?.needle ?? 0) * board[METER].range).toFixed(2)} A</b>{bell?.ringing ? ' (the average)' : ''}</p>
          <p>Contact: <b>{bell?.ringing ? 'opening and closing about 16 times a second' : 'closed, at rest'}</b></p>
          <p className="st-label">The current is 0.3 A while the contact is closed and zero while it is open. The ammeter needle cannot follow 16 swings a second, so it shows the average.</p>
        </div>
      </Group>
    )
  }

  const panel = (
    <>
      <Group label="Everyday circuits">
        <div className="st-levels">
          {GADGETS.map((g, i) => (
            <button key={g.id} className={`st-level ${g.id === id ? 'is-on' : ''}`} onClick={() => setId(g.id)}>
              <span className="st-num">{i + 1}</span><span className="st-level-name">{g.title}</span>
            </button>
          ))}
        </div>
      </Group>
      <div className="st-step-body"><p>{gadget.blurb}</p></div>
      {controls}
      <div className="st-step-body"><button className="st-linkbtn" onClick={() => { setHours(0); reset(gadget.make()) }}>Start this one again</button></div>
    </>
  )

  return (
    <ExperimentShell code="Class 10 · Electricity" title="Circuits" tabs={tabs} tab="gadgets" onTab={onTab} panel={panel}>
      <div className="st-circ is-bare">
        <div className="st-circ-board">
          <CircuitBoard board={board} an={an} sim={sim} onEdge={onEdge} onPress={onPress} locked={locked} symbols={symbols} electrons={electrons} />
          <ViewSwitches symbols={symbols} setSymbols={setSymbols} electrons={electrons} setElectrons={setElectrons} />
        </div>
      </div>
    </ExperimentShell>
  )
}
