import { VercelAiStreamAdapter } from './vercel-ai-stream.adapter';
import type { AgentStreamEvent } from '../agent.types';
import type {
  AgentError,
  AgentMessage,
  AgentMessageDelta,
  ToolStateUpdate,
} from '../client-types';

describe('VercelAiStreamAdapter', () => {
  let adapter: VercelAiStreamAdapter;

  beforeEach(() => {
    adapter = new VercelAiStreamAdapter();
  });

  describe('transformTextDelta', () => {
    it('应该将 agent.delta 转换为 0: 格式', () => {
      const event: AgentStreamEvent = {
        event: 'agent.delta',
        data: {
          id: 'msg-123',
          delta: 'Hello',
          role: 'assistant',
        },
      };

      const result = adapter.transform(event);
      expect(result).toBe('0:"Hello"\n');
    });

    it('应该处理多行文本', () => {
      const event: AgentStreamEvent = {
        event: 'agent.delta',
        data: {
          id: 'msg-123',
          delta: 'Line 1\nLine 2',
          role: 'assistant',
        },
      };

      const result = adapter.transform(event);
      expect(result).toBe('0:"Line 1\\nLine 2"\n');
    });
  });

  describe('transformMessageComplete', () => {
    it('应该将 agent.message 转换为 d: 格式', () => {
      const event: AgentStreamEvent = {
        event: 'agent.message',
        data: {
          id: 'msg-123',
          role: 'assistant',
          content: 'Complete message',
          createdAt: '2026-01-01T00:00:00Z',
        },
      };

      const result = adapter.transform(event);
      expect(result).toContain('d:{"finishReason":"stop"}\n');
    });

    it('应该包含 A2UI 数据在 metadata 中', () => {
      const event: AgentStreamEvent = {
        event: 'agent.message',
        data: {
          id: 'msg-123',
          role: 'assistant',
          content: 'Message with A2UI',
          createdAt: '2026-01-01T00:00:00Z',
          metadata: {
            a2ui: {
              type: 'card',
              props: { title: 'Test Card' },
            },
          },
        },
      };

      const result = adapter.transform(event);
      expect(result).toContain('d:{"finishReason":"stop"}\n');
      expect(result).toContain('2:');
    });

    it('应该处理数组形式的 A2UI 数据', () => {
      const event: AgentStreamEvent = {
        event: 'agent.message',
        data: {
          id: 'msg-123',
          role: 'assistant',
          content: 'Message with A2UI array',
          createdAt: '2026-01-01T00:00:00Z',
          metadata: {
            a2ui: [
              { type: 'card', props: { title: 'Card 1' } },
              { type: 'button', props: { label: 'Button 1' } },
            ],
          },
        },
      };

      const result = adapter.transform(event);
      expect(result).toContain('2:');
      const a2uiLine = result?.split('\n').find((line) => line.startsWith('2:'));
      expect(a2uiLine).toBeDefined();
      if (a2uiLine) {
        const parsed = JSON.parse(a2uiLine.substring(2));
        expect(Array.isArray(parsed)).toBe(true);
        expect(parsed.length).toBe(2);
      }
    });
  });

  describe('transformToolState', () => {
    it('应该将 running 状态转换为 9: 格式', () => {
      const event: AgentStreamEvent = {
        event: 'tool.state',
        data: {
          toolId: 'tool-123',
          name: 'test_tool',
          status: 'running',
          at: '2026-01-01T00:00:00Z',
          input: { param1: 'value1' },
        },
      };

      const result = adapter.transform(event);
      expect(result).toContain('9:');
      if (result) {
        const parsed = JSON.parse(result.substring(2).trim());
        expect(parsed.toolCallId).toBe('tool-123');
        expect(parsed.toolName).toBe('test_tool');
        expect(parsed.args).toEqual({ param1: 'value1' });
      }
    });

    it('应该将 succeeded 状态转换为 a: 格式', () => {
      const event: AgentStreamEvent = {
        event: 'tool.state',
        data: {
          toolId: 'tool-123',
          name: 'test_tool',
          status: 'succeeded',
          at: '2026-01-01T00:00:00Z',
          output: { result: 'success' },
        },
      };

      const result = adapter.transform(event);
      expect(result).toContain('a:');
      if (result) {
        const parsed = JSON.parse(result.substring(2).trim());
        expect(parsed.toolCallId).toBe('tool-123');
        expect(parsed.result).toEqual({ result: 'success' });
      }
    });

    it('应该将 failed 状态转换为 3: 错误格式', () => {
      const event: AgentStreamEvent = {
        event: 'tool.state',
        data: {
          toolId: 'tool-123',
          name: 'test_tool',
          status: 'failed',
          at: '2026-01-01T00:00:00Z',
          error: {
            code: 'tool_error',
            message: 'Tool execution failed',
          },
        },
      };

      const result = adapter.transform(event);
      expect(result).toContain('3:');
    });

    it('应该忽略 awaiting_input 状态', () => {
      const event: AgentStreamEvent = {
        event: 'tool.state',
        data: {
          toolId: 'tool-123',
          name: 'test_tool',
          status: 'awaiting_input',
          at: '2026-01-01T00:00:00Z',
          confirmationId: 'conf-123',
        },
      };

      const result = adapter.transform(event);
      expect(result).toBeNull();
    });
  });

  describe('transformError', () => {
    it('应该将 error 事件转换为 3: 格式', () => {
      const event: AgentStreamEvent = {
        event: 'error',
        data: {
          code: 'test_error',
          message: 'Test error message',
        },
      };

      const result = adapter.transform(event);
      expect(result).toBe('3:"Test error message"\n');
    });
  });

  describe('忽略的事件', () => {
    it('应该忽略 agent.start 事件', () => {
      const event: AgentStreamEvent = {
        event: 'agent.start',
        data: {
          runId: 'run-123',
          createdAt: '2026-01-01T00:00:00Z',
        },
      };

      const result = adapter.transform(event);
      expect(result).toBeNull();
    });

    it('应该忽略 agent.end 事件', () => {
      const event: AgentStreamEvent = {
        event: 'agent.end',
        data: {
          runId: 'run-123',
          status: 'succeeded',
          finishedAt: '2026-01-01T00:00:00Z',
        },
      };

      const result = adapter.transform(event);
      expect(result).toBeNull();
    });

    it('应该忽略 ping 事件', () => {
      const event: AgentStreamEvent = {
        event: 'ping',
        data: {
          at: '2026-01-01T00:00:00Z',
        },
      };

      const result = adapter.transform(event);
      expect(result).toBeNull();
    });
  });
});




