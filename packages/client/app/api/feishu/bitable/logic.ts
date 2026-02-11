export interface BitableSyncRequest {
  contactId: string;
  contactName: string;
  messageId: string;
  role: 'user' | 'assistant';
  content: string;
  occurredAt: string;
  source: string;
  extractedFields?: Record<string, string>;
}

interface TenantTokenResponse {
  code?: number;
  msg?: string;
  tenant_access_token?: string;
}

interface BitableCreateRecordResponse {
  code?: number;
  msg?: string;
  data?: {
    record?: {
      record_id?: string;
    };
  };
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

interface FeishuAuthConfig {
  appId: string;
  appSecret: string;
  baseUrl: string;
}

interface FeishuBitableConfig extends FeishuAuthConfig {
  appToken: string;
  tableId: string;
}

export function parseBitableSyncRequestBody(input: unknown): BitableSyncRequest {
  if (!input || typeof input !== 'object') {
    throw new ValidationError('请求体必须是对象');
  }

  const body = input as Partial<BitableSyncRequest>;

  if (
    typeof body.contactId !== 'string' ||
    typeof body.contactName !== 'string' ||
    typeof body.messageId !== 'string' ||
    typeof body.role !== 'string' ||
    typeof body.content !== 'string' ||
    typeof body.occurredAt !== 'string' ||
    typeof body.source !== 'string'
  ) {
    throw new ValidationError('请求字段格式无效');
  }

  const contactId = body.contactId.trim();
  const contactName = body.contactName.trim();
  const messageId = body.messageId.trim();
  const role = body.role.trim();
  const content = body.content.trim();
  const occurredAt = body.occurredAt.trim();
  const source = body.source.trim();

  if (!contactId || contactId.length > 64) {
    throw new ValidationError('contactId 超出限制');
  }

  if (!contactName || contactName.length > 80) {
    throw new ValidationError('contactName 超出限制');
  }

  if (!messageId || messageId.length > 64) {
    throw new ValidationError('messageId 超出限制');
  }

  if (role !== 'user' && role !== 'assistant') {
    throw new ValidationError('role 无效');
  }

  if (!content || content.length > 4000) {
    throw new ValidationError('content 超出限制');
  }

  if (source !== 'chat') {
    throw new ValidationError('source 无效');
  }

  const timestamp = Date.parse(occurredAt);
  if (Number.isNaN(timestamp)) {
    throw new ValidationError('occurredAt 时间格式无效');
  }

  const extractedFieldsInput = body.extractedFields;
  if (extractedFieldsInput !== undefined) {
    if (!extractedFieldsInput || typeof extractedFieldsInput !== 'object' || Array.isArray(extractedFieldsInput)) {
      throw new ValidationError('extractedFields 格式无效');
    }

    const entries = Object.entries(extractedFieldsInput);
    if (entries.length > 50) {
      throw new ValidationError('extractedFields 条目过多');
    }

    for (const [key, value] of entries) {
      if (typeof value !== 'string') {
        throw new ValidationError('extractedFields 的值必须是字符串');
      }

      if (!key.trim() || key.trim().length > 64) {
        throw new ValidationError('extractedFields 的键超出限制');
      }

      if (value.trim().length > 512) {
        throw new ValidationError('extractedFields 的值超出限制');
      }
    }
  }

  return {
    contactId,
    contactName,
    messageId,
    role,
    content,
    occurredAt: new Date(timestamp).toISOString(),
    source,
    extractedFields:
      extractedFieldsInput === undefined
        ? undefined
        : Object.fromEntries(
            Object.entries(extractedFieldsInput).map(([key, value]) => [key.trim(), (value as string).trim()])
          ),
  };
}

export function buildBitableRecordFields(payload: BitableSyncRequest): Record<string, string> {
  return {
    'Contact ID': payload.contactId,
    'Contact Name': payload.contactName,
    'Message ID': payload.messageId,
    Role: payload.role,
    Content: payload.content,
    Source: payload.source,
    'Occurred At': payload.occurredAt,
    ...(payload.extractedFields ?? {}),
  };
}

export async function requestTenantAccessToken(
  config: FeishuAuthConfig,
  requestFn: typeof fetch = fetch
): Promise<string> {
  const response = await requestFn(`${config.baseUrl}/open-apis/auth/v3/tenant_access_token/internal`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      app_id: config.appId,
      app_secret: config.appSecret,
    }),
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) {
    throw new Error('获取飞书租户令牌失败');
  }

  const data = (await response.json()) as TenantTokenResponse;

  if (data.code !== 0 || !data.tenant_access_token) {
    throw new Error('获取飞书租户令牌失败');
  }

  return data.tenant_access_token;
}

export async function syncMessageToBitable(
  input: {
    payload: BitableSyncRequest;
    config: FeishuBitableConfig;
  },
  requestFn: typeof fetch = fetch
): Promise<{ recordId: string }> {
  const token = await requestTenantAccessToken(input.config, requestFn);

  const response = await requestFn(
    `${input.config.baseUrl}/open-apis/bitable/v1/apps/${input.config.appToken}/tables/${input.config.tableId}/records`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        fields: buildBitableRecordFields(input.payload),
      }),
      signal: AbortSignal.timeout(10000),
    }
  );

  if (!response.ok) {
    throw new Error('写入飞书多维表失败');
  }

  const data = (await response.json()) as BitableCreateRecordResponse;
  const recordId = data.data?.record?.record_id;

  if (data.code !== 0 || !recordId) {
    throw new Error('写入飞书多维表失败');
  }

  return { recordId };
}
