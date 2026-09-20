import React, { useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { Physics } from '@react-three/rapier'
import { usePhysicsStore } from '../../store/usePhysicsStore'
import { SCENE_META } from '../../config/physics'
import { Home, Settings, Volume2, VolumeX, MoreVertical } from 'lucide-react'
import SimControls from '../controls/SimControls'

export default function PhETLayout({ children, tabs = ['Intro', 'Lab'], rightPanelContent, topBarContent }) {
  const { activeScene, activeTab, setTab } = usePhysicsStore()
  const sceneName = SCENE_META[activeScene]?.label || 'Simulation'
  const [audioEnabled, setAudioEnabled] = useState(true)

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      width: '100vw',
      background: '#f0f0f0', // PhET uses plain light backgrounds for canvases
      overflow: 'hidden',
      position: 'relative'
    }}>
      {/* ── Top Bar (Optional) ── */}
      {topBarContent && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '16px', zIndex: 10, pointerEvents: 'none' }}>
          <div style={{ pointerEvents: 'auto', display: 'flex', justifyContent: 'space-between' }}>
             {topBarContent}
          </div>
        </div>
      )}

      {/* ── Main Canvas Area ── */}
      <div style={{ flex: 1, position: 'relative' }}>
        <Canvas 
          orthographic 
          camera={{ position: [0, 5, 20], zoom: 60, up: [0, 1, 0] }}
          style={{ width: '100%', height: '100%', background: '#fff' }}
        >
          <ambientLight intensity={1} />
          <Physics gravity={[0, -9.81, 0]} timeStep="vary">
            {children}
          </Physics>
        </Canvas>

        {/* Right Control Panel Overlay */}
        <div style={{
          position: 'absolute',
          top: '20px',
          right: '20px',
          width: '320px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          zIndex: 10
        }}>
          {rightPanelContent}
        </div>
      </div>

      {/* ── Bottom PhET-Style Navigation Bar ── */}
      <div style={{
        height: '60px',
        background: '#000',
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        fontFamily: 'sans-serif'
      }}>
        {/* Left: Title & Home */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <span style={{ fontSize: '18px', fontWeight: 'bold' }}>{sceneName}</span>
          <button style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}>
            <Home size={24} />
          </button>
        </div>

        {/* Center: Tabs */}
        <div style={{ display: 'flex', height: '100%', alignItems: 'flex-end', gap: '4px' }}>
          {tabs.map(tab => (
            <button
              key={tab}
              onClick={() => setTab(tab)}
              style={{
                background: activeTab === tab ? '#fff' : '#333',
                color: activeTab === tab ? '#000' : '#fff',
                border: 'none',
                borderRadius: '8px 8px 0 0',
                padding: '8px 24px',
                fontSize: '14px',
                fontWeight: activeTab === tab ? 'bold' : 'normal',
                cursor: 'pointer',
                height: activeTab === tab ? '100%' : '85%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Right: Settings & Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}>
            <Settings size={20} />
          </button>
          <button onClick={() => setAudioEnabled(!audioEnabled)} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}>
            {audioEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
          </button>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            background: '#fff',
            color: '#0078C0',
            fontWeight: '900',
            fontSize: '20px',
            padding: '2px 8px',
            borderRadius: '4px',
            letterSpacing: '1px'
          }}>
            V!SIORA
          </div>
          <button style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}>
            <MoreVertical size={20} />
          </button>
        </div>
      </div>
    </div>
  )
}
