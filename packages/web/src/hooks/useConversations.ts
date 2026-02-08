/**
 * useConversations Hook
 * 管理会话列表，支持创建新会话
 */

import { useState, useEffect, useCallback } from 'react';
import type { Conversation, CreateConversationRequest } from '../lib/api/types';
import { api } from '../lib/api/client';

export interface UseConversationsOptions {
  /**
   * 是否自动加载
   */
  autoLoad?: boolean;
}

export interface UseConversationsReturn {
  /**
   * 会话列表
   */
  conversations: Conversation[];
  /**
   * 是否正在加载
   */
  isLoading: boolean;
  /**
   * 错误信息
   */
  error: Error | null;
  /**
   * 重新加载会话列表
   */
  reload: () => Promise<void>;
  /**
   * 创建新会话
   */
  createConversation: (
    data?: CreateConversationRequest
  ) => Promise<Conversation>;
}

/**
 * useConversations Hook
 */
export function useConversations(
  options: UseConversationsOptions = {}
): UseConversationsReturn {
  const { autoLoad = true } = options;

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  /**
   * 加载会话列表
   */
  const loadConversations = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await api.conversations.list();
      setConversations(data);
    } catch (err) {
      const error =
        err instanceof Error ? err : new Error('Failed to load conversations');
      setError(error);
      console.error('Failed to load conversations:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * 创建新会话
   */
  const createConversation = useCallback(
    async (data: CreateConversationRequest = {}): Promise<Conversation> => {
      try {
        const newConversation = await api.conversations.create(data);
        // 将新会话添加到列表开头
        setConversations((prev) => [newConversation, ...prev]);
        return newConversation;
      } catch (err) {
        const error =
          err instanceof Error
            ? err
            : new Error('Failed to create conversation');
        console.error('Failed to create conversation:', error);
        throw error;
      }
    },
    []
  );

  // 自动加载
  useEffect(() => {
    if (autoLoad) {
      loadConversations();
    }
  }, [autoLoad, loadConversations]);

  return {
    conversations,
    isLoading,
    error,
    reload: loadConversations,
    createConversation,
  };
}
