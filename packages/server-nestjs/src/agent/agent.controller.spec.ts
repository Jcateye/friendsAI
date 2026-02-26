import { Test, TestingModule } from '@nestjs/testing';
import { HttpException } from '@nestjs/common';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { AgentController } from './agent.controller';
import { EngineRouter } from './engines/engine.router';
import { AgentMessageStore } from './agent-message.store';
import { AgentListService } from './agent-list.service';
import { AgentRunMetricsService } from '../action-tracking/agent-run-metrics.service';
import type { AgentChatRequest, AgentRunRequest, AgentRunResponse } from './agent.types';
import type { Request, Response } from 'express';
import { AgentRuntimeError } from './errors/agent-runtime.error';

describe('AgentController - POST /v1/agent/run', () => {
  let controller: AgentController;
  let mockEngineRouter: jest.Mocked<EngineRouter>;
  let mockMessageStore: jest.Mocked<AgentMessageStore>;
  let mockAgentListService: jest.Mocked<AgentListService>;
  let mockAgentRunMetricsService: jest.Mocked<AgentRunMetricsService>;

  beforeEach(async () => {
    mockEngineRouter = {
      run: jest.fn(),
      streamChat: jest.fn(),
    } as unknown as jest.Mocked<EngineRouter>;

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

    mockAgentRunMetricsService = {
      recordRun: jest.fn().mockResolvedValue(undefined),
      getMetrics: jest.fn(),
    } as unknown as jest.Mocked<AgentRunMetricsService>;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AgentController],
      providers: [
        { provide: EngineRouter, useValue: mockEngineRouter },
        { provide: AgentMessageStore, useValue: mockMessageStore },
        { provide: AgentListService, useValue: mockAgentListService },
        { provide: AgentRunMetricsService, useValue: mockAgentRunMetricsService },
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

      mockEngineRouter.run.mockResolvedValue(mockResult);

      const result = await controller.run({} as Request, validTitleSummaryRequest);

      // 验证调用参数
      expect(mockEngineRouter.run).toHaveBeenCalledWith(
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

      mockEngineRouter.run.mockResolvedValue(mockResult);

      const result = await controller.run({} as Request, validTitleSummaryRequest);

      expect(result.cached).toBe(true);
      expect(result.snapshotId).toBe('existing-snapshot');
    });

    it('应该处理不存在的 Agent ID', async () => {
      const notFoundError = new AgentRuntimeError(
        {
          code: 'agent_not_found',
          message: 'Agent definition not found: unknown_agent',
          statusCode: 404,
          retryable: false,
        },
      );

      mockEngineRouter.run.mockRejectedValue(notFoundError);

      await expect(controller.run({} as Request, {
        agentId: 'unknown_agent' as any,
        input: {},
      })).rejects.toThrow(HttpException);

      await controller.run({} as Request, {
        agentId: 'unknown_agent' as any,
        input: {},
      }).catch((error) => {
        expect(error).toBeInstanceOf(HttpException);
        expect(error.getStatus()).toBe(404);
        expect(error.getResponse()).toMatchObject({
          code: 'agent_not_found',
          message: 'Agent definition not found: unknown_agent',
        });
      });
    });

    it('应该处理验证失败的情况', async () => {
      const validationError = new AgentRuntimeError(
        {
          code: 'output_validation_failed',
          message: 'Output does not match schema',
          statusCode: 400,
          retryable: false,
        },
      );

      mockEngineRouter.run.mockRejectedValue(validationError);

      await expect(controller.run({} as Request, validTitleSummaryRequest)).rejects.toThrow(
        HttpException,
      );

      await controller.run({} as Request, validTitleSummaryRequest).catch((error) => {
        expect(error).toBeInstanceOf(HttpException);
        expect(error.getStatus()).toBe(400);
        expect(error.getResponse()).toMatchObject({
          code: 'output_validation_failed',
          message: 'Output does not match schema',
        });
      });
    });

    it('应该处理缺少必需参数的情况', async () => {
      const invalidRequest: AgentRunRequest = {
        agentId: 'title_summary',
        input: {
          conversationId: 'conv-123',
          // 缺少 messages
        },
      };

      mockEngineRouter.run.mockImplementation(() => {
        throw new AgentRuntimeError({
          code: 'invalid_agent_input',
          message: 'messages is required',
          statusCode: 400,
          retryable: false,
        });
      });

      await expect(controller.run({} as Request, invalidRequest)).rejects.toThrow(HttpException);

      await controller.run({} as Request, invalidRequest).catch((error) => {
        expect(error).toBeInstanceOf(HttpException);
        expect(error.getStatus()).toBe(400);
        expect(error.getResponse()).toMatchObject({
          code: 'invalid_agent_input',
          message: 'messages is required',
        });
      });
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

      mockEngineRouter.run.mockResolvedValue(mockResult);

      const requestWithForceRefresh: AgentRunRequest = {
        ...validTitleSummaryRequest,
        options: {
          useCache: false,
          forceRefresh: true,
        },
      };

      const result = await controller.run({} as Request, requestWithForceRefresh);

      // 验证 forceRefresh 参数传递正确（第4个参数）
      const lastCall = mockEngineRouter.run.mock.calls[0];
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

      mockEngineRouter.run.mockResolvedValue(mockResult);

      const englishRequest: AgentRunRequest = {
        ...validTitleSummaryRequest,
        input: {
          ...validTitleSummaryRequest.input,
          language: 'en',
        },
      };

      const result = await controller.run({} as Request, englishRequest);

      // 验证 language 参数在 input（第3个参数）中
      const lastCall = mockEngineRouter.run.mock.calls[0];
      expect(lastCall[2].language).toBe('en');

      expect(result.data.title).toBe('Weather and Walking Suggestions');
    });

    it('应该从请求中获取 userId', async () => {
      const mockResult = {
        runId: 'run-with-user',
        cached: false,
        data: { title: 'Test', summary: 'Test' },
      };

      mockEngineRouter.run.mockResolvedValue(mockResult);

      const requestWithUser: AgentRunRequest = {
        ...validTitleSummaryRequest,
        userId: 'user-123',
      };

      await controller.run({} as Request, requestWithUser);

      // 第四个参数 options 包含 userId
      const lastCall = mockEngineRouter.run.mock.calls[0];
      expect(lastCall[3].userId).toBe('user-123');
    });

    it('应该支持从 req.user 获取 userId（认证场景）', async () => {
      const mockResult = {
        runId: 'run-auth',
        cached: false,
        data: { title: 'Test', summary: 'Test' },
      };

      mockEngineRouter.run.mockResolvedValue(mockResult);

      const mockReq = {
        user: { id: 'auth-user-456' },
      } as unknown as Request;

      await controller.run(mockReq, validTitleSummaryRequest);

      // 第四个参数 options 包含从 req.user 获取的 userId
      const lastCall = mockEngineRouter.run.mock.calls[0];
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

      mockEngineRouter.run.mockResolvedValue(mockResult);

      const result = await controller.run({} as Request, contactInsightRequest);

      expect(result.agentId).toBe('contact_insight');
      const lastCall = mockEngineRouter.run.mock.calls[0];
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

      mockEngineRouter.run.mockResolvedValue(mockResult);

      const result = await controller.run({} as Request, archiveBriefRequest);

      expect(result.agentId).toBe('archive_brief');
      expect(result.operation).toBe('brief_generate');
      expect(mockEngineRouter.run).toHaveBeenCalledWith(
        'archive_brief',
        'brief_generate',
        expect.any(Object),
        expect.any(Object)
      );
    });

    it('should reject legacy llm fields in /agent/run', async () => {
      const requestWithLegacyField = {
        agentId: 'title_summary',
        input: {
          conversationId: 'conv-123',
          messages: [{ role: 'user', content: 'hello' }],
        },
        model: 'gpt-4.1-mini',
      } as unknown as AgentRunRequest;

      await expect(controller.run({} as Request, requestWithLegacyField)).rejects.toThrow(HttpException);

      await controller.run({} as Request, requestWithLegacyField).catch((error) => {
        expect(error).toBeInstanceOf(HttpException);
        expect(error.getStatus()).toBe(400);
        expect(error.getResponse()).toMatchObject({
          code: 'invalid_llm_request',
        });
      });
      expect(mockEngineRouter.run).not.toHaveBeenCalled();
    });

    it('should pass normalized llm config to engine router in /agent/run', async () => {
      const requestWithLlm: AgentRunRequest = {
        agentId: 'title_summary',
        input: {
          conversationId: 'conv-123',
          messages: [{ role: 'user', content: 'hello' }],
        },
        llm: {
          provider: 'claude',
          model: 'claude-3-7-sonnet',
          providerOptions: {
            claude: {
              thinking: { type: 'enabled', budgetTokens: 256 },
            } as any,
          },
        },
      };

      mockEngineRouter.run.mockResolvedValue({
        runId: 'run-llm',
        cached: false,
        data: { title: 'ok', summary: 'ok' },
      });

      await controller.run({} as Request, requestWithLlm);

      expect(mockEngineRouter.run).toHaveBeenCalledWith(
        'title_summary',
        undefined,
        expect.any(Object),
        expect.objectContaining({
          llm: expect.objectContaining({
            provider: 'claude',
            model: 'claude-3-7-sonnet',
            providerOptions: {
              anthropic: {
                thinking: { type: 'enabled', budgetTokens: 256 },
              },
            },
          }),
        }),
      );
    });

    it('should resolve llm baseURL from catalog by providerKey in /agent/run', async () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'friendsai-llm-baseurl-'));
      const configPath = path.join(tmpDir, 'opencode.json');
      const previousCatalogPath = process.env.AGENT_LLM_CATALOG_PATH;

      try {
        fs.writeFileSync(
          configPath,
          JSON.stringify(
            {
              version: 1,
              defaultModel: 'zhipu_proxy/glm-4.5-air',
              providers: {
                zhipu_proxy: {
                  label: 'Zhipu Compatible',
                  sdkProvider: 'openai-compatible',
                  baseURL: 'https://zhipu-proxy.example/v1',
                  models: {
                    'glm-4.5-air': { label: 'GLM 4.5 Air' },
                  },
                },
              },
            },
            null,
            2,
          ),
          'utf8',
        );

        process.env.AGENT_LLM_CATALOG_PATH = configPath;

        mockEngineRouter.run.mockResolvedValue({
          runId: 'run-llm-baseurl',
          cached: false,
          data: { title: 'ok', summary: 'ok' },
        });

        await controller.run({} as Request, {
          agentId: 'title_summary',
          input: {
            conversationId: 'conv-123',
            messages: [{ role: 'user', content: 'hello' }],
          },
          llm: {
            provider: 'openai-compatible',
            providerKey: 'zhipu_proxy',
            model: 'glm-4.5-air',
          },
        });

        expect(mockEngineRouter.run).toHaveBeenCalledWith(
          'title_summary',
          undefined,
          expect.any(Object),
          expect.objectContaining({
            llm: expect.objectContaining({
              provider: 'openai-compatible',
              providerKey: 'zhipu_proxy',
              model: 'glm-4.5-air',
              baseURL: 'https://zhipu-proxy.example/v1',
            }),
          }),
        );
      } finally {
        process.env.AGENT_LLM_CATALOG_PATH = previousCatalogPath;
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    });
  });

  describe('chat context sanitization', () => {
    it('should sanitize composer context before passing request to orchestrator', async () => {
      mockEngineRouter.streamChat.mockReturnValue((async function* () {
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
            thinkingEnabled: true,
            inputMode: 'voice',
            ignored: 'composer-field',
          },
          veryLongText: 'a'.repeat(1000),
        } as any,
      };

      await controller.chat(mockReq, mockRes, requestBody, 'sse');

      expect(mockEngineRouter.streamChat).toHaveBeenCalledTimes(1);
      const forwardedRequest = mockEngineRouter.streamChat.mock.calls[0][0];

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
        thinkingEnabled: true,
        inputMode: 'voice',
      });
      expect(typeof (forwardedRequest.context as any).veryLongText).toBe('string');
      expect(((forwardedRequest.context as any).veryLongText as string).length).toBeLessThanOrEqual(500);
    });

    it('should inject thinking providerOptions for chat when composer thinking is enabled', async () => {
      mockEngineRouter.streamChat.mockReturnValue((async function* () {
        yield {
          event: 'agent.end',
          data: {
            runId: 'run-chat-thinking',
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
        context: {
          composer: {
            thinkingEnabled: true,
          },
        },
      };

      await controller.chat(mockReq, mockRes, requestBody, 'sse');

      const forwardedRequest = mockEngineRouter.streamChat.mock.calls[0][0];
      expect(forwardedRequest.llm).toMatchObject({
        providerOptions: {
          anthropic: {
            thinking: {
              type: 'enabled',
              budgetTokens: 1024,
            },
          },
          openaiCompatible: {
            reasoningEffort: 'high',
          },
        },
      });
    });

    it('should not override explicit thinking providerOptions from llm request', async () => {
      mockEngineRouter.streamChat.mockReturnValue((async function* () {
        yield {
          event: 'agent.end',
          data: {
            runId: 'run-chat-thinking-override',
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
        llm: {
          provider: 'claude',
          model: 'claude-3-7-sonnet',
          providerOptions: {
            anthropic: {
              thinking: {
                type: 'enabled',
                budgetTokens: 256,
              },
            },
            openaiCompatible: {
              reasoningEffort: 'medium',
            },
          },
        },
        context: {
          composer: {
            thinkingEnabled: true,
          },
        },
      };

      await controller.chat(mockReq, mockRes, requestBody, 'sse');

      const forwardedRequest = mockEngineRouter.streamChat.mock.calls[0][0];
      expect(forwardedRequest.llm).toMatchObject({
        provider: 'claude',
        model: 'claude-3-7-sonnet',
        providerOptions: {
          anthropic: {
            thinking: {
              type: 'enabled',
              budgetTokens: 256,
            },
          },
          openaiCompatible: {
            reasoningEffort: 'medium',
          },
        },
      });
    });
  });

  describe('llm catalog', () => {
    const envBackup = {
      AGENT_LLM_CATALOG_PATH: process.env.AGENT_LLM_CATALOG_PATH,
      LLM_PROVIDER: process.env.LLM_PROVIDER,
      LLM_MODEL: process.env.LLM_MODEL,
      LLM_MODELS_CLAUDE: process.env.LLM_MODELS_CLAUDE,
    };

    afterEach(() => {
      process.env.AGENT_LLM_CATALOG_PATH = envBackup.AGENT_LLM_CATALOG_PATH;
      process.env.LLM_PROVIDER = envBackup.LLM_PROVIDER;
      process.env.LLM_MODEL = envBackup.LLM_MODEL;
      process.env.LLM_MODELS_CLAUDE = envBackup.LLM_MODELS_CLAUDE;
    });

    it('should return env-based catalog when config file is unavailable', () => {
      process.env.AGENT_LLM_CATALOG_PATH = '/tmp/non-exist-opencode-config.json';
      process.env.LLM_PROVIDER = 'claude';
      process.env.LLM_MODEL = 'glm-4.7-flash';
      process.env.LLM_MODELS_CLAUDE = 'glm-4.7-flash, claude-3-5-haiku-latest';

      const catalog = controller.getLlmCatalog();

      expect(catalog.source).toBe('env');
      expect(catalog.defaultSelection).toEqual({
        key: 'claude',
        provider: 'claude',
        model: 'glm-4.7-flash',
      });
      expect(catalog.providers).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            key: 'claude',
            provider: 'claude',
            models: expect.arrayContaining([
              expect.objectContaining({ model: 'glm-4.7-flash' }),
              expect.objectContaining({ model: 'claude-3-5-haiku-latest' }),
            ]),
          }),
        ]),
      );
    });

    it('should parse catalog-style provider/model config', () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'friendsai-llm-catalog-'));
      const configPath = path.join(tmpDir, 'opencode.json');

      try {
        fs.writeFileSync(
          configPath,
          JSON.stringify(
            {
              version: 1,
              defaultModel: 'proxy/claude-sonnet-4-5-thinking',
              providers: {
                proxy: {
                  label: 'Proxy Anthropic',
                  sdkProvider: 'anthropic',
                  baseURL: 'https://proxy-anthropic.example/v1',
                  models: {
                    'claude-sonnet-4-5-thinking': {
                      label: 'Claude Sonnet 4.5 Thinking',
                      reasoning: true,
                      providerOptions: {
                        claude: {
                          thinking: {
                            type: 'enabled',
                            budgetTokens: 2048,
                          },
                        },
                      },
                    },
                  },
                },
                zhipu_proxy: {
                  label: 'Zhipu Compatible',
                  sdkProvider: 'openai-compatible',
                  baseURL: 'https://zhipu-proxy.example/v1',
                  models: {
                    'glm-4.5': {
                      label: 'GLM 4.5',
                    },
                  },
                },
              },
            },
            null,
            2,
          ),
          'utf8',
        );

        process.env.AGENT_LLM_CATALOG_PATH = configPath;
        delete process.env.LLM_PROVIDER;
        delete process.env.LLM_MODEL;

        const catalog = controller.getLlmCatalog();

        expect(catalog.source).toBe('opencode');
        expect(catalog.defaultSelection).toEqual({
          key: 'proxy',
          provider: 'claude',
          model: 'claude-sonnet-4-5-thinking',
        });
        expect(catalog.providers).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              key: 'proxy',
              provider: 'claude',
              baseURL: 'https://proxy-anthropic.example/v1',
              models: expect.arrayContaining([
                expect.objectContaining({
                  model: 'claude-sonnet-4-5-thinking',
                  reasoning: true,
                  providerOptions: {
                    anthropic: {
                      thinking: {
                        type: 'enabled',
                        budgetTokens: 2048,
                      },
                    },
                  },
                }),
              ]),
            }),
            expect.objectContaining({
              key: 'zhipu_proxy',
              provider: 'openai-compatible',
              baseURL: 'https://zhipu-proxy.example/v1',
              models: expect.arrayContaining([
                expect.objectContaining({
                  model: 'glm-4.5',
                }),
              ]),
            }),
          ]),
        );
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    });
  });
});
