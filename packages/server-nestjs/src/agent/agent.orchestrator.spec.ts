import { Test, TestingModule } from '@nestjs/testing';
import { AgentOrchestrator } from './agent.orchestrator';
import { AiService } from '../ai/ai.service';
import { ContextBuilder } from './context-builder';
import { ToolExecutionStrategy } from '../ai/tools/tool-execution.strategy';
import { ToolRegistry } from '../ai/tool-registry';
import { AgentChatRequest } from './agent.types';
import { AgentMessageStore } from './agent-message.store';
import { MessagesService } from '../conversations/messages.service';
import { ConversationsService } from '../conversations/conversations.service';
import type OpenAI from 'openai';

describe('AgentOrchestrator', () => {
  let orchestrator: AgentOrchestrator;
  let aiService: jest.Mocked<AiService>;
  let contextBuilder: jest.Mocked<ContextBuilder>;
  let toolExecutionStrategy: jest.Mocked<ToolExecutionStrategy>;
  let toolRegistry: jest.Mocked<ToolRegistry>;
  let messageStore: jest.Mocked<AgentMessageStore>;
  let messagesService: jest.Mocked<MessagesService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AgentOrchestrator,
        {
          provide: AiService,
          useValue: {
            streamChat: jest.fn(),
          },
        },
        {
          provide: ContextBuilder,
          useValue: {
            buildMessages: jest.fn(),
            appendAssistantToolCall: jest.fn(),
            appendToolResult: jest.fn(),
          },
        },
        {
          provide: ToolExecutionStrategy,
          useValue: {
            execute: jest.fn(),
            resolveConfirmation: jest.fn(),
          },
        },
        {
          provide: ToolRegistry,
          useValue: {
            list: jest.fn(),
          },
        },
        {
          provide: AgentMessageStore,
          useValue: {
            buildKey: jest.fn().mockReturnValue('user:default'),
            createMessage: jest.fn((input: any) => ({
              id: input.id ?? 'msg-1',
              role: input.role,
              content: input.content,
              createdAt: new Date().toISOString(),
            })),
            appendMessage: jest.fn(),
          },
        },
        {
          provide: MessagesService,
          useValue: {
            appendMessage: jest.fn(),
            listMessages: jest.fn(),
          },
        },
        {
          provide: ConversationsService,
          useValue: {
            create: jest.fn().mockResolvedValue({ id: 'conv-auto-1' }),
          },
        },
      ],
    }).compile();

    orchestrator = module.get<AgentOrchestrator>(AgentOrchestrator);
    aiService = module.get(AiService);
    contextBuilder = module.get(ContextBuilder);
    toolExecutionStrategy = module.get(ToolExecutionStrategy);
    toolRegistry = module.get(ToolRegistry);
    messageStore = module.get(AgentMessageStore);
    messagesService = module.get(MessagesService);
  });

  describe('streamChat', () => {
    it('should stream text response without tool calls', async () => {
      const request: AgentChatRequest = {
        prompt: 'Hello, how are you?',
      };

      const mockMessages = [
        { role: 'system' as const, content: 'You are helpful' },
        { role: 'user' as const, content: 'Hello, how are you?' },
      ];

      contextBuilder.buildMessages.mockReturnValue(mockMessages);
      toolRegistry.list.mockReturnValue([]);

      // Mock streaming response
      const mockStream = (async function* () {
        yield {
          choices: [
            {
              delta: { content: 'Hello' },
              finish_reason: null,
            },
          ],
        } as OpenAI.Chat.Completions.ChatCompletionChunk;
        yield {
          choices: [
            {
              delta: { content: '!' },
              finish_reason: null,
            },
          ],
        } as OpenAI.Chat.Completions.ChatCompletionChunk;
        yield {
          choices: [
            {
              delta: {},
              finish_reason: 'stop',
            },
          ],
        } as OpenAI.Chat.Completions.ChatCompletionChunk;
      })();

      aiService.streamChat.mockResolvedValue(mockStream);

      const events = [];
      for await (const event of orchestrator.streamChat(request)) {
        events.push(event);
      }

      expect(events[0].event).toBe('agent.start');
      const deltaEvents = events.filter((event) => event.event === 'agent.delta');
      expect(deltaEvents).toHaveLength(2);
      expect(deltaEvents.map((event) => event.data.delta).join('')).toBe('Hello!');
      const messageEvent = events.find((event) => event.event === 'agent.message');
      expect(messageEvent).toBeDefined();
      expect(events[events.length - 1].event).toBe('agent.end');
    });

    it('should filter tools based on context.composer.enabledTools', async () => {
      const request: AgentChatRequest = {
        prompt: 'Use selected tool only',
        context: {
          composer: {
            enabledTools: ['selected_tool'],
          },
        },
      };

      contextBuilder.buildMessages.mockReturnValue([
        { role: 'system', content: 'You are helpful' },
        { role: 'user', content: 'Use selected tool only' },
      ] as OpenAI.Chat.Completions.ChatCompletionMessageParam[]);

      toolRegistry.list.mockReturnValue([
        {
          name: 'selected_tool',
          description: 'Selected tool',
          parameters: { type: 'object', properties: {} },
        },
        {
          name: 'other_tool',
          description: 'Other tool',
          parameters: { type: 'object', properties: {} },
        },
      ]);

      const mockStream = (async function* () {
        yield {
          choices: [
            {
              delta: { content: 'ok' },
              finish_reason: null,
            },
          ],
        } as OpenAI.Chat.Completions.ChatCompletionChunk;
        yield {
          choices: [
            {
              delta: {},
              finish_reason: 'stop',
            },
          ],
        } as OpenAI.Chat.Completions.ChatCompletionChunk;
      })();

      aiService.streamChat.mockResolvedValue(mockStream);

      for await (const _event of orchestrator.streamChat(request)) {
        // drain stream
      }

      expect(aiService.streamChat).toHaveBeenCalled();
      const chatOptions = aiService.streamChat.mock.calls[0][1];
      const toolNames = (chatOptions.tools ?? []).map((tool) => tool.name);
      expect(toolNames).toEqual(['selected_tool']);
    });

    it('should fallback to all tools when enabledTools filter result is empty', async () => {
      const request: AgentChatRequest = {
        prompt: 'Fallback tools',
        context: {
          composer: {
            enabledTools: ['missing_tool'],
          },
        },
      };

      contextBuilder.buildMessages.mockReturnValue([
        { role: 'system', content: 'You are helpful' },
        { role: 'user', content: 'Fallback tools' },
      ] as OpenAI.Chat.Completions.ChatCompletionMessageParam[]);

      toolRegistry.list.mockReturnValue([
        {
          name: 'tool_a',
          description: 'Tool A',
          parameters: { type: 'object', properties: {} },
        },
        {
          name: 'tool_b',
          description: 'Tool B',
          parameters: { type: 'object', properties: {} },
        },
      ]);

      const mockStream = (async function* () {
        yield {
          choices: [
            {
              delta: { content: 'done' },
              finish_reason: null,
            },
          ],
        } as OpenAI.Chat.Completions.ChatCompletionChunk;
        yield {
          choices: [
            {
              delta: {},
              finish_reason: 'stop',
            },
          ],
        } as OpenAI.Chat.Completions.ChatCompletionChunk;
      })();

      aiService.streamChat.mockResolvedValue(mockStream);

      for await (const _event of orchestrator.streamChat(request)) {
        // drain stream
      }

      const chatOptions = aiService.streamChat.mock.calls[0][1];
      const toolNames = (chatOptions.tools ?? []).map((tool) => tool.name).sort();
      expect(toolNames).toEqual(['tool_a', 'tool_b']);
    });

    it('should handle tool calls and execute them', async () => {
      const request: AgentChatRequest = {
        prompt: 'Send an email',
        userId: 'user123',
      };

      const mockMessages = [
        { role: 'system' as const, content: 'You are helpful' },
        { role: 'user' as const, content: 'Send an email' },
      ];

      contextBuilder.buildMessages.mockReturnValue(mockMessages);
      contextBuilder.appendAssistantToolCall.mockImplementation((msgs, toolCalls) => [
        ...msgs,
        { role: 'assistant' as const, tool_calls: toolCalls },
      ]);

      toolRegistry.list.mockReturnValue([
        {
          name: 'send_email',
          description: 'Send an email',
          parameters: { type: 'object', properties: {} },
        },
      ]);

      // First response: tool call
      const mockStream1 = (async function* () {
        yield {
          choices: [
            {
              delta: {
                tool_calls: [
                  {
                    index: 0,
                    id: 'call_123',
                    function: {
                      name: 'send_email',
                      arguments: '{"to":"user',
                    },
                  },
                ],
              },
              finish_reason: null,
            },
          ],
        } as any;
        yield {
          choices: [
            {
              delta: {
                tool_calls: [
                  {
                    index: 0,
                    function: {
                      arguments: '@example.com"}',
                    },
                  },
                ],
              },
              finish_reason: null,
            },
          ],
        } as any;
        yield {
          choices: [
            {
              delta: {},
              finish_reason: 'tool_calls',
            },
          ],
        } as any;
      })();

      // Second response: after tool execution
      const mockStream2 = (async function* () {
        yield {
          choices: [
            {
              delta: { content: 'Email sent successfully!' },
              finish_reason: null,
            },
          ],
        } as OpenAI.Chat.Completions.ChatCompletionChunk;
        yield {
          choices: [
            {
              delta: {},
              finish_reason: 'stop',
            },
          ],
        } as OpenAI.Chat.Completions.ChatCompletionChunk;
      })();

      aiService.streamChat
        .mockResolvedValueOnce(mockStream1)
        .mockResolvedValueOnce(mockStream2);

      toolExecutionStrategy.execute.mockResolvedValue({
        status: 'success',
        toolName: 'send_email',
        callId: 'call_123',
        result: { messageId: 'msg_456' },
      });

      const events = [];
      for await (const event of orchestrator.streamChat(request)) {
        events.push(event);
      }

      const toolStateEvents = events.filter((event) => event.event === 'tool.state');
      expect(toolStateEvents.length).toBeGreaterThan(0);
      expect(toolStateEvents.some((event) => event.data.status === 'succeeded')).toBe(true);

      const deltaEvents = events.filter((event) => event.event === 'agent.delta');
      expect(deltaEvents.length).toBeGreaterThan(0);
      expect(events[events.length - 1].event).toBe('agent.end');
    });

    it('should handle tool confirmation flow', async () => {
      const request: AgentChatRequest = {
        prompt: 'Delete all files',
        userId: 'user123',
      };

      const mockMessages = [
        { role: 'system' as const, content: 'You are helpful' },
        { role: 'user' as const, content: 'Delete all files' },
      ];

      contextBuilder.buildMessages.mockReturnValue(mockMessages);
      contextBuilder.appendAssistantToolCall.mockImplementation((msgs, toolCalls) => [
        ...msgs,
        { role: 'assistant' as const, tool_calls: toolCalls },
      ]);

      toolRegistry.list.mockReturnValue([
        {
          name: 'delete_files',
          description: 'Delete files',
          parameters: { type: 'object', properties: {} },
        },
      ]);

      const mockStream = (async function* () {
        yield {
          choices: [
            {
              delta: {
                tool_calls: [
                  {
                    index: 0,
                    id: 'call_delete',
                    function: {
                      name: 'delete_files',
                      arguments: '{}',
                    },
                  },
                ],
              },
              finish_reason: null,
            },
          ],
        } as any;
        yield {
          choices: [
            {
              delta: {},
              finish_reason: 'tool_calls',
            },
          ],
        } as any;
      })();

      aiService.streamChat.mockResolvedValue(mockStream);

      toolExecutionStrategy.execute.mockResolvedValue({
        status: 'requires_confirmation',
        toolName: 'delete_files',
        callId: 'call_delete',
        confirmationId: 'confirm_123',
      });

      const events = [];
      for await (const event of orchestrator.streamChat(request)) {
        events.push(event);
      }

      const awaitingEvent = events.find((event) => event.event === 'tool.state' && event.data.status === 'awaiting_input');
      expect(awaitingEvent).toBeDefined();
      const endEvent = events.find((event) => event.event === 'agent.end');
      expect(endEvent).toBeDefined();
      expect(endEvent?.data.status).toBe('cancelled');
    });

    it('should handle tool execution errors gracefully', async () => {
      const request: AgentChatRequest = {
        prompt: 'Send email',
      };

      const mockMessages = [
        { role: 'system' as const, content: 'You are helpful' },
        { role: 'user' as const, content: 'Send email' },
      ];

      contextBuilder.buildMessages.mockReturnValue(mockMessages);
      contextBuilder.appendAssistantToolCall.mockImplementation((msgs, toolCalls) => [
        ...msgs,
        { role: 'assistant' as const, tool_calls: toolCalls },
      ]);

      toolRegistry.list.mockReturnValue([
        {
          name: 'send_email',
          description: 'Send email',
          parameters: { type: 'object', properties: {} },
        },
      ]);

      // First response: tool call
      const mockStream1 = (async function* () {
        yield {
          choices: [
            {
              delta: {
                tool_calls: [
                  {
                    index: 0,
                    id: 'call_123',
                    function: {
                      name: 'send_email',
                      arguments: '{}',
                    },
                  },
                ],
              },
              finish_reason: null,
            },
          ],
        } as any;
        yield {
          choices: [
            {
              delta: {},
              finish_reason: 'tool_calls',
            },
          ],
        } as any;
      })();

      // Second response after error
      const mockStream2 = (async function* () {
        yield {
          choices: [
            {
              delta: { content: 'Sorry, there was an error.' },
              finish_reason: null,
            },
          ],
        } as OpenAI.Chat.Completions.ChatCompletionChunk;
        yield {
          choices: [
            {
              delta: {},
              finish_reason: 'stop',
            },
          ],
        } as OpenAI.Chat.Completions.ChatCompletionChunk;
      })();

      aiService.streamChat
        .mockResolvedValueOnce(mockStream1)
        .mockResolvedValueOnce(mockStream2);

      toolExecutionStrategy.execute.mockRejectedValue(new Error('Network error'));

      const events = [];
      for await (const event of orchestrator.streamChat(request)) {
        events.push(event);
      }

      const toolStateEvent = events.find((event) => event.event === 'tool.state' && event.data.status === 'failed');
      expect(toolStateEvent).toBeDefined();
      const endEvent = events.find((event) => event.event === 'agent.end');
      expect(endEvent).toBeDefined();
    });

    it('should stop after max tool iterations', async () => {
      const request: AgentChatRequest = {
        prompt: 'Do something',
      };

      const mockMessages = [
        { role: 'system' as const, content: 'You are helpful' },
        { role: 'user' as const, content: 'Do something' },
      ];

      contextBuilder.buildMessages.mockReturnValue(mockMessages);
      contextBuilder.appendAssistantToolCall.mockImplementation((msgs) => [...msgs]);

      toolRegistry.list.mockReturnValue([
        {
          name: 'infinite_tool',
          description: 'Infinite tool',
          parameters: { type: 'object', properties: {} },
        },
      ]);

      // Always return tool calls
      const mockStreamFactory = () => (async function* () {
        yield {
          choices: [
            {
              delta: {
                tool_calls: [
                  {
                    index: 0,
                    id: 'call_infinite',
                    function: {
                      name: 'infinite_tool',
                      arguments: '{}',
                    },
                  },
                ],
              },
              finish_reason: null,
            },
          ],
        } as any;
        yield {
          choices: [
            {
              delta: {},
              finish_reason: 'tool_calls',
            },
          ],
        } as any;
      })();

      aiService.streamChat.mockImplementation(() => Promise.resolve(mockStreamFactory()));

      toolExecutionStrategy.execute.mockResolvedValue({
        status: 'success',
        toolName: 'infinite_tool',
        callId: 'call_infinite',
        result: {},
      });

      const events = [];
      for await (const event of orchestrator.streamChat(request)) {
        events.push(event);
      }

      const errorEvent = events.find((event) => event.event === 'error');
      expect(errorEvent).toBeDefined();
      expect(errorEvent?.data.message).toContain('Maximum tool iterations');
    });
  });

  describe('continueWithConfirmation', () => {
    it('should continue execution after user approves', async () => {
      const request: AgentChatRequest = {
        prompt: 'Original request',
      };

      const currentMessages = [
        { role: 'user' as const, content: 'Delete files' },
        {
          role: 'assistant' as const,
          tool_calls: [
            {
              id: 'call_123',
              type: 'function' as const,
              function: { name: 'delete_files', arguments: '{}' },
            },
          ],
        },
      ];

      toolExecutionStrategy.resolveConfirmation.mockResolvedValue({
        status: 'success',
        toolName: 'delete_files',
        callId: 'call_123',
        result: { deleted: 5 },
      });

      contextBuilder.buildMessages.mockReturnValue([
        { role: 'system' as const, content: 'System' },
        ...currentMessages,
      ]);

      toolRegistry.list.mockReturnValue([]);

      const mockStream = (async function* () {
        yield {
          choices: [
            {
              delta: { content: 'Files deleted successfully' },
              finish_reason: null,
            },
          ],
        } as OpenAI.Chat.Completions.ChatCompletionChunk;
        yield {
          choices: [
            {
              delta: {},
              finish_reason: 'stop',
            },
          ],
        } as OpenAI.Chat.Completions.ChatCompletionChunk;
      })();

      aiService.streamChat.mockResolvedValue(mockStream);

      const events = [];
      for await (const event of orchestrator.continueWithConfirmation(
        'confirm_123',
        true,
        request,
        currentMessages
      )) {
        events.push(event);
      }

      expect(toolExecutionStrategy.resolveConfirmation).toHaveBeenCalledWith(
        'confirm_123',
        true
      );

      const toolStateEvent = events.find((event) => event.event === 'tool.state');
      expect(toolStateEvent).toBeDefined();

      const deltaEvents = events.filter((event) => event.event === 'agent.delta');
      expect(deltaEvents.length).toBeGreaterThan(0);
    });

    it('should handle user rejection', async () => {
      const request: AgentChatRequest = {
        prompt: 'Original request',
      };

      const currentMessages = [
        { role: 'user' as const, content: 'Delete files' },
      ];

      toolExecutionStrategy.resolveConfirmation.mockResolvedValue({
        status: 'denied',
        toolName: 'delete_files',
        callId: 'call_123',
        error: 'User rejected tool execution.',
      });

      const events = [];
      for await (const event of orchestrator.continueWithConfirmation(
        'confirm_123',
        false,
        request,
        currentMessages
      )) {
        events.push(event);
      }

      expect(toolExecutionStrategy.resolveConfirmation).toHaveBeenCalledWith(
        'confirm_123',
        false
      );

      const toolStateEvent = events.find((event) => event.event === 'tool.state');
      expect(toolStateEvent).toBeDefined();

      const endEvent = events.find((event) => event.event === 'agent.end');
      expect(endEvent).toBeDefined();
      expect(endEvent?.data.status).toBe('cancelled');
    });
  });
});
