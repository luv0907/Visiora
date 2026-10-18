/**
 * VISIORA — Formula engine for the Graph Board.
 * Turns what a student types ("s = u*t + 1/2*a*t^2") into an exact,
 * evaluable function, and finds key points (roots, peaks) numerically.
 * Nothing here is approximated by the AI — every value is computed.
 */
import * as mathjs from 'mathjs'

const { parse, OperatorNode, ParenthesisNode, SymbolNode } = mathjs

// Symbols that are constants, never sliders.
const CONSTANTS = new Set(['pi', 'e', 'PI', 'E', 'Infinity'])

// Preferred x-axis variables, in order.
const INDEPENDENT_PREFERENCE = ['x', 't', 'theta', 'V', 'r', 'v', 'm']

// Friendly slider defaults for common physics symbols (class 8–10).
const PARAM_DEFAULTS = {
  g: { value: 9.8, min: 0, max: 25, step: 0.1 },
  u: { value: 10, min: 0, max: 50, step: 0.5 },
  v: { value: 10, min: 0, max: 50, step: 0.5 },
  a: { value: 2, min: -10, max: 10, step: 0.1 },
  m: { value: 1, min: 0.1, max: 10, step: 0.1 },
  k: { value: 1, min: 0, max: 10, step: 0.1 },
  A: { value: 2, min: 0, max: 10, step: 0.1 },
  R: { value: 5, min: 0.5, max: 50, step: 0.5 },
  V: { value: 12, min: 0, max: 24, step: 0.5 },
  I: { value: 1, min: 0, max: 10, step: 0.1 },
  F: { value: 10, min: 0, max: 100, step: 1 },
  h: { value: 10, min: 0, max: 100, step: 1 },
  H: { value: 20, min: 0, max: 100, step: 1 },
  omega: { value: 1, min: 0, max: 10, step: 0.1 },
  w: { value: 1, min: 0, max: 10, step: 0.1 },
  f: { value: 1, min: 0, max: 10, step: 0.1 },
  lambda: { value: 2, min: 0.1, max: 10, step: 0.1 },
  phi: { value: 0, min: -180, max: 180, step: 1 },
  theta: { value: 45, min: 0, max: 90, step: 1 },
}

const GENERIC_DEFAULT = { value: 1, min: -10, max: 10, step: 0.1 }

// Map symbols students type on phones to mathjs syntax.
const REPLACEMENTS = [
  [/[×·]/g, '*'],
  [/÷/g, '/'],
  [/[−–]/g, '-'],
  [/π/g, 'pi'],
  [/√\s*([A-Za-z_]\w*|\d+(?:\.\d+)?)/g, 'sqrt($1)'],
  [/√/g, 'sqrt'],
  [/²/g, '^2'],
  [/³/g, '^3'],
  [/θ/g, 'theta'],
  [/ω/g, 'omega'],
  [/λ/g, 'lambda'],
  [/[φϕ]/g, 'phi'],
  [/α/g, 'alpha'],
  [/β/g, 'beta'],
  [/Δ/g, 'delta'],
  [/μ/g, 'mu'],
  [/ρ/g, 'rho'],
]

const GREEK = { theta: 'θ', omega: 'ω', lambda: 'λ', phi: 'φ', alpha: 'α', beta: 'β', delta: 'Δ', mu: 'μ', rho: 'ρ', pi: 'π' }

/** Show symbols the way they appear in textbooks (theta → θ). */
export function displayName(name) {
  return (name || '').replace(/[A-Za-z_]\w*/g, w => GREEK[w] || w)
}

export function paramDefaults(name) {
  return { ...(PARAM_DEFAULTS[name] || GENERIC_DEFAULT) }
}

function normalise(text) {
  let s = text.trim()
  for (const [re, to] of REPLACEMENTS) s = s.replace(re, to)
  return s
}

/**
 * Parse "y = expr", "f(x) = expr" or a bare "expr".
 * Returns { ok, output, expression, symbols, independent, evaluate } or { ok:false, error }.
 * `evaluate(x, params, { degrees })` returns a real number or NaN.
 */
