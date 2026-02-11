import { beforeEach, describe, expect, it, vi } from 'vitest';

const syncMessageToBitableMock = vi.fn();

vi.mock('../feishu/bitable/logic', () => ({
  parseBitableSyncRequestBody: vi.fn((payload: unknown) => payload),
  syncMessageToBitable: syncMessageToBitableMock,
}));

async function loadPost() {
  vi.resetModules();
  const module = await import('./route');
  return module.POST;
}

function mockAiFetch(reply = '收到') {
  const fetchMock = vi.fn(async () =>
    new Response(
      JSON.stringify({
        choices: [{ message: { content: reply } }],
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  );

  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function createRequest(body: unknown) {
  return new Request('http://localhost/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
}

describe('POST /api/chat', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    process.env.LOCAL_AI_API_KEY = 'test-key';
    process.env.LOCAL_AI_BASE_URL = 'http://127.0.0.1:9739/v1';
    process.env.LOCAL_AI_MODEL = 'claude-sonnet-4-5-thinking';

    process.env.FEISHU_SYNC_ENABLED = 'true';
    process.env.FEISHU_CHAT_TOOL_ENABLED = 'true';
    process.env.FEISHU_APP_ID = 'app-id';
    process.env.FEISHU_APP_SECRET = 'app-secret';
    process.env.FEISHU_BITABLE_APP_TOKEN = 'bitable-app-token';
    process.env.FEISHU_BITABLE_TABLE_ID = 'bitable-table-id';
    process.env.FEISHU_BASE_URL = 'https://open.feishu.cn';
    process.env.FEISHU_FIELD_MAPPING_JSON = '{}';
  });

  it('keeps extract_contact_info enabled by default when tools omitted', async () => {
    mockAiFetch();
    const POST = await loadPost();

    const response = await POST(
      createRequest({
        contact: { id: 'contact-1', name: '张三' },
        messages: [{ role: 'user', content: '我的邮箱是 test@example.com' }],
      })
    );

    const data = (await response.json()) as {
      toolResult?: string;
      contactCard?: { email?: string } | null;
    };

    expect(response.status).toBe(200);
    expect(data.toolResult).toContain('已提取联系人信息');
    expect(data.contactCard?.email).toBe('test@example.com');
  });

  it('skips extraction when extract_contact_info is disabled', async () => {
    mockAiFetch();
    const POST = await loadPost();

    const response = await POST(
      createRequest({
        contact: { id: 'contact-1', name: '张三' },
        messages: [{ role: 'user', content: '我的邮箱是 test@example.com' }],
        tools: {
          enabled: ['extract_contact_info'],
          disabled: ['extract_contact_info'],
        },
      })
    );

    const data = (await response.json()) as {
      toolResult?: string;
      contactCard?: unknown;
    };

    expect(response.status).toBe(200);
    expect(data.toolResult).toBeUndefined();
    expect(data.contactCard).toBeUndefined();
  });

  it('does not trigger feishu sync when feishu tool is not enabled', async () => {
    mockAiFetch();
    const POST = await loadPost();

    await POST(
      createRequest({
        contact: { id: 'contact-1', name: '张三' },
        messages: [{ role: 'user', content: 'hello' }],
        tools: {
          enabled: ['extract_contact_info'],
        },
      })
    );

    expect(syncMessageToBitableMock).not.toHaveBeenCalled();
  });

  it('does not trigger feishu sync when server-side feishu chat tool switch is disabled', async () => {
    mockAiFetch();
    process.env.FEISHU_CHAT_TOOL_ENABLED = 'false';
    const POST = await loadPost();

    await POST(
      createRequest({
        contact: { id: 'contact-1', name: '张三' },
        messages: [{ role: 'user', content: 'hello' }],
        tools: {
          enabled: ['extract_contact_info', 'feishu_template_message'],
          feishuTemplateMessage: {
            mode: 'sync',
          },
        },
      })
    );

    expect(syncMessageToBitableMock).not.toHaveBeenCalled();
  });

  it('triggers feishu sync when feishu tool is enabled in sync mode', async () => {
    mockAiFetch();
    const POST = await loadPost();

    await POST(
      createRequest({
        contact: { id: 'contact-1', name: '张三' },
        messages: [{ role: 'user', content: 'hello' }],
        tools: {
          enabled: ['extract_contact_info', 'feishu_template_message'],
          feishuTemplateMessage: {
            mode: 'sync',
          },
        },
      })
    );

    expect(syncMessageToBitableMock).toHaveBeenCalledTimes(1);
    expect(syncMessageToBitableMock).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({
          contactId: 'contact-1',
          contactName: '张三',
          role: 'user',
          content: 'hello',
          source: 'chat',
        }),
        config: expect.objectContaining({
          baseUrl: 'https://open.feishu.cn',
          appId: 'app-id',
          appSecret: 'app-secret',
          appToken: 'bitable-app-token',
          tableId: 'bitable-table-id',
        }),
      })
    );
  });


  it('applies feishu field mapping to extracted fields', async () => {
    mockAiFetch();
    process.env.FEISHU_FIELD_MAPPING_JSON = JSON.stringify({
      Email: '邮箱',
      Company: '公司',
    });
    const POST = await loadPost();

    await POST(
      createRequest({
        contact: { id: 'contact-1', name: '张三' },
        messages: [{ role: 'user', content: '我的邮箱是 test@example.com，我在字节工作' }],
        tools: {
          enabled: ['extract_contact_info', 'feishu_template_message'],
          feishuTemplateMessage: {
            mode: 'sync',
          },
        },
      })
    );

    expect(syncMessageToBitableMock).toHaveBeenCalledTimes(1);
    expect(syncMessageToBitableMock).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({
          extractedFields: expect.objectContaining({
            邮箱: 'test@example.com',
            公司: '字节工作',
          }),
        }),
      })
    );
  });

  it('does not send extracted fields to feishu when extract tool is disabled', async () => {
    mockAiFetch();
    process.env.FEISHU_FIELD_MAPPING_JSON = JSON.stringify({
      Email: '邮箱',
      Company: '公司',
    });
    const POST = await loadPost();

    await POST(
      createRequest({
        contact: { id: 'contact-1', name: '张三' },
        messages: [{ role: 'user', content: '我的邮箱是 test@example.com，我在字节工作' }],
        tools: {
          enabled: ['extract_contact_info', 'feishu_template_message'],
          disabled: ['extract_contact_info'],
          feishuTemplateMessage: {
            mode: 'sync',
          },
        },
      })
    );

    expect(syncMessageToBitableMock).toHaveBeenCalledTimes(1);
    expect(syncMessageToBitableMock).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.not.objectContaining({
          extractedFields: expect.anything(),
        }),
      })
    );
  });

  it('falls back to default extracted field keys when mapping config is invalid', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    mockAiFetch();
    process.env.FEISHU_FIELD_MAPPING_JSON = '{invalid-json';
    const POST = await loadPost();

    await POST(
      createRequest({
        contact: { id: 'contact-1', name: '张三' },
        messages: [{ role: 'user', content: '我的邮箱是 test@example.com，我在字节工作' }],
        tools: {
          enabled: ['extract_contact_info', 'feishu_template_message'],
          feishuTemplateMessage: {
            mode: 'sync',
          },
        },
      })
    );

    expect(syncMessageToBitableMock).toHaveBeenCalledTimes(1);
    expect(syncMessageToBitableMock).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({
          extractedFields: expect.objectContaining({
            Email: 'test@example.com',
            Company: '字节工作',
          }),
        }),
      })
    );
    expect(warnSpy).toHaveBeenCalledWith(
      '[api/chat] invalid feishu field mapping config',
      expect.objectContaining({
        error: expect.stringContaining('JSON'),
      })
    );

    warnSpy.mockRestore();
  });


  it('returns success when feishu sync fails', async () => {
    mockAiFetch();
    syncMessageToBitableMock.mockRejectedValueOnce(new Error('sync failed'));
    const POST = await loadPost();

    const response = await POST(
      createRequest({
        contact: { id: 'contact-1', name: '张三' },
        messages: [{ role: 'user', content: 'hello' }],
        tools: {
          enabled: ['extract_contact_info', 'feishu_template_message'],
          feishuTemplateMessage: {
            mode: 'sync',
          },
        },
      })
    );

    expect(response.status).toBe(200);
  });

  it('does not trigger feishu sync in preview mode', async () => {
    mockAiFetch();
    const POST = await loadPost();

    await POST(
      createRequest({
        contact: { id: 'contact-1', name: '张三' },
        messages: [{ role: 'user', content: 'hello' }],
        tools: {
          enabled: ['extract_contact_info', 'feishu_template_message'],
          feishuTemplateMessage: {
            mode: 'preview',
          },
        },
      })
    );

    expect(syncMessageToBitableMock).not.toHaveBeenCalled();
  });

  it('returns friendly reply when upstream is rate limited', async () => {
    const fetchMock = vi.fn(async () =>
      new Response(null, {
        status: 429,
        statusText: 'Too Many Requests',
      })
    );
    vi.stubGlobal('fetch', fetchMock);
    const POST = await loadPost();

    const response = await POST(
      createRequest({
        contact: { id: 'contact-1', name: '张三' },
        messages: [{ role: 'user', content: 'hello' }],
      })
    );

    const data = (await response.json()) as {
      reply?: string;
      requestId?: string;
      rateLimited?: boolean;
    };

    expect(response.status).toBe(200);
    expect(data.reply).toBe('当前 AI 服务请求较多，请稍后重试。');
    expect(data.rateLimited).toBe(true);
    expect(data.requestId).toMatch(/^chat-/);
  });

  it('returns 400 with requestId when request json is invalid', async () => {
    mockAiFetch();
    const POST = await loadPost();

    const response = await POST(
      new Request('http://localhost/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: '{invalid json',
      })
    );

    const data = (await response.json()) as {
      error?: string;
      requestId?: string;
    };

    expect(response.status).toBe(400);
    expect(data.error).toBe('请求体 JSON 无效');
    expect(data.requestId).toMatch(/^chat-/);
  });

  it('sanitizes user-controlled values in validation logs', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    mockAiFetch();
    const POST = await loadPost();

    const response = await POST(
      createRequest({
        contact: { id: 'contact-1\nINJECT', name: '张三' },
        messages: [{ role: 'system\nINJECT', content: 'invalid-role' }],
      })
    );

    expect(response.status).toBe(400);
    expect(errorSpy).toHaveBeenCalledWith(
      '[api/chat] validation failed',
      expect.objectContaining({
        contactId: 'contact-1 INJECT',
        messageRoles: ['system INJECT'],
      })
    );

    errorSpy.mockRestore();
  });

  it('returns requestId and validation error details for bad request', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const POST = await loadPost();

    const response = await POST(
      createRequest({
        contact: { id: 'contact-1', name: '张三' },
        messages: [{ role: 'system', content: 'invalid-role' }],
      })
    );

    const data = (await response.json()) as {
      error: string;
      requestId?: string;
    };

    expect(response.status).toBe(400);
    expect(data.error).toBeTruthy();
    expect(data.requestId).toMatch(/^chat-/);
    expect(errorSpy).toHaveBeenCalledWith(
      '[api/chat] validation failed',
      expect.objectContaining({
        requestId: expect.stringMatching(/^chat-/),
        messageCount: 1,
      })
    );

    errorSpy.mockRestore();
  });
});
