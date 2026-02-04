import { useState, useEffect, useCallback, useRef } from 'react'
import Taro from '@tarojs/taro'
import { createSseClient, type SseClient } from '@/utils/sse/sseClient'
import type {
  AgentMessage,
  AgentMessageDelta,
  AgentSseEvent,
  ToolState,
  ToolStateUpdate,
  AgentContextLayers,
  AgentError,
  JsonValue,
} from '@/types'

export interface UseAgentChatOptions {
  sessionId?: string
  baseUrl?: string
  onError?: (error: Error | AgentError) => void
  onConnectionChange?: (connected: boolean) => void
}

export interface AgentChatMessage extends AgentMessage {
  isStreaming?: boolean
}

export interface UseAgentChatReturn {
  messages: AgentChatMessage[]
  toolStates: Record<string, ToolState>
  context: AgentContextLayers | null
  isConnected: boolean
  isStreaming: boolean
  error: Error | AgentError | null
  sendMessage: (content: string, metadata?: Record<string, JsonValue>) => Promise<void>
  confirmTool: (toolId: string) => Promise<void>
  cancelTool: (toolId: string) => Promise<void>
  clearMessages: () => void
  reconnect: () => void
}

const getBaseUrl = () => {
  const env = (typeof process !== 'undefined' ? (process as any).env : {}) as Record<string, string>
  if (env.TARO_APP_API_BASE_URL) return env.TARO_APP_API_BASE_URL
  if (typeof window !== 'undefined' && window.location?.hostname) {
    return `http://${window.location.hostname}:3000/v1`
  }
  return 'http://localhost:3000/v1'
}

/**
 * Hook for managing Agent SSE chat sessions
 * Handles streaming messages, tool states, and context updates
 */
