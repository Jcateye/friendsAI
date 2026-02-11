import type { Message } from '@/types';
import { User, Bot } from 'lucide-react';

interface MessageBubbleProps {
  message: Message;
}

const AVATAR_COLORS = {
  user: '#007AFF',
  assistant: '#E5E5EA',
} as const;

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className="max-w-[260px] rounded-[20px] px-3 py-3"
        style={{
          backgroundColor: isUser ? AVATAR_COLORS.user : AVATAR_COLORS.assistant,
        }}
      >
        {message.toolCalls && message.toolCalls.length > 0 && (
          <div className="mb-2 space-y-1">
            {message.toolCalls.map((tool) => (
              <div
                key={tool.id}
                className="rounded-lg bg-white/50 p-2 text-xs"
              >
                <div className="flex items-center gap-1 font-semibold">
                  <Bot className="h-3 w-3" />
                  <span>🔧 {tool.name}</span>
                </div>
                {tool.result && (
                  <div className="mt-1 text-gray-600">{tool.result}</div>
                )}
              </div>
            ))}
          </div>
        )}
        <p
          className={`text-sm leading-relaxed ${
            isUser ? 'text-white' : 'text-gray-900'
          }`}
        >
          {message.content}
        </p>
      </div>
    </div>
  );
}
