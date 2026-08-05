/**
 * VISIORA — Scene Grid / Ground Plane
 * Soft creamy grid with coordinate axes. Matches the palette.
 */
import React from 'react'
import { Grid } from '@react-three/drei'

export default function SceneGrid({ y = -0.01, size = 20, cellSize = 1 }) {
  return (
    <>
      {/* Soft ground grid */}
      <Grid
        position={[0, y, 0]}
        args={[size, size]}
        cellSize={cellSize}
        cellThickness={0.5}
        cellColor="#FFB6C9"
        sectionSize={5}
        sectionThickness={1}
        sectionColor="#F896B8"
        fadeDistance={25}
        fadeStrength={1}
        infiniteGrid
      />

      {/* Ground plane (very subtle) */}
      <mesh position={[0, y - 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[size * 2, size * 2]} />
        <meshStandardMaterial
          color="#FFF9F5"
          roughness={0.9}
          metalness={0}
          transparent
          opacity={0.6}
        />
      </mesh>
    </>
  )
}
