import { useMemo } from 'react';
import { useEdgeRuntime } from '@assistant-ui/react';
import type { CoreMessage } from '@assistant-ui/react';
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

function getAuthToken(): string | null {
  return localStorage.getItem('auth_token') || localStorage.getItem('token');
}

function toCoreMessage(message: {
  role: 'user' | 'assistant' | 'system';
  content: string;
}): CoreMessage {
  const textPart = { type: 'text' as const, text: message.content };

  if (message.role === 'assistant') {
    return {
      role: 'assistant',
      content: [textPart],
    };
  }

  if (message.role === 'system') {
    return {
      role: 'system',
      content: [textPart],
    };
  }

  return {
    role: 'user',
    content: [textPart],
  };
}

export function useFriendsAIRuntime(options: UseFriendsAIRuntimeOptions = {}) {
  const {
    conversationId,
    initialMessages,
    onToolConfirmation: _onToolConfirmation,
  } = options;

  const authHeaders = useMemo(() => {
    const token = getAuthToken();
    if (!token) {
      return undefined;
    }

    return {
      Authorization: `Bearer ${token}`,
    };
  }, []);

  const coreInitialMessages = useMemo<CoreMessage[]>(() => {
    return (initialMessages ?? []).map((message) => toCoreMessage(message));
  }, [initialMessages]);

  return useEdgeRuntime({
    api: '/v1/agent/chat?format=vercel-ai',
    headers: authHeaders,
    body: conversationId ? { conversationId } : {},
    initialMessages: coreInitialMessages,
  });
}
