/**
 * VISIORA — guided ideas for Air track collisions: predict, then push, then explain why.
 * Each verdict comes from colliding the gliders in engine/airtrack.js, never from a stored answer.
 */
import { BUMPERS, makeTrack, stepTrack } from './airtrack'

/** Run a setup until the gliders first meet; returns { before, after } speeds. */
export function firstHit(lesson) {
  const s = makeTrack(lesson.gliders, { e: BUMPERS[lesson.bumper].e })
  while (!s.firstHit && s.t < 10) stepTrack(s, 0.01)
  return s.firstHit
}

/** A glider: m in kg, left edge x in metres, speed v in m/s. */
const G = (m, x, v) => ({ m, x, v })

export const TRACK_LESSONS = [
  {
    id: 'equal',
    title: 'Equal gliders',
    bumper: 'spring',
    gliders: [G(0.2, 0.25, 0.5), G(0.2, 1.0, 0)],
    question: 'Glider A hits glider B, which is standing still. They weigh the same. What happens?',
    note: 'Springy bumpers. Each glider is 0.2 kg; A moves at 0.5 m/s.',
    options: [{ id: 'stop', label: 'A stops dead, B moves off' }, { id: 'both', label: 'Both move on, slower' }, { id: 'back', label: 'A bounces back' }],
    outcome: lesson => {
      const { before, after } = firstHit(lesson), r = after[0] / before[0]
      return Math.abs(r) < 0.1 ? 'stop' : r < 0 ? 'back' : 'both'
    },
    told: { stop: 'A stopped dead and B moved off at almost A’s speed.', both: 'They both moved on.', back: 'A bounced back.' },
    explain: [
      { ask: 'Where did A’s momentum go?', answers: [
        { label: 'All of it passed to B', right: true, reply: 'Yes. Momentum is mass × speed. B has the same mass, so to carry all of A’s momentum it moves off at A’s speed, and A is left with none.' },
        { label: 'It was used up in the crash', reply: 'Look at the total bar: it is the same before and after. Momentum is never used up in a collision; it is only passed on.' },
        { label: 'I’m not sure', reply: 'Watch the momentum bars. Before, only A has any. After, which one has it?' },
      ] },
      { ask: 'What if B were twice as heavy?', answers: [
        { label: 'A would bounce back a little and B would move off slower', right: true, reply: 'Right. A heavy B is harder to get moving, so it takes the push slowly and A rebounds. Try it in Free play with two weights on B.' },
        { label: 'Exactly the same', reply: 'B needs twice the push to reach the same speed. Could A give it that and still stop?' },
        { label: 'I’m not sure', reply: 'Think of a ping pong ball hitting a cricket ball. Which way does the ping pong ball go?' },
      ] },
    ],
  },
  {
    id: 'heavy',
    title: 'Heavy into light',
    bumper: 'spring',
    gliders: [G(0.6, 0.25, 0.4), G(0.2, 1.0, 0)],
    question: 'A heavy glider (0.6 kg) at 0.4 m/s hits a light one (0.2 kg) standing still. How fast does the light one go off?',
    note: 'Springy bumpers. The heavy glider carries four extra weights.',
    options: [{ id: 'slower', label: 'Slower than 0.4 m/s' }, { id: 'same', label: 'About 0.4 m/s' }, { id: 'faster', label: 'Faster than 0.4 m/s' }],
    outcome: lesson => {
      const { before, after } = firstHit(lesson), r = after[1] / before[0]
      return r > 1.03 ? 'faster' : r < 0.97 ? 'slower' : 'same'
    },
    told: { slower: 'The light glider went off slower.', same: 'It went off at about the same speed.', faster: 'The light glider shot off faster than the heavy one was going.' },
    explain: [
      { ask: 'How can the light one go faster than the heavy one came in?', answers: [
        { label: 'A small mass needs a big speed to carry its share of momentum', right: true, reply: 'Yes. The heavy glider hands over part of its momentum. B has only a third of its mass, so even that part makes it move fast.' },
        { label: 'The spring adds extra speed', reply: 'The spring only gives back what it was squashed with. Check the total momentum bar: it did not grow.' },
        { label: 'I’m not sure', reply: 'Momentum = mass × speed. If the mass is small, what must the speed be?' },
      ] },
      { ask: 'What does the heavy glider do after the hit?', answers: [
        { label: 'Keeps going forward, slower', right: true, reply: 'Right. It only gave away part of its momentum, so it carries on behind the light one.' },
        { label: 'Stops dead', reply: 'That happened with equal masses. Here the heavy one has more to give than the light one can take at that speed.' },
        { label: 'I’m not sure', reply: 'Push it again and watch the pink glider after the hit.' },
      ] },
    ],
  },
  {
    id: 'stick',
    title: 'They stick',
    bumper: 'velcro',
    gliders: [G(0.2, 0.25, 0.6), G(0.2, 1.0, 0)],
    question: 'Now the bumpers are velcro, so the gliders stick together. A at 0.6 m/s hits B standing still. How fast do they move off?',
    note: 'Both 0.2 kg again.',
    options: [{ id: 'full', label: 'At 0.6 m/s' }, { id: 'half', label: 'At 0.3 m/s' }, { id: 'stop', label: 'They stop' }],
    outcome: lesson => {
      const { before, after } = firstHit(lesson), r = after[0] / before[0]
      return r < 0.1 ? 'stop' : Math.abs(r - 0.5) < 0.05 ? 'half' : 'full'
    },
    told: { full: 'They moved off at 0.6 m/s.', half: 'They moved off together at half of A’s speed.', stop: 'They stopped.' },
    explain: [
      { ask: 'Why half the speed?', answers: [
        { label: 'The same momentum is now carried by twice the mass', right: true, reply: 'Exactly. 0.2 kg × 0.6 m/s = 0.12 kg·m/s before. After, 0.4 kg must carry 0.12 kg·m/s, so it moves at 0.3 m/s.' },
        { label: 'The velcro slows them', reply: 'The velcro only holds them together. Does the total momentum bar change at the hit?' },
        { label: 'I’m not sure', reply: 'Before: 0.2 kg at 0.6 m/s. After: 0.4 kg at what speed gives the same mass × speed?' },
      ] },
      { ask: 'Momentum stayed the same. Did kinetic energy?', answers: [
        { label: 'No, half of it was lost to sound and heat', right: true, reply: 'Right. ½mv² was 0.036 J before and 0.018 J after. Squashing the velcro turned the rest into heat and a thud. Momentum is always kept; kinetic energy only in a perfectly springy hit.' },
        { label: 'Yes, energy is always conserved', reply: 'Total energy is, but not all of it stays as motion. Work out ½mv² before and after.' },
        { label: 'I’m not sure', reply: 'Look at the kinetic energy reading before and after the hit.' },
      ] },
    ],
  },
]
