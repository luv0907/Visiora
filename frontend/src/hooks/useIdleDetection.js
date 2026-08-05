import { useEffect, useRef } from 'react'
import { useUIStore } from '../store/useUIStore'
import { usePhysicsStore } from '../store/usePhysicsStore'
import { getTutorProactive } from '../api/client'

export function useIdleDetection(idleTimeMs = 30000) {
  const timeoutRef = useRef(null)
  const lastActiveRef = useRef(Date.now())
  const { tutorLoading, addTutorMessage } = useUIStore()
  const { activeScene, variables } = usePhysicsStore()

  useEffect(() => {
    const handleActivity = () => {
      lastActiveRef.current = Date.now()
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      
      timeoutRef.current = setTimeout(async () => {
        // Only trigger proactive message if tutor isn't already doing something
        if (!tutorLoading) {
          try {
            const response = await getTutorProactive({
              scene: activeScene,
              variables: variables[activeScene] || {}
            })
            if (response && response.message) {
              addTutorMessage(activeScene, response.message, 'proactive')
            }
          } catch (err) {
            // Silently fail on idle proactive messages
          }
        }
      }, idleTimeMs)
    }

    // Attach event listeners
    const events = ['mousedown', 'keydown', 'touchstart', 'scroll']
    events.forEach(event => document.addEventListener(event, handleActivity))

    // Start initial timer
    handleActivity()

    return () => {
      events.forEach(event => document.removeEventListener(event, handleActivity))
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [idleTimeMs, tutorLoading, activeScene, variables, addTutorMessage])
}
