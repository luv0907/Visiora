import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// After a deploy, a tab opened on the old build asks for script files that no longer exist
// and the page goes blank. Reload once to pick up the new build; the timestamp stops a
// reload loop if the files are genuinely missing.
window.addEventListener('vite:preloadError', event => {
  const key = 'visiora.reloadedAt'
  let last = 0
  try { last = Number(sessionStorage.getItem(key)) || 0 } catch { /* private mode */ }
  if (Date.now() - last < 10000) return
  event.preventDefault()
  try { sessionStorage.setItem(key, String(Date.now())) } catch { /* private mode */ }
  window.location.reload()
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
