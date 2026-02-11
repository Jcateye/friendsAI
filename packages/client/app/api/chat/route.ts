import { NextResponse } from 'next/server';
import {
  buildProxyPayload,
  buildToolResult,
  extractAssistantReply,
  extractContactCardFromText,
  parseChatRequestBody,
  ValidationError,
} from './logic';

const LOCAL_AI_BASE_URL = process.env.LOCAL_AI_BASE_URL ?? 'http://127.0.0.1:9739/v1';
const LOCAL_AI_MODEL = process.env.LOCAL_AI_MODEL ?? 'gemini-3-flash';
const LOCAL_AI_API_KEY = process.env.LOCAL_AI_API_KEY ?? '';

export async function POST(request: Request) {
  try {
    if (!LOCAL_AI_API_KEY) {
      return NextResponse.json({ error: '本地 AI 服务未配置密钥' }, { status: 500 });
    }

    const rawBody = await request.json();
    const parsed = parseChatRequestBody(rawBody);
    const payload = buildProxyPayload(parsed, LOCAL_AI_MODEL);

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
      return NextResponse.json({ error: '本地 AI 代理请求失败' }, { status: 502 });
    }

    const proxyData = (await proxyResponse.json()) as unknown;
    const reply = extractAssistantReply(proxyData as { choices?: Array<{ message?: { content?: string } }> });

    const latestUserMessage = [...parsed.messages]
      .reverse()
      .find((message) => message.role !== 'assistant');

    const sourceMessageId = `source-${Date.now()}`;
    const contactCard = latestUserMessage
      ? extractContactCardFromText(latestUserMessage.content, parsed.contact.name, sourceMessageId)
      : null;

    const toolResult = buildToolResult(contactCard);

    return NextResponse.json({
      reply,
      toolResult,
      contactCard,
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ error: '请求处理失败' }, { status: 500 });
  }
}
