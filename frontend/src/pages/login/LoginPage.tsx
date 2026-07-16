import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../context/auth'
import { signup as signupRequest } from '../../lib/api'
import { Logo } from '../../components/Logo'
import { ThemeLanguageSwitcher } from '../../components/ThemeLanguageSwitcher'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'

type Mode = 'login' | 'signup'

export function LoginPage() {
  const { t } = useTranslation()
  const { user, login, loading } = useAuth()
  const navigate = useNavigate()
  const [mode, setMode] = useState<Mode>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (user) return <Navigate to="/" replace />

  const isSignup = mode === 'signup'

  function switchMode(next: Mode) {
    setMode(next)
    setError(null)
    setPassword('')
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    if (!isSignup) {
      try {
        await login(email, password)
        navigate('/')
      } catch {
        setError(t('login.error'))
      }
      return
    }

    // Sign up (invite-code gated), then sign in with the same credentials.
    setSubmitting(true)
    try {
      const res = await signupRequest({ name, email, password, inviteCode })
      if (!res.ok) {
        setError(res.message)
        return
      }
      await login(email, password)
      navigate('/')
    } catch {
      setError(t('login.signupError'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <div className="flex justify-end p-4">
        <ThemeLanguageSwitcher />
      </div>
      <div className="flex flex-1 items-center justify-center px-4 pb-16">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex flex-col items-center text-center">
            <span className="text-primary">
              <Logo className="size-12" />
            </span>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-primary">{t('app.name')}</h1>
            <p className="text-sm text-muted">{t('app.tagline')}</p>
          </div>

          <form
            onSubmit={onSubmit}
            className="flex flex-col gap-4 rounded-[var(--radius-lg)] bg-surface p-6 shadow-[var(--shadow-card)] ring-1 ring-border"
          >
            {isSignup && (
              <Input
                label={t('login.name')}
                type="text"
                autoComplete="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            )}
            <Input
              label={t('login.email')}
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Input
              label={t('login.password')}
              type="password"
              autoComplete={isSignup ? 'new-password' : 'current-password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {isSignup && (
              <Input
                label={t('login.inviteCode')}
                hint={t('login.inviteCodeHint')}
                type="text"
                required
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
              />
            )}
            {error && (
              <p role="alert" className="text-sm text-danger">
                {error}
              </p>
            )}
            <Button type="submit" loading={isSignup ? submitting : loading} fullWidth size="lg">
              {isSignup ? t('login.signupSubmit') : t('login.submit')}
            </Button>
            {!isSignup && (
              <button type="button" className="text-sm text-muted hover:text-text">
                {t('login.forgot')}
              </button>
            )}
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => switchMode(isSignup ? 'login' : 'signup')}
              className="text-sm font-medium text-primary hover:underline"
            >
              {isSignup ? t('login.toLogin') : t('login.toSignup')}
            </button>
            {!isSignup && <p className="mt-3 text-xs text-muted">{t('login.invited')}</p>}
          </div>
        </div>
      </div>
    </div>
  )
}
