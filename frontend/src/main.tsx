import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import './i18n'
import App from './App.tsx'
import { ThemeProvider } from './context/ThemeProvider'
import { AuthProvider } from './context/AuthProvider'
import { ToastProvider } from './context/ToastProvider'
import { ConsentProvider } from './context/ConsentProvider'
import { ConsentBanner } from './components/ConsentBanner'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <ConsentProvider>
            <BrowserRouter>
              <App />
            </BrowserRouter>
            {/* Fixed overlay — shown until a consent choice is made, on any screen. */}
            <ConsentBanner />
          </ConsentProvider>
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  </StrictMode>,
)
