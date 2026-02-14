import { A2UIComponentProps, A2UICardProps, A2UIComponent } from './types';

import { A2UIRenderer as ImportedA2UIRenderer } from './A2UIRenderer';

// 延迟获取 A2UIRenderer（保留函数结构，避免大范围改动）
const getA2UIRenderer = () => {
  return ImportedA2UIRenderer;
};

export function A2UICard({ node, onAction }: A2UIComponentProps) {
  if (node.type !== 'card') {
    return null;
  }

  const props = (node.props || {}) as A2UICardProps;
  const { title, subtitle, elevation = 0 } = props;
  const children = node.children || [];

  const className = [
    'bg-bg-card rounded-md p-4',
    elevation > 0 && 'shadow-sm',
  ]
    .filter(Boolean)
    .join(' ');

  const Renderer = getA2UIRenderer();

  return (
    <div
      className={className}
      style={node.style}
      id={node.id}
      data-testid={node.testId}
    >
      {(title || subtitle) && (
        <div className="mb-3">
          {title && (
            <h3 className="text-lg font-semibold text-text-primary font-display">
              {title}
            </h3>
          )}
          {subtitle && (
            <p className="text-sm text-text-secondary font-primary mt-1">
              {subtitle}
            </p>
          )}
        </div>
      )}
      {Renderer && children.map((child: A2UIComponent, index: number) => (
        <Renderer
          key={child.key || child.id || index}
          document={{ version: '1.0', root: child }}
          onAction={onAction}
        />
      ))}
    </div>
  );
}

