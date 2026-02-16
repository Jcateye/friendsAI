import { A2UIComponentProps, A2UIAction } from '../types';

interface ConfirmBarProps {
  description: string;
  onConfirm?: (action: A2UIAction) => void;
  onCancel?: (action: A2UIAction) => void;
  confirmLabel?: string;
  cancelLabel?: string;
}

export function ConfirmBar({ node, onAction }: A2UIComponentProps) {
  if (node.type !== 'custom' || node.name !== 'confirm-bar') {
    return null;
  }

  const props = (node.props || {}) as ConfirmBarProps;
  const {
    description,
    onConfirm,
    onCancel,
    confirmLabel = '确认',
    cancelLabel = '取消',
  } = props;

  const handleConfirm = () => {
    if (onConfirm && onAction) {
      onAction({
        type: 'custom',
        name: 'confirm-action',
        payload: {},
      });
    } else if (onAction) {
      onAction({
        type: 'submit',
        label: confirmLabel,
      });
    }
  };

  const handleCancel = () => {
    if (onCancel && onAction) {
      onAction({
        type: 'custom',
        name: 'cancel-action',
        payload: {},
      });
    } else if (onAction) {
      onAction({
        type: 'dismiss',
        label: cancelLabel,
      });
    }
  };

  return (
    <div
      className="fixed bottom-0 left-0 right-0 bg-bg-card border-t border-border p-4 safe-area-bottom z-50"
      style={node.style}
      id={node.id}
      data-testid={node.testId}
    >
      <div className="max-w-md mx-auto">
        <p className="text-sm text-text-primary font-primary mb-3 text-center">
          {description}
        </p>
        <div className="flex gap-2">
          <button
            onClick={handleCancel}
            className="flex-1 h-10 bg-bg-surface text-text-primary border border-border rounded-md font-medium font-primary hover:bg-bg-card"
          >
            {cancelLabel}
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 h-10 bg-primary text-white rounded-md font-medium font-primary hover:opacity-90"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}









