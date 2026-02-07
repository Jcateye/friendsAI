/**
 * useAgentChat Hook
 * 封装 Vercel AI SDK 的 useChat，添加 FriendsAI 特定功能
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useChat } from 'ai/react';
import type { Message as AISDKMessage } from 'ai';
import type { ToolState } from '../lib/api/types';
import { api } from '../lib/api/client';

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
}

export interface UseAgentChatReturn {
  /**
   * 消息列表（来自 useChat）
   */
  messages: AISDKMessage[];
  /**
   * 发送消息
   */
  sendMessage: (message: string) => void;
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
 * 自定义 fetch 函数，添加认证头
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

  return fetch(input, {
    ...init,
    headers,
  });
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
  } = options;

  // 使用 Vercel AI SDK 的 useChat，传入自定义 fetch 来添加认证
  // 使用函数形式的 body 来支持动态 conversationId
  const chat = useChat({
    api: '/v1/agent/chat?format=vercel-ai',
    body: () => ({
      conversationId,
    }),
    initialMessages,
    fetch: fetchWithAuth as typeof globalThis.fetch,
  });

  // 工具确认状态管理
  const [pendingConfirmations, setPendingConfirmations] = useState<
    ToolState[]
  >([]);

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
  const sendMessage = useCallback((message: string) => {
    chat.append({
      role: 'user',
      content: message,
      createdAt: new Date(), // 确保新消息有正确的时间戳
    });
  }, [chat]);

  return {
    ...chat,
    sendMessage,
    pendingConfirmations,
    confirmTool,
    rejectTool,
  };
}
