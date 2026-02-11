import { NextResponse } from 'next/server';
import {
  buildProxyPayload,
  buildToolResult,
  extractAssistantReply,
  extractContactCardFromText,
  isToolEnabled,
  parseChatRequestBody,
  ValidationError,
} from './logic';
import { parseBitableSyncRequestBody, syncMessageToBitable } from '../feishu/bitable/logic';

const LOCAL_AI_BASE_URL = process.env.LOCAL_AI_BASE_URL ?? 'http://127.0.0.1:9739/v1';
const LOCAL_AI_MODEL = process.env.LOCAL_AI_MODEL ?? 'claude-sonnet-4-5-thinking';
const LOCAL_AI_API_KEY = process.env.LOCAL_AI_API_KEY ?? '';
const FEISHU_SYNC_ENABLED = process.env.FEISHU_SYNC_ENABLED === 'true';
const FEISHU_CHAT_TOOL_ENABLED = process.env.FEISHU_CHAT_TOOL_ENABLED === 'true';
const FEISHU_BASE_URL = process.env.FEISHU_BASE_URL ?? 'https://open.feishu.cn';
const FEISHU_APP_ID = process.env.FEISHU_APP_ID ?? '';
const FEISHU_APP_SECRET = process.env.FEISHU_APP_SECRET ?? '';
const FEISHU_BITABLE_APP_TOKEN = process.env.FEISHU_BITABLE_APP_TOKEN ?? '';
const FEISHU_BITABLE_TABLE_ID = process.env.FEISHU_BITABLE_TABLE_ID ?? '';
const FEISHU_FIELD_MAPPING_JSON = process.env.FEISHU_FIELD_MAPPING_JSON ?? '';
const RESERVED_FEISHU_FIELDS = new Set([
  'Contact ID',
  'Contact Name',
  'Message ID',
  'Role',
  'Content',
  'Source',
  'Occurred At',
]);

