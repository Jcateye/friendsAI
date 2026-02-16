/* @vitest-environment jsdom */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useChat } from 'ai/react';
import { useAgentChat } from './useAgentChat';

vi.mock('ai/react', () => ({
  useChat: vi.fn(),
}));

describe('useAgentChat', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 200 })));
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    });
  });

  it('injects composerContext into /agent/chat request body', async () => {
    const append = vi.fn();

    let capturedFetch: ((input: RequestInfo | URL, init?: RequestInit) => Promise<Response>) | undefined;

    vi.mocked(useChat).mockImplementation((options: any) => {
      capturedFetch = options.fetch;
      return {
        messages: [],
        append,
        stop: vi.fn(),
        reload: vi.fn(),
        input: '',
        setInput: vi.fn(),
        isLoading: false,
        error: undefined,
      } as any;
    });

    const { result } = renderHook(() => useAgentChat({ conversationId: 'conv-123' }));

    act(() => {
      result.current.sendMessage('hello', {
        composerContext: {
          enabledTools: ['web_search'],
          attachments: [{ name: 'demo.txt', kind: 'file', size: 12 }],
          feishuEnabled: true,
          inputMode: 'voice',
        },
      });
    });

    expect(append).toHaveBeenCalledTimes(1);

    await capturedFetch?.('/v1/agent/chat?format=vercel-ai', {
      method: 'POST',
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'hello' }],
        context: { source: 'ui' },
      }),
    });

    const fetchCalls = vi.mocked(fetch).mock.calls;
    expect(fetchCalls.length).toBeGreaterThan(0);

    const requestInit = fetchCalls[0][1] as RequestInit;
    const requestBody = JSON.parse((requestInit.body as string) ?? '{}');

    expect(requestBody.conversationId).toBe('conv-123');
    expect(requestBody.context).toMatchObject({
      source: 'ui',
      composer: {
        enabledTools: ['web_search'],
        attachments: [{ name: 'demo.txt', kind: 'file', size: 12 }],
        feishuEnabled: true,
        inputMode: 'voice',
      },
    });
  });

  it('keeps legacy sendMessage(message) signature compatible', async () => {
    const append = vi.fn();

    let capturedFetch: ((input: RequestInfo | URL, init?: RequestInit) => Promise<Response>) | undefined;

    vi.mocked(useChat).mockImplementation((options: any) => {
      capturedFetch = options.fetch;
      return {
        messages: [],
        append,
        stop: vi.fn(),
        reload: vi.fn(),
        input: '',
        setInput: vi.fn(),
        isLoading: false,
        error: undefined,
      } as any;
    });

    const { result } = renderHook(() => useAgentChat({ conversationId: 'conv-legacy' }));

    act(() => {
      result.current.sendMessage('plain message');
    });

    expect(append).toHaveBeenCalledWith(
      expect.objectContaining({
        role: 'user',
        content: 'plain message',
      })
    );

    await capturedFetch?.('/v1/agent/chat?format=vercel-ai', {
      method: 'POST',
      body: JSON.stringify({ messages: [{ role: 'user', content: 'plain message' }] }),
    });

    const requestInit = (vi.mocked(fetch).mock.calls[0][1] as RequestInit) ?? {};
    const requestBody = JSON.parse((requestInit.body as string) ?? '{}');

    expect(requestBody.conversationId).toBe('conv-legacy');
    expect(requestBody.context?.composer).toBeUndefined();
  });
});
