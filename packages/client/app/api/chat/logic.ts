import type { ContactCard } from '@/types';

interface ProxyMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ProxyResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
}

export type ChatToolName = 'extract_contact_info' | 'feishu_template_message';

export interface ChatRequestInput {
  contact: {
    id: string;
    name: string;
  };
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
  tools?: {
    enabled: ChatToolName[];
    disabled?: ChatToolName[];
    feishuTemplateMessage?: {
      templateId?: string;
      variables?: Record<string, string>;
      mode?: 'sync' | 'preview';
    };
  };
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export interface ChatApiPayload {
  model: string;
  messages: ProxyMessage[];
  temperature: number;
}

const DEFAULT_ENABLED_TOOLS: ChatToolName[] = ['extract_contact_info'];
const FEISHU_TEMPLATE_ID_MAX_LENGTH = 128;
const FEISHU_VARIABLE_MAX_ENTRIES = 50;
const FEISHU_VARIABLE_KEY_MAX_LENGTH = 64;
const FEISHU_VARIABLE_VALUE_MAX_LENGTH = 512;
const MAX_MESSAGES = 1000;
const MAX_MESSAGE_CONTENT_LENGTH = 12000;
const MAX_TOTAL_MESSAGE_CONTENT_LENGTH = 200000;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function parseToolNameArray(input: unknown, field: 'enabled' | 'disabled'): ChatToolName[] {
  if (input === undefined) {
    return field === 'enabled' ? [...DEFAULT_ENABLED_TOOLS] : [];
  }

  if (!Array.isArray(input)) {
    throw new ValidationError(`tools.${field} 必须是数组`);
  }

  return Array.from(
    new Set(
      input.map((toolName: unknown): ChatToolName => {
        if (toolName !== 'extract_contact_info' && toolName !== 'feishu_template_message') {
          throw new ValidationError(`tools.${field} 包含不支持的工具`);
        }

        return toolName;
      })
    )
  );
}

function parseTools(input: unknown): NonNullable<ChatRequestInput['tools']> {
  if (input === undefined) {
    return {
      enabled: [...DEFAULT_ENABLED_TOOLS],
      disabled: [],
    };
  }

  if (!isPlainObject(input)) {
    throw new ValidationError('tools 格式无效');
  }

  const enabled = parseToolNameArray(input.enabled, 'enabled');
  const disabled = parseToolNameArray(input.disabled, 'disabled');

  const feishuInput = input.feishuTemplateMessage;

  if (feishuInput === undefined) {
    return {
      enabled,
      disabled,
    };
  }

  if (!isPlainObject(feishuInput)) {
    throw new ValidationError('tools.feishuTemplateMessage 格式无效');
  }

  const templateIdInput = feishuInput.templateId;
  if (templateIdInput !== undefined && typeof templateIdInput !== 'string') {
    throw new ValidationError('tools.feishuTemplateMessage.templateId 必须是字符串');
  }

  const templateId = templateIdInput?.trim();
  if (templateId && templateId.length > FEISHU_TEMPLATE_ID_MAX_LENGTH) {
    throw new ValidationError('tools.feishuTemplateMessage.templateId 超出限制');
  }

  const modeInput = feishuInput.mode;
  if (modeInput !== undefined && modeInput !== 'sync' && modeInput !== 'preview') {
    throw new ValidationError('tools.feishuTemplateMessage.mode 无效');
  }

  const variablesInput = feishuInput.variables;
  if (variablesInput !== undefined && !isPlainObject(variablesInput)) {
    throw new ValidationError('tools.feishuTemplateMessage.variables 必须是对象');
  }

  const variablesEntries = Object.entries(variablesInput ?? {});

  if (variablesEntries.length > FEISHU_VARIABLE_MAX_ENTRIES) {
    throw new ValidationError('tools.feishuTemplateMessage.variables 条目过多');
  }

  const normalizedVariables = variablesEntries.reduce<Record<string, string>>((acc, [rawKey, rawValue]) => {
    if (typeof rawValue !== 'string') {
      throw new ValidationError('tools.feishuTemplateMessage.variables 的值必须是字符串');
    }

    const key = rawKey.trim();
    const value = rawValue.trim();

    if (!key || key.length > FEISHU_VARIABLE_KEY_MAX_LENGTH) {
      throw new ValidationError('tools.feishuTemplateMessage.variables 的键超出限制');
    }

    if (value.length > FEISHU_VARIABLE_VALUE_MAX_LENGTH) {
      throw new ValidationError('tools.feishuTemplateMessage.variables 的值超出限制');
    }

    return {
      ...acc,
      [key]: value,
    };
  }, {});

  return {
    enabled,
    disabled,
    feishuTemplateMessage: {
      templateId,
      variables: Object.keys(normalizedVariables).length > 0 ? normalizedVariables : undefined,
      mode: modeInput ?? 'sync',
    },
  };
}

export function isToolEnabled(request: Pick<ChatRequestInput, 'tools'>, toolName: ChatToolName): boolean {
  const enabled = request.tools?.enabled ?? DEFAULT_ENABLED_TOOLS;
  const disabled = request.tools?.disabled ?? [];

  if (disabled.includes(toolName)) {
    return false;
  }

  return enabled.includes(toolName);
}

export function parseChatRequestBody(input: unknown): ChatRequestInput {
  if (!input || typeof input !== 'object') {
    throw new ValidationError('请求体必须是对象');
  }

  const body = input as Partial<ChatRequestInput> & { tools?: unknown };

  if (!body.contact || typeof body.contact !== 'object') {
    throw new ValidationError('缺少联系人信息');
  }

  if (typeof body.contact.id !== 'string' || typeof body.contact.name !== 'string') {
    throw new ValidationError('联系人信息格式无效');
  }

  const contactId = body.contact.id.trim();
  const contactName = body.contact.name.trim();

  if (!contactId || contactId.length > 64 || !contactName || contactName.length > 80) {
    throw new ValidationError('联系人信息超出限制');
  }

  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    throw new ValidationError('消息列表不能为空');
  }

