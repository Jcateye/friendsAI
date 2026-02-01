import { useState } from 'react'
import { View, Text } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { AtIcon } from 'taro-ui'
import Header from '../../components/Header'
import TabBar from '../../components/TabBar'
import GlobalDrawer from '../../components/GlobalDrawer'
import { actionApi, toolTaskApi } from '../../services/api'
import { ActionItem, ToolTask } from '../../types'
import { showToast } from '../../utils'
import './index.scss'

const ActionPage: React.FC = () => {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [items, setItems] = useState<ActionItem[]>([])
  const [toolTasks, setToolTasks] = useState<ToolTask[]>([])
  const [executedToolTasks, setExecutedToolTasks] = useState<ToolTask[]>([])
  const [loading, setLoading] = useState(false)

  const loadActions = async () => {
    try {
      setLoading(true)
      const [actions, tasks, doneTasks, failedTasks] = await Promise.all([
        actionApi.getOpenActions(),
        toolTaskApi.listPending().catch(() => ({ items: [] })),
        toolTaskApi.list('done').catch(() => ({ items: [] })),
        toolTaskApi.list('failed').catch(() => ({ items: [] })),
      ])
      setItems(actions.items)
      setToolTasks(tasks.items)
      setExecutedToolTasks([...(failedTasks.items || []), ...(doneTasks.items || [])].slice(0, 20))
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

  const handleConfirmTool = async (task: ToolTask) => {
    try {
      await toolTaskApi.confirm(task.id)
      showToast('已确认执行', 'success')
      setToolTasks((prev) => prev.filter((t) => t.id !== task.id))
    } catch (error) {
      showToast('确认失败')
    }
  }

  const handleViewToolExecution = async (task: ToolTask) => {
    try {
      const executions = await toolTaskApi.listExecutions(task.id)
      Taro.showModal({
        title: `${task.type} (${task.status})`,
        content: JSON.stringify(executions.items?.[0]?.response_json ?? task.last_execution_response ?? {}, null, 2),
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
        {toolTasks.length > 0 && (
          <View className="tool-section">
            <Text className="section-title">待确认执行</Text>
            <View className="action-list">
              {toolTasks.map((t) => (
                <View key={t.id} className="action-row">
                  <View className="action-info">
                    <Text className="action-title">
                      {t.contact_name ? `${t.contact_name}：` : ''}
                      {t.type}
                    </Text>
                    <Text className="action-due">{JSON.stringify(t.payload_json)}</Text>
                  </View>
                  <View className="action-complete" onClick={() => handleConfirmTool(t)}>
                    <AtIcon value="check" size="16" color="#7C9070" />
                    <Text className="complete-text">确认</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {executedToolTasks.length > 0 && (
          <View className="tool-section">
            <Text className="section-title">最近执行结果</Text>
            <View className="action-list">
              {executedToolTasks.map((t) => (
                <View key={t.id} className="action-row">
                  <View className="action-info">
                    <Text className="action-title">
                      {t.contact_name ? `${t.contact_name}：` : ''}
                      {t.type}
                      {t.status ? `（${t.status}）` : ''}
                    </Text>
                    <Text className="action-due">
                      {t.last_execution_at ? `执行时间 ${t.last_execution_at}` : '暂无执行记录'}
                    </Text>
                  </View>
                  <View className="action-complete" onClick={() => handleViewToolExecution(t)}>
                    <AtIcon value="eye" size="16" color="#7C9070" />
                    <Text className="complete-text">查看</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {loading ? (
          <View className="loading-state">
            <Text>加载中...</Text>
          </View>
        ) : items.length === 0 ? (
          <View className="empty-state">
            <Text className="empty-text">暂无待办</Text>
          </View>
        ) : (
          <View className="action-list">
            {items.map((item) => (
              <View key={item.id} className="action-row">
                <View className="action-info">
                  <Text className="action-title">
                    {item.contact_name ? `${item.contact_name}：` : ''}
                    {item.suggestion_reason || '待办'}
                  </Text>
                  {item.due_at && <Text className="action-due">截止 {item.due_at}</Text>}
                </View>
                <View className="action-complete" onClick={() => handleComplete(item)}>
                  <AtIcon value="check" size="16" color="#7C9070" />
                  <Text className="complete-text">完成</Text>
                </View>
              </View>
            ))}
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
