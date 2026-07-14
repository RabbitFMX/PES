import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../context/auth'
import { Logo } from '../../components/Logo'
import { ThemeLanguageSwitcher } from '../../components/ThemeLanguageSwitcher'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'

export function LoginPage() {
  const { t } = useTranslation()
  const { user, login, loading } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(false)

  if (user) return <Navigate to="/" replace />

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(false)
    try {
      await login(email, password)
      navigate('/')
    } catch {
      setError(true)
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
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {error && (
              <p role="alert" className="text-sm text-danger">
                {t('login.error')}
              </p>
            )}
            <Button type="submit" loading={loading} fullWidth size="lg">
              {t('login.submit')}
            </Button>
            <button type="button" className="text-sm text-muted hover:text-text">
              {t('login.forgot')}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-muted">{t('login.invited')}</p>
        </div>
      </div>
    </div>
  )
}
