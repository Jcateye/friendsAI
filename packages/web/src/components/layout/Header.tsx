import { ChevronLeft, Menu, SquarePen } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface HeaderProps {
  title: string
  showBack?: boolean
  showMenu?: boolean
  showNewChat?: boolean
  showEdit?: boolean
  rightElement?: React.ReactNode
  onMenuClick?: () => void
  onNewChatClick?: () => void
}

export function Header({
  title,
  showBack = false,
  showMenu = false,
  showNewChat = false,
  showEdit = false,
  rightElement,
  onMenuClick,
  onNewChatClick,
}: HeaderProps) {
  const navigate = useNavigate()

  return (
    <div className="flex items-center justify-between h-14 px-4 bg-bg-card">
      <div className="flex items-center">
        {showBack && (
          <button onClick={() => navigate(-1)} aria-label="返回" className="p-1 -ml-1">
            <ChevronLeft className="w-6 h-6 text-text-primary" />
          </button>
        )}
        {showMenu && (
          <button onClick={onMenuClick} aria-label="菜单" className="p-1 -ml-1">
            <Menu className="w-6 h-6 text-text-primary" />
          </button>
        )}
      </div>

      <h1 className="text-lg font-semibold text-text-primary font-display">
        {title}
      </h1>

      <div className="flex items-center justify-center">
        {showNewChat && (
          <button onClick={onNewChatClick} aria-label="新对话" className="p-1 -mr-1">
            <SquarePen className="w-6 h-6 text-text-primary" />
          </button>
        )}
        {showEdit && (
          <button aria-label="编辑" className="p-1 -mr-1">
            <SquarePen className="w-6 h-6 text-text-primary" />
          </button>
        )}
        {rightElement}
      </div>
    </div>
  )
}
