import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useAgentChat } from '@/hooks/useAgentChat'
import type { AgentSseEvent } from '@/types'

// Mock dependencies
vi.mock('@tarojs/taro', () => ({
  default: {
    getStorageSync: vi.fn((key: string) => {
      if (key === 'token') return 'mock-token'
      if (key === 'workspaceId') return 'workspace-1'
      return null
    }),
    request: vi.fn(() => Promise.resolve({
      statusCode: 200,
      data: { messages: [] },
    })),
  },
}))

vi.mock('@/utils/sse/sseClient', () => ({
  createSseClient: vi.fn((options) => {
    // Store the onEvent handler for later use
    ;(global as any).__sseOnEvent = options.onEvent
    ;(global as any).__sseOnOpen = options.onOpen
    ;(global as any).__sseOnClose = options.onClose
    ;(global as any).__sseOnError = options.onError

    return {
      connect: vi.fn(() => {
        setTimeout(() => options.onOpen?.(), 0)
      }),
      disconnect: vi.fn(() => {
        setTimeout(() => options.onClose?.(), 0)
      }),
      isConnected: vi.fn(() => true),
    }
  }),
}))

describe('useAgentChat Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    delete (global as any).__sseOnEvent
    delete (global as any).__sseOnOpen
    delete (global as any).__sseOnClose
    delete (global as any).__sseOnError
  })

  describe('Initialization', () => {
    it('should initialize with empty state', () => {
      const { result } = renderHook(() => useAgentChat())

      expect(result.current.messages).toEqual([])
      expect(result.current.toolStates).toEqual({})
      expect(result.current.context).toBeNull()
      expect(result.current.isConnected).toBe(false)
      expect(result.current.isStreaming).toBe(false)
      expect(result.current.error).toBeNull()
    })

    it('should connect when sessionId is provided', async () => {
      const { result } = renderHook(() =>
        useAgentChat({ sessionId: 'session-1' })
      )

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true)
      })
    })

    it('should not connect without sessionId', () => {
      const { result } = renderHook(() => useAgentChat())

      expect(result.current.isConnected).toBe(false)
    })
  })

  describe('SSE Event Handling', () => {
    it('should handle agent.start event', async () => {
      const { result } = renderHook(() =>
        useAgentChat({ sessionId: 'session-1' })
      )

      await waitFor(() => expect(result.current.isConnected).toBe(true))

      act(() => {
        const startEvent: AgentSseEvent = {
          event: 'agent.start',
          data: {
            runId: 'run-1',
            createdAt: new Date().toISOString(),
          },
        }
        ;(global as any).__sseOnEvent(startEvent)
      })

      expect(result.current.isStreaming).toBe(true)
      expect(result.current.error).toBeNull()
    })

    it('should handle agent.delta events and build streaming message', async () => {
      const { result } = renderHook(() =>
        useAgentChat({ sessionId: 'session-1' })
      )

      await waitFor(() => expect(result.current.isConnected).toBe(true))

      act(() => {
        const delta1: AgentSseEvent = {
          event: 'agent.delta',
          data: {
            id: 'msg-1',
            delta: 'Hello',
            role: 'assistant',
          },
        }
        ;(global as any).__sseOnEvent(delta1)
      })

      expect(result.current.messages).toHaveLength(1)
      expect(result.current.messages[0].content).toBe('Hello')
      expect(result.current.messages[0].isStreaming).toBe(true)

      act(() => {
        const delta2: AgentSseEvent = {
          event: 'agent.delta',
          data: {
            id: 'msg-1',
            delta: ' World',
          },
        }
        ;(global as any).__sseOnEvent(delta2)
      })

      expect(result.current.messages).toHaveLength(1)
      expect(result.current.messages[0].content).toBe('Hello World')
      expect(result.current.messages[0].isStreaming).toBe(true)
    })

    it('should handle agent.message event and finalize streaming', async () => {
      const { result } = renderHook(() =>
        useAgentChat({ sessionId: 'session-1' })
      )

      await waitFor(() => expect(result.current.isConnected).toBe(true))

      // Start streaming
      act(() => {
        const delta: AgentSseEvent = {
          event: 'agent.delta',
          data: {
            id: 'msg-1',
            delta: 'Hello',
            role: 'assistant',
          },
        }
        ;(global as any).__sseOnEvent(delta)
      })

      // Finalize message
      act(() => {
        const message: AgentSseEvent = {
          event: 'agent.message',
          data: {
            id: 'msg-1',
            role: 'assistant',
            content: 'Hello World',
            createdAt: new Date().toISOString(),
          },
        }
        ;(global as any).__sseOnEvent(message)
      })

      expect(result.current.messages).toHaveLength(1)
      expect(result.current.messages[0].content).toBe('Hello World')
      expect(result.current.messages[0].isStreaming).toBe(false)
    })

    it('should handle tool.state events', async () => {
      const { result } = renderHook(() =>
        useAgentChat({ sessionId: 'session-1' })
      )

      await waitFor(() => expect(result.current.isConnected).toBe(true))

      act(() => {
        const toolEvent: AgentSseEvent = {
          event: 'tool.state',
          data: {
            toolId: 'tool-1',
            name: 'send_email',
            status: 'running',
            at: new Date().toISOString(),
            input: { to: 'user@example.com' },
          },
        }
        ;(global as any).__sseOnEvent(toolEvent)
      })

      expect(result.current.toolStates['tool-1']).toBeDefined()
      expect(result.current.toolStates['tool-1'].status).toBe('running')
      expect(result.current.toolStates['tool-1'].name).toBe('send_email')
    })

    it('should update tool state from running to succeeded', async () => {
      const { result } = renderHook(() =>
        useAgentChat({ sessionId: 'session-1' })
      )

      await waitFor(() => expect(result.current.isConnected).toBe(true))

      act(() => {
        const runningEvent: AgentSseEvent = {
          event: 'tool.state',
          data: {
            toolId: 'tool-1',
            name: 'send_email',
            status: 'running',
            at: new Date().toISOString(),
          },
        }
        ;(global as any).__sseOnEvent(runningEvent)
      })

      expect(result.current.toolStates['tool-1'].status).toBe('running')

      act(() => {
        const successEvent: AgentSseEvent = {
          event: 'tool.state',
          data: {
            toolId: 'tool-1',
            name: 'send_email',
            status: 'succeeded',
            at: new Date().toISOString(),
            output: { sent: true },
          },
        }
        ;(global as any).__sseOnEvent(successEvent)
      })

      expect(result.current.toolStates['tool-1'].status).toBe('succeeded')
      expect(result.current.toolStates['tool-1'].output).toEqual({ sent: true })
      expect(result.current.toolStates['tool-1'].endedAt).toBeDefined()
    })

    it('should handle context.patch events', async () => {
      const { result } = renderHook(() =>
        useAgentChat({ sessionId: 'session-1' })
      )

      await waitFor(() => expect(result.current.isConnected).toBe(true))

      // Initialize context with agent.start
      act(() => {
        const startEvent: AgentSseEvent = {
          event: 'agent.start',
          data: {
            runId: 'run-1',
            createdAt: new Date().toISOString(),
            context: {
              global: { locale: 'zh-CN' },
              session: { sessionId: 'session-1' },
              request: { requestId: 'req-1' },
            },
          },
        }
        ;(global as any).__sseOnEvent(startEvent)
      })

      expect(result.current.context?.global.locale).toBe('zh-CN')

      // Patch context
      act(() => {
        const patchEvent: AgentSseEvent = {
          event: 'context.patch',
          data: {
            layer: 'global',
            patch: { timezone: 'Asia/Shanghai' },
          },
        }
        ;(global as any).__sseOnEvent(patchEvent)
      })

      expect(result.current.context?.global.timezone).toBe('Asia/Shanghai')
      expect(result.current.context?.global.locale).toBe('zh-CN') // Should preserve existing
    })

    it('should handle agent.end event', async () => {
      const { result } = renderHook(() =>
        useAgentChat({ sessionId: 'session-1' })
      )

      await waitFor(() => expect(result.current.isConnected).toBe(true))

      act(() => {
        const startEvent: AgentSseEvent = {
          event: 'agent.start',
          data: {
            runId: 'run-1',
            createdAt: new Date().toISOString(),
          },
        }
        ;(global as any).__sseOnEvent(startEvent)
      })

      expect(result.current.isStreaming).toBe(true)

      act(() => {
        const endEvent: AgentSseEvent = {
          event: 'agent.end',
          data: {
            runId: 'run-1',
            status: 'succeeded',
            finishedAt: new Date().toISOString(),
          },
        }
        ;(global as any).__sseOnEvent(endEvent)
      })

      expect(result.current.isStreaming).toBe(false)
    })

    it('should handle error event', async () => {
      const onError = vi.fn()
      const { result } = renderHook(() =>
        useAgentChat({ sessionId: 'session-1', onError })
      )

      await waitFor(() => expect(result.current.isConnected).toBe(true))

      act(() => {
        const errorEvent: AgentSseEvent = {
          event: 'error',
          data: {
            code: 'INTERNAL_ERROR',
            message: 'Something went wrong',
          },
        }
        ;(global as any).__sseOnEvent(errorEvent)
      })

      expect(result.current.error).toBeDefined()
      expect(result.current.error).toEqual({
        code: 'INTERNAL_ERROR',
        message: 'Something went wrong',
      })
      expect(onError).toHaveBeenCalled()
      expect(result.current.isStreaming).toBe(false)
    })
  })

  describe('Message Actions', () => {
    it('should send message successfully', async () => {
      const Taro = await import('@tarojs/taro')
      const { result } = renderHook(() =>
        useAgentChat({ sessionId: 'session-1' })
      )

      await waitFor(() => expect(result.current.isConnected).toBe(true))

      await act(async () => {
        await result.current.sendMessage('Hello AI')
      })

      expect(Taro.default.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          data: expect.objectContaining({
            role: 'user',
            content: 'Hello AI',
          }),
        })
      )
    })

    it('should handle send message error', async () => {
      const Taro = await import('@tarojs/taro')
      vi.mocked(Taro.default.request).mockRejectedValueOnce(new Error('Network error'))

      const onError = vi.fn()
      const { result } = renderHook(() =>
        useAgentChat({ sessionId: 'session-1', onError })
      )

      await waitFor(() => expect(result.current.isConnected).toBe(true))

      await act(async () => {
        try {
          await result.current.sendMessage('Hello AI')
        } catch (error) {
          // Expected error
        }
      })

      expect(onError).toHaveBeenCalled()
      expect(result.current.error).toBeDefined()
    })
  })

  describe('Tool Actions', () => {
    it('should confirm tool execution', async () => {
      const Taro = await import('@tarojs/taro')
      const { result } = renderHook(() =>
        useAgentChat({ sessionId: 'session-1' })
      )

      await waitFor(() => expect(result.current.isConnected).toBe(true))

      await act(async () => {
        await result.current.confirmTool('tool-1')
      })

      expect(Taro.default.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          url: expect.stringContaining('/tools/tool-1/confirm'),
        })
      )
    })

    it('should cancel tool execution', async () => {
      const Taro = await import('@tarojs/taro')
      const { result } = renderHook(() =>
        useAgentChat({ sessionId: 'session-1' })
      )

      await waitFor(() => expect(result.current.isConnected).toBe(true))

      await act(async () => {
        await result.current.cancelTool('tool-1')
      })

      expect(Taro.default.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          url: expect.stringContaining('/tools/tool-1/cancel'),
        })
      )
    })
  })

  describe('Utility Functions', () => {
    it('should clear messages', async () => {
      const { result } = renderHook(() =>
        useAgentChat({ sessionId: 'session-1' })
      )

      await waitFor(() => expect(result.current.isConnected).toBe(true))

      // Add a message
      act(() => {
        const message: AgentSseEvent = {
          event: 'agent.message',
          data: {
            id: 'msg-1',
            role: 'assistant',
            content: 'Hello',
            createdAt: new Date().toISOString(),
          },
        }
        ;(global as any).__sseOnEvent(message)
      })

      expect(result.current.messages).toHaveLength(1)

      // Clear messages
      act(() => {
        result.current.clearMessages()
      })

      expect(result.current.messages).toHaveLength(0)
      expect(result.current.toolStates).toEqual({})
      expect(result.current.error).toBeNull()
    })
  })
})
