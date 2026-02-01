import { View, Text, ScrollView, Picker } from '@tarojs/components'
import { useState, useEffect } from 'react'
import { useRouter } from '@tarojs/taro'
import Header from '@/components/Header'
import type { ConversationDetail as ConversationDetailType, ExtractedItem, Contact } from '@/types'
import { navigateBack, showToast, showLoading, hideLoading } from '@/utils'
import { conversationApi, journalApi, contactApi } from '@/services/api'
import './index.scss'

const ConversationDetailPage: React.FC = () => {
  const router = useRouter()
  const { id } = router.params

  const [detail, setDetail] = useState<ConversationDetailType | null>(null)
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState<ExtractedItem[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [selectedContactId, setSelectedContactId] = useState<string>('')
  const [extracting, setExtracting] = useState(false)

  useEffect(() => {
    loadDetail()
  }, [id])

  const loadDetail = async () => {
    try {
      setLoading(true)
      if (!id) return
      const [detailData, extracted, contactList] = await Promise.all([
        conversationApi.getDetail(id),
        journalApi.listExtracted(id).catch(() => ({ items: [] })),
        contactApi.getList().catch(() => []),
      ])
      setDetail(detailData)
      setItems(extracted.items || [])
      setContacts(contactList)
      if (contactList[0]) {
        setSelectedContactId(contactList[0].id)
      }
    } catch (error) {
      showToast('加载失败')
    } finally {
      setLoading(false)
    }
  }

  const handleExtract = async () => {
    if (!id) return
    try {
      setExtracting(true)
      showLoading('AI解析中...')
      const result = await journalApi.extract(id)
      setItems(result.items)
      hideLoading()
      showToast('解析完成', 'success')
    } catch (error) {
      hideLoading()
      showToast('解析失败')
    } finally {
      setExtracting(false)
    }
  }

  const handleConfirm = async (item: ExtractedItem, action: 'confirm' | 'reject') => {
    if (!id) return
    if (!selectedContactId && action === 'confirm') {
      showToast('请选择联系人')
      return
    }
    try {
      showLoading('提交中...')
      await journalApi.confirmExtracted(id, {
        itemId: item.id,
        action,
        contactId: action === 'confirm' ? selectedContactId : undefined,
      })
      hideLoading()
      showToast('已提交', 'success')
      const updated = items.filter((it) => it.id !== item.id)
      setItems(updated)
      if (detail && action === 'confirm') {
        setDetail({ ...detail, status: 'archived' })
      }
    } catch (error) {
      hideLoading()
      showToast('提交失败')
    }
  }

  const formatItem = (item: ExtractedItem) => {
    const payload = item.payload_json || {}
    if (item.type === 'event') {
      return payload.summary || '事件'
    }
    if (item.type === 'fact') {
      return `${payload.key || '事实'}：${payload.value || ''}`
    }
    if (item.type === 'action') {
      return payload.title || payload.suggestionReason || '待办'
    }
    return '内容'
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

          <View className="result-card">
            <View className="card-header">
              <Text className="card-title">AI 解析</Text>
              <View className="card-badge">
                <Text className="badge-text">{items.length}项</Text>
              </View>
            </View>
            {contacts.length > 0 && (
              <View className="contact-picker">
                <Text className="picker-label">关联联系人</Text>
                <Picker
                  mode="selector"
                  range={contacts.map((c) => c.name)}
                  onChange={(e) => setSelectedContactId(contacts[Number(e.detail.value)].id)}
                >
                  <View className="picker-value">
                    <Text>{contacts.find((c) => c.id === selectedContactId)?.name || '请选择'}</Text>
                  </View>
                </Picker>
              </View>
            )}
            {items.length === 0 ? (
              <View className="empty-state">
                <Text className="empty-text">暂无解析结果</Text>
              </View>
            ) : (
              <View className="result-list">
                {items.map((item) => (
                  <View key={item.id} className="result-row">
                    <View className="result-info">
                      <Text className="result-type">{item.type.toUpperCase()}</Text>
                      <Text className="result-text">{formatItem(item)}</Text>
                    </View>
                    <View className="result-actions">
                      <View className="action-btn confirm" onClick={() => handleConfirm(item, 'confirm')}>
                        <Text>确认</Text>
                      </View>
                      <View className="action-btn reject" onClick={() => handleConfirm(item, 'reject')}>
                        <Text>拒绝</Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      <View className="bottom-actions">
        <View className="edit-btn" onClick={handleExtract}>
          <Text className="edit-text">{extracting ? '解析中...' : '重新解析'}</Text>
        </View>
        <View className="confirm-btn" onClick={handleExtract}>
          <View className="icon-check" />
          <Text className="confirm-text">AI 解析</Text>
        </View>
      </View>
    </View>
  )
}

export default ConversationDetailPage
