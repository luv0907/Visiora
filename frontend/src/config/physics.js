/**
 * VISIORA — Physics Configuration
 * Single source of truth for all physics constants, variable limits,
 * scene defaults, and feature flags. Never scatter magic numbers in scene files.
 */

// ── PHYSICS CONSTANTS ────────────────────────────────────────────
export const PHYSICS_CONSTANTS = {
  G_EARTH:   9.81,
  G_MOON:    1.62,
  G_MARS:    3.72,
  G_JUPITER: 24.79,
  PI: Math.PI,
}

export const GRAVITY_PRESETS = [
  { label: 'Earth',   value: 9.81,  color: '#3B82F6' },
  { label: 'Moon',    value: 1.62,  color: '#94A3B8' },
  { label: 'Mars',    value: 3.72,  color: '#EF4444' },
  { label: 'Jupiter', value: 24.79, color: '#F59E0B' },
]

// Buoyancy material presets
export const MATERIAL_PRESETS = [
  { label: 'Wood',      density: 500,   color: '#C4A35A' },
  { label: 'Ice',       density: 917,   color: '#B3D9F7' },
  { label: 'Plastic',   density: 1050,  color: '#F4C7FF' },
  { label: 'Rock',      density: 2650,  color: '#9B8E82' },
  { label: 'Steel',     density: 7800,  color: '#8DA3B0' },
  { label: 'Styrofoam', density: 50,    color: '#FAFAFA' },
]

// Fluid presets for buoyancy
export const FLUID_PRESETS = [
  { label: 'Water',     density: 1000, color: 'rgba(64,164,223,0.55)' },
  { label: 'Oil',       density: 850,  color: 'rgba(220,180,50,0.55)' },
  { label: 'Honey',     density: 1400, color: 'rgba(180,120,20,0.65)' },
  { label: 'Saltwater', density: 1025, color: 'rgba(64,180,200,0.55)' },
  { label: 'Mercury',   density: 13600, color: 'rgba(160,160,185,0.75)' },
]

// Sound wave medium presets
export const MEDIUM_PRESETS = [
  { label: 'Air',   speed: 343,  color: '#E8F4FD' },
  { label: 'Water', speed: 1480, color: '#B3D9F7' },
  { label: 'Steel', speed: 5960, color: '#C0C0C0' },
]

// ── VARIABLE CONSTRAINTS ─────────────────────────────────────────
export const VARIABLE_LIMITS = {
  height:          { min: 0,    max: 200,   step: 0.5,  unit: 'm' },
  mass:            { min: 0.01, max: 1000,  step: 0.01, unit: 'kg' },
  mass1:           { min: 0.01, max: 1000,  step: 0.01, unit: 'kg' },
  mass2:           { min: 0.01, max: 1000,  step: 0.01, unit: 'kg' },
  gravity:         { min: 0.1,  max: 30,    step: 0.01, unit: 'm/s²' },
  velocity:        { min: 0,    max: 200,   step: 0.5,  unit: 'm/s' },
  velocity1:       { min: -100, max: 100,   step: 0.5,  unit: 'm/s' },
  velocity2:       { min: -100, max: 100,   step: 0.5,  unit: 'm/s' },
  angle:           { min: 1,    max: 179,   step: 0.5,  unit: '°' },
  angle_proj:      { min: 0,    max: 90,    step: 0.5,  unit: '°' },
  length:          { min: 0.1,  max: 5.0,   step: 0.05, unit: 'm' },
  damping:         { min: 0,    max: 0.5,   step: 0.01, unit: '' },
  angularVelocity: { min: 0.1,  max: 20,    step: 0.1,  unit: 'rad/s' },
  armRadius:       { min: 0.1,  max: 3,     step: 0.1,  unit: 'm' },
  restitution:     { min: 0,    max: 1,     step: 0.05, unit: '' },
  amplitude:       { min: 0.1,  max: 5,     step: 0.1,  unit: 'm' },
  frequency:       { min: 0.5,  max: 20,    step: 0.5,  unit: 'Hz' },
  waveSpeed:       { min: 100,  max: 600,   step: 10,   unit: 'm/s' },
  objectDensity:   { min: 50,   max: 14000, step: 10,   unit: 'kg/m³' },
  fluidDensity:    { min: 500,  max: 14000, step: 10,   unit: 'kg/m³' },
  objectVolume:    { min: 0.01, max: 1.0,   step: 0.01, unit: 'm³' },
  appliedForce:    { min: -20,  max: 20,    step: 0.5,  unit: 'N' },
  dragCoeff:       { min: 0.1,  max: 1.0,   step: 0.05, unit: '' },
}

