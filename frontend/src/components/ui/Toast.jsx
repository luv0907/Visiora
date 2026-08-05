/**
 * VISIORA — Toast Notification System
 */
import React from 'react'
import { useUIStore } from '../../store/useUIStore'
import { CheckCircle, AlertCircle, Info, XCircle, X } from 'lucide-react'

const ICONS = {
  success: <CheckCircle size={16} />,
  error:   <XCircle size={16} />,
  warning: <AlertCircle size={16} />,
  info:    <Info size={16} />,
}

const COLORS = {
  success: { bg: 'var(--sage-100)',     border: 'var(--sage-300)',    icon: 'var(--sage-400)' },
  error:   { bg: '#FFF0F0',             border: '#FFBBBB',            icon: '#E53E3E' },
  warning: { bg: 'var(--peach-100)',    border: 'var(--peach-300)',   icon: 'var(--peach-400)' },
  info:    { bg: 'var(--lavender-100)', border: 'var(--lavender-300)', icon: 'var(--lavender-400)' },
}

function Toast({ toast }) {
  const { removeToast } = useUIStore()
  const colors = COLORS[toast.type] ?? COLORS.info

  return (
    <div
      className="slide-up"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-3)',
        padding: 'var(--space-3) var(--space-4)',
        background: colors.bg,
        border: `1px solid ${colors.border}`,
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-lg)',
        maxWidth: '360px',
        pointerEvents: 'auto',
      }}
    >
      <span style={{ color: colors.icon, flexShrink: 0 }}>{ICONS[toast.type]}</span>
      <p style={{
        flex: 1,
        margin: 0,
        fontSize: 'var(--text-sm)',
        color: 'var(--color-text)',
        lineHeight: 'var(--leading-snug)',
      }}>
        {toast.message}
      </p>
      <button
        onClick={() => removeToast(toast.id)}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--color-text-muted)',
          padding: '2px',
          flexShrink: 0,
          display: 'flex',
        }}
      >
        <X size={14} />
      </button>
    </div>
  )
}

export default function ToastContainer() {
  const { toasts } = useUIStore()
  if (!toasts.length) return null

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 'var(--space-6)',
        right: 'var(--space-6)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-2)',
        zIndex: 'var(--z-toast)',
        pointerEvents: 'none',
      }}
    >
      {toasts.map(t => <Toast key={t.id} toast={t} />)}
    </div>
  )
}