export function parseFormula(text, preferredIndependent) {
  const src = normalise(text || '')
  if (!src) return { ok: false, error: 'Type a formula, like y = 2x + 3' }

  let output = 'y'
  let rhs = src
  let lhsArg = null
  const eq = src.indexOf('=')
  if (eq !== -1) {
    const lhs = src.slice(0, eq).trim()
    rhs = src.slice(eq + 1).trim()
    if (rhs.includes('=')) return { ok: false, error: 'Use only one "=" sign.' }
    const fnMatch = lhs.match(/^([A-Za-z_]\w*)\s*\(\s*([A-Za-z_]\w*)\s*\)$/)
    if (fnMatch) {
      output = `${fnMatch[1]}(${fnMatch[2]})`
      lhsArg = fnMatch[2]
    } else if (/^[A-Za-z_]\w*$/.test(lhs)) {
      output = lhs
    } else {
      return { ok: false, error: 'Write it with one variable on the left, like y = …' }
    }
    if (!rhs) return { ok: false, error: 'Something is missing after "=".' }
  }

  let node
  try {
    node = parse(rhs)
  } catch (err) {
    return { ok: false, error: friendlyParseError(err) }
  }

  // Students write a(x + 1) meaning a × (x + 1); only real functions stay calls.
  node = node.transform(n => {
    if (n.isFunctionNode && n.fn?.isSymbolNode && n.args.length === 1 && typeof mathjs[n.fn.name] !== 'function') {
      return new OperatorNode('*', 'multiply', [new SymbolNode(n.fn.name), new ParenthesisNode(n.args[0])], true)
    }
    return n
  })

  const fnNames = new Set(node.filter(n => n.isFunctionNode).map(n => n.fn?.name).filter(Boolean))
  const symbols = [...new Set(
    node.filter(n => n.isSymbolNode).map(n => n.name)
  )].filter(name => !fnNames.has(name) && !CONSTANTS.has(name))

  let independent = null
  if (lhsArg) independent = lhsArg
  else if (preferredIndependent && symbols.includes(preferredIndependent)) independent = preferredIndependent
  else independent = INDEPENDENT_PREFERENCE.find(s => symbols.includes(s)) || symbols[0] || 'x'

  const params = symbols.filter(s => s !== independent)
  const compiled = node.compile()

  const evaluate = (x, values = {}, opts = {}) => {
    const scope = { ...values, [independent]: x }
    if (opts.degrees) Object.assign(scope, DEGREE_TRIG)
    try {
      const r = compiled.evaluate(scope)
      return typeof r === 'number' ? r : NaN
    } catch {
      return NaN
    }
  }

  // Check once with defaults so obvious mistakes (calling a variable) show up as text.
  try {
    const scope = { [independent]: 1 }
    for (const p of params) scope[p] = paramDefaults(p).value
    compiled.evaluate(scope)
  } catch (err) {
    return { ok: false, error: friendlyEvalError(err) }
  }

  return {
    ok: true,
    output,
    expression: rhs,
    tex: node.toString({ implicit: 'show' }),
    symbols,
    independent,
    params,
    evaluate,
  }
}

const D2R = Math.PI / 180
const DEGREE_TRIG = {
  sin: d => Math.sin(d * D2R),
  cos: d => Math.cos(d * D2R),
  tan: d => Math.tan(d * D2R),
  asin: v => Math.asin(v) / D2R,
  acos: v => Math.acos(v) / D2R,
  atan: v => Math.atan(v) / D2R,
}

function friendlyParseError(err) {
  const msg = String(err?.message || err)
  if (/Parenthesis/.test(msg)) return 'A bracket is missing — check ( and ).'
  if (/Unexpected end/.test(msg)) return 'The formula ends too early.'
  const ch = msg.match(/Char:\s*(\d+)/)
  return ch ? `I couldn't read this near character ${Number(ch[1])}.` : "I couldn't read this formula."
}

function friendlyEvalError(err) {
  const msg = String(err?.message || err)
  const notFn = msg.match(/'(\w+)' is not a function/)
  if (notFn) return `Use * to multiply: write ${notFn[1]}*(…) instead of ${notFn[1]}(…).`
  const undef = msg.match(/Undefined function (\w+)/)
  if (undef) return `"${undef[1]}" isn't a function I know.`
  return "This formula can't be calculated."
}

/**
 * Sample f on [x0, x1] into continuous segments, splitting at
 * gaps (NaN) and true jumps (asymptotes like tan or 1/x).
 * yRange is the visible height in world units, used to decide what counts as a jump.
 */
export function sampleSegments(f, x0, x1, n, yRange) {
  const segments = []
  let seg = []
  let px = NaN
  let py = NaN
  for (let i = 0; i <= n; i++) {
    const x = x0 + ((x1 - x0) * i) / n
    const y = f(x)
    if (!Number.isFinite(y)) {
      if (seg.length) segments.push(seg)
      seg = []
    } else {
      if (seg.length && Math.abs(y - py) > yRange * 0.5 && isJump(f, px, x, yRange)) {
        segments.push(seg)
        seg = []
      }
      seg.push([x, y])
    }
    px = x
    py = y
  }
  if (seg.length) segments.push(seg)
  return segments
}

