import React from 'react'

export default function GenericDiagram2D({ diagram }) {
  if (!diagram || !diagram.nodes) return null

  // Scaling factor for generic coordinates to pixels
  const scale = 60
  const offsetX = 300
  const offsetY = 200

  // Map nodes to dictionary for edge lookup
  const nodeMap = {}
  diagram.nodes.forEach(n => nodeMap[n.id] = n)

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0 }}>
        {/* Draw Edges */}
        {diagram.edges?.map((edge, i) => {
          const from = nodeMap[edge.from_node]
          const to = nodeMap[edge.to_node]
          if (!from || !to) return null
          
          const x1 = offsetX + from.position[0] * scale
          const y1 = offsetY + from.position[1] * scale
          const x2 = offsetX + to.position[0] * scale
          const y2 = offsetY + to.position[1] * scale

          const midX = (x1 + x2) / 2
          const midY = (y1 + y2) / 2

          return (
            <g key={`edge-${i}`}>
              <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--color-border-md)" strokeWidth="4" />
              {edge.label && (
                <text x={midX} y={midY - 10} fill="var(--color-primary)" fontSize="14" fontWeight="bold" textAnchor="middle">
                  {edge.label}
                </text>
              )}
            </g>
          )
        })}

        {/* Draw Nodes */}
        {diagram.nodes.map(node => {
          const x = offsetX + node.position[0] * scale
          const y = offsetY + node.position[1] * scale
          
          const isBattery = node.type === 'battery'
          
          return (
            <g key={node.id} transform={`translate(${x}, ${y})`}>
              <circle r="24" fill={isBattery ? "var(--color-accent)" : "white"} stroke={isBattery ? "var(--color-accent)" : "var(--color-border-md)"} strokeWidth="4" />
              <text y="40" fill="var(--color-text)" fontSize="14" fontWeight="bold" textAnchor="middle">
                {node.label}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
