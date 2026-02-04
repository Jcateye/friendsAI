import type { AgentSseEvent, AgentError } from '@/types'

export interface SseClientOptions {
  url: string
  headers?: Record<string, string>
  onEvent: (event: AgentSseEvent) => void
  onError?: (error: Error) => void
  onOpen?: () => void
  onClose?: () => void
}

export interface SseClient {
  connect: () => void
  disconnect: () => void
  isConnected: () => boolean
}

/**
 * Create an SSE client for Agent streaming
 * Handles parsing of SSE events and automatic reconnection
 */
export const createSseClient = (options: SseClientOptions): SseClient => {
  const { url, headers = {}, onEvent, onError, onOpen, onClose } = options

  let eventSource: EventSource | null = null
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null
  let isClosed = false

  const parseEventData = (rawData: string): AgentSseEvent | null => {
    try {
      const parsed = JSON.parse(rawData)
      return parsed as AgentSseEvent
    } catch (error) {
      console.error('Failed to parse SSE event:', error, rawData)
      return null
    }
  }

  const handleMessage = (event: MessageEvent) => {
    const sseEvent = parseEventData(event.data)
    if (sseEvent) {
      onEvent(sseEvent)
    }
  }

  const handleError = (event: Event) => {
    const error = new Error('SSE connection error')
    onError?.(error)

    // Auto reconnect after 3 seconds if not manually closed
    if (!isClosed && !reconnectTimer) {
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null
        if (!isClosed) {
          connect()
        }
      }, 3000)
    }
  }

  const handleOpen = () => {
    onOpen?.()
  }

  const connect = () => {
    if (eventSource) {
      eventSource.close()
    }

    try {
      // Note: EventSource doesn't support custom headers directly
      // For authenticated requests, you may need to pass token in URL
      const fullUrl = url
      eventSource = new EventSource(fullUrl)

      eventSource.addEventListener('message', handleMessage)
      eventSource.addEventListener('error', handleError)
      eventSource.addEventListener('open', handleOpen)

      // Listen for specific event types
      const eventTypes = [
        'agent.start',
        'agent.delta',
        'agent.message',
        'tool.state',
        'context.patch',
        'agent.end',
        'error',
        'ping',
      ]

      eventTypes.forEach((type) => {
        eventSource?.addEventListener(type, (event) => {
          const messageEvent = event as MessageEvent
          const sseEvent = parseEventData(messageEvent.data)
          if (sseEvent) {
            onEvent(sseEvent)
          }
        })
      })
    } catch (error) {
      onError?.(error as Error)
    }
  }

  const disconnect = () => {
    isClosed = true

    if (reconnectTimer) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }

    if (eventSource) {
      eventSource.removeEventListener('message', handleMessage)
      eventSource.removeEventListener('error', handleError)
      eventSource.removeEventListener('open', handleOpen)
      eventSource.close()
      eventSource = null
    }

    onClose?.()
  }

  const isConnected = () => {
    return eventSource?.readyState === EventSource.OPEN
  }

  return {
    connect,
    disconnect,
    isConnected,
  }
}
