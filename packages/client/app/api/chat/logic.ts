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

export interface ChatRequestInput {
  contact: {
    id: string;
    name: string;
  };
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
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

export function parseChatRequestBody(input: unknown): ChatRequestInput {
  if (!input || typeof input !== 'object') {
    throw new ValidationError('请求体必须是对象');
  }

  const body = input as Partial<ChatRequestInput>;

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

  if (body.messages.length > 50) {
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

  if (normalizedMessages.some((message) => message.content.length === 0 || message.content.length > 4000)) {
    throw new ValidationError('消息内容超出限制');
  }

  return {
    contact: {
      id: contactId,
      name: contactName,
    },
    messages: normalizedMessages,
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
