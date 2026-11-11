/**
 * VISIORA — guided ideas for "Falling on other planets": predict, then drop, then explain why.
 * The verdict always comes from running the drop in engine/fall.js, never from a stored answer.
 */
import { simulateDrop, vacuumTime } from './fall'
import { planet } from './planets'

const TOGETHER = 0.02 // s: closer than this, the eye sees them land together

/** Who landed first: 'a', 'b' or 'together'. */
export function race(a, b) {
  const ta = a.landed?.t ?? Infinity, tb = b.landed?.t ?? Infinity
  if (Math.abs(ta - tb) < TOGETHER) return 'together'
  return ta < tb ? 'a' : 'b'
}

export const FALL_LESSONS = [
  {
    id: 'moon-hammer',
    title: 'Hammer and feather',
    world: 'moon', height: 1.6, objects: ['hammer', 'feather'],
    question: 'On the Moon, a hammer and a feather are let go together. Which lands first?',
    note: 'An astronaut really did this on the Moon in 1971.',
    options: [{ id: 'a', label: 'The hammer' }, { id: 'b', label: 'The feather' }, { id: 'together', label: 'They land together' }],
    outcome: ([a, b]) => race(a, b),
    told: { a: 'The hammer landed first.', b: 'The feather landed first.', together: 'They landed together, at the same instant.' },
    explain: [
      { ask: 'Why do they land together on the Moon?', answers: [
        { label: 'There’s no air to slow the feather', right: true, reply: 'Yes. With no air, gravity is the only force, and it speeds everything up at the same rate: 1.62 m/s² on the Moon, whatever the mass.' },
        { label: 'The Moon’s gravity is weaker', reply: 'It is weaker, but for both of them equally. What usually slows a feather down on Earth?' },
        { label: 'I’m not sure', reply: 'Think about what is missing on the Moon that we have all around us here.' },
      ] },
      { ask: 'So does a heavier thing fall faster when there is no air?', answers: [
        { label: 'No, everything falls together', right: true, reply: 'Right. Galileo argued it and the Moon proved it: without air, mass makes no difference to falling.' },
        { label: 'Yes, a bit faster', reply: 'Look at the two landing times again: are they different at all?' },
        { label: 'I’m not sure', reply: 'Drop a steel ball and a paper ball on the Moon in Free play and compare.' },
      ] },
    ],
  },
  {
    id: 'earth-hammer',
    title: 'Now on Earth',
    world: 'earth', height: 1.6, objects: ['hammer', 'feather'],
    question: 'Same hammer, same feather, but on Earth. Which lands first?',
    note: 'Same height, 1.6 m, but now there is air.',
    options: [{ id: 'a', label: 'The hammer' }, { id: 'b', label: 'The feather' }, { id: 'together', label: 'They land together' }],
    outcome: ([a, b]) => race(a, b),
    told: { a: 'The hammer landed first; the feather drifted down long after.', b: 'The feather landed first.', together: 'They landed together.' },
    explain: [
      { ask: 'Why does the feather lose on Earth?', answers: [
        { label: 'Air pushes back on it hard, for how light it is', right: true, reply: 'Yes. Air resistance grows with speed and with size. The feather is large and very light, so the air soon balances its weight and it stops speeding up: about 1 m/s.' },
        { label: 'Earth pulls feathers less', reply: 'Gravity pulls every gram the same. What is here on Earth that was not on the Moon?' },
        { label: 'I’m not sure', reply: 'Watch its speed: it stops getting faster almost at once. Something is pushing up on it.' },
      ] },
      { ask: 'If we pumped all the air out of a huge room on Earth, what would happen?', answers: [
        { label: 'They would land together', right: true, reply: 'Yes, and it has been done, in NASA’s giant vacuum chamber: a bowling ball and feathers hit the floor together.' },
        { label: 'The hammer would still win', reply: 'Without air, what force is left to slow the feather?' },
        { label: 'I’m not sure', reply: 'In Free play, choose Earth and switch on "Pump out the air".' },
      ] },
    ],
  },
  {
    id: 'balloon',
    title: 'Helium balloon',
    world: 'earth', height: 2, objects: ['balloon', 'steel'],
    question: 'On Earth, you let go of a helium balloon. What will it do?',
    note: 'A steel ball drops beside it for comparison.',
    options: [{ id: 'fast', label: 'Fall fast' }, { id: 'slow', label: 'Fall slowly' }, { id: 'up', label: 'Go up' }],
    outcome: ([a]) => (a.stuck || (!a.landed && a.top > 2)) ? 'up' : a.landed.t > 1.5 * vacuumTime(2, planet('earth').g) ? 'slow' : 'fast',
    told: { fast: 'It fell fast.', slow: 'It drifted down slowly.', up: 'It went up, while the steel ball fell.' },
    explain: [
      { ask: 'Why does the balloon go up?', answers: [
        { label: 'It weighs less than the air it pushes aside', right: true, reply: 'Exactly. The air pushes up on it with the weight of the air it shoves out of the way (Archimedes). Helium is so light that this push beats the balloon’s weight.' },
        { label: 'Helium has no weight', reply: 'Helium does weigh something, just very little. What is the air around it doing?' },
        { label: 'I’m not sure', reply: 'A clue: a beach ball in water pops up for the same reason.' },
      ] },
      { ask: 'And if you let go of it on the Moon?', answers: [
        { label: 'It would fall', right: true, reply: 'Yes, like a stone: no air means nothing pushes it up. Try it in Free play.' },
        { label: 'It would float off even faster', reply: 'What was pushing it up on Earth? Is that on the Moon?' },
        { label: 'I’m not sure', reply: 'Buoyancy needs something to push aside. What surrounds you on the Moon?' },
      ] },
    ],
  },
]

/** Run an idea's drop to the end: one result per object. */
export function runFall(lesson) {
  const w = planet(lesson.world)
  return lesson.objects.map(kind => simulateDrop(kind, lesson.height, { g: w.g, rho: w.rho }, { ceiling: lesson.height * 1.6 }))
}
