import { useRef } from 'react'
import { cn } from '../../lib/cn'

export interface Segment<T extends string> {
  value: T
  label: string
}

interface SegmentedControlProps<T extends string> {
  segments: Segment<T>[]
  value: T
  onChange: (value: T) => void
  ariaLabel: string
}

/** Mutually-exclusive choice with roving arrow-key navigation (radiogroup). */
export function SegmentedControl<T extends string>({
  segments,
  value,
  onChange,
  ariaLabel,
}: SegmentedControlProps<T>) {
  const refs = useRef<(HTMLButtonElement | null)[]>([])

  function onKeyDown(e: React.KeyboardEvent, index: number) {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
    e.preventDefault()
    const dir = e.key === 'ArrowRight' ? 1 : -1
    const next = (index + dir + segments.length) % segments.length
    onChange(segments[next].value)
    refs.current[next]?.focus()
  }

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className="inline-flex w-full rounded-[var(--radius-md)] bg-secondary/5 p-1 ring-1 ring-border"
    >
      {segments.map((seg, i) => {
        const selected = seg.value === value
        return (
          <button
            key={seg.value}
            ref={(el) => {
              refs.current[i] = el
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(seg.value)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={cn(
              'flex-1 rounded-[calc(var(--radius-md)-4px)] px-3 py-1.5 text-sm font-medium transition-colors',
              selected ? 'bg-surface text-primary shadow-[var(--shadow-card)]' : 'text-muted',
            )}
          >
            {seg.label}
          </button>
        )
      })}
    </div>
  )
}
