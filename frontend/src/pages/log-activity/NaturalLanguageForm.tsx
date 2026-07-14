import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { parseNaturalLanguage } from '../../lib/mockApi'
import type { LogPreview } from '../../lib/types'
import { Button } from '../../components/ui/Button'
import { Textarea } from '../../components/ui/Textarea'

interface Props {
  onPreviews: (previews: LogPreview[]) => void
  onFailed: () => void
}

export function NaturalLanguageForm({ onPreviews, onFailed }: Props) {
  const { t } = useTranslation()
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)

  async function parse() {
    if (!text.trim()) return
    setBusy(true)
    try {
      const previews = await parseNaturalLanguage(text)
      onPreviews(previews)
    } catch {
      onFailed()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Textarea
        label={t('logActivity.activity')}
        placeholder={t('logActivity.nlPlaceholder')}
        hint={t('logActivity.nlHint')}
        maxLength={500}
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      {busy && (
        <p className="flex items-center gap-2 text-sm text-primary" role="status">
          <span className="animate-pulse">🐕‍🦺</span>
          {t('logActivity.sniffing')}
        </p>
      )}
      <Button onClick={parse} loading={busy} disabled={!text.trim()} fullWidth>
        {t('logActivity.parse')}
      </Button>
    </div>
  )
}
