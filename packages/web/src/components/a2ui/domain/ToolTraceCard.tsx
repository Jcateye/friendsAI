import { useState } from 'react';
import { ChevronDown, ChevronUp, Loader2, CheckCircle2, XCircle, Clock, AlertCircle } from 'lucide-react';
import { A2UIComponentProps } from '../types';
import { formatTimestamp, resolveEpochMs } from '../../../lib/time/timestamp';

type ToolStatus = 'queued' | 'running' | 'succeeded' | 'failed' | 'awaiting_input';

interface ToolTraceCardProps {
  toolName: string;
  status: ToolStatus;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: string;
  startedAt?: string;
  startedAtMs?: number;
  completedAt?: string;
  completedAtMs?: number;
}

export function ToolTraceCard({ node }: A2UIComponentProps) {
  if (node.type !== 'custom' || node.name !== 'tool-trace-card') {
    return null;
  }

  const props = (node.props || {}) as ToolTraceCardProps;
  const {
    toolName,
    status,
    input,
    output,
    error,
    startedAt,
    startedAtMs,
    completedAt,
    completedAtMs,
  } = props;

  const [isExpanded, setIsExpanded] = useState(false);

  const statusConfig: Record<ToolStatus, { icon: React.ReactNode; color: string; bgColor: string }> = {
    queued: {
      icon: <Clock className="w-4 h-4" />,
      color: 'text-text-muted',
      bgColor: 'bg-bg-surface',
    },
    running: {
      icon: <Loader2 className="w-4 h-4 animate-spin" />,
      color: 'text-info',
      bgColor: 'bg-info-tint',
    },
    succeeded: {
      icon: <CheckCircle2 className="w-4 h-4" />,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    failed: {
      icon: <XCircle className="w-4 h-4" />,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
    },
    awaiting_input: {
      icon: <AlertCircle className="w-4 h-4" />,
      color: 'text-warning',
      bgColor: 'bg-warning-tint',
    },
  };

  const config = statusConfig[status] || statusConfig.queued;

  const formatJson = (obj: unknown): string => {
    try {
      return JSON.stringify(obj, null, 2);
    } catch {
      return String(obj);
    }
  };

  const startedAtValue = resolveEpochMs(startedAtMs, startedAt);
  const completedAtValue = resolveEpochMs(completedAtMs, completedAt);

  return (
    <div
      className="bg-bg-card rounded-md p-3 border border-border"
      style={node.style}
      id={node.id}
      data-testid={node.testId}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-1">
          <div className={`p-1.5 rounded ${config.bgColor}`}>
            <div className={config.color}>{config.icon}</div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-text-primary font-primary truncate">
              {toolName}
            </p>
            <p className="text-xs text-text-secondary font-primary capitalize">
              {status.replace('_', ' ')}
            </p>
          </div>
        </div>

        {(input || output || error) && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 text-text-muted hover:text-text-primary"
          >
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        )}
      </div>

      {isExpanded && (
        <div className="mt-3 pt-3 border-t border-border space-y-3">
          {input && (
            <div>
              <p className="text-xs font-medium text-text-secondary font-primary mb-1">
                输入参数
              </p>
              <pre className="text-xs bg-bg-surface p-2 rounded overflow-x-auto font-mono text-text-primary">
                {formatJson(input)}
              </pre>
            </div>
          )}

          {output && (
            <div>
              <p className="text-xs font-medium text-text-secondary font-primary mb-1">
                输出结果
              </p>
              <pre className="text-xs bg-bg-surface p-2 rounded overflow-x-auto font-mono text-text-primary">
                {formatJson(output)}
              </pre>
            </div>
          )}

          {error && (
            <div>
              <p className="text-xs font-medium text-red-600 font-primary mb-1">
                错误信息
              </p>
              <p className="text-xs text-red-600 font-primary bg-red-50 p-2 rounded">
                {error}
              </p>
            </div>
          )}

          {startedAtValue !== null && (
            <p className="text-xs text-text-muted font-primary">
              开始时间: {formatTimestamp(startedAtValue, { locale: 'zh-CN' })}
            </p>
          )}
          {completedAtValue !== null && (
            <p className="text-xs text-text-muted font-primary">
              完成时间: {formatTimestamp(completedAtValue, { locale: 'zh-CN' })}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
