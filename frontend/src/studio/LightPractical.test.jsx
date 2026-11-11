import React from 'react'
import { describe, it, expect, beforeAll } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import LightPractical from './LightPractical'
import { EYE, LIGHT_PRACTICALS, eyeAt, eyeView, firstPins } from '../engine/lightPracticals'

beforeAll(() => {
  globalThis.ResizeObserver = class { observe() {} disconnect() {} }
})

/** The slider position where the feet of P1 and P2 line up, found the way a student would: by looking. */
function alignedSlider(spec, i) {
  const [P1, P2] = firstPins(spec, i)
  const block = spec.shape()
  const [lo, hi] = spec.id === 'slab' ? [180 - EYE.slab.max, 180 - EYE.slab.min] : [EYE.prism.min, EYE.prism.max]
  let best = { gap: Infinity }
  for (let s = lo; s <= hi; s = Math.round((s + 0.1) * 10) / 10) {
    const v = eyeView(block, eyeAt(spec, spec.id === 'slab' ? 180 - s : s), { P1, P2 })
    const f = n => v[n].feet.find(x => x.through && !x.bounced)?.angle
    if (f('P1') == null || f('P2') == null) continue
    const gap = Math.abs(f('P1') - f('P2'))
    if (gap < best.gap) best = { gap, s }
  }
  return best.s
}

const click = name => fireEvent.click(screen.getByRole('button', { name }))

describe('glass slab practical, played through', () => {
  it('goes from the aim to the result and viva with three angles', () => {
    render(<MemoryRouter><LightPractical tabs={[['practical', 'Practical'], ['explore', 'Explore']]} onTab={() => {}} /></MemoryRouter>)
    const spec = LIGHT_PRACTICALS[0]
    click(/start the practical/i)
    for (const [k, i] of [[0, 30], [1, 45], [2, 60]]) {
      if (k === 0) { click(/trace round the slab/i); click(/draw the normal at o/i) }
      fireEvent.click(screen.getByRole('radio', { name: `${i}°` }))
      click(new RegExp(`draw the incident ray at ${i}°`, 'i'))
      click(/stick pins p1 and p2/i)
      click(/next: look through the glass/i)
      fireEvent.change(screen.getByRole('slider'), { target: { value: String(alignedSlider(spec, i)) } })
      expect(screen.getByText(/lined up: p2’s foot now hides p1’s/i)).toBeTruthy()
      click(/^stick p3$/i)
      click(/^stick p4$/i)
      click(/next: lift off the slab/i)
      click(/show me the answers/i)
      expect(screen.getByText(/^right\./i)).toBeTruthy()
      click(k < 2 ? new RegExp(`next: angle ${k + 2} of 3`, 'i') : /see the result/i)
    }
    // the result: n close to the glass's real index, and e = i each time
    const table = screen.getByRole('table')
    expect(within(table).getAllByRole('row')).toHaveLength(4)
    const n = Number(screen.getByText(/refractive index of the glass/i).querySelector('b').textContent.replace('n = ', ''))
    expect(n).toBeGreaterThan(1.48)
    expect(n).toBeLessThan(1.56)
    expect(screen.getByText(/pins were all within a millimetre/i)).toBeTruthy()
    click(/viva questions/i)
    for (const b of screen.getAllByRole('button').filter(b => b.className.includes('st-choice')).filter((_, j) => j % 4 === 1)) fireEvent.click(b)
    expect(screen.getByText(/practical complete/i)).toBeTruthy()
  })
})

describe('prism practical, played through', () => {
  it('records i, e and D for three angles and checks i + e = A + D', () => {
    render(<MemoryRouter><LightPractical tabs={[['practical', 'Practical'], ['explore', 'Explore']]} onTab={() => {}} /></MemoryRouter>)
    const spec = LIGHT_PRACTICALS[1]
    click(/refraction through a prism/i)
    click(/start the practical/i)
    for (const [k, i] of [[0, 35], [1, 45], [2, 55]]) {
      if (k === 0) { click(/trace round the prism/i); click(/draw the normal at o/i) }
      fireEvent.click(screen.getByRole('radio', { name: `${i}°` }))
      click(new RegExp(`draw the incident ray at ${i}°`, 'i'))
      click(/stick pins p1 and p2/i)
      click(/next: look through the glass/i)
      fireEvent.change(screen.getByRole('slider'), { target: { value: String(alignedSlider(spec, i)) } })
      click(/^stick p3$/i)
      click(/^stick p4$/i)
      click(/next: lift off the prism/i)
      click(/show me the answers/i)
      expect(screen.getByText(/^right\. i \+ e/i)).toBeTruthy()
      click(k < 2 ? new RegExp(`next: angle ${k + 2} of 3`, 'i') : /see the result/i)
    }
    const rows = within(screen.getByRole('table')).getAllByRole('row').slice(1)
    for (const row of rows) {
      const cells = within(row).getAllByRole('cell').map(c => Number(c.textContent.replace('°', '')))
      expect(Math.abs(cells[3] - cells[4])).toBeLessThanOrEqual(2) // i + e against A + D, each read to 1°
    }
  })
})
