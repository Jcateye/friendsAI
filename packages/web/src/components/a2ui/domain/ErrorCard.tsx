import { AlertCircle, RefreshCw } from 'lucide-react';
import { A2UIComponentProps, A2UIAction } from '../types';

interface ErrorCardProps {
  title?: string;
  message: string;
  code?: string;
  onRetry?: (action: A2UIAction) => void;
  retryLabel?: string;
}

export function ErrorCard({ node, onAction }: A2UIComponentProps) {
  if (node.type !== 'custom' || node.name !== 'error-card') {
    return null;
  }

  const props = (node.props || {}) as ErrorCardProps;
  const { title = '发生错误', message, code, onRetry, retryLabel = '重试' } = props;

  const handleRetry = () => {
    if (onRetry && onAction) {
      onAction({
        type: 'custom',
        name: 'retry-action',
        payload: {},
      });
    } else if (onAction) {
      onAction({
        type: 'custom',
        name: 'retry-action',
        payload: {},
      });
    }
  };

  return (
    <div
      className="bg-red-50 border border-red-200 rounded-md p-4"
      style={node.style}
      id={node.id}
      data-testid={node.testId}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <AlertCircle className="w-5 h-5 text-red-600" />
        </div>

        <div className="flex-1 min-w-0">
          <h4 className="text-base font-semibold text-red-900 font-display mb-1">
            {title}
          </h4>

          {code && (
            <p className="text-xs text-red-700 font-mono font-primary mb-2">
              错误码: {code}
            </p>
          )}

          <p className="text-sm text-red-800 font-primary mb-3">
            {message}
          </p>

          {onRetry && (
            <button
              onClick={handleRetry}
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-red-600 text-white rounded-md text-sm font-medium font-primary hover:bg-red-700"
            >
              <RefreshCw className="w-4 h-4" />
              {retryLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}





