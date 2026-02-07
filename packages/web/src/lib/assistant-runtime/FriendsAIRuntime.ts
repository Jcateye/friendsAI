import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocalRuntime } from '@assistant-ui/react';
import { useAgentChat } from '../../hooks/useAgentChat';
import type { ToolState } from '../../lib/api/types';

export interface UseFriendsAIRuntimeOptions {
  conversationId?: string;
  onToolConfirmation?: (tool: ToolState) => void;
  initialMessages?: Array<{
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
  }>;
}

/**
 * FriendsAI 自定义运行时
 *
 * 使用 Vercel AI SDK 的 useChat hook 与后端流式接口集成
 * 通过 useLocalRuntime 创建 Assistant-UI 运行时，并同步 useChat 的状态
 */
export function useFriendsAIRuntime(options: UseFriendsAIRuntimeOptions = {}) {
  const { conversationId, onToolConfirmation, initialMessages } = options;

  const chat = useAgentChat({
    conversationId,
    initialMessages: initialMessages?.map((msg) => ({
      id: msg.id,
      role: msg.role,
      content: msg.content,
      createdAt: new Date(),
    })),
    onToolConfirmation,
  });

  // 将 useChat 的消息转换为 Assistant-UI RuntimeMessage 格式
  const messagesIdsStringRef = useRef('');
  const [isInitialized, setIsInitialized] = useState(false);
  const initialMessagesRef = useRef<any[]>([]);

  // 转换消息格式
  const runtimeMessages = useMemo(() => {
    const currentIdsString = chat.messages.map(m => m.id).join(',');
    messagesIdsStringRef.current = currentIdsString;

    return chat.messages.map((msg) => {
      if (msg.role === 'user') {
        return {
          id: msg.id,
          role: 'user',
          content: [{ type: 'text', text: msg.content || '' }],
        } as const;
      } else {
        return {
          id: msg.id,
          role: 'assistant',
          content: [{ type: 'text', text: msg.content || '' }],
        } as const;
      }
    });
  }, [chat.messages.length]);

  // 初始化
  useEffect(() => {
    if (!isInitialized && runtimeMessages.length > 0) {
      initialMessagesRef.current = runtimeMessages;
      setIsInitialized(true);
    }
  }, [runtimeMessages.length, isInitialized]);

  const runtime = useLocalRuntime({
    initialMessages: initialMessagesRef.current,
  });

  return runtime;
}
