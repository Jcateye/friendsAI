/**
 * ToolConfirmationOverlay 组件
 * 显示工具确认弹层，用于需要用户确认的工具操作
 */

import { useState } from 'react';
import { X, AlertCircle, Check, XCircle } from 'lucide-react';
import type { PendingToolConfirmation } from '../../hooks/useToolConfirmations';

export interface ToolConfirmationOverlayProps {
  /**
   * 待确认的工具信息
   */
  confirmation: PendingToolConfirmation;
  /**
   * 确认回调
   */
  onConfirm: () => Promise<void>;
  /**
   * 拒绝回调
   */
  onReject: () => Promise<void>;
  /**
   * 关闭回调（可选）
   */
  onClose?: () => void;
}

/**
 * ToolConfirmationOverlay 组件
 * 
 * 显示在页面底部的工具确认弹层，包含：
 * - 工具名称和描述
 * - 输入参数（可折叠）
 * - 确认/取消按钮
 */
export function ToolConfirmationOverlay({
  confirmation,
  onConfirm,
  onReject,
  onClose,
}: ToolConfirmationOverlayProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await onConfirm();
    } catch (err) {
      setError(err instanceof Error ? err.message : '确认失败');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReject = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await onReject();
    } catch (err) {
      setError(err instanceof Error ? err.message : '拒绝失败');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-bg-card border-t border-border shadow-lg">
      <div className="max-w-4xl mx-auto p-4">
        {/* 头部 */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-start gap-3 flex-1">
            <div className="w-10 h-10 bg-warning-tint rounded-md flex items-center justify-center flex-shrink-0">
              <AlertCircle className="w-5 h-5 text-warning" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-[16px] font-semibold text-text-primary font-display mb-1">
                需要确认工具执行
              </h3>
              <p className="text-[14px] text-text-secondary font-primary">
                工具: <span className="font-medium text-text-primary">{confirmation.toolName}</span>
              </p>
              {confirmation.message && (
                <p className="text-[13px] text-text-muted font-primary mt-1">
                  {confirmation.message}
                </p>
              )}
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-bg-surface transition-colors flex-shrink-0"
            >
              <X className="w-4 h-4 text-text-muted" />
            </button>
          )}
        </div>

        {/* 错误提示 */}
        {error ? (
          <div className="mb-3 p-2 bg-danger-tint rounded-md flex items-center gap-2">
            <XCircle className="w-4 h-4 text-danger flex-shrink-0" />
            <span className="text-[13px] text-danger font-primary">{error}</span>
          </div>
        ) : null}

        {/* 输入参数（可折叠） */}
        {confirmation.input != null && (
          <div className="mb-3">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-[13px] text-primary font-medium font-primary hover:underline"
            >
              {isExpanded ? '隐藏' : '查看'}输入参数
            </button>
            {isExpanded && (
              <div className="mt-2 p-3 bg-bg-surface rounded-md">
                <pre className="text-[12px] text-text-secondary font-mono overflow-x-auto">
                  {JSON.stringify(confirmation.input, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}

        {/* 操作按钮 */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleReject}
            disabled={isLoading}
            className="flex-1 h-11 px-4 bg-bg-surface border border-border rounded-md text-[15px] font-medium text-text-secondary hover:bg-bg-card disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-primary"
          >
            <div className="flex items-center justify-center gap-2">
              <XCircle className="w-4 h-4" />
              取消
            </div>
          </button>
          <button
            onClick={handleConfirm}
            disabled={isLoading}
            className="flex-1 h-11 px-4 bg-primary rounded-md text-[15px] font-semibold text-white hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-primary"
          >
            <div className="flex items-center justify-center gap-2">
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  处理中...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  确认执行
                </>
              )}
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}


