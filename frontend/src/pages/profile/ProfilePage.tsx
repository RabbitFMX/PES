import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../context/auth'
import { useConsent } from '../../context/consent'
import { useTheme } from '../../context/theme'
import { useToast } from '../../context/toast'
import { updateProfile } from '../../lib/api'
import { cn } from '../../lib/cn'
import {
  DOG_COLORS,
  DOG_COLOR_IDS,
  DOG_STYLES,
  dogFromSeed,
  isDogAvatar,
  parseDog,
  serializeDog,
  type DogConfig,
  type DogSize,
} from '../../lib/dogAvatar'
import type { Lang, ThemePref } from '../../lib/types'
import { Card } from '../../components/ui/Card'
import { Button, ButtonLink } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { SegmentedControl } from '../../components/ui/SegmentedControl'
import { Toggle } from '../../components/ui/Toggle'
import { DogAvatar } from '../../components/DogAvatar'

export function ProfilePage() {
  const { t, i18n } = useTranslation()
  const { user, updateUser, logout } = useAuth()
  const { consent, updateCategory } = useConsent()
  const { theme, setTheme } = useTheme()
  const { showToast } = useToast()
  const navigate = useNavigate()

  const [name, setName] = useState(user?.displayName ?? '')
  const [dog, setDog] = useState<DogConfig>(() =>
    isDogAvatar(user?.avatarUrl) ? parseDog(user?.avatarUrl) : dogFromSeed(user?.id ?? 'dog'),
  )
  const [saving, setSaving] = useState(false)

  if (!user) return null

  const lang: Lang = i18n.language.startsWith('en') ? 'en' : 'cs'

  async function persist(patch: Parameters<typeof updateProfile>[0]) {
    const updated = await updateProfile(patch)
    updateUser(updated)
    return updated
  }

  function changeLang(next: Lang) {
    void i18n.changeLanguage(next)
    updateUser({ languagePref: next })
    void persist({ languagePref: next }).catch(() => {})
  }

  function changeTheme(next: ThemePref) {
    setTheme(next)
    updateUser({ themePref: next })
    void persist({ themePref: next }).catch(() => {})
  }

  async function saveProfile() {
    setSaving(true)
    try {
      await persist({ displayName: name.trim() || user!.displayName, avatarUrl: serializeDog(dog) })
      showToast({ message: t('settings.saved'), variant: 'success' })
    } catch {
      showToast({ message: t('admin.saveError'), variant: 'error' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4">
      <h1 className="text-2xl font-bold text-text">{t('settings.title')}</h1>

      {/* Avatar builder */}
      <Card className="flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <span className="inline-block size-20 overflow-hidden rounded-full bg-secondary/5 ring-1 ring-border">
            <DogAvatar config={dog} className="h-full w-full" title={name || user.displayName} />
          </span>
          <div className="flex-1">
            <Input
              label={t('settings.displayName')}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
        </div>

        {/* Style */}
        <div>
          <p className="mb-2 text-sm font-medium text-text">{t('settings.avatarStyle')}</p>
          <div className="flex flex-wrap gap-2">
            {DOG_STYLES.map((style) => (
              <button
                key={style}
                type="button"
                aria-label={`${t('settings.avatarStyle')}: ${style}`}
                aria-pressed={dog.style === style}
                onClick={() => setDog({ ...dog, style })}
                className={cn(
                  'rounded-[var(--radius-md)] p-1 ring-2 transition-colors',
                  dog.style === style ? 'ring-primary' : 'ring-border hover:ring-muted',
                )}
              >
                <span className="inline-block size-12 overflow-hidden rounded-full bg-secondary/5">
                  <DogAvatar config={{ ...dog, style }} className="h-full w-full" />
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Colour */}
        <div>
          <p className="mb-2 text-sm font-medium text-text">{t('settings.avatarColor')}</p>
          <div className="flex flex-wrap gap-2">
            {DOG_COLOR_IDS.map((color) => (
              <button
                key={color}
                type="button"
                aria-label={`${t('settings.avatarColor')}: ${color}`}
                aria-pressed={dog.color === color}
                onClick={() => setDog({ ...dog, color })}
                style={{ background: DOG_COLORS[color].base }}
                className={cn(
                  'size-8 rounded-full ring-2 ring-offset-2 ring-offset-surface transition-transform',
                  dog.color === color ? 'ring-primary' : 'ring-transparent hover:scale-110',
                )}
              />
            ))}
          </div>
        </div>

        {/* Size */}
        <div>
          <p className="mb-2 text-sm font-medium text-text">{t('settings.avatarSize')}</p>
          <SegmentedControl
            ariaLabel={t('settings.avatarSize')}
            value={dog.size}
            onChange={(size: DogSize) => setDog({ ...dog, size })}
            segments={[
              { value: 'sm', label: t('settings.sizeS') },
              { value: 'md', label: t('settings.sizeM') },
              { value: 'lg', label: t('settings.sizeL') },
            ]}
          />
        </div>

        <div className="flex justify-end">
          <Button onClick={saveProfile} loading={saving}>
            {t('common.save')}
          </Button>
        </div>
      </Card>

      {/* Language + theme */}
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

      {/* Privacy — withdraw/grant non-essential consent (GDPR). Toggling here
          both gates the scripts on this device and updates the account consent
          (which gates marketing email server-side). */}
      <Card className="flex flex-col gap-4">
        <div>
          <p className="text-sm font-medium text-text">{t('settings.privacy')}</p>
          <p className="mt-1 text-sm text-muted">{t('settings.privacyHint')}</p>
        </div>
        <Toggle
          label={t('consent.analytics')}
          checked={consent.analytics}
          onChange={(v) => updateCategory('analytics', v)}
        />
        <Toggle
          label={t('consent.marketing')}
          checked={consent.marketing}
          onChange={(v) => updateCategory('marketing', v)}
        />
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
