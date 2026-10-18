/**
 * VISIORA — Exact DC circuit solver for the Electricity Lab (Class 10).
 * Modified nodal analysis: Kirchhoff's current law at every node plus one
 * equation per voltage source, solved by Gaussian elimination. Results are
 * exact up to floating point, so Ohm's law, KCL and KVL hold to ~1e-12.
 *
 * Elements:
 *   { id, type: 'R', a, b, R }           resistor between nodes a and b
 *   { id, type: 'V', p, n, V }           ideal battery, + terminal at p
 *   { id, type: 'A', p, n }              ideal ammeter / closed switch / wire (0 V source)
 * Node 0 is ground. Currents are conventional, measured a→b (R) or p→n through the part (A).
 * For a battery, current() is what it pushes out of its + terminal.
 */

// A tiny leak to ground keeps open-circuit nodes solvable (an ideal voltmeter
// across an open switch still reads the battery voltage). Effect ≈ 1e-12 A.
const GMIN = 1e-12

export function solve(nodes, elements) {
  const N = nodes - 1
  const sources = elements.filter(e => e.type === 'V' || e.type === 'A')
  const size = N + sources.length
  const A = Array.from({ length: size }, () => new Float64Array(size))
  const z = new Float64Array(size)
  const idx = n => n - 1 // node n → row (ground excluded)

  for (let i = 0; i < N; i++) A[i][i] += GMIN

  for (const e of elements) {
    if (e.type !== 'R') continue
    const g = 1 / e.R
    const a = idx(e.a)
    const b = idx(e.b)
    if (e.a) A[a][a] += g
    if (e.b) A[b][b] += g
    if (e.a && e.b) { A[a][b] -= g; A[b][a] -= g }
  }

  sources.forEach((e, k) => {
    const row = N + k
    const p = idx(e.p)
    const n = idx(e.n)
    if (e.p) { A[p][row] += 1; A[row][p] += 1 }
    if (e.n) { A[n][row] -= 1; A[row][n] -= 1 }
    z[row] = e.type === 'V' ? e.V : 0
  })

  const x = gauss(A, z)
  const v = n => (n === 0 ? 0 : x[idx(n)])
  const currents = {}
  for (const e of elements) {
    if (e.type === 'R') currents[e.id] = (v(e.a) - v(e.b)) / e.R
  }
  sources.forEach((e, k) => {
    // MNA's source current flows from p to n through the source.
    const i = x[N + k]
    currents[e.id] = e.type === 'V' ? -i : i
  })
  const clean = n => (Math.abs(n) < 1e-9 ? 0 : n)
  return {
    voltage: v,
    current: id => clean(currents[id] ?? 0),
    across: (a, b) => clean(v(a) - v(b)),
  }
}

function gauss(A, z) {
  const n = z.length
  const M = A.map((row, i) => [...row, z[i]])
  for (let c = 0; c < n; c++) {
    let piv = c
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[piv][c])) piv = r
    ;[M[c], M[piv]] = [M[piv], M[c]]
    const d = M[c][c]
    if (Math.abs(d) < 1e-300) continue
    for (let r = 0; r < n; r++) {
      if (r === c) continue
      const f = M[r][c] / d
      if (!f) continue
      for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k]
    }
  }
  return M.map((row, i) => row[n] / row[i])
}

/**
 * Netlists for the three classroom circuits.
 * kind: 'series' | 'parallel' | 'mixed'; Rs: resistor values; closed: switch state.
 * Every circuit: battery B (+ at node 1), ammeter A, switch S, resistors R1..Rn.
 * Returns { nodes, elements, ends } where ends[id] = [nodeA, nodeB] for the voltmeter.
 */
export function buildCircuit(kind, V, Rs, closed) {
  const els = [{ id: 'B', type: 'V', p: 1, n: 0, V }]
  const ends = { B: [1, 0] }
  let nodes
  if (kind === 'series') {
    // + → R1 → R2 (→ R3) → ammeter → switch → −
    Rs.forEach((R, i) => {
      els.push({ id: `R${i + 1}`, type: 'R', a: i + 1, b: i + 2, R })
      ends[`R${i + 1}`] = [i + 1, i + 2]
    })
    const a = Rs.length + 1
    els.push({ id: 'A', type: 'A', p: a, n: a + 1 })
    ends.A = [a, a + 1]
    if (closed) els.push({ id: 'S', type: 'A', p: a + 1, n: 0 })
    ends.S = [a + 1, 0]
    nodes = a + 2
  } else if (kind === 'parallel') {
    // + → ammeter → top rail (2) → each R → bottom rail (3) → switch → −
    els.push({ id: 'A', type: 'A', p: 1, n: 2 })
    ends.A = [1, 2]
    Rs.forEach((R, i) => {
      els.push({ id: `R${i + 1}`, type: 'R', a: 2, b: 3, R })
      ends[`R${i + 1}`] = [2, 3]
    })
    if (closed) els.push({ id: 'S', type: 'A', p: 3, n: 0 })
    ends.S = [3, 0]
    nodes = 4
  } else {
    // + → ammeter → R1 → (R2 ∥ R3) → switch → −
    els.push({ id: 'A', type: 'A', p: 1, n: 2 })
    ends.A = [1, 2]
    els.push({ id: 'R1', type: 'R', a: 2, b: 3, R: Rs[0] })
    ends.R1 = [2, 3]
    els.push({ id: 'R2', type: 'R', a: 3, b: 4, R: Rs[1] })
    ends.R2 = [3, 4]
    els.push({ id: 'R3', type: 'R', a: 3, b: 4, R: Rs[2] })
    ends.R3 = [3, 4]
    if (closed) els.push({ id: 'S', type: 'A', p: 4, n: 0 })
    ends.S = [4, 0]
    nodes = 5
  }
  return { nodes, elements: els, ends }
}

/** Equivalent resistance by the textbook formulas (for the worked maths). */
export function equivalentResistance(kind, Rs) {
  const par = list => 1 / list.reduce((s, R) => s + 1 / R, 0)
  if (kind === 'series') return Rs.reduce((s, R) => s + R, 0)
  if (kind === 'parallel') return par(Rs)
  return Rs[0] + par([Rs[1], Rs[2]])
}

export function insight(kind, closed, Rs) {
  if (!closed) return 'The switch is open, so the loop is broken: no current flows anywhere. The voltmeter across the switch still reads the full battery voltage!'
  if (kind === 'series') return 'In series there is only one path, so the same current flows through every resistor. The battery voltage is shared: the bigger resistor gets the bigger share.'
  if (kind === 'parallel') return `In parallel every resistor gets the full battery voltage. The current splits — more goes through the smaller resistor. Adding a path lowers the total resistance${Rs.length === 3 ? ' (try 2 vs 3 resistors)' : ''}.`
  return 'R1 carries all the current. Then it splits between R2 and R3, which share the same voltage because they are side by side.'
}
