/**
 * VISIORA — guided ideas for the Friction ramp: predict, then tilt, then explain why.
 * Each verdict comes from running the ramp in engine/ramp.js, never from a stored answer.
 * A lesson's `program(t, block, i)` says what angle the ramp is at, moment by moment.
 */
import { makeBlock, stepBlock } from './ramp'

/** Run a lesson's blocks with its program for T seconds; returns the blocks. */
export function runRamps(lesson, T = lesson.T) {
  const blocks = lesson.blocks.map(spec => makeBlock(spec.kind, spec))
  for (let t = 0; t < T - 1e-9; t += 0.01) blocks.forEach((b, i) => { b.angle = lesson.program(t, b, i); stepBlock(b, 0.01) })
  return blocks
}

/** Tilt up at 3°/s from `from`; after the slip, do whatever `after` says. */
const tilt = (from, after) => (t, b) => (b.slipAngle == null ? Math.min(45, from + 3 * t) : after(b))

export const RAMP_LESSONS = [
  {
    id: 'mass',
    title: 'Heavy or light',
    T: 6,
    blocks: [{ kind: 'wood', m: 0.1 }, { kind: 'wood', m: 1 }],
    program: tilt(14, b => b.slipAngle),
    question: 'Two wooden blocks on two ramps tilting up together. One is 0.1 kg, the other ten times heavier. Which slips first?',
    note: 'Both ramps rise at 3° a second.',
    options: [{ id: 'light', label: 'The light one' }, { id: 'heavy', label: 'The heavy one' }, { id: 'together', label: 'They slip together' }],
    outcome: L => { const [a, b] = runRamps(L); return Math.abs(a.slipAngle - b.slipAngle) < 0.3 ? 'together' : a.slipAngle < b.slipAngle ? 'light' : 'heavy' },
    told: { light: 'The light one slipped first.', heavy: 'The heavy one slipped first.', together: 'They slipped at exactly the same angle, about 24°.' },
    explain: [
      { ask: 'The heavy block is pulled down the slope ten times harder. Why doesn’t it slip first?', answers: [
        { label: 'It also presses on the ramp ten times harder, so friction can grip ten times harder', right: true, reply: 'Yes. Both the pull down the slope and the grip grow with the weight, so the mass cancels out. Only the angle and the surfaces decide when it slips.' },
        { label: 'Heavy things have less friction', reply: 'The heavy block has more friction, not less. Is it more in the same proportion as the pull?' },
        { label: 'I’m not sure', reply: 'Pull down the slope: m g sin θ. Grip: μs m g cos θ. What happens to m when you compare them?' },
      ] },
      { ask: 'So what decides the slipping angle?', answers: [
        { label: 'Only the two surfaces: tan θ = μs', right: true, reply: 'Right. It slips when tan θ passes μs. For wood on wood μs = 0.45, and tan 24° = 0.45. That is how you can measure μs with nothing but a protractor.' },
        { label: 'How hard you tilt it', reply: 'A slower tilt just takes longer to get there. Try it in Free play: it slips at the same angle.' },
        { label: 'I’m not sure', reply: 'Try a rubber block in Free play, then an ice block. What changes the angle?' },
      ] },
    ],
  },
  {
    id: 'keep',
    title: 'Lower it again',
    T: 3,
    blocks: [{ kind: 'wood', m: 0.5 }],
    program: tilt(18, () => 20),
    question: 'You tilt the ramp until the block slips (at about 24°), then quickly lower it to 20°, where it held still before. What does the block do?',
    note: 'At 20° the block sat still on the way up.',
    options: [{ id: 'stops', label: 'It stops' }, { id: 'keeps', label: 'It keeps sliding' }, { id: 'back', label: 'It slides back up' }],
    outcome: L => { const [b] = runRamps(L); return b.atBottom || b.sliding ? 'keeps' : 'stops' },
    told: { stops: 'It stopped.', keeps: 'It kept sliding, and even sped up.', back: 'It slid back up.' },
    explain: [
      { ask: 'At 20° it held still before. Why doesn’t it stop now?', answers: [
        { label: 'Sliding friction is weaker than gripping friction', right: true, reply: 'Yes. Once it slides, friction drops from μs = 0.45 to μk = 0.32. At 20°, tan θ = 0.36: too steep for sliding friction to stop it, though gripping friction could hold it.' },
        { label: 'It has too much speed to stop', reply: 'It is still speeding up at 20°, even starting slowly. Compare the pull down the slope with the sliding friction.' },
        { label: 'I’m not sure', reply: 'Watch the pink friction arrow when it slips. Does it get shorter?' },
      ] },
      { ask: 'Where else do you see this?', answers: [
        { label: 'A heavy cupboard is hard to start pushing, then easier to keep going', right: true, reply: 'Exactly the same thing. Starting it takes μs, keeping it going only μk.' },
        { label: 'A ball rolls further on grass than on a road', reply: 'That is about rolling and how soft the ground is. Think of sliding something heavy across a floor.' },
        { label: 'I’m not sure', reply: 'Think of pushing a heavy box. When is it hardest?' },
      ] },
    ],
  },
  {
    id: 'nudge',
    title: 'A gentle nudge',
    T: 3,
    blocks: [{ kind: 'wood', m: 0.5, v0: 0.6 }],
    program: () => 15,
    question: 'The ramp is at 15°, gentler still. You give the block a flick so it starts sliding down at 0.6 m/s. What happens?',
    note: 'tan 15° = 0.27, less than both μs = 0.45 and μk = 0.32 for wood on wood.',
    options: [{ id: 'faster', label: 'It speeds up' }, { id: 'steady', label: 'It slides at a steady speed' }, { id: 'stops', label: 'It slows down and stops' }],
    outcome: L => { const [b] = runRamps(L); return b.atBottom ? 'faster' : b.v === 0 ? 'stops' : 'steady' },
    told: { faster: 'It sped up.', steady: 'It slid at a steady speed.', stops: 'It slowed down and stopped after a few centimetres.' },
    explain: [
      { ask: 'Why does it stop?', answers: [
        { label: 'Sliding friction is bigger than the pull down this gentle slope', right: true, reply: 'Yes. Below the angle where tan θ = μk (about 18° here), friction wins even while sliding, so the net force points up the slope and it slows to a stop.' },
        { label: 'It runs out of push', reply: 'Nothing keeps pushing it after the flick, but gravity still pulls it down the slope. What is pulling harder?' },
        { label: 'I’m not sure', reply: 'Compare tan 15° = 0.27 with μk = 0.32. Which is bigger?' },
      ] },
      { ask: 'At what angle would a flicked block slide at a steady speed?', answers: [
        { label: 'Where tan θ = μk, about 18°', right: true, reply: 'Right. There the pull down the slope exactly balances sliding friction, so the net force is zero and the speed stays the same: Newton’s first law again.' },
        { label: 'At 24°, where it slips', reply: 'At 24° a still block starts to slip, and a sliding one speeds up. Which friction matters for a block that is already moving?' },
        { label: 'I’m not sure', reply: 'For a steady speed the net force must be zero. Which μ do you use for a moving block?' },
      ] },
    ],
  },
]
