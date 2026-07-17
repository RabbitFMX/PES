import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useConsent } from '../context/consent'
import { Button } from './ui/Button'
import { Toggle } from './ui/Toggle'

/**
 * GDPR cookie/consent banner. Shows until the visitor makes a choice on this
 * browser (`needsDecision`). No box is pre-ticked: the "Customise" toggles for
 * analytics and marketing start OFF, so non-essential scripts stay off unless
 * the visitor actively opts in. Every button records a decision (via
 * ConsentProvider), which persists it and gates the integrations.
 */
export function ConsentBanner() {
  const { t } = useTranslation()
  const { needsDecision, setConsent } = useConsent()
  const [customising, setCustomising] = useState(false)
  const [analytics, setAnalytics] = useState(false)
  const [marketing, setMarketing] = useState(false)

  if (!needsDecision) return null

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby="consent-title"
      aria-describedby="consent-body"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-surface/98 p-4 shadow-[var(--shadow-pop)] backdrop-blur"
    >
      <div className="mx-auto flex max-w-3xl flex-col gap-3">
        <div>
          <h2 id="consent-title" className="text-base font-bold text-text">
            {t('consent.title')}
          </h2>
          <p id="consent-body" className="mt-1 text-sm text-muted">
            {t('consent.body')}
          </p>
        </div>

        {customising && (
          <div className="flex flex-col gap-3 rounded-[var(--radius-md)] bg-bg/60 p-3">
            <Toggle label={t('consent.essential')} checked disabled onChange={() => {}} />
            <Toggle label={t('consent.analytics')} checked={analytics} onChange={setAnalytics} />
            <Toggle label={t('consent.marketing')} checked={marketing} onChange={setMarketing} />
          </div>
        )}

        <div className="flex flex-wrap justify-end gap-2">
          {customising ? (
            <Button onClick={() => setConsent({ analytics, marketing })}>
              {t('consent.savePreferences')}
            </Button>
          ) : (
            <Button variant="secondary" onClick={() => setCustomising(true)}>
              {t('consent.customise')}
            </Button>
          )}
          <Button
            variant="secondary"
            onClick={() => setConsent({ analytics: false, marketing: false })}
          >
            {t('consent.rejectAll')}
          </Button>
          <Button onClick={() => setConsent({ analytics: true, marketing: true })}>
            {t('consent.acceptAll')}
          </Button>
        </div>
      </div>
    </div>
  )
}
