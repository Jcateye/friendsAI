import { View, Text } from '@tarojs/components'
import type { ArchiveResult, EventType } from '@/types'
import './index.scss'

const EVENT_TYPE_LABELS: Record<EventType, string> = {
  meeting: '会议',
  call: '通话',
  visit: '拜访',
  email: '邮件',
  note: '备注',
  other: '其他',
}

interface ArchiveReviewCardProps {
  result: ArchiveResult
  onEdit?: () => void
  onConfirm?: () => void
}

const ArchiveReviewCard: React.FC<ArchiveReviewCardProps> = ({ result, onEdit, onConfirm }) => {
  return (
    <View className="archive-review-card">
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
            <Text className="badge-text">{result.recognizedPeople.length}人</Text>
          </View>
        </View>
        {result.recognizedPeople.length === 0 ? (
          <View className="result-empty">
            <Text className="empty-text">暂无识别结果</Text>
          </View>
        ) : (
          result.recognizedPeople.map((person) => {
            const roleText = [person.company, person.role].filter(Boolean).join(' ')
            return (
              <View key={person.id} className="person-row">
                <View className="person-avatar" style={{ backgroundColor: person.avatarColor }}>
                  <Text className="avatar-initial">{person.initial}</Text>
                </View>
                <View className="person-info">
                  <Text className="person-name">{person.name}</Text>
                  {roleText && <Text className="person-role">{roleText}</Text>}
                </View>
                <View className="icon-check-circle" />
              </View>
            )
          })
        )}
      </View>

      <View className="result-card">
        <View className="card-header">
          <Text className="card-title">新增事件</Text>
        </View>
        {result.newEvents.length === 0 ? (
          <View className="result-empty">
            <Text className="empty-text">暂无新增事件</Text>
          </View>
        ) : (
          result.newEvents.map((event) => (
            <View key={event.id} className="event-row">
              <View className="event-icon">
                <View className="icon-calendar" />
              </View>
              <View className="event-info">
                <Text className="event-type">{EVENT_TYPE_LABELS[event.type] || '事件'}</Text>
                <Text className="event-meta">{event.date}{event.location ? ` · ${event.location}` : ''}</Text>
                <Text className="event-summary">{event.summary}</Text>
              </View>
            </View>
          ))
        )}
      </View>

      <View className="result-card">
        <View className="card-header">
          <Text className="card-title">提取到的事实</Text>
          <View className="card-badge purple">
            <Text className="badge-text">画像更新</Text>
          </View>
        </View>
        {result.extractedFacts.length === 0 ? (
          <View className="result-empty">
            <Text className="empty-text">暂无新事实</Text>
          </View>
        ) : (
          result.extractedFacts.map((fact) => (
            <View key={fact.id} className="fact-row">
              <View className="fact-dot" />
              <Text className="fact-text">{fact.content}</Text>
            </View>
          ))
        )}
      </View>

      <View className="result-card">
        <Text className="card-title">待办事项</Text>
        {result.todoItems.length === 0 ? (
          <View className="result-empty">
            <Text className="empty-text">暂无待办</Text>
          </View>
        ) : (
          result.todoItems.map((todo) => (
            <View key={todo.id} className={`todo-row ${todo.completed ? 'is-completed' : ''}`}>
              <View className={`todo-checkbox ${todo.completed ? 'checked' : ''}`}>
                {todo.completed && <View className="icon-todo-check" />}
              </View>
              <View className="todo-info">
                <Text className="todo-text">{todo.content}</Text>
                {todo.suggestedDate && (
                  <Text className="todo-date">建议日期：{todo.suggestedDate}</Text>
                )}
              </View>
            </View>
          ))
        )}
      </View>

      <View className="review-actions">
        <View className="edit-btn" onClick={onEdit}>
          <Text className="edit-text">编辑后归档</Text>
        </View>
        <View className="confirm-btn" onClick={onConfirm}>
          <View className="icon-check" />
          <Text className="confirm-text">确认归档</Text>
        </View>
      </View>
    </View>
  )
}

export default ArchiveReviewCard
