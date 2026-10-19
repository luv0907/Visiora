/**
 * The interactive labs shown on Home, grouped by class.
 * `challenges` must match the number of challenges defined in each lab screen.
 */
export const LAB_GROUPS = [
  {
    id: 'class9',
    title: 'Class 9',
    labs: [
      { id: 'motion', image: '/images/concepts/motion.svg', path: '/motion', title: 'Motion Lab', topic: 'Speeding up & slowing down', chapter: 'Motion', icon: 'Gauge', color: '#D97706', challenges: 3 },
      { id: 'force', image: '/images/concepts/force.svg', path: '/force', title: 'Force Lab', topic: 'Push a box, friction, F = ma', chapter: 'Force and Laws of Motion', icon: 'Package', color: '#8A5A2B', challenges: 3 },
      { id: 'gravity', image: '/images/concepts/gravity.svg', path: '/gravity', title: 'Gravity Lab', topic: 'Falling & throwing on 4 planets', chapter: 'Gravitation', icon: 'Orbit', color: '#0D9488', challenges: 3 },
    ],
  },
  {
    id: 'class10',
    title: 'Class 10',
    labs: [
      { id: 'light', image: '/images/concepts/light.svg', path: '/light', title: 'Light Lab', topic: 'Reflection, refraction, total internal reflection', chapter: 'Light', icon: 'Flashlight', color: '#E11D48', challenges: 3 },
      { id: 'electricity', image: '/images/concepts/electricity.svg', path: '/electricity', title: 'Electricity Lab', topic: 'Ohm’s law, series & parallel circuits', chapter: 'Electricity', icon: 'Zap', color: '#4F46E5', challenges: 3 },
    ],
  },
  {
    id: 'tools',
    title: 'Tools',
    labs: [
      { id: 'board', image: '/images/concepts/board.svg', path: '/board', title: 'Graph Board', topic: 'Type any formula, see it plotted with sliders', chapter: 'Graphs & vectors', icon: 'LineChart', color: '#1251B8', challenges: 0 },
    ],
  },
]
