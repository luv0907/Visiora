import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// In `npm run dev`, serve the Vercel function api/tutor.js too, so the AI tutor
// works locally (put GEMINI_API_KEY in frontend/.env.local; it never reaches the browser).
function devApiTutor() {
  return {
    name: 'dev-api-tutor',
    configureServer(server) {
      server.middlewares.use('/api/tutor', async (req, res) => {
        let raw = ''
        for await (const chunk of req) raw += chunk
        const { default: handler } = await server.ssrLoadModule('/api/tutor.js')
        const reply = {
          statusCode: 200,
          headers: {},
          status(code) { this.statusCode = code; return this },
          setHeader(k, v) { this.headers[k] = v },
          json(obj) {
            res.writeHead(this.statusCode, { 'Content-Type': 'application/json', ...this.headers })
            res.end(JSON.stringify(obj))
          },
        }
        let body = {}
        try { body = raw ? JSON.parse(raw) : {} } catch { body = {} }
        await handler(Object.assign(req, { body }), reply)
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  // Make server-only keys from .env files visible to the dev API (not to client code).
  const env = loadEnv(mode, process.cwd(), '')
  if (env.GEMINI_API_KEY) process.env.GEMINI_API_KEY ??= env.GEMINI_API_KEY
  if (env.GEMINI_MODEL) process.env.GEMINI_MODEL ??= env.GEMINI_MODEL
  return {
    plugins: [react(), devApiTutor()],
    build: {
      rollupOptions: {
        input: {
          main: resolve(__dirname, 'index.html'),
          admin: resolve(__dirname, 'admin.html'),
        },
      },
    },
    server: {
      proxy: {
        '/api': {
          target: 'http://localhost:8000',
          changeOrigin: true,
        },
      },
    },
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: [],
    },
  }
})
