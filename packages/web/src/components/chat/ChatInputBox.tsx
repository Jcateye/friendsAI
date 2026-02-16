/**
 * ChatInputBox 组件
 * 支持多媒体输入（图片、文件）和工具选择的聊天输入框
 */

import { useState, useRef, useCallback } from 'react';
import {
  Send,
  Square,
  Image as ImageIcon,
  FileText,
  X,
  Search,
  Plus,
  Mic,
  Grid,
  Check,
  Sparkles,
} from 'lucide-react';

export interface AttachedFile {
  id: string;
  file: File;
  preview?: string;
  type: 'image' | 'file';
}

export interface ToolOption {
  id: string;
  name: string;
  description: string;
  icon?: React.ReactNode;
}

export interface SkillActionOption {
  id: string;
  name: string;
  description?: string;
  skillId: string;
  operation?: string;
  run?: {
    agentId: string;
    operation?: string | null;
    inputTemplate?: Record<string, unknown>;
  };
  icon?: React.ReactNode;
}

export interface ChatComposerSubmitPayload {
  content: string;
  files: AttachedFile[];
  tools: string[];
  feishuEnabled: boolean;
  inputMode: 'text' | 'voice';
}

export interface ChatInputBoxProps {
  onSendMessage: (payload: ChatComposerSubmitPayload) => void;
  onStop?: () => void;
  onVoiceInput?: () => void;
  onSelectSkillAction?: (action: SkillActionOption) => void;
  isLoading?: boolean;
  placeholder?: string;
  availableTools?: ToolOption[];
  skillActions?: SkillActionOption[];
  disabled?: boolean;
}

const DEFAULT_TOOLS: ToolOption[] = [
  {
    id: 'web_search',
    name: '网络搜索',
    description: '搜索最新信息',
    icon: <Search className="w-4 h-4" />,
  },
];

const MAX_TEXTAREA_HEIGHT = 150;

