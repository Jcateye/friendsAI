import { useState } from 'react'
import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { AtIcon } from 'taro-ui'
import Header from '../../components/Header'
import TabBar from '../../components/TabBar'
import GlobalDrawer from '../../components/GlobalDrawer'
import './index.scss'

interface ActionItem {
  id: string
  icon: string
  title: string
  description: string
  color: string
}

const actions: ActionItem[] = [
  {
    id: 'quick-note',
    icon: 'edit',
    title: '快速笔记',
    description: '记录想法和灵感',
    color: '#FF6B6B'
  },
  {
    id: 'schedule-meeting',
    icon: 'calendar',
    title: '安排会议',
    description: '与联系人预约时间',
    color: '#4ECDC4'
  },
  {
    id: 'send-message',
    icon: 'message',
    title: '发送消息',
    description: '给联系人发送消息',
    color: '#45B7D1'
  },
  {
    id: 'set-reminder',
    icon: 'bell',
    title: '设置提醒',
    description: '创建待办事项提醒',
    color: '#96CEB4'
  },
  {
    id: 'import-contacts',
    icon: 'download',
    title: '导入联系人',
    description: '从其他平台导入',
    color: '#DDA0DD'
  },
  {
    id: 'export-data',
    icon: 'upload',
    title: '导出数据',
    description: '备份您的数据',
    color: '#F7DC6F'
  }
]

const ActionPage: React.FC = () => {
  const [drawerOpen, setDrawerOpen] = useState(false)

  const handleActionClick = (action: ActionItem) => {
    Taro.showToast({ title: action.title, icon: 'none' })
  }

  return (
    <View className="action-page">
      <Header
        title="快捷操作"
        onMenuClick={() => setDrawerOpen(true)}
      />

      <View className="action-content">
        <View className="action-grid">
          {actions.map(action => (
            <View
              key={action.id}
              className="action-card"
              onClick={() => handleActionClick(action)}
            >
              <View
                className="action-icon"
                style={{ backgroundColor: action.color }}
              >
                <AtIcon value={action.icon} size="24" color="#fff" />
              </View>
              <Text className="action-title">{action.title}</Text>
              <Text className="action-desc">{action.description}</Text>
            </View>
          ))}
        </View>
      </View>

      <TabBar currentTab="action" />

      <GlobalDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />
    </View>
  )
}

export default ActionPage
