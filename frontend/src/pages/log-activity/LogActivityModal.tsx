import { useTranslation } from 'react-i18next'

interface LogActivityModalProps {
  open: boolean
  onClose: () => void
}

/** Modal over the dashboard for logging an activity (detailed / quick-add / natural-language). */
export function LogActivityModal({ open, onClose }: LogActivityModalProps) {
  const { t } = useTranslation()

  if (!open) return null

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/40">
      <div className="rounded-lg bg-background p-6 shadow-lg">
        <h2 className="text-xl font-semibold text-secondary">{t('nav.logActivity')}</h2>
        <button type="button" onClick={onClose} className="mt-4 text-accent">
          Close
        </button>
      </div>
    </div>
  )
}
