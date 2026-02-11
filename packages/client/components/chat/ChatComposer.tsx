import { Send, Mic, Plus, Image, Camera, FileVideo, Locate } from 'lucide-react';
import { useState } from 'react';

type ComposerTool = 'add' | 'image' | 'camera' | 'gif' | 'location';

interface ChatComposerProps {
  onSendMessage: (message: string) => void;
  onToolAction: (tool: ComposerTool) => void;
  onVoiceInput: () => void;
  disabled?: boolean;
}

const TOOL_ICONS: Array<{ Icon: typeof Plus; name: ComposerTool }> = [
  { Icon: Plus, name: 'add' },
  { Icon: Image, name: 'image' },
  { Icon: Camera, name: 'camera' },
  { Icon: FileVideo, name: 'gif' },
  { Icon: Locate, name: 'location' },
];

export function ChatComposer({
  onSendMessage,
  onToolAction,
  onVoiceInput,
  disabled = false,
}: ChatComposerProps) {
  const [input, setInput] = useState('');

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed) {
      return;
    }

    onSendMessage(trimmed);
    setInput('');
  };

  return (
    <div className="border-t border-gray-200 bg-[#F5F5F7] px-3 py-3">
      <div className="flex flex-col gap-1.5">
        <div className="flex h-7 items-center gap-4">
          {TOOL_ICONS.map(({ Icon, name }) => (
            <button
              key={name}
              type="button"
              onClick={() => onToolAction(name)}
              className="text-gray-400 transition-colors hover:text-gray-600"
              aria-label={name}
              disabled={disabled}
            >
              <Icon className="h-5 w-5" />
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="输入消息…"
            disabled={disabled}
            className="flex-1 rounded-[20px] border border-gray-200 bg-white px-4 py-2 text-sm placeholder-gray-400 focus:border-blue-500 focus:outline-none disabled:opacity-50"
          />

          <button
            type="button"
            onClick={onVoiceInput}
            className="flex h-9 w-9 items-center justify-center text-gray-900 transition-colors hover:text-gray-600"
            aria-label="Voice input"
            disabled={disabled}
          >
            <Mic className="h-5 w-5" />
          </button>

          <button
            type="button"
            onClick={handleSend}
            disabled={disabled || !input.trim()}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[#007AFF] text-white transition-colors hover:bg-blue-600 disabled:opacity-50"
            aria-label="Send message"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
