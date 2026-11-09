/**
 * VISIORA Studio — a word with a plain-English explanation. Dotted underline; click (or focus
 * and press Enter) to open a small card, click anywhere else or press Escape to close it.
 */
import React, { useEffect, useRef, useState } from 'react'

export const GLOSSARY = {
  current: ['Current', 'How much electric charge flows past a point each second. Measured in amperes (A) with an ammeter.'],
  voltage: ['Voltage (potential difference)', 'The electric “push” that drives current through a part. Measured in volts (V) with a voltmeter connected across the part.'],
  resistance: ['Resistance', 'How strongly a part holds back the current. R = V ÷ I, measured in ohms (Ω). A bigger resistance lets less current through for the same push.'],
  ammeter: ['Ammeter', 'Measures current. It goes in the loop (in series), so all the current passes through it. Its red + terminal faces the + of the cells.'],
  voltmeter: ['Voltmeter', 'Measures voltage. Its two leads go on either side of the part being measured (in parallel). The red + lead goes to the side nearer the + of the cells.'],
  'least count': ['Least count', 'The smallest step a meter can show: the value of one small division on its scale. It is the range divided by the number of divisions.'],
  'zero error': ['Zero error', 'Where the needle rests when nothing flows. If it rests above 0, every reading is that much too high, so subtract it from each one.'],
  rheostat: ['Rheostat', 'A coil of wire with a sliding contact. Sliding it puts more or less wire in the circuit, which changes the current. Start with it at its biggest value.'],
  'plug key': ['Plug key', 'The switch used in school labs. Push the brass plug in to complete the circuit; take it out to break it. Take it out between readings.'],
  series: ['In series', 'Connected one after another in a single loop. The same current flows through each part.'],
  parallel: ['In parallel', 'Connected side by side, each on its own branch. Each part gets the same voltage.'],
  cells: ['Cells and EMF', 'A cell pushes current round a circuit. Its EMF is the voltage it gives when nothing is flowing (about 1.6 V for a fresh one). Some of that push is lost inside the cell, more as it runs down.'],
  short: ['Short circuit', 'A path with almost no resistance straight across the cells. A huge current flows, nothing useful works, and the cells or wires overheat.'],
  fuse: ['Fuse', 'A thin wire that melts if too much current flows, breaking the circuit before the wiring can overheat.'],
  slope: ['Slope of a graph', 'How steep the line is: how much it rises (ΔV) for each step along (ΔI). For a V–I graph the slope is the resistance.'],
}

export function Term({ k, children }) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState(null)
  const ref = useRef(null)
  const entry = GLOSSARY[k]
  useEffect(() => {
    if (!open) return undefined
    const r = ref.current.getBoundingClientRect(), w = 260
    setPos({ left: Math.max(8, Math.min(window.innerWidth - w - 8, r.left + r.width / 2 - w / 2)), top: r.bottom + 8, width: w })
    const close = e => { if (!ref.current?.contains(e.target)) setOpen(false) }
    const esc = e => { if (e.key === 'Escape') setOpen(false) }
    const away = () => setOpen(false)
    window.addEventListener('pointerdown', close); window.addEventListener('keydown', esc); window.addEventListener('scroll', away, true)
    return () => { window.removeEventListener('pointerdown', close); window.removeEventListener('keydown', esc); window.removeEventListener('scroll', away, true) }
  }, [open])
  if (!entry) return children
  return (
    <span className="st-term" ref={ref}>
      <button type="button" className="st-term-word" aria-expanded={open} onClick={() => setOpen(o => !o)}>{children ?? entry[0]}</button>
      {open && pos && (
        <span className="st-term-card" role="note" style={pos}>
          <b>{entry[0]}</b>
          {entry[1]}
        </span>
      )}
    </span>
  )
}
