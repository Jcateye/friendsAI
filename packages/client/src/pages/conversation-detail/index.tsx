import { View, Text, ScrollView } from '@tarojs/components'
import { useState, useEffect } from 'react'
import { useRouter } from '@tarojs/taro'
import Header from '@/components/Header'
import type { ConversationDetail as ConversationDetailType } from '@/types'
import { navigateBack, showToast, showLoading, hideLoading } from '@/utils'
import './index.scss'

const ConversationDetailPage: React.FC = () => {
  const router = useRouter()
  const { id } = router.params

  const [detail, setDetail] = useState<ConversationDetailType | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDetail()
  }, [id])

  const loadDetail = async () => {
    try {
      setLoading(true)
      setDetail({
        id: id || '2',
        title: '今日记录 2026/01/28',
        summary: '见了李四和王五，聊到新项目启动计划',
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        originalContent: '今天上午和张三聊了Q2合作方案，他对我们的报价有些顾虑，说比竞争对手高15%。我承诺周五前发一版优化后的方案给他。另外他提到下个月要带家人去云南旅游，问我有没有推荐的地方。',
        archiveResult: {
          recognizedPeople: [{
            id: '1',
            name: '张三',
            initial: '张',
            avatarColor: '#C9B8A8',
            company: 'ABC公司',
            role: 'CEO',
          }],
          newEvents: [{
            id: '1',
            type: 'visit',
            date: '2026/01/28 上午',
            location: '张三办公室',
            summary: '讨论Q2合作方案，对方对报价有顾虑',
          }],
          extractedFacts: [
            { id: '1', content: '对价格敏感，认为比竞对高15%', type: 'trait' },
            { id: '2', content: '下月计划去云南家庭旅游', type: 'info' },
          ],
          todoItems: [{
            id: '1',
            content: '发送优化后的报价方案',
            suggestedDate: '周五前',
            completed: false,
          }],
        },
      })
    } catch (error) {
      showToast('加载失败')
    } finally {
      setLoading(false)
    }
  }

  const handleArchive = async () => {
    try {
      showLoading('归档中...')
      await new Promise(r => setTimeout(r, 1000))
      hideLoading()
      showToast('归档成功', 'success')
      navigateBack()
    } catch (error) {
      hideLoading()
      showToast('归档失败')
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
                    <Text className="badge-text">{detail.archiveResult.recognizedPeople.length}人</Text>
                  </View>
                </View>
                {detail.archiveResult.recognizedPeople.map((person) => (
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
                {detail.archiveResult.newEvents.map((event) => (
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
                {detail.archiveResult.extractedFacts.map((fact) => (
                  <View key={fact.id} className="fact-row">
                    <View className="fact-dot" />
                    <Text className="fact-text">{fact.content}</Text>
                  </View>
                ))}
              </View>

              <View className="result-card">
                <Text className="card-title">待办事项</Text>
                {detail.archiveResult.todoItems.map((todo) => (
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
