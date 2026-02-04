import { renderHook, act, waitFor } from '@testing-library/react'
import { useAgentChat } from '../useAgentChat'
import type { AgentSseEvent, AgentError } from '@/types'

// Mock EventSource
class MockEventSource {
  url: string
  onopen: ((event: Event) => void) | null = null
  onmessage: ((event: MessageEvent) => void) | null = null
  onerror: ((event: Event) => void) | null = null
  readyState: number = 0

  constructor(url: string) {
    this.url = url
    // 模拟异步连接
    setTimeout(() => {
      this.readyState = 1
      if (this.onopen) {
        this.onopen(new Event('open'))
      }
    }, 0)
  }

  close() {
    this.readyState = 2
  }

  // 辅助方法：模拟发送消息
  simulateMessage(data: AgentSseEvent) {
    if (this.onmessage) {
      const event = new MessageEvent('message', {
        data: JSON.stringify(data),
      })
      this.onmessage(event)
    }
  }

  // 辅助方法：模拟错误
  simulateError() {
    if (this.onerror) {
      this.onerror(new Event('error'))
    }
  }
}

// Mock fetch
global.fetch = jest.fn()

let mockEventSource: MockEventSource | null = null

describe('useAgentChat', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockEventSource = null

    // Mock EventSource
    global.EventSource = jest.fn((url: string) => {
      mockEventSource = new MockEventSource(url)
      return mockEventSource as any
    }) as any

    // Mock fetch
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({}),
    })

    // Mock setTimeout
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.runOnlyPendingTimers()
    jest.useRealTimers()
  })

  describe('连接管理', () => {
    it('应该在初始化时建立 SSE 连接', async () => {
      const { result } = renderHook(() => useAgentChat())

      await act(async () => {
        jest.runAllTimers()
      })

      expect(global.EventSource).toHaveBeenCalledWith('/v1/agent/chat')
      await waitFor(() => {
        expect(result.current.isConnected).toBe(true)
      })
    })

    it('应该使用 sessionId 建立连接', async () => {
      const sessionId = 'test-session-123'
      renderHook(() => useAgentChat({ sessionId }))

      await act(async () => {
        jest.runAllTimers()
      })

      expect(global.EventSource).toHaveBeenCalledWith(`/v1/agent/chat/${sessionId}`)
    })

    it('应该支持自定义 API 基础 URL', async () => {
      const apiBaseUrl = '/custom/api'
      renderHook(() => useAgentChat({ apiBaseUrl }))

      await act(async () => {
        jest.runAllTimers()
      })

      expect(global.EventSource).toHaveBeenCalledWith(`${apiBaseUrl}/chat`)
    })

    it('应该在连接错误时自动重连', async () => {
      const { result } = renderHook(() => useAgentChat())

      await act(async () => {
        jest.runAllTimers()
      })

      // 模拟连接错误
      await act(async () => {
        mockEventSource?.simulateError()
      })

      expect(result.current.isConnected).toBe(false)

      // 等待重连（3秒后）
      await act(async () => {
        jest.advanceTimersByTime(3000)
      })

      expect(global.EventSource).toHaveBeenCalledTimes(2)
    })

    it('应该在卸载时断开连接', async () => {
      const { unmount } = renderHook(() => useAgentChat())

      await act(async () => {
        jest.runAllTimers()
      })

      const closeSpy = jest.spyOn(mockEventSource!, 'close')

      unmount()

      expect(closeSpy).toHaveBeenCalled()
    })
  })

  describe('消息处理', () => {
    it('应该处理 agent.start 事件', async () => {
      const { result } = renderHook(() => useAgentChat())

      await act(async () => {
        jest.runAllTimers()
      })

      const startEvent: AgentSseEvent = {
        event: 'agent.start',
        data: {
          runId: 'run-123',
          createdAt: '2026-02-04T10:00:00Z',
        },
      }

      await act(async () => {
        mockEventSource?.simulateMessage(startEvent)
      })

      expect(result.current.currentRunId).toBe('run-123')
      expect(result.current.isRunning).toBe(true)
    })

    it('应该累积 agent.delta 事件构建消息', async () => {
      const { result } = renderHook(() => useAgentChat())

      await act(async () => {
        jest.runAllTimers()
      })

      const delta1: AgentSseEvent = {
        event: 'agent.delta',
        data: {
          id: 'msg-1',
          delta: 'Hello ',
          role: 'assistant',
        },
      }

      const delta2: AgentSseEvent = {
        event: 'agent.delta',
        data: {
          id: 'msg-1',
          delta: 'World!',
        },
      }

      await act(async () => {
        mockEventSource?.simulateMessage(delta1)
        mockEventSource?.simulateMessage(delta2)
      })

      expect(result.current.messages).toHaveLength(1)
      expect(result.current.messages[0].content).toBe('Hello World!')
      expect(result.current.messages[0].role).toBe('assistant')
    })

    it('应该处理完整的 agent.message 事件', async () => {
      const onMessage = jest.fn()
      const { result } = renderHook(() => useAgentChat({ onMessage }))

      await act(async () => {
        jest.runAllTimers()
      })

      const messageEvent: AgentSseEvent = {
        event: 'agent.message',
        data: {
          id: 'msg-2',
          role: 'assistant',
          content: 'Complete message',
          createdAt: '2026-02-04T10:00:00Z',
          references: [],
        },
      }

      await act(async () => {
        mockEventSource?.simulateMessage(messageEvent)
      })

      expect(result.current.messages).toHaveLength(1)
      expect(result.current.messages[0].content).toBe('Complete message')
      expect(onMessage).toHaveBeenCalledWith(messageEvent.data)
    })

    it('应该处理带引用的消息', async () => {
      const { result } = renderHook(() => useAgentChat())

      await act(async () => {
        jest.runAllTimers()
      })

      const messageEvent: AgentSseEvent = {
        event: 'agent.message',
        data: {
          id: 'msg-3',
          role: 'assistant',
          content: 'Message with references',
          createdAt: '2026-02-04T10:00:00Z',
          references: [
            {
              kind: 'contact',
              id: 'contact-1',
              label: 'John Doe',
            },
          ],
        },
      }

      await act(async () => {
        mockEventSource?.simulateMessage(messageEvent)
      })

      expect(result.current.messages[0].references).toHaveLength(1)
      expect(result.current.messages[0].references?.[0].kind).toBe('contact')
    })
  })

  describe('工具状态管理', () => {
    it('应该处理 tool.state 事件', async () => {
      const onToolStateUpdate = jest.fn()
      const { result } = renderHook(() => useAgentChat({ onToolStateUpdate }))

      await act(async () => {
        jest.runAllTimers()
      })

      const toolStateEvent: AgentSseEvent = {
        event: 'tool.state',
        data: {
          toolId: 'tool-1',
          name: 'search',
          status: 'running',
          at: '2026-02-04T10:00:00Z',
        },
      }

      await act(async () => {
        mockEventSource?.simulateMessage(toolStateEvent)
      })

      expect(result.current.toolStates['tool-1']).toBeDefined()
      expect(result.current.toolStates['tool-1'].status).toBe('running')
      expect(onToolStateUpdate).toHaveBeenCalledWith(toolStateEvent.data)
    })

    it('应该跟踪工具执行时间', async () => {
      const { result } = renderHook(() => useAgentChat())

      await act(async () => {
        jest.runAllTimers()
      })

      const startEvent: AgentSseEvent = {
        event: 'tool.state',
        data: {
          toolId: 'tool-1',
          name: 'search',
          status: 'running',
          at: '2026-02-04T10:00:00Z',
        },
      }

      const endEvent: AgentSseEvent = {
        event: 'tool.state',
        data: {
          toolId: 'tool-1',
          name: 'search',
          status: 'succeeded',
          at: '2026-02-04T10:00:05Z',
          output: { result: 'success' },
        },
      }

      await act(async () => {
        mockEventSource?.simulateMessage(startEvent)
        mockEventSource?.simulateMessage(endEvent)
      })

      const toolState = result.current.toolStates['tool-1']
      expect(toolState.status).toBe('succeeded')
      expect(toolState.startedAt).toBe('2026-02-04T10:00:00Z')
      expect(toolState.endedAt).toBe('2026-02-04T10:00:05Z')
      expect(toolState.output).toEqual({ result: 'success' })
    })
  })

  describe('错误处理', () => {
    it('应该处理 error 事件', async () => {
      const onError = jest.fn()
      const { result } = renderHook(() => useAgentChat({ onError }))

      await act(async () => {
        jest.runAllTimers()
      })

      const errorEvent: AgentSseEvent = {
        event: 'error',
        data: {
          code: 'INVALID_INPUT',
          message: 'Invalid input provided',
          retryable: true,
        },
      }

      await act(async () => {
        mockEventSource?.simulateMessage(errorEvent)
      })

      expect(result.current.error).toEqual(errorEvent.data)
      expect(result.current.isRunning).toBe(false)
      expect(onError).toHaveBeenCalledWith(errorEvent.data)
    })

    it('应该在发送消息失败时设置错误', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'))

      const { result } = renderHook(() => useAgentChat({ sessionId: 'test-session' }))

      await act(async () => {
        jest.runAllTimers()
      })

      await act(async () => {
        try {
          await result.current.sendMessage('Hello')
        } catch (err) {
          // Expected error
        }
      })

      expect(result.current.error).toBeDefined()
      expect(result.current.error?.code).toBe('SEND_MESSAGE_FAILED')
    })
  })

  describe('发送消息', () => {
    it('应该发送用户消息并添加到消息列表', async () => {
      const { result } = renderHook(() => useAgentChat({ sessionId: 'test-session' }))

      await act(async () => {
        jest.runAllTimers()
      })

      await act(async () => {
        await result.current.sendMessage('Hello, Agent!')
      })

      expect(result.current.messages).toHaveLength(1)
      expect(result.current.messages[0].role).toBe('user')
      expect(result.current.messages[0].content).toBe('Hello, Agent!')

      expect(global.fetch).toHaveBeenCalledWith(
        '/v1/agent/chat/test-session',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: 'Hello, Agent!',
            references: undefined,
          }),
        })
      )
    })

    it('应该支持发送带引用的消息', async () => {
      const { result } = renderHook(() => useAgentChat({ sessionId: 'test-session' }))

      await act(async () => {
        jest.runAllTimers()
      })

      const references = [
        {
          kind: 'contact' as const,
          id: 'contact-1',
          label: 'John Doe',
        },
      ]

      await act(async () => {
        await result.current.sendMessage('Check this contact', references)
      })

      expect(result.current.messages[0].references).toEqual(references)
      expect(global.fetch).toHaveBeenCalledWith(
        '/v1/agent/chat/test-session',
        expect.objectContaining({
          body: JSON.stringify({
            message: 'Check this contact',
            references,
          }),
        })
      )
    })

    it('应该拒绝空消息', async () => {
      const { result } = renderHook(() => useAgentChat())

      await act(async () => {
        jest.runAllTimers()
      })

      await expect(async () => {
        await act(async () => {
          await result.current.sendMessage('   ')
        })
      }).rejects.toThrow('Message content cannot be empty')
    })
  })

  describe('运行生命周期', () => {
    it('应该完整处理运行生命周期', async () => {
      const onRunEnd = jest.fn()
      const { result } = renderHook(() => useAgentChat({ onRunEnd }))

      await act(async () => {
        jest.runAllTimers()
      })

      // 开始运行
      const startEvent: AgentSseEvent = {
        event: 'agent.start',
        data: {
          runId: 'run-123',
          createdAt: '2026-02-04T10:00:00Z',
        },
      }

      await act(async () => {
        mockEventSource?.simulateMessage(startEvent)
      })

      expect(result.current.isRunning).toBe(true)
      expect(result.current.currentRunId).toBe('run-123')

      // 结束运行
      const endEvent: AgentSseEvent = {
        event: 'agent.end',
        data: {
          runId: 'run-123',
          status: 'succeeded',
          finishedAt: '2026-02-04T10:00:10Z',
          output: 'Task completed successfully',
        },
      }

      await act(async () => {
        mockEventSource?.simulateMessage(endEvent)
      })

      expect(result.current.isRunning).toBe(false)
      expect(result.current.currentRunId).toBeNull()
      expect(onRunEnd).toHaveBeenCalledWith(endEvent.data)
    })
  })

  describe('上下文补丁', () => {
    it('应该处理 context.patch 事件', async () => {
      const onContextPatch = jest.fn()
      const { result } = renderHook(() => useAgentChat({ onContextPatch }))

      await act(async () => {
        jest.runAllTimers()
      })

      const patchEvent: AgentSseEvent = {
        event: 'context.patch',
        data: {
          layer: 'session',
          patch: {
            vars: { userId: 'user-123' },
          },
        },
      }

      await act(async () => {
        mockEventSource?.simulateMessage(patchEvent)
      })

      expect(onContextPatch).toHaveBeenCalledWith(patchEvent.data)
    })
  })

  describe('重连功能', () => {
    it('应该支持手动重连', async () => {
      const { result } = renderHook(() => useAgentChat())

      await act(async () => {
        jest.runAllTimers()
      })

      // 断开连接
      await act(async () => {
        result.current.disconnect()
      })

      expect(result.current.isConnected).toBe(false)

      // 手动重连
      await act(async () => {
        result.current.reconnect()
        jest.runAllTimers()
      })

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true)
      })
    })
  })
})
