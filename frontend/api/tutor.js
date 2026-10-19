/**
 * VISIORA — POST /api/tutor (Vercel server function).
 *
 * Calls Google Gemini on the server so the API key never reaches the browser.
 * Env (Vercel project settings, NOT prefixed with VITE_):
 *   GEMINI_API_KEY   required — from aistudio.google.com/apikey
 *   GEMINI_MODEL     optional — first model to try; defaults to gemini-3.8-flash
 *
 * Free-tier models are often briefly overloaded (503) or out of quota (429), so each
 * question tries the main model twice, then falls back to other stable Flash models.
 *
 * Body: { message: string, history?: [{ role: 'user'|'assistant', content }] }
 * Reply: { data } with the normalized answer (see src/ai/tutorCore.js), or { error }.
 */
import { buildRequest, normalize } from '../src/ai/tutorCore.js'

const MAX_MESSAGE = 2000
const WINDOW_MS = 10 * 60 * 1000
const MAX_PER_WINDOW = 30
const FALLBACK_MODELS = ['gemini-3.6-flash', 'gemini-3.5-flash-lite']
const ATTEMPT_TIMEOUT_MS = 30000
const TOTAL_BUDGET_MS = 80000
const RETRYABLE = new Set([404, 429, 500, 503, 504])
const hits = new Map() // best-effort per-instance limit; resets when the instance recycles

function rateLimited(ip) {
  const now = Date.now()
  const recent = (hits.get(ip) || []).filter(ts => now - ts < WINDOW_MS)
  recent.push(now)
  hits.set(ip, recent)
  if (hits.size > 5000) hits.clear()
  return recent.length > MAX_PER_WINDOW
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Use POST.' })
  }

  const key = process.env.GEMINI_API_KEY
  if (!key) return res.status(503).json({ error: 'The AI tutor is not set up yet (missing GEMINI_API_KEY).' })

  const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim()
  if (rateLimited(ip)) return res.status(429).json({ error: 'Too many questions in a short time. Please wait a few minutes.' })

  let body = req.body
  if (typeof body === 'string') {
    try { body = JSON.parse(body) } catch { body = {} }
  }
  const message = typeof body?.message === 'string' ? body.message.trim() : ''
  if (!message) return res.status(400).json({ error: 'Please type a question.' })
  if (message.length > MAX_MESSAGE) return res.status(400).json({ error: `Please keep questions under ${MAX_MESSAGE} characters.` })

  const primary = process.env.GEMINI_MODEL || 'gemini-3.8-flash'
  const attempts = [primary, primary, ...FALLBACK_MODELS.filter(m => m !== primary)]
  const payload = JSON.stringify(buildRequest(message, body?.history))
  const deadline = Date.now() + TOTAL_BUDGET_MS
  let lastStatus = 0
  let lastTimedOut = false

  for (let i = 0; i < attempts.length; i++) {
    const model = attempts[i]
    const remaining = deadline - Date.now()
    if (remaining < 5000) break
    if (i > 0) await new Promise(r => setTimeout(r, i === 1 ? 800 : 300))
    let r
    try {
      r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
        body: payload,
        signal: AbortSignal.timeout(Math.min(ATTEMPT_TIMEOUT_MS, remaining)),
      })
    } catch (err) {
      lastTimedOut = err?.name === 'TimeoutError'
      console.error('[tutor] request failed', model, err?.name, err?.message)
      continue
    }
    if (!r.ok) {
      lastStatus = r.status
      lastTimedOut = false
      console.error('[tutor] gemini error', model, r.status, (await r.text()).slice(0, 300))
      if (RETRYABLE.has(r.status)) continue
      break
    }
    const json = await r.json()
    const text = json?.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('') || ''
    let raw
    try {
      raw = JSON.parse(text.replace(/^```(?:json)?\s*/m, '').replace(/```\s*$/m, ''))
    } catch {
      console.error('[tutor] unparseable reply', model, text.slice(0, 300))
      continue
    }
    return res.status(200).json({ data: normalize(raw), model })
  }

  if (lastStatus === 429) return res.status(429).json({ error: 'The free AI quota is used up for now. Please try again later.' })
  if (lastTimedOut) return res.status(504).json({ error: 'The AI took too long. Please try again.' })
  return res.status(502).json({ error: 'The AI is very busy right now. Please try again in a minute.' })
}
