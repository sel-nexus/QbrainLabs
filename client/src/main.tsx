import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './i18n'
import App from './App.tsx'
import ErrorBoundary from './components/ErrorBoundary'
import { ThemeProvider } from './context/ThemeContext'
import { AuthProvider } from './context/AuthContext'
import { SessionProvider } from './context/SessionContext'
import { ConfirmProvider } from './context/ConfirmContext'
import { MotionConfig } from 'framer-motion'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MotionConfig reducedMotion="user">
      <ThemeProvider>
        <ConfirmProvider>
          <AuthProvider>
            <SessionProvider>
              <ErrorBoundary>
                <App />
              </ErrorBoundary>
            </SessionProvider>
          </AuthProvider>
        </ConfirmProvider>
      </ThemeProvider>
    </MotionConfig>
  </StrictMode>,
)
