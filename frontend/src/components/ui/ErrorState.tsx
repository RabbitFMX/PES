import { useTranslation } from 'react-i18next'
import { Button } from './Button'

export function ErrorState({ onRetry, message }: { onRetry: () => void; message?: string }) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col items-center gap-3 rounded-[var(--radius-md)] px-6 py-12 text-center">
      <p className="text-sm text-muted">{message ?? t('common.loadError')}</p>
      <Button variant="secondary" onClick={onRetry}>
        {t('common.retry')}
      </Button>
    </div>
  )
}
