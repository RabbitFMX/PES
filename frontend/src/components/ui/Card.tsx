import type { HTMLAttributes } from 'react'
import { cn } from '../../lib/cn'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  highlighted?: boolean
}

export function Card({ highlighted, className, children, ...rest }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-[var(--radius-md)] bg-surface p-4 shadow-[var(--shadow-card)] ring-1',
        highlighted ? 'ring-2 ring-primary' : 'ring-border',
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  )
}
