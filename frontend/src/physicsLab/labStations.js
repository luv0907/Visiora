/**
 * VISIORA — the experiments in the walk-in lab, and where the camera stands for each.
 *
 * Positions come from the Stations collection in blender/physics_lab_hall.blend, in browser
 * coordinates (x, up, z = −Blender y). Phones get their own camera spots: a narrow screen
 * has to stand further back to fit a long bench.
 *
 * Adding an experiment means adding an entry here and a bench in LabBenches.jsx. `tap` is the
 * area of the apparatus that starts it when tapped.
 */

export const LAB_ENTRANCE = { pos: [-14.2, 1.7, 0.2], look: [-6, 1.6, 0] }

export const LAB_OVERVIEW = {
  desktop: { pos: [-11.5, 4.4, 5.6], look: [6, 1.2, -0.6] },
  mobile: { pos: [-11.5, 4.6, 0.6], look: [6, 1.2, 0] },
}

export const STATIONS = [
  {
    id: 'motion', name: 'Motion track', topic: 'Speed and acceleration', grade: 'Class 9',
    about: 'A cart runs along a track past light gates that time it. Push it, change its acceleration and time it between the gates.',
    pin: [-1.3, 1.6, 7.25],
    tap: { position: [-1.3, 1.1, 7.25], size: [2.8, 0.5, 0.5] },
    desktop: { pos: [-1.3, 1.65, 5.4], look: [-1.3, 1.05, 7.25] },
    mobile: { pos: [-1.3, 1.8, 4.7], look: [-1.3, 1.05, 7.25] },
  },
  {
    id: 'friction', name: 'Friction ramp', topic: 'Forces and friction', grade: 'Class 9',
    about: 'A block on a ramp with three different strips. Find out which surfaces hold it still, and which let it slide.',
    pin: [1.8, 1.75, 1.55],
    tap: { position: [1.8, 1.2, 1.55], size: [1.7, 0.7, 0.6] },
    desktop: { pos: [1.8, 2.25, 3.2], look: [1.8, 1.1, 1.5] },
    mobile: { pos: [1.8, 2.3, 3.4], look: [1.8, 1.1, 1.5] },
  },
  {
    id: 'collisions', name: 'Air track', topic: 'Collisions and momentum', grade: 'Class 9',
    about: 'Two gliders float on a cushion of air, with almost no friction. Crash them together and compare the momentum before and after.',
    pin: [-7, 1.7, 1.2],
    tap: { position: [-7, 1.2, 1.2], size: [2.6, 0.5, 0.5] },
    desktop: { pos: [-7, 1.75, 3.2], look: [-7, 1.15, 1.2] },
    mobile: { pos: [-7, 1.95, 3.6], look: [-7, 1.15, 1.2] },
  },
  {
    id: 'pendulum', name: 'Pendulums', topic: 'Swing time and length', grade: 'Class 9',
    about: 'Three bobs hang from the roof on different strings. Find out what changes how long a swing takes, and what makes no difference.',
    pin: [-2, 3.5, 0],
    tap: { position: [-2, 2.8, 0], size: [2.2, 1.6, 0.5] },
    desktop: { pos: [-2, 2.7, 3.6], look: [-2, 2.6, 0] },
    mobile: { pos: [-2, 2.7, 4.2], look: [-2, 2.6, 0] },
  },
  {
    id: 'freefall', name: 'Free Fall Tower', topic: 'Gravity and air', grade: 'Class 9', inRoom: true,
    about: 'A steel ball and a feather in two tall tubes. Pump the air out and see what happens.',
    pin: [18.9, 7.4, -2],
  },
  {
    id: 'optics', name: 'Optics bench', topic: 'Lenses and images', grade: 'Class 10',
    about: 'A lamp, a lens and a screen on a rail. Move the lens and the screen until a sharp image appears.',
    pin: [9.6, 1.8, 1.07],
    desktop: { pos: [7.9, 1.85, 3.7], look: [9.5, 1.1, 1.1] },
    mobile: { pos: [8.1, 1.9, 3.7], look: [9.6, 1.1, 1.1] },
  },
  {
    id: 'ohm', name: 'Ohm’s law bench', topic: 'Current and voltage', grade: 'Class 10',
    about: 'A power supply, a rheostat, meters and bulbs. Change the voltage and resistance, and watch the needles and bulbs respond.',
    pin: [-0.46, 1.6, -7.4],
    desktop: { pos: [-0.46, 1.5, -5.5], look: [-0.46, 1.03, -7.4] },
    mobile: { pos: [-0.46, 1.6, -4.4], look: [-0.46, 1.03, -7.4] },
  },
]

export const findStation = id => STATIONS.find(s => s.id === id) ?? null