  if (body.messages.length > MAX_MESSAGES) {
    throw new ValidationError('消息条数超出限制');
  }

  const normalizedMessages = body.messages
    .filter((message): message is { role: 'user' | 'assistant'; content: string } => {
      if (!message || typeof message !== 'object') {
        return false;
      }

      if (message.role !== 'user' && message.role !== 'assistant') {
        return false;
      }

      return typeof message.content === 'string';
    })
    .map((message) => ({
      role: message.role,
      content: message.content.trim(),
    }));

  if (normalizedMessages.length === 0) {
    throw new ValidationError('消息列表格式无效');
  }

  if (
    normalizedMessages.some(
      (message) => message.content.length === 0 || message.content.length > MAX_MESSAGE_CONTENT_LENGTH
    )
  ) {
    throw new ValidationError('消息内容超出限制');
  }

  const totalMessageContentLength = normalizedMessages.reduce(
    (sum, message) => sum + message.content.length,
    0
  );

  if (totalMessageContentLength > MAX_TOTAL_MESSAGE_CONTENT_LENGTH) {
    throw new ValidationError('消息总长度超出限制');
  }

  return {
    contact: {
      id: contactId,
      name: contactName,
    },
    messages: normalizedMessages,
    tools: parseTools(body.tools),
  };
}

export function buildProxyPayload(request: ChatRequestInput, model: string): ChatApiPayload {
  const systemPrompt =
    '你是朋友关系管理助手。请用简洁中文回复，并尽量提取用户对话里的联系人信息（如邮箱、手机号、公司、职位、标签）。';

  const mappedMessages: ProxyMessage[] = request.messages.map((message) => {
    const role = message.role === 'assistant' ? 'assistant' : 'user';
    return {
      role,
      content: message.content,
    };
  });

  return {
    model,
    temperature: 0.4,
    messages: [
      {
        role: 'system',
        content: systemPrompt,
      },
      ...mappedMessages,
    ],
  };
}

export function extractAssistantReply(proxyResponse: ProxyResponse): string {
  const content = proxyResponse.choices?.[0]?.message?.content;

  if (!content || typeof content !== 'string') {
    return '我已经记下来了。';
  }

  const normalized = content.trim();
  return normalized || '我已经记下来了。';
}

export function extractContactCardFromText(
  text: string,
  contactName: string,
  sourceMessageId: string
): ContactCard | null {
  const normalized = text.trim();

  if (!normalized) {
    return null;
  }

  const emailMatch = normalized.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  const phoneMatch = normalized.match(/(?:\+?86[-\s]?)?1[3-9]\d{9}/);
  const titleMatch = normalized.match(/(工程师|产品经理|设计师|销售|运营|创始人|教师|医生)/);
  const companyMatch = normalized.match(/(?:在|就职于|任职于)([^，。\s]{2,20})(?:工作|任职|上班)?/);

  const tags: string[] = [];
  if (normalized.includes('React')) tags.push('React');
  if (normalized.includes('AI')) tags.push('AI');
  if (normalized.includes('创业')) tags.push('创业');

  const hasAnyField = Boolean(emailMatch || phoneMatch || titleMatch || companyMatch || tags.length > 0);

  if (!hasAnyField) {
    return null;
  }

  return {
    id: `${sourceMessageId}-card`,
    name: contactName,
    email: emailMatch?.[0],
    phone: phoneMatch?.[0],
    company: companyMatch?.[1],
    title: titleMatch?.[0],
    tags,
    notes: '由 AI 对话自动提取',
    createdAt: new Date(),
    sourceMessageId,
  };
}

export function buildToolResult(card: ContactCard | null): string | undefined {
  if (!card) {
    return undefined;
  }

  const fields: string[] = [];

  if (card.name) fields.push(card.name);
  if (card.email) fields.push(`邮箱 ${card.email}`);
  if (card.phone) fields.push(`手机号 ${card.phone}`);
  if (card.company) fields.push(`公司 ${card.company}`);
  if (card.title) fields.push(`职位 ${card.title}`);

  if (fields.length === 0) {
    return undefined;
  }

  return `已提取联系人信息：${fields.join('，')}`;
}
