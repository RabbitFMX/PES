import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

type BadgeVariant = 'neutral' | 'success' | 'accent' | 'primary' | 'danger'

const variants: Record<BadgeVariant, string> = {
  neutral: 'bg-secondary/10 text-secondary',
  // filled tokens paired with dark on-* foregrounds — passes AA (see a11y notes)
  success: 'bg-success text-[var(--color-on-success)]',
  accent: 'bg-accent text-[var(--color-on-accent)]',
  primary: 'bg-primary text-[var(--color-on-primary)]',
  danger: 'bg-danger text-white',
}

export function Badge({
  variant = 'neutral',
  children,
  className,
}: {
  variant?: BadgeVariant
  children: ReactNode
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold',
        variants[variant],
        className,
      )}
    >
      {children}
    </span>
  )
}
