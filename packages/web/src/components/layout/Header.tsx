import { ChevronLeft, Menu, SquarePen } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface HeaderProps {
  title: string
  showBack?: boolean
  showMenu?: boolean
  showNewChat?: boolean
  showEdit?: boolean
  rightElement?: React.ReactNode
}

export function Header({
  title,
  showBack = false,
  showMenu = false,
  showNewChat = false,
  showEdit = false,
  rightElement,
}: HeaderProps) {
  const navigate = useNavigate()

  return (
    <div className="flex items-center justify-between h-14 px-4 bg-bg-card">
      <div className="w-6 h-6">
        {showBack && (
          <button onClick={() => navigate(-1)} aria-label="返回">
            <ChevronLeft className="w-6 h-6 text-text-primary" />
          </button>
        )}
        {showMenu && (
          <button aria-label="菜单">
            <Menu className="w-6 h-6 text-text-primary" />
          </button>
        )}
      </div>

      <h1 className="text-lg font-semibold text-text-primary font-display">
        {title}
      </h1>

      <div className="w-6 h-6 flex items-center justify-center">
        {showNewChat && (
          <button aria-label="新对话">
            <SquarePen className="w-6 h-6 text-text-primary" />
          </button>
        )}
        {showEdit && (
          <button aria-label="编辑">
            <SquarePen className="w-6 h-6 text-text-primary" />
          </button>
        )}
        {rightElement}
      </div>
    </div>
  )
}
