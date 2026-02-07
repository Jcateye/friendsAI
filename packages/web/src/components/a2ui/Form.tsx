import { useState, FormEvent } from 'react';
import { A2UIComponentProps, A2UIFormProps, A2UIAction, A2UIDocument, A2UIComponent } from './types';

// 延迟导入 A2UIRenderer 以避免循环依赖
let A2UIRenderer: React.ComponentType<{ document: A2UIDocument; onAction?: (action: A2UIAction) => void }> | null = null;

const getA2UIRenderer = () => {
  if (!A2UIRenderer) {
    const module = require('./A2UIRenderer');
    A2UIRenderer = module.A2UIRenderer;
  }
  return A2UIRenderer;
};

export function A2UIForm({ node, onAction }: A2UIComponentProps) {
  if (node.type !== 'form') {
    return null;
  }

  const props = (node.props || {}) as A2UIFormProps;
  const { formId, submitLabel = '提交', submitAction } = props;
  const children = node.children || [];

  const [formData] = useState<Record<string, unknown>>({});

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (submitAction && onAction) {
      // 只有 submit 和 custom 类型的 action 可以有 payload
      if (submitAction.type === 'submit' || submitAction.type === 'custom' || submitAction.type === 'navigate') {
        onAction({
          ...submitAction,
          payload: {
            ...(submitAction.payload || {}),
            formData,
          },
        });
      } else {
        // 对于其他类型的 action，直接传递
        onAction(submitAction);
      }
    }
  };


  const Renderer = getA2UIRenderer();

  return (
    <form
      id={formId}
      onSubmit={handleSubmit}
      className="flex flex-col gap-4"
      style={node.style}
      data-testid={node.testId}
    >
      {Renderer && children.map((child: A2UIComponent, index: number) => (
        <Renderer
          key={child.key || child.id || index}
          document={{ version: '1.0', root: child }}
          onAction={onAction}
        />
      ))}
      {submitAction && (
        <button
          type="submit"
          className="h-10 px-4 bg-primary text-white rounded-md font-medium font-primary hover:opacity-90"
        >
          {submitLabel}
        </button>
      )}
    </form>
  );
}

