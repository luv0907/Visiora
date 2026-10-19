/**
 * VISIORA — AI tutor core (shared by the /api/tutor server function and tests).
 *
 * The model explains and solves; it never decides the final numbers on its own.
 * For a numerical question it must also report WHICH standard calculation it
 * used and the inputs. We recompute that with the same formulas the labs use and
 * mark the answer "verified", or replace it when the model got it wrong.
 */

export const LABS = {
  motion: { path: '/motion', name: 'Motion Lab' },
  gravity: { path: '/gravity', name: 'Gravity Lab' },
  force: { path: '/force', name: 'Force Lab' },
  light: { path: '/light', name: 'Light Lab' },
  electricity: { path: '/electricity', name: 'Electricity Lab' },
  board: { path: '/board', name: 'Graph Board' },
}

export const SYSTEM_PROMPT = `You are Visiora's physics tutor for Class 8–10 students in India (CBSE/ICSE/NCERT).

How to answer:
- First decide "kind": "greeting" (hi, thanks, small talk), "concept" (explain an idea), "numerical" (a problem with numbers to solve), or "off_topic" (not physics or school science).
- greeting: one or two friendly sentences, suggest something they could ask. No steps, no formulas, lab "none", check "none".
- off_topic: say kindly that you help with physics and science, suggest a related question. lab "none", check "none".
- concept: explain simply and correctly for a 13–16 year old, with an everyday example. Short paragraphs. Put the key formulas in "formulas".
- numerical: list the given values with units, the formula, then substitute step by step. Give the final answer with units in "final_answer".
- Use g = 9.8 m/s² unless the question gives another value.
- Write all maths as plain text with Unicode (v = u + at, s = ut + ½at², v² = u² + 2as, R = R₁ + R₂). Never use LaTeX or $ signs.
- Never invent facts, historical claims or chapter numbers. If you are unsure, say so.
- "lab": pick the Visiora lab that lets the student see this idea, or "none":
  motion (distance/speed/velocity/acceleration in a straight line, graphs), gravity (free fall, throwing, projectiles, g on planets),
  force (push, friction, F = ma, Newton's laws), light (reflection, refraction, Snell's law, total internal reflection),
  electricity (current, voltage, resistance, Ohm's law, series/parallel), board (plotting a formula or vectors).
- "check": if the numerical matches one of these calculations, fill it so the answer can be verified; otherwise type "none".
  free_fall_drop (h, g) → time, final_velocity
  vertical_throw (u, g) → max_height, time_up, total_time
  projectile_level (u, angle_deg, g) → range, max_height, total_time
  uniform_acceleration (u, a, t) → final_velocity, distance
  newton_second_law (two of F, m, a) → force, mass or acceleration
  weight (m, g) → weight
  ohms_law (two of V, I, R) → voltage, current or resistance
  series_resistance (resistors) → resistance
  parallel_resistance (resistors) → resistance
  snell (n1, n2, angle_deg) → refraction_angle
  "claimed" is your final number for "quantity", in SI units (s, m, m/s, N, kg, V, A, Ω, degrees).`

// Gemini structured-output schema (OpenAPI subset).
export const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    kind: { type: 'STRING', enum: ['greeting', 'concept', 'numerical', 'off_topic'] },
    title: { type: 'STRING' },
    explanation: { type: 'STRING' },
    formulas: { type: 'ARRAY', items: { type: 'STRING' } },
    steps: { type: 'ARRAY', items: { type: 'STRING' } },
    final_answer: { type: 'STRING' },
    key_points: { type: 'ARRAY', items: { type: 'STRING' } },
    lab: { type: 'STRING', enum: ['none', ...Object.keys(LABS)] },
    lab_reason: { type: 'STRING' },
    check: {
      type: 'OBJECT',
      properties: {
        type: {
          type: 'STRING',
          enum: ['none', 'free_fall_drop', 'vertical_throw', 'projectile_level', 'uniform_acceleration', 'newton_second_law', 'weight', 'ohms_law', 'series_resistance', 'parallel_resistance', 'snell'],
        },
        quantity: { type: 'STRING' },
        claimed: { type: 'NUMBER' },
        h: { type: 'NUMBER' }, g: { type: 'NUMBER' }, u: { type: 'NUMBER' }, a: { type: 'NUMBER' }, t: { type: 'NUMBER' },
        angle_deg: { type: 'NUMBER' }, F: { type: 'NUMBER' }, m: { type: 'NUMBER' },
        V: { type: 'NUMBER' }, I: { type: 'NUMBER' }, R: { type: 'NUMBER' },
        n1: { type: 'NUMBER' }, n2: { type: 'NUMBER' },
        resistors: { type: 'ARRAY', items: { type: 'NUMBER' } },
      },
      required: ['type'],
    },
  },
  required: ['kind', 'title', 'explanation', 'lab', 'check'],
}

const D2R = Math.PI / 180
const num = v => (typeof v === 'number' && Number.isFinite(v) ? v : undefined)

/**
 * Recompute the standard result for a check. Returns { quantity: value } for every
 * quantity the calculation produces, or null when inputs are missing/invalid.
 */
