import { useMemo, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { LogActivityContext } from '../../context/logActivity'
import { Logo } from '../Logo'
import { ProfileMenu } from './ProfileMenu'
import { TestDataToggle } from '../TestDataToggle'
import { TopBar } from './TopBar'
import { BottomTabBar } from './BottomTabBar'
import { LogActivityModal } from '../../pages/log-activity/LogActivityModal'

export function AppShell() {
  const [logOpen, setLogOpen] = useState(false)
  const logCtx = useMemo(() => ({ open: () => setLogOpen(true) }), [])

  return (
    <LogActivityContext.Provider value={logCtx}>
      <div className="min-h-dvh">
        <TopBar onLogActivity={logCtx.open} />

        {/* Slim mobile top bar — carries the logo and the profile menu. */}
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-border bg-surface/95 px-4 backdrop-blur lg:hidden">
          <span className="flex items-center gap-2 text-primary">
            <Logo />
            <span className="font-bold">PES</span>
          </span>
          <div className="flex items-center gap-2">
            <TestDataToggle />
            <ProfileMenu />
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-4 pt-4 pb-28 lg:px-6 lg:pb-10">
          <Outlet />
        </main>

        <BottomTabBar onLogActivity={logCtx.open} />
        <LogActivityModal open={logOpen} onClose={() => setLogOpen(false)} />
      </div>
    </LogActivityContext.Provider>
  )
}
