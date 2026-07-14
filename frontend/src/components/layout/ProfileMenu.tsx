import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../context/auth'
import { Avatar } from '../ui/Avatar'

export function ProfileMenu() {
  const { user, logout } = useAuth()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  if (!user) return null

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t('nav.profileMenu')}
        className="rounded-full ring-1 ring-border hover:ring-primary"
      >
        <Avatar name={user.displayName} src={user.avatarUrl} size="md" />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 z-30 mt-2 w-56 rounded-[var(--radius-md)] bg-surface py-2 shadow-[var(--shadow-pop)] ring-1 ring-border"
        >
          <div className="px-4 py-2">
            <p className="truncate text-sm font-semibold text-text">{user.displayName}</p>
            <p className="truncate text-xs text-muted">{user.email}</p>
          </div>
          <div className="my-1 h-px bg-border" />
          <Link
            to="/profile"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="block px-4 py-2 text-sm text-text hover:bg-secondary/10"
          >
            {t('nav.settings')}
          </Link>
          {user.role === 'admin' && (
            <Link
              to="/admin"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="block px-4 py-2 text-sm text-text hover:bg-secondary/10"
            >
              {t('nav.admin')}
            </Link>
          )}
          <div className="my-1 h-px bg-border" />
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              logout()
              navigate('/login')
            }}
            className="block w-full px-4 py-2 text-left text-sm text-danger hover:bg-secondary/10"
          >
            {t('nav.logout')}
          </button>
        </div>
      )}
    </div>
  )
}