function createRequestId(): string {
  return `chat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function sanitizeForLog(value: unknown, maxLength: number): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  return value.replace(/[\r\n\t\0]/g, ' ').slice(0, maxLength);
}

function summarizeToolList(input: unknown): string[] | undefined {
  if (!Array.isArray(input)) {
    return undefined;
  }

  return input
    .slice(0, 10)
    .map((item) => sanitizeForLog(item, 32) ?? typeof item);
}

function parseFeishuFieldMapping(raw: string): Record<string, string> {
  const normalized = raw.trim();
  if (!normalized) {
    return {};
  }

  const parsed = JSON.parse(normalized) as unknown;
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('FEISHU_FIELD_MAPPING_JSON must be an object');
  }

  return Object.entries(parsed).reduce<Record<string, string>>((acc, [rawKey, rawValue]) => {
    if (typeof rawValue !== 'string') {
      throw new Error('FEISHU_FIELD_MAPPING_JSON values must be strings');
    }

    const key = rawKey.trim();
    const value = rawValue.trim();

    if (!key || !value) {
      throw new Error('FEISHU_FIELD_MAPPING_JSON contains empty key/value');
    }

    if (RESERVED_FEISHU_FIELDS.has(value)) {
      throw new Error('FEISHU_FIELD_MAPPING_JSON maps to reserved field');
    }

    return {
      ...acc,
      [key]: value,
    };
  }, {});
}

function summarizeRawBody(rawBody: unknown): Record<string, unknown> {
  if (!rawBody || typeof rawBody !== 'object' || Array.isArray(rawBody)) {
    return {
      rawBodyType: Array.isArray(rawBody) ? 'array' : typeof rawBody,
    };
  }

  const candidate = rawBody as {
    contact?: { id?: unknown };
    messages?: unknown;
    tools?: { enabled?: unknown; disabled?: unknown; feishuTemplateMessage?: { mode?: unknown } };
  };

  const messages = Array.isArray(candidate.messages) ? candidate.messages : [];

  return {
    contactId: sanitizeForLog(candidate.contact?.id, 64),
    messageCount: messages.length,
    messageRoles: messages
      .slice(0, 5)
      .map((message) => {
        if (!message || typeof message !== 'object') {
          return 'invalid';
        }

        return sanitizeForLog((message as { role?: unknown }).role, 24) ?? 'missing';
      }),
    enabledTools: summarizeToolList(candidate.tools?.enabled),
    disabledTools: summarizeToolList(candidate.tools?.disabled),
    feishuMode: sanitizeForLog(candidate.tools?.feishuTemplateMessage?.mode, 24),
  };
}

function mapExtractedFields(
  extractedFields: Record<string, string> | undefined,
  fieldMapping: Record<string, string>
): Record<string, string> | undefined {
  if (!extractedFields) {
    return undefined;
  }

  return Object.entries(extractedFields).reduce<Record<string, string>>((acc, [key, value]) => {
    const mappedKey = fieldMapping[key] ?? key;
    return {
      ...acc,
      [mappedKey]: value,
    };
  }, {});
}

export async function POST(request: Request) {
  const requestId = createRequestId();
  const startedAt = Date.now();
  let rawBodySummary: Record<string, unknown> = {};

  try {
    if (!LOCAL_AI_API_KEY) {
      console.error('[api/chat] local AI key missing', { requestId });
      return NextResponse.json({ error: '本地 AI 服务未配置密钥', requestId }, { status: 500 });
    }

    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      console.error('[api/chat] invalid json body', {
        requestId,
        elapsedMs: Date.now() - startedAt,
      });
      return NextResponse.json({ error: '请求体 JSON 无效', requestId }, { status: 400 });
    }
    rawBodySummary = summarizeRawBody(rawBody);

    console.info('[api/chat] request received', {
      requestId,
      ...rawBodySummary,
    });

    const parsed = parseChatRequestBody(rawBody);
    const payload = buildProxyPayload(parsed, LOCAL_AI_MODEL);

    let feishuFieldMapping: Record<string, string> = {};
    try {
      feishuFieldMapping = parseFeishuFieldMapping(FEISHU_FIELD_MAPPING_JSON);
    } catch (error) {
      console.warn('[api/chat] invalid feishu field mapping config', {
        requestId,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    const proxyResponse = await fetch(`${LOCAL_AI_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${LOCAL_AI_API_KEY}`,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15000),
    });

    if (!proxyResponse.ok) {
      if (proxyResponse.status === 429) {
        console.warn('[api/chat] upstream rate limited', {
          requestId,
          status: proxyResponse.status,
          statusText: proxyResponse.statusText,
          elapsedMs: Date.now() - startedAt,
        });

        return NextResponse.json(
          {
            reply: '当前 AI 服务请求较多，请稍后重试。',
            requestId,
            rateLimited: true,
          },
          { status: 200 }
        );
      }

      console.error('[api/chat] upstream failed', {
        requestId,
        status: proxyResponse.status,
        statusText: proxyResponse.statusText,
        elapsedMs: Date.now() - startedAt,
      });

      return NextResponse.json({ error: '本地 AI 代理请求失败', requestId }, { status: 502 });
    }

    const proxyData = (await proxyResponse.json()) as unknown;
    const reply = extractAssistantReply(proxyData as { choices?: Array<{ message?: { content?: string } }> });

    const latestUserMessage = [...parsed.messages].reverse().find((message) => message.role === 'user');

    const sourceMessageId = `source-${Date.now()}`;
    const canExtractContactInfo = isToolEnabled(parsed, 'extract_contact_info');
    const canUseFeishuTemplateMessage =
      FEISHU_CHAT_TOOL_ENABLED && isToolEnabled(parsed, 'feishu_template_message');
    const feishuMode = parsed.tools?.feishuTemplateMessage?.mode ?? 'sync';

    const extractedContactCard = canExtractContactInfo && latestUserMessage
      ? extractContactCardFromText(latestUserMessage.content, parsed.contact.name, sourceMessageId)
      : null;

    const contactCard = canExtractContactInfo ? extractedContactCard ?? undefined : undefined;
    const toolResult = canExtractContactInfo ? buildToolResult(extractedContactCard) : undefined;

    const extractedFields = canExtractContactInfo
      ? mapExtractedFields(
          extractedContactCard
            ? {
                ...(extractedContactCard.email ? { Email: extractedContactCard.email } : {}),
                ...(extractedContactCard.phone ? { Phone: extractedContactCard.phone } : {}),
                ...(extractedContactCard.company ? { Company: extractedContactCard.company } : {}),
                ...(extractedContactCard.title ? { Title: extractedContactCard.title } : {}),
                ...(extractedContactCard.tags && extractedContactCard.tags.length > 0
                  ? { Tags: extractedContactCard.tags.join(', ') }
                  : {}),
              }
            : undefined,
          feishuFieldMapping
        )
      : undefined;

    if (
      canUseFeishuTemplateMessage &&
      feishuMode === 'sync' &&
      FEISHU_SYNC_ENABLED &&
      FEISHU_APP_ID &&
      FEISHU_APP_SECRET &&
      FEISHU_BITABLE_APP_TOKEN &&
      FEISHU_BITABLE_TABLE_ID &&
      latestUserMessage &&
      latestUserMessage.role === 'user'
    ) {
      try {
        const feishuPayload = parseBitableSyncRequestBody({
          contactId: parsed.contact.id,
          contactName: parsed.contact.name,
          messageId: sourceMessageId,
          role: 'user',
          content: latestUserMessage.content,
          occurredAt: new Date().toISOString(),
          source: 'chat',
          extractedFields,
        });

        await syncMessageToBitable({
          payload: feishuPayload,
          config: {
            baseUrl: FEISHU_BASE_URL,
            appId: FEISHU_APP_ID,
            appSecret: FEISHU_APP_SECRET,
            appToken: FEISHU_BITABLE_APP_TOKEN,
            tableId: FEISHU_BITABLE_TABLE_ID,
          },
        });
      } catch (error) {
        console.error('[api/chat] feishu sync failed', {
          requestId,
          contactId: sanitizeForLog(parsed.contact.id, 64),
          messageId: sourceMessageId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    console.info('[api/chat] request completed', {
      requestId,
      contactId: sanitizeForLog(parsed.contact.id, 64),
      messageCount: parsed.messages.length,
      extractedContactCard: Boolean(contactCard),
      elapsedMs: Date.now() - startedAt,
    });

    return NextResponse.json({
      reply,
      toolResult,
      contactCard,
      requestId,
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      console.error('[api/chat] validation failed', {
        requestId,
        error: error.message,
        elapsedMs: Date.now() - startedAt,
        ...rawBodySummary,
      });
      return NextResponse.json({ error: error.message, requestId }, { status: 400 });
    }

    console.error('[api/chat] unexpected failure', {
      requestId,
      error: error instanceof Error ? error.message : String(error),
      elapsedMs: Date.now() - startedAt,
      ...rawBodySummary,
    });

    return NextResponse.json({ error: '请求处理失败', requestId }, { status: 500 });
  }
}
