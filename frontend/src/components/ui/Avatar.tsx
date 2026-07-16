import { cn } from '../../lib/cn'
import { DogAvatar } from '../DogAvatar'
import { isDogAvatar, parseDog } from '../../lib/dogAvatar'

interface AvatarProps {
  name: string
  src?: string | null
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizes = {
  sm: 'size-8 text-xs',
  md: 'size-10 text-sm',
  lg: 'size-16 text-xl',
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
}

export function Avatar({ name, src, size = 'md', className }: AvatarProps) {
  if (isDogAvatar(src)) {
    return (
      <span
        className={cn(
          'inline-block overflow-hidden rounded-full bg-surface',
          sizes[size],
          className,
        )}
      >
        <DogAvatar config={parseDog(src)} title={name} className="h-full w-full" />
      </span>
    )
  }
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={cn('rounded-full object-cover', sizes[size], className)}
      />
    )
  }
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-flex items-center justify-center rounded-full bg-primary/15 font-semibold text-primary',
        sizes[size],
        className,
      )}
    >
      {initials(name)}
    </span>
  )
}
