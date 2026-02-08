import { z } from 'zod';

// 与后端 schema 保持一致的类型定义
const A2UIPrimitiveSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]);
const A2UIStyleValueSchema = z.union([
  A2UIPrimitiveSchema,
  z.array(A2UIPrimitiveSchema),
]);

export const A2UIStyleSchema = z.record(A2UIStyleValueSchema);

export const A2UIActionSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('navigate'),
    route: z.string().min(1),
    label: z.string().min(1).optional(),
    payload: z.record(z.unknown()).optional(),
  }).strict(),
  z.object({
    type: z.literal('open_url'),
    url: z.string().min(1),
    label: z.string().min(1).optional(),
  }).strict(),
  z.object({
    type: z.literal('submit'),
    formId: z.string().min(1).optional(),
    label: z.string().min(1).optional(),
    payload: z.record(z.unknown()).optional(),
  }).strict(),
  z.object({
    type: z.literal('dismiss'),
    label: z.string().min(1).optional(),
  }).strict(),
  z.object({
    type: z.literal('custom'),
    name: z.string().min(1),
    label: z.string().min(1).optional(),
    payload: z.record(z.unknown()).optional(),
  }).strict(),
]);

const A2UIBaseSchema = z.object({
  id: z.string().min(1).optional(),
  key: z.string().min(1).optional(),
  testId: z.string().min(1).optional(),
  style: A2UIStyleSchema.optional(),
  visible: z.boolean().optional(),
  meta: z.record(z.unknown()).optional(),
});

const A2UIContainerPropsSchema = z.object({
  layout: z.enum(['row', 'column', 'stack']).optional(),
  gap: z.number().nonnegative().optional(),
  align: z.enum(['start', 'center', 'end', 'stretch', 'baseline']).optional(),
  justify: z.enum(['start', 'center', 'end', 'between', 'around', 'evenly']).optional(),
  wrap: z.boolean().optional(),
  scroll: z.boolean().optional(),
}).catchall(z.unknown());

const A2UISectionPropsSchema = z.object({
  title: z.string().min(1).optional(),
  subtitle: z.string().min(1).optional(),
}).catchall(z.unknown());

const A2UITextPropsSchema = z.object({
  text: z.string(),
  format: z.enum(['plain', 'markdown']).optional(),
  variant: z.enum(['title', 'subtitle', 'body', 'caption', 'overline']).optional(),
  align: z.enum(['left', 'center', 'right', 'justify']).optional(),
  maxLines: z.number().int().positive().optional(),
}).catchall(z.unknown());

const A2UIButtonPropsSchema = z.object({
  label: z.string().min(1),
  variant: z.enum(['primary', 'secondary', 'ghost', 'link', 'danger']).optional(),
  size: z.enum(['sm', 'md', 'lg']).optional(),
  disabled: z.boolean().optional(),
  action: A2UIActionSchema.optional(),
  actions: z.array(A2UIActionSchema).min(1).optional(),
}).catchall(z.unknown());

const A2UIImagePropsSchema = z.object({
  src: z.string().min(1),
  alt: z.string().optional(),
  fit: z.enum(['cover', 'contain', 'fill', 'scale-down']).optional(),
  aspectRatio: z.number().positive().optional(),
}).catchall(z.unknown());

const A2UIInputPropsSchema = z.object({
  name: z.string().min(1),
  label: z.string().min(1).optional(),
  placeholder: z.string().optional(),
  value: z.union([z.string(), z.number()]).optional(),
  required: z.boolean().optional(),
  type: z.enum(['text', 'email', 'number', 'password', 'tel', 'date', 'search', 'url']).optional(),
  multiline: z.boolean().optional(),
  rows: z.number().int().positive().optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  step: z.number().optional(),
  pattern: z.string().optional(),
}).catchall(z.unknown());

const A2UISelectOptionSchema = z.object({
  label: z.string().min(1),
  value: z.union([z.string(), z.number()]),
  description: z.string().optional(),
  disabled: z.boolean().optional(),
}).strict();

const A2UISelectPropsSchema = z.object({
  name: z.string().min(1),
  label: z.string().min(1).optional(),
  placeholder: z.string().optional(),
  multiple: z.boolean().optional(),
  options: z.array(A2UISelectOptionSchema).min(1),
  value: z.union([
    z.string(),
    z.number(),
    z.array(z.union([z.string(), z.number()])),
  ]).optional(),
}).catchall(z.unknown());

const A2UICheckboxPropsSchema = z.object({
  name: z.string().min(1),
  label: z.string().min(1).optional(),
  checked: z.boolean().optional(),
  value: z.union([z.string(), z.number()]).optional(),
}).catchall(z.unknown());

const A2UISwitchPropsSchema = z.object({
  name: z.string().min(1),
  label: z.string().min(1).optional(),
  checked: z.boolean().optional(),
}).catchall(z.unknown());

const A2UIDividerPropsSchema = z.object({
  orientation: z.enum(['horizontal', 'vertical']).optional(),
  label: z.string().min(1).optional(),
}).catchall(z.unknown());

const A2UIBadgePropsSchema = z.object({
  text: z.string().min(1),
  variant: z.enum(['default', 'info', 'success', 'warning', 'danger']).optional(),
}).catchall(z.unknown());

const A2UITagPropsSchema = z.object({
  text: z.string().min(1),
  color: z.string().min(1).optional(),
}).catchall(z.unknown());

const A2UILinkPropsSchema = z.object({
  label: z.string().min(1),
  href: z.string().min(1),
  target: z.enum(['self', 'blank']).optional(),
}).catchall(z.unknown());

const A2UIListPropsSchema = z.object({
  ordered: z.boolean().optional(),
  marker: z.string().optional(),
  gap: z.number().nonnegative().optional(),
}).catchall(z.unknown());

