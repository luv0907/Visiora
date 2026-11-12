/**
 * VISIORA Studio — every experiment on the home page, grouped by chapter.
 * `path` is where it opens; `simLab` picks the scene inside the shared /sim screen;
 * `redesigned` marks the ones already moved to the new experiment layout.
 */
export const CHAPTERS = [
  {
    id: 'motion', grade: 'Class 9', title: 'Motion', note: 'Speed, acceleration, falling and swinging',
    items: [
      { id: 'pendulum', name: 'Pendulum Lab', kind: '2D', art: 'pendulum', path: '/experiments/pendulum', redesigned: true,
        about: 'Find out what changes how long a swing takes: the string, the mass, or gravity.' },
      { id: 'motion', name: 'Speed & acceleration', kind: '2D', art: 'car', path: '/experiments/motion', redesigned: true,
        about: 'Drive a car and watch its distance–time and speed–time graphs draw live.' },
      { id: 'gravity', name: 'Falling on other planets', kind: '2D', art: 'planets', path: '/experiments/planets', redesigned: true,
        about: 'Drop a hammer and a feather on the Moon, Earth, Mars, Venus and Jupiter, then measure g on a mystery planet.' },
      { id: 'projectile', name: 'Projectile motion', kind: '2D', art: 'arc', path: '/experiments/projectile', redesigned: true,
        about: 'Find the angle that throws furthest, with and without air, then measure a launcher’s speed.' },
      { id: 'track', name: 'Motion track', kind: '3D', art: 'track', path: '/physics-lab?station=motion',
        about: 'Time a cart between two light gates, with and without acceleration.' },
    ],
  },
  {
    id: 'force', grade: 'Class 9', title: 'Force and laws of motion', note: 'Newton’s laws, friction and momentum',
    items: [
      { id: 'force', name: 'Push a box', kind: '2D', art: 'box', path: '/experiments/force', redesigned: true,
        about: 'Push boxes on ice, wood and carpet to see Newton’s laws, then measure friction with a spring balance.' },
      { id: 'ramp', name: 'Friction ramp', kind: '2D', art: 'ramp', path: '/experiments/ramp', redesigned: true,
        about: 'Tilt a ramp until a block slips, see why mass makes no difference, then measure μs and μk.' },
      { id: 'airtrack', name: 'Air track collisions', kind: '2D', art: 'carts', path: '/experiments/collisions', redesigned: true,
        about: 'Crash gliders together, springy or sticky, and prove momentum is conserved with light gates.' },
      { id: 'buoyancy', name: 'Floating and sinking', kind: '2D', art: 'float', path: '/experiments/buoyancy', redesigned: true,
        about: 'Float ice, steel and wood in water, oil, honey and mercury, then prove Archimedes’ principle.' },
    ],
  },
  {
    id: 'light-electricity', grade: 'Class 10', title: 'Light and electricity', note: 'Reflection, refraction, lenses and circuits',
    items: [
      { id: 'light', name: 'Bending light', kind: '2D', art: 'ray', path: '/experiments/light', redesigned: true,
        about: 'Trace rays through a glass slab and a prism with pins, then split white light and trap it inside glass.' },
      { id: 'optics', name: 'Lens and screen', kind: '3D', art: 'lens', path: '/physics-lab?station=optics',
        about: 'Move a lens and a screen until a sharp, upside-down image appears.' },
      { id: 'electricity', name: 'Circuits', kind: '2D', art: 'circuit', path: '/experiments/circuits', redesigned: true,
        about: 'Find Ohm’s law with real meter readings, then solve circuit puzzles on a breadboard.' },
    ],
  },
]

export const ALL_EXPERIMENTS = CHAPTERS.flatMap(c => c.items.map(it => ({ ...it, grade: c.grade, chapter: c.title })))
export const findExperiment = id => ALL_EXPERIMENTS.find(e => e.id === id) ?? null

// The last experiment opened, so the home page can offer to continue it.
const LAST_KEY = 'visiora.lastExperiment'
export function rememberExperiment(id) {
  try { localStorage.setItem(LAST_KEY, id) } catch { /* private mode: nothing to remember */ }
}
export function lastExperiment() {
  try { return findExperiment(localStorage.getItem(LAST_KEY)) } catch { return null }
}
