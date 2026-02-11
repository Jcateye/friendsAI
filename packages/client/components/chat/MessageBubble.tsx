import type { Message } from '@/types';
import ReactMarkdown from 'react-markdown';
import { Bot } from 'lucide-react';


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
                  <span>{tool.name}</span>
                </div>
                {tool.result && (
                  <div className="mt-1 text-gray-600">{tool.result}</div>
                )}
              </div>
            ))}
          </div>
        )}
        {isUser ? (
          <p className="text-sm leading-relaxed whitespace-pre-wrap text-white">
            {message.content}
          </p>
        ) : (
          <div className="text-sm leading-relaxed text-gray-900 [&_a]:text-blue-600 [&_a]:underline [&_a]:break-all [&_code]:rounded [&_code]:bg-black/5 [&_code]:px-1 [&_code]:py-0.5 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-black/5 [&_pre]:p-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5">
            <ReactMarkdown
              allowedElements={[
                'p',
                'br',
                'strong',
                'em',
                'del',
                'ul',
                'ol',
                'li',
                'blockquote',
                'code',
                'pre',
                'a',
                'h1',
                'h2',
                'h3',
                'h4',
                'h5',
                'h6',
              ]}
              skipHtml
              components={{
                a: ({ href, children, ...props }) => {
                  const safeHref =
                    href && /^(https?:|mailto:)/i.test(href) ? href : undefined;

                  return (
                    <a
                      {...props}
                      href={safeHref}
                      rel="noopener noreferrer nofollow"
                      target="_blank"
                    >
                      {children}
                    </a>
                  );
                },
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}
