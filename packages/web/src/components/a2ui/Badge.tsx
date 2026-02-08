import { A2UIComponentProps, A2UIBadgeProps } from './types';

export function A2UIBadge({ node }: A2UIComponentProps) {
  if (node.type !== 'badge') {
    return null;
  }

  const props = node.props as A2UIBadgeProps;
  const { text, variant = 'default' } = props;

  // 徽章变体样式
  const variantClasses = {
    default: 'bg-bg-surface text-text-primary',
    info: 'bg-info-tint text-info',
    success: 'bg-green-100 text-green-700',
    warning: 'bg-warning-tint text-warning',
    danger: 'bg-red-100 text-red-700',
  };

  const className = [
    'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium font-primary',
    variantClasses[variant],
  ].join(' ');

  return (
    <span
      className={className}
      style={node.style}
      id={node.id}
      data-testid={node.testId}
    >
      {text}
    </span>
  );
}








