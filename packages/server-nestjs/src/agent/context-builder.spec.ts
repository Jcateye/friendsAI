import { ContextBuilder } from './context-builder';
import { AgentChatRequest } from './agent.types';
import type OpenAI from 'openai';

describe('ContextBuilder', () => {
  let contextBuilder: ContextBuilder;

  beforeEach(() => {
    contextBuilder = new ContextBuilder();
  });

  describe('buildMessages', () => {
    it('should build messages with default system prompt when only prompt is provided', () => {
      const request: AgentChatRequest = {
        prompt: 'Hello, how are you?',
      };

      const messages = contextBuilder.buildMessages(request);

      expect(messages).toHaveLength(2);
      expect(messages[0]).toEqual({
        role: 'system',
        content: 'You are a helpful assistant.',
      });
      expect(messages[1]).toEqual({
        role: 'user',
        content: 'Hello, how are you?',
      });
    });

    it('should build messages with custom system prompt', () => {
      const request: AgentChatRequest = {
        prompt: 'Hello',
      };

      const messages = contextBuilder.buildMessages(request, {
        systemPrompt: 'You are a coding assistant.',
      });

      expect(messages).toHaveLength(2);
      expect(messages[0]).toEqual({
        role: 'system',
        content: 'You are a coding assistant.',
      });
    });

    it('should include context when provided', () => {
      const request: AgentChatRequest = {
        prompt: 'What is my name?',
        context: { userName: 'Alice', userAge: 25 },
      };

      const messages = contextBuilder.buildMessages(request);

      expect(messages).toHaveLength(3);
      expect(messages[0].role).toBe('system');
      expect(messages[1]).toEqual({
        role: 'system',
        content: 'Context: {"userName":"Alice","userAge":25}',
      });
      expect(messages[2].role).toBe('user');
    });

    it('should use existing messages when provided', () => {
      const request: AgentChatRequest = {
        messages: [
          { role: 'user', content: 'Hello' },
          { role: 'assistant', content: 'Hi there!' },
          { role: 'user', content: 'How are you?' },
        ],
      };

      const messages = contextBuilder.buildMessages(request);

      expect(messages).toHaveLength(4); // system + 3 user messages
      expect(messages[0].role).toBe('system');
      expect(messages[1]).toEqual({ role: 'user', content: 'Hello' });
      expect(messages[2]).toEqual({ role: 'assistant', content: 'Hi there!' });
      expect(messages[3]).toEqual({ role: 'user', content: 'How are you?' });
    });

    it('should filter out existing system messages from user messages', () => {
      const request: AgentChatRequest = {
        messages: [
          { role: 'system', content: 'Old system prompt' },
          { role: 'user', content: 'Hello' },
        ],
      };

      const messages = contextBuilder.buildMessages(request);

      // Should have new system prompt + user message (old system filtered out)
      expect(messages).toHaveLength(2);
      expect(messages[0]).toEqual({
        role: 'system',
        content: 'You are a helpful assistant.',
      });
      expect(messages[1]).toEqual({ role: 'user', content: 'Hello' });
    });

    it('should trim history when exceeds maxHistoryLength', () => {
      const longMessages: AgentChatRequest['messages'] = Array.from({ length: 60 }, (_, i) => ({
        role: i % 2 === 0 ? ('user' as const) : ('assistant' as const),
        content: `Message ${i}`,
      }));

      const request: AgentChatRequest = {
        messages: longMessages,
      };

      const messages = contextBuilder.buildMessages(request, {
        maxHistoryLength: 20,
      });

      // Should have system + last 20 messages
      expect(messages.length).toBeLessThanOrEqual(21);
      expect(messages[0].role).toBe('system');
    });

    it('should handle empty context object', () => {
      const request: AgentChatRequest = {
        prompt: 'Hello',
        context: {},
      };

      const messages = contextBuilder.buildMessages(request);

      // Should not add empty context message
      expect(messages).toHaveLength(2);
      expect(messages[0].role).toBe('system');
      expect(messages[1].role).toBe('user');
    });
  });

  describe('appendToolResult', () => {
    it('should append tool result message to messages array', () => {
      const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
        { role: 'system', content: 'You are helpful' },
        { role: 'user', content: 'Send email' },
      ];

      const result = contextBuilder.appendToolResult(
        messages,
        'call_123',
        'send_email',
        { success: true, messageId: 'msg_456' }
      );

      expect(result).toHaveLength(3);
      expect(result[2]).toEqual({
        role: 'tool',
        tool_call_id: 'call_123',
        content: '{"success":true,"messageId":"msg_456"}',
      });
      // Original array should not be mutated
      expect(messages).toHaveLength(2);
    });

    it('should handle complex result objects', () => {
      const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];

      const complexResult = {
        data: { users: [{ name: 'Alice' }, { name: 'Bob' }] },
        metadata: { count: 2 },
      };

      const result = contextBuilder.appendToolResult(
        messages,
        'call_999',
        'fetch_users',
        complexResult
      );

      expect(result[0]).toEqual({
        role: 'tool',
        tool_call_id: 'call_999',
        content: JSON.stringify(complexResult),
      });
    });
  });

  describe('appendAssistantToolCall', () => {
    it('should append assistant tool call message', () => {
      const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
        { role: 'user', content: 'Send email' },
      ];

      const toolCalls: OpenAI.Chat.Completions.ChatCompletionMessageToolCall[] = [
        {
          id: 'call_123',
          type: 'function',
          function: {
            name: 'send_email',
            arguments: '{"to":"user@example.com","subject":"Hello"}',
          },
        },
      ];

      const result = contextBuilder.appendAssistantToolCall(messages, toolCalls);

      expect(result).toHaveLength(2);
      expect(result[1]).toEqual({
        role: 'assistant',
        tool_calls: toolCalls,
      });
      // Original array should not be mutated
      expect(messages).toHaveLength(1);
    });

    it('should handle multiple tool calls', () => {
      const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];

      const toolCalls: OpenAI.Chat.Completions.ChatCompletionMessageToolCall[] = [
        {
          id: 'call_1',
          type: 'function',
          function: { name: 'tool_1', arguments: '{}' },
        },
        {
          id: 'call_2',
          type: 'function',
          function: { name: 'tool_2', arguments: '{}' },
        },
      ];

      const result = contextBuilder.appendAssistantToolCall(messages, toolCalls);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        role: 'assistant',
        tool_calls: toolCalls,
      });
    });
  });

  describe('updateContext', () => {
    it('should merge new context with existing context immutably', () => {
      const currentContext = { userName: 'Alice', userAge: 25 };
      const updates = { userAge: 26, userCity: 'New York' };

      const result = contextBuilder.updateContext(currentContext, updates);

      expect(result).toEqual({
        userName: 'Alice',
        userAge: 26,
        userCity: 'New York',
      });
      // Original should not be mutated
      expect(currentContext).toEqual({ userName: 'Alice', userAge: 25 });
    });

    it('should handle undefined current context', () => {
      const updates = { key: 'value' };

      const result = contextBuilder.updateContext(undefined, updates);

      expect(result).toEqual(updates);
    });

    it('should handle empty updates', () => {
      const currentContext = { key: 'value' };

      const result = contextBuilder.updateContext(currentContext, {});

      expect(result).toEqual(currentContext);
      expect(result).not.toBe(currentContext); // Should be a new object
    });
  });

  describe('trimHistory', () => {
    it('should trim messages when exceeds maxLength', () => {
      const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
        { role: 'system', content: 'System' },
        { role: 'user', content: 'Message 1' },
        { role: 'assistant', content: 'Response 1' },
        { role: 'user', content: 'Message 2' },
        { role: 'assistant', content: 'Response 2' },
        { role: 'user', content: 'Message 3' },
      ];

      const result = contextBuilder.trimHistory(messages, 3);

      expect(result.length).toBeLessThanOrEqual(3);
      // Should preserve system messages
      expect(result[0].role).toBe('system');
      // Should keep most recent messages
      expect(result[result.length - 1].content).toBe('Message 3');
    });

    it('should not trim when within maxLength', () => {
      const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
        { role: 'system', content: 'System' },
        { role: 'user', content: 'Message 1' },
        { role: 'assistant', content: 'Response 1' },
      ];

      const result = contextBuilder.trimHistory(messages, 10);

      expect(result).toHaveLength(3);
      expect(result).toEqual(messages);
    });

    it('should preserve all system messages when trimming', () => {
      const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
        { role: 'system', content: 'System 1' },
        { role: 'system', content: 'System 2' },
        { role: 'user', content: 'Message 1' },
        { role: 'user', content: 'Message 2' },
        { role: 'user', content: 'Message 3' },
      ];

      const result = contextBuilder.trimHistory(messages, 3);

      // Should have both system messages + 1 user message
      const systemCount = result.filter(m => m.role === 'system').length;
      expect(systemCount).toBe(2);
    });

    it('should use default maxLength when not specified', () => {
      const longMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = Array.from(
        { length: 60 },
        (_, i) => ({
          role: i % 2 === 0 ? ('user' as const) : ('assistant' as const),
          content: `Message ${i}`,
        })
      );

      const result = contextBuilder.trimHistory(longMessages);

      // Default is 50
      expect(result.length).toBeLessThanOrEqual(50);
    });
  });
});
