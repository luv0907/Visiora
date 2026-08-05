/**
 * VISIORA — Error Boundary
 * Wraps each major section so one failure never crashes the whole app.
 */
import React from 'react'

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    // Log to console (future: also send to backend analytics)
    console.error('[ErrorBoundary]', this.props.section ?? 'unknown', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
          gap: '1rem',
          background: 'var(--color-surface)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--color-border-md)',
          color: 'var(--color-text)',
          textAlign: 'center',
          minHeight: this.props.minHeight ?? '200px',
          fontFamily: 'var(--font-body)',
        }}>
          <div style={{ fontSize: '2rem' }}>⚠️</div>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-lg)', margin: 0 }}>
            {this.props.title ?? 'Something went wrong'}
          </h3>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)', margin: 0, maxWidth: '300px' }}>
            {this.props.message ?? 'This section failed to load. The rest of the app is fine.'}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{
              background: 'var(--color-primary)',
              color: 'white',
              border: 'none',
              borderRadius: 'var(--radius-full)',
              padding: '0.5rem 1.5rem',
              cursor: 'pointer',
              fontSize: 'var(--text-sm)',
              fontFamily: 'var(--font-body)',
              fontWeight: 'var(--weight-medium)',
            }}
          >
            Try again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

export default ErrorBoundary
