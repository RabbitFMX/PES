import { cn } from '../../lib/cn'

/** Grey shimmering placeholder — used instead of spinners for content loads. */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn('animate-pulse rounded-[var(--radius-sm)] bg-secondary/10', className)}
    />
  )
}
