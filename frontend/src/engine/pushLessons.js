/**
 * VISIORA — guided ideas for Push a box: predict, then push, then explain why.
 * Each verdict comes from running the boxes in engine/forces.js, never from a stored answer.
 */
import { G, SURFACES, step } from './forces'

export const surface = id => SURFACES.find(s => s.id === id)

/** Push each lane's box with a steady force for T seconds; returns their final { x, v }. */
export function runLanes(lanes, T) {
  return lanes.map(l => {
    let st = { t: 0, x: 0, v: l.v0 ?? 0 }
    for (let t = 0; t < T - 1e-9; t += 0.01) st = step(st, 0.01, l.F, l.m, surface(l.surface)).state
    return st
  })
}

export const PUSH_LESSONS = [
  {
    id: 'grip',
    title: 'A small push',
    T: 3,
    lanes: [{ m: 10, surface: 'carpet', F: 50 }],
    question: 'You push a 10 kg box on carpet with 50 N. Does it move?',
    note: '50 N is about the push you need to lift a 5 kg bag.',
    options: [{ id: 'no', label: 'No, it stays put' }, { id: 'slow', label: 'Yes, slowly' }, { id: 'fast', label: 'Yes, it speeds up' }],
    outcome: L => { const [b] = runLanes(L.lanes, L.T); return b.x < 0.001 ? 'no' : b.v < 0.5 ? 'slow' : 'fast' },
    told: { no: 'It did not move at all.', slow: 'It crept along.', fast: 'It sped up.' },
    explain: [
      { ask: 'You pushed with 50 N. Why didn’t it move?', answers: [
        { label: 'Friction pushed back with 50 N too', right: true, reply: 'Yes. Friction matched your push exactly, so the net force was zero and nothing changed. That is Newton’s first law: no net force, no change in motion.' },
        { label: 'The box is too heavy to move', reply: 'Push harder and it will move, so its weight alone isn’t the reason. What was pushing back on it?' },
        { label: 'I’m not sure', reply: 'Look at the red arrow. How big was it compared with your push?' },
      ] },
      { ask: 'What if you push with 70 N?', answers: [
        { label: 'Friction grows to 70 N, and it still stays put', right: true, reply: 'Right. Gripping friction grows to match the push, up to a limit: μs × weight = 0.8 × 98 N ≈ 78 N on carpet. Only a push bigger than that gets it going.' },
        { label: 'It moves, because 70 is more than 50', reply: 'Friction did not stay at 50 N; it matched you. Is there a limit to how hard it can grip?' },
        { label: 'I’m not sure', reply: 'Try it in Free play: raise the push slowly and watch the red arrow.' },
      ] },
    ],
  },
  {
    id: 'steady',
    title: 'Balanced forces',
    T: 3,
    lanes: [{ m: 10, surface: 'wood', F: 24.5, v0: 1 }],
    question: 'A 10 kg box is already sliding at 1 m/s on wood. You push it with exactly as much force as friction: 24.5 N. What happens to its speed?',
    note: 'Sliding friction on wood: 0.25 × 10 kg × 9.8 = 24.5 N.',
    options: [{ id: 'faster', label: 'It speeds up' }, { id: 'steady', label: 'It stays at 1 m/s' }, { id: 'slower', label: 'It slows to a stop' }],
    outcome: L => { const [b] = runLanes(L.lanes, L.T); return b.v > 1.02 ? 'faster' : b.v < 0.98 ? 'slower' : 'steady' },
    told: { faster: 'It sped up.', steady: 'It kept sliding at exactly 1 m/s.', slower: 'It slowed down.' },
    explain: [
      { ask: 'There is a push on it. Why doesn’t it speed up?', answers: [
        { label: 'The push and friction cancel, so the net force is zero', right: true, reply: 'Exactly. With no net force its motion doesn’t change, so it keeps going at the same speed. Balanced forces mean no change, not no motion.' },
        { label: 'Pushes only keep things moving, they never speed them up', reply: 'Push with 40 N and it does speed up. What matters is the push compared with friction.' },
        { label: 'I’m not sure', reply: 'Add the arrows: 24.5 N forward, 24.5 N back. What is left over?' },
      ] },
      { ask: 'Now you let go. What happens?', answers: [
        { label: 'Friction alone slows it, and it stops', right: true, reply: 'Right. Only friction is left, 24.5 N backwards, so it slows by 2.45 m/s every second and stops in about 0.4 s.' },
        { label: 'It keeps going forever', reply: 'That only happens with no friction at all. Here something is still pushing back.' },
        { label: 'I’m not sure', reply: 'With no push, which arrow is left?' },
      ] },
    ],
  },
  {
    id: 'mass',
    title: 'Heavier box',
    T: 2,
    lanes: [{ m: 5, surface: 'none', F: 20 }, { m: 10, surface: 'none', F: 20 }],
    question: 'On a very smooth floor (no friction), the same 20 N push acts on a 5 kg box and a 10 kg box for 2 s. How fast is the 10 kg box going compared with the 5 kg one?',
    note: 'Same push, same time. Only the mass is different.',
    options: [{ id: 'same', label: 'Just as fast' }, { id: 'half', label: 'Half as fast' }, { id: 'quarter', label: 'A quarter as fast' }],
    outcome: L => { const [a, b] = runLanes(L.lanes, L.T); const r = b.v / a.v; return Math.abs(r - 1) < 0.05 ? 'same' : Math.abs(r - 0.5) < 0.05 ? 'half' : 'quarter' },
    told: { same: 'They went just as fast.', half: 'The 10 kg box went half as fast: 4 m/s against 8 m/s.', quarter: 'It went a quarter as fast.' },
    explain: [
      { ask: 'Why does twice the mass give half the speed?', answers: [
        { label: 'a = F ÷ m: twice the mass, half the acceleration', right: true, reply: 'Yes, Newton’s second law. 20 N ÷ 5 kg = 4 m/s², but 20 N ÷ 10 kg = 2 m/s². After 2 s that is 8 m/s against 4 m/s.' },
        { label: 'The heavy one has more friction', reply: 'There is no friction on this floor. What else is different about the heavy box?' },
        { label: 'I’m not sure', reply: 'Mass is how hard something is to speed up. If it is twice as hard, how much speed does the same push give?' },
      ] },
      { ask: 'How could you make the 10 kg box keep up?', answers: [
        { label: 'Push it twice as hard, with 40 N', right: true, reply: 'Right. 40 N ÷ 10 kg = 4 m/s², the same as the small box. Force per kilogram is what sets the acceleration.' },
        { label: 'Push it for longer', reply: 'It would catch up in speed eventually, but it would still be accelerating more slowly. How would you give it the same acceleration?' },
        { label: 'I’m not sure', reply: 'a = F ÷ m. With m doubled, what must F be to keep a the same?' },
      ] },
    ],
  },
]

export { G }
