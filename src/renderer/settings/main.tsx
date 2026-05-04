import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import SettingsApp from './app'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SettingsApp />
  </StrictMode>,
)
