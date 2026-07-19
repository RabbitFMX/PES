import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useAsync } from '../../lib/useAsync'
import { createChallenge, getChallenge, getPastChallenges, submitChallenge } from '../../lib/api'
import { formatPoints } from '../../lib/format'
import type { ChallengeData, PastChallenge, ScoringMode } from '../../lib/types'
import { useToast } from '../../context/toast'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Textarea } from '../../components/ui/Textarea'
import { SegmentedControl } from '../../components/ui/SegmentedControl'
import { Avatar } from '../../components/ui/Avatar'
import { Skeleton } from '../../components/ui/Skeleton'
import { EmptyState } from '../../components/ui/EmptyState'
import { ErrorState } from '../../components/ui/ErrorState'

const MAX_CHALLENGE_LEN = 1000

export function ChallengesPage() {
  const { t } = useTranslation()
  const { data, loading, error, reload } = useAsync<ChallengeData>(getChallenge)
  const past = useAsync<PastChallenge[]>(getPastChallenges)

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-text">{t('challenges.title')}</h1>

      {loading ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-28" />
          <Skeleton className="h-40" />
        </div>
      ) : error || !data ? (
        <ErrorState onRetry={reload} />
      ) : (
        <>
          {/* Always-visible "who sets this week's challenge" line. */}
          {data.setterName && (
            <p className="text-sm text-primary">
              🐾{' '}
              {data.isSetterTurn
                ? t('challenges.yourTurnToSet')
                : t('challenges.whoSets', { name: data.setterName })}
            </p>
          )}
          {data.id === null ? (
            <NoChallenge isSetterTurn={data.isSetterTurn} onReload={reload} />
          ) : (
            <ActiveChallenge data={data} onReload={reload} />
          )}
        </>
      )}

      {past.data && past.data.length > 0 && <PastList items={past.data} />}
    </div>
  )
}

function NoChallenge({ isSetterTurn, onReload }: { isSetterTurn: boolean; onReload: () => void }) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col gap-4">
      <EmptyState
        title={t('challenges.empty')}
        description={isSetterTurn ? t('challenges.itsYourTurn') : undefined}
      />
      {isSetterTurn && <SetChallengeForm onReload={onReload} />}
    </div>
  )
}

