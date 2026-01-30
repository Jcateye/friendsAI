import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import type { TabType } from '@/types'
import './index.scss'

interface TabBarProps {
  current: TabType
}

const tabs = [
  { key: 'conversation' as TabType, icon: 'message-square', text: '对话', path: '/pages/conversation/index' },
  { key: 'contacts' as TabType, icon: 'users', text: '联系人', path: '/pages/contacts/index' },
  { key: 'action' as TabType, icon: 'zap', text: '行动', path: '/pages/action/index' },
]

const TabBar: React.FC<TabBarProps> = ({ current }) => {
  const handleTabClick = (path: string) => {
    Taro.switchTab({ url: path })
  }

  return (
    <View className="tab-bar">
      {tabs.map((tab) => (
        <View
          key={tab.key}
          className={`tab-item ${current === tab.key ? 'active' : ''}`}
          onClick={() => handleTabClick(tab.path)}
        >
          <View className={`tab-icon icon-${tab.icon}`} />
          <Text className="tab-text">{tab.text}</Text>
        </View>
      ))}
    </View>
  )
}

export default TabBar