export function ChatInputBox({
  onSendMessage,
  onStop,
  onVoiceInput,
  onSelectSkillAction,
  isLoading = false,
  placeholder = '输入消息...',
  availableTools = DEFAULT_TOOLS,
  skillActions = [],
  disabled = false,
}: ChatInputBoxProps) {
  const [input, setInput] = useState('');
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [selectedTools, setSelectedTools] = useState<string[]>([]);
  const [showPlusMenu, setShowPlusMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{ x: number; y: number } | undefined>(undefined);
  const [feishuEnabled, setFeishuEnabled] = useState(false);
  const [inputMode, setInputMode] = useState<'text' | 'voice'>('text');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const plusButtonRef = useRef<HTMLButtonElement>(null);

  const focusTextarea = useCallback(() => {
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 80);
  }, []);

  const handleFileSelect = useCallback((files: FileList | null, type: 'image' | 'file') => {
    if (!files) {
      return;
    }

    const newFiles: AttachedFile[] = Array.from(files).map((file) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      if (type === 'image') {
        return { id, file, preview: URL.createObjectURL(file), type };
      }
      return { id, file, type };
    });

    setAttachedFiles((prev) => [...prev, ...newFiles]);
    setShowPlusMenu(false);
    focusTextarea();
  }, [focusTextarea]);

  const handleRemoveFile = useCallback((id: string) => {
    setAttachedFiles((prev) => {
      const target = prev.find((file) => file.id === id);
      if (target?.preview) {
        URL.revokeObjectURL(target.preview);
      }
      return prev.filter((file) => file.id !== id);
    });
  }, []);

  const toggleTool = useCallback((toolId: string) => {
    setSelectedTools((prev) =>
      prev.includes(toolId)
        ? prev.filter((id) => id !== toolId)
        : [...prev, toolId]
    );
  }, []);

  const handleTogglePlusMenu = useCallback(() => {
    if (!showPlusMenu && plusButtonRef.current) {
      const rect = plusButtonRef.current.getBoundingClientRect();
      setMenuPosition({
        x: rect.left,
        y: rect.top - 8,
      });
    }

    if (showPlusMenu) {
      setMenuPosition(undefined);
    }

    setShowPlusMenu((prev) => !prev);
  }, [showPlusMenu]);

  const handleClosePlusMenu = useCallback(() => {
    setShowPlusMenu(false);
    setMenuPosition(undefined);
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputMode('text');
    setInput(e.target.value);

    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, MAX_TEXTAREA_HEIGHT)}px`;
  }, []);

  const resetComposerAfterSend = useCallback(() => {
    setInput('');
    setInputMode('text');
    setSelectedTools([]);

    setAttachedFiles((prev) => {
      prev.forEach((file) => {
        if (file.preview) {
          URL.revokeObjectURL(file.preview);
        }
      });
      return [];
    });

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, []);

  const handleSubmit = useCallback((e?: React.FormEvent) => {
    e?.preventDefault();

    const normalizedContent = input.trim();
    if ((!normalizedContent && attachedFiles.length === 0) || disabled) {
      return;
    }

    onSendMessage({
      content: normalizedContent,
      files: attachedFiles,
      tools: selectedTools,
      feishuEnabled,
      inputMode,
    });

    resetComposerAfterSend();
  }, [attachedFiles, disabled, feishuEnabled, input, inputMode, onSendMessage, resetComposerAfterSend, selectedTools]);

  const handleStop = useCallback(() => {
    onStop?.();
  }, [onStop]);

  const handleVoiceClick = useCallback(() => {
    setInputMode('voice');
    onVoiceInput?.();
    focusTextarea();
  }, [focusTextarea, onVoiceInput]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }, [handleSubmit]);

  const hasContent = input.trim().length > 0 || attachedFiles.length > 0;

  return (
    <div className="relative border-t border-border bg-bg-card px-3 py-3">
      {showPlusMenu && (
        <>
          <div className="fixed inset-0 z-30 bg-black/20" onClick={handleClosePlusMenu} aria-hidden="true" />
          <div
            className="fixed z-40 w-[220px] rounded-xl border border-border bg-white p-2 shadow-xl"
            style={menuPosition ? {
              left: `${menuPosition.x}px`,
              top: `${menuPosition.y}px`,
              transform: 'translateY(-100%)',
            } : {
              left: '16px',
              bottom: '100px',
            }}
            role="menu"
          >
            <button
              type="button"
              className="w-full rounded-lg px-3 py-2 text-left text-[13px] text-text-secondary hover:bg-bg-surface"
              onClick={() => imageInputRef.current?.click()}
            >
              <span className="inline-flex items-center gap-2">
                <ImageIcon className="w-4 h-4" />
                图片
              </span>
            </button>
            <button
              type="button"
              className="w-full rounded-lg px-3 py-2 text-left text-[13px] text-text-secondary hover:bg-bg-surface"
              onClick={() => fileInputRef.current?.click()}
            >
              <span className="inline-flex items-center gap-2">
                <FileText className="w-4 h-4" />
                文件
              </span>
            </button>

            <div className="my-2 border-t border-border" />

            <p className="px-3 pb-1 text-[11px] font-medium text-text-muted">工具</p>
            {availableTools.map((tool) => {
              const selected = selectedTools.includes(tool.id);
              return (
                <button
                  key={tool.id}
                  type="button"
                  className={`w-full rounded-lg px-3 py-2 text-left text-[13px] transition-colors ${
                    selected ? 'bg-primary-tint text-primary' : 'text-text-secondary hover:bg-bg-surface'
                  }`}
                  onClick={() => {
                    toggleTool(tool.id);
                    handleClosePlusMenu();
                    focusTextarea();
                  }}
                >
                  <span className="inline-flex w-full items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-2">
                      {tool.icon ?? <Search className="w-4 h-4" />}
                      <span>{tool.name}</span>
                    </span>
                    {selected && <Check className="w-4 h-4" />}
                  </span>
                  <span className="mt-1 block text-[11px] text-text-muted">{tool.description}</span>
                </button>
              );
            })}

            {skillActions.length > 0 && (
              <>
                <div className="my-2 border-t border-border" />
                <p className="px-3 pb-1 text-[11px] font-medium text-text-muted">技能</p>
                {skillActions.map((action) => (
                  <button
                    key={action.id}
                    type="button"
                    className="w-full rounded-lg px-3 py-2 text-left text-[13px] text-text-secondary transition-colors hover:bg-bg-surface"
                    onClick={() => {
                      onSelectSkillAction?.(action);
                      handleClosePlusMenu();
                      focusTextarea();
                    }}
                  >
                    <span className="inline-flex items-center gap-2">
                      {action.icon ?? <Sparkles className="w-4 h-4 text-primary" />}
                      <span>{action.name}</span>
                    </span>
                    {action.description && (
                      <span className="mt-1 block text-[11px] text-text-muted">{action.description}</span>
                    )}
                  </button>
                ))}
              </>
            )}
          </div>
        </>
      )}

      <input
        ref={imageInputRef}
        data-testid="chat-image-input"
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleFileSelect(e.target.files, 'image')}
      />
      <input
        ref={fileInputRef}
        data-testid="chat-file-input"
        type="file"
        multiple
        className="hidden"
        onChange={(e) => handleFileSelect(e.target.files, 'file')}
      />

      {selectedTools.length > 0 && (
        <div className="mb-2 flex flex-wrap items-center gap-2 rounded-lg bg-primary-tint px-3 py-2">
          <span className="text-[12px] font-medium text-primary">已选工具</span>
          {selectedTools.map((toolId) => {
            const tool = availableTools.find((item) => item.id === toolId);
            return (
              <button
                key={toolId}
                type="button"
                onClick={() => toggleTool(toolId)}
                className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-1 text-[12px] font-medium text-primary"
              >
                {tool?.icon}
                <span>{tool?.name ?? toolId}</span>
                <X className="w-3 h-3" />
              </button>
            );
          })}
        </div>
      )}

      {attachedFiles.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2 rounded-lg border border-border bg-bg-surface p-2">
          {attachedFiles.map((file) => (
            <div key={file.id} className="relative overflow-hidden rounded-lg bg-white">
              {file.type === 'image' ? (
                <div className="relative h-16 w-16">
                  <img src={file.preview} alt={file.file.name} className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => handleRemoveFile(file.id)}
                    className="absolute inset-0 flex items-center justify-center bg-black/45 text-white opacity-0 transition-opacity hover:opacity-100"
                    aria-label="移除图片"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 px-3 py-2">
                  <FileText className="w-4 h-4 text-text-muted" />
                  <span className="max-w-[120px] truncate text-[12px] text-text-secondary">{file.file.name}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveFile(file.id)}
                    className="text-text-muted hover:text-danger"
                    aria-label="移除文件"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="mb-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            rows={1}
            className="w-full resize-none rounded-2xl border border-border bg-white px-4 py-3 text-[15px] text-text-primary placeholder:text-text-muted outline-none focus:border-primary disabled:opacity-50"
            style={{ minHeight: '46px', maxHeight: `${MAX_TEXTAREA_HEIGHT}px` }}
          />
        </div>

        <div className="flex h-10 items-center gap-2">
          <button
            ref={plusButtonRef}
            type="button"
            onClick={handleTogglePlusMenu}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-bg-surface text-text-secondary transition-colors hover:bg-border"
            aria-label="打开菜单"
            disabled={disabled}
          >
            <Plus className="h-5 w-5" />
          </button>

          <button
            type="button"
            onClick={() => setFeishuEnabled((prev) => !prev)}
            disabled={disabled}
            aria-label="飞书多维表"
            className={`inline-flex h-8 items-center gap-1 rounded-md border px-2.5 text-[12px] font-medium transition-colors ${
              feishuEnabled
                ? 'border-primary bg-primary-tint text-primary'
                : 'border-transparent bg-bg-surface text-text-secondary hover:bg-border'
            }`}
          >
            <Grid className="h-4 w-4" />
            多维表
          </button>

          <div className="flex-1" />

          <button
            type="button"
            onClick={handleVoiceClick}
            disabled={disabled}
            className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors ${
              inputMode === 'voice'
                ? 'bg-primary-tint text-primary'
                : 'text-text-secondary hover:bg-bg-surface'
            }`}
            aria-label="语音输入"
          >
            <Mic className="h-5 w-5" />
          </button>

          <button
            type={isLoading ? 'button' : 'submit'}
            onClick={isLoading ? handleStop : undefined}
            disabled={!hasContent && !isLoading}
            className={`flex h-10 w-10 items-center justify-center rounded-full text-white transition-colors ${
              isLoading ? 'bg-warning' : 'bg-primary'
            } ${!hasContent && !isLoading ? 'cursor-not-allowed opacity-50' : ''}`}
            aria-label={isLoading ? '停止生成' : '发送消息'}
          >
            {isLoading ? <Square className="h-5 w-5" /> : <Send className="h-5 w-5" />}
          </button>
        </div>

        <div className="mt-2 px-1">
          <p className="text-[11px] text-text-muted">
            {selectedTools.length > 0
              ? `${selectedTools.length} 个工具已启用`
              : attachedFiles.length > 0
                ? `${attachedFiles.length} 个附件`
                : 'Enter 发送，Shift+Enter 换行'}
          </p>
        </div>
      </form>
    </div>
  );
}
