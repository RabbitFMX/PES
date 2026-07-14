import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeAll, describe, expect, it } from 'vitest'
import App from './App'
import i18n from './i18n'
import { ThemeProvider } from './context/ThemeProvider'
import { AuthProvider } from './context/AuthProvider'
import { ToastProvider } from './context/ToastProvider'

function renderApp(initial = '/') {
  return render(
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <MemoryRouter initialEntries={[initial]}>
            <App />
          </MemoryRouter>
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>,
  )
}

describe('App routing', () => {
  beforeAll(async () => {
    await i18n.changeLanguage('cs')
  })

  it('redirects an unauthenticated visitor to the login screen', () => {
    renderApp('/')
    expect(screen.getByRole('button', { name: 'Přihlásit se' })).toBeInTheDocument()
  })
})
