/**
 * Drawing layouts for the Electricity Lab, on a 10 × 6 grid.
 * Each segment is a straight wire from a → b (the direction conventional current
 * flows), carrying the sum of the solver currents listed in `carries`.
 * Parts sit on a segment at fraction `at` along it.
 */

const seg = (a, b, carries, parts = []) => ({ a, b, carries, parts })

// Battery on the left side, + terminal at the top; shared by every layout.
const batteryLeft = [
  seg([0, 4], [0, 2], ['B'], [{ id: 'B', type: 'battery', at: 0.5 }]),
  seg([0, 2], [0, 0], ['B']),
]
const returnLeft = seg([0, 6], [0, 4], ['B'])

export function layoutFor(kind, count) {
  if (kind === 'series') {
    const xs = count === 3 ? [0.22, 0.5, 0.78] : [0.3, 0.7]
    return {
      junctions: [],
      segments: [
        ...batteryLeft,
        seg([0, 0], [10, 0], ['B'], xs.map((at, i) => ({ id: `R${i + 1}`, type: 'resistor', at }))),
        seg([10, 0], [10, 6], ['B'], [{ id: 'A', type: 'ammeter', at: 0.5 }]),
        seg([10, 6], [0, 6], ['B'], [{ id: 'S', type: 'switch', at: 0.5 }]),
        returnLeft,
      ],
    }
  }

  if (kind === 'parallel') {
    const xs = count === 3 ? [4, 6.75, 9.5] : [5, 9.5]
    const ids = xs.map((_, i) => `R${i + 1}`)
    const segments = [
      ...batteryLeft,
      seg([0, 0], [xs[0], 0], ['B'], [{ id: 'A', type: 'ammeter', at: 0.5 }]),
    ]
    for (let i = 0; i < xs.length - 1; i++) {
      segments.push(seg([xs[i], 0], [xs[i + 1], 0], ids.slice(i + 1)))
    }
    xs.forEach((x, i) => segments.push(seg([x, 0], [x, 6], [ids[i]], [{ id: ids[i], type: 'resistor', at: 0.5 }])))
    for (let i = xs.length - 1; i > 0; i--) {
      segments.push(seg([xs[i], 6], [xs[i - 1], 6], ids.slice(i)))
    }
    segments.push(seg([xs[0], 6], [0, 6], ['B'], [{ id: 'S', type: 'switch', at: 0.5 }]), returnLeft)
    // Every rung but the last meets its rails at a junction (the last one is a corner).
    return { junctions: xs.slice(0, -1).flatMap(x => [[x, 0], [x, 6]]), segments }
  }

  // mixed: R1 in series, then R2 ∥ R3
  return {
    junctions: [[6, 0], [6, 6]],
    segments: [
      ...batteryLeft,
      seg([0, 0], [6, 0], ['B'], [{ id: 'A', type: 'ammeter', at: 0.25 }, { id: 'R1', type: 'resistor', at: 0.68 }]),
      seg([6, 0], [9.5, 0], ['R3']),
      seg([6, 0], [6, 6], ['R2'], [{ id: 'R2', type: 'resistor', at: 0.5 }]),
      seg([9.5, 0], [9.5, 6], ['R3'], [{ id: 'R3', type: 'resistor', at: 0.5 }]),
      seg([9.5, 6], [6, 6], ['R3']),
      seg([6, 6], [0, 6], ['B'], [{ id: 'S', type: 'switch', at: 0.5 }]),
      returnLeft,
    ],
  }
}
