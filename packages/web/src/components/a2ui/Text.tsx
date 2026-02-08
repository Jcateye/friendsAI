import { A2UIComponentProps, A2UITextProps } from './types';

// 简单的 Markdown 渲染器（如果没有 react-markdown，使用基本实现）
function renderMarkdown(text: string): string {
  // 简单的 Markdown 转 HTML（仅支持基本语法）
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code class="bg-bg-surface px-1 py-0.5 rounded text-sm">$1</code>')
    .replace(/\n/g, '<br />');
}

export function A2UIText({ node }: A2UIComponentProps) {
  if (node.type !== 'text') {
    return null;
  }

  const props = node.props as A2UITextProps;
  const { text, format = 'plain', variant = 'body', align = 'left', maxLines } = props;

  // 文本变体样式
  const variantClasses = {
    title: 'text-2xl font-bold text-text-primary font-display',
    subtitle: 'text-xl font-semibold text-text-primary font-display',
    body: 'text-[15px] text-text-primary font-primary',
    caption: 'text-sm text-text-secondary font-primary',
    overline: 'text-xs text-text-muted font-primary uppercase tracking-wide',
  };

  // 对齐样式
  const alignClasses = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
    justify: 'text-justify',
  };

  const className = [
    variantClasses[variant],
    alignClasses[align],
    maxLines && 'line-clamp-' + maxLines,
  ]
    .filter(Boolean)
    .join(' ');

  const style: React.CSSProperties = {
    ...(maxLines && { WebkitLineClamp: maxLines }),
    ...(node.style || {}),
  };

  if (format === 'markdown') {
    const html = renderMarkdown(text);
    return (
      <div
        className={className}
        style={style}
        id={node.id}
        data-testid={node.testId}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }

  return (
    <div
      className={className}
      style={style}
      id={node.id}
      data-testid={node.testId}
    >
      {text}
    </div>
  );
}









