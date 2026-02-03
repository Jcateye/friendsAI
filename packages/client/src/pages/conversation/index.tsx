import { View, Text, Textarea, ScrollView } from '@tarojs/components'
import { useEffect, useMemo, useState } from 'react'
import Header from '@/components/Header'
import TabBar from '@/components/TabBar'
import BottomSheet from '@/components/BottomSheet'
import GlobalDrawer from '@/components/GlobalDrawer'
import type { MessageTemplate, ConversationRecord, ChatMessage } from '@/types'
import { chatApi, feishuApi, conversationApi } from '@/services/api'
import { navigateTo, showModal, showToast, getStorage, setStorage } from '@/utils'
import './index.scss'

type ToolCallStatus = 'running' | 'success' | 'failed'

interface ToolCallInfo {
  type: 'feishu_template'
  status: ToolCallStatus
  templateName: string
  receiverName: string
  content: string
  error?: string
}

const ConversationPage: React.FC = () => {
  const [drawerVisible, setDrawerVisible] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputText, setInputText] = useState('')
  const [records, setRecords] = useState<ConversationRecord[]>([])
  const [templates, setTemplates] = useState<MessageTemplate[]>([])
  const [templatesLoading, setTemplatesLoading] = useState(false)
  const [sheetVisible, setSheetVisible] = useState(false)
  const [receiverName, setReceiverName] = useState('张三')
  const [suggestedContent, setSuggestedContent] = useState('')
  const [scrollTarget, setScrollTarget] = useState('')

  const defaultSessionKey = 'conversation_default_session_id'
  const storageKey = useMemo(() => (
    sessionId ? `conversation_chat_${sessionId}` : 'conversation_chat_default'
  ), [sessionId])

  useEffect(() => {
    const storedId = getStorage<string>(defaultSessionKey)
    if (storedId) {
      setSessionId(storedId)
      loadSession(storedId)
      return
    }
  }, [])

  useEffect(() => {
    loadRecords()
  }, [])

  useEffect(() => {
    if (!sheetVisible || templates.length > 0 || templatesLoading) return
    fetchTemplates()
  }, [sheetVisible, templates.length, templatesLoading])

  useEffect(() => {
    if (!storageKey) return
    if (messages.length > 0) {
      setScrollTarget(`msg-${messages[messages.length - 1].id}`)
    }
  }, [messages, storageKey])

  const handleMenuClick = () => {
    setDrawerVisible(true)
  }

  const handleSettingsClick = () => {
    setDrawerVisible(false)
    navigateTo('/pages/settings/index')
  }

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

  const loadRecords = async () => {
    try {
      const sessions = await chatApi.listSessions()
      const items = sessions.items.map((item) => ({
        id: item.id,
        title: item.title || '对话',
        summary: '',
        status: 'pending',
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      })) as ConversationRecord[]
      setRecords(items)
    } catch (error) {
      showToast('加载失败')
    }
  }

  const loadSession = async (id: string) => {
    try {
      const detailData = await chatApi.listMessages(id)
      setMessages(detailData.items)
      handleSuggestTool(detailData.items)
    } catch (error) {
      showToast('加载失败')
    }
  }

  const generateLocalId = () => `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

  const handleSend = async () => {
    const content = inputText.trim()
    if (!content) {
      showToast('请输入内容')
      return
    }

    setInputText('')

    if (!sessionId) {
      try {
        const created = await chatApi.createSession({ firstMessage: content })
        setSessionId(created.session.id)
        setStorage(defaultSessionKey, created.session.id)
        setMessages(created.messages)
        handleSuggestTool(created.messages)
        loadRecords()
      } catch (error) {
        showToast('创建失败')
      }
      return
    }

    try {
      const result = await chatApi.appendMessage(sessionId, { content })
      setMessages((prev) => [...prev, ...result.messages])
      handleSuggestTool(result.messages)
    } catch (error) {
      showToast('发送失败')
    }
  }

  const handleOpenAnalysis = () => {
    if (messages.length === 0) {
      showToast('请先发送一条消息')
      return
    }
    const lastUser = [...messages].reverse().find((msg) => msg.role === 'user')
    if (!lastUser) {
      showToast('请先发送一条消息')
      return
    }
    conversationApi.create(lastUser.content)
      .then((created) => {
        navigateTo(`/pages/conversation-detail/index?id=${created.id}`)
      })
      .catch(() => {
        showToast('创建解析失败')
      })
  }

  const handleSuggestTool = (newMessages: ChatMessage[]) => {
    const latest = [...newMessages].reverse().find((msg) => msg.role === 'assistant')
    const suggestTool = latest?.metadata?.suggestTool as { type?: string; receiverName?: string } | undefined
    if (suggestTool?.type === 'feishu') {
      setReceiverName(suggestTool.receiverName || receiverName)
      setSuggestedContent('Q2合作方案报价优化版本已准备好，方便时可以约个电话沟通细节。')
      setSheetVisible(true)
    }
  }

  const updateToolStatus = (messageId: string, status: ToolCallStatus, error?: string) => {
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === messageId
          ? {
              ...msg,
              metadata: msg.metadata
                ? {
                    ...msg.metadata,
                    toolCall: {
                      ...(msg.metadata.toolCall as ToolCallInfo),
                      status,
                      error,
                    },
                  }
                : msg.metadata,
            }
          : msg
      )
    )
  }

  const handleSendFeishu = async (templateId: string, content: string) => {
    if (!sessionId) {
      showToast('请先发送一条消息')
      return
    }
    const template = templates.find((item) => item.id === templateId)
    const preview = `模板：${template?.name || '未知'}\n接收人：${receiverName}\n内容：${content}`
    const modal = await showModal('确认发送', preview)
    if (!modal.confirm) return

    setSheetVisible(false)
    let toolMessageId = generateLocalId()
    try {
      const created = await chatApi.appendMessage(sessionId, {
        role: 'tool',
        content: '',
        metadata: {
          toolCall: {
            type: 'feishu_template',
            status: 'running',
            templateName: template?.name || '飞书模板消息',
            receiverName,
            content,
          },
        },
      })
      const message = created.messages[0]
      toolMessageId = message?.id || toolMessageId
      setMessages((prev) => [...prev, ...created.messages])
    } catch (error) {
      showToast('工具消息创建失败')
    }

    try {
      const result = await feishuApi.sendTemplateMessage({ templateId, receiverName, content })
      if (result.status === 'success') {
        updateToolStatus(toolMessageId, 'success')
        await chatApi.updateMessage(sessionId, toolMessageId, {
          metadata: {
            toolCall: {
              type: 'feishu_template',
              status: 'success',
              templateName: template?.name || '飞书模板消息',
              receiverName,
              content,
            },
          },
        })
        showToast('已发送', 'success')
      } else {
        updateToolStatus(toolMessageId, 'failed', result.response?.message as string)
        await chatApi.updateMessage(sessionId, toolMessageId, {
          metadata: {
            toolCall: {
              type: 'feishu_template',
              status: 'failed',
              templateName: template?.name || '飞书模板消息',
              receiverName,
              content,
              error: result.response?.message,
            },
          },
        })
        showToast('发送失败')
      }
    } catch (error) {
      updateToolStatus(toolMessageId, 'failed', '网络错误')
      await chatApi.updateMessage(sessionId, toolMessageId, {
        metadata: {
          toolCall: {
            type: 'feishu_template',
            status: 'failed',
            templateName: template?.name || '飞书模板消息',
            receiverName,
            content,
            error: '网络错误',
          },
        },
      })
      showToast('发送失败')
    }
  }

  const renderToolCard = (message: ChatMessage) => {
    const toolCall = message.metadata?.toolCall as ToolCallInfo | undefined
    if (!toolCall) return null
    const statusText =
      toolCall.status === 'running'
        ? '调用中'
        : toolCall.status === 'success'
          ? '已发送'
          : '失败'

    return (
      <View className={`tool-card status-${toolCall.status}`}>
        <View className="tool-header">
          <Text className="tool-title">飞书模板消息</Text>
          <View className={`tool-status ${toolCall.status}`}>
            <Text className="tool-status-text">{statusText}</Text>
          </View>
        </View>
        <View className="tool-body">
          <Text className="tool-line">模板：{toolCall.templateName}</Text>
          <Text className="tool-line">接收人：{toolCall.receiverName}</Text>
          <Text className="tool-line">内容：{toolCall.content}</Text>
          {toolCall.error && (
            <Text className="tool-error">错误：{toolCall.error}</Text>
          )}
        </View>
        {toolCall.status === 'running' && (
          <View className="tool-loading">
            <View className="loading-dot" />
            <Text className="loading-text">正在调用飞书接口...</Text>
          </View>
        )}
      </View>
    )
  }

  return (
    <View className="conversation-page">
      <Header
        title="对话"
        showMenu
        onMenuClick={handleMenuClick}
      />

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

      <View className="input-card">
        <View className="input-field">
          <Textarea
            className="input-textarea"
            placeholder="发送消息给 AI 助手"
            value={inputText}
            onInput={(e) => setInputText(e.detail.value)}
            maxlength={500}
            autoHeight
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
            <View className="send-btn" onClick={handleSend}>
              <View className="icon-arrow-up" />
            </View>
          </View>
        </View>
      </View>

      <TabBar current="conversation" />

      <GlobalDrawer
        visible={drawerVisible}
        records={records}
        onClose={() => setDrawerVisible(false)}
        onSettingsClick={handleSettingsClick}
      />

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

export default ConversationPage