// ── SCENE VARIABLE DEFINITIONS ───────────────────────────────────
export const SCENE_VARIABLES = {
  gravity: [
    { name: 'height',  label: 'Drop Height',  ...VARIABLE_LIMITS.height,  default: 20 },
    { name: 'mass1',   label: 'Ball 1 Mass',  ...VARIABLE_LIMITS.mass1,   default: 1 },
    { name: 'mass2',   label: 'Ball 2 Mass',  ...VARIABLE_LIMITS.mass2,   default: 50 },
    { name: 'gravity', label: 'Gravity',      ...VARIABLE_LIMITS.gravity, default: 9.81 },
  ],
  projectile: [
    { name: 'velocity',   label: 'Launch Speed',  ...VARIABLE_LIMITS.velocity,   default: 20 },
    { name: 'angle',      label: 'Launch Angle',  ...VARIABLE_LIMITS.angle_proj, default: 45 },
    { name: 'height',     label: 'Cliff Height',  ...VARIABLE_LIMITS.height,     default: 20, max: 100 },
    { name: 'gravity',    label: 'Gravity',       ...VARIABLE_LIMITS.gravity,    default: 9.81 },
    { name: 'mass1',      label: 'Projectile Mass',...VARIABLE_LIMITS.mass1,     default: 1 },
    { name: 'dragCoeff',  label: 'Drag Coeff (Cᴅ)',...VARIABLE_LIMITS.dragCoeff, default: 0.47 },
  ],
  pendulum: [
    { name: 'length',  label: 'Length (L)',      ...VARIABLE_LIMITS.length,  default: 1.5 },
    { name: 'mass1',   label: 'Bob Mass (m)',    ...VARIABLE_LIMITS.mass1,   default: 1.0 },
    { name: 'angle',   label: 'Initial Angle',  ...VARIABLE_LIMITS.angle,   default: 30 },
    { name: 'gravity', label: 'Gravity (g)',     ...VARIABLE_LIMITS.gravity, default: 9.81 },
    { name: 'damping', label: 'Damping (b)',     ...VARIABLE_LIMITS.damping, default: 0 },
  ],
  collision: [
    { name: 'mass1',       label: 'Ball 1 Mass',    ...VARIABLE_LIMITS.mass1,       default: 2 },
    { name: 'mass2',       label: 'Ball 2 Mass',    ...VARIABLE_LIMITS.mass2,       default: 1 },
    { name: 'velocity1',   label: 'Ball 1 Velocity',...VARIABLE_LIMITS.velocity1,   default: 5 },
    { name: 'velocity2',   label: 'Ball 2 Velocity',...VARIABLE_LIMITS.velocity2,   default: -2 },
    { name: 'restitution', label: 'Elasticity (e)', ...VARIABLE_LIMITS.restitution, default: 1 },
  ],
  angular: [
    { name: 'angularVelocity', label: 'Angular Speed', ...VARIABLE_LIMITS.angularVelocity, default: 3 },
    { name: 'armRadius',       label: 'Arm Radius',    ...VARIABLE_LIMITS.armRadius,       default: 1.5 },
    { name: 'mass1',           label: 'Body Mass',     ...VARIABLE_LIMITS.mass1,            default: 60 },
  ],
  wave: [
    { name: 'amplitude', label: 'Amplitude (A)', ...VARIABLE_LIMITS.amplitude, default: 2 },
    { name: 'frequency', label: 'Frequency (f)', ...VARIABLE_LIMITS.frequency, default: 2 },
    { name: 'waveSpeed', label: 'Wave Speed (v)',...VARIABLE_LIMITS.waveSpeed, default: 343 },
  ],
  buoyancy: [
    { name: 'objectDensity', label: 'Object Density (ρₒ)', ...VARIABLE_LIMITS.objectDensity, default: 500 },
    { name: 'fluidDensity',  label: 'Fluid Density (ρ_f)',  ...VARIABLE_LIMITS.fluidDensity,  default: 1000 },
    { name: 'objectVolume',  label: 'Object Volume (V)',    ...VARIABLE_LIMITS.objectVolume,  default: 0.1 },
    { name: 'gravity',       label: 'Gravity (g)',          ...VARIABLE_LIMITS.gravity,       default: 9.81 },
    { name: 'appliedForce',  label: 'Applied Force (F)',    ...VARIABLE_LIMITS.appliedForce,  default: 0 },
  ],
}

