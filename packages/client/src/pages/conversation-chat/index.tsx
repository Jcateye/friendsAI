import { View, Text, Textarea, ScrollView } from '@tarojs/components'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from '@tarojs/taro'
import Header from '@/components/Header'
import BottomSheet from '@/components/BottomSheet'
import ConfirmBar from '@/components/ConfirmBar'
import ToolTraceCard from '@/components/ToolTraceCard'
import A2UIRenderer, { type A2UIRegistry, type A2UIPayloadForRegistry } from '@/components/A2UIRenderer'
import ArchiveReviewCard from '@/components/ArchiveReviewCard'
import TemplatePicker from '@/components/TemplatePicker'
import { useAgentChat } from '@/hooks/useAgentChat'
import type { MessageTemplate, ToolState, ToolStatus } from '@/types'
import { feishuApi } from '@/services/api'
import { showModal, showToast, navigateTo } from '@/utils'
import './index.scss'

// A2UI Component Registry
const a2uiRegistry: A2UIRegistry = {
  ArchiveReviewCard,
  TemplatePicker,
  // Add more components as needed
}

type A2UIPayload = A2UIPayloadForRegistry<typeof a2uiRegistry>

const mapToolStatusToTraceStatus = (status: ToolStatus) => {
  switch (status) {
    case 'idle':
    case 'queued':
      return 'pending'
    case 'running':
    case 'awaiting_input':
      return 'running'
    case 'succeeded':
      return 'success'
    case 'failed':
      return 'failed'
    case 'cancelled':
      return 'canceled'
    default:
      return 'pending'
  }
}

