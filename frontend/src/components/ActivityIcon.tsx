import type { ReactNode } from 'react'
import { cn } from '../lib/cn'
import { activityIconKey, type ActivityIconKey } from '../lib/activityIcon'

/**
 * Activity icons — one cohesive line-icon set (24×24, `currentColor` stroke,
 * matching the nav icons). The id→icon mapping lives in lib/activityIcon.
 * Use <ActivityIcon activityId="run" /> anywhere an activity is shown.
 */

/* Icon bodies — stroke-only, drawn on a 24×24 grid. */
const GLYPHS: Record<ActivityIconKey, ReactNode> = {
  run: (
    <>
      <path d="M7 21l2-4 3-2-1-4 3 2 2 3" />
      <path d="M5 12l3-2 3 1 2-3 3 1" />
      <circle cx="16" cy="5" r="1.8" />
    </>
  ),
  hike: <path d="M3 19h18L14 8l-3 5-2-2-6 8Z" />,
  swim: (
    <>
      <path d="M3 9c2-1.5 4-1.5 6 0s4 1.5 6 0 4-1.5 6 0" />
      <path d="M3 14c2-1.5 4-1.5 6 0s4 1.5 6 0 4-1.5 6 0" />
      <path d="M3 19c2-1.5 4-1.5 6 0s4 1.5 6 0 4-1.5 6 0" />
    </>
  ),
  paddle: (
    <>
      <path d="M3 17c5 2 13 2 18 0" />
      <path d="M15 3l3 3-8 8" />
    </>
  ),
  kayak: (
    <>
      <path d="M4 14c4 3 12 3 16 0-4-3-12-3-16 0Z" />
      <path d="M5 6l14 12M19 6L5 18" opacity="0.5" />
    </>
  ),
  skate: (
    <>
      <path d="M5 6v8h10l3-3" />
      <path d="M4 18h16" />
      <circle cx="7" cy="18" r="1.6" />
      <circle cx="12" cy="18" r="1.6" />
      <circle cx="17" cy="18" r="1.6" />
    </>
  ),
  bike: (
    <>
      <circle cx="6" cy="17" r="3.2" />
      <circle cx="18" cy="17" r="3.2" />
      <path d="M6 17l4-7h6l-4 7M10 10l2 7M14 7h3" />
    </>
  ),
  stroller: (
    <>
      <path d="M4 5h3l3 8h8" />
      <path d="M6 13a6 6 0 0 1 11-3H6" />
      <circle cx="8" cy="19" r="1.6" />
      <circle cx="17" cy="19" r="1.6" />
    </>
  ),
  ski: (
    <>
      <path d="M4 20l14-14M7 20l14-14" />
      <path d="M4 20h4M17 6h4" />
      <path d="M9 11l4 4" opacity="0.5" />
    </>
  ),
  timer: (
    <>
      <circle cx="12" cy="13" r="7" />
      <path d="M12 13V9M9 3h6" />
    </>
  ),
  plank: (
    <>
      <circle cx="5" cy="9" r="1.6" />
      <path d="M6.5 10l12 3" />
      <path d="M9 11v6M16 12v5" />
    </>
  ),
  strength: (
    <>
      <path d="M3 9v6M6 7v10M18 7v10M21 9v6M6 12h12" />
    </>
  ),
  burpee: (
    <>
      <path d="M12 3l3 4h-6l3-4Z" />
      <path d="M12 7v6M8 21l4-4 4 4M4 21h16" />
    </>
  ),
  bar: (
    <>
      <path d="M3 5h18M6 5v3M18 5v3" />
      <path d="M9 8v6a3 3 0 0 0 6 0V8" />
    </>
  ),
  yoga: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" />
    </>
  ),
  jumprope: (
    <>
      <path d="M6 4v6a6 6 0 0 0 12 0V4" />
      <circle cx="6" cy="3" r="1.4" />
      <circle cx="18" cy="3" r="1.4" />
      <path d="M12 16v4" />
    </>
  ),
  football: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      {/* pentagon centre + seams to the edges (original soccer-ball mark) */}
      <path d="M12 8.5l3 2.2-1.1 3.6h-3.8L9 10.7l3-2.2Z" />
      <path d="M12 3.5v5M4.5 9.5l4.5 1.2M19.5 9.5l-4.5 1.2M7.2 19.4l2.7-3.1M16.8 19.4l-2.7-3.1" />
    </>
  ),
  racket: (
    <>
      <ellipse cx="9" cy="9" rx="5.5" ry="6.5" transform="rotate(-40 9 9)" />
      <path d="M6.5 11.5l-1.7 1.7" />
      <path d="M4.8 13.2l-1.8 4.6 4.6-1.8" />
      <path d="M6.5 6.5l5 5M9.5 5l4 4M4.8 9.5l4.6 4.6" opacity="0.6" />
    </>
  ),
  basketball: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 3.5v17M3.5 12h17" />
      <path d="M5 6c3 2.5 3 9.5 0 12M19 6c-3 2.5-3 9.5 0 12" opacity="0.8" />
    </>
  ),
  dumbbell: (
    <>
      <path d="M9 8v8M15 8v8M9 12h6" />
      <path d="M6 6v12M18 6v12" />
      <path d="M4 9v6M20 9v6" />
    </>
  ),
  route: (
    <>
      <path d="M6 20c0-4 12-4 12-9a4 4 0 0 0-8 0" />
      <circle cx="6" cy="20" r="1.6" />
      <circle cx="14" cy="7" r="1.6" />
    </>
  ),
  flag: <path d="M6 21V4h11l-2 4 2 4H6" />,
  trophy: (
    <path d="M7 4h10v4a5 5 0 0 1-10 0V4zM7 6H4v2a3 3 0 0 0 3 3M17 6h3v2a3 3 0 0 1-3 3M9 20h6M12 15v5" />
  ),
  generic: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v4l3 2" />
    </>
  ),
}

export function ActivityIcon({
  activityId,
  className,
  title,
}: {
  activityId: string | null | undefined
  className?: string
  title?: string
}) {
  const key = activityIconKey(activityId)
  return (
    <svg
      viewBox="0 0 24 24"
      className={cn('size-5', className)}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      role="img"
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      {GLYPHS[key]}
    </svg>
  )
}