export function compute(check) {
  if (!check || check.type === 'none') return null
  const g = num(check.g) ?? 9.8
  const { h, u, a, t, angle_deg: ang, F, m, V, I, R, n1, n2 } = Object.fromEntries(
    ['h', 'u', 'a', 't', 'angle_deg', 'F', 'm', 'V', 'I', 'R', 'n1', 'n2'].map(k => [k, num(check[k])])
  )
  const pos = x => x !== undefined && x > 0
  switch (check.type) {
    case 'free_fall_drop':
      if (!pos(h) || !pos(g)) return null
      return { time: Math.sqrt((2 * h) / g), final_velocity: Math.sqrt(2 * g * h) }
    case 'vertical_throw':
      if (!pos(u) || !pos(g)) return null
      return { max_height: (u * u) / (2 * g), time_up: u / g, total_time: (2 * u) / g }
    case 'projectile_level':
      if (!pos(u) || ang === undefined || ang <= 0 || ang >= 90 || !pos(g)) return null
      return {
        range: (u * u * Math.sin(2 * ang * D2R)) / g,
        max_height: (u * u * Math.sin(ang * D2R) ** 2) / (2 * g),
        total_time: (2 * u * Math.sin(ang * D2R)) / g,
      }
    case 'uniform_acceleration':
      if (u === undefined || a === undefined || t === undefined || t < 0) return null
      return { final_velocity: u + a * t, distance: u * t + 0.5 * a * t * t }
    case 'newton_second_law':
      if (m !== undefined && a !== undefined && m > 0) return { force: m * a }
      if (F !== undefined && m !== undefined && m > 0) return { acceleration: F / m }
      if (F !== undefined && a !== undefined && a !== 0) return { mass: F / a }
      return null
    case 'weight':
      if (!pos(m) || !pos(g)) return null
      return { weight: m * g }
    case 'ohms_law':
      if (I !== undefined && R !== undefined && R > 0) return { voltage: I * R }
      if (V !== undefined && R !== undefined && R > 0) return { current: V / R }
      if (V !== undefined && I !== undefined && I !== 0) return { resistance: V / I }
      return null
    case 'series_resistance': {
      const rs = (check.resistors || []).filter(pos)
      return rs.length >= 2 ? { resistance: rs.reduce((s, r) => s + r, 0) } : null
    }
    case 'parallel_resistance': {
      const rs = (check.resistors || []).filter(pos)
      return rs.length >= 2 ? { resistance: 1 / rs.reduce((s, r) => s + 1 / r, 0) } : null
    }
    case 'snell': {
      if (!pos(n1) || !pos(n2) || ang === undefined || ang < 0 || ang >= 90) return null
      const s = (n1 * Math.sin(ang * D2R)) / n2
      return s > 1 ? { refraction_angle: NaN, total_internal_reflection: 1 } : { refraction_angle: Math.asin(s) / D2R }
    }
    default:
      return null
  }
}

const fmt = v => (Math.abs(v) >= 1000 || (Math.abs(v) < 0.01 && v !== 0) ? v.toPrecision(3) : String(Number(v.toFixed(3))))

/** Compare the model's claimed number with the recomputed one (1% tolerance). */
export function verify(check) {
  const results = compute(check)
  if (!results) return { status: 'unchecked' }
  const q = String(check.quantity || '').toLowerCase().replace(/[\s-]+/g, '_')
  const expected = results[q] ?? (Object.keys(results).length === 1 ? Object.values(results)[0] : undefined)
  if (check.type === 'snell' && results.total_internal_reflection) {
    return { status: 'verified', detail: 'Checked: no refracted ray — total internal reflection happens at this angle.' }
  }
  if (expected === undefined || !Number.isFinite(expected)) return { status: 'unchecked' }
  const claimed = num(check.claimed)
  if (claimed !== undefined && Math.abs(claimed - expected) <= Math.max(1e-9, Math.abs(expected) * 0.01)) {
    return { status: 'verified', expected, detail: `Checked by Visiora's physics engine: ${fmt(expected)}.` }
  }
  return {
    status: 'corrected',
    expected,
    detail: `Visiora's physics engine gets ${fmt(expected)} here${claimed !== undefined ? ` (the AI said ${fmt(claimed)})` : ''}. Trust the engine's value.`,
  }
}

const str = (v, max = 4000) => (typeof v === 'string' ? v.trim().slice(0, max) : '')
const list = (v, max = 12) => (Array.isArray(v) ? v.map(x => str(x, 600)).filter(Boolean).slice(0, max) : [])

/** Turn raw model JSON into the shape the app renders. Never throws. */
export function normalize(raw) {
  const r = raw && typeof raw === 'object' ? raw : {}
  const kind = ['greeting', 'concept', 'numerical', 'off_topic'].includes(r.kind) ? r.kind : 'concept'
  const quiet = kind === 'greeting' || kind === 'off_topic'
  const labId = !quiet && LABS[r.lab] ? r.lab : null
  const verification = !quiet && r.check ? verify(r.check) : { status: 'unchecked' }
  // Strip any LaTeX dollar signs the model slipped in.
  const clean = s => s.replace(/\$\$?([^$]+)\$\$?/g, '$1')
  return {
    kind,
    title: str(r.title, 140) || (quiet ? 'Visiora tutor' : 'Physics'),
    explanation: clean(str(r.explanation, 6000)) || 'Sorry — I could not form an answer. Please try asking again.',
    formulas: quiet ? [] : list(r.formulas, 6).map(clean),
    steps: kind === 'numerical' ? list(r.steps, 15).map(clean) : [],
    finalAnswer: kind === 'numerical' ? clean(str(r.final_answer, 300)) : '',
    keyPoints: quiet ? [] : list(r.key_points, 5),
    lab: labId ? { id: labId, ...LABS[labId], reason: str(r.lab_reason, 200) } : null,
    verification,
  }
}

/** Build the Gemini request body from the student's message and recent chat. */
export function buildRequest(message, history = []) {
  const turns = (Array.isArray(history) ? history : [])
    .filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .slice(-8)
    .map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content.slice(0, 4000) }] }))
  return {
    systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents: [...turns, { role: 'user', parts: [{ text: message }] }],
    generationConfig: {
      temperature: 0.2,
      responseMimeType: 'application/json',
      responseSchema: RESPONSE_SCHEMA,
    },
  }
}
