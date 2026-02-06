import { useState, useEffect, useCallback, useRef } from 'react'
import Taro from '@tarojs/taro'
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
  replaceMessages: (messages: AgentChatMessage[]) => void
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

  const currentMessageRef = useRef<AgentChatMessage | null>(null)
  const runIdRef = useRef<string | null>(null)
  const messagesRef = useRef<AgentChatMessage[]>([])
  const abortControllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    messagesRef.current = messages
  }, [messages])

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort()
    }
  }, [])

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
          // If streaming message exists but IDs differ (e.g. persisted id), replace it
          const streamingId = currentMessageRef.current?.id
          if (streamingId) {
            const streamingIndex = prev.findIndex((m) => m.id === streamingId)
            if (streamingIndex >= 0) {
              return prev.map((m, i) =>
                i === streamingIndex
                  ? {
                      ...message,
                      isStreaming: false,
                    }
                  : m
              )
            }
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
              confirmationId: update.confirmationId,
              message: update.message,
              input: update.input,
              output: update.output,
              error: update.error,
              startedAt: existing?.startedAt || update.at,
              endedAt: update.status === 'succeeded' || update.status === 'failed' || update.status === 'cancelled'
                ? update.at
                : undefined,
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

  const parseSseEvent = useCallback((raw: string): AgentSseEvent | null => {
    const lines = raw.split('\n')
    let eventName: string | null = null
    let data = ''

    lines.forEach((line) => {
      if (line.startsWith('event:')) {
        eventName = line.replace('event:', '').trim()
      } else if (line.startsWith('data:')) {
        data += line.replace('data:', '').trim()
      }
    })

    if (!data) return null

    try {
      const parsed = JSON.parse(data)
      if (parsed?.event && parsed?.data) {
        return parsed as AgentSseEvent
      }
      if (eventName) {
        const allowed = [
          'agent.start',
          'agent.delta',
          'agent.message',
          'tool.state',
          'context.patch',
          'agent.end',
          'error',
          'ping',
        ]
        if (!allowed.includes(eventName)) return null
        return { event: eventName as AgentSseEvent['event'], data: parsed } as AgentSseEvent
      }
    } catch (err) {
      console.error('Failed to parse SSE event:', err, data)
    }

    return null
  }, [])

  const streamAgentResponse = useCallback(async (payload: Record<string, any>) => {
    if (!sessionId) return

    abortControllerRef.current?.abort()
    const controller = new AbortController()
    abortControllerRef.current = controller

    const token = Taro.getStorageSync('token')
    setIsConnected(true)
    onConnectionChange?.(true)

    try {
      const response = await fetch(`${baseUrl}/agent/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      })

      if (!response.ok) {
        throw new Error(`SSE request failed: ${response.status}`)
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('Streaming not supported')
      }

      const decoder = new TextDecoder('utf-8')
      let buffer = ''

      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

        let index = buffer.indexOf('\n\n')
        while (index !== -1) {
          const chunk = buffer.slice(0, index).trim()
          buffer = buffer.slice(index + 2)
          if (chunk) {
            const event = parseSseEvent(chunk)
            if (event) {
              handleSseEvent(event)
            }
          }
          index = buffer.indexOf('\n\n')
        }
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        return
      }
      setError(err as Error)
      onError?.(err as Error)
    } finally {
      setIsConnected(false)
      onConnectionChange?.(false)
      setIsStreaming(false)
    }
  }, [baseUrl, handleSseEvent, onConnectionChange, onError, parseSseEvent, sessionId])

  // Send user message and stream assistant response
  const sendMessage = useCallback(
    async (content: string, metadata?: Record<string, JsonValue>) => {
      if (!sessionId) {
        throw new Error('No session ID')
      }

      const now = new Date().toISOString()
      const userMessage: AgentChatMessage = {
        id: `local_${Date.now()}`,
        role: 'user',
        content,
        createdAt: now,
        metadata,
      }

      setMessages((prev) => [...prev, userMessage])
      setError(null)

      const history = messagesRef.current
        .filter((msg) => !msg.isStreaming)
        .map((msg) => ({
          role: msg.role,
          content: msg.content,
          metadata: msg.metadata,
        }))

      await streamAgentResponse({
        conversationId: sessionId,
        messages: [...history, { role: 'user', content, metadata }],
      })
    },
    [sessionId, streamAgentResponse]
  )

  // Confirm tool execution
  const confirmTool = useCallback(
    async (toolId: string) => {
      const token = Taro.getStorageSync('token')

      try {
        await Taro.request({
          url: `${baseUrl}/tool-confirmations/${toolId}/confirm`,
          method: 'POST',
          header: {
            'Content-Type': 'application/json',
            Authorization: token ? `Bearer ${token}` : '',
          },
          data: {},
        })
      } catch (err) {
        setError(err as Error)
        onError?.(err as Error)
        throw err
      }
    },
    [baseUrl, onError]
  )

  // Cancel tool execution
  const cancelTool = useCallback(
    async (toolId: string) => {
      const token = Taro.getStorageSync('token')

      try {
        await Taro.request({
          url: `${baseUrl}/tool-confirmations/${toolId}/reject`,
          method: 'POST',
          header: {
            'Content-Type': 'application/json',
            Authorization: token ? `Bearer ${token}` : '',
          },
          data: { reason: 'user_cancelled' },
        })
      } catch (err) {
        setError(err as Error)
        onError?.(err as Error)
        throw err
      }
    },
    [baseUrl, onError]
  )

  const replaceMessages = useCallback((nextMessages: AgentChatMessage[]) => {
    setMessages(nextMessages)
    setToolStates({})
    setError(null)
    currentMessageRef.current = null
  }, [])

  // Clear messages
  const clearMessages = useCallback(() => {
    setMessages([])
    setToolStates({})
    setContext(null)
    setError(null)
    currentMessageRef.current = null
  }, [])

  // Reconnect SSE
  const reconnect = useCallback(() => {
    abortControllerRef.current?.abort()
    setIsConnected(false)
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
    replaceMessages,
    clearMessages,
    reconnect,
  }
}
