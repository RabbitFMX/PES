import { useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../context/auth'
import { useConsent } from '../../context/consent'
import { useTheme } from '../../context/theme'
import { useToast } from '../../context/toast'
import { updateProfile } from '../../lib/api'
import { cn } from '../../lib/cn'
import {
  DOG_BREEDS,
  DOG_BREED_BY_ID,
  DOG_COAT_BY_ID,
  DOG_COLLARS,
  DOG_TAILS,
  dogFromSeed,
  isDogAvatar,
  parseDog,
  serializeDog,
  type DogConfig,
} from '../../lib/dogAvatar'
import { isTestDataEnabled, setTestDataEnabled } from '../../lib/testData'
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
  const [testData, setTestData] = useState(isTestDataEnabled)
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

  function toggleTestData(next: boolean) {
    setTestData(next)
    setTestDataEnabled(next)
    // Reload so every already-loaded screen refetches with/without generated data.
    window.location.reload()
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
          <span className="inline-block size-24 overflow-hidden rounded-[var(--radius-md)] bg-secondary/5 ring-1 ring-border">
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

        {/* Breed */}
        <div>
          <p className="mb-2 text-sm font-medium text-text">{t('settings.avatarBreed')}</p>
          <div className="grid max-h-64 grid-cols-3 gap-2 overflow-y-auto pr-1 sm:grid-cols-4">
            {DOG_BREEDS.map((b) => {
              const previewCoat = b.coats.includes(dog.coat) ? dog.coat : b.coats[0]
              const selected = dog.breed === b.id
              return (
                <button
                  key={b.id}
                  type="button"
                  aria-pressed={selected}
                  aria-label={lang === 'en' ? b.nameEn : b.nameCs}
                  onClick={() =>
                    setDog({
                      ...dog,
                      breed: b.id,
                      coat: b.coats.includes(dog.coat) ? dog.coat : b.coats[0],
                      tail: b.tail,
                    })
                  }
                  className={cn(
                    'flex flex-col items-center gap-1 rounded-[var(--radius-md)] p-1.5 ring-2 transition-colors',
                    selected ? 'ring-primary' : 'ring-border hover:ring-muted',
                  )}
                >
                  <DogAvatar
                    config={{ breed: b.id, coat: previewCoat, tail: b.tail, collar: 'none' }}
                    className="h-12 w-12"
                  />
                  <span className="w-full truncate text-center text-[11px] text-muted">
                    {lang === 'en' ? b.nameEn : b.nameCs}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Coat (breed-appropriate colours + patterns) */}
        <div>
          <p className="mb-2 text-sm font-medium text-text">{t('settings.avatarCoat')}</p>
          <div className="flex flex-wrap gap-2">
            {(DOG_BREED_BY_ID[dog.breed] ?? DOG_BREEDS[0]).coats.map((coatId) => {
              const c = DOG_COAT_BY_ID[coatId]
              const selected = dog.coat === coatId
              return (
                <button
                  key={coatId}
                  type="button"
                  aria-pressed={selected}
                  aria-label={lang === 'en' ? c.nameEn : c.nameCs}
                  title={lang === 'en' ? c.nameEn : c.nameCs}
                  onClick={() => setDog({ ...dog, coat: coatId })}
                  className={cn(
                    'size-9 overflow-hidden rounded-full ring-2 ring-offset-2 ring-offset-surface transition-transform',
                    selected ? 'ring-primary' : 'ring-transparent hover:scale-110',
                  )}
                  style={{
                    background: c.pattern
                      ? `radial-gradient(circle at 30% 30%, ${c.patternColor} 0 25%, ${c.base} 26%)`
                      : c.base,
                  }}
                />
              )
            })}
          </div>
        </div>

        {/* Tail */}
        <div>
          <p className="mb-2 text-sm font-medium text-text">{t('settings.avatarTail')}</p>
          <div className="flex flex-wrap gap-2">
            {DOG_TAILS.map((tail) => (
              <PillButton
                key={tail}
                selected={dog.tail === tail}
                onClick={() => setDog({ ...dog, tail })}
              >
                {t(`settings.tail.${tail}`)}
              </PillButton>
            ))}
          </div>
        </div>

        {/* Collar */}
        <div>
          <p className="mb-2 text-sm font-medium text-text">{t('settings.avatarCollar')}</p>
          <div className="flex flex-wrap gap-2">
            {DOG_COLLARS.map((collar) => (
              <PillButton
                key={collar}
                selected={dog.collar === collar}
                onClick={() => setDog({ ...dog, collar })}
              >
                {t(`settings.collar.${collar}`)}
              </PillButton>
            ))}
          </div>
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

      {/* Test data — a testing aid. Generates detailed per-activity data from the
          real weekly totals (totals stay the same) so all stats/charts can be
          exercised. Reloads on toggle so every screen refetches. */}
      <Card className="flex flex-col gap-3">
        <div>
          <p className="text-sm font-medium text-text">{t('settings.testData')}</p>
          <p className="mt-1 text-sm text-muted">{t('settings.testDataHint')}</p>
        </div>
        <Toggle label={t('settings.testDataToggle')} checked={testData} onChange={toggleTestData} />
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

function PillButton({
  selected,
  onClick,
  children,
}: {
  selected: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        'rounded-full px-3 py-1 text-sm ring-1 transition-colors',
        selected
          ? 'bg-primary/10 text-primary ring-primary'
          : 'text-muted ring-border hover:text-text',
      )}
    >
      {children}
    </button>
  )
}
