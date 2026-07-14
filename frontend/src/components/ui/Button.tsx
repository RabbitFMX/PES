import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '../../lib/cn'
import { Spinner } from './Spinner'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'icon' | 'fab'
type Size = 'sm' | 'md' | 'lg'

interface CommonProps {
  variant?: Variant
  size?: Size
  fullWidth?: boolean
  leftIcon?: ReactNode
  className?: string
  children?: ReactNode
}

export interface ButtonProps extends CommonProps, ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean
}

const base =
  'inline-flex items-center justify-center gap-2 font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50'

const variants: Record<Variant, string> = {
  primary:
    'bg-primary text-[var(--color-on-primary)] hover:bg-primary/90 rounded-[var(--radius-md)]',
  secondary:
    'bg-transparent text-secondary ring-1 ring-border hover:bg-secondary/5 rounded-[var(--radius-md)]',
  ghost: 'bg-transparent text-secondary hover:bg-secondary/10 rounded-[var(--radius-md)]',
  danger: 'bg-danger text-white hover:bg-danger/90 rounded-[var(--radius-md)]',
  icon: 'bg-transparent text-secondary hover:bg-secondary/10 rounded-full',
  fab: 'bg-accent text-[var(--color-on-accent)] hover:bg-accent/90 rounded-full shadow-[var(--shadow-pop)]',
}

const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-6 text-base',
}

const iconSizes: Record<Size, string> = {
  sm: 'size-8',
  md: 'size-10',
  lg: 'size-12',
}

function classesFor(variant: Variant, size: Size, fullWidth: boolean, className?: string) {
  const iconOnly = variant === 'icon' || variant === 'fab'
  return cn(
    base,
    variants[variant],
    iconOnly ? iconSizes[size] : sizes[size],
    { 'w-full': fullWidth },
    className,
  )
}

/** Renders a react-router Link styled exactly like a Button. */
export function ButtonLink({
  to,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  leftIcon,
  className,
  children,
}: CommonProps & { to: string }) {
  return (
    <Link to={to} className={classesFor(variant, size, fullWidth, className)}>
      {leftIcon}
      {children}
    </Link>
  )
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    loading = false,
    fullWidth = false,
    leftIcon,
    className,
    children,
    disabled,
    ...rest
  },
  ref,
) {
  const iconOnly = variant === 'icon' || variant === 'fab'
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={classesFor(variant, size, fullWidth, className)}
      {...rest}
    >
      {loading ? <Spinner /> : leftIcon}
      {!iconOnly && children}
      {iconOnly && !loading && children}
    </button>
  )
})
