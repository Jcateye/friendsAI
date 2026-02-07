import { useState } from 'react';
import { Send } from 'lucide-react';

interface ChatComposerProps {
  onSendMessage?: (message: string) => void;
  disabled?: boolean;
}

/**
 * 聊天输入组件
 * 
 * 提供文本输入框和发送按钮
 * 可以与 Assistant-UI 运行时或直接与 useAgentChat 集成
 */
export function ChatComposer({ onSendMessage, disabled }: ChatComposerProps) {
  const [input, setInput] = useState('');

  // 如果提供了 onSendMessage，使用它
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!input.trim() || disabled) {
      return;
    }

    if (onSendMessage) {
      onSendMessage(input);
    }

    // 清空输入
    setInput('');
  };

  const isDisabled = disabled;

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2 p-4 bg-bg-card border-t border-border">
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="输入消息..."
        className="flex-1 px-4 py-2 bg-bg-surface rounded-md text-[15px] text-text-primary placeholder:text-text-muted outline-none focus:ring-2 focus:ring-primary font-primary"
        disabled={isDisabled}
      />
      <button
        type="submit"
        disabled={!input.trim() || isDisabled}
        className="w-10 h-10 flex items-center justify-center rounded-full bg-primary disabled:bg-text-muted disabled:opacity-50 transition-opacity"
      >
        <Send className="w-5 h-5 text-white" />
      </button>
    </form>
  );
}
