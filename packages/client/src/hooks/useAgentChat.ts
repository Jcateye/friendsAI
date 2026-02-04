import { useState, useEffect, useRef, useCallback } from 'react'
import type {
  AgentMessage,
  AgentMessageDelta,
  AgentSseEvent,
  ToolStateUpdate,
  AgentContextPatch,
  AgentRunStart,
  AgentRunEnd,
  AgentError,
  ToolState,
  AgentReference,
} from '@/types'

interface UseAgentChatOptions {
  sessionId?: string
  apiBaseUrl?: string
  onMessage?: (message: AgentMessage) => void
  onToolStateUpdate?: (update: ToolStateUpdate) => void
  onContextPatch?: (patch: AgentContextPatch) => void
  onError?: (error: AgentError) => void
  onRunEnd?: (result: AgentRunEnd) => void
}

interface UseAgentChatReturn {
  messages: AgentMessage[]
  isConnected: boolean
  isRunning: boolean
  currentRunId: string | null
  toolStates: Record<string, ToolState>
  error: AgentError | null
  sendMessage: (content: string, references?: AgentReference[]) => Promise<void>
  reconnect: () => void
  disconnect: () => void
}

/**
 * useAgentChat Hook - 管理 SSE 聊天连接和消息状态
 *
 * 核心功能：
 * - SSE 连接管理（自动重连）
 * - 消息状态管理（累积 delta）
 * - Tool 状态跟踪
 * - 引用数据支持（CitationHighlight）
 */
