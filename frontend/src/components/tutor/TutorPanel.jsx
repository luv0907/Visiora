/**
 * VISIORA — Tutor Panel
 * Hybrid reactive/proactive AI tutor with optional voice.
 */
import React, { useState, useRef, useEffect } from 'react'
import { usePhysicsStore } from '../../store/usePhysicsStore'
import { useUIStore } from '../../store/useUIStore'
import { useAnalyticsStore } from '../../store/useAnalyticsStore'
import { parseIntent, getTutorReaction, synthesizeSpeech } from '../../api/client'
import { SCENE_META } from '../../config/physics'
import { Mic, MicOff, Send, Volume2, VolumeX, Sparkles, Bot, ChevronDown } from 'lucide-react'

export default function TutorPanel() {
  const { activeScene, variables, setScene, setVariable } = usePhysicsStore()
  const {
    tutorMessages, tutorLoading, voiceEnabled, voiceSpeed, addTutorMessage,
    setTutorLoading, setVoiceEnabled, setCurrentAudio, addToast,
  } = useUIStore()
  const { trackTutorQuery } = useAnalyticsStore()

  const [input, setInput] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const recognitionRef = useRef(null)
  const messagesEndRef = useRef(null)

  const activeMessages = tutorMessages[activeScene] || []

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [activeMessages])

  // Speech recognition setup
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) return
    const r = new SpeechRecognition()
    r.continuous = false
    r.interimResults = false
    r.lang = 'en-US'
    r.onresult = (e) => {
      const text = e.results[0][0].transcript
      setInput(text)
      setIsRecording(false)
      handleSubmitText(text)
    }
    r.onerror = () => setIsRecording(false)
    r.onend   = () => setIsRecording(false)
    recognitionRef.current = r
  }, [])

  const handleSubmitText = async (text) => {
    const trimmed = (text ?? input).trim()
    if (!trimmed || tutorLoading) return
    setInput('')
    trackTutorQuery(trimmed, activeScene)
    setTutorLoading(true)

    // Add user message
    addTutorMessage(activeScene, `You: ${trimmed}`, 'user')

    try {
      // 1. Try intent parsing (scene switch + parameters)
      const intent = await parseIntent(trimmed)

      if (intent.scene && intent.confidence > 0.6) {
        if (intent.scene !== activeScene) {
          setScene(intent.scene)
        }
        // Apply extracted parameters
        if (intent.parameters) {
          Object.entries(intent.parameters).forEach(([k, v]) => setVariable(k, v))
        }
      }

      // 2. Get tutor explanation
      const reaction = await getTutorReaction({
        scene: intent.scene ?? activeScene,
        event: `user_query: ${trimmed}`,
        variables: variables[activeScene] ?? {},
      })

      const msg = reaction.message ?? reaction.response ?? 'I can help you explore that!'
      addTutorMessage(activeScene, msg, 'reactive')

      // 3. TTS (if voice enabled)
      if (voiceEnabled && msg) {
        try {
          const audioUrl = await synthesizeSpeech(msg, voiceSpeed)
          const audio = new Audio(audioUrl)
          setCurrentAudio(audio)
          audio.play().catch(() => {})
        } catch { /* TTS optional, fail silently */ }
      }
    } catch (err) {
      const message = err.status === 429
        ? 'You\'re asking a lot — give me a moment to catch up! 😊'
        : err.status === 503
        ? 'The AI tutor is resting — try again soon!'
        : 'I\'m having trouble right now. Try rephrasing?'
      addTutorMessage(activeScene, message, 'error')
    } finally {
      setTutorLoading(false)
    }
  }

  const toggleRecording = () => {
    if (isRecording) {
      recognitionRef.current?.stop()
    } else {
      setInput('')
      recognitionRef.current?.start()
      setIsRecording(true)
    }
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: 'var(--color-surface)',
      borderRadius: 'var(--radius-lg)',
      border: '1px solid var(--color-border)',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 'var(--space-3) var(--space-4)',
        borderBottom: '1px solid var(--color-border)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <div style={{
            width: '28px', height: '28px',
            background: 'var(--color-primary-bg)',
            borderRadius: 'var(--radius-sm)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Bot size={14} style={{ color: 'var(--color-primary)' }} />
          </div>
          <h4 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'var(--text-sm)',
            fontWeight: 'var(--weight-semibold)',
            margin: 0,
          }}>
            AI Tutor
          </h4>
          {tutorLoading && (
            <div style={{
              width: '8px', height: '8px',
              borderRadius: '50%',
              background: 'var(--color-primary)',
              animation: 'pulse-ring 1.5s infinite',
            }} />
          )}
        </div>

        {/* Voice toggle */}
        <button
          onClick={() => setVoiceEnabled(!voiceEnabled)}
          title={voiceEnabled ? 'Disable voice' : 'Enable voice'}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: '32px', height: '32px',
            borderRadius: 'var(--radius-md)',
            border: 'none', cursor: 'pointer',
            background: voiceEnabled ? 'var(--color-primary-bg)' : 'var(--color-bg)',
            color: voiceEnabled ? 'var(--color-primary)' : 'var(--color-text-muted)',
            transition: 'all var(--duration-fast)',
          }}
        >
          {voiceEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
        </button>
      </div>

      {/* Messages */}
      <div style={{
        flex: 1, padding: 'var(--space-3)', overflowY: 'auto',
        display: 'flex', flexDirection: 'column', gap: 'var(--space-3)',
      }}>
        {activeMessages.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: 'var(--space-8) var(--space-4)',
            color: 'var(--color-text-muted)',
          }}>
            <Sparkles size={24} style={{ marginBottom: 'var(--space-2)', color: 'var(--color-primary)' }} />
            <p style={{ margin: 0, fontSize: 'var(--text-sm)', lineHeight: 'var(--leading-relaxed)' }}>
              Ask me anything about this simulation — or just try adjusting a variable and I'll explain what's happening!
            </p>
          </div>
        ) : (
          activeMessages.map(msg => (
            <TutorMessage key={msg.id} msg={msg} />
          ))
        )}

        {tutorLoading && <TypingIndicator />}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div style={{
        padding: 'var(--space-3)',
        borderTop: '1px solid var(--color-border)',
        flexShrink: 0,
      }}>
        <form
          onSubmit={(e) => { e.preventDefault(); handleSubmitText(input) }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            background: 'var(--color-bg)',
            border: '1.5px solid var(--color-border-md)',
            borderRadius: 'var(--radius-full)',
            padding: 'var(--space-1) var(--space-2)',
            transition: 'border-color var(--duration-fast)',
          }}
          onFocus={(e) => e.currentTarget.style.borderColor = 'var(--color-primary)'}
          onBlur={(e) => e.currentTarget.style.borderColor = 'var(--color-border-md)'}
        >
          <button
            type="button"
            onClick={toggleRecording}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: '32px', height: '32px',
              borderRadius: '50%', border: 'none', cursor: 'pointer',
              background: isRecording ? 'rgba(229,62,62,0.1)' : 'transparent',
              color: isRecording ? '#E53E3E' : 'var(--color-text-muted)',
              animation: isRecording ? 'pulse-ring 1.5s infinite' : 'none',
              flexShrink: 0,
            }}
          >
            {isRecording ? <MicOff size={15} /> : <Mic size={15} />}
          </button>

          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Ask about ${SCENE_META[activeScene]?.label || 'Physics'}...`}
            disabled={tutorLoading}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              fontFamily: 'var(--font-body)',
              fontSize: 'var(--text-sm)',
              color: 'var(--color-text)',
              padding: 'var(--space-2) 0',
              minWidth: 0,
            }}
          />

          <button
            type="submit"
            disabled={!input.trim() || tutorLoading}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: '32px', height: '32px',
              borderRadius: '50%', border: 'none', cursor: 'pointer',
              background: input.trim() ? 'var(--color-primary)' : 'var(--color-border)',
              color: 'white',
              transition: 'all var(--duration-fast) var(--ease-spring)',
              flexShrink: 0,
            }}
          >
            <Send size={14} />
          </button>
        </form>
      </div>
    </div>
  )
}

function TutorMessage({ msg }) {
  const isUser = msg.type === 'user'

  return (
    <div
      className="slide-up"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: isUser ? 'flex-end' : 'flex-start',
        gap: 'var(--space-1)',
      }}
    >
      <div style={{
        maxWidth: '90%',
        padding: 'var(--space-2) var(--space-3)',
        borderRadius: isUser
          ? 'var(--radius-lg) var(--radius-lg) var(--radius-xs) var(--radius-lg)'
          : 'var(--radius-lg) var(--radius-lg) var(--radius-lg) var(--radius-xs)',
        background: isUser ? 'var(--color-primary)' : 'var(--color-bg)',
        color: isUser ? 'white' : 'var(--color-text)',
        fontSize: 'var(--text-sm)',
        lineHeight: 'var(--leading-relaxed)',
        border: isUser ? 'none' : '1px solid var(--color-border)',
        boxShadow: isUser ? 'var(--shadow-pink)' : 'var(--shadow-xs)',
      }}>
        {msg.text}
      </div>
      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-faint)' }}>
        {new Date(msg.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </span>
    </div>
  )
}

function TypingIndicator() {
  return (
    <div style={{ display: 'flex', gap: '4px', padding: '8px 12px', alignItems: 'center' }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          width: '6px', height: '6px',
          borderRadius: '50%',
          background: 'var(--color-primary)',
          animation: `float 1.2s ${i * 0.2}s infinite`,
        }} />
      ))}
    </div>
  )
}
