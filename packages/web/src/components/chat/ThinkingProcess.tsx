import { useEffect, useState } from 'react';
import { Brain, ChevronDown, ChevronUp } from 'lucide-react';

export function ThinkingProcess({
  content,
  isStreaming = false,
}: {
  content: string;
  isStreaming?: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(isStreaming);

  useEffect(() => {
    setIsExpanded(isStreaming);
  }, [isStreaming]);

  if (!content) return null;

  return (
    <div className="mb-2 flex w-full min-w-0 flex-col gap-2 rounded-[10px] bg-border p-3">
      <button
        type="button"
        aria-expanded={isExpanded}
        className="flex w-full cursor-pointer items-center justify-between border-none bg-transparent p-0 text-left"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <Brain className="h-3.5 w-3.5 text-text-secondary" />
          <span className="font-primary text-[12px] font-semibold text-text-secondary">
            思考过程{isExpanded ? '' : '（已折叠）'}
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp className="h-3.5 w-3.5 text-text-secondary" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 text-text-secondary" />
        )}
      </button>

      {isExpanded && (
        <div className="mt-1 flex w-full min-w-0 flex-col gap-1.5 pl-[22px] opacity-80">
          {content.split('\n').filter(Boolean).map((line, i) => (
            <p
              key={i}
              className="m-0 break-words font-primary text-[12px] font-normal leading-relaxed text-text-secondary [overflow-wrap:anywhere]"
            >
              {line}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
