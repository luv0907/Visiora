/**
 * VISIORA — LabIcon
 * Production-grade scientific vector iconography for physics laboratories.
 * Replaces generic emojis and placeholder atoms with authentic, precision
 * technical schematics tailored to each laboratory experiment.
 */
import React from 'react'
import { Atom } from 'lucide-react'

export default function LabIcon({ 
  id, 
  name, 
  size = 20, 
  strokeWidth = 2, 
  color = 'currentColor', 
  style = {} 
}) {
  const iconKey = (id || name || '').toLowerCase().replace(/[^a-z0-9]/g, '')

  switch (iconKey) {
    case 'ohmslaw':
    case 'ohm':
    case 'circuit':
    case 'electricity':
      // DC Circuit Schematic: Battery source, resistor, and precision analog meter dial
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          style={style}
        >
          {/* Circuit wire loop */}
          <rect x="3" y="4" width="18" height="16" rx="2" strokeOpacity="0.4" />
          {/* Battery source (left branch: long plate + short plate) */}
          <line x1="3" y1="10" x2="3" y2="14" strokeWidth={strokeWidth * 1.6} />
          {/* Resistor zig-zag (top branch) */}
          <path d="M8 4l1.5-2 2 4 2-4 2 4 1.5-2" />
          {/* Voltmeter meter dial (center hub with deflecting needle) */}
          <circle cx="12" cy="14" r="4" fill="currentColor" fillOpacity="0.12" />
          <line x1="12" y1="14" x2="14.5" y2="11.5" strokeWidth={strokeWidth * 1.2} />
          <circle cx="12" cy="14" r="1" fill="currentColor" />
        </svg>
      )

    case 'projectile':
    case 'kinematics':
      // Parabolic Ballistic Trajectory with Launch Origin and Velocity Vector
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          style={style}
        >
          {/* Ground baseline */}
          <line x1="2" y1="21" x2="22" y2="21" strokeOpacity="0.5" />
          {/* Parabolic ballistic flight path */}
          <path d="M3 21C6 9 13 4 21 17" strokeDasharray="1.5 1.5" strokeOpacity="0.75" />
          {/* Launch velocity tangent vector arrow */}
          <line x1="3" y1="21" x2="8" y2="11" />
          <polyline points="5.5 11 8 11 8 13.5" />
          {/* Apex projectile body */}
          <circle cx="12.5" cy="5.5" r="2.2" fill="currentColor" />
        </svg>
      )

    case 'gravity':
    case 'freefall':
    case 'orbits':
      // Gravitational Keplerian Orbit & Mass Descent Vector
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          style={style}
        >
          {/* Central massive body (planet / attractor) */}
          <circle cx="12" cy="12" r="4.5" fill="currentColor" fillOpacity="0.2" />
          <circle cx="12" cy="12" r="2.5" fill="currentColor" />
          {/* Elliptical orbital path */}
          <ellipse cx="12" cy="12" rx="9" ry="4.5" transform="rotate(-25 12 12)" strokeOpacity="0.65" />
          {/* Orbiting satellite with tangential motion arrow */}
          <circle cx="19.5" cy="8.5" r="1.8" fill="currentColor" />
          {/* Gravitational acceleration vector toward core */}
          <path d="M18 10l-3 1.5" />
        </svg>
      )

    case 'pendulum':
    case 'harmonics':
      // Rigid Suspension Mounting Bracket, Pivot Hub, Rod, and Swinging Bob
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          style={style}
        >
          {/* Fixed ceiling mount */}
          <line x1="4" y1="3" x2="20" y2="3" />
          <line x1="6" y1="1" x2="8" y2="3" strokeOpacity="0.5" />
          <line x1="11" y1="1" x2="13" y2="3" strokeOpacity="0.5" />
          <line x1="16" y1="1" x2="18" y2="3" strokeOpacity="0.5" />
          {/* Low friction pivot hub */}
          <circle cx="12" cy="3" r="1.5" fill="currentColor" />
          {/* Suspension rod deflected at angle theta */}
          <line x1="12" y1="4.5" x2="7" y2="16.5" />
          {/* Pendulum bob with brass core */}
          <circle cx="6" cy="18.5" r="3.2" fill="currentColor" fillOpacity="0.2" />
          <circle cx="6" cy="18.5" r="1.8" fill="currentColor" />
          {/* Dashed oscillatory harmonic path */}
          <path d="M4 21c4 1.5 8 1.5 14-3" strokeDasharray="1.5 1.5" strokeOpacity="0.55" />
        </svg>
      )

    case 'buoyancy':
    case 'fluid':
    case 'archimedes':
      // Archimedes Law: Fluid surface wave dynamics and buoyant force vector
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          style={style}
        >
          {/* Fluid container vessel */}
          <path d="M4 6v13a2 2 0 002 2h12a2 2 0 002-2V6" strokeOpacity="0.45" />
          {/* Fluid meniscus wave surface */}
          <path d="M4 11c2-1 4-1 6 0s4 1 6 0 3-0.8 4 0" />
          {/* Submerged floating density block */}
          <rect x="8.5" y="8.5" width="7" height="7" rx="1" fill="currentColor" fillOpacity="0.2" />
          {/* Upward buoyant force arrow (Fb) */}
          <line x1="12" y1="8.5" x2="12" y2="3.5" strokeWidth={strokeWidth * 1.2} />
          <polyline points="9.5 5.5 12 3 14.5 5.5" />
        </svg>
      )

    case 'collision':
    case 'momentum':
    case 'elastic':
      // Linear Momentum & Kinetic Energy Conservation: Two colliding vector spheres
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          style={style}
        >
          {/* Sphere 1 (Mass 1) */}
          <circle cx="6.5" cy="12" r="3.8" fill="currentColor" fillOpacity="0.2" />
          <circle cx="6.5" cy="12" r="1.8" fill="currentColor" />
          {/* Incoming velocity vector 1 */}
          <line x1="10.5" y1="12" x2="14" y2="12" />
          <polyline points="12.5 10 14.5 12 12.5 14" />
          {/* Sphere 2 (Mass 2) */}
          <circle cx="17.5" cy="12" r="3.8" fill="currentColor" fillOpacity="0.2" />
          <circle cx="17.5" cy="12" r="1.8" fill="currentColor" />
          {/* Elastic collision impact rays */}
          <path d="M12 7.5l-1-2" strokeOpacity="0.6" />
          <path d="M12 16.5l-1 2" strokeOpacity="0.6" />
        </svg>
      )

    default:
      return (
        <Atom 
          size={size} 
          strokeWidth={strokeWidth} 
          color={color} 
          style={style} 
        />
      )
  }
}
