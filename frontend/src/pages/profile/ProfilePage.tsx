import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../context/auth'
import { useTheme } from '../../context/theme'
import { useToast } from '../../context/toast'
import type { Lang, ThemePref } from '../../lib/types'
import { Card } from '../../components/ui/Card'
import { Button, ButtonLink } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Avatar } from '../../components/ui/Avatar'
import { SegmentedControl } from '../../components/ui/SegmentedControl'

export function ProfilePage() {
  const { t, i18n } = useTranslation()
  const { user, updateUser, logout } = useAuth()
  const { theme, setTheme } = useTheme()
  const { showToast } = useToast()
  const navigate = useNavigate()

  const [name, setName] = useState(user?.displayName ?? '')
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl ?? '')

  if (!user) return null

  const lang: Lang = i18n.language.startsWith('en') ? 'en' : 'cs'

  function changeLang(next: Lang) {
    void i18n.changeLanguage(next)
    updateUser({ languagePref: next })
  }

  function changeTheme(next: ThemePref) {
    setTheme(next)
    updateUser({ themePref: next })
  }

  function saveProfile() {
    updateUser({ displayName: name.trim() || user!.displayName, avatarUrl: avatarUrl || null })
    showToast({ message: t('settings.saved'), variant: 'success' })
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4">
      <h1 className="text-2xl font-bold text-text">{t('settings.title')}</h1>

      <Card className="flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <Avatar name={name || user.displayName} src={avatarUrl || null} size="lg" />
          <div className="flex-1">
            <Input
              label={t('settings.avatar')}
              placeholder="https://…"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
            />
          </div>
        </div>
        <Input
          label={t('settings.displayName')}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <div className="flex justify-end">
          <Button onClick={saveProfile}>{t('common.save')}</Button>
        </div>
      </Card>

      <Card className="flex flex-col gap-4">
        <div>
          <p className="mb-2 text-sm font-medium text-text">{t('settings.language')}</p>
          <SegmentedControl
            ariaLabel={t('settings.language')}
            value={lang}
            onChange={changeLang}
            segments={[
              { value: 'cs', label: 'Čeština' },
              { value: 'en', label: 'English' },
            ]}
          />
        </div>
        <div>
          <p className="mb-2 text-sm font-medium text-text">{t('settings.theme')}</p>
          <SegmentedControl
            ariaLabel={t('settings.theme')}
            value={theme}
            onChange={changeTheme}
            segments={[
              { value: 'light', label: t('settings.light') },
              { value: 'dark', label: t('settings.dark') },
            ]}
          />
        </div>
      </Card>

      <div className="flex items-center justify-between">
        {user.role === 'admin' ? (
          <ButtonLink variant="secondary" to="/admin">
            {t('nav.admin')}
          </ButtonLink>
        ) : (
          <span />
        )}
        <Button
          variant="danger"
          onClick={() => {
            logout()
            navigate('/login')
          }}
        >
          {t('nav.logout')}
        </Button>
      </div>
    </div>
  )
}
