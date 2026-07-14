import { cn } from '../lib/cn'

/**
 * Placeholder single-colour paw mark (project-brief.md §8). Uses currentColor
 * so it themes correctly as a favicon, header mark and "+" accent. Swap for
 * the designed logo later.
 */
export function Logo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={cn('size-6', className)}
    >
      <circle cx="7" cy="7" r="2.2" />
      <circle cx="12.5" cy="5" r="2.2" />
      <circle cx="17.5" cy="7.3" r="2.2" />
      <circle cx="19.3" cy="12.5" r="2" />
      <path d="M12 10.5c3.5 0 6.5 2.6 6.5 5.8 0 2.4-2 3.7-4.4 3.2-1.4-.3-2.8-.3-4.2 0-2.4.5-4.4-.8-4.4-3.2 0-3.2 3-5.8 6.5-5.8z" />
    </svg>
  )
}
