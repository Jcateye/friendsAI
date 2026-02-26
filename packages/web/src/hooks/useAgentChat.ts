/**
 * useAgentChat Hook
 * 封装 Vercel AI SDK 的 useChat，添加 FriendsAI 特定功能
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, type UIMessage } from 'ai';
import type { AgentLlmRequest, ToolState } from '../lib/api/types';
import { api, clearAuthToken } from '../lib/api/client';
import { parseVercelAgentCustomDataLine } from '../lib/agent-stream/parseVercelAgentStream';

export interface ComposerAttachmentMetadata {
  name: string;
  mimeType?: string;
  size?: number;
  kind: 'image' | 'file';
}

export interface AgentComposerContext {
  enabledTools?: string[];
  attachments?: ComposerAttachmentMetadata[];
  feishuEnabled?: boolean;
  thinkingEnabled?: boolean;
  inputMode?: 'text' | 'voice';
  skillActionId?: string;
  rawInputs?: Record<string, unknown>;
}

export interface SendMessageOptions {
  composerContext?: AgentComposerContext;
}

export interface UseAgentChatOptions {
  /**
   * 会话 ID
   */
  conversationId?: string;
  /**
   * 初始消息列表
   */
  initialMessages?: AgentChatMessage[];
  /**
   * 是否自动加载历史消息
   */
  loadHistory?: boolean;
  /**
   * 工具确认回调
   */
  onToolConfirmation?: (tool: ToolState) => void;
  /**
   * 会话创建回调（当后端自动创建会话时调用）
   */
  onConversationCreated?: (conversationId: string) => void;
  /**
   * 可选的 LLM 配置，透传给后端 /v1/agent/chat
   */
  llm?: AgentLlmRequest;
}

export interface AgentChatMessage {
  id: string;
  role: 'system' | 'user' | 'assistant';
  content: string;
  createdAt?: Date;
  createdAtMs?: number;
  [key: string]: unknown;
}

