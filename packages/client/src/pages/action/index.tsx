import { useState } from 'react'
import { View, Text } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { AtIcon } from 'taro-ui'
import Header from '../../components/Header'
import TabBar from '../../components/TabBar'
import GlobalDrawer from '../../components/GlobalDrawer'
import { actionApi, toolConfirmationApi } from '../../services/api'
import { ActionItem, ToolConfirmation } from '../../types'
import { showToast } from '../../utils'
import './index.scss'

const ActionPage: React.FC = () => {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [items, setItems] = useState<ActionItem[]>([])
  const [toolConfirmations, setToolConfirmations] = useState<ToolConfirmation[]>([])
  const [executedConfirmations, setExecutedConfirmations] = useState<ToolConfirmation[]>([])
  const [loading, setLoading] = useState(false)

  const loadActions = async () => {
    try {
      setLoading(true)
      const [actions, pending, confirmed, failed, rejected] = await Promise.all([
        actionApi.getOpenActions().catch(() => ({ items: [] })),
        toolConfirmationApi.list('pending').catch(() => ({ items: [] })),
        toolConfirmationApi.list('confirmed').catch(() => ({ items: [] })),
        toolConfirmationApi.list('failed').catch(() => ({ items: [] })),
        toolConfirmationApi.list('rejected').catch(() => ({ items: [] })),
      ])
      setItems(actions.items)
      setToolConfirmations(pending.items || [])
      setExecutedConfirmations([...(failed.items || []), ...(rejected.items || []), ...(confirmed.items || [])].slice(0, 20))
    } catch (error) {
      showToast('加载失败')
    } finally {
      setLoading(false)
    }
  }

  useDidShow(() => {
    loadActions()
  })

  const handleComplete = async (item: ActionItem) => {
    try {
      await actionApi.update(item.id, { status: 'done' })
      showToast('已完成', 'success')
      setItems((prev) => prev.filter((it) => it.id !== item.id))
    } catch (error) {
      showToast('更新失败')
    }
  }

  const handleConfirmTool = async (confirmation: ToolConfirmation) => {
    try {
      const result = await toolConfirmationApi.confirm(confirmation.id)
      showToast('已确认执行', 'success')
      setToolConfirmations((prev) => prev.filter((t) => t.id !== confirmation.id))
      setExecutedConfirmations((prev) => [result, ...prev].slice(0, 20))
    } catch (error) {
      showToast('确认失败')
    }
  }

  const handleRejectTool = async (confirmation: ToolConfirmation) => {
    try {
      const result = await toolConfirmationApi.reject(confirmation.id, '用户拒绝')
      showToast('已拒绝执行')
      setToolConfirmations((prev) => prev.filter((t) => t.id !== confirmation.id))
      setExecutedConfirmations((prev) => [result, ...prev].slice(0, 20))
    } catch (error) {
      showToast('操作失败')
    }
  }

  const handleViewToolExecution = async (confirmation: ToolConfirmation) => {
    try {
      const payload = confirmation.result || confirmation.payload || {}
      Taro.showModal({
        title: `${confirmation.toolName} (${confirmation.status})`,
        content: JSON.stringify(payload, null, 2),
        showCancel: false,
      })
    } catch (error) {
      showToast('获取执行结果失败')
    }
  }

  return (
    <View className="action-page">
      <Header
        title="待办事项"
        onMenuClick={() => setDrawerOpen(true)}
      />

      <View className="action-content">
        {toolConfirmations.length > 0 && (
          <View className="tool-section">
            <Text className="section-title">待确认执行</Text>
            <View className="action-list">
              {toolConfirmations.map((t) => (
                <View key={t.id} className="action-row">
                  <View className="action-info">
                    <Text className="action-title">
                      {t.toolName}
                      {t.conversationId ? `（${t.conversationId}）` : ''}
                    </Text>
                    <Text className="action-due">{JSON.stringify(t.payload || {})}</Text>
                  </View>
                  <View className="action-complete" onClick={() => handleConfirmTool(t)}>
                    <AtIcon value="check" size="16" color="#7C9070" />
                    <Text className="complete-text">确认</Text>
                  </View>
                  <View className="action-complete" onClick={() => handleRejectTool(t)}>
                    <AtIcon value="close-circle" size="16" color="#D4845E" />
                    <Text className="complete-text">拒绝</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {executedConfirmations.length > 0 && (
          <View className="tool-section">
            <Text className="section-title">最近执行结果</Text>
            <View className="action-list">
              {executedConfirmations.map((t) => (
                <View key={t.id} className="action-row">
                  <View className="action-info">
                    <Text className="action-title">
                      {t.toolName}
                      {t.status ? `（${t.status}）` : ''}
                    </Text>
                    <Text className="action-due">
                      {t.executedAt || t.confirmedAt || t.rejectedAt || '暂无执行记录'}
                    </Text>
                  </View>
                  <View className="action-complete" onClick={() => handleViewToolExecution(t)}>
                    <Text className="complete-text">查看</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {items.length > 0 && (
          <View className="section">
            <Text className="section-title">待办事项</Text>
            <View className="action-list">
              {items.map((item) => (
                <View key={item.id} className="action-row">
                  <View className="action-info">
                    <Text className="action-title">{item.suggestion_reason || '待办事项'}</Text>
                    <Text className="action-due">{item.due_at ? `截止 ${item.due_at}` : '未设置时间'}</Text>
                  </View>
                  <View className="action-complete" onClick={() => handleComplete(item)}>
                    <AtIcon value="check" size="16" color="#7C9070" />
                    <Text className="complete-text">完成</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {loading && (
          <View className="loading-state">
            <Text>加载中...</Text>
          </View>
        )}
      </View>

      <TabBar current="action" />

      <GlobalDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />
    </View>
  )
}

export default ActionPage
