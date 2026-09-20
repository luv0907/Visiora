import React from 'react'
import AITutorStudio from '../components/ai/AITutorStudio'

export default function AITutorScreen() {
  return (
    <div
      style={{
        width: '100%',
        height: 'calc(100vh - 64px)',
        background: '#FAF8F5',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}
    >
      <AITutorStudio isModal={false} />
    </div>
  )
}
