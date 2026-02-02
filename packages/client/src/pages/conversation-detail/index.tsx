import { View, Text, ScrollView } from '@tarojs/components'
import { useState, useEffect } from 'react'
import Taro, { useRouter } from '@tarojs/taro' // 导入 Taro
import Header from '@/components/Header'
import type { ConversationDetail as ConversationDetailType } from '@/types'
import { navigateBack, showToast, showLoading, hideLoading } from '@/utils'
import { conversationApi } from '@/services/api' // 导入 conversationApi
import './index.scss'

const ConversationDetailPage: React.FC = () => {
  const router = useRouter()
  const { id } = router.params

  const [detail, setDetail] = useState<ConversationDetailType | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadDetail = async () => {
      if (!id) {
        showToast('对话ID缺失', 'error')
        setLoading(false)
        return
      }
      setLoading(true)
      try {
        const data = await conversationApi.getDetail(id) // 调用后端 API
        setDetail(data)
      } catch (error) {
        console.error('Failed to load conversation detail:', error)
        showToast('加载详情失败', 'error')
        setDetail(null)
      } finally {
        setLoading(false)
      }
    }
    loadDetail()
  }, [id])

  const handleBack = () => {
    navigateBack()
  }

  const handleArchive = async () => {
    if (!id || !detail) {
      showToast('对话数据缺失，无法归档', 'error')
      return
    }
    try {
      showLoading('归档中...')
      // 假设 archiveResult 结构与后端要求一致，或可以在此处进行转换
      await conversationApi.archive(id, { archiveResult: detail.archiveResult }) // 调用后端 API
      hideLoading()
      showToast('归档成功', 'success')
      navigateBack()
    } catch (error) {
      hideLoading()
      showToast((error as Error).message || '归档失败')
    }
  }

  if (loading || !detail) {
    return (
      <View className="detail-page">
        <Header title="加载中..." showBack />
        <View className="loading-state"><Text>加载中...</Text></View>
      </View>
    )
  }

  return (
    <View className="detail-page">
      <Header
        title={detail.title}
        showBack
        statusBadge={{
          text: detail.status === 'pending' ? '待确认' : '已归档',
          type: detail.status,
        }}
      />

      <ScrollView className="scroll-content" scrollY>
        <View className="detail-inner">
          <View className="input-section">
            <Text className="section-label">记录内容</Text>
            <View className="user-bubble">
              <Text className="user-text">{detail.originalContent}</Text>
            </View>
          </View>

          {detail.archiveResult && (
            <>
              <View className="ai-result-label">
                <View className="ai-icon">
                  <View className="icon-sparkles" />
                </View>
                <Text className="ai-label-text">AI 归档结果</Text>
              </View>

              <View className="result-card">
                <View className="card-header">
                  <Text className="card-title">识别到的人</Text>
                  <View className="card-badge">
                    <Text className="badge-text">{detail.archiveResult.recognizedPeople?.length || 0}人</Text>
                  </View>
                </View>
                {detail.archiveResult.recognizedPeople?.map((person) => (
                  <View key={person.id} className="person-row">
                    <View className="person-avatar" style={{ backgroundColor: person.avatarColor }}>
                      <Text className="avatar-initial">{person.initial}</Text>
                    </View>
                    <View className="person-info">
                      <Text className="person-name">{person.name}</Text>
                      <Text className="person-role">{person.company} {person.role}</Text>
                    </View>
                    <View className="icon-check-circle" />
                  </View>
                ))}
              </View>

              <View className="result-card">
                <View className="card-header">
                  <Text className="card-title">新增事件</Text>
                </View>
                {detail.archiveResult.newEvents?.map((event) => (
                  <View key={event.id} className="event-row">
                    <View className="event-icon">
                      <View className="icon-calendar" />
                    </View>
                    <View className="event-info">
                      <Text className="event-type">拜访会议</Text>
                      <Text className="event-meta">{event.date} · {event.location}</Text>
                      <Text className="event-summary">{event.summary}</Text>
                    </View>
                  </View>
                ))}
              </View>

              <View className="result-card">
                <View className="card-header">
                  <Text className="card-title">提取到的事实</Text>
                  <View className="card-badge purple">
                    <Text className="badge-text">画像更新</Text>
                  </View>
                </View>
                {detail.archiveResult.extractedFacts?.map((fact) => (
                  <View key={fact.id} className="fact-row">
                    <View className="fact-dot" />
                    <Text className="fact-text">{fact.content}</Text>
                  </View>
                ))}
              </View>

              <View className="result-card">
                <Text className="card-title">待办事项</Text>
                {detail.archiveResult.todoItems?.map((todo) => (
                  <View key={todo.id} className="todo-row">
                    <View className="todo-checkbox" />
                    <View className="todo-info">
                      <Text className="todo-text">{todo.content}</Text>
                      {todo.suggestedDate && (
                        <Text className="todo-date">建议日期：{todo.suggestedDate}</Text>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            </>
          )}
        </View>
      </ScrollView>

      <View className="bottom-actions">
        <View className="edit-btn">
          <Text className="edit-text">编辑后归档</Text>
        </View>
        <View className="confirm-btn" onClick={handleArchive}>
          <View className="icon-check" />
          <Text className="confirm-text">确认归档</Text>
        </View>
      </View>
    </View>
  )
}

export default ConversationDetailPage