export function useAgentChat(options: UseAgentChatOptions = {}): UseAgentChatReturn {
  const {
    sessionId,
    apiBaseUrl = '/v1/agent',
    onMessage,
    onToolStateUpdate,
    onContextPatch,
    onError,
    onRunEnd,
  } = options

  const [messages, setMessages] = useState<AgentMessage[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [isRunning, setIsRunning] = useState(false)
  const [currentRunId, setCurrentRunId] = useState<string | null>(null)
  const [toolStates, setToolStates] = useState<Record<string, ToolState>>({})
  const [error, setError] = useState<AgentError | null>(null)

  const eventSourceRef = useRef<EventSource | null>(null)
  const currentMessageRef = useRef<AgentMessage | null>(null)
  const reconnectTimeoutRef = useRef<number | null>(null)

  /**
   * 解析 SSE 事件
   */
  const parseEvent = useCallback((eventData: string): AgentSseEvent | null => {
    try {
      return JSON.parse(eventData) as AgentSseEvent
    } catch (err) {
      console.error('Failed to parse SSE event:', err)
      return null
    }
  }, [])

  /**
   * 处理 agent.delta 事件 - 累积消息内容
   */
  const handleDelta = useCallback((delta: AgentMessageDelta) => {
    if (!currentMessageRef.current) {
      // 创建新消息
      currentMessageRef.current = {
        id: delta.id,
        role: delta.role || 'assistant',
        content: delta.delta,
        createdAt: new Date().toISOString(),
        toolCallId: delta.toolCallId,
        references: [],
      }
    } else {
      // 累积内容
      currentMessageRef.current = {
        ...currentMessageRef.current,
        content: currentMessageRef.current.content + delta.delta,
      }
    }

    // 实时更新消息列表
    setMessages((prev) => {
      const existingIndex = prev.findIndex((m) => m.id === delta.id)
      if (existingIndex >= 0) {
        return [
          ...prev.slice(0, existingIndex),
          currentMessageRef.current!,
          ...prev.slice(existingIndex + 1),
        ]
      }
      return [...prev, currentMessageRef.current!]
    })
  }, [])

  /**
   * 处理 agent.message 事件 - 完整消息
   */
  const handleMessage = useCallback(
    (message: AgentMessage) => {
      setMessages((prev) => {
        const existingIndex = prev.findIndex((m) => m.id === message.id)
        if (existingIndex >= 0) {
          return [
            ...prev.slice(0, existingIndex),
            message,
            ...prev.slice(existingIndex + 1),
          ]
        }
        return [...prev, message]
      })

      currentMessageRef.current = null
      onMessage?.(message)
    },
    [onMessage]
  )

  /**
   * 处理 tool.state 事件 - 更新工具状态
   */
  const handleToolState = useCallback(
    (update: ToolStateUpdate) => {
      setToolStates((prev) => {
        const existingState = prev[update.toolId]
        const newState: ToolState = {
          id: update.toolId,
          name: update.name,
          status: update.status,
          input: update.input,
          output: update.output,
          error: update.error,
          startedAt: existingState?.startedAt || update.at,
          endedAt:
            update.status === 'succeeded' ||
            update.status === 'failed' ||
            update.status === 'cancelled'
              ? update.at
              : undefined,
        }

        return {
          ...prev,
          [update.toolId]: newState,
        }
      })

      onToolStateUpdate?.(update)
    },
    [onToolStateUpdate]
  )

  /**
   * 处理 SSE 事件
   */
  const handleSseEvent = useCallback(
    (event: MessageEvent) => {
      const parsed = parseEvent(event.data)
      if (!parsed) return

      switch (parsed.event) {
        case 'agent.start':
          setCurrentRunId(parsed.data.runId)
          setIsRunning(true)
          setError(null)
          break

        case 'agent.delta':
          handleDelta(parsed.data)
          break

        case 'agent.message':
          handleMessage(parsed.data)
          break

        case 'tool.state':
          handleToolState(parsed.data)
          break

        case 'context.patch':
          onContextPatch?.(parsed.data)
          break

        case 'agent.end':
          setIsRunning(false)
          setCurrentRunId(null)
          onRunEnd?.(parsed.data)
          break

        case 'error':
          setError(parsed.data)
          setIsRunning(false)
          onError?.(parsed.data)
          break

        case 'ping':
          // 保持连接活跃
          break

        default:
          console.warn('Unknown SSE event:', parsed.event)
      }
    },
    [parseEvent, handleDelta, handleMessage, handleToolState, onContextPatch, onRunEnd, onError]
  )

  /**
   * 连接到 SSE 端点
   */
  const connect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
    }

    const url = sessionId ? `${apiBaseUrl}/chat/${sessionId}` : `${apiBaseUrl}/chat`
    const eventSource = new EventSource(url)

    eventSource.onopen = () => {
      setIsConnected(true)
      setError(null)
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
        reconnectTimeoutRef.current = null
      }
    }

    eventSource.onmessage = handleSseEvent

    eventSource.onerror = () => {
      setIsConnected(false)
      eventSource.close()

      // 自动重连（3秒后）
      if (!reconnectTimeoutRef.current) {
        reconnectTimeoutRef.current = window.setTimeout(() => {
          reconnectTimeoutRef.current = null
          connect()
        }, 3000)
      }
    }

    eventSourceRef.current = eventSource
  }, [sessionId, apiBaseUrl, handleSseEvent])

  /**
   * 断开连接
   */
  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    setIsConnected(false)
  }, [])

  /**
   * 发送消息
   */
  const sendMessage = useCallback(
    async (content: string, references?: AgentReference[]) => {
      if (!content.trim()) {
        throw new Error('Message content cannot be empty')
      }

      const userMessage: AgentMessage = {
        id: `msg-${Date.now()}`,
        role: 'user',
        content,
        createdAt: new Date().toISOString(),
        references,
      }

      setMessages((prev) => [...prev, userMessage])

      try {
        const response = await fetch(`${apiBaseUrl}/chat/${sessionId || 'new'}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: content,
            references,
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.message || 'Failed to send message')
        }
      } catch (err) {
        const agentError: AgentError = {
          code: 'SEND_MESSAGE_FAILED',
          message: err instanceof Error ? err.message : 'Unknown error',
          retryable: true,
        }
        setError(agentError)
        throw err
      }
    },
    [sessionId, apiBaseUrl]
  )

  /**
   * 初始化连接
   */
  useEffect(() => {
    connect()

    return () => {
      disconnect()
    }
  }, [connect, disconnect])

  return {
    messages,
    isConnected,
    isRunning,
    currentRunId,
    toolStates,
    error,
    sendMessage,
    reconnect: connect,
    disconnect,
  }
}
