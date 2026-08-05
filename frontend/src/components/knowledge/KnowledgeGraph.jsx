/**
 * VISIORA — Knowledge Graph Visualization
 * Interactive nodes showing concepts and relationships.
 */
import React, { useEffect, useRef } from 'react'
import { knowledgeGraph } from '../../data/knowledgeGraph'
import { usePhysicsStore } from '../../store/usePhysicsStore'

export default function KnowledgeGraph({ onClose }) {
  const canvasRef = useRef(null)
  const { setScene } = usePhysicsStore()

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    let animationFrameId
    let width = canvas.width = canvas.offsetWidth
    let height = canvas.height = canvas.offsetHeight

    // Physics simulation for the graph layout
    const nodes = knowledgeGraph.nodes.map(n => ({
      ...n,
      x: Math.random() * width,
      y: Math.random() * height,
      vx: 0,
      vy: 0
    }))
    
    const edges = knowledgeGraph.edges.map(e => ({
      source: nodes.find(n => n.id === e.from),
      target: nodes.find(n => n.id === e.to),
      type: e.type,
      label: e.label
    })).filter(e => e.source && e.target)

    const draw = () => {
      ctx.clearRect(0, 0, width, height)
      
      // Forces
      const k = 0.05
      const repulsion = 2000
      const damping = 0.8
      
      // Apply repulsion
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x
          const dy = nodes[i].y - nodes[j].y
          const distSq = dx * dx + dy * dy
          if (distSq > 0.1) {
            const force = repulsion / distSq
            const fx = (dx / Math.sqrt(distSq)) * force
            const fy = (dy / Math.sqrt(distSq)) * force
            nodes[i].vx += fx
            nodes[i].vy += fy
            nodes[j].vx -= fx
            nodes[j].vy -= fy
          }
        }
      }
      
      // Apply spring forces (edges)
      edges.forEach(edge => {
        const dx = edge.target.x - edge.source.x
        const dy = edge.target.y - edge.source.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        const targetDist = edge.type === 'prerequisite' ? 100 : 150
        
        const force = (dist - targetDist) * k
        const fx = (dx / dist) * force
        const fy = (dy / dist) * force
        
        edge.source.vx += fx
        edge.source.vy += fy
        edge.target.vx -= fx
        edge.target.vy -= fy
      })
      
      // Update positions
      nodes.forEach(node => {
        // Center gravity
        node.vx += (width / 2 - node.x) * 0.01
        node.vy += (height / 2 - node.y) * 0.01
        
        node.vx *= damping
        node.vy *= damping
        node.x += node.vx
        node.y += node.vy
        
        // Bounds
        node.x = Math.max(30, Math.min(width - 30, node.x))
        node.y = Math.max(30, Math.min(height - 30, node.y))
      })
      
      // Draw edges
      edges.forEach(edge => {
        ctx.beginPath()
        ctx.moveTo(edge.source.x, edge.source.y)
        ctx.lineTo(edge.target.x, edge.target.y)
        ctx.strokeStyle = 'rgba(164, 143, 216, 0.4)'
        ctx.lineWidth = 1.5
        ctx.stroke()
        
        // Draw edge label
        const mx = (edge.source.x + edge.target.x) / 2
        const my = (edge.source.y + edge.target.y) / 2
        ctx.fillStyle = 'rgba(138, 130, 137, 0.8)'
        ctx.font = '10px Inter'
        ctx.textAlign = 'center'
        ctx.fillText(edge.label, mx, my - 4)
      })
      
      // Draw nodes
      nodes.forEach(node => {
        ctx.beginPath()
        ctx.arc(node.x, node.y, 25, 0, Math.PI * 2)
        ctx.fillStyle = node.scene ? '#F896B8' : '#E4D9F7'
        ctx.fill()
        ctx.strokeStyle = node.scene ? '#D94F84' : '#A48FD8'
        ctx.lineWidth = 2
        ctx.stroke()
        
        ctx.fillStyle = '#2E2A2C'
        ctx.font = '11px Inter'
        ctx.textAlign = 'center'
        ctx.fillText(node.label, node.x, node.y + 40)
        
        if (node.scene) {
          ctx.fillStyle = '#FFFFFF'
          ctx.font = '10px Inter'
          ctx.fillText('Play', node.x, node.y + 3)
        }
      })
      
      animationFrameId = requestAnimationFrame(draw)
    }
    
    draw()

    // Handle clicks
    const handleClick = (e) => {
      const rect = canvas.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      
      const clicked = nodes.find(n => {
        const dx = n.x - x
        const dy = n.y - y
        return (dx * dx + dy * dy) < 25 * 25
      })
      
      if (clicked && clicked.scene) {
        setScene(clicked.scene)
        if (onClose) onClose()
      }
    }
    
    canvas.addEventListener('click', handleClick)
    
    return () => {
      cancelAnimationFrame(animationFrameId)
      canvas.removeEventListener('click', handleClick)
    }
  }, [setScene, onClose])

  return (
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(255,255,255,0.95)',
      backdropFilter: 'blur(10px)',
      zIndex: 'var(--z-modal)',
      display: 'flex',
      flexDirection: 'column',
      padding: 'var(--space-4)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', color: 'var(--color-primary)' }}>Physics Concepts Graph</h2>
        {onClose && (
          <button 
            onClick={onClose}
            style={{ 
              padding: '8px 16px', 
              borderRadius: '20px', 
              border: 'none', 
              background: 'var(--color-border)',
              cursor: 'pointer'
            }}
          >
            Close
          </button>
        )}
      </div>
      <div style={{ flex: 1, position: 'relative', marginTop: 'var(--space-4)' }}>
        <canvas 
          ref={canvasRef} 
          style={{ width: '100%', height: '100%', borderRadius: '16px', border: '1px solid var(--color-border-md)' }} 
        />
      </div>
    </div>
  )
}
