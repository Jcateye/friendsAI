import { Test, TestingModule } from '@nestjs/testing';
import type { Request, Response } from 'express';
import { AgentController } from './agent.controller';
import { EngineRouter } from './engines/engine.router';
import { AgentMessageStore } from './agent-message.store';
import { AgentListService } from './agent-list.service';
import { AgentRunMetricsService } from '../action-tracking/agent-run-metrics.service';
import { SkillsService } from '../skills/skills.service';
import { MessagesService } from '../conversations/messages.service';
import { ShanjiExtractorService } from '../skills/shanji/shanji-extractor.service';

describe('AgentController - Shanji skill direct execution', () => {
  const envBackup = {
    SKILL_INPUT_PARSER_ENABLED: process.env.SKILL_INPUT_PARSER_ENABLED,
    SKILL_PARSER_EXECUTE_MODE: process.env.SKILL_PARSER_EXECUTE_MODE,
  };

  let controller: AgentController;
  let mockEngineRouter: jest.Mocked<EngineRouter>;
  let mockSkillsService: jest.Mocked<SkillsService>;
  let mockMessagesService: jest.Mocked<MessagesService>;
  let mockShanjiExtractorService: jest.Mocked<ShanjiExtractorService>;

  beforeEach(async () => {
    process.env.SKILL_INPUT_PARSER_ENABLED = 'true';
    process.env.SKILL_PARSER_EXECUTE_MODE = 'enforce';

    mockEngineRouter = {
      run: jest.fn(),
      streamChat: jest.fn(),
    } as unknown as jest.Mocked<EngineRouter>;

    mockSkillsService = {
      parseInvocationFromChat: jest.fn().mockResolvedValue({
        matched: true,
        status: 'parsed',
        skillKey: 'dingtalk_shanji',
        operation: 'extract',
        args: {
          url: 'https://shanji.dingtalk.com/app/transcribes/demo',
          meetingAgentToken:
            'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ0ZXN0In0.signature',
        },
        source: 'natural_language',
        confidence: 1,
        traceId: 'trace-1',
        warnings: [],
        execution: {
          agentId: 'dingtalk_shanji',
          operation: 'extract',
          input: {
            url: 'https://shanji.dingtalk.com/app/transcribes/demo',
            meetingAgentToken:
              'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ0ZXN0In0.signature',
          },
        },
      }),
    } as unknown as jest.Mocked<SkillsService>;

    mockMessagesService = {
      appendMessage: jest.fn().mockResolvedValue({
        id: 'msg-1',
      }),
    } as unknown as jest.Mocked<MessagesService>;

    mockShanjiExtractorService = {
      extractFromUrl: jest.fn().mockResolvedValue({
        sourceUrl: 'https://shanji.dingtalk.com/app/transcribes/demo',
        summary: '共提取 2 条记录。主要内容：客户希望下周二前给出报价。',
        keySnippets: ['客户希望下周二前给出报价。', '我们确认今天补充需求细节。'],
        audioUrl: 'https://example.com/audio/demo.m4a',
        transcriptText: '客户希望下周二前给出报价。\n我们确认今天补充需求细节。',
        transcriptSegments: [
          { index: 1, text: '客户希望下周二前给出报价。' },
          { index: 2, text: '我们确认今天补充需求细节。' },
        ],
        fetchMode: 'playwright',
        fetchedAt: new Date().toISOString(),
      }),
    } as unknown as jest.Mocked<ShanjiExtractorService>;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AgentController],
      providers: [
        { provide: EngineRouter, useValue: mockEngineRouter },
        {
          provide: AgentMessageStore,
          useValue: {
            buildKey: jest.fn(),
            listMessages: jest.fn().mockReturnValue([]),
          },
        },
        { provide: AgentListService, useValue: { getAgentList: jest.fn() } },
        {
          provide: AgentRunMetricsService,
          useValue: { recordRun: jest.fn().mockResolvedValue(undefined) },
        },
        { provide: SkillsService, useValue: mockSkillsService },
        { provide: MessagesService, useValue: mockMessagesService },
        { provide: ShanjiExtractorService, useValue: mockShanjiExtractorService },
      ],
    }).compile();

    controller = module.get(AgentController);
  });

  afterEach(() => {
    process.env.SKILL_INPUT_PARSER_ENABLED = envBackup.SKILL_INPUT_PARSER_ENABLED;
    process.env.SKILL_PARSER_EXECUTE_MODE = envBackup.SKILL_PARSER_EXECUTE_MODE;
    jest.clearAllMocks();
  });

  it('should execute shanji skill directly and persist assistant message with metadata', async () => {
    const req = {
      user: { id: 'user-1' },
      on: jest.fn(),
      off: jest.fn(),
    } as unknown as Request;

    const writes: string[] = [];
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      setHeader: jest.fn(),
      flushHeaders: jest.fn(),
      write: jest.fn().mockImplementation((chunk: string) => {
        writes.push(chunk);
        return true;
      }),
      end: jest.fn(),
      writableEnded: false,
    } as unknown as Response;

    await controller.chat(
      req,
      res,
      {
        prompt:
          '请帮我解析这个闪记 https://shanji.dingtalk.com/app/transcribes/demo',
        conversationId: 'conv-1',
      },
      'sse',
    );

    expect(mockSkillsService.parseInvocationFromChat).toHaveBeenCalledTimes(1);
    expect(mockShanjiExtractorService.extractFromUrl).toHaveBeenCalledWith({
      url: 'https://shanji.dingtalk.com/app/transcribes/demo',
      meetingAgentToken:
        'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ0ZXN0In0.signature',
    });
    expect(mockEngineRouter.streamChat).not.toHaveBeenCalled();
    expect(mockMessagesService.appendMessage).toHaveBeenCalledWith(
      'conv-1',
      expect.objectContaining({
        role: 'assistant',
        content: expect.stringContaining('已解析钉钉闪记链接'),
        metadata: expect.objectContaining({
          shanji: expect.objectContaining({
            sourceUrl: 'https://shanji.dingtalk.com/app/transcribes/demo',
            audioUrl: 'https://example.com/audio/demo.m4a',
          }),
        }),
      }),
    );
    expect(writes.join('\n')).toContain('已解析钉钉闪记链接');
  });
});
