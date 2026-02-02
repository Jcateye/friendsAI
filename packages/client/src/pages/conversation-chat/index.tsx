import { View, Text, Textarea, ScrollView } from '@tarojs/components'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from '@tarojs/taro'
import Header from '@/components/Header'
import BottomSheet from '@/components/BottomSheet'
import type { ConversationDetail as ConversationDetailType, MessageTemplate } from '@/types'
import { conversationApi, feishuApi } from '@/services/api'
import { getStorage, setStorage, showModal, showToast, navigateTo } from '@/utils'
import './index.scss'

type MessageRole = 'user' | 'assistant' | 'tool'

type ToolCallStatus = 'running' | 'success' | 'failed'

interface ToolCallInfo {
  type: 'feishu_template'
  status: ToolCallStatus
  templateName: string
  receiverName: string
  content: string
  error?: string
}

interface ChatMessage {
  id: string
  role: MessageRole
  content: string
  createdAt: string
  toolCall?: ToolCallInfo
}

const defaultSuggestedContent = 'Q2合作方案报价优化版本已准备好，方便时可以约个电话沟通细节。'

const ConversationChatPage: React.FC = () => {
  const router = useRouter()
  const { id } = router.params

  const [detail, setDetail] = useState<ConversationDetailType | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputText, setInputText] = useState('')
  const [templates, setTemplates] = useState<MessageTemplate[]>([])
  const [templatesLoading, setTemplatesLoading] = useState(false)
  const [sheetVisible, setSheetVisible] = useState(false)
  const [receiverName, setReceiverName] = useState('张三')
  const [suggestedContent, setSuggestedContent] = useState('')
  const [scrollTarget, setScrollTarget] = useState('')

  const storageKey = useMemo(() => (id ? `conversation_chat_${id}` : ''), [id])

  useEffect(() => {
    if (!id) return
    loadDetail(id)
  }, [id])

  useEffect(() => {
    if (!storageKey) return
    setStorage(storageKey, messages)
    if (messages.length > 0) {
      setScrollTarget(`msg-${messages[messages.length - 1].id}`)
    }
  }, [messages, storageKey])

  useEffect(() => {
    if (!sheetVisible || templates.length > 0 || templatesLoading) return
    fetchTemplates()
  }, [sheetVisible, templates.length, templatesLoading])

  const fetchTemplates = async () => {
    try {
      setTemplatesLoading(true)
      const data = await feishuApi.getTemplates()
      setTemplates(data.items || [])
    } catch (error) {
      showToast('模板加载失败')
    } finally {
      setTemplatesLoading(false)
    }
  }

  const loadDetail = async (conversationId: string) => {
    try {
      const detailData = await conversationApi.getDetail(conversationId)
      setDetail(detailData)
      initMessages(detailData)
    } catch (error) {
      showToast('加载失败')
    }
  }

  const initMessages = (detailData: ConversationDetailType) => {
    if (!storageKey) return
    const stored = getStorage<ChatMessage[]>(storageKey)
    if (stored && stored.length > 0) {
      setMessages(stored)
      return
    }
    const initialMessage: ChatMessage = {
      id: generateLocalId(),
      role: 'user',
      content: detailData.originalContent,
      createdAt: detailData.createdAt,
    }
    setMessages([initialMessage])
    triggerAssistantReply(detailData.originalContent)
  }

  const generateLocalId = () => `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

  const handleSend = () => {
    const content = inputText.trim()
    if (!content) {
      showToast('请输入内容')
      return
    }
    const message: ChatMessage = {
      id: generateLocalId(),
      role: 'user',
      content,
      createdAt: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, message])
    setInputText('')
    triggerAssistantReply(content)
  }

  const handleOpenAnalysis = () => {
    if (!id) {
      showToast('对话不存在')
      return
    }
    navigateTo(`/pages/conversation-detail/index?id=${id}`)
  }

  const triggerAssistantReply = (content: string) => {
    const shouldTriggerFeishu = /飞书|模板|发送/.test(content)
    const resolvedReceiver = extractReceiverName(content) || '张三'
    const replyText = shouldTriggerFeishu
      ? `好的，我来帮你消息给${resolvedReceiver}。请选择模板并填写内容：`
      : '好的，我记下了。需要我帮你整理重点吗？'

    setTimeout(() => {
      const aiMessage: ChatMessage = {
        id: generateLocalId(),
        role: 'assistant',
        content: replyText,
        createdAt: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, aiMessage])
      if (shouldTriggerFeishu) {
        setReceiverName(resolvedReceiver)
        setSuggestedContent(defaultSuggestedContent)
        setSheetVisible(true)
      }
    }, 350)
  }

  const extractReceiverName = (content: string) => {
    const match = content.match(/给([^，。\s]{1,8})/)
    if (!match?.[1]) return undefined
    const raw = match[1]
    return raw.includes('发') ? raw.split('发')[0] : raw
  }

  const updateToolStatus = (messageId: string, status: ToolCallStatus, error?: string) => {
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === messageId
          ? {
              ...msg,
              toolCall: msg.toolCall
                ? {
                    ...msg.toolCall,
                    status,
                    error,
                  }
                : msg.toolCall,
            }
          : msg
      )
    )
  }

  const handleSendFeishu = async (templateId: string, content: string) => {
    const template = templates.find((item) => item.id === templateId)
    const preview = `模板：${template?.name || '未知'}\n接收人：${receiverName}\n内容：${content}`
    const modal = await showModal('确认发送', preview)
    if (!modal.confirm) return

    setSheetVisible(false)
    const toolMessageId = generateLocalId()
    const toolMessage: ChatMessage = {
      id: toolMessageId,
      role: 'tool',
      content: '',
      createdAt: new Date().toISOString(),
      toolCall: {
        type: 'feishu_template',
        status: 'running',
        templateName: template?.name || '飞书模板消息',
        receiverName,
        content,
      },
    }
    setMessages((prev) => [...prev, toolMessage])

    try {
      const result = await feishuApi.sendTemplateMessage({ templateId, receiverName, content })
      if (result.status === 'success') {
        updateToolStatus(toolMessageId, 'success')
        showToast('已发送', 'success')
      } else {
        updateToolStatus(toolMessageId, 'failed', result.response?.message as string)
        showToast('发送失败')
      }
    } catch (error) {
      updateToolStatus(toolMessageId, 'failed', '网络错误')
      showToast('发送失败')
    }
  }

  const renderToolCard = (message: ChatMessage) => {
    if (!message.toolCall) return null
    const statusText =
      message.toolCall.status === 'running'
        ? '调用中'
        : message.toolCall.status === 'success'
          ? '已发送'
          : '失败'

    return (
      <View className={`tool-card status-${message.toolCall.status}`}>
        <View className="tool-header">
          <Text className="tool-title">飞书模板消息</Text>
          <View className={`tool-status ${message.toolCall.status}`}>
            <Text className="tool-status-text">{statusText}</Text>
          </View>
        </View>
        <View className="tool-body">
          <Text className="tool-line">模板：{message.toolCall.templateName}</Text>
          <Text className="tool-line">接收人：{message.toolCall.receiverName}</Text>
          <Text className="tool-line">内容：{message.toolCall.content}</Text>
          {message.toolCall.error && (
            <Text className="tool-error">错误：{message.toolCall.error}</Text>
          )}
        </View>
        {message.toolCall.status === 'running' && (
          <View className="tool-loading">
            <View className="loading-dot" />
            <Text className="loading-text">正在调用飞书接口...</Text>
          </View>
        )}
      </View>
    )
  }

  if (!detail) {
    return (
      <View className="chat-page">
        <Header title="对话" showBack />
        <View className="loading-state">
          <Text>加载中...</Text>
        </View>
      </View>
    )
  }

  return (
    <View className="chat-page">
      <Header title="对话" showBack />

      <ScrollView
        className="message-list"
        scrollY
        scrollIntoView={scrollTarget}
      >
        {messages.map((message) => (
          <View
            key={message.id}
            id={`msg-${message.id}`}
            className={`message-row ${message.role === 'user' ? 'user' : 'assistant'}`}
          >
            {message.role !== 'user' && (
              <View className="assistant-label">
                <View className="icon-ai" />
                <Text className="assistant-text">AI 助手</Text>
              </View>
            )}
            {message.role === 'tool' ? (
              renderToolCard(message)
            ) : (
              <View className={`bubble ${message.role}`}>
                <Text className="bubble-text">{message.content}</Text>
              </View>
            )}
          </View>
        ))}
      </ScrollView>

      <View className="composer">
        <View className="composer-box">
          <Textarea
            className="composer-input"
            placeholder="输入内容..."
            value={inputText}
            onInput={(e) => setInputText(e.detail.value)}
            maxlength={500}
          />
          <View className="ai-entry" onClick={handleOpenAnalysis}>
            <Text className="ai-entry-text">AI</Text>
          </View>
        </View>
        <View className="composer-actions">
          <View className="send-btn" onClick={handleSend}>
            <View className="icon-send" />
            <Text className="send-text">发送</Text>
          </View>
        </View>
      </View>

      <BottomSheet
        visible={sheetVisible}
        title="发送飞书消息"
        subtitle={`使用模板发送给${receiverName}`}
        templates={templates}
        loading={templatesLoading}
        initialContent={suggestedContent}
        onClose={() => setSheetVisible(false)}
        onSend={handleSendFeishu}
      />
    </View>
  )
}

export default ConversationChatPage
