import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { AtIcon } from 'taro-ui'
import type { TabType } from '@/types'
import './index.scss'

interface TabBarProps {
  current: TabType
}

const tabs = [
  { key: 'conversation' as TabType, icon: 'message', text: '对话', path: '/pages/conversation/index' },
  { key: 'contacts' as TabType, icon: 'user', text: '联系人', path: '/pages/contacts/index' },
  { key: 'action' as TabType, icon: 'bell', text: '行动', path: '/pages/action/index' },
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
          <AtIcon
            value={tab.icon}
            size="24"
            color={current === tab.key ? '#7C9070' : '#8E8E93'}
          />
          <Text className="tab-text">{tab.text}</Text>
        </View>
      ))}
    </View>
  )
}

export default TabBar
