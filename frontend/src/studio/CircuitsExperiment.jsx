/**
 * VISIORA Studio — Circuits (Class 10 Electricity), on the living breadboard.
 * Practical: Ohm's law, series and parallel, done as in the school lab (Practical.jsx).
 * Gadgets: a torch, room wiring with a fuse, a dimmer and a doorbell (GadgetsLab.jsx).
 * Build: six circuit puzzles with stars; fewer parts earn more stars.
 * Explore: every part, a multimeter and both looks, with no goal.
 * Physics: engine/board.js (time-stepped: heating, surges, fuses, cells, meters) on top of the
 * exact solver in engine/circuit.js; useLab runs it live.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { APPLIANCES, CELL_V, LEVELS, RESISTOR_VALUES, applyTool, countOf, movePart, newPart, repaired, settle, starsFor, updatePart } from '../engine/board'
import { AMMETER_RANGES, SUPPLY, T_ROOM, VOLTMETER_RANGES } from '../engine/components'
import { rememberExperiment } from './catalog'
import { CircuitBoard, DragGhost, Multimeter, Palette, Stars, TOOL_NAMES, ViewSwitches, useLab } from './CircuitBoard'
import GadgetsLab from './GadgetsLab'
import Practical from './Practical'
import { ExperimentShell, Group, Icon, Options, Slider, Toggle } from './Shell'

export const TABS = [['practical', 'Practical'], ['gadgets', 'Gadgets'], ['build', 'Build'], ['explore', 'Explore']]
const STARS_KEY = 'visiora.circuits.levels'
const ALL_TOOLS = ['hand', 'wire', 'bulb', 'battery', 'supply', 'switch', 'key', 'push', 'resistor', 'coil', 'rheostat', 'fuse', 'ammeter', 'voltmeter', 'erase']
const n2 = v => Math.abs(v).toFixed(2)
const celsius = T => `${Math.round(T - 273)} °C`

function loadStars() {
  try { return JSON.parse(localStorage.getItem(STARS_KEY)) || {} } catch { return {} }
}

/** The selected part: its live readings and the knobs that change it. */
function Inspector({ part, info, building, onChange, onRemove }) {
  const name = APPLIANCES[part.type]?.label ?? TOOL_NAMES[part.type] ?? part.type
  const dead = part.blown || part.melted
  const T = info?.T ?? T_ROOM
  return (
    <Group label={`Selected · ${name}`}>
      <div className="st-work">
        <p>Current = <b>{n2(info?.I ?? 0)} A</b></p>
        <p>Voltage across = <b>{n2(info?.V ?? 0)} V</b></p>
        {info?.R != null && part.type !== 'wire' && <p>Resistance now = <b>{info.R >= 1000 ? `${(info.R / 1000).toFixed(1)} kΩ` : `${info.R.toFixed(2)} Ω`}</b></p>}
        {info?.P > 0.0005 && part.type !== 'battery' && <p>Power = <b>{info.P >= 10 ? info.P.toFixed(0) : info.P.toFixed(2)} W</b></p>}
        {T > T_ROOM + 1 && <p>Temperature = <b>{celsius(T)}</b></p>}
        {part.type === 'battery' && info?.emf != null && <p>EMF {info.emf.toFixed(2)} V, internal resistance {info.r.toFixed(2)} Ω, charge left {Math.round(info.soc * 100)} %</p>}
        {(part.type === 'ammeter' || part.type === 'voltmeter') && !dead && info?.reading != null && <p>Reads <b>{part.type === 'ammeter' ? `${info.reading.toFixed(3)} A` : `${info.reading.toFixed(2)} V`}</b>{info.reading < 0 ? ' (needle kicks backwards!)' : ''}</p>}
      </div>
      {part.type === 'battery' && (building
        ? <p className="st-muted st-small">Puzzle batteries hold 2 cells.</p>
        : <Slider label="Cells in the holder" value={part.cells} display={`${part.cells} × ${CELL_V} V`} min={1} max={6} step={1} scale={['1', '6']} onChange={cells => onChange({ cells })} />)}
      {part.type === 'supply' && <Slider label="Set the voltage" value={part.volts} display={`${part.volts.toFixed(1)} V`} min={0} max={SUPPLY.max} step={0.5} scale={['0 V', `${SUPPLY.max} V`]} onChange={volts => onChange({ volts })} />}
      {part.type === 'supply' && info?.cc && <p className="st-callout">The supply has hit its {SUPPLY.limit} A limit, so it is holding the current and letting the voltage drop.</p>}
      {part.type === 'resistor' && (building
        ? <Options label="Resistance" value={part.R} onChange={R => onChange({ R })} options={RESISTOR_VALUES.map(R => ({ id: R, label: `${R} Ω` }))} />
        : <Slider label="Resistance (2 W resistor)" value={part.R} display={`${part.R} Ω`} min={1} max={50} step={1} scale={['1 Ω', '50 Ω']} onChange={R => onChange({ R })} />)}
      {part.type === 'coil' && <Slider label="Length of wire" value={part.R} display={`${part.R} Ω`} min={1} max={30} step={0.5} scale={['1 Ω', '30 Ω']} onChange={R => onChange({ R })} />}
      {part.type === 'rheostat' && <Slider label="Slide the contact" value={part.R} display={`${part.R.toFixed(1)} Ω`} min={0} max={50} step={0.5} scale={['0 Ω', '50 Ω']} onChange={R => onChange({ R })} />}
      {part.type === 'fuse' && <Options label="Fuse wire" value={part.wire === 'copper' ? 'copper' : part.rating} onChange={v => onChange(v === 'copper' ? { wire: 'copper' } : { rating: v, wire: undefined })} options={[...[1, 2, 5].map(r => ({ id: r, label: `${r} A` })), { id: 'copper', label: 'Copper' }]} />}
      {part.type === 'ammeter' && <Options label="Range" value={part.range} onChange={range => onChange({ range })} options={AMMETER_RANGES.map(r => ({ id: r, label: `0–${r} A` }))} />}
      {part.type === 'voltmeter' && <Options label="Range" value={part.range} onChange={range => onChange({ range })} options={VOLTMETER_RANGES.map(r => ({ id: r, label: `0–${r} V` }))} />}
      <div className="st-row st-inspect-actions">
        {(part.type === 'switch' || part.type === 'key') && <button className="st-btn st-btn-secondary" onClick={() => onChange({ closed: !part.closed })}>{part.type === 'key' ? (part.closed ? 'Take the key out' : 'Put the key in') : part.closed ? 'Open the switch' : 'Close the switch'}</button>}
        {(part.type === 'battery' || part.type === 'mains' || part.type === 'supply') && <button className="st-btn st-btn-secondary" onClick={() => onChange({ flip: !part.flip })}>Turn it round</button>}
        {(part.type === 'ammeter' || part.type === 'voltmeter') && <button className="st-btn st-btn-secondary" onClick={() => onChange({ flip: !part.flip })}>Swap its leads</button>}
        {part.type === 'battery' && !dead && <button className="st-btn st-btn-secondary" onClick={() => onChange(null)}>Fresh cells</button>}
        {dead && <button className="st-btn st-btn-secondary" onClick={() => onChange(null)}>Fit a new {part.type === 'fuse' ? 'fuse wire' : part.type === 'battery' ? 'set of cells' : 'one'}</button>}
        <button className="st-btn st-btn-secondary" onClick={onRemove}><Icon name="reset" />Remove</button>
      </div>
    </Group>
  )
}

