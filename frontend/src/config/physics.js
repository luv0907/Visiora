/**
 * VISIORA — Physics Configuration
 * Single source of truth for all physics constants, variable limits,
 * scene defaults, and feature flags. Never scatter magic numbers in scene files.
 */

// ── PHYSICS CONSTANTS ────────────────────────────────────────────
export const PHYSICS_CONSTANTS = {
  G_EARTH:   9.81,   // m/s²
  G_MOON:    1.62,
  G_MARS:    3.72,
  G_JUPITER: 24.79,
  G_CUSTOM:  9.81,   // user-defined placeholder
  PI: Math.PI,
}

export const GRAVITY_PRESETS = [
  { label: 'Earth',   value: 9.81,  emoji: '🌍' },
  { label: 'Moon',    value: 1.62,  emoji: '🌕' },
  { label: 'Mars',    value: 3.72,  emoji: '🔴' },
  { label: 'Jupiter', value: 24.79, emoji: '🟠' },
]

// ── VARIABLE CONSTRAINTS (also mirrored in backend validator) ────
export const VARIABLE_LIMITS = {
  height:    { min: 0,    max: 200,   step: 0.5,  unit: 'm' },
  mass:      { min: 0.01, max: 1000,  step: 0.01, unit: 'kg' },
  mass1:     { min: 0.01, max: 1000,  step: 0.01, unit: 'kg' },
  mass2:     { min: 0.01, max: 1000,  step: 0.01, unit: 'kg' },
  gravity:   { min: 0.1,  max: 30,    step: 0.01, unit: 'm/s²' },
  velocity:  { min: 0,    max: 200,   step: 0.5,  unit: 'm/s' },
  velocity1: { min: -100, max: 100,   step: 0.5,  unit: 'm/s' },
  velocity2: { min: -100, max: 100,   step: 0.5,  unit: 'm/s' },
  angle:     { min: 0,    max: 90,    step: 0.5,  unit: '°' },
  length:    { min: 0.1,  max: 20,    step: 0.1,  unit: 'm' },
  angularVelocity: { min: 0.1, max: 20, step: 0.1, unit: 'rad/s' },
  armRadius:       { min: 0.1, max: 3,  step: 0.1, unit: 'm' },
  restitution:     { min: 0,   max: 1,  step: 0.05, unit: '' },
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
    { name: 'velocity', label: 'Launch Speed',  ...VARIABLE_LIMITS.velocity, default: 20 },
    { name: 'angle',    label: 'Launch Angle',  ...VARIABLE_LIMITS.angle,    default: 45 },
    { name: 'height',   label: 'Launch Height (h₀)', ...VARIABLE_LIMITS.height,   default: 0, max: 50 },
    { name: 'gravity',  label: 'Gravity',       ...VARIABLE_LIMITS.gravity,  default: 9.81 },
  ],
  pendulum: [
    { name: 'length',  label: 'Pendulum Length', ...VARIABLE_LIMITS.length,  default: 2 },
    { name: 'mass1',   label: 'Bob Mass',        ...VARIABLE_LIMITS.mass1,   default: 1 },
    { name: 'angle',   label: 'Initial Angle',   ...VARIABLE_LIMITS.angle,   default: 30 },
    { name: 'gravity', label: 'Gravity',         ...VARIABLE_LIMITS.gravity, default: 9.81 },
  ],
  collision: [
    { name: 'mass1',       label: 'Ball 1 Mass',   ...VARIABLE_LIMITS.mass1,       default: 2 },
    { name: 'mass2',       label: 'Ball 2 Mass',   ...VARIABLE_LIMITS.mass2,       default: 1 },
    { name: 'velocity1',   label: 'Ball 1 Velocity',...VARIABLE_LIMITS.velocity1,  default: 5 },
    { name: 'velocity2',   label: 'Ball 2 Velocity',...VARIABLE_LIMITS.velocity2,  default: -2 },
    { name: 'restitution', label: 'Elasticity (e)', ...VARIABLE_LIMITS.restitution, default: 1 },
  ],
  angular: [
    { name: 'angularVelocity', label: 'Angular Speed', ...VARIABLE_LIMITS.angularVelocity, default: 3 },
    { name: 'armRadius',       label: 'Arm Radius',    ...VARIABLE_LIMITS.armRadius,       default: 1.5 },
    { name: 'mass1',           label: 'Body Mass',     ...VARIABLE_LIMITS.mass1,            default: 60 },
  ],
  wave: [
    { name: 'amplitude',   label: 'Amplitude (A)',      min: 0.1, max: 5,   step: 0.1, unit: 'm',     default: 2 },
    { name: 'springK',     label: 'Spring Constant (k)',min: 1,   max: 100, step: 1,   unit: 'N/m',   default: 10 },
    { name: 'massBlock',   label: 'Block Mass (m)',     min: 0.1, max: 20,  step: 0.1, unit: 'kg',    default: 1 },
  ],
}

// ── FEATURE FLAGS ─────────────────────────────────────────────────
export const FEATURE_FLAGS = {
  VOICE_ENABLED:        true,
  PROACTIVE_TUTOR:      true,
  DARK_MODE:            false,
  LITE_MODE_AUTO:       true,    // auto-detect low-end device
  KNOWLEDGE_GRAPH:      true,
  ANALYTICS:            true,
  AUTH_ENABLED:         true,
  SPLIT_VIEW:           true,
}

// ── SIMULATION DEFAULTS ───────────────────────────────────────────
export const SIM_DEFAULTS = {
  SPEED:            1.0,    // 1x real time
  IDLE_THRESHOLD_MS: 8000, // ms before proactive tutor fires
  MAX_TRAIL_POINTS: 500,
  LITE_MAX_TRAIL:   100,
}

// ── SCENE METADATA ────────────────────────────────────────────────
export const SCENE_META = {
  gravity: {
    id: 'gravity',
    label: 'Free Fall',
    icon: '🌍',
    description: 'Observe that all objects fall at the same rate regardless of mass.',
    color: '#243B53', // Deep Navy
  },
  projectile: {
    id: 'projectile',
    label: 'Projectile Motion',
    icon: '🎯',
    description: 'Horizontal and vertical motion are independent. Adjust launch parameters.',
    color: '#C07A1A', // Warm Terracotta/Warning
  },
  pendulum: {
    id: 'pendulum',
    label: 'Pendulum',
    icon: '🔮',
    description: 'Period depends only on length and gravity, not mass.',
    color: '#1A7A73', // Teal/Success
  },
  collision: {
    id: 'collision',
    label: 'Collisions',
    icon: '💥',
    description: 'Momentum is always conserved. Kinetic energy depends on elasticity.',
    color: '#C0392B', // Deep Red/Error
  },
  angular: {
    id: 'angular',
    label: 'Angular Momentum',
    icon: '🌀',
    description: 'Angular momentum is conserved when no external torque acts.',
    color: '#5D3E8C', // Indigo
  },
  wave: {
    id: 'wave',
    label: 'Wave / SHM',
    icon: '〰️',
    description: 'Spring-mass oscillator. Period depends only on spring constant and mass.',
    color: '#0E7490', // Cyan
  },
}

// ── API CONFIG ────────────────────────────────────────────────────
export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
  TIMEOUT_MS: 10000,
  RETRY_ATTEMPTS: 2,
  RETRY_DELAY_MS: 1000,
}
