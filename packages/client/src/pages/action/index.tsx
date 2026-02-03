import { useState, useEffect } from 'react'
import { View, Text, ScrollView } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { AtIcon } from 'taro-ui'
import Header from '../../components/Header'
import TabBar from '../../components/TabBar'
import GlobalDrawer from '../../components/GlobalDrawer'
import { actionApi } from '../../services/api'
import type { FollowUpItem, SuggestionItem, WeeklyStats } from '../../types'
import { showToast } from '../../utils'
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
  const [followUps, setFollowUps] = useState<FollowUpItem[]>([])
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([])
  const [weeklyStats, setWeeklyStats] = useState<WeeklyStats | null>(null)
  const [loading, setLoading] = useState(true)

  const loadActionData = async () => {
    setLoading(true)
    try {
      const [followUpsData, suggestionsData, weeklyStatsData] = await Promise.all([
        actionApi.getFollowUps(),
        actionApi.getSuggestions(),
        actionApi.getWeeklyStats(),
      ])
      setFollowUps(followUpsData)
      setSuggestions(suggestionsData)
      setWeeklyStats(weeklyStatsData)
    } catch (error) {
      console.error('Failed to load action data:', error)
      showToast('加载行动数据失败', 'error')
    } finally {
      setLoading(false)
    }
  }

  useDidShow(() => {
    loadActionData()
  })

  useEffect(() => {
    // This useEffect is to handle initial load or if useDidShow has issues in some environments.
    // It will effectively be called only once on mount if useDidShow handles subsequent renders.
    loadActionData();
  }, [])

  const handleActionClick = (action: ActionItem) => {
    if (action.id === 'quick-note') {
      Taro.switchTab({ url: '/pages/conversation/index' })
    } else if (action.id === 'send-message') {
      Taro.navigateTo({ url: '/pages/connector/index' })
    } else {
      Taro.showToast({ title: `${action.title}功能开发中`, icon: 'none' })
    }
  }

  return (
    <View className="action-page">
      <Header
        title="快捷操作"
        onMenuClick={() => setDrawerOpen(true)}
      />

      <ScrollView scrollY className="action-scroll-content">
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

          {loading ? (
            <View className="loading-state">
              <Text>加载中...</Text>
            </View>
          ) : (
            <View className="dynamic-sections">
              {/* Follow Ups Section */}
              {followUps.length > 0 && (
                <View className="section">
                  <Text className="section-title">待办事项</Text>
                  {followUps.map(item => (
                    <View key={item.id} className="follow-up-item">
                      <View className="item-icon" style={{ backgroundColor: item.contact.avatarColor }}>
                        <Text className="icon-text">{item.contact.initial}</Text>
                      </View>
                      <View className="item-content">
                        <Text className="item-title">{item.reason}</Text>
                        <Text className="item-meta">与 {item.contact.name}</Text>
                      </View>
                      {item.urgent && <Text className="item-urgent">紧急</Text>}
                    </View>
                  ))}
                </View>
              )}

              {/* Suggestions Section */}
              {suggestions.length > 0 && (
                <View className="section">
                  <Text className="section-title">AI 推荐</Text>
                  {suggestions.map(item => (
                    <View key={item.id} className="suggestion-item">
                      <View className="item-icon" style={{ backgroundColor: item.contact.avatarColor }}>
                        <Text className="icon-text">{item.contact.initial}</Text>
                      </View>
                      <View className="item-content">
                        <Text className="item-title">{item.reason}</Text>
                        <Text className="item-meta">与 {item.contact.name}</Text>
                      </View>
                      {item.urgent && <Text className="item-urgent">重要</Text>}
                    </View>
                  ))}
                </View>
              )}

              {/* Weekly Stats Section */}
              {weeklyStats && (
                <View className="section">
                  <Text className="section-title">周统计</Text>
                  <View className="stats-card">
                    <View className="stat-item">
                      <Text className="stat-value">{weeklyStats.records}</Text>
                      <Text className="stat-label">记录</Text>
                    </View>
                    <View className="stat-item">
                      <Text className="stat-value">{weeklyStats.visits}</Text>
                      <Text className="stat-label">拜访</Text>
                    </View>
                    <View className="stat-item">
                      <Text className="stat-value">{weeklyStats.progress}</Text>
                      <Text className="stat-label">进展</Text>
                    </View>
                  </View>
                </View>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      <TabBar current="action" />

      <GlobalDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />
    </View>
  )
}

export default ActionPage
