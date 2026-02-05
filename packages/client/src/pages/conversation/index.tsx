import { View, Text, Textarea, ScrollView } from '@tarojs/components'
import { useEffect, useMemo, useRef, useState } from 'react'
import Header from '@/components/Header'
import TabBar from '@/components/TabBar'
import GlobalDrawer from '@/components/GlobalDrawer'
import ConfirmBar from '@/components/ConfirmBar'
import type { ConversationRecord, ToolState } from '@/types'
import { conversationApi } from '@/services/api'
import { useAgentChat } from '@/hooks/useAgentChat'
import { getStorage, navigateTo, setStorage, showToast } from '@/utils'
import './index.scss'

const defaultConversationKey = 'conversation_default_id'
const activeConversationKey = 'conversation_active_id'

const ConversationPage: React.FC = () => {
  const [drawerVisible, setDrawerVisible] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [records, setRecords] = useState<ConversationRecord[]>([])
  const [inputText, setInputText] = useState('')
  const [scrollTarget, setScrollTarget] = useState('')
  const [confirmBarVisible, setConfirmBarVisible] = useState(false)

  const pendingMessageRef = useRef<string | null>(null)

  const {
    messages,
    toolStates,
    sendMessage,
    confirmTool,
    cancelTool,
    replaceMessages,
  } = useAgentChat({
    sessionId: conversationId || undefined,
    onError: () => showToast('消息发送失败'),
  })

  const pendingTool = useMemo(() => (
    Object.values(toolStates).find((tool) => tool.status === 'awaiting_input' && (tool.confirmationId || tool.id)) || null
  ), [toolStates])

  useEffect(() => {
    const storedActive = getStorage<string>(activeConversationKey)
    const storedDefault = getStorage<string>(defaultConversationKey)
    if (storedActive) {
      setConversationId(storedActive)
      return
    }
    if (storedDefault) {
      setConversationId(storedDefault)
    }
  }, [])

  useEffect(() => {
    loadRecords()
  }, [])

  useEffect(() => {
    if (!conversationId) return
    setStorage(defaultConversationKey, conversationId)
    setStorage(activeConversationKey, conversationId)
  }, [conversationId])

  useEffect(() => {
    if (!conversationId) {
      replaceMessages([])
      return
    }
    loadHistory(conversationId)
  }, [conversationId, replaceMessages])

  useEffect(() => {
    if (!conversationId || !pendingMessageRef.current) return
    const pending = pendingMessageRef.current
    pendingMessageRef.current = null
    sendMessage(pending).catch(() => showToast('发送失败'))
  }, [conversationId, sendMessage])

  useEffect(() => {
    if (messages.length > 0) {
      setScrollTarget(`msg-${messages[messages.length - 1].id}`)
    }
  }, [messages])

  useEffect(() => {
    setConfirmBarVisible(Boolean(pendingTool))
  }, [pendingTool])

  const loadRecords = async () => {
    try {
      const items = await conversationApi.list()
      setRecords(items)
    } catch (error) {
      showToast('加载失败')
    }
  }

  const loadHistory = async (id: string) => {
    try {
      const history = await conversationApi.listMessages(id)
      replaceMessages(history.map((item) => ({ ...item, isStreaming: false })))
    } catch (error) {
      showToast('加载失败')
    }
  }

  const handleMenuClick = () => {
    setDrawerVisible(true)
  }

  const handleSettingsClick = () => {
    setDrawerVisible(false)
    navigateTo('/pages/settings/index')
  }

  const handleSelectConversation = (id: string) => {
    setDrawerVisible(false)
    setConversationId(id)
  }

  const handleSend = async () => {
    const content = inputText.trim()
    if (!content) {
      showToast('请输入内容')
      return
    }

    setInputText('')

    if (!conversationId) {
      try {
        const created = await conversationApi.create({
          title: content.slice(0, 20) || '对话',
        })
        setConversationId(created.id)
        setRecords((prev) => [created, ...prev.filter((item) => item.id !== created.id)])
        replaceMessages([])
        pendingMessageRef.current = content
      } catch (error) {
        showToast('创建失败')
      }
      return
    }

    try {
      await sendMessage(content)
      loadRecords()
    } catch (error) {
      showToast('发送失败')
    }
  }

  const handleOpenAnalysis = () => {
    if (!conversationId) {
      showToast('请先发送一条消息')
      return
    }
    navigateTo(`/pages/conversation-detail/index?id=${conversationId}`)
  }

  const handleConfirmTool = async () => {
    if (!pendingTool) return

    setConfirmBarVisible(false)
    const confirmationId = pendingTool.confirmationId || pendingTool.id

    try {
      await confirmTool(confirmationId)
      showToast('已确认执行', 'success')
    } catch (error) {
      showToast('确认失败')
    }
  }

  const handleRejectTool = async () => {
    if (!pendingTool) return

    setConfirmBarVisible(false)
    const confirmationId = pendingTool.confirmationId || pendingTool.id

    try {
      await cancelTool(confirmationId)
      showToast('已拒绝执行')
    } catch (error) {
      showToast('操作失败')
    }
  }

  const formatToolStatus = (status: ToolState['status']) => {
    const map: Record<ToolState['status'], string> = {
      idle: '空闲',
      queued: '排队中',
      running: '执行中',
      awaiting_input: '等待确认',
      succeeded: '已完成',
      failed: '失败',
      cancelled: '已取消',
    }
    return map[status] || status
  }

  const renderToolStateCard = (tool: ToolState) => {
    const statusClass = tool.status === 'succeeded' ? 'success' : tool.status
    return (
    <View className={`tool-card status-${statusClass}`} key={tool.id}>
      <View className="tool-header">
        <Text className="tool-title">{tool.name || '工具调用'}</Text>
        <View className={`tool-status ${statusClass}`}>
          <Text className="tool-status-text">{formatToolStatus(tool.status)}</Text>
        </View>
      </View>
      <View className="tool-body">
        {tool.message && <Text className="tool-line">说明：{tool.message}</Text>}
        {tool.input && (
          <Text className="tool-line">输入：{JSON.stringify(tool.input)}</Text>
        )}
        {tool.output && (
          <Text className="tool-line">输出：{JSON.stringify(tool.output)}</Text>
        )}
        {tool.error?.message && (
          <Text className="tool-error">错误：{tool.error.message}</Text>
        )}
      </View>
      {tool.status === 'running' && (
        <View className="tool-loading">
          <View className="loading-dot" />
          <Text className="loading-text">工具执行中...</Text>
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
            <View className={`bubble ${message.role}`}>
              <Text className="bubble-text">{message.content}</Text>
            </View>
          </View>
        ))}
        {Object.values(toolStates).map((tool) => (
          <View key={`tool-${tool.id}`} className="message-row assistant">
            {renderToolStateCard(tool)}
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
        onRecordSelect={handleSelectConversation}
      />

      <ConfirmBar
        visible={confirmBarVisible}
        title="确认执行工具"
        description={pendingTool ? `工具：${pendingTool.name}` : ''}
        hintText="请确认是否执行此工具调用"
        onConfirm={handleConfirmTool}
        onCancel={handleRejectTool}
      />
    </View>
  )
}

export default ConversationPage
