import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { A2UIComponentProps, A2UIAction } from '../types';
import { formatTimestamp, resolveEpochMs } from '../../../lib/time/timestamp';

interface DraftVersion {
  id: string;
  content: string;
  createdAt: string;
  createdAtMs?: number;
  preview?: string;
}

interface DraftPreviewProps {
  versions: DraftVersion[];
  currentVersionId?: string;
  onSelectVersion?: (versionId: string, action: A2UIAction) => void;
  onConfirm?: (action: A2UIAction) => void;
  onEdit?: (action: A2UIAction) => void;
}

export function DraftPreview({ node, onAction }: A2UIComponentProps) {
  if (node.type !== 'custom' || node.name !== 'draft-preview') {
    return null;
  }

  const props = (node.props || {}) as DraftPreviewProps;
  const { versions = [], currentVersionId, onSelectVersion, onConfirm, onEdit } = props;

  const [currentIndex, setCurrentIndex] = useState(() => {
    if (currentVersionId) {
      const index = versions.findIndex((v) => v.id === currentVersionId);
      return index >= 0 ? index : 0;
    }
    return versions.length > 0 ? versions.length - 1 : 0;
  });

  const currentVersion = versions[currentIndex];

  const handlePrevious = () => {
    if (currentIndex > 0) {
      const newIndex = currentIndex - 1;
      setCurrentIndex(newIndex);
      if (onSelectVersion && onAction) {
        onAction({
          type: 'custom',
          name: 'select-draft-version',
          payload: { versionId: versions[newIndex].id },
        });
      }
    }
  };

  const handleNext = () => {
    if (currentIndex < versions.length - 1) {
      const newIndex = currentIndex + 1;
      setCurrentIndex(newIndex);
      if (onSelectVersion && onAction) {
        onAction({
          type: 'custom',
          name: 'select-draft-version',
          payload: { versionId: versions[newIndex].id },
        });
      }
    }
  };

  const handleConfirm = () => {
    if (onConfirm && onAction) {
      onAction({
        type: 'custom',
        name: 'confirm-draft',
        payload: { versionId: currentVersion?.id },
      });
    }
  };

  const handleEdit = () => {
    if (onEdit && onAction) {
      onAction({
        type: 'custom',
        name: 'edit-draft',
        payload: { versionId: currentVersion?.id },
      });
    }
  };

  if (!currentVersion) {
    return (
      <div className="text-center text-text-secondary font-primary p-4">
        暂无预览内容
      </div>
    );
  }

  const versionCreatedAtText = formatTimestamp(
    resolveEpochMs(currentVersion.createdAtMs, currentVersion.createdAt),
    { locale: 'zh-CN' },
  );

  return (
    <div
      className="bg-bg-card rounded-md p-4 border border-border"
      style={node.style}
      id={node.id}
      data-testid={node.testId}
    >
      {/* 版本切换器 */}
      {versions.length > 1 && (
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-border">
          <button
            onClick={handlePrevious}
            disabled={currentIndex === 0}
            className="p-1 text-text-muted hover:text-text-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="text-center">
            <p className="text-sm font-medium text-text-primary font-primary">
              版本 {currentIndex + 1} / {versions.length}
            </p>
            <p className="text-xs text-text-secondary font-primary">
              {versionCreatedAtText}
            </p>
          </div>

          <button
            onClick={handleNext}
            disabled={currentIndex === versions.length - 1}
            className="p-1 text-text-muted hover:text-text-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* 预览内容 */}
      <div className="mb-4">
        <div className="bg-bg-surface rounded-md p-4 min-h-[200px]">
          <p className="text-[15px] text-text-primary font-primary whitespace-pre-wrap">
            {currentVersion.preview || currentVersion.content}
          </p>
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="flex gap-2">
        {onEdit && (
          <button
            onClick={handleEdit}
            className="flex-1 h-10 bg-bg-surface text-text-primary border border-border rounded-md font-medium font-primary hover:bg-bg-card"
          >
            编辑
          </button>
        )}
        {onConfirm && (
          <button
            onClick={handleConfirm}
            className="flex-1 h-10 bg-primary text-white rounded-md font-medium font-primary hover:opacity-90"
          >
            确认发送
          </button>
        )}
      </div>
    </div>
  );
}





