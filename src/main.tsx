import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import './services/pwaService' // Initialize PWA service
import { ThemeService } from './services/ThemeService'

ThemeService.getInstance() // Apply saved theme before first render

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
