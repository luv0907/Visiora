/**
 * VISIORA — guided ideas for Projectile motion: predict, then throw, then explain why.
 * Each verdict comes from throwing in engine/flight.js, never from a stored answer.
 */
import { rangeOf, simulateFlight } from './flight'

const NO_AIR = { g: 9.81, rho: 0 }
const AIR = { g: 9.81, rho: 1.225 }

/** Which of the given angles throws furthest. */
const furthest = (kind, u, angles, world) => {
  const r = angles.map(theta => [theta, rangeOf(kind, { u, theta }, world)])
  return String(r.sort((a, b) => b[1] - a[1])[0][0])
}

export const FLIGHT_LESSONS = [
  {
    id: 'best-angle',
    title: 'The best angle',
    world: NO_AIR, air: false,
    question: 'With no air, which angle throws the ball the furthest?',
    note: 'Same ball, same speed (12 m/s), level ground. Only the angle changes.',
    shots: [30, 45, 60].map(theta => ({ kind: 'cricket', u: 12, theta, h: 0 })),
    options: [{ id: '30', label: '30°' }, { id: '45', label: '45°' }, { id: '60', label: '60°' }],
    outcome: () => furthest('cricket', 12, [30, 45, 60], NO_AIR),
    told: { 30: '30° went furthest.', 45: '45° went furthest. And look: 30° and 60° land in the same place.', 60: '60° went furthest.' },
    explain: [
      { ask: 'Why is 45° the best?', answers: [
        { label: 'It splits the speed evenly between up and along', right: true, reply: 'Yes. Upward speed keeps it in the air longer; sideways speed carries it along. Range depends on both multiplied together, and that is biggest when they are equal: 45°.' },
        { label: 'Because it is halfway', reply: 'Halfway between 0° and 90° is true, but why should that matter? Think about what the up part and the along part each do.' },
        { label: 'I’m not sure', reply: 'At 80° it stays up a long time but hardly moves along. At 10° it moves along fast but lands at once. What would balance them?' },
      ] },
      { ask: 'Why did 30° and 60° land in the same place?', answers: [
        { label: 'They add up to 90°', right: true, reply: 'Right. One trades height for speed along, the other the reverse, and they come out even. Any pair adding to 90° does it: 20° and 70°, 10° and 80°.' },
        { label: 'By chance', reply: 'Try 20° and 70° in Free play. Is it still a coincidence?' },
        { label: 'I’m not sure', reply: 'Add the two angles. What do you get?' },
      ] },
    ],
  },
  {
    id: 'air-angle',
    title: 'With air',
    world: AIR, air: true,
    question: 'Now with air, a light table tennis ball at 15 m/s. Which angle throws it furthest?',
    note: 'Air pushes back on the ball all the way.',
    shots: [30, 45, 60].map(theta => ({ kind: 'pingpong', u: 15, theta, h: 0 })),
    options: [{ id: '30', label: '30°' }, { id: '45', label: '45°' }, { id: '60', label: '60°' }],
    outcome: () => furthest('pingpong', 15, [30, 45, 60], AIR),
    told: { 30: '30° went furthest: lower is better when air slows the ball.', 45: '45° went furthest.', 60: '60° went furthest.' },
    explain: [
      { ask: 'Why does a lower angle win when there is air?', answers: [
        { label: 'A high throw spends longer being slowed by the air', right: true, reply: 'Yes. Drag acts the whole time the ball is flying. A high, long flight gives the air more time to steal its speed, so a flatter, quicker throw gets further.' },
        { label: 'Air pushes the ball down', reply: 'Air pushes against the motion, backwards along the path, not straight down. When does that hurt most?' },
        { label: 'I’m not sure', reply: 'Compare how long each throw stays in the air. Which one is slowed for longest?' },
      ] },
      { ask: 'Would a heavy shot put care as much about the air?', answers: [
        { label: 'No, hardly at all', right: true, reply: 'Right. Its weight is huge compared with the drag on it, so it flies almost as if there were no air. Athletes throw it at a little under 45° for other reasons.' },
        { label: 'Yes, even more', reply: 'Drag depends on size and speed, not weight. Compared with its weight, is the drag on a shot put big or small?' },
        { label: 'I’m not sure', reply: 'Try it in Free play: throw a shot put with air on and off.' },
      ] },
    ],
  },
  {
    id: 'drop-throw',
    title: 'Drop or throw',
    world: NO_AIR, air: false,
    question: 'From a 5 m wall, one ball is dropped and another thrown sideways at the same moment. Which lands first?',
    note: 'The thrown one leaves at 8 m/s, straight sideways.',
    shots: [{ kind: 'cricket', u: 0, theta: 0, h: 5 }, { kind: 'cricket', u: 8, theta: 0, h: 5 }],
    options: [{ id: 'drop', label: 'The dropped one' }, { id: 'throw', label: 'The thrown one' }, { id: 'together', label: 'They land together' }],
    outcome: () => {
      const a = simulateFlight('cricket', { u: 0, theta: 0, h: 5 }, NO_AIR, { untilLanded: true }).landed.t
      const b = simulateFlight('cricket', { u: 8, theta: 0, h: 5 }, NO_AIR, { untilLanded: true }).landed.t
      return Math.abs(a - b) < 0.02 ? 'together' : a < b ? 'drop' : 'throw'
    },
    told: { drop: 'The dropped one landed first.', throw: 'The thrown one landed first.', together: 'They landed together: the thrown one just landed further away.' },
    explain: [
      { ask: 'Why do they land together?', answers: [
        { label: 'Going sideways doesn’t change how fast it falls', right: true, reply: 'Exactly. The up-down motion and the sideways motion are independent. Gravity pulls both down the same way, so the falling part is identical.' },
        { label: 'The thrown one is faster, so it should land first', reply: 'It is faster sideways. Does sideways speed help it get down to the ground?' },
        { label: 'I’m not sure', reply: 'Look at the strobe dots: at each moment, are the two balls at the same height?' },
      ] },
      { ask: 'A bullet fired flat from a gun, and one dropped beside it: which lands first?', answers: [
        { label: 'Together (ignoring air)', right: true, reply: 'Yes, in a vacuum they would hit the ground together, the fired one perhaps a kilometre away.' },
        { label: 'The fired one, much later', reply: 'How fast does it fall, compared with the dropped one?' },
        { label: 'I’m not sure', reply: 'It is the same question as the balls, just with a much bigger sideways speed.' },
      ] },
    ],
  },
]
