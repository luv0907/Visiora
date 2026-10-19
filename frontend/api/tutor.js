/**
 * VISIORA — POST /api/tutor (Vercel server function).
 *
 * Calls Google Gemini on the server so the API key never reaches the browser.
 * Env (Vercel project settings, NOT prefixed with VITE_):
 *   GEMINI_API_KEY   required — from aistudio.google.com/apikey
 *   GEMINI_MODEL     optional — defaults to gemini-3.8-flash (2.5 models are closed to new API keys)
 *
 * Body: { message: string, history?: [{ role: 'user'|'assistant', content }] }
 * Reply: { data } with the normalized answer (see src/ai/tutorCore.js), or { error }.
 */
import { buildRequest, normalize } from '../src/ai/tutorCore.js'

const MAX_MESSAGE = 2000
const WINDOW_MS = 10 * 60 * 1000
const MAX_PER_WINDOW = 30
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

  const model = process.env.GEMINI_MODEL || 'gemini-3.8-flash'
  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify(buildRequest(message, body?.history)),
      signal: AbortSignal.timeout(45000),
    })
    if (r.status === 429) return res.status(429).json({ error: 'The free AI quota is used up for now. Please try again later.' })
    if (!r.ok) {
      console.error('[tutor] gemini error', r.status, (await r.text()).slice(0, 500))
      return res.status(502).json({ error: 'The AI service had a problem. Please try again.' })
    }
    const json = await r.json()
    const text = json?.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('') || ''
    let raw
    try {
      raw = JSON.parse(text.replace(/^```(?:json)?\s*/m, '').replace(/```\s*$/m, ''))
    } catch {
      console.error('[tutor] unparseable reply', text.slice(0, 300))
      return res.status(502).json({ error: 'The AI gave an unreadable answer. Please ask again.' })
    }
    return res.status(200).json({ data: normalize(raw), model })
  } catch (err) {
    console.error('[tutor] request failed', err?.name, err?.message)
    const timedOut = err?.name === 'TimeoutError'
    return res.status(timedOut ? 504 : 502).json({ error: timedOut ? 'The AI took too long. Please try again.' : 'Could not reach the AI service.' })
  }
}
