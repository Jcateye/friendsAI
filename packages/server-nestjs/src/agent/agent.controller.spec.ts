import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { AgentController } from './agent.controller';
import { AgentRuntimeExecutor } from './runtime/agent-runtime-executor.service';
import { AgentOrchestrator } from './agent.orchestrator';
import { AgentMessageStore } from './agent-message.store';
import { AgentListService } from './agent-list.service';
import type { AgentChatRequest, AgentRunRequest, AgentRunResponse } from './agent.types';
import type { Request, Response } from 'express';
import { AgentDefinitionError, AgentDefinitionErrorCode } from './contracts/agent-definition-registry.interface';

describe('AgentController - POST /v1/agent/run', () => {
  let controller: AgentController;
  let mockRuntimeExecutor: jest.Mocked<AgentRuntimeExecutor>;
  let mockAgentOrchestrator: jest.Mocked<AgentOrchestrator>;
  let mockMessageStore: jest.Mocked<AgentMessageStore>;
  let mockAgentListService: jest.Mocked<AgentListService>;

  beforeEach(async () => {
    mockRuntimeExecutor = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<AgentRuntimeExecutor>;

    mockAgentOrchestrator = {
      streamChat: jest.fn(),
    } as unknown as jest.Mocked<AgentOrchestrator>;

    mockMessageStore = {
      buildKey: jest.fn().mockReturnValue('test-key'),
      listMessages: jest.fn().mockReturnValue([]),
    } as unknown as jest.Mocked<AgentMessageStore>;

    mockAgentListService = {
      getAgentList: jest.fn().mockResolvedValue({
        agents: [],
        total: 0,
      }),
    } as unknown as jest.Mocked<AgentListService>;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AgentController],
      providers: [
        { provide: AgentRuntimeExecutor, useValue: mockRuntimeExecutor },
        { provide: AgentOrchestrator, useValue: mockAgentOrchestrator },
        { provide: AgentMessageStore, useValue: mockMessageStore },
        { provide: AgentListService, useValue: mockAgentListService },
      ],
    }).compile();

    controller = module.get<AgentController>(AgentController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('title_summary Agent', () => {
    const validTitleSummaryRequest: AgentRunRequest = {
      agentId: 'title_summary',
      input: {
        conversationId: 'conv-123',
        messages: [
          { role: 'user', content: '今天天气真好' },
          { role: 'assistant', content: '是的，适合出去散步' },
          { role: 'user', content: '有什么建议吗？' },
        ],
        language: 'zh',
      },
      options: {
        useCache: true,
        forceRefresh: false,
      },
      conversationId: 'conv-123',
    };

    it('应该正确调用 title_summary Agent 并返回结果', async () => {
      const mockResult = {
        runId: 'run-abc-123',
        cached: false,
        snapshotId: 'snapshot-xyz',
        data: {
          title: '天气与散步建议',
          summary: '讨论了今天天气晴朗适合出门散步，并询问相关建议。',
        },
      };

      mockRuntimeExecutor.execute.mockResolvedValue(mockResult);

      const result = await controller.run({} as Request, validTitleSummaryRequest);

      // 验证调用参数
      expect(mockRuntimeExecutor.execute).toHaveBeenCalledWith(
        'title_summary',           // agentId
        undefined,                 // operation (未指定时为 undefined)
        expect.objectContaining({
          conversationId: 'conv-123',
          messages: expect.arrayContaining([
            expect.objectContaining({ role: 'user', content: '今天天气真好' }),
          ]),
          language: 'zh',
        }),
        expect.objectContaining({
          useCache: true,
          forceRefresh: false,
          conversationId: 'conv-123',
        })
      );

      // 验证响应格式
      expect(result).toMatchObject({
        runId: 'run-abc-123',
        agentId: 'title_summary',
        operation: null,  // 响应中 operation 为 null 而不是 undefined
        cached: false,
        snapshotId: 'snapshot-xyz',
        generatedAt: expect.any(String),
        generatedAtMs: expect.any(Number),
        data: {
          title: '天气与散步建议',
          summary: expect.any(String),
        },
      });
    });

    it('应该支持缓存命中', async () => {
      const mockResult = {
        runId: 'run-cached',
        cached: true,
        snapshotId: 'existing-snapshot',
        data: {
          title: '天气与散步建议',
          summary: '讨论了今天天气晴朗适合出门散步。',
        },
      };

      mockRuntimeExecutor.execute.mockResolvedValue(mockResult);

      const result = await controller.run({} as Request, validTitleSummaryRequest);

      expect(result.cached).toBe(true);
      expect(result.snapshotId).toBe('existing-snapshot');
    });

    it('应该处理不存在的 Agent ID', async () => {
      const notFoundError = new NotFoundException({
        code: 'agent_not_found',
        message: 'Agent definition not found: unknown_agent',
      });

      mockRuntimeExecutor.execute.mockRejectedValue(notFoundError);

      await expect(
        controller.run({} as Request, {
          agentId: 'unknown_agent' as any,
          input: {},
        })
      ).rejects.toThrow(NotFoundException);
    });

    it('应该处理验证失败的情况', async () => {
      const validationError = new AgentDefinitionError(
        AgentDefinitionErrorCode.OUTPUT_VALIDATION_FAILED,
        'Output does not match schema',
        'title_summary'
      );

      mockRuntimeExecutor.execute.mockRejectedValue(validationError);

      await expect(
        controller.run({} as Request, validTitleSummaryRequest)
      ).rejects.toThrow(NotFoundException);
    });

    it('应该处理缺少必需参数的情况', async () => {
      const invalidRequest: AgentRunRequest = {
        agentId: 'title_summary',
        input: {
          conversationId: 'conv-123',
          // 缺少 messages
        },
      };

      mockRuntimeExecutor.execute.mockImplementation(() => {
        throw new Error('messages is required');
      });

      await expect(
        controller.run({} as Request, invalidRequest)
      ).rejects.toThrow(NotFoundException);
    });

    it('应该支持强制刷新缓存', async () => {
      const mockResult = {
        runId: 'run-refreshed',
        cached: false,
        data: {
          title: '新标题',
          summary: '新摘要',
        },
      };

      mockRuntimeExecutor.execute.mockResolvedValue(mockResult);

      const requestWithForceRefresh: AgentRunRequest = {
        ...validTitleSummaryRequest,
        options: {
          useCache: false,
          forceRefresh: true,
        },
      };

      const result = await controller.run({} as Request, requestWithForceRefresh);

      // 验证 forceRefresh 参数传递正确（第4个参数）
      const lastCall = mockRuntimeExecutor.execute.mock.calls[0];
      expect(lastCall[3].forceRefresh).toBe(true);

      expect(result.cached).toBe(false);
    });

    it('应该支持英文输出', async () => {
      const mockResult = {
        runId: 'run-english',
        cached: false,
        data: {
          title: 'Weather and Walking Suggestions',
          summary: 'Discussed the sunny weather and asked for outdoor activity recommendations.',
        },
      };

      mockRuntimeExecutor.execute.mockResolvedValue(mockResult);

      const englishRequest: AgentRunRequest = {
        ...validTitleSummaryRequest,
        input: {
          ...validTitleSummaryRequest.input,
          language: 'en',
        },
      };

      const result = await controller.run({} as Request, englishRequest);

      // 验证 language 参数在 input（第3个参数）中
      const lastCall = mockRuntimeExecutor.execute.mock.calls[0];
      expect(lastCall[2].language).toBe('en');

      expect(result.data.title).toBe('Weather and Walking Suggestions');
    });

    it('应该从请求中获取 userId', async () => {
      const mockResult = {
        runId: 'run-with-user',
        cached: false,
        data: { title: 'Test', summary: 'Test' },
      };

      mockRuntimeExecutor.execute.mockResolvedValue(mockResult);

      const requestWithUser: AgentRunRequest = {
        ...validTitleSummaryRequest,
        userId: 'user-123',
      };

      await controller.run({} as Request, requestWithUser);

      // 第四个参数 options 包含 userId
      const lastCall = mockRuntimeExecutor.execute.mock.calls[0];
      expect(lastCall[3].userId).toBe('user-123');
    });

    it('应该支持从 req.user 获取 userId（认证场景）', async () => {
      const mockResult = {
        runId: 'run-auth',
        cached: false,
        data: { title: 'Test', summary: 'Test' },
      };

      mockRuntimeExecutor.execute.mockResolvedValue(mockResult);

      const mockReq = {
        user: { id: 'auth-user-456' },
      } as unknown as Request;

      await controller.run(mockReq, validTitleSummaryRequest);

      // 第四个参数 options 包含从 req.user 获取的 userId
      const lastCall = mockRuntimeExecutor.execute.mock.calls[0];
      expect(lastCall[3].userId).toBe('auth-user-456');
    });
  });

  describe('其他 Agent 类型', () => {
    it('应该支持 contact_insight Agent', async () => {
      const contactInsightRequest: AgentRunRequest = {
        agentId: 'contact_insight',
        input: {
          contactId: 'contact-123',
          userId: 'user-123',
          depth: 'standard',
        },
        conversationId: 'conv-123',
      };

      const mockResult = {
        runId: 'run-contact',
        cached: false,
        data: {
          profileSummary: '测试用户简介',
          relationshipSignals: [],
          opportunities: [],
          risks: [],
          suggestedActions: [],
          openingLines: [],
          citations: [],
        },
      };

      mockRuntimeExecutor.execute.mockResolvedValue(mockResult);

      const result = await controller.run({} as Request, contactInsightRequest);

      expect(result.agentId).toBe('contact_insight');
      const lastCall = mockRuntimeExecutor.execute.mock.calls[0];
      expect(lastCall[0]).toBe('contact_insight');
      expect(lastCall[2]).toMatchObject({
        contactId: 'contact-123',
        userId: 'user-123',
        depth: 'standard',
      });
    });

    it('应该支持 archive_brief Agent with operation', async () => {
      const archiveBriefRequest: AgentRunRequest = {
        agentId: 'archive_brief',
        operation: 'brief_generate',
        input: {
          contactId: 'contact-123',
          name: '张三',
        },
        conversationId: 'conv-123',
      };

      const mockResult = {
        runId: 'run-archive',
        cached: false,
        data: {
          operation: 'brief_generate',
          id: 'brief-123',
          contact_id: 'contact-123',
          content: '简报内容',
          generated_at: new Date().toISOString(),
          source_hash: 'hash-123',
        },
      };

      mockRuntimeExecutor.execute.mockResolvedValue(mockResult);

      const result = await controller.run({} as Request, archiveBriefRequest);

      expect(result.agentId).toBe('archive_brief');
      expect(result.operation).toBe('brief_generate');
      expect(mockRuntimeExecutor.execute).toHaveBeenCalledWith(
        'archive_brief',
        'brief_generate',
        expect.any(Object),
        expect.any(Object)
      );
    });
  });

  describe('chat context sanitization', () => {
    it('should sanitize composer context before passing request to orchestrator', async () => {
      mockAgentOrchestrator.streamChat.mockReturnValue((async function* () {
        yield {
          event: 'agent.end',
          data: {
            runId: 'run-chat-1',
            status: 'succeeded',
            finishedAt: new Date('2026-02-15T10:00:00.000Z').toISOString(),
          },
        } as any;
      })());

      const mockReq = {
        user: { id: 'req-user-001' },
        on: jest.fn(),
        off: jest.fn(),
      } as unknown as Request;

      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
        setHeader: jest.fn(),
        flushHeaders: jest.fn(),
        write: jest.fn().mockReturnValue(true),
        end: jest.fn(),
        writableEnded: false,
      } as unknown as Response;

      const requestBody: AgentChatRequest = {
        prompt: 'hello',
        userId: 'body-user-001',
        context: {
          composer: {
            enabledTools: [' feishu_send_template_message ', '', 123 as any, 'x'.repeat(200)],
            attachments: [
              {
                name: ' meeting-notes.pdf ',
                mimeType: ' application/pdf ',
                size: 24.4,
                kind: 'file',
                ignored: 'field',
              },
              {
                name: '',
                kind: 'image',
              },
            ],
            feishuEnabled: true,
            inputMode: 'voice',
            ignored: 'composer-field',
          },
          veryLongText: 'a'.repeat(1000),
        } as any,
      };

      await controller.chat(mockReq, mockRes, requestBody, 'sse');

      expect(mockAgentOrchestrator.streamChat).toHaveBeenCalledTimes(1);
      const forwardedRequest = mockAgentOrchestrator.streamChat.mock.calls[0][0];

      expect(forwardedRequest.userId).toBe('req-user-001');
      expect(forwardedRequest.context?.composer).toEqual({
        enabledTools: ['feishu_send_template_message', 'x'.repeat(64)],
        attachments: [
          {
            name: 'meeting-notes.pdf',
            mimeType: 'application/pdf',
            size: 24,
            kind: 'file',
          },
        ],
        feishuEnabled: true,
        inputMode: 'voice',
      });
      expect(typeof (forwardedRequest.context as any).veryLongText).toBe('string');
      expect(((forwardedRequest.context as any).veryLongText as string).length).toBeLessThanOrEqual(500);
    });
  });
});
