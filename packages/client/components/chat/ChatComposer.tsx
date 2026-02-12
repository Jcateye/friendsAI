import { Send, Mic, Plus, Grid } from 'lucide-react';
import { useState, useRef } from 'react';
import { FeishuBitableButton } from './FeishuBitableButton';
import { ToolsMenu, ToolMenuItemId } from './ToolsMenu';

export type ComposerTool = ToolMenuItemId | 'feishu_bitable';

interface ChatComposerProps {
  onSendMessage: (message: string) => void | Promise<void>;
  onToolAction: (tool: ComposerTool) => void | Promise<void>;
  onVoiceInput: () => void | Promise<void>;
  disabled?: boolean;
  isFeishuToolEnabled?: boolean;
  onToggleFeishuTool?: () => void;
}

export function ChatComposer({
  onSendMessage,
  onToolAction,
  onVoiceInput,
  disabled = false,
  isFeishuToolEnabled = false,
  onToggleFeishuTool,
}: ChatComposerProps) {
  const [input, setInput] = useState('');
  const [isToolsMenuOpen, setIsToolsMenuOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{ x: number; y: number } | undefined>(undefined);
  const plusButtonRef = useRef<HTMLButtonElement>(null);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed) {
      return;
    }

    onSendMessage(trimmed);
    setInput('');
  };

  const handleToolSelect = async (tool: ToolMenuItemId) => {
    await onToolAction(tool);
    setMenuPosition(undefined);
  };

  const handleCloseMenu = () => {
    setIsToolsMenuOpen(false);
    setMenuPosition(undefined);
  };

  const handleToggleToolsMenu = () => {
    if (!isToolsMenuOpen && plusButtonRef.current) {
      const rect = plusButtonRef.current.getBoundingClientRect();
      setMenuPosition({
        x: rect.left,
        y: rect.top - 8, // 菜单在按钮上方，留8px间距
      });
    }
    setIsToolsMenuOpen(!isToolsMenuOpen);
    if (isToolsMenuOpen) {
      setMenuPosition(undefined);
    }
  };

  return (
    <div className="relative border-t border-gray-200 bg-[#F5F5F7] px-3 py-3">
      {/* Tools Menu */}
      <ToolsMenu
        isOpen={isToolsMenuOpen}
        onClose={handleCloseMenu}
        onSelect={handleToolSelect}
        position={menuPosition}
      />

      <div className="flex flex-col gap-1.5">
        {/* Input Row - 只有输入框 */}
        <div className="flex h-9 items-center">
          {/* 输入框 */}
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
            className="
              flex-1 rounded-[20px] border border-gray-200
              bg-white px-4 py-2
              text-sm text-gray-900
              placeholder:text-gray-400
              focus:border-blue-500 focus:outline-none
              disabled:opacity-50
              h-9
            "
          />
        </div>

        {/* Operation Bar - 加号 + Toolbar(flex-1,含飞书按钮) + 麦克风 + 发送 */}
        <div className="flex h-9 items-center gap-2">
          {/* 加号按钮 - 36px */}
          <button
            ref={plusButtonRef}
            type="button"
            onClick={handleToggleToolsMenu}
            className="
              flex h-9 w-9 items-center justify-center
              rounded-full bg-[#F5F5F7] border border-gray-200
              text-gray-900 transition-colors
              hover:bg-gray-200 hover:text-gray-600
              disabled:opacity-50
            "
            aria-label="Tools menu"
            disabled={disabled}
          >
            <Plus className="h-5 w-5" strokeWidth={2} />
          </button>

          {/* Toolbar - flex-1, 包含飞书按钮 */}
          <div className="flex-1 flex items-center">
            {/* 飞书多维表按钮 - 77px 宽，28px 高 */}
            <FeishuBitableButton
              selected={isFeishuToolEnabled}
              onClick={onToggleFeishuTool}
              disabled={disabled}
            />
          </div>

          {/* 麦克风图标 */}
          <button
            type="button"
            onClick={onVoiceInput}
            className="
              flex items-center justify-center
              text-gray-900 transition-colors
              hover:text-gray-600 disabled:opacity-50
            "
            aria-label="Voice input"
            disabled={disabled}
          >
            <Mic className="h-5 w-5" strokeWidth={2} />
          </button>

          {/* 发送按钮 - 36px */}
          <button
            type="button"
            onClick={handleSend}
            disabled={disabled || !input.trim()}
            className="
              flex h-9 w-9 items-center justify-center
              rounded-full bg-[#007AFF] text-white
              transition-colors hover:bg-blue-600
              disabled:opacity-50
            "
            aria-label="Send message"
          >
            <Send className="h-4 w-4" strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </div>
  );
}