export interface UseAgentChatReturn {
  /**
   * 消息列表（来自 useChat）
   */
  messages: AgentChatMessage[];
  /**
   * 发送消息
   */
  sendMessage: (message: string, options?: SendMessageOptions) => void;
  /**
   * 输入值
   */
  input: string;
  /**
   * 设置输入值
   */
  setInput: (value: string) => void;
  /**
   * 是否正在加载
   */
  isLoading: boolean;
  /**
   * 错误信息
   */
  error: Error | undefined;
  /**
   * 停止生成
   */
  stop: () => void;
  /**
   * 重新加载
   */
  reload: () => void;
  /**
   * 待确认的工具列表
   */
  pendingConfirmations: ToolState[];
  /**
   * 确认工具
   */
  confirmTool: (id: string, payload?: Record<string, any>) => Promise<void>;
  /**
   * 拒绝工具
   */
  rejectTool: (id: string, reason?: string) => Promise<void>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeComposerContext(context: AgentComposerContext | undefined): AgentComposerContext | undefined {
  if (!context) {
    return undefined;
  }

  const normalized: AgentComposerContext = {};

  if (Array.isArray(context.enabledTools)) {
    const enabledTools = Array.from(
      new Set(
        context.enabledTools
          .filter((name): name is string => typeof name === 'string')
          .map((name) => name.trim())
          .filter((name) => name.length > 0)
      )
    ).slice(0, 12);

    if (enabledTools.length > 0) {
      normalized.enabledTools = enabledTools;
    }
  }

  if (Array.isArray(context.attachments)) {
    const attachments: ComposerAttachmentMetadata[] = [];
    for (const attachment of context.attachments) {
      if (!isRecord(attachment)) {
        continue;
      }

      const name = typeof attachment.name === 'string' ? attachment.name.trim().slice(0, 180) : '';
      if (!name) {
        continue;
      }

      const mimeType =
        typeof attachment.mimeType === 'string'
          ? attachment.mimeType.trim().slice(0, 120)
          : undefined;
      const size = typeof attachment.size === 'number' && Number.isFinite(attachment.size)
        ? Math.max(0, Math.round(attachment.size))
        : undefined;
      const kind = attachment.kind === 'image' ? 'image' : 'file';

      const normalizedAttachment: ComposerAttachmentMetadata = {
        name,
        kind,
      };
      if (mimeType) {
        normalizedAttachment.mimeType = mimeType;
      }
      if (size !== undefined) {
        normalizedAttachment.size = size;
      }

      attachments.push(normalizedAttachment);
      if (attachments.length >= 10) {
        break;
      }
    }

    if (attachments.length > 0) {
      normalized.attachments = attachments;
    }
  }

  if (typeof context.feishuEnabled === 'boolean') {
    normalized.feishuEnabled = context.feishuEnabled;
  }

  if (typeof context.thinkingEnabled === 'boolean') {
    normalized.thinkingEnabled = context.thinkingEnabled;
  }

  if (context.inputMode === 'text' || context.inputMode === 'voice') {
    normalized.inputMode = context.inputMode;
  }

  if (typeof context.skillActionId === 'string') {
    const skillActionId = context.skillActionId.trim().slice(0, 160);
    if (skillActionId.length > 0) {
      normalized.skillActionId = skillActionId;
    }
  }

  if (isRecord(context.rawInputs)) {
    const rawInputs: Record<string, unknown> = {};
    const entries = Object.entries(context.rawInputs).slice(0, 20);
    for (const [key, value] of entries) {
      if (typeof key !== 'string' || key.trim().length === 0) {
        continue;
      }
      if (value === null || ['string', 'number', 'boolean'].includes(typeof value) || Array.isArray(value) || isRecord(value)) {
        rawInputs[key] = value;
      }
    }
    if (Object.keys(rawInputs).length > 0) {
      normalized.rawInputs = rawInputs;
    }
  }

  if (Object.keys(normalized).length === 0) {
    return undefined;
  }

  return normalized;
}

/**
 * 获取认证 token
 */
function getAuthToken(): string | null {
  return localStorage.getItem('auth_token') || localStorage.getItem('token');
}

/**
 * 从消息中提取工具调用信息
 */
function extractToolStates(messages: Array<UIMessage | AgentChatMessage>): ToolState[] {
  const toolStates: ToolState[] = [];

  for (const message of messages) {
    const legacyToolInvocations = isRecord(message) && Array.isArray((message as Record<string, unknown>).toolInvocations)
      ? (message as Record<string, unknown>).toolInvocations as Array<Record<string, unknown>>
      : [];

    for (const toolInvocation of legacyToolInvocations) {
      const toolCallId = typeof toolInvocation.toolCallId === 'string' ? toolInvocation.toolCallId : '';
      if (!toolCallId) {
        continue;
      }
      const state = typeof toolInvocation.state === 'string' ? toolInvocation.state : '';
      toolStates.push({
        id: toolCallId,
        name: typeof toolInvocation.toolName === 'string' ? toolInvocation.toolName : 'Unknown Tool',
        status: (() => {
          if (state === 'result') return 'succeeded';
          if (state === 'call') return 'running';
          if (state === 'awaiting_input' || state === 'partial-call') return 'awaiting_input';
          return 'idle';
        })(),
        confirmationId: typeof toolInvocation.confirmationId === 'string' ? toolInvocation.confirmationId : undefined,
        input: toolInvocation.args,
        output: toolInvocation.result,
      });
    }

    if (!Array.isArray((message as UIMessage).parts)) {
      continue;
    }

    for (const part of (message as UIMessage).parts) {
      if (!isRecord(part) || typeof part.type !== 'string') {
        continue;
      }
      const partRecord = part as Record<string, unknown>;

      const isToolPart = part.type === 'dynamic-tool' || part.type.startsWith('tool-');
      if (!isToolPart) {
        continue;
      }

      const toolCallId = typeof partRecord.toolCallId === 'string' ? partRecord.toolCallId : '';
      if (!toolCallId) {
        continue;
      }

      const state = typeof partRecord.state === 'string' ? partRecord.state : '';
      const approval = isRecord(partRecord.approval) ? partRecord.approval : undefined;
      const approvalId = approval && typeof approval.id === 'string'
        ? approval.id
        : undefined;

      const toolName = part.type === 'dynamic-tool'
        ? (typeof partRecord.toolName === 'string' && partRecord.toolName.length > 0 ? partRecord.toolName : 'Unknown Tool')
        : part.type.replace(/^tool-/, '');

      toolStates.push({
        id: toolCallId,
        name: toolName || 'Unknown Tool',
        status: (() => {
          if (state === 'output-available') return 'succeeded';
          if (state === 'output-error') return 'failed';
          if (state === 'input-streaming') return 'running';
          if (state === 'input-available' || state === 'approval-requested' || state === 'approval-responded') {
            return 'awaiting_input';
          }
          return 'idle';
        })(),
        confirmationId: approvalId,
        input: partRecord.input,
        output: partRecord.output,
        message: typeof partRecord.errorText === 'string' ? partRecord.errorText : undefined,
      });
    }
  }

  return toolStates;
}

function getTextFromMessageParts(parts: unknown): string {
  if (!Array.isArray(parts)) {
    return '';
  }

  let content = '';
  for (const part of parts) {
    if (!isRecord(part)) {
      continue;
    }
    if (part.type === 'text' && typeof part.text === 'string') {
      content += part.text;
    }
  }

  return content;
}

function toServerMessage(message: unknown): { role: string; content: string } | null {
  if (!isRecord(message) || typeof message.role !== 'string') {
    return null;
  }

  if (typeof message.content === 'string') {
    return {
      role: message.role,
      content: message.content,
    };
  }

  return {
    role: message.role,
    content: getTextFromMessageParts(message.parts),
  };
}

function toUiMessages(messages: AgentChatMessage[]): UIMessage[] {
  return messages
    .filter((message): message is AgentChatMessage => isRecord(message) && typeof message.id === 'string' && typeof message.role === 'string')
    .map((message) => ({
      id: message.id,
      role: message.role,
      parts: [
        {
          type: 'text',
          text: typeof message.content === 'string' ? message.content : '',
        },
      ],
    }));
}

function toLegacyMessages(messages: UIMessage[]): AgentChatMessage[] {
  return messages.map((message) => ({
    id: message.id,
    role: message.role,
    content: getTextFromMessageParts(message.parts),
  }));
}

/**
 * 自定义 fetch 函数，添加认证头并处理 401 错误
 */
async function fetchWithAuth(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const token = getAuthToken();
  const headers = new Headers(init?.headers);

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (!headers.has('Content-Type') && init?.body) {
    headers.set('Content-Type', 'application/json');
  }

  try {
    const response = await fetch(input, {
      ...init,
      headers,
    });
    
    // 检查 401 错误（在返回响应前检查，避免流式响应被破坏）
    if (response.status === 401) {
      clearAuthToken();
      // 如果不在登录页，重定向到登录页并传递错误信息
      if (window.location.pathname !== '/login') {
        // 对于流式响应，我们不能读取响应体，所以使用默认错误信息
        const errorMessage = '登录已过期，请重新登录';
        const errorParam = encodeURIComponent(errorMessage);
        window.location.href = `/login?error=${errorParam}`;
      }
    }
    
    return response;
  } catch (error) {
    throw error;
  }
}

/**
 * 自定义 fetch 函数，拦截流数据解析 conversationId
 */
function createFetchWithConversationId(
  onConversationCreated?: (conversationId: string) => void,
  getConversationId?: () => string | undefined,
  onAwaitingToolConfirmation?: (tool: ToolState) => void,
  getNextComposerContext?: () => AgentComposerContext | undefined,
  getLlmConfig?: () => AgentLlmRequest | undefined,
): (input: RequestInfo | URL, init?: RequestInit) => Promise<Response> {
  return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    // 在发送请求前，修改请求体以添加最新的 conversationId
    let modifiedInit = init;
    if (getConversationId && init?.body) {
      const currentConversationId = getConversationId();
      
      try {
        // 解析现有的请求体
        const bodyText = typeof init.body === 'string' 
          ? init.body 
          : init.body instanceof Blob 
            ? await init.body.text()
            : JSON.stringify(init.body);
        const bodyObj = JSON.parse(bodyText) as Record<string, unknown>;
        
        // 添加或更新 conversationId
        if (currentConversationId && currentConversationId !== 'new') {
          bodyObj.conversationId = currentConversationId;
        } else if (currentConversationId === 'new') {
          // 如果是 'new'，不设置 conversationId，让后端创建新会话
          delete bodyObj.conversationId;
        }

        if (Array.isArray(bodyObj.messages)) {
          bodyObj.messages = bodyObj.messages
            .map((message: unknown) => toServerMessage(message))
            .filter(
              (message: { role: string; content: string } | null): message is { role: string; content: string } =>
                message !== null,
            );
        }

        const llmConfig = getLlmConfig?.();
        if (llmConfig) {
          bodyObj.llm = llmConfig;
        }

        const composerContext = getNextComposerContext?.();
        if (composerContext) {
          const existingContext = isRecord(bodyObj.context)
            ? (bodyObj.context as Record<string, unknown>)
            : {};
          bodyObj.context = {
            ...existingContext,
            composer: composerContext,
          };
        }
        
        // 创建新的请求体
        modifiedInit = {
          ...init,
          body: JSON.stringify(bodyObj),
        };
      } catch (e) {
        // 如果解析失败，使用原始请求体
      }
    }
    
    const response = await fetchWithAuth(input, modifiedInit);
    
    // 如果不是流式响应，直接返回
    if (!response.body || !onConversationCreated) {
      return response;
    }
    
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let conversationIdExtracted = false;
    
    const stream = new ReadableStream({
      async start(controller) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            controller.close();
            break;
          }
          
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          
          for (const line of lines) {
            const customData = parseVercelAgentCustomDataLine(line);
            if (customData) {
              if (!conversationIdExtracted && customData.conversationId) {
                onConversationCreated(customData.conversationId);
                conversationIdExtracted = true;
              }
              customData.awaitingTools.forEach((toolEvent) => {
                if (!onAwaitingToolConfirmation) {
                  return;
                }
                onAwaitingToolConfirmation({
                  id: toolEvent.toolCallId,
                  name: toolEvent.toolName || 'Unknown Tool',
                  status: 'awaiting_input',
                  confirmationId: toolEvent.confirmationId,
                  input: toolEvent.input as any,
                  message: toolEvent.message,
                });
              });
            }
            
            // 将原始数据传递给下游
            controller.enqueue(new TextEncoder().encode(line + '\n'));
          }
        }
      }
    });
    
    return new Response(stream, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
  };
}

