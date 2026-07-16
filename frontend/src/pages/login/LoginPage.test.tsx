import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import i18n from '../../i18n'
import { ThemeProvider } from '../../context/ThemeProvider'
import { AuthProvider } from '../../context/AuthProvider'
import { ToastProvider } from '../../context/ToastProvider'
import { LoginPage } from './LoginPage'
import * as api from '../../lib/api'

// Supabase Auth: no stored session; sign-in succeeds (so post-signup login works).
vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: async () => ({ data: { session: null } }),
      signInWithPassword: async () => ({ data: { session: { access_token: 't' } }, error: null }),
      signOut: async () => ({ error: null }),
    },
  },
}))

// Data layer: signup is spied per-test; getMe backs the post-login bootstrap.
vi.mock('../../lib/api', () => ({
  signup: vi.fn(),
  getMe: async () => ({
    id: 'me',
    displayName: 'New Dog',
    email: 'new@pes.dev',
    avatarUrl: null,
    role: 'member',
    division: 'B',
    coefficient: 1,
    languagePref: 'en',
    themePref: 'light',
  }),
}))

function renderLogin() {
  return render(
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <MemoryRouter>
            <LoginPage />
          </MemoryRouter>
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>,
  )
}

describe('LoginPage signup', () => {
  beforeAll(async () => {
    await i18n.changeLanguage('en')
  })
  beforeEach(() => vi.clearAllMocks())

  async function openSignup(user: ReturnType<typeof userEvent.setup>) {
    await user.click(await screen.findByRole('button', { name: /create an account/i }))
    await user.type(screen.getByLabelText('Name'), 'New Dog')
    await user.type(screen.getByLabelText('Email'), 'new@pes.dev')
    await user.type(screen.getByLabelText('Password'), 'sup3rsecret')
    await user.type(screen.getByLabelText('Invite code'), 'PACK-2026')
  }

  it('submits name/email/password/inviteCode and then signs in', async () => {
    vi.mocked(api.signup).mockResolvedValue({ ok: true })
    const user = userEvent.setup()
    renderLogin()

    await openSignup(user)
    await user.click(screen.getByRole('button', { name: 'Create account' }))

    expect(api.signup).toHaveBeenCalledWith({
      name: 'New Dog',
      email: 'new@pes.dev',
      password: 'sup3rsecret',
      inviteCode: 'PACK-2026',
    })
  })

  it('shows the server message on a bad invite code and does not sign in', async () => {
    vi.mocked(api.signup).mockResolvedValue({ ok: false, message: 'Invalid invite code.' })
    const user = userEvent.setup()
    renderLogin()

    await openSignup(user)
    await user.click(screen.getByRole('button', { name: 'Create account' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid invite code.')
  })
})
