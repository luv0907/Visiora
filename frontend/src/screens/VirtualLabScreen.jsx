/**
 * VISIORA — VirtualLabScreen.jsx
 * 
 * Embeds the Unity WebGL Virtual Lab inside the existing React app.
 * This is a NEW file — it does NOT replace or modify any existing screen.
 * 
 * Architecture:
 *   - React app renders an iframe pointing at the Unity WebGL build
 *   - Auth token is passed to Unity via postMessage / URL param
 *   - Unity communicates back via window.unityInstance.SendMessage
 * 
 * INTEGRATION REQUIREMENTS (minimal):
 *   1. This file (new)
 *   2. Add route in router/index.jsx (one line addition)
 *   3. Add nav entry in HomeScreen.jsx (optional — one card addition)
 *   4. Host Unity WebGL build at /virtual-lab/ on Vercel
 */

import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/useAuthStore'
import { ArrowLeft, Maximize2, Minimize2, Loader, AlertCircle } from 'lucide-react'

export default function VirtualLabScreen() {
  const navigate = useNavigate()
  const user = useAuthStore(state => state.user)
  const iframeRef = useRef(null)

  const [isLoading, setIsLoading] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [loadError, setLoadError] = useState(false)

  // Recursion guard: never render VirtualLabScreen inside an iframe
  if (typeof window !== 'undefined' && window.self !== window.top) {
    return null
  }

  // Unity WebGL build path — relative to the deployment root
  const UNITY_BUILD_URL = import.meta.env.VITE_UNITY_LAB_URL || '/virtual-lab/index.html'

  const handleBack = () => {
    if (window.top && window.top !== window) {
      window.top.location.href = '/'
    } else {
      navigate('/')
    }
  }

  useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe) return

    const handleLoad = () => {
      setIsLoading(false)
      
      // Send auth token to Unity via postMessage
      if (user) {
        iframe.contentWindow?.postMessage({
          type: 'VISORA_AUTH',
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || user.email
        }, '*')
      }
    }

    const handleError = () => {
      setLoadError(true)
      setIsLoading(false)
    }

    const handleMessage = (e) => {
      if (e.data?.type === 'UNITY_LAB_READY') {
        setIsLoading(false)
      }
    }

    iframe.addEventListener('load', handleLoad)
    iframe.addEventListener('error', handleError)
    window.addEventListener('message', handleMessage)

    return () => {
      iframe.removeEventListener('load', handleLoad)
      iframe.removeEventListener('error', handleError)
      window.removeEventListener('message', handleMessage)
    }
  }, [user])

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {})
      setIsFullscreen(true)
    } else {
      document.exitFullscreen().catch(() => {})
      setIsFullscreen(false)
    }
  }

  return (
    <div style={{
      width: '100vw',
      height: '100dvh',
      background: '#FAF8F5',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      position: 'relative'
    }}>
      {/* ── Top Bar in Signature Cream & Navy Theme ── */}
      <div style={{
        height: 50,
        background: '#FAF8F5',
        borderBottom: '1px solid rgba(0, 43, 102, 0.16)',
        boxShadow: '0 2px 8px rgba(0, 43, 102, 0.06)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 16px',
        gap: 12,
        zIndex: 10,
        flexShrink: 0
      }}>
        <button
          onClick={handleBack}
          style={{
            background: '#002B66',
            border: 'none',
            color: '#FFFFFF',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 12px',
            borderRadius: 0,
            fontSize: 12.5,
            fontWeight: 700,
            transition: 'all 0.15s ease',
            boxShadow: '0 2px 6px rgba(0, 43, 102, 0.2)'
          }}
          onMouseEnter={e => e.currentTarget.style.background = '#0A192F'}
          onMouseLeave={e => e.currentTarget.style.background = '#002B66'}
        >
          <ArrowLeft size={15} />
          Back to VISIORA
        </button>

        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          gap: 10
        }}>
          <span style={{
            fontSize: 13.5,
            fontWeight: 800,
            color: '#002B66',
            letterSpacing: '0.04em',
            fontFamily: 'var(--font-display, system-ui)'
          }}>
            VISIORA Virtual Lab
          </span>
          <span style={{
            fontSize: 10,
            fontWeight: 700,
            color: '#002B66',
            background: 'rgba(0, 43, 102, 0.08)',
            border: '1px solid rgba(0, 43, 102, 0.16)',
            padding: '2px 8px',
            borderRadius: 0,
            letterSpacing: '0.06em'
          }}>
            UNITY 3D ENGINE
          </span>
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {!loadError && (
            <span style={{
              fontSize: 12,
              fontWeight: 700,
              color: '#002B66',
              display: 'flex',
              alignItems: 'center',
              gap: 5
            }}>
              <span style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: isLoading ? '#D97706' : '#10B981',
                display: 'inline-block'
              }} />
              {isLoading ? 'Connecting...' : 'Live Engine'}
            </span>
          )}

          <button
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
            style={{
              background: '#FFFFFF',
              border: '1px solid rgba(0, 43, 102, 0.22)',
              borderRadius: 0,
              color: '#002B66',
              cursor: 'pointer',
              padding: '6px 10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s ease',
              boxShadow: '0 1px 4px rgba(0, 43, 102, 0.06)'
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#F4EFE6'}
            onMouseLeave={e => e.currentTarget.style.background = '#FFFFFF'}
          >
            {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </button>
        </div>
      </div>

      {/* ── Unity WebGL Embed ── */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {/* Loading state */}
        {isLoading && !loadError && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            background: '#FAF8F5',
            zIndex: 5,
            gap: 16
          }}>
            <Loader size={32} color="#002B66" style={{ animation: 'spin 1s linear infinite' }} />
            <div style={{ textAlign: 'center' }}>
              <p style={{ color: '#0A192F', margin: 0, fontSize: 16, fontWeight: 700 }}>
                Connecting to Virtual Laboratory Bench
              </p>
              <p style={{ color: '#64748B', margin: '6px 0 0', fontSize: 13 }}>
                Initializing Ohm's Law experiment instruments...
              </p>
            </div>
          </div>
        )}

        {/* Error state */}
        {loadError && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            background: '#FAF8F5',
            gap: 14,
            padding: 24,
            textAlign: 'center'
          }}>
            <AlertCircle size={40} color="#D97706" />
            <p style={{ color: '#0A192F', margin: 0, fontSize: 16, fontWeight: 700 }}>
              Virtual Laboratory Standby
            </p>
            <p style={{ color: '#4A5568', margin: 0, fontSize: 13, maxWidth: 440, lineHeight: 1.5 }}>
              The Unity WebGL physics engine is ready to deploy. You can run the full real-time interactive physics simulations right now in the 3D Simulator.
            </p>
            <button
              onClick={() => navigate('/sim')}
              style={{
                marginTop: 8,
                padding: '10px 20px',
                background: '#002B66',
                color: '#FFFFFF',
                border: 'none',
                fontWeight: 700,
                fontSize: 13,
                cursor: 'pointer'
              }}
            >
              Launch 3D Physics Simulator
            </button>
          </div>
        )}

        {/* Unity iframe */}
        <iframe
          ref={iframeRef}
          src={UNITY_BUILD_URL}
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            display: 'block'
          }}
          allow="fullscreen"
          title="VISIORA Virtual Science Lab"
          id="unity-virtual-lab"
        />
      </div>

      {/* ── Keyboard Hints ── */}
      {!isLoading && !loadError && (
        <div style={{
          position: 'absolute',
          bottom: 12,
          right: 16,
          display: 'flex',
          gap: 6,
          opacity: 0.4,
          pointerEvents: 'none'
        }}>
          {['WASD Move', 'E Interact', 'Scroll Adjust', 'Tab Panel', 'Esc Menu'].map(hint => (
            <span key={hint} style={{
              fontSize: 10,
              color: 'white',
              background: 'rgba(255,255,255,0.1)',
              padding: '3px 6px',
              borderRadius: 4,
              fontFamily: 'monospace'
            }}>{hint}</span>
          ))}
        </div>
      )}
    </div>
  )
}
