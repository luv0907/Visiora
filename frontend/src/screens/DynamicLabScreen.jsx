/**
 * VISIORA — DynamicLabScreen.jsx
 * 
 * Universal high-performance responsive viewer for any 2D or 3D experiment
 * deployed online by the team and registered via the Admin Dashboard.
 * 
 * Features:
 *   - Signature VISIORA Atelier palette (Cream #FAF8F5, Navy #002B66, White #FFFFFF)
 *   - Live iframe sandbox with full WebGL & canvas permissions
 *   - Scientific Concept & Formula drawer with real-time parameter explanations
 *   - Fullscreen mode, reset reload, external tab launcher
 *   - Safe error & loading fallbacks
 */

import React, { useState, useRef, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useAdminStore } from '../store/useAdminStore'
import {
  ArrowLeft,
  Maximize2,
  Minimize2,
  ExternalLink,
  RotateCcw,
  Info,
  Layers,
  Sparkles,
  ShieldCheck,
  AlertCircle,
  Loader
} from 'lucide-react'

export default function DynamicLabScreen() {
  const { labId } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const { experiments, trackExperimentClick } = useAdminStore()

  // Find experiment by id or matching target slug
  const targetId = labId || searchParams.get('lab') || 'ohmslaw'
  const exp = (experiments || []).find(
    e => e.id === targetId || e.id === `vis-${targetId}` || e.id.includes(targetId)
  ) || {
    id: targetId,
    type: '3d',
    title: targetId.charAt(0).toUpperCase() + targetId.slice(1) + ' Simulation',
    subtitle: 'Interactive Physical Laboratory',
    category: 'General Physics',
    formula: '',
    targetUrl: `/sim?lab=${targetId}`,
    badge: 'Interactive Lab',
    embedMode: 'embed',
    authorTeam: 'Visiora Research Group',
    gradeLevel: 'Class 8-12'
  }

  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showInfoDrawer, setShowInfoDrawer] = useState(false)
  const [iframeKey, setIframeKey] = useState(1)

  const containerRef = useRef(null)
  const iframeRef = useRef(null)

  useEffect(() => {
    if (exp?.id) {
      trackExperimentClick(exp.id)
    }
  }, [exp?.id])

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {})
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {})
    }
  }

  const handleReload = () => {
    setIsLoading(true)
    setLoadError(false)
    setIframeKey(k => k + 1)
  }

  // Determine effective target URL
  let effectiveUrl = exp.targetUrl
  if (exp.id === 'ohmslaw' && !exp.targetUrl.startsWith('http')) {
    effectiveUrl = '/virtual-lab/index.html'
  }

  return (
    <div
      ref={containerRef}
      style={{
        width: '100vw',
        height: '100dvh',
        background: '#FAF8F5',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        position: 'relative',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
      }}
    >
      {/* ── VISIORA Top Studio Header ── */}
      <header
        style={{
          height: 48,
          minHeight: 48,
          background: '#FAF8F5',
          borderBottom: '1px solid rgba(0, 43, 102, 0.14)',
          boxShadow: '0 2px 8px rgba(0, 43, 102, 0.05)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
          zIndex: 40,
          flexShrink: 0
        }}
      >
        {/* Left: Brand Back & Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
          <button
            onClick={() => navigate('/')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: '#002B66',
              border: 'none',
              cursor: 'pointer',
              color: '#FFFFFF',
              fontWeight: 700,
              fontSize: 12.5,
              padding: '6px 12px',
              borderRadius: 0,
              transition: 'background 0.15s ease',
              boxShadow: '0 2px 6px rgba(0, 43, 102, 0.2)',
              flexShrink: 0
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#0A192F'}
            onMouseLeave={e => e.currentTarget.style.background = '#002B66'}
          >
            <ArrowLeft size={14} />
            <span>VISIORA</span>
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, overflow: 'hidden' }}>
            <span
              style={{
                fontSize: 13.5,
                fontWeight: 800,
                color: '#002B66',
                letterSpacing: '0.02em',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}
            >
              {exp.title}
            </span>

            <span
              style={{
                fontSize: 10.5,
                fontWeight: 700,
                color: '#002B66',
                background: 'rgba(0, 43, 102, 0.08)',
                border: '1px solid rgba(0, 43, 102, 0.18)',
                padding: '2px 7px',
                borderRadius: 0,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                flexShrink: 0
              }}
            >
              {exp.type === '3d' ? '3D EXPERIMENT' : '2D STUDIO'}
            </span>

            {exp.formula && (
              <span
                style={{
                  fontSize: 11,
                  fontFamily: 'monospace',
                  fontWeight: 700,
                  color: '#002B66',
                  background: '#FFFFFF',
                  border: '1px solid rgba(0, 43, 102, 0.15)',
                  padding: '2px 8px',
                  borderRadius: 0,
                  display: 'none',
                  flexShrink: 0
                }}
                className="desktop-formula-chip"
              >
                {exp.formula}
              </span>
            )}
          </div>
        </div>

        {/* Right: Actions & Tools */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {/* Info Drawer Toggle */}
          <button
            onClick={() => setShowInfoDrawer(!showInfoDrawer)}
            title="Scientific Concepts & Parameters"
            style={{
              background: showInfoDrawer ? '#002B66' : '#FFFFFF',
              border: '1px solid rgba(0, 43, 102, 0.22)',
              color: showInfoDrawer ? '#FFFFFF' : '#002B66',
              cursor: 'pointer',
              padding: '6px 10px',
              fontSize: 12,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              transition: 'all 0.15s ease'
            }}
          >
            <Info size={14} />
            <span>{showInfoDrawer ? 'Hide Info' : 'Concept Info'}</span>
          </button>

          {/* Reload Stage */}
          <button
            onClick={handleReload}
            title="Reload Simulation"
            style={{
              background: '#FFFFFF',
              border: '1px solid rgba(0, 43, 102, 0.22)',
              color: '#002B66',
              cursor: 'pointer',
              padding: '6px 8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <RotateCcw size={14} />
          </button>

          {/* External Link */}
          {exp.targetUrl && (
            <a
              href={exp.targetUrl}
              target="_blank"
              rel="noopener noreferrer"
              title="Open raw deployed link in new tab"
              style={{
                background: '#FFFFFF',
                border: '1px solid rgba(0, 43, 102, 0.22)',
                color: '#002B66',
                cursor: 'pointer',
                padding: '6px 8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                textDecoration: 'none'
              }}
            >
              <ExternalLink size={14} />
            </a>
          )}

          {/* Fullscreen */}
          <button
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
            style={{
              background: '#FFFFFF',
              border: '1px solid rgba(0, 43, 102, 0.22)',
              color: '#002B66',
              cursor: 'pointer',
              padding: '6px 10px',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              fontSize: 12,
              fontWeight: 700
            }}
          >
            {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            <span>{isFullscreen ? 'Exit' : 'Full Screen'}</span>
          </button>
        </div>
      </header>

      {/* ── Main Stage Area ── */}
      <div style={{ flex: 1, display: 'flex', position: 'relative', overflow: 'hidden' }}>
        {/* Embedded Iframe Container */}
        <div style={{ flex: 1, position: 'relative', height: '100%', background: '#FAF8F5' }}>
          {/* Loading Indicator */}
          {isLoading && !loadError && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#FAF8F5',
                zIndex: 10,
                gap: 14
              }}
            >
              <Loader size={36} color="#002B66" style={{ animation: 'spin 1s linear infinite' }} />
              <div style={{ textAlign: 'center' }}>
                <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#002B66' }}>
                  Loading {exp.title}
                </p>
                <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748B' }}>
                  Deploying laboratory apparatus and physics parameters...
                </p>
              </div>
            </div>
          )}

          {/* Error State */}
          {loadError && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#FAF8F5',
                zIndex: 10,
                padding: 24,
                textAlign: 'center',
                gap: 12
              }}
            >
              <AlertCircle size={40} color="#D97706" />
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#002B66' }}>
                Unable to Load Embedded Simulator
              </h3>
              <p style={{ margin: 0, fontSize: 13, color: '#4A5568', maxWidth: 440 }}>
                The target experiment URL could not be rendered inside this frame. You can launch it directly in a dedicated tab.
              </p>
              <a
                href={exp.targetUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  marginTop: 8,
                  padding: '9px 18px',
                  background: '#002B66',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  fontSize: 13,
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                <span>Launch in External Window</span>
                <ExternalLink size={14} />
              </a>
            </div>
          )}

          <iframe
            key={iframeKey}
            ref={iframeRef}
            src={effectiveUrl}
            title={exp.title}
            onLoad={() => setIsLoading(false)}
            onError={() => {
              setIsLoading(false)
              setLoadError(true)
            }}
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              display: 'block'
            }}
            allow="fullscreen; accelerometer; gyroscope; autoplay; clipboard-write; encrypted-media; picture-in-picture"
          />
        </div>

        {/* ── Slide-out Concept Info Drawer ── */}
        {showInfoDrawer && (
          <aside
            style={{
              width: 320,
              background: '#FFFFFF',
              borderLeft: '1px solid rgba(0, 43, 102, 0.16)',
              boxShadow: '-4px 0 20px rgba(0, 43, 102, 0.08)',
              padding: '20px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
              overflowY: 'auto',
              zIndex: 30
            }}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Scientific Topic
                </span>
                <button
                  onClick={() => setShowInfoDrawer(false)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#64748B' }}
                >
                  &times;
                </button>
              </div>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#002B66' }}>
                {exp.category}
              </h3>
            </div>

            {exp.subtitle && (
              <p style={{ margin: 0, fontSize: 13, color: '#475569', lineHeight: 1.5 }}>
                {exp.subtitle}
              </p>
            )}

            {exp.formula && (
              <div
                style={{
                  background: '#FAF8F5',
                  border: '1px solid rgba(0, 43, 102, 0.16)',
                  borderLeft: '3px solid #002B66',
                  padding: '10px 14px'
                }}
              >
                <span style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#002B66', marginBottom: 4 }}>
                  GOVERNING LAW / FORMULA
                </span>
                <span style={{ fontSize: 14, fontFamily: 'monospace', fontWeight: 800, color: '#0A192F' }}>
                  {exp.formula}
                </span>
              </div>
            )}

            <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                <span style={{ color: '#64748B' }}>Author Team:</span>
                <strong style={{ color: '#002B66' }}>{exp.authorTeam || 'Visiora Atelier'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                <span style={{ color: '#64748B' }}>Target Grade:</span>
                <strong style={{ color: '#002B66' }}>{exp.gradeLevel || 'Class 8-12'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                <span style={{ color: '#64748B' }}>Simulation Type:</span>
                <strong style={{ color: '#002B66' }}>{exp.type === '3d' ? '3D Engine' : '2D Studio'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                <span style={{ color: '#64748B' }}>Interaction Count:</span>
                <strong style={{ color: '#002B66' }}>{exp.clicks || 0} Sessions</strong>
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  )
}
