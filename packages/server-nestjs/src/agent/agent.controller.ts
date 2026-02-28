import { Body, Controller, Get, HttpCode, HttpException, HttpStatus, Optional, Post, Query, Req, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { AgentMessageStore } from './agent-message.store';
import type {
  AgentChatContext,
  AgentChatRequest,
  AgentLlmCatalogModel,
  AgentLlmCatalogProvider,
  AgentLlmCatalogResponse,
  AgentComposerAttachment,
  AgentComposerContext,
  AgentRunRequest,
  AgentRunResponse,
  AgentStreamEvent,
} from './agent.types';
import type { AgentError, AgentRunEnd, AgentSseEvent, JsonValue, SkillStateUpdate } from './client-types';
import { VercelAiStreamAdapter } from './adapters/vercel-ai-stream.adapter';
import { AgentListService } from './agent-list.service';
import { AgentCatalogResponseDto, AgentListResponseDto } from './dto/agent-list.dto';
import { AgentRuntimeError } from './errors/agent-runtime.error';
import { AgentRunMetricsService } from '../action-tracking/agent-run-metrics.service';
import { generateUlid } from '../utils/ulid';
import { SkillsService } from '../skills/skills.service';
import { MessagesService } from '../conversations/messages.service';
import { extractMeetingAgentToken } from '../skills/shanji/meeting-token.util';
import { ShanjiExtractorService } from '../skills/shanji/shanji-extractor.service';
import { EngineRouter } from './engines/engine.router';
import { AgentLlmValidationError, findLegacyLlmFields, parseAgentLlmOrThrow } from './dto/agent-llm.schema';
import type { LlmCallSettings, LlmProviderName, LlmRequestConfig } from '../ai/providers/llm-types';

const CATALOG_PROVIDER_OPTIONS_KEY_ALIAS_MAP: Record<string, string> = {
  claude: 'anthropic',
  gemini: 'google',
  'openai-compatible': 'openaiCompatible',
  openai_compatible: 'openaiCompatible',
};

type ChatRequestMessage = NonNullable<AgentChatRequest['messages']>[number];

@ApiTags('Agent')
@ApiBearerAuth()
@Controller('agent')
export class AgentController {
  private readonly maxContextDepth = 3;
  private readonly maxContextArrayLength = 20;
  private readonly maxContextObjectKeys = 24;
  private readonly maxContextStringLength = 500;
  private readonly maxComposerTools = 12;
  private readonly maxComposerAttachments = 10;
  private readonly defaultThinkingBudgetTokens = (() => {
    const raw = Number.parseInt(process.env.AGENT_THINKING_BUDGET_TOKENS ?? '', 10);
    return Number.isFinite(raw) && raw > 0 ? raw : 1024;
  })();
  private readonly skillParserEnabled = process.env.SKILL_INPUT_PARSER_ENABLED === 'true';
  private readonly skillParserExecuteMode = process.env.SKILL_PARSER_EXECUTE_MODE ?? 'log-only';

  constructor(
    private readonly engineRouter: EngineRouter,
    private readonly messageStore: AgentMessageStore,
    private readonly agentListService: AgentListService,
    private readonly agentRunMetricsService: AgentRunMetricsService,
    @Optional()
    private readonly messagesService?: MessagesService,
    @Optional()
    private readonly skillsService?: SkillsService,
    @Optional()
    private readonly shanjiExtractorService?: ShanjiExtractorService,
  ) { }

  @Post('chat')
  @ApiOperation({
    summary: '与 Agent 进行对话（流式 / Vercel AI 适配）',
    description:
      '发起与多 Agent 协调的流式对话，请求体支持 messages（多轮聊天记录）或 prompt（单轮提示），二者至少提供其一；' +
      '通过 format 查询参数选择输出流格式：sse 时返回 text/event-stream 的 Agent 事件（agent.start / agent.delta / agent.message 等），' +
      'vercel-ai 时返回兼容 AI SDK v6 的 UI Message Stream（`data: {...}` + `data: [DONE]`）。常用于前端聊天框、打字机效果，以及需要实时看到工具调用进度的场景。',
  })
  @ApiQuery({
    name: 'format',
    required: false,
    description: '响应格式：sse（默认，EventSource）或 vercel-ai（AI SDK v6 UI Message Stream，header: x-vercel-ai-ui-message-stream: v1）',
    example: 'sse',
  })
  @HttpCode(200)
  async chat(
    @Req() req: Request,
    @Res() res: Response,
    @Body() body: AgentChatRequest,
    @Query('format') format: 'sse' | 'vercel-ai' = 'sse',
  ): Promise<void> {
    let normalizedLlm: LlmRequestConfig | undefined;
    try {
      normalizedLlm = this.validateAndNormalizeLlm(body);
    } catch (error) {
      const llmError = this.toLlmValidationError(error);
      if (llmError) {
        res.status(400).json(llmError);
        return;
      }
      throw error;
    }

    const streamStartedAt = Date.now();
    const resolvedUserId = (req.user as { id?: string } | undefined)?.id ?? body.userId;
    const hasMessages = Array.isArray(body?.messages) && body.messages.length > 0;
    const hasPrompt = typeof body?.prompt === 'string' && body.prompt.trim().length > 0;

    if (!hasMessages && !hasPrompt) {
      res.status(400).json({ message: 'Either "messages" or "prompt" must be provided.' });
      return;
    }

    res.status(200);

    // 根据 format 设置响应头
    if (format === 'vercel-ai') {
      res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
      res.setHeader('x-vercel-ai-ui-message-stream', 'v1');
    } else {
      res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    }

    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    // 根据 format 选择适配器
    const adapter = format === 'vercel-ai' ? new VercelAiStreamAdapter() : null;

    const abortController = new AbortController();
    const handleClose = () => abortController.abort();
    req.on('close', handleClose);

    let runCompleted = false;
    let runId: string | undefined;
    let streamStatus: 'succeeded' | 'failed' | 'cancelled' = 'failed';
    let streamErrorCode: string | null = null;
    const pingInterval = setInterval(() => {
      if (res.writableEnded) {
        return;
      }
      if (adapter) {
        this.writeKeepAlive(res);
        return;
      }
      this.writeEvent(res, {
        event: 'ping',
        data: { at: new Date().toISOString() },
      });
    }, 15000);

    try {
      const sanitizedContext = this.sanitizeChatContext(body.context);
      const effectiveLlm = this.applyComposerLlmOverrides(
        normalizedLlm,
        sanitizedContext?.composer,
      );
      const preparedRequest: AgentChatRequest = {
        ...body,
        context: sanitizedContext,
        userId: resolvedUserId,
        llm: effectiveLlm,
      };
      const enabledSkills = this.readEnabledSkills(
        preparedRequest.context?.composer && this.isRecord(preparedRequest.context.composer)
          ? (preparedRequest.context.composer as Record<string, unknown>)
          : undefined,
      );

      if (!this.skillParserEnabled && enabledSkills.length > 0) {
        console.warn(
          `[agent.chat] composer.enabledSkills was provided (${enabledSkills.join(', ')}), but SKILL_INPUT_PARSER_ENABLED is not true. Request will fall back to normal chat.`,
        );
      }

      if (this.skillParserEnabled && this.skillsService && resolvedUserId) {
        const parserText = this.buildSkillParserText(body);

        const parsedIntent = await this.skillsService.parseInvocationFromChat({
          tenantId: resolvedUserId,
          conversationId: body.conversationId,
          sessionId: body.sessionId,
          text: parserText,
          composer:
            preparedRequest.context?.composer && this.isRecord(preparedRequest.context.composer)
              ? (preparedRequest.context.composer as Record<string, unknown>)
              : undefined,
          agentScope: body.sessionId ?? body.conversationId ?? resolvedUserId,
        });

        if (parsedIntent) {
          preparedRequest.context = {
            ...(preparedRequest.context ?? {}),
            skillInvocation: parsedIntent,
          };

          if (
            this.skillParserExecuteMode === 'enforce' &&
            parsedIntent.matched &&
            parsedIntent.execution
          ) {
            const handled = await this.executeSkillIntentDirectly({
              res,
              format,
              runRequest: preparedRequest,
              userId: resolvedUserId,
              parsedIntent,
            });

            if (handled) {
              runCompleted = true;
              streamStatus = 'succeeded';
              runId = handled.runId;
              streamErrorCode = null;
              return;
            }
          }
        }
      }

      for await (const event of this.engineRouter.streamChat(preparedRequest, {
        signal: abortController.signal,
      })) {
        if (res.writableEnded) {
          break;
        }
        if (event.event === 'agent.start') {
          runId = event.data.runId;
        }
        if (event.event === 'agent.end') {
          runCompleted = true;
          streamStatus = event.data.status === 'cancelled' ? 'cancelled' : event.data.status === 'succeeded' ? 'succeeded' : 'failed';
          streamErrorCode = event.data.error?.code ?? null;
        }

        // 根据 format 选择写入方式
        if (adapter) {
          const transformed = adapter.transform(event);
          if (transformed) {
            res.write(transformed);
          }
        } else {
          this.writeEvent(res, event);
        }
      }
    } catch (error) {
      streamStatus = 'failed';
      streamErrorCode = 'stream_error';
      if (!res.writableEnded) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        const errorPayload: AgentError = {
          code: 'stream_error',
          message,
        };
        const errorEvent: AgentStreamEvent = { event: 'error', data: errorPayload };
        if (adapter) {
          const transformed = adapter.transform(errorEvent);
          if (transformed) {
            res.write(transformed);
          }
        } else {
          this.writeEvent(res, errorEvent);
        }
      }
    } finally {
      req.off('close', handleClose);
      clearInterval(pingInterval);
      if (!res.writableEnded) {
        if (!runCompleted && runId) {
          const endPayload: AgentRunEnd = {
            runId,
            status: 'failed',
            finishedAt: new Date().toISOString(),
            error: {
              code: 'stream_error',
              message: 'Stream terminated early.',
            },
          };
          streamStatus = 'failed';
          streamErrorCode = 'stream_error';
          const endEvent: AgentStreamEvent = { event: 'agent.end', data: endPayload };
          if (adapter) {
            const transformed = adapter.transform(endEvent);
            if (transformed) {
              res.write(transformed);
            }
          } else {
            this.writeEvent(res, endEvent);
          }
        }
        // Send [DONE] marker for v6 UI Message Stream Protocol
        if (adapter) {
          res.write(adapter.done());
        }
        res.end();
      }
      if (runId) {
        void this.agentRunMetricsService.recordRun({
          runId,
          userId: resolvedUserId ?? null,
          agentId: 'chat_conversation',
          operation: null,
          endpoint: 'chat',
          status: streamStatus,
          cached: false,
          durationMs: Date.now() - streamStartedAt,
          errorCode: streamStatus === 'succeeded' ? null : (streamErrorCode ?? 'stream_error'),
        });
      }
    }
  }

  @Post('run')
  @ApiOperation({
    summary: '直接执行某个 Agent 的一次 operation',
    description:
      '统一的「一次性」Agent 执行入口，面向非流式场景：调用方通过 agentId + operation + input 描述要执行的能力，' +
      '如生成对话标题摘要（title_summary）、联系人洞察（contact_insight）、归档提取与会前简报（archive_brief）等；' +
      'options.useCache / options.forceRefresh 控制是否命中缓存，响应中返回 runId、cached、snapshotId 以及各 Agent 自定义的 data 结果结构，' +
      '便于前端或后端任务编排直接消费 JSON 数据。',
  })
  @ApiResponse({
    status: 200,
    description: '执行成功，返回本次运行的结果、runId、是否命中缓存等信息',
  })
  @ApiResponse({
    status: 400,
    description: '输入不合法或输出校验失败',
  })
  @ApiResponse({
    status: 404,
    description: 'Agent 不存在',
  })
  @ApiResponse({
    status: 502,
    description: 'LLM Provider 调用失败',
  })
  @ApiResponse({
    status: 500,
    description: '服务内部错误',
  })
  @HttpCode(200)
  async run(
    @Req() req: Request,
    @Body() body: AgentRunRequest,
  ): Promise<AgentRunResponse> {
    const startedAt = Date.now();
    const userId = (req.user as { id?: string } | undefined)?.id ?? body.userId;

    try {
      const skillMismatch = await this.resolveRunSurfaceMismatch(body.agentId, userId);
      if (skillMismatch) {
        throw new HttpException(skillMismatch.body, skillMismatch.statusCode);
      }

      const normalizedLlm = this.validateAndNormalizeLlm(body);
      const result = await this.engineRouter.run(
        body.agentId,
        body.operation,
        body.input,
        {
          useCache: body.options?.useCache,
          forceRefresh: body.options?.forceRefresh,
          userId,
          conversationId: body.conversationId,
          sessionId: body.sessionId,
          intent: body.intent,
          relationshipMix: body.relationshipMix,
          timeBudgetMinutes: body.timeBudgetMinutes,
          llm: normalizedLlm,
        }
      );

      if (body.options?.persistMessage && body.conversationId) {
        const content = this.buildAgentRunSummary(
          body.agentId,
          body.operation ?? null,
          result.data,
          result.cached,
        );
        const metadata = {
          surface: 'agent_run',
          agentId: body.agentId,
          operation: body.operation ?? null,
          runId: result.runId,
          cached: result.cached,
          dataPreview: this.buildAgentRunPreview(result.data),
        } as Record<string, JsonValue>;
        await this.persistAssistantSkillMessage({
          conversationId: body.conversationId,
          userId,
          messageId: generateUlid(),
          content,
          createdAtMs: Date.now(),
          metadata,
        });
      }

      const now = new Date();
      void this.agentRunMetricsService.recordRun({
        runId: result.runId,
        userId: userId ?? null,
        agentId: body.agentId,
        operation: body.operation ?? null,
        endpoint: 'run',
        status: 'succeeded',
        cached: result.cached,
        durationMs: Date.now() - startedAt,
      });
      return {
        runId: result.runId,
        agentId: body.agentId,
        operation: body.operation ?? null,
        cached: result.cached,
        snapshotId: result.snapshotId,
        generatedAt: now.toISOString(),
        generatedAtMs: now.getTime(),
        data: result.data,
      };
    } catch (error) {
      const mapped = this.mapRunError(error);
      void this.agentRunMetricsService.recordRun({
        runId: generateUlid(),
        userId: userId ?? null,
        agentId: body.agentId,
        operation: body.operation ?? null,
        endpoint: 'run',
        status: 'failed',
        cached: false,
        durationMs: Date.now() - startedAt,
        errorCode: mapped.body.code,
      });
      throw new HttpException(mapped.body, mapped.statusCode);
    }
  }

  @Get('llm/catalog')
  @ApiOperation({
    summary: '获取聊天可选 LLM Provider/Model 目录',
    description:
      '返回前端可用于下拉选择的 provider/model 列表。优先读取项目 LLM catalog 配置（默认 ~/.config/opencode/opencode.json），' +
      '读取失败时回退到当前服务的环境变量默认值（LLM_PROVIDER/LLM_MODEL）。',
  })
  @ApiResponse({
    status: 200,
    description: '成功返回 LLM 目录信息',
  })
  getLlmCatalog(): AgentLlmCatalogResponse {
    return this.buildLlmCatalog();
  }

  @Get('llm/provider-models')
  @ApiOperation({
    summary: '获取 Provider 实时模型列表',
    description:
      '按 providerKey 从 llm catalog 读取 baseURL，并请求上游 `/v1beta/models` 返回实时模型清单。' +
      '用于在 Swagger 中快速查看网关当前可用模型。',
  })
  @ApiQuery({
    name: 'providerKey',
    required: false,
    description: 'Provider key（未传时使用 llm catalog 默认 provider）',
  })
  @ApiResponse({
    status: 200,
    description: '成功返回上游模型列表',
  })
  @ApiResponse({
    status: 400,
    description: 'providerKey 无效、未配置 baseURL 或未配置 API Key',
  })
  @ApiResponse({
    status: 502,
    description: '请求上游模型接口失败',
  })
  async getProviderModels(@Query('providerKey') providerKey?: string): Promise<{
    providerKey: string;
    provider: LlmProviderName;
    baseURL: string;
    endpoint: string;
    modelCount: number;
    models: Array<{
      name: string;
      displayName: string;
      inputTokenLimit: number | null;
      outputTokenLimit: number | null;
      reasoning: boolean;
    }>;
  }> {
    const catalog = this.buildLlmCatalog();
    const resolvedProviderKey =
      typeof providerKey === 'string' && providerKey.trim().length > 0
        ? providerKey.trim()
        : catalog.defaultSelection.key;

    const provider = catalog.providers.find((item) => item.key === resolvedProviderKey);
    if (!provider) {
      throw new HttpException(
        {
          code: 'llm_provider_not_found',
          message: `Provider key "${resolvedProviderKey}" is not configured in llm catalog.`,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    if (!provider.baseURL || provider.baseURL.trim().length === 0) {
      throw new HttpException(
        {
          code: 'llm_provider_baseurl_missing',
          message: `Provider "${resolvedProviderKey}" does not define baseURL in llm catalog.`,
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const apiKey = this.resolveProviderApiKeyByKey(resolvedProviderKey);
    if (!apiKey) {
      throw new HttpException(
        {
          code: 'llm_provider_api_key_missing',
          message: `Missing API key for provider "${resolvedProviderKey}". Please set AGENT_LLM_PROVIDER_${this.toProviderEnvToken(
            resolvedProviderKey,
          )}_API_KEY.`,
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const endpoint = this.buildProviderModelsEndpoint(provider.baseURL);

    let upstreamResponse: Awaited<ReturnType<typeof fetch>>;
    try {
      upstreamResponse = await fetch(endpoint, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      });
    } catch (error) {
      throw new HttpException(
        {
          code: 'llm_models_fetch_failed',
          message: `Failed to request upstream models endpoint: ${
            error instanceof Error ? error.message : String(error)
          }`,
        },
        HttpStatus.BAD_GATEWAY,
      );
    }

    if (!upstreamResponse.ok) {
      const errorText = await upstreamResponse.text().catch(() => '');
      throw new HttpException(
        {
          code: 'llm_models_fetch_failed',
          message: `Upstream models endpoint returned ${upstreamResponse.status}. ${errorText}`.trim(),
        },
        HttpStatus.BAD_GATEWAY,
      );
    }

    const payload = (await upstreamResponse.json().catch(() => ({}))) as unknown;
    const models = this.extractUpstreamModels(payload);

    return {
      providerKey: resolvedProviderKey,
      provider: provider.provider,
      baseURL: provider.baseURL,
      endpoint,
      modelCount: models.length,
      models,
    };
  }

  @Get('messages')
  @ApiOperation({
    summary: '获取某个会话/会话 Session 的 Agent 消息缓存',
    description:
      '按 userId + conversationId / sessionId 维度查询 Agent 消息历史，用于前端在刷新页面或网络重连后恢复对话上下文；' +
      '当存在鉴权中间件时，userId 默认取自登录用户，也可通过查询参数显式指定。通常在使用 /agent/chat 建立流式对话后，' +
      '配合本接口在页面初始化阶段拉取最近一段 Agent 消息，用于填充聊天记录列表或调试 Agent 行为。',
  })
  @ApiQuery({
    name: 'conversationId',
    required: false,
    description: '会话 ID；与 sessionId 二选一，如果都不传则取当前用户下的默认 key',
  })
  @ApiQuery({
    name: 'sessionId',
    required: false,
    description: '临时会话 Session ID；与 conversationId 二选一',
  })
  @ApiQuery({
    name: 'userId',
    required: false,
    description: '用户 ID；默认从请求上下文中解析',
  })
  getMessages(
    @Req() req: Request,
    @Query('conversationId') conversationId?: string,
    @Query('sessionId') sessionId?: string,
    @Query('userId') userId?: string,
  ) {
    const resolvedUserId = userId ?? (req.user as { id?: string } | undefined)?.id;
    const key = this.messageStore.buildKey(resolvedUserId, conversationId ?? sessionId);
    return this.messageStore.listMessages(key);
  }

  @Get('list')
  @ApiOperation({
    summary: '获取所有 Agent 列表',
    description:
      '返回当前服务中已注册且对外可用的所有 Agent 的列表，每个 Agent 包含基础标识、能力说明、默认配置等元信息；' +
      '可用于前端渲染「Agent 名片」选择器，或在后台管理界面中展示系统内置能力，让调用方在不知道具体实现细节的前提下，' +
      '按业务场景选择合适的 Agent 进行调用。',
  })
  @ApiResponse({
    status: 200,
    description: '成功返回 Agent 列表',
    type: AgentListResponseDto,
  })
  async getAgentList(@Req() req: Request): Promise<AgentListResponseDto> {
    void req;
    return this.agentListService.getAgentList();
  }

  @Get('catalog')
  @ApiOperation({
    summary: '获取 Chat 可直达的系统级 Agent catalog',
    description: '返回聊天输入区中的系统级 Agent 分组数据，不包含聊天 skill。',
  })
  @ApiQuery({
    name: 'surface',
    required: false,
    description: '当前入口 surface；仅支持 chat，未传默认按 chat 处理',
  })
  @ApiResponse({
    status: 200,
    description: '成功返回聊天内 Agent catalog',
    type: AgentCatalogResponseDto,
  })
  getAgentCatalog(
    @Query('surface') surface: 'chat' | string = 'chat',
  ): AgentCatalogResponseDto {
    void surface;
    return this.agentListService.getChatCatalog();
  }

  private buildProviderModelsEndpoint(baseURL: string): string {
    const normalized = baseURL.trim();
    if (!normalized) {
      return '/v1beta/models';
    }

    try {
      const url = new URL('/v1beta/models', normalized.endsWith('/') ? normalized : `${normalized}/`);
      return url.toString();
    } catch {
      return `${normalized.replace(/\/$/, '')}/v1beta/models`;
    }
  }

  private resolveProviderApiKeyByKey(providerKey: string): string | undefined {
    const envToken = this.toProviderEnvToken(providerKey);
    const value =
      process.env[`AGENT_LLM_PROVIDER_${envToken}_API_KEY`] ??
      process.env[`LLM_PROVIDER_${envToken}_API_KEY`];
    if (typeof value !== 'string') {
      return undefined;
    }
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }

  private toProviderEnvToken(providerKey: string): string {
    return providerKey
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 120);
  }

  private extractUpstreamModels(payload: unknown): Array<{
    name: string;
    displayName: string;
    inputTokenLimit: number | null;
    outputTokenLimit: number | null;
    reasoning: boolean;
  }> {
    if (!this.isRecord(payload) || !Array.isArray(payload.models)) {
      return [];
    }

    const models = payload.models
      .map((item) => {
        if (!this.isRecord(item) || typeof item.name !== 'string') {
          return null;
        }

        const name = item.name.trim();
        if (!name) {
          return null;
        }

        const displayName =
          typeof item.displayName === 'string' && item.displayName.trim().length > 0
            ? item.displayName.trim()
            : name;

        const inputTokenLimit =
          typeof item.inputTokenLimit === 'number' && Number.isFinite(item.inputTokenLimit)
            ? item.inputTokenLimit
            : null;
        const outputTokenLimit =
          typeof item.outputTokenLimit === 'number' && Number.isFinite(item.outputTokenLimit)
            ? item.outputTokenLimit
            : null;
        const reasoning =
          (this.isRecord(item.thinking) && Object.keys(item.thinking).length > 0) ||
          item.thinking === true ||
          name.toLowerCase().includes('thinking');

        return {
          name,
          displayName,
          inputTokenLimit,
          outputTokenLimit,
          reasoning,
        };
      })
      .filter(
        (
          item,
        ): item is {
          name: string;
          displayName: string;
          inputTokenLimit: number | null;
          outputTokenLimit: number | null;
          reasoning: boolean;
        } => item !== null,
      )
      .sort((a, b) => a.name.localeCompare(b.name));

    return models;
  }

  private writeEvent(res: Response, event: AgentStreamEvent | AgentSseEvent): void {
    res.write(`event: ${event.event}\n`);
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  }

  private writeKeepAlive(res: Response): void {
    res.write(`: ping ${new Date().toISOString()}\n\n`);
  }

  private extractLatestUserText(messages?: AgentChatRequest['messages']): string | undefined {
    if (!Array.isArray(messages)) {
      return undefined;
    }
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      const message = messages[index];
      if (message?.role !== 'user') {
        continue;
      }
      if (typeof message.content === 'string' && message.content.trim().length > 0) {
        return message.content;
      }
      if (Array.isArray(message.content)) {
        const text = message.content
          .map((part) => {
            if (typeof part === 'string') {
              return part;
            }
            if (part && typeof part === 'object' && 'text' in part && typeof (part as any).text === 'string') {
              return String((part as any).text);
            }
            return '';
          })
          .join(' ')
          .trim();
        if (text.length > 0) {
          return text;
        }
      }
    }
    return undefined;
  }

  private buildSkillParserText(body: AgentChatRequest): string | undefined {
    const latestUserText =
      typeof body.prompt === 'string' && body.prompt.trim().length > 0
        ? body.prompt.trim()
        : this.extractLatestUserText(body.messages)?.trim();

    if (!latestUserText && !Array.isArray(body.messages)) {
      return undefined;
    }

    const contextLines = this.extractRecentSkillContextLines(body.messages, latestUserText);
    const parts = [latestUserText, ...contextLines].filter(
      (value): value is string => typeof value === 'string' && value.trim().length > 0,
    );

    if (parts.length === 0) {
      return undefined;
    }

    return parts.join('\n\n');
  }

  private extractRecentSkillContextLines(
    messages: AgentChatRequest['messages'] | undefined,
    latestUserText: string | undefined,
  ): string[] {
    if (!Array.isArray(messages) || messages.length === 0) {
      return [];
    }

    const recentMessages = messages.slice(-8);
    const latestShanjiUrl = this.findLatestTextMatch(
      recentMessages,
      /https?:\/\/shanji\.dingtalk\.com\/app\/transcribes\/[A-Za-z0-9_%\-]+/gi,
    );
    const latestMeetingToken = this.findLatestMeetingAgentToken(recentMessages);

    const lines: string[] = [];
    if (
      latestShanjiUrl &&
      !(latestUserText ?? '').includes(latestShanjiUrl)
    ) {
      lines.push(`Referenced Shanji URL: ${latestShanjiUrl}`);
    }

    if (
      latestMeetingToken &&
      !(latestUserText ?? '').includes(latestMeetingToken)
    ) {
      lines.push(`dt-meeting-agent-token\n${latestMeetingToken}`);
    }

    const recentUserMessages = recentMessages
      .filter((message) => message?.role === 'user')
      .map((message) => this.extractMessageText(message))
      .filter((content): content is string => Boolean(content))
      .filter((content) => content !== latestUserText)
      .slice(-3);

    if (recentUserMessages.length > 0) {
      lines.push(
        `Recent user context:\n${recentUserMessages
          .map((content) => `- ${content.slice(0, 300)}`)
          .join('\n')}`,
      );
    }

    return lines;
  }

  private findLatestMeetingAgentToken(messages: ChatRequestMessage[]): string | undefined {
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      const content = this.extractMessageText(messages[index]);
      const candidate = extractMeetingAgentToken(content);
      if (candidate) {
        return candidate;
      }
    }

    return undefined;
  }

  private findLatestTextMatch(
    messages: ChatRequestMessage[],
    pattern: RegExp,
    projector?: (match: RegExpExecArray) => string | null,
  ): string | undefined {
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      const message = messages[index];
      const content = this.extractMessageText(message);
      if (!content) {
        continue;
      }

      const matches = Array.from(content.matchAll(pattern));
      if (matches.length === 0) {
        continue;
      }

      for (let matchIndex = matches.length - 1; matchIndex >= 0; matchIndex -= 1) {
        const match = matches[matchIndex];
        const projected = projector ? projector(match) : match[0];
        if (projected && projected.trim().length > 0) {
          return projected.trim();
        }
      }
    }

    return undefined;
  }

  private extractMessageText(
    message: ChatRequestMessage | undefined,
  ): string | undefined {
    if (!message) {
      return undefined;
    }

    if (typeof message.content === 'string' && message.content.trim().length > 0) {
      return message.content.trim();
    }

    if (!Array.isArray(message.content)) {
      return undefined;
    }

    const text = message.content
      .map((part: unknown) => {
        if (typeof part === 'string') {
          return part;
        }
        if (part && typeof part === 'object' && 'text' in part && typeof (part as any).text === 'string') {
          return String((part as any).text);
        }
        return '';
      })
      .join(' ')
      .trim();

    return text.length > 0 ? text : undefined;
  }

  private async executeSkillIntentDirectly(input: {
    res: Response;
    format: 'sse' | 'vercel-ai';
    runRequest: AgentChatRequest;
    userId: string;
    parsedIntent: {
      skillKey?: string;
      operation?: string;
      args?: Record<string, unknown>;
      execution?: {
        agentId: string;
        operation?: string | null;
        input: Record<string, unknown>;
      };
    };
  }): Promise<{ runId: string } | null> {
    if (!input.parsedIntent.execution) {
      return null;
    }

    const execution = input.parsedIntent.execution;
    const executionInput: Record<string, unknown> = {
      ...(execution.input ?? {}),
    };

    if (!('conversationId' in executionInput) && input.runRequest.conversationId) {
      executionInput.conversationId = input.runRequest.conversationId;
    }
    if (!('sessionId' in executionInput) && input.runRequest.sessionId) {
      executionInput.sessionId = input.runRequest.sessionId;
    }
    if (!('userId' in executionInput) && input.userId) {
      executionInput.userId = input.userId;
    }

    const isShanjiSkill =
      input.parsedIntent.skillKey === 'dingtalk_shanji' ||
      execution.agentId === 'dingtalk_shanji';
    if (isShanjiSkill) {
      return this.executeShanjiSkillDirectly({
        ...input,
        executionInput,
      });
    }

    const result = await this.engineRouter.run(
      execution.agentId as AgentRunRequest['agentId'],
      execution.operation ?? null,
      executionInput,
      {
        useCache: true,
        userId: input.userId,
        conversationId: input.runRequest.conversationId,
        sessionId: input.runRequest.sessionId,
        llm: this.toStrictLlmRequestConfig(input.runRequest.llm),
      },
    );

    const summaryText = this.buildSkillExecutionSummary(
      input.parsedIntent.skillKey ?? execution.agentId,
      input.parsedIntent.operation ?? execution.operation ?? 'default',
      result.data,
      result.cached,
    );
    const messageId = generateUlid();
    const createdAtMs = Date.now();
    const createdAt = new Date(createdAtMs).toISOString();
    const metadata = {
      skillInvocation: {
        skillKey: input.parsedIntent.skillKey ?? null,
        operation: input.parsedIntent.operation ?? null,
        runId: result.runId,
        cached: result.cached,
      },
    } as Record<string, JsonValue>;

    await this.persistAssistantSkillMessage({
      conversationId: input.runRequest.conversationId,
      userId: input.userId,
      messageId,
      content: summaryText,
      createdAtMs,
      metadata,
    });

    if (input.format === 'vercel-ai') {
      const skillAdapter = new VercelAiStreamAdapter();
      const startChunk = skillAdapter.transform({ event: 'agent.start', data: { runId: result.runId, createdAt, input: summaryText } });
      if (startChunk) input.res.write(startChunk);
      const deltaChunk = skillAdapter.transform({ event: 'agent.delta', data: { id: generateUlid(), delta: summaryText } });
      if (deltaChunk) input.res.write(deltaChunk);
      const msgChunk = skillAdapter.transform({ event: 'agent.message', data: { id: messageId, role: 'assistant', content: summaryText, createdAt, createdAtMs } });
      if (msgChunk) input.res.write(msgChunk);
      input.res.write(skillAdapter.done());
      return { runId: result.runId };
    }

    const messageEvent = {
      event: 'agent.message' as const,
      data: {
        id: messageId,
        role: 'assistant' as const,
        content: summaryText,
        createdAt,
        createdAtMs,
        metadata,
      },
    };

    this.writeEvent(input.res, {
      event: 'agent.start',
      data: {
        runId: result.runId,
        createdAt,
        input: summaryText,
      },
    });
    this.writeEvent(input.res, messageEvent);
    this.writeEvent(input.res, {
      event: 'agent.end',
      data: {
        runId: result.runId,
        status: 'succeeded',
        finishedAt: new Date().toISOString(),
        output: summaryText,
      },
    });

    return { runId: result.runId };
  }

  private async executeShanjiSkillDirectly(input: {
    res: Response;
    format: 'sse' | 'vercel-ai';
    runRequest: AgentChatRequest;
    userId: string;
    parsedIntent: {
      skillKey?: string;
      operation?: string;
      args?: Record<string, unknown>;
      execution?: {
        agentId: string;
        operation?: string | null;
        input: Record<string, unknown>;
      };
    };
    executionInput: Record<string, unknown>;
  }): Promise<{ runId: string }> {
    if (!this.shanjiExtractorService) {
      throw new Error('[shanji_service_unavailable] Shanji extractor service is unavailable.');
    }

    const execution = input.parsedIntent.execution;
    const urlFromExecution =
      typeof input.executionInput.url === 'string' ? input.executionInput.url.trim() : '';
    const urlFromArgs =
      typeof input.parsedIntent.args?.url === 'string' ? input.parsedIntent.args.url.trim() : '';
    const sourceUrl = urlFromExecution || urlFromArgs;
    if (!sourceUrl) {
      throw new Error('[shanji_url_missing] Shanji URL is required.');
    }

    const tokenFromExecution =
      typeof input.executionInput.meetingAgentToken === 'string'
        ? input.executionInput.meetingAgentToken.trim()
        : '';
    const tokenFromArgs =
      typeof input.parsedIntent.args?.meetingAgentToken === 'string'
        ? input.parsedIntent.args.meetingAgentToken.trim()
        : '';
    const meetingAgentToken = tokenFromExecution || tokenFromArgs;
    const outputMode =
      typeof input.executionInput.outputMode === 'string'
        ? input.executionInput.outputMode.trim()
        : typeof input.parsedIntent.args?.outputMode === 'string'
          ? input.parsedIntent.args.outputMode.trim()
          : 'summary';
    const skillId = input.parsedIntent.skillKey ?? 'dingtalk_shanji';

    this.writeSkillState(input.res, input.format, {
      skillId,
      status: 'running',
      at: new Date().toISOString(),
      input: {
        url: sourceUrl,
      },
      message: '正在解析钉钉闪记',
    });

    let extractResult;
    try {
      extractResult = await this.shanjiExtractorService.extractFromUrl({
        url: sourceUrl,
        meetingAgentToken: meetingAgentToken || undefined,
      });
    } catch (error) {
      this.writeSkillState(input.res, input.format, {
        skillId,
        status: 'failed',
        at: new Date().toISOString(),
        input: {
          url: sourceUrl,
        },
        error: {
          code: 'skill_execution_failed',
          message: error instanceof Error ? error.message : String(error),
        },
        message: '钉钉闪记解析失败',
      });
      throw error;
    }
    const renderedText = this.buildShanjiExecutionSummary(extractResult, outputMode === 'full_text' ? 'full_text' : 'summary');
    const runId = generateUlid();
    const messageId = generateUlid();
    const createdAtMs = Date.now();
    const createdAt = new Date(createdAtMs).toISOString();
    const metadata = {
      skillInvocation: {
        skillKey: input.parsedIntent.skillKey ?? 'dingtalk_shanji',
        operation: input.parsedIntent.operation ?? execution?.operation ?? 'extract',
        runId,
        cached: false,
      },
      shanji: {
        sourceUrl: extractResult.sourceUrl,
        fetchMode: extractResult.fetchMode,
        fetchedAt: extractResult.fetchedAt,
        audioUrl: extractResult.audioUrl ?? null,
        transcriptText: extractResult.transcriptText,
        transcriptSegments: this.toJsonSafeTranscriptSegments(extractResult.transcriptSegments),
      },
      executionTrace: {
        status: 'succeeded',
        steps: [
          {
            id: `${runId}-skill-running`,
            kind: 'skill',
            itemId: skillId,
            title: skillId,
            status: 'running',
            message: '正在解析钉钉闪记',
            input: {
              url: sourceUrl,
            },
          },
          {
            id: `${runId}-skill-succeeded`,
            kind: 'skill',
            itemId: skillId,
            title: skillId,
            status: 'succeeded',
            message: '钉钉闪记解析完成',
            output: {
              sourceUrl: extractResult.sourceUrl,
              summary: extractResult.summary,
              audioUrl: extractResult.audioUrl ?? null,
              outputMode,
            },
          },
        ],
      },
    } as Record<string, JsonValue>;

    await this.persistAssistantSkillMessage({
      conversationId: input.runRequest.conversationId,
      userId: input.userId,
      messageId,
      content: renderedText,
      createdAtMs,
      metadata,
    });

    this.writeSkillState(input.res, input.format, {
      skillId,
      status: 'succeeded',
      at: new Date().toISOString(),
      input: {
        url: sourceUrl,
      },
      output: {
        sourceUrl: extractResult.sourceUrl,
          summary: extractResult.summary,
          audioUrl: extractResult.audioUrl ?? null,
          outputMode,
        },
        message: '钉钉闪记解析完成',
      });

    if (input.format === 'vercel-ai') {
      const skillAdapter = new VercelAiStreamAdapter();
      const startChunk = skillAdapter.transform({
        event: 'agent.start',
        data: {
          runId,
          createdAt,
          input: renderedText,
        },
      });
      if (startChunk) input.res.write(startChunk);
      const deltaChunk = skillAdapter.transform({
        event: 'agent.delta',
        data: { id: generateUlid(), delta: renderedText },
      });
      if (deltaChunk) input.res.write(deltaChunk);
      const messageChunk = skillAdapter.transform({
        event: 'agent.message',
        data: {
          id: messageId,
          role: 'assistant',
          content: renderedText,
          createdAt,
          createdAtMs,
        },
      });
      if (messageChunk) input.res.write(messageChunk);
      input.res.write(skillAdapter.done());
      return { runId };
    }

    this.writeEvent(input.res, {
      event: 'agent.start',
      data: {
        runId,
        createdAt,
        input: renderedText,
      },
    });
    this.writeEvent(input.res, {
      event: 'agent.message',
      data: {
        id: messageId,
        role: 'assistant',
        content: renderedText,
        createdAt,
        createdAtMs,
        metadata,
      },
    });
    this.writeEvent(input.res, {
      event: 'agent.end',
      data: {
        runId,
        status: 'succeeded',
        finishedAt: new Date().toISOString(),
        output: renderedText,
      },
    });

    return { runId };
  }

  private buildShanjiExecutionSummary(result: {
    summary: string;
    keySnippets: string[];
    audioUrl?: string;
    sourceUrl: string;
    transcriptText?: string;
  }, outputMode: 'summary' | 'full_text' = 'summary'): string {
    const snippetLines = result.keySnippets.slice(0, 5).map((snippet, idx) => `${idx + 1}. ${snippet}`);
    const sections = [
      '已解析钉钉闪记链接',
      `来源：${result.sourceUrl}`,
      `摘要：${result.summary}`,
      snippetLines.length > 0 ? `关键片段：\n${snippetLines.join('\n')}` : null,
      outputMode === 'full_text' && result.transcriptText
        ? `全文：\n${result.transcriptText.slice(0, 12000)}${result.transcriptText.length > 12000 ? '\n\n[全文过长，已截断展示]' : ''}`
        : null,
      result.audioUrl ? `音频链接：${result.audioUrl}` : '音频链接：未解析到直链',
    ].filter((item): item is string => Boolean(item));
    return sections.join('\n\n');
  }

  private buildAgentRunSummary(
    agentId: string,
    operation: string | null,
    data: Record<string, unknown>,
    cached: boolean,
  ): string {
    const title = `${agentId}${operation ? ` / ${operation}` : ''}`;
    const payload = JSON.stringify(data, null, 2);
    const clipped = payload.length > 1200 ? `${payload.slice(0, 1197)}...` : payload;
    return [
      `已执行系统级 Agent：${title}${cached ? '（缓存命中）' : ''}`,
      clipped,
    ].join('\n\n');
  }

  private buildAgentRunPreview(data: Record<string, unknown>): JsonValue {
    const payload = JSON.stringify(data);
    if (payload.length <= 500) {
      return data as JsonValue;
    }
    return payload.slice(0, 497) + '...';
  }

  private async persistAssistantSkillMessage(input: {
    conversationId?: string;
    userId?: string;
    messageId: string;
    content: string;
    createdAtMs: number;
    metadata?: Record<string, JsonValue>;
  }): Promise<void> {
    if (!this.messagesService || !input.conversationId) {
      return;
    }

    try {
      await this.messagesService.appendMessage(input.conversationId, {
        id: input.messageId,
        role: 'assistant',
        content: input.content,
        metadata: input.metadata as Record<string, any> | undefined,
        createdAtMs: input.createdAtMs,
        userId: input.userId,
      });
    } catch {
      // Persist failure should not block skill stream response.
    }
  }

  private async resolveRunSurfaceMismatch(
    agentId: string,
    userId?: string,
  ): Promise<{
    statusCode: number;
    body: {
      code: string;
      message: string;
      retryable?: boolean;
    };
  } | null> {
    if (!this.skillsService || !userId) {
      return null;
    }

    try {
      const isChatSkill = await this.skillsService.isChatSkillKey(userId, agentId);
      if (!isChatSkill) {
        return null;
      }

      return {
        statusCode: HttpStatus.BAD_REQUEST,
        body: {
          code: 'surface_mismatch',
          message: 'Requested capability is a chat skill, not a system agent.',
          retryable: false,
        },
      };
    } catch {
      return null;
    }
  }

  private writeSkillState(
    res: Response,
    format: 'sse' | 'vercel-ai',
    update: SkillStateUpdate,
  ): void {
    const event: AgentStreamEvent = {
      event: 'skill.state',
      data: update,
    };

    if (format === 'vercel-ai') {
      const adapter = new VercelAiStreamAdapter();
      const transformed = adapter.transform(event);
      if (transformed) {
        res.write(transformed);
      }
      return;
    }

    this.writeEvent(res, event);
  }

  private toJsonSafeTranscriptSegments(segments: Array<{
    index: number;
    text: string;
    startMs?: number;
    endMs?: number;
    speaker?: string;
  }>): Array<Record<string, JsonValue>> {
    return segments.map((segment) => {
      const payload: Record<string, JsonValue> = {
        index: segment.index,
        text: segment.text,
      };
      if (typeof segment.startMs === 'number') {
        payload.startMs = segment.startMs;
      }
      if (typeof segment.endMs === 'number') {
        payload.endMs = segment.endMs;
      }
      if (typeof segment.speaker === 'string') {
        payload.speaker = segment.speaker;
      }
      return payload;
    });
  }

  private buildSkillExecutionSummary(
    skillKey: string,
    operation: string,
    data: Record<string, unknown>,
    cached: boolean,
  ): string {
    const payload = JSON.stringify(data, null, 2);
    const trimmed = payload.length > 1200 ? `${payload.slice(0, 1197)}...` : payload;
    return `已执行技能 ${skillKey}:${operation}${cached ? '（缓存命中）' : ''}\n\n${trimmed}`;
  }

  private sanitizeChatContext(context: AgentChatRequest['context']): AgentChatContext | undefined {
    if (!this.isRecord(context)) {
      return undefined;
    }

    const sanitized: AgentChatContext = {};

    for (const [key, value] of Object.entries(context)) {
      if (key === 'composer') {
        const composer = this.sanitizeComposerContext(value);
        if (composer) {
          sanitized.composer = composer;
        }
        continue;
      }

      const normalizedValue = this.sanitizeGenericContextValue(value, 0);
      if (normalizedValue !== undefined) {
        sanitized[key] = normalizedValue;
      }
    }

    if (Object.keys(sanitized).length === 0) {
      return undefined;
    }

    return sanitized;
  }

  private sanitizeComposerContext(value: unknown): AgentComposerContext | undefined {
    if (!this.isRecord(value)) {
      return undefined;
    }

    const sanitized: AgentComposerContext = {};

    if (Array.isArray(value.enabledTools)) {
      const enabledTools = Array.from(
        new Set(
          value.enabledTools
            .filter((tool): tool is string => typeof tool === 'string')
            .map((tool) => tool.trim().slice(0, 64))
            .filter((tool) => tool.length > 0)
        )
      ).slice(0, this.maxComposerTools);

      if (enabledTools.length > 0) {
        sanitized.enabledTools = enabledTools;
      }
    }

    if (Array.isArray(value.enabledSkills)) {
      const enabledSkills = Array.from(
        new Set(
          value.enabledSkills
            .filter((skill): skill is string => typeof skill === 'string')
            .map((skill) => skill.trim().slice(0, 64))
            .filter((skill) => skill.length > 0),
        ),
      ).slice(0, this.maxComposerTools);

      if (enabledSkills.length > 0) {
        sanitized.enabledSkills = enabledSkills;
      }
    }

    if (Array.isArray(value.attachments)) {
      const attachments = value.attachments
        .map((attachment) => this.sanitizeComposerAttachment(attachment))
        .filter((attachment): attachment is AgentComposerAttachment => attachment !== undefined)
        .slice(0, this.maxComposerAttachments);

      if (attachments.length > 0) {
        sanitized.attachments = attachments;
      }
    }

    if (typeof value.feishuEnabled === 'boolean') {
      sanitized.feishuEnabled = value.feishuEnabled;
    }

    if (typeof value.thinkingEnabled === 'boolean') {
      sanitized.thinkingEnabled = value.thinkingEnabled;
    }

    if (value.inputMode === 'text' || value.inputMode === 'voice') {
      sanitized.inputMode = value.inputMode;
    }

    if (value.skillInputs !== undefined) {
      const skillInputs = this.sanitizeGenericContextValue(value.skillInputs, 0);
      if (this.isRecord(skillInputs)) {
        sanitized.skillInputs = skillInputs as Record<string, Record<string, unknown>>;
      }
    }

    if (typeof value.skillActionId === 'string') {
      const skillActionId = value.skillActionId.trim().slice(0, 160);
      if (skillActionId.length > 0) {
        console.warn('[agent.chat] composer.skillActionId is deprecated; use enabledSkills/skillInputs instead.');
        sanitized.skillActionId = skillActionId;
      }
    }

    if (value.rawInputs !== undefined) {
      const rawInputs = this.sanitizeGenericContextValue(value.rawInputs, 0);
      if (this.isRecord(rawInputs)) {
        console.warn('[agent.chat] composer.rawInputs is deprecated; use skillInputs instead.');
        sanitized.rawInputs = rawInputs as Record<string, unknown>;
      }
    }

    if (Object.keys(sanitized).length === 0) {
      return undefined;
    }

    return sanitized;
  }

  private readEnabledSkills(composer: Record<string, unknown> | undefined): string[] {
    if (!composer || !Array.isArray(composer.enabledSkills)) {
      return [];
    }

    return Array.from(
      new Set(
        composer.enabledSkills
          .filter((skill): skill is string => typeof skill === 'string')
          .map((skill) => skill.trim())
          .filter((skill) => skill.length > 0),
      ),
    );
  }

  private sanitizeComposerAttachment(value: unknown): AgentComposerAttachment | undefined {
    if (!this.isRecord(value)) {
      return undefined;
    }

    const name = typeof value.name === 'string' ? value.name.trim().slice(0, 180) : '';
    if (!name) {
      return undefined;
    }

    const mimeType =
      typeof value.mimeType === 'string' ? value.mimeType.trim().slice(0, 120) : undefined;
    const size = typeof value.size === 'number' && Number.isFinite(value.size)
      ? Math.max(0, Math.round(value.size))
      : undefined;

    return {
      name,
      mimeType: mimeType || undefined,
      size,
      kind: value.kind === 'image' ? 'image' : 'file',
    };
  }

  private sanitizeGenericContextValue(value: unknown, depth: number): unknown {
    if (value === null) {
      return null;
    }
    if (typeof value === 'string') {
      return value.trim().slice(0, this.maxContextStringLength);
    }
    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : undefined;
    }
    if (typeof value === 'boolean') {
      return value;
    }
    if (Array.isArray(value)) {
      if (depth >= this.maxContextDepth) {
        return undefined;
      }
      const items = value
        .slice(0, this.maxContextArrayLength)
        .map((item) => this.sanitizeGenericContextValue(item, depth + 1))
        .filter((item) => item !== undefined);
      return items;
    }
    if (!this.isRecord(value)) {
      return undefined;
    }
    if (depth >= this.maxContextDepth) {
      return undefined;
    }

    const result: Record<string, unknown> = {};
    const entries = Object.entries(value).slice(0, this.maxContextObjectKeys);
    for (const [key, nestedValue] of entries) {
      const sanitized = this.sanitizeGenericContextValue(nestedValue, depth + 1);
      if (sanitized !== undefined) {
        result[key] = sanitized;
      }
    }
    return result;
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  }

  private applyComposerLlmOverrides(
    llm: LlmRequestConfig | undefined,
    composer: AgentComposerContext | undefined,
  ): LlmCallSettings | undefined {
    if (!composer?.thinkingEnabled) {
      return llm;
    }

    const effectiveLlm: LlmCallSettings = llm ? { ...llm } : {};
    const providerOptions: Record<string, Record<string, unknown>> = this.isRecord(effectiveLlm.providerOptions)
      ? Object.entries(effectiveLlm.providerOptions).reduce<Record<string, Record<string, unknown>>>(
          (acc, [key, value]) => {
            if (this.isRecord(value)) {
              acc[key] = { ...value };
            }
            return acc;
          },
          {},
        )
      : {};

    const anthropicOptions = this.isRecord(providerOptions.anthropic)
      ? { ...providerOptions.anthropic }
      : {};
    if (anthropicOptions.thinking === undefined) {
      anthropicOptions.thinking = {
        type: 'enabled',
        budgetTokens: this.defaultThinkingBudgetTokens,
      };
    }
    providerOptions.anthropic = anthropicOptions;

    const openaiCompatibleOptions = this.isRecord(providerOptions.openaiCompatible)
      ? { ...providerOptions.openaiCompatible }
      : {};
    if (openaiCompatibleOptions.reasoningEffort === undefined) {
      openaiCompatibleOptions.reasoningEffort = 'high';
    }
    providerOptions.openaiCompatible = openaiCompatibleOptions;

    effectiveLlm.providerOptions = providerOptions;
    return effectiveLlm;
  }

  private toStrictLlmRequestConfig(llm: AgentChatRequest['llm']): LlmRequestConfig | undefined {
    if (!llm || llm.provider === undefined || typeof llm.model !== 'string') {
      return undefined;
    }

    const model = llm.model.trim();
    if (!model) {
      return undefined;
    }

    const providerKey =
      typeof llm.providerKey === 'string' && llm.providerKey.trim().length > 0
        ? llm.providerKey.trim()
        : undefined;

    return this.applyCatalogConnectionToLlm({
      ...llm,
      provider: llm.provider,
      providerKey,
      model,
    });
  }

  private buildLlmCatalog(): AgentLlmCatalogResponse {
    const fallbackDefault = this.resolveEnvDefaultSelection();
    const opencodeCatalog = this.readOpencodeCatalog();

    if (opencodeCatalog) {
      return opencodeCatalog;
    }

    const providerMap = new Map<string, AgentLlmCatalogProvider>();
    this.addCatalogModel(providerMap, {
      key: fallbackDefault.key,
      provider: fallbackDefault.provider,
      providerLabel: this.defaultProviderLabel(fallbackDefault.provider),
      model: fallbackDefault.model,
      modelLabel: fallbackDefault.model,
      reasoning: false,
    });

    for (const provider of ['openai', 'claude', 'gemini', 'openai-compatible'] as const) {
      const envModels = this.parseModelListFromEnv(provider);
      for (const model of envModels) {
        this.addCatalogModel(providerMap, {
          key: provider,
          provider,
          providerLabel: this.defaultProviderLabel(provider),
          model,
          modelLabel: model,
          reasoning: false,
        });
      }
    }

    return {
      source: 'env',
      defaultSelection: fallbackDefault,
      providers: Array.from(providerMap.values()),
    };
  }

  private readOpencodeCatalog(): AgentLlmCatalogResponse | null {
    const candidates = this.resolveOpencodeConfigCandidates();

    for (const candidate of candidates) {
      let parsed: unknown;
      try {
        if (!fs.existsSync(candidate)) {
          continue;
        }
        const content = fs.readFileSync(candidate, 'utf8');
        parsed = JSON.parse(content) as unknown;
      } catch {
        continue;
      }

      if (!this.isRecord(parsed)) {
        continue;
      }

      const providers = this.parseProvidersFromCatalog(parsed);
      if (providers.length === 0) {
        continue;
      }

      const providerMap = new Map<string, AgentLlmCatalogProvider>();
      for (const provider of providers) {
        providerMap.set(provider.key, provider);
      }

      const fallbackDefault = this.resolveEnvDefaultSelection();
      const configuredDefault = this.parseOpencodeDefaultSelection(parsed);
      const defaultSelection = configuredDefault ?? fallbackDefault;
      this.addCatalogModel(providerMap, {
        key: defaultSelection.key,
        provider: defaultSelection.provider,
        providerLabel: this.defaultProviderLabel(defaultSelection.provider),
        model: defaultSelection.model,
        modelLabel: defaultSelection.model,
        reasoning: false,
      });

      return {
        source: 'opencode',
        defaultSelection,
        providers: Array.from(providerMap.values()),
      };
    }

    return null;
  }

  private parseProvidersFromCatalog(config: Record<string, unknown>): AgentLlmCatalogProvider[] {
    const providerRoot = this.isRecord(config.providers)
      ? config.providers
      : this.isRecord(config.provider)
        ? config.provider
        : undefined;
    if (!providerRoot) {
      return [];
    }

    const providerMap = new Map<string, AgentLlmCatalogProvider>();

    for (const [rawProviderKey, rawProviderValue] of Object.entries(providerRoot)) {
      if (!this.isRecord(rawProviderValue)) {
        continue;
      }

      const provider = this.resolveCatalogProvider(rawProviderKey, rawProviderValue);
      if (!provider) {
        continue;
      }

      const providerLabel =
        this.readStringField(rawProviderValue, ['label', 'name']) ??
        this.defaultProviderLabel(provider);
      const providerBaseURL = this.extractProviderBaseUrl(rawProviderValue);

      const rawModels = rawProviderValue.models;
      if (!this.isRecord(rawModels)) {
        continue;
      }

      for (const [modelKey, modelValue] of Object.entries(rawModels)) {
        const model = modelKey.trim();
        if (!model) {
          continue;
        }

        const modelRecord = this.isRecord(modelValue) ? modelValue : {};
        const modelLabel = this.readStringField(modelRecord, ['label', 'name']) ?? model;
        const reasoning = modelRecord.reasoning === true || modelRecord.thinking === true;
        const providerOptions = this.extractCatalogModelProviderOptions(provider, modelRecord);

        this.addCatalogModel(providerMap, {
          key: rawProviderKey,
          provider,
          providerLabel,
          providerBaseURL,
          model,
          modelLabel,
          reasoning,
          providerOptions,
        });
      }
    }

    return Array.from(providerMap.values());
  }

  private extractModelProviderOptions(
    provider: LlmProviderName,
    rawOptions: unknown,
  ): Record<string, Record<string, unknown>> | undefined {
    if (!this.isRecord(rawOptions)) {
      return undefined;
    }

    const result: Record<string, Record<string, unknown>> = {};

    if (provider === 'claude' && this.isRecord(rawOptions.thinking)) {
      result.anthropic = {
        thinking: rawOptions.thinking,
      };
    }

    const reasoningEffort = this.readReasoningEffort(rawOptions);
    if (typeof reasoningEffort === 'string' && reasoningEffort.trim().length > 0) {
      if (provider === 'openai-compatible') {
        result.openaiCompatible = {
          reasoningEffort: reasoningEffort.trim(),
        };
      } else if (provider === 'openai') {
        result.openai = {
          reasoningEffort: reasoningEffort.trim(),
        };
      }
    }

    return Object.keys(result).length > 0 ? result : undefined;
  }

  private extractCatalogModelProviderOptions(
    provider: LlmProviderName,
    modelRecord: Record<string, unknown>,
  ): Record<string, Record<string, unknown>> | undefined {
    const normalizedProviderOptions = this.normalizeCatalogProviderOptions(modelRecord.providerOptions);
    if (normalizedProviderOptions) {
      return normalizedProviderOptions;
    }

    return this.extractModelProviderOptions(provider, modelRecord.options);
  }

  private normalizeCatalogProviderOptions(
    rawOptions: unknown,
  ): Record<string, Record<string, unknown>> | undefined {
    if (!this.isRecord(rawOptions)) {
      return undefined;
    }

    const normalized: Record<string, Record<string, unknown>> = {};
    for (const [rawKey, rawValue] of Object.entries(rawOptions)) {
      if (!this.isRecord(rawValue)) {
        continue;
      }

      const key = CATALOG_PROVIDER_OPTIONS_KEY_ALIAS_MAP[rawKey] ?? rawKey;
      normalized[key] = { ...rawValue };
    }

    return Object.keys(normalized).length > 0 ? normalized : undefined;
  }

  private readReasoningEffort(rawOptions: Record<string, unknown>): string | undefined {
    if (typeof rawOptions.reasoningEffort === 'string') {
      return rawOptions.reasoningEffort;
    }

    const reasoning = rawOptions.reasoning;
    if (!this.isRecord(reasoning)) {
      return undefined;
    }

    return typeof reasoning.effort === 'string' ? reasoning.effort : undefined;
  }

  private resolveCatalogProvider(
    providerKey: string,
    providerConfig: Record<string, unknown>,
  ): LlmProviderName | undefined {
    const sdkProvider = this.readStringField(providerConfig, ['sdkProvider', 'sdk_provider']);
    if (sdkProvider) {
      const normalized = this.normalizeCatalogProviderName(sdkProvider);
      if (normalized) {
        return normalized;
      }
    }

    return this.inferLlmProvider(providerKey, providerConfig);
  }

  private normalizeCatalogProviderName(value: string): LlmProviderName | undefined {
    const normalized = value.trim().toLowerCase();
    if (!normalized) {
      return undefined;
    }

    if (
      normalized === 'openai' ||
      normalized === 'claude' ||
      normalized === 'anthropic' ||
      normalized === 'gemini' ||
      normalized === 'google' ||
      normalized === 'openai-compatible' ||
      normalized === 'openai_compatible' ||
      normalized === 'openaicompatible'
    ) {
      return this.normalizeProviderName(normalized);
    }

    return undefined;
  }

  private parseOpencodeDefaultSelection(
    config: Record<string, unknown>,
  ): { key: string; provider: LlmProviderName; model: string } | undefined {
    const rawModel =
      typeof config.defaultModel === 'string'
        ? config.defaultModel
        : config.model;
    if (typeof rawModel !== 'string') {
      return undefined;
    }

    const value = rawModel.trim();
    if (!value) {
      return undefined;
    }

    const slashIndex = value.indexOf('/');
    if (slashIndex <= 0 || slashIndex >= value.length - 1) {
      return undefined;
    }

    const providerKey = value.slice(0, slashIndex).trim();
    const model = value.slice(slashIndex + 1).trim();
    if (!providerKey || !model) {
      return undefined;
    }

    const providerConfigRoot = this.isRecord(config.providers)
      ? config.providers
      : this.isRecord(config.provider)
        ? config.provider
        : undefined;
    const providerConfig = providerConfigRoot && this.isRecord(providerConfigRoot[providerKey])
      ? (providerConfigRoot[providerKey] as Record<string, unknown>)
      : undefined;
    const provider = providerConfig
      ? this.resolveCatalogProvider(providerKey, providerConfig)
      : this.normalizeProviderName(providerKey);
    if (!provider) {
      return undefined;
    }

    return { key: providerKey, provider, model };
  }

  private resolveOpencodeConfigCandidates(): string[] {
    const explicitCandidates = [
      process.env.AGENT_LLM_CATALOG_PATH,
    ]
      .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
      .map((value) => this.expandHomePath(value.trim()));

    if (explicitCandidates.length > 0) {
      return Array.from(new Set(explicitCandidates));
    }

    return [this.expandHomePath('~/.config/opencode/opencode.json')];
  }

  private expandHomePath(inputPath: string): string {
    if (inputPath.startsWith('~/')) {
      return path.join(os.homedir(), inputPath.slice(2));
    }
    return inputPath;
  }

  private resolveEnvDefaultSelection(): { key: string; provider: LlmProviderName; model: string } {
    const providerRaw = process.env.LLM_PROVIDER ?? 'claude';
    const provider = this.normalizeProviderName(providerRaw) ?? 'claude';

    const modelRaw = process.env.LLM_MODEL;
    const model = typeof modelRaw === 'string' && modelRaw.trim().length > 0
      ? modelRaw.trim()
      : provider === 'claude'
        ? process.env.ANTHROPIC_DEFAULT_HAIKU_MODEL?.trim() || 'claude-3-5-haiku-latest'
        : process.env.OPENAI_MODEL?.trim() || 'gpt-4.1-mini';

    return { key: provider, provider, model };
  }

  private parseModelListFromEnv(provider: LlmProviderName): string[] {
    const envSuffix = provider === 'openai-compatible' ? 'OPENAI_COMPATIBLE' : provider.toUpperCase();
    const raw = process.env[`LLM_MODELS_${envSuffix}`];
    if (!raw) {
      return [];
    }

    return Array.from(
      new Set(
        raw
          .split(',')
          .map((item) => item.trim())
          .filter((item) => item.length > 0),
      ),
    );
  }

  private addCatalogModel(
    providerMap: Map<string, AgentLlmCatalogProvider>,
    input: {
      key: string;
      provider: LlmProviderName;
      providerLabel: string;
      providerBaseURL?: string;
      model: string;
      modelLabel: string;
      reasoning: boolean;
      providerOptions?: Record<string, Record<string, unknown>>;
    },
  ): void {
    const providerKey = input.key.trim();
    if (!providerKey) {
      return;
    }

    const normalizedModel = input.model.trim();
    if (!normalizedModel) {
      return;
    }

    const providerEntry =
      providerMap.get(providerKey) ??
      ({
        key: providerKey,
        provider: input.provider,
        label: input.providerLabel,
        baseURL: input.providerBaseURL,
        models: [],
      } satisfies AgentLlmCatalogProvider);

    if (!providerMap.has(providerKey)) {
      providerMap.set(providerKey, providerEntry);
    } else if (!providerEntry.baseURL && input.providerBaseURL) {
      providerEntry.baseURL = input.providerBaseURL;
    }

    const existing = providerEntry.models.find((item) => item.model === normalizedModel);
    if (existing) {
      if (input.reasoning) {
        existing.reasoning = true;
      }
      if (!existing.providerOptions && input.providerOptions) {
        existing.providerOptions = input.providerOptions;
      }
      return;
    }

    const modelEntry: AgentLlmCatalogModel = {
      model: normalizedModel,
      label: input.modelLabel,
      reasoning: input.reasoning,
    };

    if (input.providerOptions) {
      modelEntry.providerOptions = input.providerOptions;
    }

    providerEntry.models.push(modelEntry);
  }

  private inferLlmProvider(
    providerKey: string,
    providerConfig?: Record<string, unknown>,
  ): LlmProviderName | undefined {
    const normalizedKey = providerKey.trim().toLowerCase();
    const byName = this.normalizeProviderName(normalizedKey);
    if (byName) {
      return byName;
    }

    if (normalizedKey.includes('anthropic') || normalizedKey.includes('claude')) {
      return 'claude';
    }
    if (normalizedKey.includes('gemini') || normalizedKey.includes('google')) {
      return 'gemini';
    }
    if (normalizedKey.includes('openai') && normalizedKey.includes('compatible')) {
      return 'openai-compatible';
    }
    if (normalizedKey.includes('openai')) {
      return 'openai';
    }

    if (providerConfig) {
      const npmPackage = typeof providerConfig.npm === 'string' ? providerConfig.npm.toLowerCase() : '';
      if (npmPackage.includes('openai-compatible')) {
        return 'openai-compatible';
      }
      if (npmPackage.includes('anthropic')) {
        return 'claude';
      }
      if (npmPackage.includes('@ai-sdk/google')) {
        return 'gemini';
      }
      if (npmPackage.includes('@ai-sdk/openai')) {
        return 'openai';
      }
    }

    return undefined;
  }

  private normalizeProviderName(provider: string): LlmProviderName | undefined {
    const normalized = provider.trim().toLowerCase();
    if (!normalized) {
      return undefined;
    }

    if (normalized === 'anthropic') {
      return 'claude';
    }
    if (normalized === 'google') {
      return 'gemini';
    }
    if (normalized === 'openai-compatible' || normalized === 'openai_compatible' || normalized === 'openaicompatible') {
      return 'openai-compatible';
    }
    if (
      normalized === 'openai' ||
      normalized === 'claude' ||
      normalized === 'gemini'
    ) {
      return normalized;
    }

    return undefined;
  }

  private defaultProviderLabel(provider: LlmProviderName): string {
    if (provider === 'openai') return 'OpenAI';
    if (provider === 'claude') return 'Anthropic Claude';
    if (provider === 'gemini') return 'Google Gemini';
    return 'OpenAI Compatible';
  }

  private validateAndNormalizeLlm(body: unknown): LlmRequestConfig | undefined {
    const legacyFields = findLegacyLlmFields(body);
    if (legacyFields.length > 0) {
      throw new AgentLlmValidationError(
        'invalid_llm_request',
        `Legacy LLM fields are no longer supported: ${legacyFields.join(', ')}. Use llm.* fields instead.`,
        { legacyFields },
      );
    }

    if (!this.isRecord(body) || body.llm === undefined) {
      return undefined;
    }

    return this.applyCatalogConnectionToLlm(parseAgentLlmOrThrow(body));
  }

  private applyCatalogConnectionToLlm(llm: LlmRequestConfig): LlmRequestConfig {
    const providerKey =
      typeof llm.providerKey === 'string' && llm.providerKey.trim().length > 0
        ? llm.providerKey.trim()
        : llm.provider;
    const catalog = this.buildLlmCatalog();
    const providerEntry = catalog.providers.find((provider) => provider.key === providerKey);
    if (!providerEntry) {
      return llm;
    }

    const normalizedModel = llm.model.trim();
    const modelEntry = providerEntry.models.find((model) => model.model === normalizedModel);
    const mergedProviderOptions = this.mergeProviderOptions(
      modelEntry?.providerOptions,
      llm.providerOptions,
    );
    const baseURL = providerEntry.baseURL?.trim();

    return {
      ...llm,
      provider: providerEntry.provider,
      providerKey,
      model: normalizedModel,
      baseURL: baseURL && baseURL.length > 0 ? baseURL : llm.baseURL,
      providerOptions: mergedProviderOptions ?? llm.providerOptions,
    };
  }

  private mergeProviderOptions(
    catalogOptions?: Record<string, Record<string, unknown>>,
    requestOptions?: Record<string, Record<string, unknown>>,
  ): Record<string, Record<string, unknown>> | undefined {
    if (!catalogOptions && !requestOptions) {
      return undefined;
    }

    if (!catalogOptions) {
      return requestOptions;
    }

    if (!requestOptions) {
      return catalogOptions;
    }

    const merged: Record<string, Record<string, unknown>> = {};
    const keys = new Set([...Object.keys(catalogOptions), ...Object.keys(requestOptions)]);
    for (const key of keys) {
      const catalogValue = catalogOptions[key];
      const requestValue = requestOptions[key];

      if (this.isRecord(catalogValue) && this.isRecord(requestValue)) {
        merged[key] = { ...catalogValue, ...requestValue };
      } else if (this.isRecord(requestValue)) {
        merged[key] = { ...requestValue };
      } else if (this.isRecord(catalogValue)) {
        merged[key] = { ...catalogValue };
      }
    }

    return Object.keys(merged).length > 0 ? merged : undefined;
  }

  private extractProviderBaseUrl(providerConfig: Record<string, unknown>): string | undefined {
    const direct = this.readStringField(
      providerConfig,
      ['baseURL', 'baseUrl', 'base_url', 'apiBaseUrl', 'api_base_url', 'endpoint'],
    );
    if (direct) {
      return direct;
    }

    const options = this.isRecord(providerConfig.options) ? providerConfig.options : undefined;
    if (!options) {
      return undefined;
    }

    return this.readStringField(
      options,
      ['baseURL', 'baseUrl', 'base_url', 'apiBaseUrl', 'api_base_url', 'endpoint'],
    );
  }

  private readStringField(
    source: Record<string, unknown>,
    fields: string[],
  ): string | undefined {
    for (const field of fields) {
      const value = source[field];
      if (typeof value === 'string' && value.trim().length > 0) {
        return value.trim();
      }
    }

    return undefined;
  }

  private toLlmValidationError(error: unknown):
    | {
      code: 'invalid_llm_request' | 'unsupported_llm_provider';
      message: string;
      details?: unknown;
    }
    | null {
    if (!(error instanceof AgentLlmValidationError)) {
      return null;
    }

    return {
      code: error.code,
      message: error.message,
      details: error.details,
    };
  }

  private mapRunError(error: unknown): {
    statusCode: number;
    body: {
      code: string;
      message: string;
      details?: unknown;
      retryable?: boolean;
    };
  } {
    if (error instanceof AgentLlmValidationError) {
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        body: {
          code: error.code,
          message: error.message,
          details: error.details,
          retryable: false,
        },
      };
    }

    if (error instanceof AgentRuntimeError) {
      return {
        statusCode: error.statusCode,
        body: {
          code: error.code,
          message: error.message,
          details: error.details,
          retryable: error.retryable,
        },
      };
    }

    if (error instanceof HttpException) {
      const statusCode = error.getStatus();
      const response = error.getResponse();
      if (typeof response === 'object' && response !== null) {
        const payload = response as Record<string, unknown>;
        return {
          statusCode,
          body: {
            code: typeof payload.code === 'string' ? payload.code : 'agent_execution_failed',
            message: typeof payload.message === 'string' ? payload.message : error.message,
            details: payload.details,
            retryable: typeof payload.retryable === 'boolean' ? payload.retryable : undefined,
          },
        };
      }

      return {
        statusCode,
        body: {
          code: 'agent_execution_failed',
          message: typeof response === 'string' ? response : error.message,
        },
      };
    }

    if (error instanceof Error) {
      if (error.message.startsWith('snapshot_deserialize_failed')) {
        return {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          body: {
            code: 'snapshot_deserialize_failed',
            message: error.message,
          },
        };
      }
      if (error.message.startsWith('snapshot_hash_build_failed')) {
        return {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          body: {
            code: 'snapshot_hash_build_failed',
            message: error.message,
          },
        };
      }
      if (error.message.startsWith('snapshot_expiry_invalid')) {
        return {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          body: {
            code: 'snapshot_expiry_invalid',
            message: error.message,
          },
        };
      }

      return {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        body: {
          code: 'agent_execution_failed',
          message: error.message,
        },
      };
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      body: {
        code: 'agent_execution_failed',
        message: 'Unknown error',
      },
    };
  }
}
