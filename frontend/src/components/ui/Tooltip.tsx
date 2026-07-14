import { useId, useState, type ReactNode } from 'react'

interface TooltipProps {
  content: string
  children: ReactNode
}

/** Lightweight tooltip shown on hover and keyboard focus. */
export function Tooltip({ content, children }: TooltipProps) {
  const [open, setOpen] = useState(false)
  const id = useId()

  return (
    <span className="relative inline-flex">
      <span
        aria-describedby={id}
        tabIndex={0}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className="inline-flex"
      >
        {children}
      </span>
      <span
        role="tooltip"
        id={id}
        className={
          'pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 w-max max-w-56 -translate-x-1/2 rounded-[var(--radius-sm)] bg-secondary px-2 py-1 text-xs text-background shadow-[var(--shadow-pop)] transition-opacity ' +
          (open ? 'opacity-100' : 'opacity-0')
        }
      >
        {content}
      </span>
    </span>
  )
}
