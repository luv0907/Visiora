import { describe, it, expect } from 'vitest'
import { compute, verify, normalize, buildRequest, RESPONSE_SCHEMA } from './tutorCore'

describe('tutor answer checking', () => {
  it('verifies a correct free-fall answer', () => {
    const v = verify({ type: 'free_fall_drop', h: 19.6, g: 9.8, quantity: 'time', claimed: 2 })
    expect(v.status).toBe('verified')
    expect(v.expected).toBeCloseTo(2, 12)
  })

  it('corrects a wrong answer and reports the right value', () => {
    const v = verify({ type: 'vertical_throw', u: 29.4, quantity: 'max_height', claimed: 88.2 })
    expect(v.status).toBe('corrected')
    expect(v.expected).toBeCloseTo(44.1, 9)
    expect(v.detail).toMatch(/44\.1/)
  })

  it('handles each supported calculation', () => {
    expect(compute({ type: 'projectile_level', u: 20, angle_deg: 45 }).range).toBeCloseTo(400 / 9.8, 9)
    expect(compute({ type: 'uniform_acceleration', u: 10, a: 2, t: 3 })).toEqual({ final_velocity: 16, distance: 39 })
    expect(compute({ type: 'newton_second_law', F: 20, m: 4 })).toEqual({ acceleration: 5 })
    expect(compute({ type: 'ohms_law', V: 12, R: 4 })).toEqual({ current: 3 })
    expect(compute({ type: 'parallel_resistance', resistors: [2, 3, 6] }).resistance).toBeCloseTo(1, 12)
    expect(compute({ type: 'series_resistance', resistors: [2, 3, 6] }).resistance).toBe(11)
    expect(compute({ type: 'snell', n1: 1, n2: 1.5, angle_deg: 30 }).refraction_angle).toBeCloseTo(19.47, 2)
    expect(compute({ type: 'weight', m: 10 }).weight).toBeCloseTo(98, 12)
  })

  it('treats total internal reflection as a correct outcome', () => {
    expect(verify({ type: 'snell', n1: 1.5, n2: 1, angle_deg: 60, quantity: 'refraction_angle' }).status).toBe('verified')
  })

  it('leaves answers unchecked when inputs are missing or the type is none', () => {
    expect(verify({ type: 'free_fall_drop', quantity: 'time', claimed: 2 }).status).toBe('unchecked')
    expect(verify({ type: 'none' }).status).toBe('unchecked')
  })
})

describe('normalize', () => {
  it('gives greetings a plain reply with no lab, steps or check', () => {
    const n = normalize({ kind: 'greeting', title: 'Hi!', explanation: 'Hello! Ask me about motion.', lab: 'gravity', steps: ['x'], check: { type: 'free_fall_drop', h: 10 } })
    expect(n.lab).toBeNull()
    expect(n.steps).toEqual([])
    expect(n.verification.status).toBe('unchecked')
  })

  it('maps the lab and strips LaTeX dollar signs', () => {
    const n = normalize({ kind: 'concept', title: 'Free fall', explanation: 'We use $g = 9.8$ here.', formulas: ['$$v = u + at$$'], lab: 'gravity', check: { type: 'none' } })
    expect(n.lab).toMatchObject({ id: 'gravity', path: '/gravity' })
    expect(n.explanation).toBe('We use g = 9.8 here.')
    expect(n.formulas).toEqual(['v = u + at'])
  })

  it('survives garbage input', () => {
    const n = normalize(null)
    expect(n.kind).toBe('concept')
    expect(n.explanation).toMatch(/try asking again/)
    expect(n.lab).toBeNull()
  })

  it('ignores unknown labs', () => {
    expect(normalize({ kind: 'concept', title: 't', explanation: 'e', lab: 'chemistry', check: { type: 'none' } }).lab).toBeNull()
  })
})

describe('buildRequest', () => {
  it('keeps only the last 8 valid turns and maps roles for Gemini', () => {
    const history = Array.from({ length: 12 }, (_, i) => ({ role: i % 2 ? 'assistant' : 'user', content: `m${i}` }))
    history.push({ role: 'system', content: 'ignore me' })
    const req = buildRequest('What is g?', history)
    expect(req.contents).toHaveLength(9)
    expect(req.contents.at(-1)).toEqual({ role: 'user', parts: [{ text: 'What is g?' }] })
    expect(req.contents.some(c => c.role === 'assistant')).toBe(false)
    expect(req.generationConfig.responseMimeType).toBe('application/json')
  })
})

describe('RESPONSE_SCHEMA', () => {
  it('requires every answer field so newer models cannot skip steps or the final answer', () => {
    expect(RESPONSE_SCHEMA.required).toEqual(expect.arrayContaining(['formulas', 'steps', 'final_answer', 'key_points', 'lab_reason']))
  })
})

describe('verify with the final answer as fallback', () => {
  const parallel = { type: 'parallel_resistance', resistors: [6, 6, 6], quantity: 'resistance' }
  it('verifies when the number is only in the final answer', () => {
    expect(verify(parallel, 'Rp = 2 Ω').status).toBe('verified')
    expect(verify({ type: 'free_fall_drop', h: 19.6, g: 9.8, quantity: 'time' }, 't = 2.0 s').status).toBe('verified')
  })
  it('corrects a wrong number in the final answer', () => {
    const v = verify(parallel, 'Rp = 18 Ω')
    expect(v.status).toBe('corrected')
    expect(v.expected).toBeCloseTo(2)
  })
  it('stays unchecked when no number is given anywhere', () => {
    expect(verify(parallel, 'about two ohms').status).toBe('unchecked')
  })
  it('ignores exponents in units', () => {
    expect(verify({ type: 'uniform_acceleration', u: 0, a: 4, t: 5, quantity: 'final_velocity' }, 'v = 20 m/s²').status).toBe('verified')
  })
})
