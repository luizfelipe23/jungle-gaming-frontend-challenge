import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

async function bootstrap() {
  const mocksEnabled = import.meta.env.VITE_ENABLE_MOCKS === 'true'
    || (import.meta.env.DEV && import.meta.env.VITE_ENABLE_MOCKS !== 'false')

  if (mocksEnabled) {
    const { enableMocking } = await import('./mocks/browser')
    await enableMocking()
  }

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

void bootstrap()
