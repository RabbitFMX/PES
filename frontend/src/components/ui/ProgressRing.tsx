import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

interface ProgressRingProps {
  value: number
  max: number
  size?: number
  stroke?: number
  children?: ReactNode
  /** Accessible text alternative, e.g. "64 of 100 points". */
  valueText: string
}

export function ProgressRing({
  value,
  max,
  size = 200,
  stroke = 14,
  children,
  valueText,
}: ProgressRingProps) {
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const fraction = max > 0 ? Math.min(value / max, 1) : 0
  const offset = circumference * (1 - fraction)
  const goalMet = value >= max && max > 0

  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuetext={valueText}
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          className="stroke-secondary/15"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={cn(
            'transition-[stroke-dashoffset] duration-700 ease-out',
            goalMet ? 'stroke-success' : 'stroke-accent',
          )}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        {children}
      </div>
    </div>
  )
}
