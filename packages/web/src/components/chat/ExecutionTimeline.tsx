import type { ExecutionTrace } from '../../hooks/useAgentChat';

function statusLabel(status: string): string {
  switch (status) {
    case 'queued':
      return '已排队';
    case 'running':
      return '执行中';
    case 'succeeded':
      return '已完成';
    case 'failed':
      return '失败';
    case 'cancelled':
      return '已取消';
    case 'awaiting_input':
      return '等待确认';
    case 'skipped':
      return '已跳过';
    default:
      return status;
  }
}

function statusDotClass(status: string): string {
  switch (status) {
    case 'succeeded':
      return 'bg-green-500';
    case 'failed':
      return 'bg-red-500';
    case 'awaiting_input':
      return 'bg-amber-500';
    case 'running':
      return 'bg-blue-500';
    default:
      return 'bg-text-muted';
  }
}

function kindLabel(kind: string): string {
  switch (kind) {
    case 'tool':
      return '工具';
    case 'skill':
      return '技能';
    case 'agent':
      return '智能体';
    default:
      return kind;
  }
}

function renderPayload(payload: unknown): string | null {
  if (payload === null || payload === undefined) {
    return null;
  }

  if (typeof payload === 'string') {
    return payload;
  }

  try {
    const json = JSON.stringify(payload, null, 2);
    return json.length > 360 ? `${json.slice(0, 357)}...` : json;
  } catch {
    return String(payload);
  }
}

export function ExecutionTimeline({ trace }: { trace: ExecutionTrace }) {
  if (!trace.steps.length) {
    return null;
  }

  return (
    <div className="w-full rounded-[14px] border border-border bg-bg-surface/80 px-3 py-3">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-[12px] font-semibold text-text-secondary">执行过程</div>
        <div className="text-[11px] text-text-muted">
          {trace.status ? statusLabel(trace.status) : `${trace.steps.length} 个节点`}
        </div>
      </div>

      <div className="space-y-3">
        {trace.steps.map((step, index) => {
          const payloadText = renderPayload(step.output ?? step.input);
          const errorText = renderPayload(step.error);

          return (
            <div key={step.id} className="flex gap-3">
              <div className="flex w-4 flex-col items-center">
                <span className={`mt-1 h-2.5 w-2.5 rounded-full ${statusDotClass(step.status)}`} />
                {index < trace.steps.length - 1 ? (
                  <span className="mt-1 h-full min-h-[28px] w-px bg-border" />
                ) : null}
              </div>

              <div className="min-w-0 flex-1 pb-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="text-[13px] font-medium text-text-primary">{step.title}</span>
                  <span className="text-[11px] text-text-muted">{kindLabel(step.kind)}</span>
                  <span className="text-[11px] text-text-muted">{statusLabel(step.status)}</span>
                </div>

                {step.message ? (
                  <div className="mt-1 text-[12px] leading-relaxed text-text-secondary">{step.message}</div>
                ) : null}

                {payloadText ? (
                  <pre className="mt-2 overflow-x-auto rounded-[10px] bg-bg-card px-2.5 py-2 text-[11px] leading-relaxed text-text-muted">
                    {payloadText}
                  </pre>
                ) : null}

                {errorText ? (
                  <pre className="mt-2 overflow-x-auto rounded-[10px] bg-red-500/10 px-2.5 py-2 text-[11px] leading-relaxed text-red-300">
                    {errorText}
                  </pre>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
