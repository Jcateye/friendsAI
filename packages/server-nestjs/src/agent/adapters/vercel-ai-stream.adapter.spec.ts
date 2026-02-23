import { VercelAiStreamAdapter } from './vercel-ai-stream.adapter';
import type { AgentStreamEvent } from '../agent.types';

describe('VercelAiStreamAdapter', () => {
  let adapter: VercelAiStreamAdapter;

  beforeEach(() => {
    adapter = new VercelAiStreamAdapter();
  });

  function parseSseChunks(stream: string | null): Array<Record<string, unknown>> {
    if (!stream) {
      return [];
    }
    return stream
      .split('\n\n')
      .map((line) => line.trim())
      .filter((line) => line.startsWith('data: '))
      .map((line) => line.slice(6))
      .filter((payload) => payload !== '[DONE]')
      .map((payload) => JSON.parse(payload) as Record<string, unknown>);
  }

  it('emits start chunk for agent.start', () => {
    const event: AgentStreamEvent = {
      event: 'agent.start',
      data: {
        runId: 'run-123',
        createdAt: '2026-01-01T00:00:00Z',
      },
    };

    const chunks = parseSseChunks(adapter.transform(event));
    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toMatchObject({
      type: 'start',
      messageId: expect.any(String),
    });
  });

  it('emits start + text-start + text-delta for first agent.delta', () => {
    const event: AgentStreamEvent = {
      event: 'agent.delta',
      data: {
        id: 'msg-123',
        delta: 'Hello',
        role: 'assistant',
      },
    };

    const chunks = parseSseChunks(adapter.transform(event));
    expect(chunks).toHaveLength(3);
    expect(chunks[0]).toMatchObject({ type: 'start', messageId: expect.any(String) });
    expect(chunks[1]).toMatchObject({ type: 'text-start', id: expect.any(String) });
    expect(chunks[2]).toMatchObject({
      type: 'text-delta',
      id: expect.any(String),
      delta: 'Hello',
    });
  });

  it('emits only text-delta for subsequent agent.delta with same text part id', () => {
    const first = parseSseChunks(
      adapter.transform({
        event: 'agent.delta',
        data: { id: 'msg-1', delta: 'A', role: 'assistant' },
      } as AgentStreamEvent),
    );
    const second = parseSseChunks(
      adapter.transform({
        event: 'agent.delta',
        data: { id: 'msg-1', delta: 'B', role: 'assistant' },
      } as AgentStreamEvent),
    );

    expect(first[2]).toMatchObject({ type: 'text-delta', id: expect.any(String), delta: 'A' });
    expect(second).toHaveLength(1);
    expect(second[0]).toMatchObject({ type: 'text-delta', id: first[2].id, delta: 'B' });
  });

  it('emits text-end + finish on agent.message when text part is open', () => {
    adapter.transform({
      event: 'agent.delta',
      data: { id: 'msg-1', delta: 'partial', role: 'assistant' },
    } as AgentStreamEvent);

    const chunks = parseSseChunks(
      adapter.transform({
        event: 'agent.message',
        data: {
          id: 'msg-1',
          role: 'assistant',
          content: 'partial',
          createdAt: '2026-01-01T00:00:00Z',
        },
      } as AgentStreamEvent),
    );

    expect(chunks).toHaveLength(2);
    expect(chunks[0]).toMatchObject({ type: 'text-end', id: expect.any(String) });
    expect(chunks[1]).toMatchObject({ type: 'finish', finishReason: 'stop' });
  });

  it('emits finish only on agent.message when no text part is open', () => {
    const chunks = parseSseChunks(
      adapter.transform({
        event: 'agent.message',
        data: {
          id: 'msg-1',
          role: 'assistant',
          content: 'done',
          createdAt: '2026-01-01T00:00:00Z',
        },
      } as AgentStreamEvent),
    );
    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toMatchObject({ type: 'finish', finishReason: 'stop' });
  });

  it('emits tool-input-available on running/queued tool state', () => {
    const chunks = parseSseChunks(
      adapter.transform({
        event: 'tool.state',
        data: {
          toolId: 'tool-123',
          name: 'test_tool',
          status: 'running',
          at: '2026-01-01T00:00:00Z',
          input: { param1: 'value1' },
        },
      } as AgentStreamEvent),
    );

    expect(chunks.at(-1)).toMatchObject({
      type: 'tool-input-available',
      toolCallId: 'tool-123',
      toolName: 'test_tool',
      input: { param1: 'value1' },
      dynamic: true,
    });
  });

  it('emits tool-output-available on succeeded tool state', () => {
    const chunks = parseSseChunks(
      adapter.transform({
        event: 'tool.state',
        data: {
          toolId: 'tool-123',
          name: 'test_tool',
          status: 'succeeded',
          at: '2026-01-01T00:00:00Z',
          output: { result: 'success' },
        },
      } as AgentStreamEvent),
    );

    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toMatchObject({
      type: 'tool-output-available',
      toolCallId: 'tool-123',
      output: { result: 'success' },
      dynamic: true,
    });
  });

  it('emits tool-output-error on failed tool state', () => {
    const chunks = parseSseChunks(
      adapter.transform({
        event: 'tool.state',
        data: {
          toolId: 'tool-123',
          name: 'test_tool',
          status: 'failed',
          at: '2026-01-01T00:00:00Z',
          error: { code: 'tool_error', message: 'Tool execution failed' },
        },
      } as AgentStreamEvent),
    );

    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toMatchObject({
      type: 'tool-output-error',
      toolCallId: 'tool-123',
      errorText: 'Tool execution failed',
      dynamic: true,
    });
  });

  it('emits data-tool-awaiting-input on awaiting_input tool state', () => {
    const chunks = parseSseChunks(
      adapter.transform({
        event: 'tool.state',
        data: {
          toolId: 'tool-123',
          name: 'test_tool',
          status: 'awaiting_input',
          at: '2026-01-01T00:00:00Z',
          confirmationId: 'conf-123',
          input: { foo: 'bar' },
        },
      } as AgentStreamEvent),
    );

    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toMatchObject({
      type: 'data-tool-awaiting-input',
      id: 'tool-123',
      data: {
        toolCallId: 'tool-123',
        toolName: 'test_tool',
        confirmationId: 'conf-123',
        input: { foo: 'bar' },
      },
    });
  });

  it('emits error chunk on error event', () => {
    const chunks = parseSseChunks(
      adapter.transform({
        event: 'error',
        data: { code: 'test_error', message: 'Test error message' },
      } as AgentStreamEvent),
    );

    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toMatchObject({
      type: 'error',
      errorText: 'Test error message',
    });
  });

  it('emits data-conversation-created on context.patch conversationId', () => {
    const chunks = parseSseChunks(
      adapter.transform({
        event: 'context.patch',
        data: { layer: 'session', patch: { conversationId: 'conv-123' } },
      } as AgentStreamEvent),
    );

    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toMatchObject({
      type: 'data-conversation-created',
      id: expect.any(String),
      data: {
        type: 'conversation.created',
        conversationId: 'conv-123',
      },
    });
  });

  it('returns null for ping and unknown events', () => {
    expect(
      adapter.transform({
        event: 'ping',
        data: { at: '2026-01-01T00:00:00Z' },
      } as AgentStreamEvent),
    ).toBeNull();
    expect(adapter.transform({ event: 'unknown.event' } as AgentStreamEvent)).toBeNull();
  });

  it('returns null for agent.end when no open text part, and text-end when open', () => {
    expect(
      adapter.transform({
        event: 'agent.end',
        data: { runId: 'run-1', status: 'succeeded', finishedAt: '2026-01-01T00:00:00Z' },
      } as AgentStreamEvent),
    ).toBeNull();

    adapter.transform({
      event: 'agent.delta',
      data: { id: 'msg-1', delta: 'partial', role: 'assistant' },
    } as AgentStreamEvent);

    const chunks = parseSseChunks(
      adapter.transform({
        event: 'agent.end',
        data: { runId: 'run-1', status: 'failed', finishedAt: '2026-01-01T00:00:00Z' },
      } as AgentStreamEvent),
    );
    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toMatchObject({ type: 'text-end', id: expect.any(String) });
  });

  it('returns done marker', () => {
    expect(adapter.done()).toBe('data: [DONE]\n\n');
  });
});