/**
 * useAgentChat Hook
 */
export function useAgentChat(
  options: UseAgentChatOptions = {}
): UseAgentChatReturn {
  const {
    conversationId,
    initialMessages = [],
    loadHistory = false,
    onToolConfirmation,
    onConversationCreated,
    llm,
  } = options;

  // 使用 ref 存储最新上下文，确保 transport 每次请求拿到最新值
  const conversationIdRef = useRef(conversationId);
  useEffect(() => {
    conversationIdRef.current = conversationId;
  }, [conversationId]);

  const llmRef = useRef(llm);
  useEffect(() => {
    llmRef.current = llm;
  }, [llm]);

  const composerContextQueueRef = useRef<AgentComposerContext[]>([]);
  const [input, setInput] = useState('');

  const [pendingConfirmations, setPendingConfirmations] = useState<ToolState[]>([]);

  const fetchWithConversationId = useCallback(
    createFetchWithConversationId(
      onConversationCreated,
      () => conversationIdRef.current,
      (tool) => {
        setPendingConfirmations((prev) => {
          if (prev.some((item) => item.id === tool.id)) {
            return prev;
          }
          return [...prev, tool];
        });
      },
      () => composerContextQueueRef.current.shift(),
      () => llmRef.current,
    ),
    [onConversationCreated],
  );

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: '/v1/agent/chat?format=vercel-ai',
        body: () => {
          const payload: Record<string, unknown> = {};
          const currentConversationId = conversationIdRef.current;
          if (currentConversationId && currentConversationId !== 'new') {
            payload.conversationId = currentConversationId;
          }
          if (llmRef.current) {
            payload.llm = llmRef.current;
          }
          return payload;
        },
        fetch: fetchWithConversationId as typeof globalThis.fetch,
      }),
    [fetchWithConversationId],
  );

  const chat = useChat({
    transport,
    messages: toUiMessages(initialMessages),
  });
  const messages = useMemo(() => toLegacyMessages(chat.messages), [chat.messages]);
  const isLoading = chat.status === 'submitted' || chat.status === 'streaming';

  const messagesIdsStringRef = useRef('');

  useEffect(() => {
    const currentMessagesIdsString = chat.messages.map((message) => message.id).join(',');
    if (currentMessagesIdsString === messagesIdsStringRef.current) {
      return;
    }
    messagesIdsStringRef.current = currentMessagesIdsString;

    const toolStates = extractToolStates(chat.messages);
    const pending = toolStates.filter(
      (toolState) => toolState.status === 'awaiting_input' || toolState.status === 'running',
    );
    setPendingConfirmations(pending);

    if (onToolConfirmation) {
      pending.forEach((tool) => {
        if (tool.status === 'awaiting_input') {
          onToolConfirmation(tool);
        }
      });
    }
  }, [chat.messages, onToolConfirmation]);

  useEffect(() => {
    if (loadHistory && conversationId && initialMessages.length === 0) {
      api.conversations
        .getMessages({ conversationId })
        .then(() => {
          console.warn(
            'useAgentChat: loadHistory is deprecated. ' +
              'Please use useConversationHistory in component level and pass messages as initialMessages.',
          );
        })
        .catch((error) => {
          console.error('Failed to load conversation history:', error);
        });
    }
  }, [loadHistory, conversationId, initialMessages.length]);

  // 确认工具
  const confirmTool = useCallback(
    async (id: string, payload?: Record<string, any>) => {
      try {
        const toolState = pendingConfirmations.find((t) => t.id === id);
        if (!toolState?.confirmationId) {
          throw new Error('Tool confirmation ID not found');
        }

        await api.toolConfirmations.confirm({
          id: toolState.confirmationId,
          payload,
        });

        setPendingConfirmations((prev) => prev.filter((t) => t.id !== id));

        if (onToolConfirmation) {
          onToolConfirmation({
            ...toolState,
            status: 'succeeded',
          });
        }
      } catch (error) {
        console.error('Failed to confirm tool:', error);
        throw error;
      }
    },
    [pendingConfirmations, onToolConfirmation],
  );

  const rejectTool = useCallback(
    async (id: string, reason?: string) => {
      try {
        const toolState = pendingConfirmations.find((t) => t.id === id);
        if (!toolState?.confirmationId) {
          throw new Error('Tool confirmation ID not found');
        }

        await api.toolConfirmations.reject({
          id: toolState.confirmationId,
          reason,
        });

        setPendingConfirmations((prev) => prev.filter((t) => t.id !== id));

        if (onToolConfirmation) {
          onToolConfirmation({
            ...toolState,
            status: 'failed',
            error: {
              code: 'rejected',
              message: reason || 'Tool rejected by user',
            },
          });
        }
      } catch (error) {
        console.error('Failed to reject tool:', error);
        throw error;
      }
    },
    [pendingConfirmations, onToolConfirmation],
  );

  const sendMessage = useCallback((message: string, options?: SendMessageOptions) => {
    const composerContext = normalizeComposerContext(options?.composerContext);
    if (composerContext) {
      composerContextQueueRef.current.push(composerContext);
    }

    void chat.sendMessage({
      text: message,
    });
    setInput('');
  }, [chat]);

  const stop = useCallback(() => {
    chat.stop();
  }, [chat]);

  const reload = useCallback(() => {
    void chat.regenerate();
  }, [chat]);

  return {
    messages,
    sendMessage,
    input,
    setInput,
    isLoading,
    error: chat.error,
    stop,
    reload,
    pendingConfirmations,
    confirmTool,
    rejectTool,
  };
}
