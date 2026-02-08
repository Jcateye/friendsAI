import { A2UIComponentProps, A2UIButtonProps, A2UIAction } from './types';

export function A2UIButton({ node, onAction }: A2UIComponentProps) {
  if (node.type !== 'button') {
    return null;
  }

  const props = node.props as A2UIButtonProps;
  const { label, variant = 'primary', size = 'md', disabled = false, action, actions } = props;

  const handleClick = () => {
    if (disabled) return;

    // 优先使用 actions 数组，否则使用单个 action
    const actionsToExecute = actions || (action ? [action] : []);
    
    actionsToExecute.forEach((act: A2UIAction) => {
      if (onAction) {
        onAction(act);
      }
    });
  };

  // 按钮变体样式
  const variantClasses = {
    primary: 'bg-primary text-white hover:opacity-90',
    secondary: 'bg-bg-surface text-text-primary border border-border hover:bg-bg-card',
    ghost: 'bg-transparent text-text-primary hover:bg-bg-surface',
    link: 'bg-transparent text-primary hover:underline',
    danger: 'bg-red-500 text-white hover:opacity-90',
  };

  // 按钮尺寸样式
  const sizeClasses = {
    sm: 'h-8 px-3 text-sm',
    md: 'h-10 px-4 text-[15px]',
    lg: 'h-12 px-6 text-base',
  };

  const className = [
    'inline-flex items-center justify-center rounded-md font-medium font-primary transition-colors',
    variantClasses[variant],
    sizeClasses[size],
    disabled && 'opacity-50 cursor-not-allowed',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      className={className}
      onClick={handleClick}
      disabled={disabled}
      style={node.style}
      id={node.id}
      data-testid={node.testId}
    >
      {label}
    </button>
  );
}





