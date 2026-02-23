import { useState } from 'react';
import { Brain, ChevronDown, ChevronUp } from 'lucide-react';

export function ThinkingProcess({ content }: { content: string }) {
    const [isExpanded, setIsExpanded] = useState(true);

    if (!content) return null;

    return (
        <div className="w-full bg-border rounded-[10px] p-3 flex flex-col gap-2 mb-2">
            <button
                className="w-full flex justify-between items-center bg-transparent border-none p-0 cursor-pointer"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center gap-2">
                    <Brain className="w-3.5 h-3.5 text-text-secondary" />
                    <span className="text-text-secondary font-primary text-[12px] font-semibold">
                        思考过程{isExpanded ? '' : '（已折叠）'}
                    </span>
                </div>
                {isExpanded ? (
                    <ChevronUp className="w-3.5 h-3.5 text-text-secondary" />
                ) : (
                    <ChevronDown className="w-3.5 h-3.5 text-text-secondary" />
                )}
            </button>

            {isExpanded && (
                <div className="w-full flex flex-col gap-1.5 pl-[22px] opacity-80 mt-1">
                    {content.split('\n').filter(Boolean).map((line, i) => (
                        <p key={i} className="m-0 text-text-secondary font-primary text-[12px] font-normal leading-relaxed">
                            {line}
                        </p>
                    ))}
                </div>
            )}
        </div>
    );
}
