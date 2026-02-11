import { MessageBubble } from './MessageBubble';
import { ContactPreviewCard } from './ContactPreviewCard';
import type { Message } from '@/types';
import { ForwardedRef, forwardRef } from 'react';

interface MessageListProps {
  messages: Message[];
}

export const MessageList = forwardRef<HTMLDivElement, MessageListProps>(
  ({ messages }, ref) => {
    return (
      <div
        ref={ref}
        className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-4"
      >
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
      </div>
    );
  }
);

MessageList.displayName = 'MessageList';
