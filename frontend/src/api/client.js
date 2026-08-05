/**
 * VISIORA — API Client
 * Typed client for all backend calls. All LLM/TTS calls go through backend only.
 * API keys NEVER exposed to frontend.
 */
import { API_CONFIG } from '../config/physics'

import { auth } from '../lib/firebase'

class ApiError extends Error {
  constructor(message, status, data) {
    super(message)
    this.status = status
    this.data = data
  }
}

async function request(path, options = {}) {
  const { timeout = API_CONFIG.TIMEOUT_MS, ...fetchOpts } = options
  const url = `${API_CONFIG.BASE_URL}${path}`

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)

  try {
    let token = null
    if (auth?.currentUser) {
      token = await auth.currentUser.getIdToken()
    } else if (import.meta.env.VITE_ENVIRONMENT === 'development') {
      token = localStorage.getItem('dev_token_bypass')
    }

    const headers = {
      'Content-Type': 'application/json',
      ...fetchOpts.headers,
    }
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const res = await fetch(url, {
      ...fetchOpts,
      signal: controller.signal,
      credentials: 'include',  // httpOnly cookies for auth
      headers,
    })
    clearTimeout(timer)

    const requestId = res.headers.get('X-Request-ID') || 'unknown'

    // Handle standard envelope parsing
    const data = await res.json().catch(() => ({}))
    
    if (!res.ok || (data && typeof data === 'object' && data.success === false)) {
      if (res.status === 429) throw new ApiError('Rate limit exceeded. Please wait a moment.', 429, data)
      if (res.status === 503) throw new ApiError('AI tutor temporarily unavailable.', 503, data)
      
      const errorObj = data.error || {}
      const errorMsg = errorObj.message || data.detail || `Request failed (${res.status})`
      const errorCode = errorObj.code || 'unknown_error'
      
      console.error(`[VISIORA API ERROR] ${errorCode} — ${errorMsg} — request: ${requestId}`)
      throw new ApiError(errorMsg, res.status, errorObj)
    }

    // Return unwrapped data if it follows the envelope, otherwise return raw JSON
    return (data && typeof data === 'object' && 'success' in data) ? data.data : data
  } catch (err) {
    clearTimeout(timer)
    if (err.name === 'AbortError') {
      console.error("[VISIORA NETWORK ERROR] Could not reach backend — check it's running and CORS origin matches.")
      throw new ApiError('Request timed out.', 408, {})
    }
    if (err instanceof TypeError && err.message.includes('fetch')) {
      console.error("[VISIORA NETWORK ERROR] Could not reach backend — check it's running and CORS origin matches.")
    }
    throw err
  }
}

// Retry wrapper with exponential backoff
async function withRetry(fn, retries = API_CONFIG.RETRY_ATTEMPTS, delayMs = API_CONFIG.RETRY_DELAY_MS) {
  let lastErr
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn()
    } catch (err) {
      lastErr = err
      // Don't retry on client errors (4xx) or rate limits
      if (err.status >= 400 && err.status < 500) throw err
      if (i < retries) await new Promise(r => setTimeout(r, delayMs * Math.pow(2, i)))
    }
  }
  throw lastErr
}

// ── Intent / Scene Parsing ────────────────────────────────────────
export async function parseIntent(text) {
  return withRetry(() => request('/api/v1/intent', {
    method: 'POST',
    body: JSON.stringify({ text }),
  }))
}

export async function generateSimulation(text) {
  // Use a longer timeout for LLM generation
  return withRetry(() => request('/api/v1/generate-sim', {
    method: 'POST',
    body: JSON.stringify({ text }),
    timeout: 60000,
  }), 1, 1000)
}

// ── Tutor ────────────────────────────────────────────────────────
export async function getTutorReaction({ scene, event, variables, idleTime = 0 }) {
  return withRetry(() => request('/api/v1/tutor/react', {
    method: 'POST',
    body: JSON.stringify({ scene, event, variables, idle_time: idleTime }),
  }))
}

export async function getTutorProactive({ scene, variables }) {
  return withRetry(() => request('/api/v1/tutor/proactive', {
    method: 'POST',
    body: JSON.stringify({ scene, variables }),
  }))
}

// ── TTS ──────────────────────────────────────────────────────────
export async function synthesizeSpeech(text, speed = 1.0) {
  const res = await fetch(`${API_CONFIG.BASE_URL}/api/v1/tts`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, speed }),
  })
  if (!res.ok) throw new ApiError('TTS unavailable', res.status, {})
  const blob = await res.blob()
  return URL.createObjectURL(blob)
}

// ── Knowledge Graph ───────────────────────────────────────────────
export async function fetchKnowledgeGraph() {
  return request('/api/v1/knowledge-graph')
}

// ── Auth ─────────────────────────────────────────────────────────
export async function loginWithFirebase(idToken) {
  return request('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ id_token: idToken }),
  })
}

export async function logout() {
  return request('/api/v1/auth/logout', { method: 'POST' })
}

export async function getCurrentUser() {
  return request('/api/v1/auth/me')
}

// ── Progress ─────────────────────────────────────────────────────
export async function getProgress() {
  return request('/api/v1/progress')
}

export async function updateProfile(data) {
  return request('/api/v1/profile/me', {
    method: 'PUT',
    body: JSON.stringify(data)
  })
}

export async function updateClassCode(classCode) {
  return request('/api/v1/progress/class', {
    method: 'POST',
    body: JSON.stringify({ classCode })
  })
}

export async function logSession(data) {
  // data: { conceptId, durationSeconds, questionsAsked, variablesChanged }
  return request('/api/v1/sessions', {
    method: 'POST',
    body: JSON.stringify(data)
  })
}

// Sends integer-indexed answers; backend grades and returns mastery directly.
export async function submitQuiz(conceptId, answers) {
  return request('/api/v1/quiz/submit', {
    method: 'POST',
    body: JSON.stringify({ conceptId, answers }),
  })
}

// Grades a single question immediately after student commits — answer key revealed
// only post-commit, preserving the security model while enabling instant feedback.
export async function submitAnswer(conceptId, questionId, selectedIndex) {
  return request(`/api/v1/quiz/${conceptId}/answer`, {
    method: 'POST',
    body: JSON.stringify({ questionId, selectedIndex }),
  })
}

export async function fetchQuiz(conceptId) {
  return request(`/api/v1/quiz/${conceptId}`)
}

// ── Analytics ────────────────────────────────────────────────────
export async function sendAnalyticsEvent(event) {
  // Best-effort, don't retry, don't throw
  try {
    await request('/api/v1/analytics/event', {
      method: 'POST',
      body: JSON.stringify(event),
    })
  } catch { /* silent fail */ }
}

export { ApiError }
