/**
 * VISIORA — the guided ideas on the light bench: predict, then try, then explain why.
 * Each idea sets up the bench, asks for a prediction, and judges it from the ray tracer itself
 * (engine/raybench.js), never from a stored answer: what the student is told happened is what
 * the light actually did. The "why" is a short conversation where the tutor asks first.
 */
import { dirOf, mainPath, makeShape, vec } from './raybench'

/** Which way a ray bent at a surface: towards or away from the normal, straight on, or trapped. */
export function bendOf(event) {
  if (!event) return null
  if (event.tir) return 'trapped'
  if (event.i < 0.5) return 'straight'
  if (event.r < event.i - 0.5) return 'towards'
  if (event.r > event.i + 0.5) return 'away'
  return 'straight'
}

/** The first surface where the ray meets glass at an angle (skipping a straight-on entry). */
export const bendingEvent = events => events.find(e => !e.mirror && e.i > 0.2) ?? events[0] ?? null

/** Where the ray box sits for an idea at angle a: aimed at a fixed point, swung round it. */
function aimedAt(target, fromDeg, dist) {
  const d = dirOf(fromDeg) // travel direction
  const p = vec.add(target, d, -dist)
  return { x: p[0], y: p[1], deg: fromDeg }
}

export const LESSONS = [
  {
    id: 'into-glass',
    title: 'Into glass',
    question: 'Light goes into glass. Which way will it bend?',
    note: 'The dashed line is the normal: straight out of the glass.',
    light: 'red',
    angle: { start: 40, min: 0, max: 85, label: 'Tilt the light', hint: 'Try 0°. Then try 80°. Watch r.' },
    shapes: () => [makeShape('slab', 30, 35, 0, { w: 150, h: 70 })],
    // the ray box swings round the point where the ray meets the top face; a is from the normal
    box: a => aimedAt([0, 0], 90 - a, 120),
    options: [
      { id: 'towards', label: 'Towards the line' },
      { id: 'away', label: 'Away from it' },
      { id: 'straight', label: 'Straight on' },
    ],
    outcome: run => bendOf(bendingEvent(run.events)),
    told: {
      towards: 'It bent towards the normal: r is smaller than i.',
      away: 'It bent away from the normal: r is bigger than i.',
      straight: 'It went straight on.',
    },
    explain: [
      {
        ask: 'Why do you think it bends towards the normal?',
        answers: [
          { label: 'Light slows down in glass', right: true, reply: 'Yes. Light is about a third slower in glass. The side of the beam that goes in first slows first, so the beam turns, like a bike wheel running onto sand.' },
          { label: 'Glass pulls the light in', reply: 'Not quite: glass doesn’t pull on light. Something about the light itself changes when it goes in. What could it be?' },
          { label: 'I’m not sure', reply: 'A clue: glass has n = 1.52, and n = speed in air ÷ speed in glass. Is light faster or slower inside?' },
        ],
      },
      {
        ask: 'So what happens when it comes out of the glass?',
        answers: [
          { label: 'Bends away', right: true, reply: 'Right. It speeds up again, so it bends away from the normal. Look at the bottom of the block: it leaves parallel to how it came in.' },
          { label: 'Bends towards', reply: 'Think about the speed. Coming out, does the light slow down or speed up?' },
          { label: 'I’m not sure', reply: 'Look where the ray leaves the bottom of the block. Is it closer to the dashed line, or further from it?' },
        ],
      },
    ],
  },
  {
    id: 'out-of-glass',
    title: 'Out of glass',
    question: 'Now light goes from glass out into air. Which way will it bend?',
    note: 'It enters the curved side along a radius, so it does not bend going in.',
    light: 'green',
    angle: { start: 30, min: 0, max: 70, label: 'Tilt the light', hint: 'Keep tilting past 40°. Where does the light go?' },
    shapes: () => [makeShape('semi', 0, 0, 180, { r: 55 })],
    // aimed at the centre of the flat face from below, through the curved side
    box: a => aimedAt([0, 0], -90 + a, 90),
    options: [
      { id: 'towards', label: 'Towards the line' },
      { id: 'away', label: 'Away from it' },
      { id: 'straight', label: 'Straight on' },
    ],
    outcome: run => bendOf(bendingEvent(run.events)),
    told: {
      towards: 'It bent towards the normal.',
      away: 'It bent away from the normal: r is bigger than i.',
      straight: 'It went straight on.',
      trapped: 'No light got out at all: it all reflected back inside.',
    },
    explain: [
      {
        ask: 'Past about 41°, no light gets out. Why?',
        answers: [
          { label: 'It would have to bend past 90°', right: true, reply: 'Exactly. At 41° the ray leaving already skims along the surface. Any steeper and it has nowhere to go, so it all reflects. That’s total internal reflection: optical fibres work this way.' },
          { label: 'The glass gets too thick', reply: 'The thickness doesn’t change. Watch r as you tilt: what is r just before the light vanishes?' },
          { label: 'I’m not sure', reply: 'Tilt to 40° and read r. Then go to 41°. How big can r get?' },
        ],
      },
      {
        ask: 'Diamond has n = 2.42. Is its critical angle bigger or smaller than glass’s?',
        answers: [
          { label: 'Smaller', right: true, reply: 'Yes, about 24°. Light gets trapped inside a diamond very easily and bounces around before it escapes. That’s the sparkle.' },
          { label: 'Bigger', reply: 'A bigger n bends the light more. So does it reach 90° sooner or later?' },
          { label: 'I’m not sure', reply: 'Try it: in Free play, add a semicircular block and make it diamond.' },
        ],
      },
    ],
  },
  {
    id: 'prism-colours',
    title: 'White light',
    question: 'White light goes into a prism. Which colour will bend the most?',
    note: 'White light is all the colours together.',
    light: 'white',
    angle: { start: 45, min: 30, max: 65, label: 'Tilt the light', hint: 'Find where the colours spread the most.' },
    shapes: () => [makeShape('prism', 15, 10, 0, { s: 80 })],
    // aimed at the middle of the prism's left face, from below the normal
    box: a => {
      const h = (80 * Math.sqrt(3)) / 2, entry = [15 - 20, 10 - h / 6] // midpoint of the left face
      return aimedAt(entry, 30 - a, 110)
    },
    options: [
      { id: 'red', label: 'Red', swatch: '#E5484D' },
      { id: 'green', label: 'Green', swatch: '#30A46C' },
      { id: 'violet', label: 'Violet', swatch: '#8E4EC6' },
    ],
    // the colour turned through the biggest angle, from tracing each one
    outcome: run => {
      const turn = lam => {
        const p = mainPath(run.shapes, run.start, run.dir, { lam })
        return p.dir ? Math.acos(Math.max(-1, Math.min(1, vec.dot(run.dir, p.dir)))) : 0
      }
      const D = { red: turn(650), green: turn(532), violet: turn(410) }
      return Object.entries(D).sort((a, b) => b[1] - a[1])[0][0]
    },
    told: {
      red: 'Red bent the most.',
      green: 'Green bent the most.',
      violet: 'Violet bent the most, and red the least.',
    },
    explain: [
      {
        ask: 'Why does violet bend more than red?',
        answers: [
          { label: 'Glass slows violet more', right: true, reply: 'Yes. Glass’s n is a little higher for violet than for red, so violet slows more and bends more. The colours fan out: dispersion.' },
          { label: 'Violet light is heavier', reply: 'Light has no weight to speak of. Think about speed again: is every colour slowed the same?' },
          { label: 'I’m not sure', reply: 'A clue: for this glass, n is 1.51 for red and 1.53 for violet.' },
        ],
      },
      {
        ask: 'Where else have you seen this?',
        answers: [
          { label: 'A rainbow', right: true, reply: 'Yes. Each raindrop bends sunlight like a tiny prism, and violet and red come out at different angles.' },
          { label: 'A mirror', reply: 'A mirror reflects every colour the same way, so no colours appear. Where do you see colours spread out in the sky?' },
          { label: 'I’m not sure', reply: 'Think of the sky after rain, with the sun behind you.' },
        ],
      },
    ],
  },
]

/** Set the bench for an idea at angle a, and trace the main ray: { shapes, box, start, dir, events, path }. */
export function runLesson(lesson, a, shapes = lesson.shapes()) {
  const box = lesson.box(a)
  const dir = dirOf(box.deg)
  const start = vec.add([box.x, box.y], dir, 9)
  const path = mainPath(shapes, start, dir, { lam: lesson.light === 'white' ? 550 : lesson.light === 'green' ? 532 : 650 })
  return { shapes, box, start, dir, events: path.events, path }
}

