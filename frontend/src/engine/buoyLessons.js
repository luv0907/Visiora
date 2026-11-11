/**
 * VISIORA — guided ideas for Floating and sinking: predict, then let it go, then explain why.
 * Each verdict comes from letting the block settle in engine/buoy.js.
 */
import { settleBlock } from './buoy'

const under = s => Math.max(0, Math.min(s.L, -s.y)) / s.L

export const BUOY_LESSONS = [
  {
    id: 'ice',
    title: 'An ice cube',
    tank: [{ solid: 'ice', liquid: 'water' }],
    question: 'An ice cube floats in water. How much of it is under the surface?',
    note: 'Look only at the part below the waterline.',
    options: [{ id: 'tenth', label: 'About a tenth' }, { id: 'half', label: 'About half' }, { id: 'most', label: 'Nearly all of it' }],
    outcome: ([s]) => (under(s) > 0.75 ? 'most' : under(s) > 0.3 ? 'half' : 'tenth'),
    told: { most: 'Nearly all of it: about 92 % is under the water.', half: 'About half of it is under.', tenth: 'Only about a tenth is under.' },
    explain: [
      { ask: 'Why does so much of the ice sit under the water?', answers: [
        { label: 'Ice is only a little less dense than water', right: true, reply: 'Yes. Ice is 917 kg per m³, water 1000. It floats when the water it pushes aside weighs as much as the whole cube, and that takes 917 ÷ 1000 = 92 % of it under.' },
        { label: 'Ice is heavy', reply: 'Heavy things can float too: ships do. What matters is how its density compares with water’s.' },
        { label: 'I’m not sure', reply: 'A clue: a floating thing pushes aside its own weight of water. How much water weighs as much as the ice?' },
      ] },
      { ask: 'So what do sailors mean by “the tip of the iceberg”?', answers: [
        { label: 'Most of an iceberg is hidden under the sea', right: true, reply: 'Right, about nine tenths of it. The danger to ships is the part you cannot see.' },
        { label: 'The top of the iceberg is the biggest part', reply: 'Look at the cube again: is most of it above or below the waterline?' },
        { label: 'I’m not sure', reply: 'An iceberg is just a giant ice cube in (salty) water.' },
      ] },
    ],
  },
  {
    id: 'mercury',
    title: 'Steel in mercury',
    tank: [{ solid: 'steel', liquid: 'mercury' }],
    question: 'A steel cube is placed in liquid mercury. What will it do?',
    note: 'Steel sinks in water. Mercury is a metal that is liquid at room temperature.',
    options: [{ id: 'sink', label: 'Sink' }, { id: 'float', label: 'Float' }, { id: 'hover', label: 'Hover halfway' }],
    outcome: ([s]) => (s.onFloor ? 'sink' : under(s) < 1 ? 'float' : 'hover'),
    told: { float: 'It floated, a bit more than half under.', sink: 'It sank to the bottom.', hover: 'It hovered under the surface.' },
    explain: [
      { ask: 'Why does steel float on mercury?', answers: [
        { label: 'Mercury is denser than steel', right: true, reply: 'Yes. Mercury is 13 534 kg per m³, steel 7850. Floating is only about which is denser, so steel floats on mercury with 58 % under.' },
        { label: 'Mercury is a metal too', reply: 'Being a metal doesn’t decide it. Compare how much a litre of each weighs.' },
        { label: 'I’m not sure', reply: 'A litre of mercury weighs 13.5 kg; a litre of steel 7.85 kg. Which one wins?' },
      ] },
      { ask: 'Would a gold cube float on mercury?', answers: [
        { label: 'No, gold is denser still', right: true, reply: 'Right. Gold is 19 300 kg per m³, denser than mercury, so it sinks even there. Try it in Free play.' },
        { label: 'Yes, all metals float on mercury', reply: 'Only the ones less dense than mercury. Is gold less dense?' },
        { label: 'I’m not sure', reply: 'Gold weighs 19.3 kg per litre. Compare that with mercury.' },
      ] },
    ],
  },
  {
    id: 'oil',
    title: 'Wood in oil',
    tank: [{ solid: 'wood', liquid: 'water' }, { solid: 'wood', liquid: 'oil' }],
    question: 'The same wooden block, in water and in cooking oil. In the oil, will it ride higher or lower?',
    note: 'The left tank has water, the right tank cooking oil.',
    options: [{ id: 'higher', label: 'Higher' }, { id: 'lower', label: 'Lower' }, { id: 'same', label: 'The same' }],
    outcome: ([w, o]) => (under(o) > under(w) + 0.01 ? 'lower' : under(o) < under(w) - 0.01 ? 'higher' : 'same'),
    told: { lower: 'Lower: more of it is under in the oil (54 %) than in water (50 %).', higher: 'Higher in the oil.', same: 'The same in both.' },
    explain: [
      { ask: 'Why does it sink deeper into the oil?', answers: [
        { label: 'Oil is less dense, so it must push more aside to hold the block up', right: true, reply: 'Exactly. The block needs the same push in both. Oil weighs less per litre, so more of the block has to go under to push aside enough oil.' },
        { label: 'Oil is slippery', reply: 'Slipperiness doesn’t change how high it floats. What does each liquid weigh per litre?' },
        { label: 'I’m not sure', reply: 'Water is 1000 kg per m³, this oil 920. Which one pushes up harder for each bit that goes under?' },
      ] },
      { ask: 'Ships float higher in which: the salty sea or a freshwater river?', answers: [
        { label: 'The salty sea', right: true, reply: 'Yes. Seawater is denser, so a ship sits higher in it. Ships have load lines painted on them for exactly this reason.' },
        { label: 'The river', reply: 'Salty water is denser than fresh. Does a denser liquid hold a ship higher or lower?' },
        { label: 'I’m not sure', reply: 'It is the same question as water and oil, just the other way round.' },
      ] },
    ],
  },
]

/** Let each tank in an idea settle: one result per tank. */
export const runTanks = lesson => lesson.tank.map(({ solid, liquid }) => settleBlock(solid, liquid))
