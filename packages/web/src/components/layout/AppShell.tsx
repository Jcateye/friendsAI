import { Outlet } from 'react-router-dom'
import { StatusBar } from './StatusBar'
import { TabBar } from './TabBar'

interface AppShellProps {
  showStatusBar?: boolean
  showTabBar?: boolean
  children?: React.ReactNode
}

export function AppShell({
  showStatusBar = true,
  showTabBar = true,
  children,
}: AppShellProps) {
  return (
    <div className="flex flex-col h-full bg-bg-page">
      {showStatusBar && <StatusBar />}
      <main className="flex-1 flex flex-col overflow-hidden">
        {children ?? <Outlet />}
      </main>
      {showTabBar && <TabBar />}
    </div>
  )
}
