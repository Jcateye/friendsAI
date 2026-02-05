import { View, Text, ScrollView } from '@tarojs/components'
import { useState, useEffect, useMemo } from 'react'
import { useRouter } from '@tarojs/taro'
import Header from '@/components/Header'
import ArchiveReviewCard from '@/components/ArchiveReviewCard'
import CitationHighlight, { CitationRange } from '@/components/CitationHighlight'
import type { ConversationRecord, ConversationArchive } from '@/types'
import { conversationApi, conversationArchiveApi } from '@/services/api'
import { navigateBack, showToast, showLoading, hideLoading } from '@/utils'
import './index.scss'

const ConversationDetailPage: React.FC = () => {
  const router = useRouter()
  const { id } = router.params

  const [conversation, setConversation] = useState<ConversationRecord | null>(null)
  const [archive, setArchive] = useState<ConversationArchive | null>(null)
  const [originalContent, setOriginalContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [scrollIntoView, setScrollIntoView] = useState('')

  useEffect(() => {
    if (!id) return
    loadDetail(id)
  }, [id])

  const loadDetail = async (conversationId: string) => {
    try {
      setLoading(true)

      const [record, messages] = await Promise.all([
        conversationApi.get(conversationId).catch(() => null),
        conversationApi.listMessages(conversationId).catch(() => []),
      ])

      if (record) {
        setConversation(record)
      } else {
        setConversation({
          id: conversationId,
          title: '对话',
          summary: '',
          status: 'pending',
          createdAt: '',
          updatedAt: '',
        })
      }

      const userMessage = messages.find((msg) => msg.role === 'user') || messages[0]
      setOriginalContent(userMessage?.content || '')

      const archiveResult = await conversationApi.createArchive(conversationId)
      setArchive(archiveResult)
    } catch (error) {
      showToast('加载失败')
    } finally {
      setLoading(false)
    }
  }

  const handleApplyArchive = async () => {
    if (!archive) return

    try {
      showLoading('归档中...')
      const updated = await conversationArchiveApi.apply(archive.id)
      setArchive(updated)
      hideLoading()
      showToast('归档成功', 'success')
      navigateBack()
    } catch (error) {
      hideLoading()
      showToast('归档失败')
    }
  }

  const handleDiscardArchive = async () => {
    if (!archive) return

    try {
      showLoading('丢弃中...')
      const updated = await conversationArchiveApi.discard(archive.id)
      setArchive(updated)
      hideLoading()
      showToast('已丢弃')
      navigateBack()
    } catch (error) {
      hideLoading()
      showToast('操作失败')
    }
  }

  const citationRanges = useMemo<CitationRange[]>(() => {
    return []
  }, [originalContent])

  const handleCitationClick = (citation: CitationRange) => {
    if (!citation.targetId) return
    setScrollIntoView('')
    setTimeout(() => setScrollIntoView(citation.targetId || ''), 30)
  }

  if (loading || !conversation) {
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
        title={conversation.title || '对话'}
        showBack
        statusBadge={
          archive?.status === 'applied' || conversation.status === 'archived'
            ? { text: '已归档', type: 'archived' }
            : { text: '待确认', type: 'pending' }
        }
      />

      <ScrollView className="scroll-content" scrollY scrollIntoView={scrollIntoView}>
        <View className="detail-inner">
          <View className="input-section">
            <Text className="section-label">记录内容</Text>
            <View className="user-bubble">
              <CitationHighlight
                className="user-text"
                text={originalContent}
                citations={citationRanges}
                onCitationClick={handleCitationClick}
              />
            </View>
          </View>

          {archive && (
            <ArchiveReviewCard
              result={archive.payload}
              onConfirm={handleApplyArchive}
              onDiscard={handleDiscardArchive}
            />
          )}
        </View>
      </ScrollView>
    </View>
  )
}

export default ConversationDetailPage
