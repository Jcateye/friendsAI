import { View, Text, ScrollView } from '@tarojs/components'
import { useState, useEffect, useMemo } from 'react'
import { useRouter } from '@tarojs/taro'
import Header from '@/components/Header'
import ArchiveReviewCard from '@/components/ArchiveReviewCard'
import CitationHighlight, { CitationRange } from '@/components/CitationHighlight'
import type { ConversationDetail as ConversationDetailType } from '@/types'
import { navigateBack, showToast, showLoading, hideLoading } from '@/utils'
import './index.scss'

interface CitationDefinition {
  id: string
  phrase: string
  targetId: string
}

const buildCitationRanges = (text: string, definitions: CitationDefinition[]): CitationRange[] => {
  if (!text) return []

  return definitions
    .map((definition) => {
      const start = text.indexOf(definition.phrase)
      if (start === -1) return null

      return {
        id: definition.id,
        start,
        end: start + definition.phrase.length,
        targetId: definition.targetId,
      }
    })
    .filter((item): item is CitationRange => Boolean(item))
}

const ConversationDetailPage: React.FC = () => {
  const router = useRouter()
  const { id } = router.params

  const [detail, setDetail] = useState<ConversationDetailType | null>(null)
  const [loading, setLoading] = useState(true)
  const [scrollIntoView, setScrollIntoView] = useState('')

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

  const handleEdit = () => {
    showToast('进入编辑')
  }

  const citationRanges = useMemo(() => {
    if (!detail?.archiveResult) return []

    const primaryPerson = detail.archiveResult.recognizedPeople[0]
    const primaryEvent = detail.archiveResult.newEvents[0]
    const primaryTodo = detail.archiveResult.todoItems[0]

    const definitions: CitationDefinition[] = [
      {
        id: 'person-1',
        phrase: primaryPerson?.name || '张三',
        targetId: `citation-person-${primaryPerson?.id || '1'}`,
      },
      {
        id: 'event-1',
        phrase: 'Q2合作方案',
        targetId: `citation-event-${primaryEvent?.id || '1'}`,
      },
      {
        id: 'fact-1',
        phrase: '比竞争对手高15%',
        targetId: 'citation-fact-1',
      },
      {
        id: 'fact-2',
        phrase: '下个月要带家人去云南旅游',
        targetId: 'citation-fact-2',
      },
      {
        id: 'todo-1',
        phrase: '周五前发一版优化后的方案',
        targetId: `citation-todo-${primaryTodo?.id || '1'}`,
      },
    ]

    return buildCitationRanges(detail.originalContent, definitions)
  }, [detail])

  const handleCitationClick = (citation: CitationRange) => {
    if (!citation.targetId) return
    setScrollIntoView('')
    setTimeout(() => setScrollIntoView(citation.targetId || ''), 30)
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

      <ScrollView className="scroll-content" scrollY scrollIntoView={scrollIntoView}>
        <View className="detail-inner">
          <View className="input-section">
            <Text className="section-label">记录内容</Text>
            <View className="user-bubble">
              <CitationHighlight
                className="user-text"
                text={detail.originalContent}
                citations={citationRanges}
                onCitationClick={handleCitationClick}
              />
            </View>
          </View>

          {detail.archiveResult && (
            <ArchiveReviewCard
              result={detail.archiveResult}
              onEdit={handleEdit}
              onConfirm={handleArchive}
            />
          )}
        </View>
      </ScrollView>
    </View>
  )
}

export default ConversationDetailPage
