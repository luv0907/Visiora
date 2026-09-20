import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig(({ mode }) => {
  const isDedicatedAdmin = process.env.VITE_APP_TARGET === 'admin' || mode === 'admin'

  return {
    plugins: [react()],
    define: {
      'import.meta.env.VITE_APP_TARGET': JSON.stringify(isDedicatedAdmin ? 'admin' : 'main'),
    },
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