// Bisect toward the steepest half; a continuous function's change shrinks to ~0.
function isJump(f, a, b, yRange) {
  let fa = f(a)
  let fb = f(b)
  for (let k = 0; k < 40; k++) {
    const m = (a + b) / 2
    const fm = f(m)
    if (!Number.isFinite(fm)) return true
    if (Math.abs(fm - fa) > Math.abs(fb - fm)) { b = m; fb = fm } else { a = m; fa = fm }
    if (Math.abs(fb - fa) < yRange * 1e-4) return false
  }
  return true
}

function bisectRoot(f, a, b) {
  let fa = f(a)
  for (let k = 0; k < 80; k++) {
    const m = (a + b) / 2
    const fm = f(m)
    if (fm === 0) return m
    if (Math.sign(fm) === Math.sign(fa)) { a = m; fa = fm } else { b = m }
  }
  return (a + b) / 2
}

function goldenExtremum(f, a, b, sign) {
  const r = (Math.sqrt(5) - 1) / 2
  let c = b - r * (b - a)
  let d = a + r * (b - a)
  for (let k = 0; k < 100; k++) {
    if (sign * f(c) > sign * f(d)) b = d
    else a = c
    c = b - r * (b - a)
    d = a + r * (b - a)
  }
  return (a + b) / 2
}

/**
 * Exact key points on [x0, x1]: roots, local maxima/minima and the y-intercept.
 * Each point is { kind: 'root'|'max'|'min'|'intercept', x, y }.
 */
export function findKeyPoints(f, x0, x1, n = 800, yRange = Infinity) {
  const pts = []
  const xs = []
  const ys = []
  for (let i = 0; i <= n; i++) {
    const x = x0 + ((x1 - x0) * i) / n
    xs.push(x)
    ys.push(f(x))
  }
  const dx = (x1 - x0) / n
  const tol = dx * 1e-3
  const push = p => {
    if (!pts.some(q => q.kind === p.kind && Math.abs(q.x - p.x) < tol * 10)) pts.push(p)
  }

  for (let i = 0; i < n; i++) {
    const ya = ys[i]
    const yb = ys[i + 1]
    if (!Number.isFinite(ya) || !Number.isFinite(yb)) continue
    if (ya === 0) push({ kind: 'root', x: xs[i], y: 0 })
    else if (Math.sign(ya) !== Math.sign(yb) && yb !== 0) {
      if (Number.isFinite(yRange) && isJump(f, xs[i], xs[i + 1], yRange)) continue
      const x = bisectRoot(f, xs[i], xs[i + 1])
      push({ kind: 'root', x, y: 0 })
    }
  }
  if (ys[n] === 0) push({ kind: 'root', x: xs[n], y: 0 })

  for (let i = 1; i < n; i++) {
    const [a, b, c] = [ys[i - 1], ys[i], ys[i + 1]]
    if (![a, b, c].every(Number.isFinite)) continue
    if (b > a && b >= c && !(b === c && a === b)) {
      const x = goldenExtremum(f, xs[i - 1], xs[i + 1], 1)
      push({ kind: 'max', x, y: f(x) })
    } else if (b < a && b <= c && !(b === c && a === b)) {
      const x = goldenExtremum(f, xs[i - 1], xs[i + 1], -1)
      push({ kind: 'min', x, y: f(x) })
    }
  }

  if (x0 <= 0 && x1 >= 0) {
    const y = f(0)
    const isRoot = y === 0 && pts.some(p => p.kind === 'root' && Math.abs(p.x) < tol * 10)
    if (Number.isFinite(y) && !isRoot) push({ kind: 'intercept', x: 0, y })
  }
  return pts
}

/** A "nice" grid step (1, 2 or 5 × 10ⁿ) giving about `target` lines over `range`. */
export function niceStep(range, target = 8) {
  const raw = range / target
  const mag = Math.pow(10, Math.floor(Math.log10(raw)))
  const norm = raw / mag
  const nice = norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10
  return nice * mag
}

/** Format a number for labels without float noise (0.30000000000000004 → 0.3). */
export function formatNumber(v, maxDecimals = 3) {
  if (!Number.isFinite(v)) return '—'
  if (Math.abs(v) < 1e-12) return '0'
  const abs = Math.abs(v)
  if (abs >= 1e6 || abs < 1e-4) return v.toExponential(2).replace('e+', 'e')
  const s = v.toFixed(maxDecimals)
  return s.includes('.') ? s.replace(/\.?0+$/, '') : s
}

/** Format a tick label given the grid step, so 0.1-steps show one decimal. */
export function formatTick(v, step) {
  const decimals = Math.max(0, -Math.floor(Math.log10(step)))
  return formatNumber(Number(v.toFixed(decimals)), decimals)
}
