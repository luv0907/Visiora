/**
 * VISIORA — AITutorStudio.jsx
 * 
 * Complete Redesign based on 20 user-defined design requirements:
 * 1. Claude aesthetic with warm Visiora cream, navy, and white palette.
 * 2. Inline 2D interactive canvas simulations directly embedded in the chat stream.
 * 3. Word-by-word streaming response effect with cursor animation.
 * 4. Clean empty welcome state with NO suggestion cards.
 * 5. Per-user chat history with sidebar management (New Chat, Delete, Switch).
 * 6. Visible Model Selector (Qwen 2.5, Gemini 2.0, Groq Llama 3.3, Offline Physics).
 * 7. Multi-turn context awareness (passes conversation history to backend).
 * 8. Visiora Lotus avatar emblem.
 * 9. Clean Unicode formulas (no raw LaTeX artifacts).
 * 10. Conditional takeaways (shown only for complex concepts).
 * 11. Per-message actions: Copy, Share, Download summary.
 * 12. Interactive Physics Sketchpad modal for drawing diagrams.
 * 13. Mobile-friendly responsive drawer & touch-enabled simulation controls.
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import {
  PanelLeft,
  PanelLeftClose,
  Plus,
  Send,
  X,
  Trash2,
  CheckCircle2,
  MessageSquare,
  ChevronRight,
  Loader2,
  Copy,
  Check,
  Share2,
  Download,
  PenTool,
  RotateCcw,
  Sliders,
  Menu,
  Sparkles,
  Bot,
  User,
  ChevronDown
} from 'lucide-react'
import { useAuthStore } from '../../store/useAuthStore'
import AIInteractiveCanvas from './AIInteractiveCanvas'

// ── Visiora Lotus Avatar SVG ──────────────────────────────────────
function VisioraLotus({ size = 20, color = '#002B66' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M16 3C16 3 10.5 11 10.5 17.5C10.5 22 13 25.5 16 27C19 25.5 21.5 22 21.5 17.5C21.5 11 16 3 16 3Z" fill={color} fillOpacity="0.9" />
      <path d="M16 11C12.5 11 6.5 15.5 6.5 21C6.5 24.5 9 26.5 12 27C14 25.5 15.5 22 16 18.5V11Z" fill={color} fillOpacity="0.65" />
      <path d="M16 11C19.5 11 25.5 15.5 25.5 21C25.5 24.5 23 26.5 20 27C18 25.5 16.5 22 16 18.5V11Z" fill={color} fillOpacity="0.65" />
      <path d="M16 18.5C11.5 18.5 4 19.5 2 24C4.8 28 8.8 28.5 12 27.5C14.2 25.8 15.5 22.8 16 18.5Z" fill={color} fillOpacity="0.4" />
      <path d="M16 18.5C20.5 18.5 28 19.5 30 24C27.2 28 23.2 28.5 20 27.5C17.8 25.8 16.5 22.8 16 18.5Z" fill={color} fillOpacity="0.4" />
    </svg>
  )
}

// ── Model Options ────────────────────────────────────────────────
const MODEL_OPTIONS = [
  { id: 'gemini', label: 'Gemini', badge: 'Free', desc: 'Google Gemini, with numerical answers checked by Visiora\'s physics engine' }
]


// ── Clean LaTeX to Readable Unicode ──────────────────────────────
function cleanFormula(raw) {
  if (!raw) return ''
  return raw
    .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1) / ($2)')
    .replace(/\\sqrt\{([^}]+)\}/g, '√($1)')
    .replace(/\\sin/g, 'sin').replace(/\\cos/g, 'cos').replace(/\\tan/g, 'tan')
    .replace(/\\theta/g, 'θ').replace(/\\pi/g, 'π').replace(/\\alpha/g, 'α')
    .replace(/\\beta/g, 'β').replace(/\\gamma/g, 'γ').replace(/\\delta/g, 'δ')
    .replace(/\\omega/g, 'ω').replace(/\\lambda/g, 'λ').replace(/\\mu/g, 'μ')
    .replace(/\\rho/g, 'ρ').replace(/\\sigma/g, 'σ').replace(/\\tau/g, 'τ')
    .replace(/\\quad/g, '   ').replace(/\\cdot/g, ' · ').replace(/\\times/g, ' × ')
    .replace(/\\leq/g, '≤').replace(/\\geq/g, '≥').replace(/\\neq/g, '≠')
    .replace(/\\approx/g, '≈').replace(/\\infty/g, '∞')
    .replace(/\^2/g, '²').replace(/\^3/g, '³')
    .replace(/_0/g, '₀').replace(/_1/g, '₁').replace(/_2/g, '₂')
    .replace(/\{/g, '').replace(/\}/g, '')
    .replace(/\\/g, '')
    .trim()
}

// ── Markdown Parser with Inline Formatting ───────────────────────
function renderMarkdown(text) {
  if (!text) return null
  const paragraphs = text.split(/\n\n+/)
  return paragraphs.map((para, pIdx) => {
    const lines = para.split('\n')
    return (
      <div key={pIdx} style={{ marginBottom: 12 }}>
        {lines.map((line, lIdx) => {
          const trimmed = line.trim()
          if (!trimmed) return null

          const isBullet = trimmed.startsWith('- ') || trimmed.startsWith('* ')
          const cleanLine = isBullet ? trimmed.slice(2) : trimmed

          const parts = []
          const regex = /\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`|\$(.+?)\$/g
          let lastIndex = 0
          let match
          let k = 0
          while ((match = regex.exec(cleanLine)) !== null) {
            if (match.index > lastIndex) {
              parts.push(<span key={`t-${pIdx}-${lIdx}-${k++}`}>{cleanLine.slice(lastIndex, match.index)}</span>)
            }
            if (match[1]) {
              parts.push(<strong key={`b-${pIdx}-${lIdx}-${k++}`} style={{ fontWeight: 650, color: '#002B66' }}>{match[1]}</strong>)
            } else if (match[2]) {
              parts.push(<em key={`i-${pIdx}-${lIdx}-${k++}`} style={{ fontStyle: 'italic' }}>{match[2]}</em>)
            } else if (match[3]) {
              parts.push(
                <code key={`c-${pIdx}-${lIdx}-${k++}`} style={{ background: '#EDE8E0', padding: '2px 6px', borderRadius: 4, fontSize: '0.88em', fontFamily: 'monospace', color: '#002B66' }}>
                  {match[3]}
                </code>
              )
            } else if (match[4]) {
              parts.push(
                <span key={`m-${pIdx}-${lIdx}-${k++}`} style={{ fontFamily: "'Courier New', monospace", fontWeight: 600, color: '#D97706', padding: '0 2px' }}>
                  {cleanFormula(match[4])}
                </span>
              )
            }
            lastIndex = match.index + match[0].length
          }
          if (lastIndex < cleanLine.length) {
            parts.push(<span key={`e-${pIdx}-${lIdx}-${k++}`}>{cleanLine.slice(lastIndex)}</span>)
          }

          if (isBullet) {
            return (
              <div key={lIdx} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, margin: '4px 0 4px 6px', lineHeight: 1.65 }}>
                <span style={{ color: '#002B66', fontSize: 13, lineHeight: '22px' }}>•</span>
                <span style={{ flex: 1 }}>{parts.length > 0 ? parts : cleanLine}</span>
              </div>
            )
          }

          return (
            <p key={lIdx} style={{ margin: '0 0 6px 0', lineHeight: 1.68 }}>
              {parts.length > 0 ? parts : line}
            </p>
          )
        })}
      </div>
    )
  })
}

// ── Sketch Pad Modal ─────────────────────────────────────────────
function SketchModal({ isOpen, onClose, onAttach }) {
  const canvasRef = useRef(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasDrawing, setHasDrawing] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.lineWidth = 3
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = '#002B66'
    setHasDrawing(false)
  }, [isOpen])

  if (!isOpen) return null

  const getPos = (e) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    return {
      x: (clientX - rect.left) * (canvas.width / rect.width),
      y: (clientY - rect.top) * (canvas.height / rect.height)
    }
  }

  const startDraw = (e) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const pos = getPos(e)
    ctx.beginPath()
    ctx.moveTo(pos.x, pos.y)
    setIsDrawing(true)
    setHasDrawing(true)
  }

  const draw = (e) => {
    if (!isDrawing) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const pos = getPos(e)
    ctx.lineTo(pos.x, pos.y)
    ctx.stroke()
  }

  const stopDraw = () => {
    setIsDrawing(false)
  }

  const handleClear = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    setHasDrawing(false)
  }

  const handleSave = () => {
    onAttach('I drew a physics diagram with a trajectory and forces. Can you explain the underlying physics laws and simulate it?')
    onClose()
  }

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(5px)',
      zIndex: 99999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 16
    }}>
      <div style={{
        background: '#FAF8F5',
        borderRadius: 16,
        maxWidth: 520,
        width: '100%',
        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.3)',
        border: '1px solid #E5DFD4',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{
          padding: '14px 18px',
          background: '#FFFFFF',
          borderBottom: '1px solid #E5DFD4',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <PenTool size={16} color="#002B66" />
            <span style={{ fontSize: 14, fontWeight: 700, color: '#002B66' }}>Sketch a Physics Problem</span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', padding: 4 }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ padding: 16 }}>
          <p style={{ margin: '0 0 10px', fontSize: 12.5, color: '#64748B' }}>
            Draw a projectile arc, pendulum angle, optical ray, or circuit loop with your mouse or touch:
          </p>
          <div style={{ border: '1.5px solid #DDD7CC', borderRadius: 10, overflow: 'hidden', background: '#FFFFFF' }}>
            <canvas
              ref={canvasRef}
              width={480}
              height={260}
              onMouseDown={startDraw}
              onMouseMove={draw}
              onMouseUp={stopDraw}
              onMouseLeave={stopDraw}
              onTouchStart={startDraw}
              onTouchMove={draw}
              onTouchEnd={stopDraw}
              style={{ width: '100%', height: 240, display: 'block', touchAction: 'none', cursor: 'crosshair' }}
            />
          </div>
        </div>

        <div style={{
          padding: '12px 18px',
          background: '#FFFFFF',
          borderTop: '1px solid #E5DFD4',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <button
            onClick={handleClear}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              padding: '6px 12px',
              background: '#FAF8F5',
              border: '1px solid #DDD7CC',
              borderRadius: 6,
              fontSize: 12,
              color: '#64748B',
              cursor: 'pointer'
            }}
          >
            <RotateCcw size={12} /> Clear
          </button>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={onClose}
              style={{
                padding: '6px 14px',
                background: 'transparent',
                border: 'none',
                fontSize: 12.5,
                color: '#64748B',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!hasDrawing}
              style={{
                padding: '7px 16px',
                background: hasDrawing ? '#002B66' : '#CBD5E1',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: 6,
                fontSize: 12.5,
                fontWeight: 600,
                cursor: hasDrawing ? 'pointer' : 'default',
                transition: 'background 0.15s'
              }}
            >
              Ask AI about Sketch
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════
// MAIN COMPONENT: AITutorStudio
// ══════════════════════════════════════════════════════════════════
export default function AITutorStudio({ onClose, isModal = false }) {
  const user = useAuthStore(state => state.user)
  const userKey = user?.id || user?.uid || 'guest'
  const storageKey = `visiora_ai_tutor_chats_${userKey}`

  // ── Conversations state (Per-User) ──
  const [conversations, setConversations] = useState(() => {
    try {
      const stored = localStorage.getItem(storageKey)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed) && parsed.length > 0) return parsed
      }
      // Check legacy key if empty
      const legacy = localStorage.getItem('visiora_claude_chats')
      if (legacy) {
        const parsedLegacy = JSON.parse(legacy)
        if (Array.isArray(parsedLegacy) && parsedLegacy.length > 0) return parsedLegacy
      }
    } catch {}
    return [{
      id: `chat-${Date.now()}`,
      title: 'New Conversation',
      model: 'gemini',
      updatedAt: new Date().toISOString(),
      messages: []
    }]
  })

  const [activeChatId, setActiveChatId] = useState(() => conversations[0]?.id || `chat-${Date.now()}`)
  const [selectedModel, setSelectedModel] = useState('gemini')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false)
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [copiedMsgId, setCopiedMsgId] = useState(null)
  const [sketchOpen, setSketchOpen] = useState(false)
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false)

  // Word-by-word streaming state
  const [streamingMsgId, setStreamingMsgId] = useState(null)
  const [streamedText, setStreamedText] = useState('')

  const endRef = useRef(null)
  const inputRef = useRef(null)
  const streamIntervalRef = useRef(null)

  const currentChat = conversations.find(c => c.id === activeChatId) || conversations[0]
  const hasMessages = currentChat?.messages?.length > 0

  // Persist conversations on change
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(conversations))
    } catch {}
  }, [conversations, storageKey])

  // Scroll to bottom when messages or streaming text updates
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [currentChat?.messages, streamedText, isLoading])

  // Handle word-by-word streaming effect
  const startStreaming = useCallback((msgId, fullText, onDone) => {
    if (streamIntervalRef.current) clearInterval(streamIntervalRef.current)
    setStreamingMsgId(msgId)
    setStreamedText('')

    const words = fullText.split(' ')
    let currentIdx = 0

    streamIntervalRef.current = setInterval(() => {
      currentIdx++
      if (currentIdx <= words.length) {
        setStreamedText(words.slice(0, currentIdx).join(' '))
      } else {
        clearInterval(streamIntervalRef.current)
        setStreamingMsgId(null)
        setStreamedText('')
        if (onDone) onDone()
      }
    }, 28) // 28ms delay per word for pleasant organic pacing
  }, [])

  useEffect(() => {
    return () => {
      if (streamIntervalRef.current) clearInterval(streamIntervalRef.current)
    }
  }, [])

  // Create new conversation
  const handleNewChat = () => {
    const id = `chat-${Date.now()}`
    const chat = {
      id,
      title: 'New Conversation',
      model: selectedModel,
      updatedAt: new Date().toISOString(),
      messages: []
    }
    setConversations(prev => [chat, ...prev])
    setActiveChatId(id)
    setInput('')
    setMobileDrawerOpen(false)
  }

  // Delete conversation
  const handleDeleteChat = (e, id) => {
    e.stopPropagation()
    const rest = conversations.filter(c => c.id !== id)
    if (rest.length === 0) return handleNewChat()
    setConversations(rest)
    if (activeChatId === id) {
      setActiveChatId(rest[0].id)
    }
  }

  // Copy message text
  const handleCopy = (id, text) => {
    navigator.clipboard.writeText(text)
    setCopiedMsgId(id)
    setTimeout(() => setCopiedMsgId(null), 2000)
  }

  // Export conversation as text file
  const handleExportChat = () => {
    if (!currentChat || !currentChat.messages?.length) return
    let md = `# Visiora Physics AI Conversation — ${currentChat.title}\nDate: ${new Date().toLocaleDateString()}\nModel: ${selectedModel}\n\n---\n\n`
    currentChat.messages.forEach(m => {
      const role = m.role === 'user' ? 'Student' : 'Visiora AI Tutor'
      md += `### ${role}:\n${m.content}\n\n`
      if (m.formula) md += `**Formula:** \`${m.formula}\`\n\n`
      if (m.takeaways?.length) {
        md += `**Key Insights:**\n` + m.takeaways.map(t => `- ${t}`).join('\n') + '\n\n'
      }
      md += '---\n\n'
    })
    const blob = new Blob([md], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${currentChat.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_notes.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Send message
  const handleSend = async (customPrompt) => {
    const text = (customPrompt || input).trim()
    if (!text || isLoading) return

    const userMsg = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: text,
      ts: new Date().toISOString()
    }

    const chatTitle = !hasMessages
      ? (text.length > 32 ? text.slice(0, 32) + '…' : text)
      : currentChat.title

    // Append user message immediately
    setConversations(prev =>
      prev.map(c => c.id === activeChatId
        ? {
            ...c,
            title: chatTitle,
            updatedAt: new Date().toISOString(),
            messages: [...c.messages, userMsg]
          }
        : c
      )
    )

    setInput('')
    if (inputRef.current) inputRef.current.style.height = 'auto'
    setIsLoading(true)

    // Build past context for multi-turn awareness
    const historyMessages = (currentChat?.messages || []).map(m => ({
      role: m.role,
      content: m.content
    }))

    // One call to our own server function: the Gemini key stays on the server,
    // and numerical answers come back checked by Visiora's physics engine.
    const addAssistant = msg =>
      setConversations(prev =>
        prev.map(c => c.id === activeChatId
          ? { ...c, messages: [...c.messages, msg], updatedAt: new Date().toISOString() }
          : c
        )
      )
    try {
      const res = await fetch('/api/tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, history: historyMessages })
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json.data) throw new Error(json.error || 'The tutor could not answer right now. Please try again.')
      const d = json.data
      const newMsgId = `a-${Date.now()}`
      addAssistant({
        id: newMsgId,
        role: 'assistant',
        content: d.explanation,
        formula: d.formulas.join('   ·   '),
        topic: d.kind === 'greeting' || d.kind === 'off_topic' ? '' : d.title,
        takeaways: d.keyPoints,
        steps: d.steps,
        finalAnswer: d.finalAnswer,
        verification: d.verification,
        lab: d.lab,
        ts: new Date().toISOString()
      })
      startStreaming(newMsgId, d.explanation)
    } catch (err) {
      addAssistant({
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: err?.message && !/fetch|network/i.test(err.message)
          ? err.message
          : 'I could not reach the tutor. Check your internet connection and try again.',
        isError: true,
        ts: new Date().toISOString()
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (e) => {
    setInput(e.target.value)
    if (inputRef.current) {
      inputRef.current.style.height = 'auto'
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 140) + 'px'
    }
  }

  // Active Model Object
  const currentModelObj = MODEL_OPTIONS.find(m => m.id === selectedModel) || MODEL_OPTIONS[0]

  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      color: '#1E293B',
      overflow: 'hidden',
      background: '#FAF8F5',
      position: 'relative'
    }}>

      {/* ── Sketch Modal ────────────────────────────────────── */}
      <SketchModal
        isOpen={sketchOpen}
        onClose={() => setSketchOpen(false)}
        onAttach={(txt) => handleSend(txt)}
      />

      {/* ── Mobile Sidebar Drawer Overlay ───────────────────── */}
      {mobileDrawerOpen && (
        <div
          onClick={() => setMobileDrawerOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 43, 102, 0.4)',
            backdropFilter: 'blur(4px)',
            zIndex: 900
          }}
        />
      )}

      {/* ── SIDEBAR (Desktop & Mobile Drawer) ───────────────── */}
      <aside style={{
        width: 270,
        minWidth: 270,
        background: '#F4EFE6',
        borderRight: '1px solid #E5DFD4',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        position: 'relative',
        zIndex: 910,
        transition: 'transform 0.25s ease',
        ...(typeof window !== 'undefined' && window.innerWidth < 1024
          ? {
              position: 'fixed',
              top: 0,
              bottom: 0,
              left: 0,
              transform: mobileDrawerOpen ? 'translateX(0)' : 'translateX(-100%)',
              boxShadow: mobileDrawerOpen ? '6px 0 24px rgba(0, 43, 102, 0.15)' : 'none'
            }
          : {
              display: sidebarOpen ? 'flex' : 'none'
            }
        )
      }}>

        {/* Sidebar Header: New Chat + Close */}
        <div style={{ padding: '14px 14px 10px', display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            onClick={handleNewChat}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '9px 14px',
              background: '#FFFFFF',
              border: '1px solid #DDD7CC',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              color: '#002B66',
              cursor: 'pointer',
              boxShadow: '0 1px 3px rgba(0, 43, 102, 0.04)',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#002B66'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 43, 102, 0.1)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#DDD7CC'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 43, 102, 0.04)' }}
          >
            <Plus size={15} color="#002B66" />
            <span>New Chat</span>
          </button>

          <button
            onClick={() => {
              setSidebarOpen(false)
              setMobileDrawerOpen(false)
            }}
            title="Collapse Sidebar"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#78716C',
              cursor: 'pointer',
              padding: 6,
              borderRadius: 6,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <PanelLeftClose size={17} />
          </button>
        </div>

        {/* Chat History List */}
        <div style={{ padding: '6px 16px 4px', fontSize: 11, fontWeight: 700, color: '#78716C', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Conversations
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '4px 8px 12px' }}>
          {conversations.map(c => {
            const active = c.id === activeChatId
            return (
              <div
                key={c.id}
                onClick={() => {
                  setActiveChatId(c.id)
                  setMobileDrawerOpen(false)
                }}
                style={{
                  padding: '8px 12px',
                  borderRadius: 8,
                  cursor: 'pointer',
                  background: active ? '#FFFFFF' : 'transparent',
                  boxShadow: active ? '0 1px 4px rgba(0, 43, 102, 0.06)' : 'none',
                  border: active ? '1px solid #E5DFD4' : '1px solid transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 3,
                  transition: 'background 0.15s ease'
                }}
                onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.6)' }}
                onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden', minWidth: 0 }}>
                  <MessageSquare size={13} color={active ? '#002B66' : '#78716C'} style={{ flexShrink: 0 }} />
                  <span style={{
                    fontSize: 12.5,
                    fontWeight: active ? 650 : 500,
                    color: active ? '#002B66' : '#475569',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {c.title}
                  </span>
                </div>

                {conversations.length > 1 && (
                  <button
                    onClick={(e) => handleDeleteChat(e, c.id)}
                    title="Delete Chat"
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#94A3B8',
                      cursor: 'pointer',
                      padding: 2,
                      opacity: active ? 0.8 : 0.3,
                      transition: 'color 0.15s, opacity 0.15s'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.color = '#EF4444'; e.currentTarget.style.opacity = '1' }}
                    onMouseLeave={e => { e.currentTarget.style.color = '#94A3B8'; e.currentTarget.style.opacity = active ? '0.8' : '0.3' }}
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            )
          })}
        </div>

        {/* ── Sidebar Footer: Model Selector Dropdown ───────── */}
        <div style={{
          padding: '12px 14px',
          borderTop: '1px solid #E5DFD4',
          background: '#EDE8DF',
          position: 'relative'
        }}>
          {modelDropdownOpen && (
            <div style={{
              position: 'absolute',
              bottom: '100%',
              left: 10,
              right: 10,
              marginBottom: 6,
              background: '#FFFFFF',
              borderRadius: 10,
              boxShadow: '0 8px 24px rgba(0, 43, 102, 0.15)',
              border: '1px solid #E5DFD4',
              overflow: 'hidden',
              zIndex: 999
            }}>
              <div style={{ padding: '8px 12px', fontSize: 11, fontWeight: 700, color: '#78716C', textTransform: 'uppercase', borderBottom: '1px solid #F1ECE3' }}>
                Select AI Engine
              </div>
              {MODEL_OPTIONS.map(m => (
                <div
                  key={m.id}
                  onClick={() => {
                    setSelectedModel(m.id)
                    setModelDropdownOpen(false)
                  }}
                  style={{
                    padding: '8px 12px',
                    cursor: 'pointer',
                    background: selectedModel === m.id ? '#FAF8F5' : '#FFFFFF',
                    borderLeft: selectedModel === m.id ? '3px solid #002B66' : '3px solid transparent',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2,
                    transition: 'background 0.1s'
                  }}
                  onMouseEnter={e => { if (selectedModel !== m.id) e.currentTarget.style.background = '#F9F7F4' }}
                  onMouseLeave={e => { if (selectedModel !== m.id) e.currentTarget.style.background = '#FFFFFF' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 12.5, fontWeight: 650, color: '#002B66' }}>{m.label}</span>
                    <span style={{ fontSize: 9.5, fontWeight: 700, background: '#E2E8F0', padding: '1px 5px', borderRadius: 4, color: '#475569' }}>
                      {m.badge}
                    </span>
                  </div>
                  <span style={{ fontSize: 10.5, color: '#64748B' }}>{m.desc}</span>
                </div>
              ))}
            </div>
          )}

          <div
            onClick={() => setModelDropdownOpen(!modelDropdownOpen)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              padding: '6px 8px',
              borderRadius: 6,
              background: '#FFFFFF',
              border: '1px solid #DDD7CC'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, overflow: 'hidden' }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#10B981', flexShrink: 0 }} />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: 11.5, fontWeight: 700, color: '#002B66', whiteSpace: 'nowrap' }}>
                  {currentModelObj.label}
                </span>
                <span style={{ fontSize: 9.5, color: '#78716C' }}>{currentModelObj.badge}</span>
              </div>
            </div>
            <ChevronDown size={14} color="#64748B" />
          </div>
        </div>
      </aside>

      {/* ── MAIN CHAT VIEWPORT ──────────────────────────────── */}
      <main style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
        background: '#FAF8F5',
        position: 'relative'
      }}>

        {/* Top Header Bar */}
        <header style={{
          height: 48,
          minHeight: 48,
          padding: '0 18px',
          borderBottom: '1px solid #EAE5DC',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
          background: '#FAF8F5',
          zIndex: 10
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              onClick={() => {
                if (typeof window !== 'undefined' && window.innerWidth < 1024) {
                  setMobileDrawerOpen(true)
                } else {
                  setSidebarOpen(!sidebarOpen)
                }
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#002B66',
                cursor: 'pointer',
                padding: 4,
                borderRadius: 4,
                display: 'flex',
                alignItems: 'center'
              }}
              title="Toggle Sidebar"
            >
              <Menu size={18} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <VisioraLotus size={18} color="#002B66" />
              <span style={{ fontSize: 13.5, fontWeight: 700, color: '#002B66' }}>Visiora AI Tutor</span>
              <span style={{ color: '#94A3B8', fontSize: 12 }}>•</span>
              <span style={{
                fontSize: 12,
                color: '#64748B',
                maxWidth: 260,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                {currentChat?.title || 'New Conversation'}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {hasMessages && (
              <button
                onClick={handleExportChat}
                title="Download Conversation Notes"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '5px 10px',
                  background: '#FFFFFF',
                  border: '1px solid #DDD7CC',
                  borderRadius: 6,
                  fontSize: 11.5,
                  fontWeight: 600,
                  color: '#002B66',
                  cursor: 'pointer'
                }}
              >
                <Download size={13} />
                <span>Export</span>
              </button>
            )}

            {isModal && (
              <button
                onClick={onClose}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#64748B',
                  cursor: 'pointer',
                  padding: 4
                }}
              >
                <X size={18} />
              </button>
            )}
          </div>
        </header>

        {/* ── Messages Scroll Container ─────────────────────── */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px 18px 150px',
          display: 'flex',
          flexDirection: 'column'
        }}>

          {/* ── EMPTY STATE (User Requirement: Clean empty chat with just the input — NO suggestion cards) ── */}
          {!hasMessages && !isLoading && (
            <div style={{
              maxWidth: 580,
              margin: 'auto',
              textAlign: 'center',
              padding: '40px 20px'
            }}>
              <div style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                background: '#FFFFFF',
                border: '1.5px solid #E5DFD4',
                boxShadow: '0 6px 20px rgba(0, 43, 102, 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 20px'
              }}>
                <VisioraLotus size={34} color="#002B66" />
              </div>
              <h2 style={{
                margin: '0 0 8px',
                fontFamily: "'Georgia', serif",
                fontSize: 24,
                fontWeight: 600,
                color: '#002B66',
                letterSpacing: '-0.01em'
              }}>
                Visiora Physics Tutor
              </h2>
              <p style={{
                margin: 0,
                fontSize: 14.5,
                color: '#64748B',
                lineHeight: 1.6,
                maxWidth: 440,
                marginLeft: 'auto',
                marginRight: 'auto'
              }}>
                Ask any physics question to explore concepts with step-by-step guidance and interactive 2D simulations.
              </p>
            </div>
          )}

          {/* ── Chat Messages Stream ────────────────────────── */}
          {currentChat?.messages?.map(msg => {
            const isUser = msg.role === 'user'
            const isCurrentlyStreaming = streamingMsgId === msg.id
            const displayContent = isCurrentlyStreaming ? streamedText : msg.content

            return (
              <div
                key={msg.id}
                style={{
                  maxWidth: 780,
                  width: '100%',
                  margin: '0 auto 24px',
                  display: 'flex',
                  justifyContent: isUser ? 'flex-end' : 'flex-start',
                  gap: 12
                }}
              >
                {/* AI Lotus Avatar */}
                {!isUser && (
                  <div style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background: '#FFFFFF',
                    border: '1px solid #E5DFD4',
                    boxShadow: '0 2px 6px rgba(0, 43, 102, 0.06)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    marginTop: 2
                  }}>
                    <VisioraLotus size={18} color="#002B66" />
                  </div>
                )}

                {/* Message Content Container */}
                <div style={{
                  maxWidth: isUser ? '80%' : 'calc(100% - 44px)',
                  width: isUser ? 'auto' : '100%'
                }}>

                  {/* ── User Bubble ── */}
                  {isUser ? (
                    <div style={{
                      background: '#002B66',
                      color: '#FFFFFF',
                      borderRadius: '16px 16px 4px 16px',
                      padding: '11px 16px',
                      fontSize: 14,
                      lineHeight: 1.6,
                      boxShadow: '0 2px 8px rgba(0, 43, 102, 0.12)'
                    }}>
                      {msg.content}
                    </div>
                  ) : (
                    /* ── Assistant Card ── */
                    <div style={{
                      background: '#FFFFFF',
                      border: '1px solid #E5DFD4',
                      borderRadius: 14,
                      padding: '16px 20px',
                      boxShadow: '0 2px 10px rgba(0, 43, 102, 0.03)'
                    }}>

                      {/* Header info */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: 10,
                        paddingBottom: 8,
                        borderBottom: '1px solid #F4EFE6'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 12.5, fontWeight: 750, color: '#002B66' }}>Visiora AI</span>
                          {msg.topic && (
                            <span style={{ fontSize: 11, fontWeight: 600, color: '#D97706', background: 'rgba(217, 119, 6, 0.08)', padding: '1px 6px', borderRadius: 4 }}>
                              {msg.topic}
                            </span>
                          )}
                        </div>

                        {/* Message Actions */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <button
                            onClick={() => handleCopy(msg.id, msg.content)}
                            title="Copy explanation"
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: '#94A3B8',
                              cursor: 'pointer',
                              padding: 3,
                              borderRadius: 4,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4,
                              fontSize: 11
                            }}
                          >
                            {copiedMsgId === msg.id ? <Check size={13} color="#10B981" /> : <Copy size={13} />}
                            {copiedMsgId === msg.id && <span style={{ color: '#10B981' }}>Copied</span>}
                          </button>
                        </div>
                      </div>

                      {/* Rendered Text with streaming cursor */}
                      <div style={{ fontSize: 14.5, color: '#1E293B', lineHeight: 1.65 }}>
                        {renderMarkdown(displayContent)}
                        {isCurrentlyStreaming && (
                          <span style={{
                            display: 'inline-block',
                            width: 6,
                            height: 15,
                            background: '#002B66',
                            marginLeft: 4,
                            verticalAlign: 'middle',
                            animation: 'blink 0.8s infinite'
                          }} />
                        )}
                      </div>

                      {/* Formula Banner (Clean Unicode Math) */}
                      {msg.formula && (
                        <div style={{
                          marginTop: 12,
                          background: '#FAF8F5',
                          border: '1px solid #E5DFD4',
                          borderLeft: '3.5px solid #002B66',
                          borderRadius: '0 8px 8px 0',
                          padding: '10px 16px'
                        }}>
                          <div style={{ fontSize: 10, fontWeight: 750, color: '#002B66', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 2 }}>
                            Governing Formula
                          </div>
                          <div style={{ fontFamily: "'Courier New', monospace", fontSize: 13.5, fontWeight: 650, color: '#002B66' }}>
                            {msg.formula}
                          </div>
                        </div>
                      )}

                      {/* Worked solution, checked final answer, and the real lab to try it in */}
                      {msg.steps?.length > 0 && (
                        <ol style={{ margin: '14px 0 0', paddingLeft: 22, display: 'flex', flexDirection: 'column', gap: 6, fontSize: 14, color: '#1E293B', lineHeight: 1.55 }}>
                          {msg.steps.map((step, idx) => <li key={idx} style={{ whiteSpace: 'pre-wrap' }}>{step}</li>)}
                        </ol>
                      )}
                      {msg.finalAnswer && (
                        <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 10, background: '#F4F7FC', border: '1px solid #DCE5F3' }}>
                          <div style={{ fontSize: 11, fontWeight: 750, color: '#002B66', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Answer</div>
                          <div style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', marginTop: 2 }}>{msg.finalAnswer}</div>
                        </div>
                      )}
                      {msg.verification?.status === 'verified' && (
                        <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 650, color: '#047857' }}>
                          <CheckCircle2 size={14} /> {msg.verification.detail}
                        </div>
                      )}
                      {msg.verification?.status === 'corrected' && (
                        <div role="alert" style={{ marginTop: 8, padding: '8px 12px', borderRadius: 8, background: '#FFF7ED', border: '1px solid #FED7AA', fontSize: 13, fontWeight: 600, color: '#9A3412' }}>
                          {msg.verification.detail}
                        </div>
                      )}
                      {msg.lab && (
                        <a href={msg.lab.path} style={{ marginTop: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '12px 16px', borderRadius: 12, background: '#1C1713', color: '#F7F3EB', textDecoration: 'none' }}>
                          <span>
                            <span style={{ display: 'block', fontSize: 11, fontWeight: 750, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#E2C17D' }}>See it for yourself</span>
                            <span style={{ display: 'block', fontSize: 15, fontWeight: 700 }}>Open the {msg.lab.name}</span>
                            {msg.lab.reason && <span style={{ display: 'block', fontSize: 12.5, color: '#D9CDB8', marginTop: 2 }}>{msg.lab.reason}</span>}
                          </span>
                          <span aria-hidden="true" style={{ fontSize: 18 }}>→</span>
                        </a>
                      )}

                      {/* ── INLINE 2D INTERACTIVE SIMULATION CANVAS ── */}
                      {msg.artifact && (
                        <div style={{ marginTop: 14 }}>
                          <AIInteractiveCanvas
                            inline={true}
                            visualType={msg.artifact.visualType}
                            sliders={msg.artifact.sliders}
                            telemetryMetrics={msg.artifact.telemetryMetrics}
                            topic={msg.artifact.topic || msg.topic}
                            concept={msg.artifact.concept || msg.concept}
                          />
                        </div>
                      )}

                      {/* Key Takeaways (shown when present for complex concepts) */}
                      {msg.takeaways?.length > 0 && (
                        <div style={{
                          marginTop: 14,
                          paddingTop: 12,
                          borderTop: '1px solid #F4EFE6'
                        }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: 6, letterSpacing: '0.03em' }}>
                            Key Takeaways
                          </div>
                          {msg.takeaways.map((t, idx) => (
                            <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 7, fontSize: 13, color: '#334155', marginBottom: 4 }}>
                              <CheckCircle2 size={14} color="#10B981" style={{ marginTop: 2, flexShrink: 0 }} />
                              <span>{t}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })}

          {/* ── Thinking Indicator ── */}
          {isLoading && (
            <div style={{
              maxWidth: 780,
              width: '100%',
              margin: '0 auto 16px',
              display: 'flex',
              gap: 12,
              alignItems: 'center'
            }}>
              <div style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: '#FFFFFF',
                border: '1px solid #E5DFD4',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 6px rgba(0, 43, 102, 0.06)'
              }}>
                <VisioraLotus size={18} color="#002B66" />
              </div>
              <div style={{
                background: '#FFFFFF',
                border: '1px solid #E5DFD4',
                borderRadius: 12,
                padding: '8px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}>
                <Loader2 size={14} color="#002B66" style={{ animation: 'spin 1s linear infinite' }} />
                <span style={{ fontSize: 13, color: '#64748B' }}>
                  Formulating physics simulation…
                </span>
              </div>
            </div>
          )}

          <div ref={endRef} />
        </div>

        {/* ── FLOATING INPUT CONTAINER ──────────────────────── */}
        <div style={{
          position: 'absolute',
          bottom: 16,
          left: 18,
          right: 18,
          maxWidth: 780,
          margin: '0 auto',
          background: '#FFFFFF',
          border: '1.5px solid #DDD7CC',
          borderRadius: 16,
          boxShadow: '0 8px 30px rgba(0, 43, 102, 0.08)',
          padding: '10px 14px 8px',
          zIndex: 20
        }}>
          <textarea
            ref={inputRef}
            rows={1}
            value={input}
            onChange={handleInputChange}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
            placeholder="Ask any physics question (e.g. projectile at 45°, Snell's law refraction, pendulum frequency)…"
            style={{
              width: '100%',
              border: 'none',
              background: 'transparent',
              fontSize: 14.5,
              color: '#1E293B',
              outline: 'none',
              resize: 'none',
              maxHeight: 140,
              fontFamily: 'inherit',
              lineHeight: 1.5
            }}
          />

          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: 4,
            paddingTop: 4,
            borderTop: '1px solid #F8F5F0'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button
                onClick={() => setSketchOpen(true)}
                title="Sketch a Diagram"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '4px 8px',
                  background: '#FAF8F5',
                  border: '1px solid #E5DFD4',
                  borderRadius: 6,
                  fontSize: 11.5,
                  fontWeight: 600,
                  color: '#002B66',
                  cursor: 'pointer',
                  transition: 'border-color 0.15s'
                }}
              >
                <PenTool size={12} color="#002B66" />
                <span>Sketch Problem</span>
              </button>

              <span style={{ fontSize: 11, color: '#94A3B8' }}>
                {currentModelObj.label} · Enter ↵ to send
              </span>
            </div>

            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || isLoading}
              title="Send question"
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: input.trim() && !isLoading ? '#002B66' : '#E2E8F0',
                border: 'none',
                color: '#FFFFFF',
                cursor: input.trim() && !isLoading ? 'pointer' : 'default',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s ease'
              }}
            >
              <Send size={14} />
            </button>
          </div>
        </div>
      </main>

      {/* Global CSS for animations */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
    </div>
  )
}
