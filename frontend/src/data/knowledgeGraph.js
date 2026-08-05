/**
 * VISIORA — Knowledge Graph Data
 * 
 * Graph nodes = physics concepts
 * Graph edges = relationships (prerequisite, related, leads-to)
 * 
 * Stored as real graph structure so AI can traverse it programmatically.
 */

export const knowledgeGraph = {
  nodes: [
    {
      id: 'newtons_laws',
      label: "Newton's Laws",
      description: "The three fundamental laws governing motion: inertia, F=ma, and action-reaction.",
      scene: null,  // no simulation yet
      prerequisites: [],
      keyFormulas: ['F = ma', 'F₁₂ = -F₂₁'],
      difficulty: 1,
    },
    {
      id: 'gravity',
      label: 'Free Fall',
      description: 'All objects fall at the same rate regardless of mass in a uniform gravitational field.',
      scene: 'gravity',
      prerequisites: ['newtons_laws'],
      keyFormulas: ['t = √(2h/g)', 'v = √(2gh)', 'F = mg'],
      difficulty: 1,
    },
    {
      id: 'projectile',
      label: 'Projectile Motion',
      description: 'Combines horizontal uniform motion and vertical free fall. The two dimensions are independent.',
      scene: 'projectile',
      prerequisites: ['gravity'],
      keyFormulas: ['R = v²sin(2θ)/g', 'H = v²sin²θ/(2g)', 'T = 2vsinθ/g'],
      difficulty: 2,
    },
    {
      id: 'energy',
      label: 'Energy Conservation',
      description: 'Energy cannot be created or destroyed, only transformed between kinetic and potential forms.',
      scene: null,
      prerequisites: ['newtons_laws'],
      keyFormulas: ['KE = ½mv²', 'PE = mgh', 'KE + PE = const'],
      difficulty: 2,
    },
    {
      id: 'pendulum',
      label: 'Simple Pendulum',
      description: 'A classic example of energy conservation and simple harmonic motion.',
      scene: 'pendulum',
      prerequisites: ['gravity', 'energy'],
      keyFormulas: ['T = 2π√(L/g)', 'v_max = √(2gL(1-cosθ))'],
      difficulty: 2,
    },
    {
      id: 'momentum',
      label: 'Linear Momentum',
      description: 'The product of mass and velocity. Total momentum is conserved in isolated systems.',
      scene: null,
      prerequisites: ['newtons_laws'],
      keyFormulas: ['p = mv', 'Δp = FΔt (impulse)'],
      difficulty: 2,
    },
    {
      id: 'collision',
      label: 'Collisions',
      description: 'Elastic collisions conserve both momentum and kinetic energy. Inelastic collisions conserve only momentum.',
      scene: 'collision',
      prerequisites: ['momentum', 'energy'],
      keyFormulas: ['m₁u₁+m₂u₂ = m₁v₁+m₂v₂', 'e = (v₂-v₁)/(u₁-u₂)'],
      difficulty: 3,
    },
    {
      id: 'rotation',
      label: 'Rotational Motion',
      description: 'Objects can spin as well as translate. Torque causes angular acceleration.',
      scene: null,
      prerequisites: ['newtons_laws'],
      keyFormulas: ['τ = Iα', 'I = Σmr²'],
      difficulty: 3,
    },
    {
      id: 'angular',
      label: 'Angular Momentum',
      description: 'The rotational equivalent of linear momentum. Conserved when no external torque acts.',
      scene: 'angular',
      prerequisites: ['rotation', 'momentum'],
      keyFormulas: ['L = Iω', 'I₁ω₁ = I₂ω₂'],
      difficulty: 3,
    },
  ],

  edges: [
    { from: 'newtons_laws', to: 'gravity',    type: 'prerequisite', label: 'required for' },
    { from: 'gravity',      to: 'projectile', type: 'leads-to',     label: 'extends to' },
    { from: 'newtons_laws', to: 'energy',     type: 'leads-to',     label: 'leads to' },
    { from: 'energy',       to: 'pendulum',   type: 'prerequisite', label: 'required for' },
    { from: 'gravity',      to: 'pendulum',   type: 'related',      label: 'related to' },
    { from: 'newtons_laws', to: 'momentum',   type: 'leads-to',     label: 'leads to' },
    { from: 'momentum',     to: 'collision',  type: 'prerequisite', label: 'required for' },
    { from: 'energy',       to: 'collision',  type: 'prerequisite', label: 'required for' },
    { from: 'newtons_laws', to: 'rotation',   type: 'leads-to',     label: 'leads to' },
    { from: 'rotation',     to: 'angular',    type: 'prerequisite', label: 'required for' },
    { from: 'momentum',     to: 'angular',    type: 'related',      label: 'analogous to' },
    { from: 'collision',    to: 'angular',    type: 'related',      label: 'see also' },
    { from: 'projectile',   to: 'energy',     type: 'related',      label: 'uses' },
  ],

  // Suggested learning paths
  paths: [
    {
      id: 'beginner',
      label: 'Beginner Path',
      description: 'Start from scratch and build up to collisions',
      nodes: ['newtons_laws', 'gravity', 'energy', 'projectile', 'momentum', 'collision'],
    },
    {
      id: 'rotation_focus',
      label: 'Rotation & Spin',
      description: 'Focus on rotational mechanics',
      nodes: ['newtons_laws', 'rotation', 'angular', 'momentum'],
    },
  ],
}

/**
 * Get all nodes adjacent to a given node.
 * @param {string} nodeId
 * @returns {{ node, edge }[]}
 */
export function getNeighbors(nodeId) {
  const { nodes, edges } = knowledgeGraph
  const nodeMap = Object.fromEntries(nodes.map(n => [n.id, n]))
  return edges
    .filter(e => e.from === nodeId || e.to === nodeId)
    .map(e => ({
      edge: e,
      node: nodeMap[e.from === nodeId ? e.to : e.from],
    }))
    .filter(x => x.node)
}

/**
 * Get node by ID.
 */
export function getNode(nodeId) {
  return knowledgeGraph.nodes.find(n => n.id === nodeId) ?? null
}

/**
 * Get all nodes that have a simulation scene attached.
 */
export function getPlayableNodes() {
  return knowledgeGraph.nodes.filter(n => n.scene !== null)
}
