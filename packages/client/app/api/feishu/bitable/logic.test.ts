import { describe, expect, it, vi } from 'vitest';
import {
  buildBitableRecordFields,
  parseBitableSyncRequestBody,
  requestTenantAccessToken,
  syncMessageToBitable,
  ValidationError,
  type BitableSyncRequest,
} from './logic';

describe('parseBitableSyncRequestBody', () => {
  const basePayload = {
    contactId: 'contact-1',
    contactName: '张三',
    messageId: 'msg-1',
    role: 'user',
    content: '你好',
    occurredAt: '2026-02-11T09:00:00.000Z',
    source: 'chat',
  };

  it('parses and trims valid payload', () => {
    const parsed = parseBitableSyncRequestBody({
      ...basePayload,
      contactName: ' 张三 ',
      content: ' 你好，飞书 ',
    });

    expect(parsed.contactName).toBe('张三');
    expect(parsed.content).toBe('你好，飞书');
    expect(parsed.occurredAt).toBe('2026-02-11T09:00:00.000Z');
  });

  it('throws for invalid role', () => {
    expect(() =>
      parseBitableSyncRequestBody({
        ...basePayload,
        role: 'bot',
      })
    ).toThrow(ValidationError);
  });

  it('throws for oversized content', () => {
    expect(() =>
      parseBitableSyncRequestBody({
        ...basePayload,
        content: 'a'.repeat(4001),
      })
    ).toThrow(ValidationError);
  });

  it('parses extracted fields and trims values', () => {
    const parsed = parseBitableSyncRequestBody({
      ...basePayload,
      extractedFields: {
        Company: ' 字节 ',
        Title: ' 工程师 ',
      },
    });

    expect(parsed.extractedFields).toEqual({
      Company: '字节',
      Title: '工程师',
    });
  });

  it('throws when extracted fields value is not string', () => {
    expect(() =>
      parseBitableSyncRequestBody({
        ...basePayload,
        extractedFields: {
          Company: 123,
        },
      })
    ).toThrow(ValidationError);
  });

  it('throws when extracted fields key is invalid', () => {
    expect(() =>
      parseBitableSyncRequestBody({
        ...basePayload,
        extractedFields: {
          '': 'x',
        },
      })
    ).toThrow(ValidationError);
  });

});

describe('buildBitableRecordFields', () => {
  it('maps fields for bitable record', () => {
    const payload: BitableSyncRequest = {
      contactId: 'contact-1',
      contactName: '张三',
      messageId: 'msg-1',
      role: 'assistant',
      content: '收到',
      occurredAt: '2026-02-11T09:00:00.000Z',
      source: 'chat',
      extractedFields: {
        Company: '字节',
      },
    };

    const fields = buildBitableRecordFields(payload);

    expect(fields['Contact ID']).toBe('contact-1');
    expect(fields['Role']).toBe('assistant');
    expect(fields['Content']).toBe('收到');
    expect(fields['Company']).toBe('字节');
  });
});

describe('requestTenantAccessToken', () => {
  it('returns tenant token', async () => {
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          code: 0,
          tenant_access_token: 'tenant-token-1',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );

    const token = await requestTenantAccessToken(
      {
        appId: 'app-id',
        appSecret: 'app-secret',
        baseUrl: 'https://open.feishu.cn',
      },
      fetchMock
    );

    expect(token).toBe('tenant-token-1');
  });

  it('throws when token api returns non-2xx', async () => {
    const fetchMock = vi.fn(async () => new Response('bad gateway', { status: 502 }));

    await expect(
      requestTenantAccessToken(
        {
          appId: 'app-id',
          appSecret: 'app-secret',
          baseUrl: 'https://open.feishu.cn',
        },
        fetchMock
      )
    ).rejects.toThrow('获取飞书租户令牌失败');
  });

  it('throws when token api returns error', async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ code: 999, msg: 'failed' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    await expect(
      requestTenantAccessToken(
        {
          appId: 'app-id',
          appSecret: 'app-secret',
          baseUrl: 'https://open.feishu.cn',
        },
        fetchMock
      )
    ).rejects.toThrow('获取飞书租户令牌失败');
  });
});


describe('syncMessageToBitable', () => {
  const input = {
    payload: {
      contactId: 'contact-1',
      contactName: '张三',
      messageId: 'msg-1',
      role: 'user' as const,
      content: 'hello',
      occurredAt: '2026-02-11T09:00:00.000Z',
      source: 'chat',
    },
    config: {
      appId: 'app-id',
      appSecret: 'app-secret',
      appToken: 'app-token',
      tableId: 'tbl-1',
      baseUrl: 'https://open.feishu.cn',
    },
  };

  it('writes record and returns record id', async () => {
    const fetchMock = vi
      .fn()
      .mockImplementationOnce(async () =>
        new Response(JSON.stringify({ code: 0, tenant_access_token: 'tenant-token-1' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      )
      .mockImplementationOnce(async () =>
        new Response(JSON.stringify({ code: 0, data: { record: { record_id: 'rec_1' } } }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

    const result = await syncMessageToBitable(input, fetchMock);

    expect(result.recordId).toBe('rec_1');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('throws when record api returns non-2xx', async () => {
    const fetchMock = vi
      .fn()
      .mockImplementationOnce(async () =>
        new Response(JSON.stringify({ code: 0, tenant_access_token: 'tenant-token-1' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      )
      .mockImplementationOnce(async () => new Response('bad gateway', { status: 502 }));

    await expect(syncMessageToBitable(input, fetchMock)).rejects.toThrow('写入飞书多维表失败');
  });

  it('throws when record api code is not zero', async () => {
    const fetchMock = vi
      .fn()
      .mockImplementationOnce(async () =>
        new Response(JSON.stringify({ code: 0, tenant_access_token: 'tenant-token-1' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      )
      .mockImplementationOnce(async () =>
        new Response(JSON.stringify({ code: 999, msg: 'failed' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

    await expect(syncMessageToBitable(input, fetchMock)).rejects.toThrow('写入飞书多维表失败');
  });
});

