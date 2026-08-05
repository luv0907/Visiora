import React, { useState, useEffect, useRef } from 'react'
import { useStore } from '../store/useStore'
import { Mic, MicOff, Send, Sparkles } from 'lucide-react'

export default function UIOverlay() {
  const { scene, setScene, tutorMessage, setTutorMessage, triggerKeyEvent } = useStore()
  const [inputText, setInputText] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const recognitionRef = useRef(null)

  // Auto-dismiss tutor message after 1 second
  useEffect(() => {
    if (!tutorMessage) return
    const timer = setTimeout(() => setTutorMessage(null), 1000)
    return () => clearTimeout(timer)
  }, [tutorMessage])

  // Web Speech API Setup
  useEffect(() => {
    if ('webkitSpeechRecognition' in window) {
      const recognition = new window.webkitSpeechRecognition()
      recognition.continuous = false
      recognition.interimResults = false
      recognition.lang = 'en-US'

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript
        setInputText(transcript)
        handleProcessInput(transcript)
        setIsRecording(false)
      }

      recognition.onerror = (event) => {
        console.error('Speech recognition error', event.error)
        setIsRecording(false)
      }

      recognition.onend = () => {
        setIsRecording(false)
      }

      recognitionRef.current = recognition
    }
  }, [])

  const handleProcessInput = async (text) => {
    if (!text.trim()) return
    // Here we'd call the backend LLM router. For now, basic mock routing:
    const lower = text.toLowerCase()
    if (lower.includes('skater') || lower.includes('spin') || lower.includes('angular')) {
      setScene('angular', 'Observe how pulling arms in increases spin rate.')
    } else if (lower.includes('gravity') || lower.includes('fall') || lower.includes('mass')) {
      setScene('gravity', 'Drop objects of different mass to observe equal acceleration.')
    }
    // We will integrate the actual fetch call later in week 3.
  }

  const toggleRecording = () => {
    if (isRecording) {
      recognitionRef.current?.stop()
    } else {
      setInputText('')
      recognitionRef.current?.start()
      setIsRecording(true)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    handleProcessInput(inputText)
  }

  return (
    <div className="ui-container">
      <div className="header-bar">
        <div className="controls">
          <button 
            className={scene === 'gravity' ? 'active' : ''} 
            onClick={() => setScene('gravity', 'Drop objects of different mass to observe equal acceleration.')}
          >
            Gravity
          </button>
          <button 
            className={scene === 'angular' ? 'active' : ''} 
            onClick={() => setScene('angular', 'Observe how pulling arms in increases spin rate.')}
          >
            Angular Momentum
          </button>
          <button 
            className={scene === 'pendulum' ? 'active' : ''} 
            onClick={() => setScene('pendulum', 'Observe the transfer between potential and kinetic energy.')}
          >
            Pendulum
          </button>
          <button 
            className={scene === 'projectile' ? 'active' : ''} 
            onClick={() => setScene('projectile', 'Adjust angle and force to see projectile motion.')}
          >
            Projectile
          </button>
          <button 
            className={scene === 'collision' ? 'active' : ''} 
            onClick={() => setScene('collision', 'Observe momentum transfer during a collision.')}
          >
            Collision
          </button>
        </div>
        
        {/* Simulate session end explicit trigger */}
        <button 
          className="next-concept-btn"
          onClick={() => alert('Session complete. Triggering reflection...')}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={18} />
            Next Concept
          </span>
        </button>
      </div>

      {tutorMessage && (
        <div className="tutor-message-container">
          <div className="tutor-message">
            {tutorMessage}
          </div>
        </div>
      )}

      <div className="bottom-section">
        <form className="voice-input-container" onSubmit={handleSubmit}>
          <button type="button" className={`mic-button ${isRecording ? 'recording' : ''}`} onClick={toggleRecording}>
            {isRecording ? <MicOff size={22} /> : <Mic size={22} />}
          </button>
          <input 
            type="text" 
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Ask a physics question..." 
          />
          <button type="submit" className="send-button">
            <Send size={22} />
          </button>
        </form>
      </div>
    </div>
  )
}
