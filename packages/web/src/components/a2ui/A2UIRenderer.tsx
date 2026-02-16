import { A2UIRendererProps, A2UIComponent, A2UIAction } from './types';
import { A2UIContainer } from './Container';
import { A2UICard } from './Card';
import { A2UIText } from './Text';
import { A2UIButton } from './Button';
import { A2UIForm } from './Form';
import { A2UIInput } from './Input';
import { A2UISelect } from './Select';
import { A2UIBadge } from './Badge';
import { A2UIDivider } from './Divider';
import { ArchiveReviewCard } from './domain/ArchiveReviewCard';
import { ToolTraceCard } from './domain/ToolTraceCard';
import { ConfirmBar } from './domain/ConfirmBar';
import { TemplatePicker } from './domain/TemplatePicker';
import { DraftPreview } from './domain/DraftPreview';
import { ErrorCard } from './domain/ErrorCard';

// 组件映射表
const componentMap: Record<
  string,
  React.ComponentType<{ node: A2UIComponent; onAction?: (action: A2UIAction) => void }>
> = {
  container: A2UIContainer,
  section: A2UIContainer, // section 暂时用 container 实现
  card: A2UICard,
  text: A2UIText,
  button: A2UIButton,
  form: A2UIForm,
  input: A2UIInput,
  select: A2UISelect,
  badge: A2UIBadge,
  divider: A2UIDivider,
  // 业务组件
  'archive-review-card': ArchiveReviewCard,
  'tool-trace-card': ToolTraceCard,
  'confirm-bar': ConfirmBar,
  'template-picker': TemplatePicker,
  'draft-preview': DraftPreview,
  'error-card': ErrorCard,
};

export function A2UIRenderer({ document, onAction }: A2UIRendererProps) {
  const { root } = document;

  // 处理可见性
  if (root.visible === false) {
    return null;
  }

  // 处理 custom 类型组件
  if (root.type === 'custom') {
    const CustomComponent = componentMap[root.name];
    if (CustomComponent) {
      return <CustomComponent node={root} onAction={onAction} />;
    }
    // 如果找不到对应的组件，返回 null 或显示错误
    console.warn(`Unknown custom component: ${root.name}`);
    return null;
  }

  // 获取对应的组件
  const Component = componentMap[root.type];
  if (!Component) {
    console.warn(`Unknown component type: ${root.type}`);
    return null;
  }

  return <Component node={root} onAction={onAction} />;
}









