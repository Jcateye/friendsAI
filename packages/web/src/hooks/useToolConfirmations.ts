/**
 * useToolConfirmations Hook
 * 从 useAgentChat 的工具状态中筛选需要确认的工具
 */

import { useState, useEffect, useCallback } from 'react';
import type { ToolState } from '../lib/api/types';
import { api } from '../lib/api/client';

export interface PendingToolConfirmation {
  id: string;
  toolCallId: string;
  toolName: string;
  confirmationId: string;
  input?: unknown;
  message?: string;
}

export interface UseToolConfirmationsOptions {
  /**
   * 工具状态列表（通常来自 useAgentChat）
   */
  toolStates?: ToolState[];
}

export interface UseToolConfirmationsReturn {
  /**
   * 待确认的工具列表
   */
  pending: PendingToolConfirmation[];
  /**
   * 确认工具执行
   */
  confirm: (confirmationId: string, payload?: Record<string, any>) => Promise<void>;
  /**
   * 拒绝工具执行
   */
  reject: (confirmationId: string, reason?: string) => Promise<void>;
  /**
   * 清除所有待确认项
   */
  clear: () => void;
  /**
   * 批量确认
   */
  confirmBatch: (items: Array<{ confirmationId: string; payload?: Record<string, any> }>) => Promise<void>;
  /**
   * 批量拒绝
   */
  rejectBatch: (items: Array<{ confirmationId: string; reason?: string }>, templateReason?: string) => Promise<void>;
}

/**
 * useToolConfirmations Hook
 * 
 * 从工具状态列表中筛选 status=awaiting_input 的工具
 * 提供确认和拒绝方法
 */
export function useToolConfirmations(
  options: UseToolConfirmationsOptions = {}
): UseToolConfirmationsReturn {
  const { toolStates = [] } = options;

  const [pending, setPending] = useState<PendingToolConfirmation[]>([]);

  // 从工具状态中筛选需要确认的工具
  useEffect(() => {
    const awaitingInput = toolStates.filter(
      (tool) => tool.status === 'awaiting_input' && tool.confirmationId
    );

    const confirmations: PendingToolConfirmation[] = awaitingInput.map((tool) => ({
      id: tool.id,
      toolCallId: tool.id,
      toolName: tool.name,
      confirmationId: tool.confirmationId!,
      input: tool.input,
      message: tool.message,
    }));

    setPending(confirmations);
  }, [toolStates]);

  // 确认工具
  const confirm = useCallback(
    async (confirmationId: string, payload?: Record<string, any>) => {
      try {
        await api.toolConfirmations.confirm({
          id: confirmationId,
          payload,
        });

        // 从待确认列表中移除
        setPending((prev) =>
          prev.filter((p) => p.confirmationId !== confirmationId)
        );
      } catch (error) {
        console.error('Failed to confirm tool:', error);
        throw error;
      }
    },
    []
  );

  // 拒绝工具
  const reject = useCallback(
    async (confirmationId: string, reason?: string) => {
      try {
        await api.toolConfirmations.reject({
          id: confirmationId,
          reason,
        });

        // 从待确认列表中移除
        setPending((prev) =>
          prev.filter((p) => p.confirmationId !== confirmationId)
        );
      } catch (error) {
        console.error('Failed to reject tool:', error);
        throw error;
      }
    },
    []
  );

  // 清除所有待确认项
  const clear = useCallback(() => {
    setPending([]);
  }, []);

  const confirmBatch = useCallback(
    async (items: Array<{ confirmationId: string; payload?: Record<string, any> }>) => {
      if (items.length === 0) return;
      await api.toolConfirmations.batchConfirm({
        items: items.map((item) => ({
          id: item.confirmationId,
          payload: item.payload,
        })),
      });
      const ids = new Set(items.map((item) => item.confirmationId));
      setPending((prev) => prev.filter((item) => !ids.has(item.confirmationId)));
    },
    [],
  );

  const rejectBatch = useCallback(
    async (
      items: Array<{ confirmationId: string; reason?: string }>,
      templateReason?: string,
    ) => {
      if (items.length === 0) return;
      await api.toolConfirmations.batchReject({
        templateReason,
        items: items.map((item) => ({
          id: item.confirmationId,
          reason: item.reason,
        })),
      });
      const ids = new Set(items.map((item) => item.confirmationId));
      setPending((prev) => prev.filter((item) => !ids.has(item.confirmationId)));
    },
    [],
  );

  return {
    pending,
    confirm,
    reject,
    clear,
    confirmBatch,
    rejectBatch,
  };
}
