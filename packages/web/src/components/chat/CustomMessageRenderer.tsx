import { useMessage } from '@assistant-ui/react';
import { A2UIRenderer, ToolTraceCard } from '../a2ui';
import type { A2UIDocument, A2UIAction } from '../a2ui/types';

interface ToolInvocation {
  toolCallId?: string;
  toolName?: string;
  state?: string;
  args?: unknown;
  result?: unknown;
  error?: unknown;
}

interface MessageLike {
  id?: string;
  role?: string;
  content?: unknown;
  metadata?: unknown;
  toolInvocations?: ToolInvocation[];
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function renderMessageContent(content: unknown): React.ReactNode {
  if (typeof content === 'string') {
    return renderMarkdown(content);
  }

  if (Array.isArray(content)) {
    return content.map((part, index) => {
      if (typeof part === 'string') {
        return <span key={index}>{renderMarkdown(part)}</span>;
      }

      if (isObject(part) && typeof part.text === 'string') {
        return <span key={index}>{renderMarkdown(part.text)}</span>;
      }

      return <span key={index}>{String(part)}</span>;
    });
  }

  if (content === null || content === undefined) {
    return null;
  }

  return String(content);
}

/**
 * 简单的 Markdown 渲染器
 * 支持：**粗体**、*斜体*、`代码`、```代码块```、链接
 */
function renderMarkdown(content: string): React.ReactNode {
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
  const codeBlocks: Array<{ id: string; lang?: string; content: string }> = [];
  let processedContent = content.replace(codeBlockRegex, (_match, lang, code) => {
    const id = `code-${codeBlocks.length}`;
    codeBlocks.push({ id, lang, content: code });
    return `__CODE_BLOCK_${id}__`;
  });

  const elements: Array<{ id: string; node: React.ReactNode }> = [];
  let elementKey = 0;

  processedContent = processedContent.replace(/`([^`]+)`/g, (_, code) => {
    const id = `inline-code-${elementKey++}`;
    elements.push({
      id,
      node: (
        <code
          key={id}
          className="bg-bg-surface px-1.5 py-0.5 rounded text-[13px] font-mono text-text-primary"
        >
          {code}
        </code>
      ),
    });
    return `__ELEMENT_${id}__`;
  });

  processedContent = processedContent.replace(/\*\*([^*]+)\*\*/g, (_, bold) => {
    const id = `bold-${elementKey++}`;
    elements.push({
      id,
      node: <strong key={id} className="font-semibold">{bold}</strong>,
    });
    return `__ELEMENT_${id}__`;
  });

  processedContent = processedContent.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, (_, italic) => {
    const id = `italic-${elementKey++}`;
    elements.push({
      id,
      node: <em key={id} className="italic">{italic}</em>,
    });
    return `__ELEMENT_${id}__`;
  });

  processedContent = processedContent.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, url) => {
    const id = `link-${elementKey++}`;
    elements.push({
      id,
      node: (
        <a
          key={id}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline"
        >
          {label}
        </a>
      ),
    });
    return `__ELEMENT_${id}__`;
  });

  const lines = processedContent.split('\n');
  return (
    <>
      {lines.map((line, lineIdx) => {
        const codeBlockMatch = line.match(/__CODE_BLOCK_(code-\d+)__/);
        if (codeBlockMatch) {
          const codeBlock = codeBlocks.find((item) => item.id === codeBlockMatch[1]);
          if (codeBlock) {
            return (
              <div key={`line-${lineIdx}`} className="my-2">
                {codeBlock.lang && (
                  <div className="bg-bg-surface px-3 py-1.5 rounded-t-md border-b border-border">
                    <span className="text-[11px] font-mono text-text-muted uppercase">
                      {codeBlock.lang}
                    </span>
                  </div>
                )}
                <pre
                  className={`bg-bg-surface rounded-md p-3 overflow-x-auto ${
                    codeBlock.lang ? 'rounded-t-none' : ''
                  }`}
                >
                  <code className="text-[13px] font-mono text-text-primary whitespace-pre">
                    {codeBlock.content}
                  </code>
                </pre>
              </div>
            );
          }
        }

        const parts = line.split(/(__ELEMENT_\w+-\d+__)/);
        return (
          <span key={`line-${lineIdx}`}>
            {parts.map((part) => {
              const elementMatch = part.match(/__ELEMENT_(\w+-\d+)__/);
              if (elementMatch) {
                const element = elements.find((item) => item.id === elementMatch[1]);
                return element ? element.node : part;
              }
              return part;
            })}
            {lineIdx < lines.length - 1 && <br />}
          </span>
        );
      })}
    </>
  );
}

function InlineMessageRenderer({ message }: { message: MessageLike }) {
  const metadata = isObject(message.metadata)
    ? (message.metadata as Record<string, unknown>)
    : undefined;
  const a2uiData = metadata?.a2ui as A2UIDocument | undefined;

  const toolInvocations = Array.isArray(message.toolInvocations)
    ? message.toolInvocations
    : undefined;
  const isToolCall = Boolean(toolInvocations && toolInvocations.length > 0);

  const handleA2UIAction = (action: A2UIAction) => {
    console.log('A2UI Action:', action);
    if (action.type === 'custom' && action.name === 'confirm_tool') {
    }
  };

  const mapToolStateToStatus = (
    state: string,
  ): 'queued' | 'running' | 'succeeded' | 'failed' | 'awaiting_input' => {
    switch (state) {
      case 'call':
        return 'running';
      case 'result':
        return 'succeeded';
      case 'error':
        return 'failed';
      default:
        return 'queued';
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {message.content !== undefined && message.content !== null && (
        <div className="text-[15px] text-text-primary font-primary leading-relaxed">
          {renderMessageContent(message.content)}
        </div>
      )}

      {a2uiData && (
        <div className="mt-2">
          <A2UIRenderer document={a2uiData} onAction={handleA2UIAction} />
        </div>
      )}

      {isToolCall && (
        <div className="mt-2 space-y-2">
          {toolInvocations?.map((invocation, index) => {
            const toolNode = {
              type: 'custom' as const,
              name: 'tool-trace-card',
              props: {
                toolName: invocation.toolName || 'Unknown Tool',
                status: mapToolStateToStatus(invocation.state || 'queued'),
                input: invocation.args as Record<string, unknown> | undefined,
                output: invocation.result as Record<string, unknown> | undefined,
                error: invocation.error ? String(invocation.error) : undefined,
              },
              children: [],
            };

            return (
              <ToolTraceCard
                key={invocation.toolCallId || `tool-${toolNode.props.toolName}-${index}`}
                node={toolNode}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

export function CustomMessageRenderer({ message: messageProp }: { message?: MessageLike } = {}) {
  if (messageProp) {
    return <InlineMessageRenderer message={messageProp as MessageLike} />;
  }

  const message = useMessage();

  if (!message) {
    return null;
  }

  return <InlineMessageRenderer message={message as unknown as MessageLike} />;
}
