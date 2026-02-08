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
} from 'lucide-react';

// ==================== 类型定义 ====================

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

export interface ChatInputBoxProps {
  /** 发送消息回调 */
  onSendMessage: (content: string, files?: AttachedFile[], tools?: string[]) => void;
  /** 停止生成回调 */
  onStop?: () => void;
  /** 是否正在加载/生成 */
  isLoading?: boolean;
  /** 占位符文本 */
  placeholder?: string;
  /** 可用工具列表 */
  availableTools?: ToolOption[];
  /** 默认禁用输入 */
  disabled?: boolean;
}

// ==================== 默认工具列表 ====================

const DEFAULT_TOOLS: ToolOption[] = [
  {
    id: 'web_search',
    name: '网络搜索',
    description: '搜索最新信息',
    icon: <Search className="w-4 h-4" />,
  },
];

// ==================== 组件 ====================

export function ChatInputBox({
  onSendMessage,
  onStop,
  isLoading = false,
  placeholder = '输入消息...',
  availableTools = DEFAULT_TOOLS,
  disabled = false,
}: ChatInputBoxProps) {
  const [input, setInput] = useState('');
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [selectedTools, setSelectedTools] = useState<string[]>([]);
  const [showToolSelector, setShowToolSelector] = useState(false);
  const [showFileMenu, setShowFileMenu] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ==================== 文件处理 ====================

  const handleFileSelect = useCallback((files: FileList | null, type: 'image' | 'file') => {
    if (!files) return;

    const newFiles: AttachedFile[] = [];

    Array.from(files).forEach((file) => {
      const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      if (type === 'image') {
        const preview = URL.createObjectURL(file);
        newFiles.push({ id, file, preview, type: 'image' });
      } else {
        newFiles.push({ id, file, type: 'file' });
      }
    });

    setAttachedFiles((prev) => [...prev, ...newFiles]);
    setShowFileMenu(false);

    // 聚焦回输入框
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 100);
  }, []);

  const handleRemoveFile = useCallback((id: string) => {
    setAttachedFiles((prev) => {
      const file = prev.find((f) => f.id === id);
      if (file?.preview) {
        URL.revokeObjectURL(file.preview);
      }
      return prev.filter((f) => f.id !== id);
    });
  }, []);

  // ==================== 工具选择 ====================

  const toggleTool = useCallback((toolId: string) => {
    setSelectedTools((prev) =>
      prev.includes(toolId)
        ? prev.filter((id) => id !== toolId)
        : [...prev, toolId]
    );
  }, []);

  // ==================== 发送处理 ====================

  const handleSubmit = useCallback(
    (e?: React.FormEvent) => {
      e?.preventDefault();

      if ((!input.trim() && attachedFiles.length === 0) || disabled) {
        return;
      }

      onSendMessage(input, attachedFiles, selectedTools);

      // 重置状态
      setInput('');
      setAttachedFiles((prev) => {
        prev.forEach((f) => {
          if (f.preview) URL.revokeObjectURL(f.preview);
        });
        return [];
      });
      setSelectedTools([]);

      // 重置 textarea 高度
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    },
    [input, attachedFiles, selectedTools, disabled, onSendMessage]
  );

  const handleStop = useCallback(() => {
    onStop?.();
  }, [onStop]);

  // ==================== 输入处理 ====================

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);

    // 自动调整高度
    const textarea = e.target;
    textarea.style.height = 'auto';
    const newHeight = Math.min(textarea.scrollHeight, 150);
    textarea.style.height = `${newHeight}px`;
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  // ==================== 渲染 ====================

  const hasContent = input.trim().length > 0 || attachedFiles.length > 0;

  return (
    <div className="bg-bg-card border-t border-border">
      {/* 工具选择栏 */}
      {selectedTools.length > 0 && (
        <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-primary-tint">
          <span className="text-[12px] text-primary font-medium">已选工具:</span>
          {selectedTools.map((toolId) => {
            const tool = availableTools.find((t) => t.id === toolId);
            return (
              <button
                key={toolId}
                onClick={() => toggleTool(toolId)}
                className="flex items-center gap-1 px-2 py-1 bg-white rounded-full text-[12px] text-primary font-medium hover:bg-primary/10 transition-colors"
              >
                {tool?.icon}
                <span>{tool?.name}</span>
                <X className="w-3 h-3" />
              </button>
            );
          })}
        </div>
      )}

      {/* 附件预览区 */}
      {attachedFiles.length > 0 && (
        <div className="flex flex-wrap gap-2 px-4 py-3 border-b border-border">
          {attachedFiles.map((file) => (
            <div
              key={file.id}
              className="relative group bg-bg-surface rounded-lg overflow-hidden"
            >
              {file.type === 'image' ? (
                <div className="relative w-16 h-16">
                  <img
                    src={file.preview}
                    alt={file.file.name}
                    className="w-full h-full object-cover"
                  />
                  <button
                    onClick={() => handleRemoveFile(file.id)}
                    className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                  >
                    <X className="w-4 h-4 text-white" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 px-3 py-2">
                  <FileText className="w-4 h-4 text-text-muted" />
                  <span className="text-[12px] text-text-secondary max-w-[100px] truncate">
                    {file.file.name}
                  </span>
                  <button
                    onClick={() => handleRemoveFile(file.id)}
                    className="ml-1 text-text-muted hover:text-danger"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 输入区域 */}
      <form onSubmit={handleSubmit} className="p-3">
        <div className="flex items-end gap-2">
          {/* 工具选择按钮 */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowToolSelector(!showToolSelector)}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                selectedTools.length > 0
                  ? 'bg-primary text-white'
                  : 'bg-bg-surface text-text-muted hover:bg-border'
              }`}
              title="选择工具"
            >
              <Search className="w-5 h-5" />
            </button>

            {/* 工具选择下拉菜单 */}
            {showToolSelector && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowToolSelector(false)}
                />
                <div className="absolute bottom-full left-0 mb-2 w-48 bg-white rounded-lg shadow-lg border border-border overflow-hidden z-20">
                  <div className="p-2">
                    <p className="text-[12px] text-text-muted font-medium px-2 py-1">
                      选择工具
                    </p>
                    {availableTools.map((tool) => (
                      <button
                        key={tool.id}
                        type="button"
                        onClick={() => {
                          toggleTool(tool.id);
                          setShowToolSelector(false);
                        }}
                        className={`w-full flex items-center gap-2 px-2 py-2 rounded-md transition-colors ${
                          selectedTools.includes(tool.id)
                            ? 'bg-primary-tint text-primary'
                            : 'hover:bg-bg-surface text-text-secondary'
                        }`}
                      >
                        {tool.icon}
                        <div className="text-left">
                          <p className="text-[13px] font-medium">{tool.name}</p>
                          <p className="text-[11px] text-text-muted">
                            {tool.description}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* 文件上传按钮 */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowFileMenu(!showFileMenu)}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                attachedFiles.length > 0
                  ? 'bg-primary text-white'
                  : 'bg-bg-surface text-text-muted hover:bg-border'
              }`}
              title="添加附件"
            >
              <Plus className="w-5 h-5" />
            </button>

            {/* 文件菜单 */}
            {showFileMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowFileMenu(false)}
                />
                <div className="absolute bottom-full left-0 mb-2 w-40 bg-white rounded-lg shadow-lg border border-border overflow-hidden z-20">
                  <button
                    type="button"
                    onClick={() => imageInputRef.current?.click()}
                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-bg-surface transition-colors text-left"
                  >
                    <ImageIcon className="w-4 h-4 text-text-muted" />
                    <span className="text-[13px] text-text-secondary">图片</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-bg-surface transition-colors text-left"
                  >
                    <FileText className="w-4 h-4 text-text-muted" />
                    <span className="text-[13px] text-text-secondary">文件</span>
                  </button>
                </div>
              </>
            )}

            {/* 隐藏的文件输入 */}
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => handleFileSelect(e.target.files, 'image')}
            />
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => handleFileSelect(e.target.files, 'file')}
            />
          </div>

          {/* 文本输入框 */}
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={disabled}
              rows={1}
              className="w-full px-4 py-3 bg-bg-surface rounded-full text-[15px] text-text-primary placeholder:text-text-muted outline-none focus:ring-2 focus:ring-primary resize-none font-primary max-h-[150px] disabled:opacity-50"
              style={{ minHeight: '44px' }}
            />
          </div>

          {/* 发送/停止按钮 */}
          <button
            type={isLoading ? 'button' : 'submit'}
            onClick={isLoading ? handleStop : undefined}
            disabled={!hasContent && !isLoading}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all shrink-0 ${
              isLoading
                    ? 'bg-warning text-white'
                    : 'bg-primary text-white'
            } ${!hasContent && !isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            title={isLoading ? '停止生成' : '发送'}
          >
            {isLoading ? (
              <Square className="w-5 h-5" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* 提示文本 */}
        <div className="flex items-center justify-between mt-2 px-1">
          <p className="text-[11px] text-text-muted font-primary">
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
