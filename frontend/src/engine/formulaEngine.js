/**
 * VISIORA — Formula Engine Registry
 * 
 * Central dispatch. All scenes implement the PhysicsScene interface.
 * Adding a 6th scene = create a new file + register here. No other changes needed.
 */

import { gravityScene }     from './scenes/gravity'
import { projectileScene }  from './scenes/projectile'
import { pendulumScene }    from './scenes/pendulum'
import { collisionScene }   from './scenes/collision'
import { angularScene }     from './scenes/angular'

/** Registry of all available physics scenes */
const SCENE_REGISTRY = {
  gravity:    gravityScene,
  projectile: projectileScene,
  pendulum:   pendulumScene,
  collision:  collisionScene,
  angular:    angularScene,
}

/**
 * Compute formula state for a given scene and variable values.
 * This is the single entry point called by the store — never call scene modules directly.
 * 
 * @param {string} sceneId
 * @param {Record<string, number>} vars
 * @returns {FormulaResult | null}
 */
export function computeFormulaState(sceneId, vars) {
  const scene = SCENE_REGISTRY[sceneId]
  if (!scene) {
    console.warn(`[FormulaEngine] Unknown scene: "${sceneId}"`)
    return null
  }
  try {
    return scene.computeFormulaState(vars)
  } catch (err) {
    console.error(`[FormulaEngine] Error computing "${sceneId}":`, err)
    return null
  }
}

/**
 * Get the seed configuration for the Rapier simulation.
 * Called by scene components on mount or on variable change.
 */
export function getSeedSimulation(sceneId, vars) {
  const scene = SCENE_REGISTRY[sceneId]
  if (!scene) return null
  try {
    return scene.seedSimulation(vars)
  } catch (err) {
    console.error(`[FormulaEngine] Error seeding "${sceneId}":`, err)
    return null
  }
}

/**
 * Get graph definitions for a scene (which 2D graphs it supports).
 */
export function getGraphDefinitions(sceneId) {
  return SCENE_REGISTRY[sceneId]?.graphs ?? []
}

/**
 * Get all registered scenes.
 */
export function getAllScenes() {
  return Object.values(SCENE_REGISTRY)
}

/**
 * Check if a scene ID is valid.
 */
export function isValidScene(sceneId) {
  return sceneId in SCENE_REGISTRY
}

export { SCENE_REGISTRY }
