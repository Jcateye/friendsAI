import { MessageSquare, Users, Zap } from 'lucide-react'
import type { NavLinkRenderProps } from 'react-router-dom'
import { NavLink } from 'react-router-dom'

const tabs = [
  { to: '/chat', icon: MessageSquare, label: '对话' },
  { to: '/contacts', icon: Users, label: '联系人' },
  { to: '/actions', icon: Zap, label: '行动' },
] as const

export function TabBar() {
  return (
    <nav className="flex items-center justify-around h-20 px-6 pt-3 pb-7 bg-bg-card border-t border-border">
      {tabs.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }: NavLinkRenderProps) =>
            `flex flex-col items-center gap-1 ${
              isActive ? 'text-primary' : 'text-text-muted'
            }`
          }
        >
          {({ isActive }: NavLinkRenderProps) => (
            <>
              <Icon className="w-6 h-6" />
              <span
                className={`text-[11px] ${
                  isActive ? 'font-semibold' : 'font-medium'
                } font-primary`}
              >
                {label}
              </span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
