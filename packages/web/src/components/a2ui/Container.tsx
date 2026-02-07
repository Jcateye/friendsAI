import { A2UIComponentProps, A2UIContainerProps, A2UIDocument, A2UIAction, A2UIComponent } from './types';

// 延迟导入 A2UIRenderer 以避免循环依赖
let A2UIRenderer: React.ComponentType<{ document: A2UIDocument; onAction?: (action: A2UIAction) => void }> | null = null;

const getA2UIRenderer = () => {
  if (!A2UIRenderer) {
    // 动态导入以避免循环依赖
    const module = require('./A2UIRenderer');
    A2UIRenderer = module.A2UIRenderer;
  }
  return A2UIRenderer;
};

export function A2UIContainer({ node, onAction }: A2UIComponentProps) {
  if (node.type !== 'container') {
    return null;
  }

  const props = (node.props || {}) as A2UIContainerProps;
  const { layout = 'column', gap, align, justify, wrap, scroll } = props;
  const children = node.children || [];

  // 布局方向类
  const layoutClasses = {
    row: 'flex-row',
    column: 'flex-col',
    stack: 'flex-col', // stack 暂时用 column 实现
  };

  // 对齐方式类
  const alignClasses = {
    start: 'items-start',
    center: 'items-center',
    end: 'items-end',
    stretch: 'items-stretch',
    baseline: 'items-baseline',
  };

  // 主轴对齐类
  const justifyClasses = {
    start: 'justify-start',
    center: 'justify-center',
    end: 'justify-end',
    between: 'justify-between',
    around: 'justify-around',
    evenly: 'justify-evenly',
  };

  const className = [
    'flex',
    layoutClasses[layout],
    align && alignClasses[align],
    justify && justifyClasses[justify],
    wrap && 'flex-wrap',
    scroll && 'overflow-auto',
  ]
    .filter(Boolean)
    .join(' ');

  const style: React.CSSProperties = {
    ...(gap !== undefined && { gap: `${gap * 4}px` }), // Tailwind gap scale (4px per unit)
    ...(node.style || {}),
  };

  const Renderer = getA2UIRenderer();

  return (
    <div
      className={className}
      style={style}
      id={node.id}
      data-testid={node.testId}
    >
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

