import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { commitEntries } from '../../lib/api'
import type { LogMode, LogPreview } from '../../lib/types'
import { useToast } from '../../context/toast'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { SegmentedControl } from '../../components/ui/SegmentedControl'
import { DetailedForm } from './DetailedForm'
import { QuickAddForm } from './QuickAddForm'
import { NaturalLanguageForm } from './NaturalLanguageForm'
import { PreviewCard } from './PreviewCard'

interface LogActivityModalProps {
  open: boolean
  onClose: () => void
}

export function LogActivityModal({ open, onClose }: LogActivityModalProps) {
  const { t } = useTranslation()
  const { showToast } = useToast()

  const [mode, setMode] = useState<LogMode>('detailed')
  const [step, setStep] = useState<'form' | 'preview'>('form')
  const [previews, setPreviews] = useState<LogPreview[]>([])
  const [duplicate, setDuplicate] = useState(false)
  const [committing, setCommitting] = useState(false)

  const loggedSignatures = useRef<Set<string>>(new Set())
  const pendingSignature = useRef<string | undefined>(undefined)

  // Reset the flow on close, so the next open always starts fresh. Avoids a
  // state-syncing effect; every close path routes through here.
  function close() {
    setMode('detailed')
    setStep('form')
    setPreviews([])
    setDuplicate(false)
    pendingSignature.current = undefined
    onClose()
  }

  function handlePreviews(next: LogPreview[], signature?: string) {
    setPreviews(next)
    pendingSignature.current = signature
    setDuplicate(signature ? loggedSignatures.current.has(signature) : false)
    setStep('preview')
  }

  function handleParseFailed() {
    showToast({ message: t('logActivity.nlFailed'), variant: 'error' })
    setMode('detailed')
  }

  async function confirm() {
    setCommitting(true)
    try {
      await commitEntries(previews)
      if (pendingSignature.current) loggedSignatures.current.add(pendingSignature.current)
      showToast({ message: t('logActivity.saved'), variant: 'success' })
      close()
    } finally {
      setCommitting(false)
    }
  }

  const previewFooter =
    step === 'preview' ? (
      <div className="flex gap-3">
        <Button variant="secondary" onClick={() => setStep('form')} fullWidth>
          {t('common.edit')}
        </Button>
        <Button onClick={confirm} loading={committing} fullWidth>
          {duplicate ? t('common.add') : t('logActivity.confirmSave')}
        </Button>
      </div>
    ) : undefined

  return (
    <Modal open={open} onClose={close} title={t('logActivity.title')} footer={previewFooter}>
      {step === 'form' ? (
        <div className="flex flex-col gap-4">
          <SegmentedControl
            ariaLabel={t('logActivity.title')}
            value={mode}
            onChange={(m) => setMode(m)}
            segments={[
              { value: 'detailed', label: t('logActivity.modeDetailed') },
              { value: 'quick-add', label: t('logActivity.modeQuickAdd') },
              { value: 'natural', label: t('logActivity.modeNatural') },
            ]}
          />
          {mode === 'detailed' && <DetailedForm onPreviews={handlePreviews} />}
          {mode === 'quick-add' && <QuickAddForm onPreviews={handlePreviews} />}
          {mode === 'natural' && (
            <NaturalLanguageForm onPreviews={handlePreviews} onFailed={handleParseFailed} />
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {previews.map((p, i) => (
            <PreviewCard key={i} preview={p} />
          ))}
          {duplicate && (
            <p
              role="alert"
              className="rounded-[var(--radius-sm)] bg-accent/15 px-3 py-2 text-sm text-text"
            >
              {t('logActivity.duplicateWarn')}
            </p>
          )}
        </div>
      )}
    </Modal>
  )
}
