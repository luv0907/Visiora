import React, { useState, useRef, Suspense } from 'react'
import { motion } from 'framer-motion'
import { generateSimulation } from '../api/client'
import { Canvas } from '@react-three/fiber'
import { Physics } from '@react-three/rapier'
import { OrbitControls } from '@react-three/drei'
import { PCFShadowMap } from 'three'
import { ErrorBoundary } from '../components/ui/ErrorBoundary'

const GenericScene3D = React.lazy(() => import('../scenes/GenericScene3D'))
const GenericDiagram2D = React.lazy(() => import('../components/diagrams/GenericDiagram2D'))

export default function CreateScreen() {
  const [prompt, setPrompt] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [result, setResult] = useState(null) // GenerationResult
  const [error, setError] = useState(null)

  const handleGenerate = async (e) => {
    e.preventDefault()
    if (!prompt.trim()) return

    setIsGenerating(true)
    setError(null)
    setResult(null)

    try {
      const res = await generateSimulation(prompt)
      setResult(res)
    } catch (err) {
      setError(err.message || 'Generation failed.')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div style={{
      flex: 1,
      display: 'grid',
      gridTemplateColumns: '1fr 2fr',
      gap: 'var(--space-4)',
      padding: 'var(--space-4)',
      overflow: 'hidden',
    }}>
      {/* LEFT PANEL: Chat / Prompt */}
      <div style={{
        background: 'var(--color-surface)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--color-border)',
        boxShadow: 'var(--shadow-md)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        <div style={{ padding: 'var(--space-4)', borderBottom: '1px solid var(--color-border)' }}>
          <h2 style={{ margin: 0, fontSize: 'var(--text-lg)', color: 'var(--color-text)' }}>Generative Engine</h2>
          <p style={{ margin: '4px 0 0', fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
            Describe a physics concept, and VISIORA will build it dynamically.
          </p>
        </div>

        <div style={{ flex: 1, padding: 'var(--space-4)', overflowY: 'auto' }}>
          {error && (
            <div style={{ color: 'red', marginBottom: '16px' }}>{error}</div>
          )}
          
          {result && result.outcome === 'declined' && (
            <div style={{ color: 'red' }}>Declined: {result.reason}</div>
          )}
          
          {result && result.outcome === 'impossible' && (
            <div style={{ color: 'red' }}>Impossible: {result.reason}</div>
          )}

          {result && result.outcome === 'needs_clarification' && (
            <div style={{ color: 'var(--color-accent)' }}>
              {result.clarifying_question}
            </div>
          )}

          {result && result.outcome === 'success' && result.concept && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <h3 style={{ marginTop: 0 }}>{result.concept.title}</h3>
              <p>{result.concept.description}</p>
              
              <div style={{ marginTop: '16px' }}>
                <h4 style={{ marginBottom: '8px' }}>Math Engine Verification</h4>
                {result.concept.formula_steps.map((step, i) => (
                  <div key={i} style={{ 
                    background: 'var(--color-bg)', 
                    padding: '8px', 
                    borderRadius: '4px',
                    marginBottom: '4px',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '12px'
                  }}>
                    <div><span style={{color: 'var(--color-text-muted)'}}>{step.description}</span></div>
                    <div>{step.equation}</div>
                    <div>{step.substituted} = <span style={{color: 'var(--color-primary)'}}>{step.result}</span></div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
          
          {isGenerating && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-accent)' }}>
              <div className="spinner" style={{ width: 16, height: 16, border: '2px solid', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
              Generating simulation (this might take a few seconds)...
            </div>
          )}
        </div>

        <div style={{ padding: 'var(--space-4)', borderTop: '1px solid var(--color-border)' }}>
          <form onSubmit={handleGenerate} style={{ display: 'flex', gap: '8px' }}>
            <input 
              type="text" 
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. Earth orbiting the sun..."
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)',
                background: 'var(--color-bg)',
                fontFamily: 'var(--font-body)'
              }}
              disabled={isGenerating}
            />
            <button 
              type="submit" 
              disabled={isGenerating || !prompt.trim()}
              style={{
                padding: '0 24px',
                background: 'var(--color-accent)',
                color: 'white',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              Build
            </button>
          </form>
        </div>
      </div>

      {/* RIGHT PANEL: Live Render Canvas */}
      <div style={{
        position: 'relative',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--color-border)',
        boxShadow: 'var(--shadow-md)',
        overflow: 'hidden',
        background: 'var(--scene-bg-start)',
      }}>
        {result && result.outcome === 'success' && result.concept ? (
          result.concept.domain === 'mechanics_3d' ? (
            <ErrorBoundary section="generative-3d">
              <Canvas
                shadows={{ type: PCFShadowMap }}
                camera={{ position: [5, 5, 15], fov: 50 }}
                style={{ width: '100%', height: '100%' }}
              >
                <color attach="background" args={['#F9F5F0']} />
                <fog attach="fog" args={['#F9F5F0', 35, 80]} />
                <ambientLight intensity={0.6} />
                <directionalLight position={[10, 20, 10]} castShadow intensity={1.5} />
                <Suspense fallback={null}>
                  <Physics gravity={[0, -9.81, 0]}>
                    <GenericScene3D concept={result.concept} />
                  </Physics>
                </Suspense>
                <OrbitControls makeDefault enableDamping dampingFactor={0.08} />
              </Canvas>
            </ErrorBoundary>
          ) : (
            <ErrorBoundary section="generative-2d">
              <Suspense fallback={null}>
                <GenericDiagram2D diagram={result.concept.diagram} />
              </Suspense>
            </ErrorBoundary>
          )
        ) : (
          <div style={{ 
            width: '100%', height: '100%', 
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--color-text-muted)',
            fontFamily: 'var(--font-mono)'
          }}>
            AWAITING CONCEPT DEFINITION
          </div>
        )}
      </div>
    </div>
  )
}
