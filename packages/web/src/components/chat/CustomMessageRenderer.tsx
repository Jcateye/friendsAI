import { useMessage } from '@assistant-ui/react';
import { A2UIRenderer, ToolTraceCard } from '../a2ui';
import type { A2UIDocument, A2UIAction } from '../a2ui/types';
import { ThinkingProcess } from './ThinkingProcess';
import { ExecutionTimeline } from './ExecutionTimeline';
import type { ExecutionTrace } from '../../hooks/useAgentChat';

function normalizeThinkTags(content: string): string {
  return content
    .replace(/&lt;think&gt;/gi, '<think>')
    .replace(/&lt;\/think&gt;/gi, '</think>');
}

function extractThinkingProcess(content: string): { thinking: string | null; rest: string } {
  const normalizedContent = normalizeThinkTags(content);
  const thinkRegex = /<think>([\s\S]*?)<\/think>/gi;
  const matches = Array.from(normalizedContent.matchAll(thinkRegex));
  if (matches.length > 0) {
    const thinking = matches
      .map((item) => (item[1] ?? '').trim())
      .filter((item) => item.length > 0)
      .join('\n');
    return {
      thinking: thinking.length > 0 ? thinking : null,
      rest: normalizedContent.replace(thinkRegex, '').trim(),
    };
  }
  const openThinkRegex = /<think>([\s\S]*)$/i;
  const openMatch = normalizedContent.match(openThinkRegex);
  if (openMatch) {
    return {
      thinking: openMatch[1].trim(),
      rest: normalizedContent.replace(openMatch[0], '').trim(),
    };
  }
  return { thinking: null, rest: normalizedContent };
}

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

interface CustomMessageRendererProps {
  message?: MessageLike;
  isStreaming?: boolean;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isExecutionTrace(value: unknown): value is ExecutionTrace {
  return (
    isObject(value) &&
    Array.isArray((value as { steps?: unknown }).steps)
  );
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
          className="break-all text-primary hover:underline [overflow-wrap:anywhere]"
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
                  className={`bg-bg-surface rounded-md p-3 overflow-x-auto ${codeBlock.lang ? 'rounded-t-none' : ''
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

function InlineMessageRenderer({
  message,
  isStreaming = false,
}: {
  message: MessageLike;
  isStreaming?: boolean;
}) {
  const metadata = isObject(message.metadata)
    ? (message.metadata as Record<string, unknown>)
    : undefined;
  const a2uiData = metadata?.a2ui as A2UIDocument | undefined;
  const executionTrace = isExecutionTrace(metadata?.executionTrace)
    ? metadata.executionTrace
    : undefined;

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

  let thinkingContent: string | null = null;
  let actualContent = message.content;

  if (typeof message.content === 'string') {
    const extracted = extractThinkingProcess(message.content);
    thinkingContent = extracted.thinking;
    actualContent = extracted.rest;
  } else if (Array.isArray(message.content)) {
    const newArray = [...message.content];
    for (let i = 0; i < newArray.length; i++) {
      if (typeof newArray[i] === 'string') {
        const extracted = extractThinkingProcess(newArray[i] as string);
        if (extracted.thinking) {
          thinkingContent = (thinkingContent ? thinkingContent + '\n' : '') + extracted.thinking;
          newArray[i] = extracted.rest;
        }
      } else if (isObject(newArray[i]) && typeof newArray[i].text === 'string') {
        const extracted = extractThinkingProcess(newArray[i].text as string);
        if (extracted.thinking) {
          thinkingContent = (thinkingContent ? thinkingContent + '\n' : '') + extracted.thinking;
          newArray[i] = { ...newArray[i], text: extracted.rest };
        }
      }
    }
    actualContent = newArray;
  }

  return (
    <div className="flex flex-col gap-2">
      {executionTrace && executionTrace.steps.length > 0 ? (
        <ExecutionTimeline trace={executionTrace} isStreaming={isStreaming} />
      ) : null}

      {thinkingContent && <ThinkingProcess content={thinkingContent} isStreaming={isStreaming} />}

      {actualContent !== undefined && actualContent !== null && actualContent !== '' && (
        <div className="min-w-0 break-words text-[15px] font-primary leading-relaxed text-text-primary [overflow-wrap:anywhere]">
          {renderMessageContent(actualContent)}
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

export function CustomMessageRenderer({
  message: messageProp,
  isStreaming = false,
}: CustomMessageRendererProps = {}) {
  if (messageProp) {
    return <InlineMessageRenderer message={messageProp as MessageLike} isStreaming={isStreaming} />;
  }

  const message = useMessage();

  if (!message) {
    return null;
  }

  return <InlineMessageRenderer message={message as unknown as MessageLike} isStreaming={isStreaming} />;
}
