/**
 * VISIORA — the planets every lab shares: surface gravity and the density of the air at the
 * surface. Values from the NASA Planetary Fact Sheets (nssdc.gsfc.nasa.gov/planetary/factsheet).
 * Jupiter has no surface: its numbers are at the 1-bar level, the top of the clouds.
 */
export const PLANETS = [
  { id: 'earth', label: 'Earth', g: 9.81, rho: 1.225, sky: ['#9CC9F0', '#E7F1FB'], ground: '#8A9A5B', air: 'air' },
  { id: 'moon', label: 'Moon', g: 1.62, rho: 0, sky: ['#05060A', '#1A1C24'], ground: '#9A9A9A', air: 'no air at all' },
  { id: 'mars', label: 'Mars', g: 3.71, rho: 0.020, sky: ['#C98A5E', '#EBC9A6'], ground: '#B4583A', air: 'very thin air' },
  { id: 'venus', label: 'Venus', g: 8.87, rho: 65, sky: ['#D9B36A', '#F2DDA8'], ground: '#8C6A3C', air: 'air 50 times thicker than Earth’s' },
  { id: 'jupiter', label: 'Jupiter', g: 24.79, rho: 0.16, sky: ['#C9A27A', '#EEDBC2'], ground: '#9C7B5A', air: 'thin hydrogen air (cloud tops)' },
]

export const planet = id => PLANETS.find(p => p.id === id) ?? PLANETS[0]
/** Air density at a planet's surface (kg/m³); Earth's for anything unknown. */
export const airDensity = id => PLANETS.find(p => p.id === id)?.rho ?? 1.225
