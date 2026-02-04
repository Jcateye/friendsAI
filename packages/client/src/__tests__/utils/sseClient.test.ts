import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createSseClient } from '@/utils/sse/sseClient'
import type { AgentSseEvent } from '@/types'

describe('SSE Client', () => {
  let mockEventSource: any
  let eventListeners: Map<string, Function>

  beforeEach(() => {
    eventListeners = new Map()

    // Mock EventSource
    mockEventSource = {
      readyState: EventSource.OPEN,
      addEventListener: vi.fn((event: string, handler: Function) => {
        eventListeners.set(event, handler)
      }),
      removeEventListener: vi.fn((event: string) => {
        eventListeners.delete(event)
      }),
      close: vi.fn(),
    }

    global.EventSource = vi.fn(() => mockEventSource) as any
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Connection Management', () => {
    it('should create EventSource with correct URL', () => {
      const url = 'http://localhost:3000/stream'
      const onEvent = vi.fn()

      const client = createSseClient({ url, onEvent })
      client.connect()

      expect(global.EventSource).toHaveBeenCalledWith(url)
    })

    it('should call onOpen when connection opens', () => {
      const onOpen = vi.fn()
      const onEvent = vi.fn()

      const client = createSseClient({
        url: 'http://localhost:3000/stream',
        onEvent,
        onOpen,
      })
      client.connect()

      const openHandler = eventListeners.get('open')
      openHandler?.(new Event('open'))

      expect(onOpen).toHaveBeenCalled()
    })

    it('should call onClose when disconnected', () => {
      const onClose = vi.fn()
      const onEvent = vi.fn()

      const client = createSseClient({
        url: 'http://localhost:3000/stream',
        onEvent,
        onClose,
      })
      client.connect()
      client.disconnect()

      expect(mockEventSource.close).toHaveBeenCalled()
      expect(onClose).toHaveBeenCalled()
    })

    it('should report connected status correctly', () => {
      const onEvent = vi.fn()

      const client = createSseClient({
        url: 'http://localhost:3000/stream',
        onEvent,
      })

      expect(client.isConnected()).toBe(false)

      client.connect()
      mockEventSource.readyState = EventSource.OPEN

      expect(client.isConnected()).toBe(true)

      client.disconnect()
      mockEventSource.readyState = EventSource.CLOSED

      expect(client.isConnected()).toBe(false)
    })
  })

  describe('Event Handling', () => {
    it('should parse and emit valid SSE events', () => {
      const onEvent = vi.fn()
      const client = createSseClient({
        url: 'http://localhost:3000/stream',
        onEvent,
      })
      client.connect()

      const testEvent: AgentSseEvent = {
        event: 'agent.delta',
        data: {
          id: 'msg-1',
          delta: 'Hello',
        },
      }

      const messageHandler = eventListeners.get('message')
      messageHandler?.(new MessageEvent('message', {
        data: JSON.stringify(testEvent),
      }))

      expect(onEvent).toHaveBeenCalledWith(testEvent)
    })

    it('should handle agent.start event', () => {
      const onEvent = vi.fn()
      const client = createSseClient({
        url: 'http://localhost:3000/stream',
        onEvent,
      })
      client.connect()

      const startEvent: AgentSseEvent = {
        event: 'agent.start',
        data: {
          runId: 'run-123',
          createdAt: new Date().toISOString(),
        },
      }

      const handler = eventListeners.get('agent.start')
      handler?.(new MessageEvent('agent.start', {
        data: JSON.stringify(startEvent),
      }))

      expect(onEvent).toHaveBeenCalledWith(startEvent)
    })

    it('should handle tool.state event', () => {
      const onEvent = vi.fn()
      const client = createSseClient({
        url: 'http://localhost:3000/stream',
        onEvent,
      })
      client.connect()

      const toolEvent: AgentSseEvent = {
        event: 'tool.state',
        data: {
          toolId: 'tool-1',
          name: 'send_email',
          status: 'running',
          at: new Date().toISOString(),
        },
      }

      const handler = eventListeners.get('tool.state')
      handler?.(new MessageEvent('tool.state', {
        data: JSON.stringify(toolEvent),
      }))

      expect(onEvent).toHaveBeenCalledWith(toolEvent)
    })

    it('should handle error event', () => {
      const onEvent = vi.fn()
      const errorEvent: AgentSseEvent = {
        event: 'error',
        data: {
          code: 'INTERNAL_ERROR',
          message: 'Something went wrong',
        },
      }

      const client = createSseClient({
        url: 'http://localhost:3000/stream',
        onEvent,
      })
      client.connect()

      const handler = eventListeners.get('error')
      handler?.(new MessageEvent('error', {
        data: JSON.stringify(errorEvent),
      }))

      expect(onEvent).toHaveBeenCalledWith(errorEvent)
    })

    it('should not emit event for invalid JSON', () => {
      const onEvent = vi.fn()
      const client = createSseClient({
        url: 'http://localhost:3000/stream',
        onEvent,
      })
      client.connect()

      const messageHandler = eventListeners.get('message')
      messageHandler?.(new MessageEvent('message', {
        data: 'invalid json {{{',
      }))

      expect(onEvent).not.toHaveBeenCalled()
    })
  })

  describe('Auto Reconnection', () => {
    it('should attempt to reconnect after error', async () => {
      vi.useFakeTimers()
      const onError = vi.fn()
      const onEvent = vi.fn()

      const client = createSseClient({
        url: 'http://localhost:3000/stream',
        onEvent,
        onError,
      })
      client.connect()

      const errorHandler = eventListeners.get('error')
      errorHandler?.(new Event('error'))

      expect(onError).toHaveBeenCalled()

      // Fast-forward 3 seconds
      vi.advanceTimersByTime(3000)

      // Should attempt reconnection
      expect(global.EventSource).toHaveBeenCalledTimes(2)

      vi.useRealTimers()
    })

    it('should not reconnect if manually disconnected', async () => {
      vi.useFakeTimers()
      const onError = vi.fn()
      const onEvent = vi.fn()

      const client = createSseClient({
        url: 'http://localhost:3000/stream',
        onEvent,
        onError,
      })
      client.connect()

      client.disconnect()

      const errorHandler = eventListeners.get('error')
      errorHandler?.(new Event('error'))

      // Fast-forward 3 seconds
      vi.advanceTimersByTime(3000)

      // Should NOT attempt reconnection
      expect(global.EventSource).toHaveBeenCalledTimes(1)

      vi.useRealTimers()
    })
  })

  describe('Cleanup', () => {
    it('should remove all event listeners on disconnect', () => {
      const onEvent = vi.fn()
      const client = createSseClient({
        url: 'http://localhost:3000/stream',
        onEvent,
      })

      client.connect()
      client.disconnect()

      expect(mockEventSource.removeEventListener).toHaveBeenCalledWith('message', expect.any(Function))
      expect(mockEventSource.removeEventListener).toHaveBeenCalledWith('error', expect.any(Function))
      expect(mockEventSource.removeEventListener).toHaveBeenCalledWith('open', expect.any(Function))
    })
  })
})
