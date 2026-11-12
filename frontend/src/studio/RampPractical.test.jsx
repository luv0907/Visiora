import React from 'react'
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import RampPractical from './RampPractical'

beforeAll(() => {
  globalThis.ResizeObserver = class { observe() {} disconnect() {} }
  Element.prototype.scrollTo = () => {}
  vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance', 'setTimeout', 'Date'] })
})
afterAll(() => vi.useRealTimers())

const click = name => fireEvent.click(screen.getByRole('button', { name }))
const wait = ms => act(() => { vi.advanceTimersByTime(ms) })
const type = (label, value) => fireEvent.change(screen.getByLabelText(label), { target: { value: String(value) } })

describe('friction ramp practical, played through', () => {
  it('goes from the aim to the result with three slips and three slides', () => {
    render(<MemoryRouter><RampPractical tabs={[['explore', 'Explore'], ['practical', 'Practical']]} onTab={() => {}} /></MemoryRouter>)
    click(/start the practical/i)
    const angles = []
    for (let k = 0; k < 3; k++) {
      click(/tilt slowly|try again/i)
      wait(8000)
      const rec = screen.getByRole('button', { name: /^record \d+°/i })
      angles.push(Number(rec.textContent.match(/(\d+)°/)[1]))
      fireEvent.click(rec)
    }
    expect(Math.max(...angles)).toBeLessThanOrEqual(26)
    expect(Math.min(...angles)).toBeGreaterThanOrEqual(23)
    click(/next: time the slide/i)
    const times = []
    for (let k = 0; k < 3; k++) {
      click(/let go/i)
      wait(3000)
      const rec = screen.getByRole('button', { name: /^record [\d.]+ s/i })
      times.push(Number(rec.textContent.match(/([\d.]+) s/)[1]))
      fireEvent.click(rec)
    }
    click(/next: work it out/i)
    const th = angles.reduce((a, b) => a + b) / 3, t = times.reduce((a, b) => a + b) / 3
    const a = 2 / t ** 2, r = Math.PI / 180
    type(/mean angle of slip/i, th.toFixed(2))
    type(/μs = tan θ/i, Math.tan(th * r).toFixed(3))
    type(/mean time t/i, t.toFixed(3))
    type(/a = 2s ÷ t²/i, a.toFixed(3))
    type(/μk = tan θ − a/i, (Math.tan(35 * r) - a / (9.8 * Math.cos(35 * r))).toFixed(3))
    click(/check my working/i)
    expect(document.querySelectorAll('.is-wrong')).toHaveLength(0)
    click(/see the result/i)
    const truth = screen.getByText(/you found/i).textContent
    const [mus, muk] = [...truth.matchAll(/μ[sk] = (\d+\.\d+)/g)].map(m => Number(m[1]))
    expect(mus).toBeGreaterThan(0.41); expect(mus).toBeLessThan(0.49)
    expect(muk).toBeGreaterThan(0.29); expect(muk).toBeLessThan(0.35)
  })
})
