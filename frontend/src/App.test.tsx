import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import App from './App'
import i18n from './i18n'
import { ThemeProvider } from './context/ThemeProvider'
import { AuthProvider } from './context/AuthProvider'
import { ToastProvider } from './context/ToastProvider'

// No stored session → AuthProvider resolves bootstrap to logged-out.
vi.mock('./lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: async () => ({ data: { session: null } }),
      signInWithPassword: async () => ({ data: {}, error: null }),
      signOut: async () => ({ error: null }),
    },
  },
}))

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

  it('redirects an unauthenticated visitor to the login screen', async () => {
    renderApp('/')
    // Session resume is async now, so await the login screen after bootstrap.
    expect(await screen.findByRole('button', { name: 'Přihlásit se' })).toBeInTheDocument()
  })
})