const ConversationChatPage: React.FC = () => {
  const router = useRouter()
  const { id: conversationId } = router.params

  const [sessionId, setSessionId] = useState<string | null>(null)
  const [inputText, setInputText] = useState('')
  const [templates, setTemplates] = useState<MessageTemplate[]>([])
  const [templatesLoading, setTemplatesLoading] = useState(false)
  const [sheetVisible, setSheetVisible] = useState(false)
  const [scrollTarget, setScrollTarget] = useState('')

  // Tool confirmation state
  const [pendingToolId, setPendingToolId] = useState<string | null>(null)
  const [confirmBarVisible, setConfirmBarVisible] = useState(false)

  // Use Agent Chat Hook
  const {
    messages,
    toolStates,
    isConnected,
    isStreaming,
    error,
    sendMessage,
    confirmTool,
    cancelTool,
  } = useAgentChat({
    sessionId: sessionId || undefined,
    onError: (err) => {
      console.error('Agent chat error:', err)
      showToast('连接失败')
    },
    onConnectionChange: (connected) => {
      console.log('Connection status:', connected)
    },
  })

  // Initialize session
  useEffect(() => {
    if (!conversationId) return

    // For now, use conversationId as sessionId
    // In production, you might need to create a session first
    setSessionId(conversationId)
  }, [conversationId])

  // Auto-scroll to latest message
  useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1]
      setScrollTarget(`msg-${lastMessage.id}`)
    }
  }, [messages])

  // Load templates when sheet opens
  useEffect(() => {
    if (!sheetVisible || templates.length > 0 || templatesLoading) return
    fetchTemplates()
  }, [sheetVisible, templates.length, templatesLoading])

  // Check for tools awaiting confirmation
  useEffect(() => {
    const awaitingTools = Object.values(toolStates).filter(
      (tool) => tool.status === 'awaiting_input'
    )

    if (awaitingTools.length > 0 && !confirmBarVisible) {
      setPendingToolId(awaitingTools[0].id)
      setConfirmBarVisible(true)
    }
  }, [toolStates, confirmBarVisible])

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

  const handleSend = async () => {
    const content = inputText.trim()
    if (!content) {
      showToast('请输入内容')
      return
    }

    try {
      setInputText('')
      await sendMessage(content)
    } catch (error) {
      showToast('发送失败')
      console.error('Send message error:', error)
    }
  }

  const handleOpenAnalysis = () => {
    if (!conversationId) {
      showToast('对话不存在')
      return
    }
    navigateTo(`/pages/conversation-detail/index?id=${conversationId}`)
  }

  const handleSendFeishu = async (templateId: string, content: string) => {
    const template = templates.find((item) => item.id === templateId)
    const preview = `模板：${template?.name || '未知'}\n内容：${content}`
    const modal = await showModal('确认发送', preview)
    if (!modal.confirm) return

    setSheetVisible(false)

    try {
      const result = await feishuApi.sendTemplateMessage({
        templateId,
        receiverName: '联系人',
        content,
      })

      if (result.status === 'success') {
        showToast('已发送', 'success')
      } else {
        showToast('发送失败')
      }
    } catch (error) {
      showToast('发送失败')
    }
  }

  const handleConfirmTool = async () => {
    if (!pendingToolId) return

    try {
      await confirmTool(pendingToolId)
      setConfirmBarVisible(false)
      setPendingToolId(null)
      showToast('已确认执行', 'success')
    } catch (error) {
      showToast('确认失败')
      console.error('Confirm tool error:', error)
    }
  }

  const handleCancelTool = async () => {
    if (!pendingToolId) return

    try {
      await cancelTool(pendingToolId)
      setConfirmBarVisible(false)
      setPendingToolId(null)
      showToast('已取消')
    } catch (error) {
      showToast('取消失败')
      console.error('Cancel tool error:', error)
    }
  }

  const renderA2UIComponent = (payload: A2UIPayload) => {
    return (
      <A2UIRenderer
        payload={payload}
        registry={a2uiRegistry}
        onError={(error, payload) => {
          console.error('A2UI render error:', error, payload)
        }}
        onUnknownType={(payload) => {
          console.warn('Unknown A2UI type:', payload.type)
        }}
      />
    )
  }

  const renderToolCard = (toolState: ToolState) => {
    const status = mapToolStatusToTraceStatus(toolState.status)

    return (
      <ToolTraceCard
        key={toolState.id}
        title={toolState.name}
        status={status}
        detail={
          toolState.error
            ? `错误：${toolState.error.message}`
            : toolState.output
              ? `输出：${JSON.stringify(toolState.output)}`
              : undefined
        }
        meta={toolState.startedAt ? `开始时间：${new Date(toolState.startedAt).toLocaleTimeString()}` : undefined}
      />
    )
  }

  const pendingTool = pendingToolId ? toolStates[pendingToolId] : null

  if (!sessionId) {
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
      <Header
        title="AI 对话"
        showBack
        statusBadge={
          isConnected
            ? { text: '已连接', type: 'archived' }
            : { text: '离线', type: 'pending' }
        }
      />

      <ScrollView
        className="message-list"
        scrollY
        scrollIntoView={scrollTarget}
      >
        {messages.map((message) => {
          const isUser = message.role === 'user'
          const isTool = message.role === 'tool'

          return (
            <View
              key={message.id}
              id={`msg-${message.id}`}
              className={`message-row ${isUser ? 'user' : 'assistant'}`}
            >
              {!isUser && (
                <View className="assistant-label">
                  <View className="icon-ai" />
                  <Text className="assistant-text">AI 助手</Text>
                  {message.isStreaming && (
                    <View className="streaming-indicator">
                      <View className="dot" />
                      <View className="dot" />
                      <View className="dot" />
                    </View>
                  )}
                </View>
              )}

              {isTool && message.toolCallId ? (
                <View className="tool-message">
                  {toolStates[message.toolCallId] && renderToolCard(toolStates[message.toolCallId])}
                </View>
              ) : message.metadata?.a2ui ? (
                <View className="a2ui-message">
                  {renderA2UIComponent(message.metadata.a2ui as A2UIPayload)}
                </View>
              ) : (
                <View className={`bubble ${message.role}`}>
                  <Text className="bubble-text">{message.content}</Text>
                  {message.isStreaming && (
                    <View className="cursor-blink" />
                  )}
                </View>
              )}
            </View>
          )
        })}

        {isStreaming && messages.length === 0 && (
          <View className="message-row assistant">
            <View className="assistant-label">
              <View className="icon-ai" />
              <Text className="assistant-text">AI 助手</Text>
              <View className="streaming-indicator">
                <View className="dot" />
                <View className="dot" />
                <View className="dot" />
              </View>
            </View>
          </View>
        )}

        {error && (
          <View className="error-message">
            <Text className="error-text">
              {'code' in error ? `错误：${error.message}` : error.message}
            </Text>
          </View>
        )}
      </ScrollView>

      <View className="input-card">
        <View className="input-field">
          <Textarea
            className="input-textarea"
            placeholder="发送消息给 AI 助手"
            value={inputText}
            onInput={(e) => setInputText(e.detail.value)}
            maxlength={500}
            autoHeight
            disabled={isStreaming}
          />
        </View>
        <View className="toolbar">
          <View className="left-btns">
            <View className="tool-btn plus-btn">
              <View className="icon-plus" />
            </View>
            <View className="tool-btn sparkles-btn active" onClick={handleOpenAnalysis}>
              <View className="icon-sparkles" />
            </View>
          </View>
          <View className="right-btns">
            <View className="tool-btn mic-btn">
              <View className="icon-mic" />
            </View>
            <View
              className={`send-btn ${isStreaming || !inputText.trim() ? 'disabled' : ''}`}
              onClick={handleSend}
            >
              <View className="icon-arrow-up" />
            </View>
          </View>
        </View>
      </View>

      <BottomSheet
        visible={sheetVisible}
        title="发送飞书消息"
        subtitle="使用模板发送消息"
        templates={templates}
        loading={templatesLoading}
        initialContent=""
        onClose={() => setSheetVisible(false)}
        onSend={handleSendFeishu}
      />

      <ConfirmBar
        visible={confirmBarVisible}
        title={pendingTool ? `确认执行：${pendingTool.name}` : '确认执行工具'}
        description={
          pendingTool?.input
            ? `输入参数：${JSON.stringify(pendingTool.input, null, 2)}`
            : '该工具需要您的确认才能执行'
        }
        hintText="请仔细检查参数是否正确"
        confirmText="确认执行"
        cancelText="取消"
        onConfirm={handleConfirmTool}
        onCancel={handleCancelTool}
      />
    </View>
  )
}

export default ConversationChatPage
