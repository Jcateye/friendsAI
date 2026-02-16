import { useState, useEffect } from 'react';
import type { Message } from '../lib/api/types';
import { api } from '../lib/api/client';

export interface UseConversationHistoryOptions {
  conversationId?: string;
  limit?: number;
  before?: string;
  enabled?: boolean;
}

export function useConversationHistory(options: UseConversationHistoryOptions = {}) {
  const { conversationId, limit, before, enabled = true } = options;
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!enabled || !conversationId) {
      setMessages([]);
      return;
    }

    setLoading(true);
    setError(null);

    api.conversations
      .getMessages({
        conversationId,
        limit,
        before,
      })
      .then((data) => {
        setMessages(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err : new Error('Failed to load messages'));
        setLoading(false);
      });
  }, [conversationId, limit, before, enabled]);

  return {
    messages,
    loading,
    error,
  };
}

export type UseConversationHistoryReturn = ReturnType<typeof useConversationHistory>;
