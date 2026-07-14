import { createContext, useContext } from 'react'

export type ToastVariant = 'success' | 'error' | 'info'

export interface Toast {
  id: number
  message: string
  variant: ToastVariant
  actionLabel?: string
  onAction?: () => void
}

export interface ToastContextValue {
  showToast: (toast: Omit<Toast, 'id'>) => void
  dismiss: (id: number) => void
  toasts: Toast[]
}

export const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
