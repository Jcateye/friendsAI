import { MessageBubble } from './MessageBubble';
import { ContactPreviewCard } from './ContactPreviewCard';
import type { Message } from '@/types';
import { forwardRef } from 'react';


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
          <div key={message.id} className="flex flex-col">
            <MessageBubble message={message} />
            {message.contactCard && <ContactPreviewCard card={message.contactCard} />}
          </div>
        ))}
      </div>
    );
  }
);

MessageList.displayName = 'MessageList';
