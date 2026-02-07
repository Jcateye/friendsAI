import { useMessage } from '@assistant-ui/react';
import { A2UIRenderer, ToolTraceCard } from '../a2ui';
import type { A2UIDocument, A2UIAction } from '../a2ui/types';
import type { Message as AISDKMessage } from 'ai';

/**
 * 简单的 Markdown 渲染器
 * 支持：**粗体**、*斜体*、`代码`、```代码块```、链接
 */
function renderMarkdown(content: string): React.ReactNode {
  // 先处理代码块（避免代码块内的内容被其他规则处理）
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
  const codeBlocks: Array<{ id: string; lang?: string; content: string }> = [];
  let processedContent = content.replace(codeBlockRegex, (_match, lang, code) => {
    const id = `code-${codeBlocks.length}`;
    codeBlocks.push({ id, lang, content: code });
    return `__CODE_BLOCK_${id}__`;
  });

  // 处理行内格式
  const elements: Array<{ id: string; node: React.ReactNode }> = [];
  let elementKey = 0;

  // 行内代码
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

  // 粗体
  processedContent = processedContent.replace(/\*\*([^*]+)\*\*/g, (_, bold) => {
    const id = `bold-${elementKey++}`;
    elements.push({
      id,
      node: <strong key={id} className="font-semibold">{bold}</strong>,
    });
    return `__ELEMENT_${id}__`;
  });

  // 斜体（避免与粗体冲突）
  processedContent = processedContent.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, (_, italic) => {
    const id = `italic-${elementKey++}`;
    elements.push({
      id,
      node: <em key={id} className="italic">{italic}</em>,
    });
    return `__ELEMENT_${id}__`;
  });

  // 链接
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

  // 按行分割并渲染
  const lines = processedContent.split('\n');
  return (
    <>
      {lines.map((line, lineIdx) => {
        // 检查是否是代码块占位符
        const codeBlockMatch = line.match(/__CODE_BLOCK_(code-\d+)__/);
        if (codeBlockMatch) {
          const codeBlock = codeBlocks.find((cb) => cb.id === codeBlockMatch[1]);
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

        // 处理普通行，替换元素占位符
        const parts = line.split(/(__ELEMENT_\w+-\d+__)/);
        return (
          <span key={`line-${lineIdx}`}>
            {parts.map((part) => {
              const elementMatch = part.match(/__ELEMENT_(\w+-\d+)__/);
              if (elementMatch) {
                const element = elements.find((el) => el.id === elementMatch[1]);
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

/**
 * 内联消息渲染器（不使用 useMessage）
 */
function InlineMessageRenderer({ message }: { message: AISDKMessage }) {
  // 检查是否有 A2UI 数据
  const metadata = message.metadata as { a2ui?: A2UIDocument } | undefined;
  const a2uiData = metadata?.a2ui;

  // 检查是否是工具调用消息
  // @ts-expect-error - toolInvocations may exist in runtime but not in types
  const toolInvocations = message.toolInvocations as Array<{
    toolCallId?: string;
    toolName?: string;
    state?: string;
    args?: unknown;
    result?: unknown;
    error?: unknown;
  }> | undefined;
  const isToolCall = toolInvocations && toolInvocations.length > 0;

  // 处理 A2UI action 回调
  const handleA2UIAction = (action: A2UIAction) => {
    console.log('A2UI Action:', action);
    if (action.type === 'custom' && action.name === 'confirm_tool') {
      // 处理工具确认
    }
  };

  // 将 toolInvocation 状态映射到 ToolTraceCard 的 status
  const mapToolStateToStatus = (state: string): 'queued' | 'running' | 'succeeded' | 'failed' | 'awaiting_input' => {
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

  // 获取消息内容
  const messageContent = message.content;

  return (
    <div className="flex flex-col gap-2">
      {/* 消息内容 */}
      {messageContent && (
        <div className="text-[15px] text-text-primary font-primary leading-relaxed">
          {typeof messageContent === 'string'
            ? renderMarkdown(messageContent)
            : Array.isArray(messageContent)
            ? messageContent.map((part, idx) =>
                typeof part === 'string' ? renderMarkdown(part) : <span key={idx}>{String(part)}</span>
              )
            : String(messageContent)}
        </div>
      )}

      {/* A2UI 组件渲染 */}
      {a2uiData && (
        <div className="mt-2">
          <A2UIRenderer document={a2uiData} onAction={handleA2UIAction} />
        </div>
      )}

      {/* 工具调用状态 */}
      {isToolCall && (
        <div className="mt-2 space-y-2">
          {toolInvocations?.map((invocation, idx) => {
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
                key={invocation.toolCallId || `tool-${toolNode.props.toolName}-${idx}`}
                node={toolNode}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * 自定义消息渲染器
 *
 * 处理：
 * - 普通文本消息（支持 Markdown 格式）
 * - A2UI 组件（通过 metadata.a2ui）
 * - 工具执行状态（ToolTraceCard）
 *
 * 当传入 message prop 时，直接渲染（用于非 Thread 上下文）
 * 当不传 message prop 时，从 useMessage 获取（用于 Assistant-UI Thread 组件）
 */
export function CustomMessageRenderer({ message: messageProp }: { message?: AISDKMessage } = {}) {
  // 如果传入了 message prop，直接渲染
  if (messageProp) {
    return <InlineMessageRenderer message={messageProp} />;
  }

  // 否则从 useMessage 获取（用于 Assistant-UI Thread 组件）
  const message = useMessage();

  if (!message) {
    return null;
  }

  return <InlineMessageRenderer message={message} />;
}