export const useAgentChat = (options: UseAgentChatOptions = {}): UseAgentChatReturn => {
  const { sessionId, baseUrl = getBaseUrl(), onError, onConnectionChange } = options

  const [messages, setMessages] = useState<AgentChatMessage[]>([])
  const [toolStates, setToolStates] = useState<Record<string, ToolState>>({})
  const [context, setContext] = useState<AgentContextLayers | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<Error | AgentError | null>(null)

  const sseClientRef = useRef<SseClient | null>(null)
  const currentMessageRef = useRef<AgentChatMessage | null>(null)
  const runIdRef = useRef<string | null>(null)

  // Handle SSE events
  const handleSseEvent = useCallback((event: AgentSseEvent) => {
    switch (event.event) {
      case 'agent.start': {
        runIdRef.current = event.data.runId
        setIsStreaming(true)
        setError(null)

        if (event.data.context) {
          setContext(event.data.context)
        }
        break
      }

      case 'agent.delta': {
        const delta = event.data
        setIsStreaming(true)

        setMessages((prev) => {
          // Find or create streaming message
          if (currentMessageRef.current?.id === delta.id) {
            // Update existing streaming message
            const updated = prev.map((msg) =>
              msg.id === delta.id
                ? {
                    ...msg,
                    content: msg.content + delta.delta,
                    isStreaming: true,
                  }
                : msg
            )
            currentMessageRef.current = updated.find((m) => m.id === delta.id) || null
            return updated
          }

          // Create new streaming message
          const newMessage: AgentChatMessage = {
            id: delta.id,
            role: delta.role || 'assistant',
            content: delta.delta,
            createdAt: new Date().toISOString(),
            isStreaming: true,
            toolCallId: delta.toolCallId,
          }
          currentMessageRef.current = newMessage
          return [...prev, newMessage]
        })
        break
      }

      case 'agent.message': {
        const message = event.data
        setMessages((prev) => {
          const existingIndex = prev.findIndex((m) => m.id === message.id)
          if (existingIndex >= 0) {
            // Update existing message (finalize streaming)
            return prev.map((m, i) =>
              i === existingIndex
                ? {
                    ...message,
                    isStreaming: false,
                  }
                : m
            )
          }
          // Add new complete message
          return [
            ...prev,
            {
              ...message,
              isStreaming: false,
            },
          ]
        })
        currentMessageRef.current = null
        break
      }

      case 'tool.state': {
        const update = event.data
        setToolStates((prev) => {
          const existing = prev[update.toolId]
          return {
            ...prev,
            [update.toolId]: {
              id: update.toolId,
              name: update.name,
              status: update.status,
              input: update.input,
              output: update.output,
              error: update.error,
              startedAt: existing?.startedAt || update.at,
              endedAt: update.status === 'succeeded' || update.status === 'failed' ? update.at : undefined,
            },
          }
        })
        break
      }

      case 'context.patch': {
        const patch = event.data
        setContext((prev) => {
          if (!prev) return null
          return {
            ...prev,
            [patch.layer]: {
              ...prev[patch.layer],
              ...patch.patch,
            },
          }
        })
        break
      }

      case 'agent.end': {
        setIsStreaming(false)
        runIdRef.current = null
        currentMessageRef.current = null

        if (event.data.status === 'failed' && event.data.error) {
          setError(event.data.error)
          onError?.(event.data.error)
        }
        break
      }

      case 'error': {
        setError(event.data)
        setIsStreaming(false)
        onError?.(event.data)
        break
      }

      case 'ping':
        // Keep-alive, do nothing
        break
    }
  }, [onError])

  // Initialize SSE connection
  useEffect(() => {
    if (!sessionId) return

    const token = Taro.getStorageSync('token')
    const workspaceId = Taro.getStorageSync('workspaceId')

    // Build SSE URL with auth token (since EventSource doesn't support headers)
    const sseUrl = `${baseUrl}/chat/sessions/${sessionId}/stream?token=${token}&workspaceId=${workspaceId}`

    const client = createSseClient({
      url: sseUrl,
      onEvent: handleSseEvent,
      onError: (err) => {
        setError(err)
        setIsConnected(false)
        onConnectionChange?.(false)
        onError?.(err)
      },
      onOpen: () => {
        setIsConnected(true)
        setError(null)
        onConnectionChange?.(true)
      },
      onClose: () => {
        setIsConnected(false)
        onConnectionChange?.(false)
      },
    })

    sseClientRef.current = client
    client.connect()

    return () => {
      client.disconnect()
      sseClientRef.current = null
    }
  }, [sessionId, baseUrl, handleSseEvent, onConnectionChange, onError])

  // Send user message
  const sendMessage = useCallback(
    async (content: string, metadata?: Record<string, JsonValue>) => {
      if (!sessionId) {
        throw new Error('No session ID')
      }

      const token = Taro.getStorageSync('token')
      const workspaceId = Taro.getStorageSync('workspaceId')

      try {
        const response = await Taro.request({
          url: `${baseUrl}/chat/sessions/${sessionId}/messages`,
          method: 'POST',
          header: {
            'Content-Type': 'application/json',
            Authorization: token ? `Bearer ${token}` : '',
            ...(workspaceId ? { 'X-Workspace-Id': workspaceId } : {}),
          },
          data: {
            role: 'user',
            content,
            metadata,
          },
        })

        if (response.statusCode >= 200 && response.statusCode < 300) {
          // User message will be received via SSE
          return
        }

        throw new Error('Failed to send message')
      } catch (err) {
        setError(err as Error)
        onError?.(err as Error)
        throw err
      }
    },
    [sessionId, baseUrl, onError]
  )

  // Confirm tool execution
  const confirmTool = useCallback(
    async (toolId: string) => {
      if (!sessionId) {
        throw new Error('No session ID')
      }

      const token = Taro.getStorageSync('token')
      const workspaceId = Taro.getStorageSync('workspaceId')

      try {
        await Taro.request({
          url: `${baseUrl}/chat/sessions/${sessionId}/tools/${toolId}/confirm`,
          method: 'POST',
          header: {
            'Content-Type': 'application/json',
            Authorization: token ? `Bearer ${token}` : '',
            ...(workspaceId ? { 'X-Workspace-Id': workspaceId } : {}),
          },
          data: {},
        })
      } catch (err) {
        setError(err as Error)
        onError?.(err as Error)
        throw err
      }
    },
    [sessionId, baseUrl, onError]
  )

  // Cancel tool execution
  const cancelTool = useCallback(
    async (toolId: string) => {
      if (!sessionId) {
        throw new Error('No session ID')
      }

      const token = Taro.getStorageSync('token')
      const workspaceId = Taro.getStorageSync('workspaceId')

      try {
        await Taro.request({
          url: `${baseUrl}/chat/sessions/${sessionId}/tools/${toolId}/cancel`,
          method: 'POST',
          header: {
            'Content-Type': 'application/json',
            Authorization: token ? `Bearer ${token}` : '',
            ...(workspaceId ? { 'X-Workspace-Id': workspaceId } : {}),
          },
          data: {},
        })
      } catch (err) {
        setError(err as Error)
        onError?.(err as Error)
        throw err
      }
    },
    [sessionId, baseUrl, onError]
  )

  // Clear messages
  const clearMessages = useCallback(() => {
    setMessages([])
    setToolStates({})
    setError(null)
    currentMessageRef.current = null
  }, [])

  // Reconnect SSE
  const reconnect = useCallback(() => {
    if (sseClientRef.current) {
      sseClientRef.current.disconnect()
      setTimeout(() => {
        sseClientRef.current?.connect()
      }, 100)
    }
  }, [])

  return {
    messages,
    toolStates,
    context,
    isConnected,
    isStreaming,
    error,
    sendMessage,
    confirmTool,
    cancelTool,
    clearMessages,
    reconnect,
  }
}
