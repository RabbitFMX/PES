import { useTranslation } from 'react-i18next'
import type { LogPreview } from '../../lib/types'
import { formatPoints } from '../../lib/format'
import { Card } from '../../components/ui/Card'

export function PreviewCard({ preview }: { preview: LogPreview }) {
  const { t } = useTranslation()
  return (
    <Card className="bg-primary/5">
      <div className="flex items-baseline justify-between">
        <span className="font-semibold text-text">{preview.activityName}</span>
        <span className="text-sm text-muted">
          {formatPoints(preview.quantity)} {preview.unit}
        </span>
      </div>
      <div className="mt-2 text-sm text-muted">
        {t('logActivity.previewFormula', {
          raw: formatPoints(preview.rawPoints),
          coef: preview.coefficient,
          final: formatPoints(preview.finalPoints),
        })}
      </div>
    </Card>
  )
}
