import { View, Text } from '@tarojs/components'
import { navigateBack } from '@/utils'
import './index.scss'

interface HeaderProps {
  title: string
  subtitle?: string
  showBack?: boolean
  showMenu?: boolean
  rightContent?: React.ReactNode
  rightAction?: React.ReactNode
  statusBadge?: {
    text: string
    type: 'pending' | 'archived' | 'info'
  }
  onMenuClick?: () => void
  onBack?: () => void
}

const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  showBack = false,
  showMenu = false,
  rightContent,
  rightAction,
  statusBadge,
  onMenuClick,
  onBack,
}) => {
  const handleBack = onBack || navigateBack
  const resolvedRightContent = rightAction ?? rightContent
  return (
    <View className="header">
      <View className="header-left">
        {showBack && (
          <View className="back-btn" onClick={handleBack}>
            <View className="icon-chevron-left" />
          </View>
        )}
        {showMenu && (
          <View className="menu-btn" onClick={onMenuClick}>
            <View className="icon-menu" />
          </View>
        )}
      </View>

      <View className="header-center">
        <Text className="header-title">{title}</Text>
        {subtitle && <Text className="header-subtitle">{subtitle}</Text>}
        {statusBadge && (
          <View className={`status-badge status-${statusBadge.type}`}>
            <Text className="status-text">{statusBadge.text}</Text>
          </View>
        )}
      </View>

      <View className="header-right">
        {resolvedRightContent || <View className="placeholder" />}
      </View>
    </View>
  )
}

export default Header
