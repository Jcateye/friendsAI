import { View, Text, Input, ScrollView } from '@tarojs/components'
import { useState } from 'react'
import type { ConversationRecord, FilterType } from '@/types'
import { formatDate, navigateTo } from '@/utils'
import './index.scss'

interface GlobalDrawerProps {
  visible?: boolean
  isOpen?: boolean
  records?: ConversationRecord[]
  onClose?: () => void
  onSettingsClick?: () => void
}

const GlobalDrawer: React.FC<GlobalDrawerProps> = ({
  visible,
  isOpen,
  records,
  onClose,
  onSettingsClick,
}) => {
  const normalizedVisible = visible ?? isOpen ?? false
  const safeRecords = records ?? []
  const handleClose = () => {
    onClose?.()
  }
  const [filter, setFilter] = useState<FilterType>('all')
  const [searchText, setSearchText] = useState('')

  const filteredRecords = safeRecords.filter((r) => {
    if (filter === 'pending') return r.status === 'pending'
    if (filter === 'archived') return r.status === 'archived'
    return true
  }).filter((r) =>
    searchText ? r.title.includes(searchText) || r.summary.includes(searchText) : true
  )

  const handleRecordClick = (id: string) => {
    handleClose()
    navigateTo(`/pages/conversation-chat/index?id=${id}`)
  }

  if (!normalizedVisible) return null

  return (
    <View className="drawer-overlay" onClick={handleClose}>
      <View className="drawer-panel" onClick={(e) => e.stopPropagation()}>
        <View className="drawer-top">
          <View className="drawer-search">
            <View className="icon-search" />
            <Input
              className="search-input"
              placeholder="搜索人名/关键词/日期"
              value={searchText}
              onInput={(e) => setSearchText(e.detail.value)}
            />
          </View>

          <View className="drawer-filters">
            {['all', 'pending', 'archived'].map((f) => (
              <View
                key={f}
                className={`filter-chip ${filter === f ? 'active' : ''}`}
                onClick={() => setFilter(f as FilterType)}
              >
                <Text className="filter-text">
                  {f === 'all' ? '全部' : f === 'pending' ? '待确认' : '已归档'}
                </Text>
              </View>
            ))}
          </View>

          <Text className="drawer-title">会话记录库</Text>
        </View>

        <ScrollView className="drawer-list" scrollY>
          {filteredRecords.map((record) => (
            <View
              key={record.id}
              className="drawer-record"
              onClick={() => handleRecordClick(record.id)}
            >
              <View className="record-info">
                <Text className="record-title">{record.title}</Text>
                <Text className="record-summary">{record.summary}</Text>
              </View>
              <View className="record-meta">
                <Text className="record-time">{formatDate(record.createdAt)}</Text>
                <View className={`record-status status-${record.status}`}>
                  <Text className="status-text">
                    {record.status === 'archived' ? '已归档' : '待确认'}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </ScrollView>

        <View className="drawer-bottom" onClick={() => onSettingsClick?.()}>
          <View className="icon-settings" />
          <Text className="settings-text">设置</Text>
        </View>
      </View>
    </View>
  )
}

export default GlobalDrawer
