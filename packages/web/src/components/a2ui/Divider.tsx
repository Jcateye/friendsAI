import { A2UIComponentProps, A2UIDividerProps } from './types';

export function A2UIDivider({ node }: A2UIComponentProps) {
  if (node.type !== 'divider') {
    return null;
  }

  const props = (node.props || {}) as A2UIDividerProps;
  const { orientation = 'horizontal', label } = props;

  if (orientation === 'vertical') {
    return (
      <div
        className="w-px bg-border self-stretch"
        style={node.style}
        id={node.id}
        data-testid={node.testId}
      />
    );
  }

  if (label) {
    return (
      <div
        className="flex items-center gap-3 my-4"
        style={node.style}
        id={node.id}
        data-testid={node.testId}
      >
        <div className="flex-1 h-px bg-border" />
        <span className="text-sm text-text-secondary font-primary">{label}</span>
        <div className="flex-1 h-px bg-border" />
      </div>
    );
  }

  return (
    <div
      className="h-px bg-border my-4"
      style={node.style}
      id={node.id}
      data-testid={node.testId}
    />
  );
}