// ── SCENE METADATA ────────────────────────────────────────────────
export const SCENE_META = {
  gravity: {
    id: 'gravity',
    label: 'Free Fall',
    icon: 'gravity',
    badge: 'Galileo Principle',
    description: 'Observe that all objects fall at the exact same rate in vacuum regardless of mass.',
    color: '#B38B40',
    idlePrompt: 'Try changing the mass of Ball 1 vs Ball 2 — do they hit the ground at the same time?',
    formula: 'y(t) = h₀ - ½gt²',
    has3D: true,
    has2D: false,
  },
  projectile: {
    id: 'projectile',
    label: 'Projectile',
    icon: 'projectile',
    badge: '2D Kinematics',
    description: 'Independent horizontal and vertical vectors create true parabolic flight paths.',
    color: '#CBA358',
    idlePrompt: 'What launch angle achieves the maximum range? Try 45° with different speeds!',
    formula: 'R = (v₀² sin 2θ) / g',
    has3D: true,
    has2D: false,
  },
  pendulum: {
    id: 'pendulum',
    label: 'Pendulum',
    icon: 'pendulum',
    badge: 'Harmonic & Chaos',
    description: 'Simple and double physical pendulum systems showing harmonic oscillation and chaotic motion.',
    color: '#8A6D3B',
    idlePrompt: 'Notice that period depends only on length and gravity, independent of bob mass!',
    formula: 'T = 2π √(L / g)',
    has3D: true,
    has2D: false,
  },
  buoyancy: {
    id: 'buoyancy',
    label: 'Buoyancy',
    icon: 'buoyancy',
    badge: 'Archimedes Law',
    description: 'Archimedes principle: buoyant upward force equals the weight of displaced fluid.',
    color: '#0D9488',
    idlePrompt: 'Watch what happens when the object density exceeds fluid density — does it sink or float?',
    formula: 'F_b = ρ_f · V_sub · g',
    has3D: true,
    has2D: false,
  },
  collision: {
    id: 'collision',
    label: 'Collisions',
    icon: 'collision',
    badge: 'Momentum & Energy',
    description: 'Linear momentum conservation and kinetic energy exchange across elastic and inelastic impacts.',
    color: '#C23B30',
    idlePrompt: 'Try setting elasticity to 0 for a perfectly inelastic impact where bodies stick together!',
    formula: 'p₁ + p₂ = p₁\' + p₂\'',
    has3D: true,
    has2D: false,
  },
  ohmslaw: {
    id: 'ohmslaw',
    label: "Ohm's Law",
    icon: 'ohmslaw',
    badge: 'Unity 3D Lab',
    description: "Verify V = I·R with interactive 3D laboratory bench, analog meters, rheostat and V-I slope analysis.",
    color: '#002B66',
    idlePrompt: 'Adjust the rheostat slider to observe how current varies with resistance across the circuit.',
    formula: 'V = I · R',
    has3D: true,
    has2D: false,
    isVirtualLab: true,
  },
}

// ── FEATURE FLAGS ─────────────────────────────────────────────────
export const FEATURE_FLAGS = {
  VOICE_ENABLED:        true,
  PROACTIVE_TUTOR:      true,
  PROACTIVE_IDLE_MS:    30000,  // 30 seconds
  DARK_MODE:            false,
  LITE_MODE_AUTO:       true,
  KNOWLEDGE_GRAPH:      true,
  ANALYTICS:            true,
  AUTH_ENABLED:         true,
  SPLIT_VIEW:           true,
}

// ── SIMULATION DEFAULTS ───────────────────────────────────────────
export const SIM_DEFAULTS = {
  SPEED:            1.0,
  IDLE_THRESHOLD_MS: 8000,
  MAX_TRAIL_POINTS: 500,
  LITE_MAX_TRAIL:   100,
  CANVAS_FPS:       60,
  PHYSICS_DT:       1 / 120,  // Fixed physics timestep (120 Hz)
}

// ── API CONFIG ────────────────────────────────────────────────────
export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
  TIMEOUT_MS: 10000,
  RETRY_ATTEMPTS: 2,
  RETRY_DELAY_MS: 1000,
}
