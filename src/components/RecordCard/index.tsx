import { View, Text } from '@tarojs/components'
import type { ConversationRecord } from '@/types'
import './index.scss'

interface RecordCardProps {
  record: ConversationRecord
  onClick?: () => void
}

const RecordCard: React.FC<RecordCardProps> = ({ record, onClick }) => {
  return (
    <View className="record-card" onClick={onClick}>
      <View className="record-left">
        <Text className="record-title">{record.title}</Text>
        <Text className="record-summary">{record.summary}</Text>
      </View>
      <View className={`record-status status-${record.status}`}>
        <Text className="status-text">
          {record.status === 'archived' ? '已归档' : '待确认'}
        </Text>
      </View>
    </View>
  )
}

export default RecordCard
