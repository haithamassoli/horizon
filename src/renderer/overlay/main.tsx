import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import OverlayApp from './app'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <OverlayApp />
  </StrictMode>,
)
