import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from '@/App'
import '@/styles/global.css'

// The experience always opens on the first scene rather than mid-journey
if ('scrollRestoration' in history) history.scrollRestoration = 'manual'

const container = document.getElementById('root')
if (!container) throw new Error('Missing #root element in index.html')

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