const A2UICardPropsSchema = z.object({
  title: z.string().min(1).optional(),
  subtitle: z.string().min(1).optional(),
  elevation: z.number().nonnegative().optional(),
}).catchall(z.unknown());

const A2UIFormPropsSchema = z.object({
  formId: z.string().min(1).optional(),
  submitLabel: z.string().min(1).optional(),
  submitAction: A2UIActionSchema.optional(),
}).catchall(z.unknown());

export const A2UIComponentSchema: z.ZodTypeAny = z.lazy(() =>
  z.discriminatedUnion('type', [
    A2UIBaseSchema.extend({
      type: z.literal('container'),
      props: A2UIContainerPropsSchema.optional(),
      children: z.array(A2UIComponentSchema).optional(),
    }).strict(),
    A2UIBaseSchema.extend({
      type: z.literal('section'),
      props: A2UISectionPropsSchema.optional(),
      children: z.array(A2UIComponentSchema).optional(),
    }).strict(),
    A2UIBaseSchema.extend({
      type: z.literal('card'),
      props: A2UICardPropsSchema.optional(),
      children: z.array(A2UIComponentSchema).optional(),
    }).strict(),
    A2UIBaseSchema.extend({
      type: z.literal('list'),
      props: A2UIListPropsSchema.optional(),
      children: z.array(A2UIComponentSchema).optional(),
    }).strict(),
    A2UIBaseSchema.extend({
      type: z.literal('form'),
      props: A2UIFormPropsSchema.optional(),
      children: z.array(A2UIComponentSchema).optional(),
    }).strict(),
    A2UIBaseSchema.extend({
      type: z.literal('text'),
      props: A2UITextPropsSchema,
    }).strict(),
    A2UIBaseSchema.extend({
      type: z.literal('button'),
      props: A2UIButtonPropsSchema,
    }).strict(),
    A2UIBaseSchema.extend({
      type: z.literal('image'),
      props: A2UIImagePropsSchema,
    }).strict(),
    A2UIBaseSchema.extend({
      type: z.literal('input'),
      props: A2UIInputPropsSchema,
    }).strict(),
    A2UIBaseSchema.extend({
      type: z.literal('select'),
      props: A2UISelectPropsSchema,
    }).strict(),
    A2UIBaseSchema.extend({
      type: z.literal('checkbox'),
      props: A2UICheckboxPropsSchema,
    }).strict(),
    A2UIBaseSchema.extend({
      type: z.literal('switch'),
      props: A2UISwitchPropsSchema,
    }).strict(),
    A2UIBaseSchema.extend({
      type: z.literal('divider'),
      props: A2UIDividerPropsSchema.optional(),
    }).strict(),
    A2UIBaseSchema.extend({
      type: z.literal('badge'),
      props: A2UIBadgePropsSchema,
    }).strict(),
    A2UIBaseSchema.extend({
      type: z.literal('tag'),
      props: A2UITagPropsSchema,
    }).strict(),
    A2UIBaseSchema.extend({
      type: z.literal('link'),
      props: A2UILinkPropsSchema,
    }).strict(),
    A2UIBaseSchema.extend({
      type: z.literal('custom'),
      name: z.string().min(1),
      props: z.record(z.unknown()).optional(),
      children: z.array(A2UIComponentSchema).optional(),
    }).strict(),
  ])
);

export const A2UIDocumentSchema = z.object({
  version: z.string().min(1).default('1.0'),
  title: z.string().min(1).optional(),
  layout: z.enum(['screen', 'modal', 'sheet', 'inline']).optional(),
  root: A2UIComponentSchema,
  metadata: z.record(z.unknown()).optional(),
}).strict();

// TypeScript 类型导出
export type A2UIAction = z.infer<typeof A2UIActionSchema>;
export type A2UIComponent = z.infer<typeof A2UIComponentSchema>;
export type A2UIDocument = z.infer<typeof A2UIDocumentSchema>;
export type A2UIStyle = z.infer<typeof A2UIStyleSchema>;

// 组件 Props 类型
export type A2UIContainerProps = z.infer<typeof A2UIContainerPropsSchema>;
export type A2UISectionProps = z.infer<typeof A2UISectionPropsSchema>;
export type A2UITextProps = z.infer<typeof A2UITextPropsSchema>;
export type A2UIButtonProps = z.infer<typeof A2UIButtonPropsSchema>;
export type A2UIImageProps = z.infer<typeof A2UIImagePropsSchema>;
export type A2UIInputProps = z.infer<typeof A2UIInputPropsSchema>;
export type A2UISelectProps = z.infer<typeof A2UISelectPropsSchema>;
export type A2UICheckboxProps = z.infer<typeof A2UICheckboxPropsSchema>;
export type A2UISwitchProps = z.infer<typeof A2UISwitchPropsSchema>;
export type A2UIDividerProps = z.infer<typeof A2UIDividerPropsSchema>;
export type A2UIBadgeProps = z.infer<typeof A2UIBadgePropsSchema>;
export type A2UITagProps = z.infer<typeof A2UITagPropsSchema>;
export type A2UILinkProps = z.infer<typeof A2UILinkPropsSchema>;
export type A2UIListProps = z.infer<typeof A2UIListPropsSchema>;
export type A2UICardProps = z.infer<typeof A2UICardPropsSchema>;
export type A2UIFormProps = z.infer<typeof A2UIFormPropsSchema>;

// Renderer Props
export interface A2UIRendererProps {
  document: A2UIDocument;
  onAction?: (action: A2UIAction) => void;
}

// 组件 Props 基础接口
export interface A2UIComponentProps {
  node: A2UIComponent;
  onAction?: (action: A2UIAction) => void;
}








