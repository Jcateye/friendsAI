/**
 * useAgentChat Hook
 * 封装 Vercel AI SDK 的 useChat，添加 FriendsAI 特定功能
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useChat } from 'ai/react';
import type { Message as AISDKMessage } from 'ai';
import type { ToolState } from '../lib/api/types';
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
  initialMessages?: AISDKMessage[];
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
}

export interface UseAgentChatReturn {
  /**
   * 消息列表（来自 useChat）
   */
  messages: AISDKMessage[];
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
function extractToolStates(messages: AISDKMessage[]): ToolState[] {
  const toolStates: ToolState[] = [];

  for (const message of messages) {
    if (message.toolInvocations) {
      for (const toolInvocation of message.toolInvocations) {
        // 从 metadata 中获取确认 ID（如果存在）
        const confirmationId = (toolInvocation as any).confirmationId;

        const state = (toolInvocation as any).state;
        toolStates.push({
          id: toolInvocation.toolCallId,
          name: toolInvocation.toolName || 'Unknown Tool',
          status: (() => {
            if (state === 'result') return 'succeeded';
            if (state === 'call') return 'running';
            if (state === 'awaiting_input' || state === 'partial-call') return 'awaiting_input';
            return 'idle';
          })(),
          confirmationId,
          input: toolInvocation.args as any,
          output: (toolInvocation as any).result as any,
        });
      }
    }
  }

  return toolStates;
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
        const bodyObj = JSON.parse(bodyText);
        
        // 添加或更新 conversationId
        if (currentConversationId && currentConversationId !== 'new') {
          bodyObj.conversationId = currentConversationId;
        } else if (currentConversationId === 'new') {
          // 如果是 'new'，不设置 conversationId，让后端创建新会话
          delete bodyObj.conversationId;
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
  } = options;

  // 使用 ref 存储最新的 conversationId，确保 body 函数总是读取最新值
  const conversationIdRef = useRef(conversationId);
  useEffect(() => {
    conversationIdRef.current = conversationId;
  }, [conversationId]);

  const composerContextQueueRef = useRef<AgentComposerContext[]>([]);

  // 工具确认状态管理
  const [pendingConfirmations, setPendingConfirmations] = useState<
    ToolState[]
  >([]);

  // 创建一个包装的 fetch 函数来拦截流数据并解析 conversationId
  // 同时修改请求体以添加最新的 conversationId
  const fetchWithConversationId = useCallback(
    createFetchWithConversationId(
      onConversationCreated,
      () => conversationIdRef.current, // 提供获取最新 conversationId 的函数
      (tool) => {
        setPendingConfirmations((prev) => {
          if (prev.some((item) => item.id === tool.id)) {
            return prev;
          }
          return [...prev, tool];
        });
      },
      () => composerContextQueueRef.current.shift(),
    ),
    [onConversationCreated]
  );

  // 使用 Vercel AI SDK 的 useChat，传入自定义 fetch 来添加认证和动态 conversationId
  // 注意：Vercel AI SDK 的 body 参数不支持函数形式，所以我们在 fetch 中动态修改请求体
  const chat = useChat({
    api: '/v1/agent/chat?format=vercel-ai',
    body: conversationId && conversationId !== 'new' ? { conversationId } : {},
    initialMessages,
    fetch: fetchWithConversationId as typeof globalThis.fetch,
  });

  // 从消息中提取工具状态
  // 使用消息 ID 字符串来检测变化，避免因数组引用变化导致的无限循环
  const messagesIdsStringRef = useRef('');

  useEffect(() => {
    // 检查消息是否真的发生了变化（通过比较消息 ID 字符串）
    const currentMessagesIdsString = chat.messages.map(m => m.id).join(',');

    // 如果消息 ID 字符串没有变化，跳过处理
    if (currentMessagesIdsString === messagesIdsStringRef.current) {
      return;
    }

    // 更新引用
    messagesIdsStringRef.current = currentMessagesIdsString;

    const toolStates = extractToolStates(chat.messages);
    // 筛选需要确认的工具（awaiting_input 或 running 状态）
    const pending = toolStates.filter(
      (t) => t.status === 'awaiting_input' || t.status === 'running'
    );
    setPendingConfirmations(pending);

    // 如果有需要确认的工具，触发回调
    if (onToolConfirmation) {
      pending.forEach((tool) => {
        if (tool.status === 'awaiting_input') {
          onToolConfirmation(tool);
        }
      });
    }
  }, [chat.messages.length, onToolConfirmation]);

  // 加载历史消息
  // 注意：useChat 的 initialMessages 只在初始化时使用，不能动态更新
  // 如果需要在运行时加载历史消息，应该在组件层面使用 useConversationHistory
  // 然后将历史消息作为 initialMessages 传递给 useAgentChat
  useEffect(() => {
    if (loadHistory && conversationId && initialMessages.length === 0) {
      api.conversations
        .getMessages({ conversationId })
        .then(() => {
          // 注意：useChat 的 initialMessages 只在初始化时使用
          // 如果需要在运行时加载历史消息，应该在组件层面处理
          // 这里只是记录日志，实际的历史消息加载应该在组件层面完成
          console.warn(
            'useAgentChat: loadHistory is deprecated. ' +
            'Please use useConversationHistory in component level and pass messages as initialMessages.'
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
        // 查找工具确认 ID（从工具状态中获取）
        const toolState = pendingConfirmations.find((t) => t.id === id);
        if (!toolState?.confirmationId) {
          throw new Error('Tool confirmation ID not found');
        }

        await api.toolConfirmations.confirm({
          id: toolState.confirmationId,
          payload: payload,
        });

        // 从待确认列表中移除
        setPendingConfirmations((prev) =>
          prev.filter((t) => t.id !== id)
        );

        // 触发回调
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
    [pendingConfirmations, onToolConfirmation]
  );

  // 拒绝工具
  const rejectTool = useCallback(
    async (id: string, reason?: string) => {
      try {
        // 查找工具确认 ID
        const toolState = pendingConfirmations.find((t) => t.id === id);
        if (!toolState?.confirmationId) {
          throw new Error('Tool confirmation ID not found');
        }

        await api.toolConfirmations.reject({
          id: toolState.confirmationId,
          reason: reason,
        });

        // 从待确认列表中移除
        setPendingConfirmations((prev) =>
          prev.filter((t) => t.id !== id)
        );

        // 触发回调
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
    [pendingConfirmations, onToolConfirmation]
  );

  // 包装 append 为 sendMessage
  const sendMessage = useCallback((message: string, options?: SendMessageOptions) => {
    const composerContext = normalizeComposerContext(options?.composerContext);
    if (composerContext) {
      composerContextQueueRef.current.push(composerContext);
    }

    chat.append({
      role: 'user',
      content: message,
      createdAt: new Date(), // 确保新消息有正确的时间戳
    });
  }, [chat]);

  // 使用 ref 保存所有用户消息，防止 stop 时被移除
  const userMessagesRef = useRef<Map<string, AISDKMessage>>(new Map());
  
  // 监听消息变化，保存所有用户消息
  useEffect(() => {
    chat.messages.forEach((msg) => {
      if (msg.role === 'user') {
        userMessagesRef.current.set(msg.id, msg);
      }
    });
  }, [chat.messages]);

  // 包装 stop 方法，确保用户消息不会被移除
  const stop = useCallback(() => {
    // 调用原始的 stop 方法
    chat.stop();
    
    // 在下一个渲染周期后，检查并恢复被移除的用户消息
    setTimeout(() => {
      // 检查保存的用户消息是否还在 chat.messages 中
      const currentUserMessageIds = new Set(
        chat.messages.filter((msg) => msg.role === 'user').map((msg) => msg.id)
      );
      
      // 恢复所有被移除的用户消息
      userMessagesRef.current.forEach((savedMsg, savedId) => {
        if (!currentUserMessageIds.has(savedId)) {
          // 检查是否已经有相同内容的消息（通过内容匹配）
          const hasSameContent = chat.messages.some(
            (msg) => msg.role === 'user' && msg.content === savedMsg.content
          );
          
          // 如果没有相同内容的消息，重新添加
          if (!hasSameContent) {
            chat.append({
              role: 'user',
              content: savedMsg.content,
              createdAt: savedMsg.createdAt || new Date(),
              id: savedMsg.id, // 保持相同的 ID
            });
          }
        }
      });
    }, 0);
  }, [chat]);

  return {
    ...chat,
    sendMessage,
    stop,
    pendingConfirmations,
    confirmTool,
    rejectTool,
  };
}