function ActiveChallenge({ data, onReload }: { data: ChallengeData; onReload: () => void }) {
  const { t } = useTranslation()
  const { showToast } = useToast()
  const [value, setValue] = useState('')
  const [submitted, setSubmitted] = useState(data.hasSubmitted)
  const [busy, setBusy] = useState(false)
  const isCompletion = data.scoringMode === 'completion'
  const daysLeft = data.deadline ? daysUntil(data.deadline) : null

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!(Number(value) > 0)) return
    setBusy(true)
    try {
      const res = await submitChallenge(Number(value))
      if (res.ok) {
        setSubmitted(true)
        showToast({ message: t('challenges.submitted'), variant: 'success' })
      } else {
        showToast({
          message: res.message,
          variant: 'error',
          actionLabel: t('common.retry'),
          onAction: onReload,
        })
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="flex flex-col gap-4">
        <Card>
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-lg font-semibold text-text">{data.title}</h2>
            <div className="flex shrink-0 items-center gap-2">
              <Badge variant="neutral">
                {isCompletion ? t('challenges.modeCompletion') : t('challenges.modeCompetitive')}
              </Badge>
              {daysLeft !== null && (
                <Badge variant={daysLeft <= 1 ? 'accent' : 'neutral'}>
                  {t('challenges.deadline')}: {daysLeft}d
                </Badge>
              )}
            </div>
          </div>
          <p className="mt-2 whitespace-pre-wrap text-sm text-muted">{data.description}</p>
        </Card>

        {/* Members submit a value only for competitive challenges. */}
        {!isCompletion && (
          <Card>
            {submitted ? (
              <Badge variant="success">{t('challenges.submitted')}</Badge>
            ) : (
              <form onSubmit={submit} className="flex items-end gap-3">
                <div className="flex-1">
                  <Input
                    label={t('challenges.yourValue')}
                    type="number"
                    inputMode="decimal"
                    min={0}
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                  />
                </div>
                <Button type="submit" loading={busy} disabled={!(Number(value) > 0)}>
                  {t('challenges.submit')}
                </Button>
              </form>
            )}
          </Card>
        )}
        {isCompletion && (
          <Card>
            <p className="text-sm text-muted">{t('challenges.completionHint')}</p>
          </Card>
        )}
      </div>

      <Card>
        <h2 className="mb-3 text-lg font-semibold text-text">
          {isCompletion ? t('challenges.awards') : t('challenges.submissions')}
        </h2>
        {data.submissions.length === 0 ? (
          <EmptyState title={t('challenges.noSubmissions')} />
        ) : (
          <ul className="flex flex-col gap-2">
            {data.submissions.map((s) => (
              <li key={s.memberId} className="flex items-center gap-3">
                <span className="w-5 text-center font-bold text-muted">{s.rank ?? '—'}</span>
                <Avatar name={s.displayName} size="sm" />
                <span className="flex-1 truncate text-text">{s.displayName}</span>
                {s.value !== null && (
                  <span className="text-sm text-muted">{formatPoints(s.value)}</span>
                )}
                {s.bonusPoints > 0 && <Badge variant="accent">+{s.bonusPoints}</Badge>}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}

function SetChallengeForm({ onReload }: { onReload: () => void }) {
  const { t } = useTranslation()
  const { showToast } = useToast()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [deadline, setDeadline] = useState('')
  const [scoringMode, setScoringMode] = useState<ScoringMode>('competitive')
  const [busy, setBusy] = useState(false)

  async function publish(e: FormEvent) {
    e.preventDefault()
    if (!title.trim() || description.length > MAX_CHALLENGE_LEN) return
    setBusy(true)
    try {
      const res = await createChallenge({
        title,
        description,
        deadline: deadline ? new Date(deadline).toISOString() : null,
        scoringMode,
      })
      if (res.ok) {
        showToast({ message: t('challenges.published'), variant: 'success' })
        setTitle('')
        setDescription('')
        setDeadline('')
        onReload()
      } else {
        showToast({ message: res.message, variant: 'error' })
      }
    } finally {
      setBusy(false)
    }
  }

  const over = description.length > MAX_CHALLENGE_LEN

  return (
    <Card>
      <h2 className="mb-3 text-lg font-semibold text-text">{t('challenges.setChallenge')}</h2>
      <form onSubmit={publish} className="flex flex-col gap-3">
        <Input
          label={t('challenges.setTitle')}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
        <div>
          <Textarea
            label={t('challenges.setDescription')}
            value={description}
            maxLength={MAX_CHALLENGE_LEN}
            rows={5}
            onChange={(e) => setDescription(e.target.value)}
          />
          <div className={`mt-1 text-right text-xs ${over ? 'text-danger' : 'text-muted'}`}>
            {description.length} / {MAX_CHALLENGE_LEN}
          </div>
        </div>
        <div>
          <span className="mb-1 block text-sm font-medium text-text">
            {t('challenges.scoringMode')}
          </span>
          <SegmentedControl
            ariaLabel={t('challenges.scoringMode')}
            value={scoringMode}
            onChange={setScoringMode}
            segments={[
              { value: 'competitive', label: t('challenges.modeCompetitive') },
              { value: 'completion', label: t('challenges.modeCompletion') },
            ]}
          />
          <p className="mt-1 text-xs text-muted">
            {scoringMode === 'competitive'
              ? t('challenges.modeCompetitiveHint')
              : t('challenges.modeCompletionHint')}
          </p>
        </div>
        <Input
          label={`${t('challenges.setDeadline')} (${t('common.optional')})`}
          type="datetime-local"
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
        />
        <Button type="submit" loading={busy} disabled={!title.trim() || over}>
          {t('challenges.publish')}
        </Button>
      </form>
    </Card>
  )
}

function PastList({ items }: { items: PastChallenge[] }) {
  const { t } = useTranslation()
  return (
    <Card>
      <h2 className="mb-3 text-lg font-semibold text-text">{t('challenges.past')}</h2>
      <ul className="flex flex-col gap-2">
        {items.map((c) => (
          <li key={c.id} className="flex items-center justify-between text-sm">
            <span className="text-text">{c.title}</span>
            <span className="text-muted">
              {c.weekLabel} · {t('challenges.winner')}: {c.winner}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  )
}

function daysUntil(iso: string): number {
  const diff = new Date(iso).getTime() - Date.now()
  return Math.max(0, Math.ceil(diff / 86_400_000))
}