function Workbench({ mode, onTab }) {
  const building = mode === 'build'
  const [stars, setStars] = useState(loadStars)
  const [index, setIndex] = useState(0)
  const level = LEVELS[index]
  const [probes, setProbes] = useState(null)
  const { board, setBoard, an, sim, reset } = useLab({}, { probes })
  const [tool, setTool] = useState('wire')
  const [selected, setSelected] = useState(null)
  const [symbols, setSymbols] = useState(false)
  const [electrons, setElectrons] = useState(false)
  const [note, setNote] = useState(null)
  const [ghost, setGhost] = useState(null)
  const boardApi = useRef(null)
  const readDmm = useRef(() => sim.current.state.dmm.shown).current

  const allowed = building ? level.parts : null
  const left = allowed && Object.fromEntries(Object.entries(allowed).map(([t, n]) => [t, n - countOf(board, t)]))
  const tools = building ? ['hand', ...Object.keys(level.parts), 'erase'] : ALL_TOOLS
  // puzzles are judged once everything has warmed up and settled, as a real circuit would be
  const judged = useMemo(() => (building ? settle(board) : null), [board, building])
  const solved = building && level.check(judged.board, judged.an)
  const used = Object.keys(board).length
  const earned = solved ? starsFor(level, used) : 0
  const unlocked = i => i === 0 || (stars[LEVELS[i - 1].id] || 0) > 0
  const total = LEVELS.reduce((n, l) => n + (stars[l.id] || 0), 0)
  const sel = selected && board[selected] ? selected : null

  useEffect(() => {
    if (!solved) return
    setStars(prev => {
      if ((prev[level.id] || 0) >= earned) return prev
      const best = { ...prev, [level.id]: earned }
      try { localStorage.setItem(STARS_KEY, JSON.stringify(best)) } catch { /* private mode */ }
      return best
    })
  }, [solved, earned, level.id])

  const fresh = tool => newPart({ type: tool })
  const pick = i => { if (!unlocked(i)) return; setIndex(i); reset({}); setNote(null); setTool('wire'); setSelected(null) }
  /** Commit a new board if the puzzle's parts allow it. */
  const tryBoard = (next, type) => {
    if (allowed && Object.entries(allowed).some(([t, n]) => countOf(next, t) > n)) {
      setNote(`No ${type === 'switch' ? 'switches' : `${TOOL_NAMES[type]?.toLowerCase() ?? type}s`} left. Remove one first.`)
      return false
    }
    setNote(null); setBoard(next); return true
  }
  const onEdge = key => {
    if (tool === 'hand') {
      setSelected(board[key] ? key : null)
      if (board[key]?.type === 'switch' || board[key]?.type === 'key') setBoard(b => applyTool(b, key, { type: 'hand' }))
      return
    }
    if (tool === 'erase') { setBoard(b => applyTool(b, key, { type: 'erase' })); return }
    if (tryBoard({ ...board, [key]: fresh(tool) }, tool) && tool !== 'wire') setSelected(key)
  }
  const onMove = (from, to) => { setBoard(b => (to ? movePart(b, from, to) : applyTool(b, from, { type: 'erase' }))); setSelected(to) }
  const onPress = (key, down) => setBoard(b => updatePart(b, key, { closed: down }))
  const onDragPart = (type, x, y, dropped) => {
    if (!dropped) { setGhost({ type, x, y }); boardApi.current?.hoverAt(x, y); return }
    setGhost(null); boardApi.current?.hoverAt(null)
    const key = boardApi.current?.edgeAt(x, y)
    if (key && tryBoard({ ...board, [key]: fresh(type) }, type)) { setSelected(key); setTool('hand') }
  }
  const change = changes => setBoard(b => (changes === null ? { ...b, [sel]: repaired(b[sel]) } : updatePart(b, sel, changes)))

  const meters = Object.keys(board).filter(k => board[k].type === 'ammeter' || board[k].type === 'voltmeter')
  const inspector = sel && <Inspector part={board[sel]} info={an.parts[sel]} building={building} onChange={change} onRemove={() => { setBoard(b => applyTool(b, sel, { type: 'erase' })); setSelected(null) }} />
  const howTo = <p className="st-muted st-small">Drag a part from the bin onto the board, or pick it and click between two dots. Drag across dots to draw wires. With the <b>hand</b>, drag parts to move them, click to select and tune them.</p>
  const hot = Object.entries(board).filter(([k, p]) => !p.blown && (an.parts[k]?.T ?? T_ROOM) > T_ROOM + 60 && p.type !== 'bulb' && p.type !== 'lamp' && p.type !== 'heater')

  const panel = building ? (
    <>
      <Group label={`Puzzles · ${total} of ${LEVELS.length * 3} stars`}>
        <div className="st-levels">
          {LEVELS.map((l, i) => (
            <button key={l.id} className={`st-level ${i === index ? 'is-on' : ''}`} disabled={!unlocked(i)} onClick={() => pick(i)}>
              <span className="st-num">{i + 1}</span><span className="st-level-name">{l.title}</span>
              {unlocked(i) ? <Stars n={stars[l.id] || 0} /> : <span className="st-locked">locked</span>}
            </button>
          ))}
        </div>
      </Group>
      <div className="st-step-body">
        <h2 className="st-step-title">{level.title}</h2>
        <p>{level.goal}</p>
        {solved ? (
          <>
            <p className="st-callout is-ok"><b>Solved!</b> You used {used} parts. {earned < 3 ? `It can be done with ${level.par}. Try again for three stars?` : 'That is the fewest possible.'}</p>
            <Stars n={earned} />
            <div className="st-row">
              {LEVELS[index + 1] && <button className="st-btn st-btn-primary" onClick={() => pick(index + 1)}>Next puzzle</button>}
              <button className="st-btn st-btn-secondary" onClick={() => reset({})}>Start again</button>
            </div>
          </>
        ) : (
          <>
            {an.short && <p className="st-callout">A wire (or almost nothing) is joined straight across the battery. Huge current, no bulb: that is a <b>short circuit</b>. The cells are heating up and running down.</p>}
            {Object.values(board).some(p => p.blown) && <p className="st-callout">Something burnt out. Select it with the hand to fit a new one.</p>}
            {howTo}
          </>
        )}
      </div>
      {inspector}
    </>
  ) : (
    <>
      <div className="st-intro">{howTo}</div>
      {inspector}
      {hot.length > 0 && <p className="st-callout">Getting hot: {hot.map(([k, p]) => `${TOOL_NAMES[p.type] ?? p.type} ${celsius(an.parts[k].T)}`).join(', ')}.</p>}
      <Group label="Measure">
        <Toggle label="Multimeter probes" checked={!!probes} onChange={on => setProbes(on ? { plus: null, minus: null } : null)} />
        {probes && <p className="st-muted st-small">Drag the red (+) and black (−) probes onto two dots. The multimeter takes almost no current (10 MΩ).</p>}
        <div className="st-work">
          {meters.map(k => <p key={k}>{board[k].type === 'ammeter' ? 'Ammeter' : 'Voltmeter'} (0–{board[k].range}) = <b>{board[k].blown ? 'burnt out' : board[k].type === 'ammeter' ? `${(an.parts[k]?.reading ?? 0).toFixed(3)} A` : `${(an.parts[k]?.reading ?? 0).toFixed(2)} V`}</b></p>)}
        </div>
      </Group>
      <div className="st-step-body"><button className="st-btn st-btn-secondary" onClick={() => { reset({}); setSelected(null) }}><Icon name="reset" />Clear the board</button></div>
    </>
  )

  return (
    <ExperimentShell code="Class 10 · Electricity" title="Circuits" tabs={TABS} tab={mode} onTab={onTab} panel={panel}>
      <div className="st-circ">
        <div className="st-circ-board">
          <CircuitBoard ref={boardApi} board={board} an={an} sim={sim} tool={tool} onEdge={onEdge} onMove={onMove} onPress={onPress} selected={sel}
            symbols={symbols} electrons={electrons} probes={probes} onProbes={setProbes} />
          <ViewSwitches symbols={symbols} setSymbols={setSymbols} electrons={electrons} setElectrons={setElectrons} />
          {probes && <div className="st-float st-meters"><Multimeter read={readDmm} /></div>}
          {note && <p className="st-endnote">{note}</p>}
        </div>
        <Palette tools={tools} tool={tool} onTool={setTool} left={left} onDragPart={onDragPart} />
      </div>
      <DragGhost ghost={ghost} />
    </ExperimentShell>
  )
}

export default function CircuitsExperiment() {
  const [tab, setTab] = useState('practical')
  useEffect(() => { rememberExperiment('electricity') }, [])
  if (tab === 'practical') return <Practical tabs={TABS} onTab={setTab} />
  if (tab === 'gadgets') return <GadgetsLab tabs={TABS} onTab={setTab} />
  return <Workbench key={tab} mode={tab} onTab={setTab} />
}
