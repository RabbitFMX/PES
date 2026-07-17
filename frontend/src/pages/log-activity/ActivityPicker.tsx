import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Activity } from '../../lib/types'
import { cn } from '../../lib/cn'
import { Input } from '../../components/ui/Input'
import { ActivityIcon } from '../../components/ActivityIcon'
import { shortRate } from '../../lib/activityScoring'

interface ActivityPickerProps {
  activities: Activity[]
  value: string
  onChange: (id: string) => void
  lang: string
}

export function ActivityPicker({ activities, value, onChange, lang }: ActivityPickerProps) {
  const { t } = useTranslation()
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return activities
    return activities.filter(
      (a) => a.nameCs.toLowerCase().includes(q) || a.nameEn.toLowerCase().includes(q),
    )
  }, [activities, query])

  return (
    <div className="flex flex-col gap-2">
      <Input
        label={t('logActivity.activity')}
        placeholder={t('logActivity.searchActivity')}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div
        role="radiogroup"
        aria-label={t('logActivity.pickActivity')}
        className="max-h-48 overflow-y-auto rounded-[var(--radius-sm)] ring-1 ring-border"
      >
        {filtered.map((a) => {
          const selected = a.id === value
          const primary = lang === 'en' ? a.nameEn : a.nameCs
          const secondary = lang === 'en' ? a.nameCs : a.nameEn
          return (
            <button
              key={a.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(a.id)}
              className={cn(
                'flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm',
                selected ? 'bg-primary/10 text-primary' : 'text-text hover:bg-secondary/5',
              )}
            >
              <span className="flex min-w-0 items-center gap-2.5">
                <ActivityIcon
                  activityId={a.id}
                  className={cn('size-5 shrink-0', selected ? 'text-primary' : 'text-muted')}
                />
                <span className="flex min-w-0 flex-col">
                  <span className="truncate font-medium">{primary}</span>
                  <span className="text-xs text-muted tabular-nums">
                    {shortRate(a, t('logActivity.scoring.pts'))}
                  </span>
                </span>
              </span>
              <span className="shrink-0 text-xs text-muted">{secondary}</span>
            </button>
          )
        })}
        {filtered.length === 0 && <p className="px-3 py-4 text-center text-sm text-muted">—</p>}
      </div>
    </div>
  )
}
