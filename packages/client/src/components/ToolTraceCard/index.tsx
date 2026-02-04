import { View, Text } from '@tarojs/components'
import type { ToolTraceStatus } from '@/types'
import './index.scss'

interface ToolTraceCardProps {
  title: string
  status: ToolTraceStatus
  subtitle?: string
  detail?: string
  meta?: string
  progress?: number
  statusText?: string
  onClick?: () => void
}

const STATUS_LABELS: Record<ToolTraceStatus, string> = {
  pending: '排队中',
  running: '执行中',
  success: '已完成',
  failed: '失败',
  timeout: '超时',
  canceled: '已取消',
}

const clampProgress = (value: number) => {
  if (Number.isNaN(value)) return 0
  return Math.max(0, Math.min(100, Math.round(value)))
}

const ToolTraceCard: React.FC<ToolTraceCardProps> = ({
  title,
  status,
  subtitle,
  detail,
  meta,
  progress,
  statusText,
  onClick,
}) => {
  const resolvedStatusText = statusText ?? STATUS_LABELS[status]
  const normalizedProgress = typeof progress === 'number' ? clampProgress(progress) : null

  return (
    <View className={`tool-trace-card status-${status}`} onClick={onClick}>
      <View className="card-header">
        <View className="status-icon">
          <View className="icon" />
        </View>
        <View className="header-text">
          <Text className="tool-title">{title}</Text>
          {subtitle && <Text className="tool-subtitle">{subtitle}</Text>}
        </View>
        <View className="status-badge">
          <Text className="status-text">{resolvedStatusText}</Text>
        </View>
      </View>

      {detail && (
        <View className="card-body">
          <Text className="detail-text">{detail}</Text>
        </View>
      )}

      {normalizedProgress !== null && (
        <View className="progress">
          <View className="progress-track">
            <View className="progress-bar" style={{ width: `${normalizedProgress}%` }} />
          </View>
          <Text className="progress-text">{normalizedProgress}%</Text>
        </View>
      )}

      {meta && (
        <View className="card-footer">
          <Text className="meta-text">{meta}</Text>
        </View>
      )}
    </View>
  )
}

export default ToolTraceCard
