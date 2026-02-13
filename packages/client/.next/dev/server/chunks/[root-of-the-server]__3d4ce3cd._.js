module.exports = [
"[externals]/next/dist/compiled/next-server/app-route-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-route-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/next-server/app-page-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-page-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-unit-async-storage.external.js [external] (next/dist/server/app-render/work-unit-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-unit-async-storage.external.js", () => require("next/dist/server/app-render/work-unit-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-async-storage.external.js [external] (next/dist/server/app-render/work-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-async-storage.external.js", () => require("next/dist/server/app-render/work-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/shared/lib/no-fallback-error.external.js [external] (next/dist/shared/lib/no-fallback-error.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/shared/lib/no-fallback-error.external.js", () => require("next/dist/shared/lib/no-fallback-error.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/after-task-async-storage.external.js [external] (next/dist/server/app-render/after-task-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/after-task-async-storage.external.js", () => require("next/dist/server/app-render/after-task-async-storage.external.js"));

module.exports = mod;
}),
"[project]/OnePersonCompany/friendsAI/packages/client/app/api/chat/logic.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ValidationError",
    ()=>ValidationError,
    "buildProxyPayload",
    ()=>buildProxyPayload,
    "buildToolResult",
    ()=>buildToolResult,
    "extractAssistantReply",
    ()=>extractAssistantReply,
    "extractContactCardFromText",
    ()=>extractContactCardFromText,
    "isToolEnabled",
    ()=>isToolEnabled,
    "parseChatRequestBody",
    ()=>parseChatRequestBody
]);
class ValidationError extends Error {
    constructor(message){
        super(message);
        this.name = 'ValidationError';
    }
}
const DEFAULT_ENABLED_TOOLS = [
    'extract_contact_info'
];
const FEISHU_TEMPLATE_ID_MAX_LENGTH = 128;
const FEISHU_VARIABLE_MAX_ENTRIES = 50;
const FEISHU_VARIABLE_KEY_MAX_LENGTH = 64;
const FEISHU_VARIABLE_VALUE_MAX_LENGTH = 512;
const MAX_MESSAGES = 1000;
const MAX_MESSAGE_CONTENT_LENGTH = 12000;
const MAX_TOTAL_MESSAGE_CONTENT_LENGTH = 200000;
function isPlainObject(value) {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
function parseToolNameArray(input, field) {
    if (input === undefined) {
        return field === 'enabled' ? [
            ...DEFAULT_ENABLED_TOOLS
        ] : [];
    }
    if (!Array.isArray(input)) {
        throw new ValidationError(`tools.${field} 必须是数组`);
    }
    return Array.from(new Set(input.map((toolName)=>{
        if (toolName !== 'extract_contact_info' && toolName !== 'feishu_template_message') {
            throw new ValidationError(`tools.${field} 包含不支持的工具`);
        }
        return toolName;
    })));
}
function parseTools(input) {
    if (input === undefined) {
        return {
            enabled: [
                ...DEFAULT_ENABLED_TOOLS
            ],
            disabled: []
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
            disabled
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
    const normalizedVariables = variablesEntries.reduce((acc, [rawKey, rawValue])=>{
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
            [key]: value
        };
    }, {});
    return {
        enabled,
        disabled,
        feishuTemplateMessage: {
            templateId,
            variables: Object.keys(normalizedVariables).length > 0 ? normalizedVariables : undefined,
            mode: modeInput ?? 'sync'
        }
    };
}
function isToolEnabled(request, toolName) {
    const enabled = request.tools?.enabled ?? DEFAULT_ENABLED_TOOLS;
    const disabled = request.tools?.disabled ?? [];
    if (disabled.includes(toolName)) {
        return false;
    }
    return enabled.includes(toolName);
}
function parseChatRequestBody(input) {
    if (!input || typeof input !== 'object') {
        throw new ValidationError('请求体必须是对象');
    }
    const body = input;
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
    const normalizedMessages = body.messages.filter((message)=>{
        if (!message || typeof message !== 'object') {
            return false;
        }
        if (message.role !== 'user' && message.role !== 'assistant') {
            return false;
        }
        return typeof message.content === 'string';
    }).map((message)=>({
            role: message.role,
            content: message.content.trim()
        }));
    if (normalizedMessages.length === 0) {
        throw new ValidationError('消息列表格式无效');
    }
    if (normalizedMessages.some((message)=>message.content.length === 0 || message.content.length > MAX_MESSAGE_CONTENT_LENGTH)) {
        throw new ValidationError('消息内容超出限制');
    }
    const totalMessageContentLength = normalizedMessages.reduce((sum, message)=>sum + message.content.length, 0);
    if (totalMessageContentLength > MAX_TOTAL_MESSAGE_CONTENT_LENGTH) {
        throw new ValidationError('消息总长度超出限制');
    }
    return {
        contact: {
            id: contactId,
            name: contactName
        },
        messages: normalizedMessages,
        tools: parseTools(body.tools)
    };
}
function buildProxyPayload(request, model) {
    const systemPrompt = '你是朋友关系管理助手。请用简洁中文回复，并尽量提取用户对话里的联系人信息（如邮箱、手机号、公司、职位、标签）。';
    const mappedMessages = request.messages.map((message)=>{
        const role = message.role === 'assistant' ? 'assistant' : 'user';
        return {
            role,
            content: message.content
        };
    });
    return {
        model,
        temperature: 0.4,
        messages: [
            {
                role: 'system',
                content: systemPrompt
            },
            ...mappedMessages
        ]
    };
}
function extractAssistantReply(proxyResponse) {
    const content = proxyResponse.choices?.[0]?.message?.content;
    if (!content || typeof content !== 'string') {
        return '我已经记下来了。';
    }
    const normalized = content.trim();
    return normalized || '我已经记下来了。';
}
function extractContactCardFromText(text, contactName, sourceMessageId) {
    const normalized = text.trim();
    if (!normalized) {
        return null;
    }
    const emailMatch = normalized.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
    const phoneMatch = normalized.match(/(?:\+?86[-\s]?)?1[3-9]\d{9}/);
    const titleMatch = normalized.match(/(工程师|产品经理|设计师|销售|运营|创始人|教师|医生)/);
    const companyMatch = normalized.match(/(?:在|就职于|任职于)([^，。\s]{2,20})(?:工作|任职|上班)?/);
    const tags = [];
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
        sourceMessageId
    };
}
function buildToolResult(card) {
    if (!card) {
        return undefined;
    }
    const fields = [];
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
}),
"[project]/OnePersonCompany/friendsAI/packages/client/app/api/feishu/bitable/logic.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ValidationError",
    ()=>ValidationError,
    "buildBitableRecordFields",
    ()=>buildBitableRecordFields,
    "parseBitableSyncRequestBody",
    ()=>parseBitableSyncRequestBody,
    "requestTenantAccessToken",
    ()=>requestTenantAccessToken,
    "syncMessageToBitable",
    ()=>syncMessageToBitable
]);
class ValidationError extends Error {
    constructor(message){
        super(message);
        this.name = 'ValidationError';
    }
}
function parseBitableSyncRequestBody(input) {
    if (!input || typeof input !== 'object') {
        throw new ValidationError('请求体必须是对象');
    }
    const body = input;
    if (typeof body.contactId !== 'string' || typeof body.contactName !== 'string' || typeof body.messageId !== 'string' || typeof body.role !== 'string' || typeof body.content !== 'string' || typeof body.occurredAt !== 'string' || typeof body.source !== 'string') {
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
    if (!content || content.length > 12000) {
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
        for (const [key, value] of entries){
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
        extractedFields: extractedFieldsInput === undefined ? undefined : Object.fromEntries(Object.entries(extractedFieldsInput).map(([key, value])=>[
                key.trim(),
                value.trim()
            ]))
    };
}
function buildBitableRecordFields(payload) {
    return {
        'Contact ID': payload.contactId,
        'Contact Name': payload.contactName,
        'Message ID': payload.messageId,
        Role: payload.role,
        Content: payload.content,
        Source: payload.source,
        'Occurred At': payload.occurredAt,
        ...payload.extractedFields ?? {}
    };
}
async function requestTenantAccessToken(config, requestFn = fetch) {
    const response = await requestFn(`${config.baseUrl}/open-apis/auth/v3/tenant_access_token/internal`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            app_id: config.appId,
            app_secret: config.appSecret
        }),
        signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) {
        throw new Error('获取飞书租户令牌失败');
    }
    const data = await response.json();
    if (data.code !== 0 || !data.tenant_access_token) {
        throw new Error('获取飞书租户令牌失败');
    }
    return data.tenant_access_token;
}
async function syncMessageToBitable(input, requestFn = fetch) {
    const token = await requestTenantAccessToken(input.config, requestFn);
    const response = await requestFn(`${input.config.baseUrl}/open-apis/bitable/v1/apps/${input.config.appToken}/tables/${input.config.tableId}/records`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
            fields: buildBitableRecordFields(input.payload)
        }),
        signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) {
        throw new Error('写入飞书多维表失败');
    }
    const data = await response.json();
    const recordId = data.data?.record?.record_id;
    if (data.code !== 0 || !recordId) {
        throw new Error('写入飞书多维表失败');
    }
    return {
        recordId
    };
}
}),
"[project]/OnePersonCompany/friendsAI/packages/client/app/api/chat/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "POST",
    ()=>POST
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/OnePersonCompany/friendsAI/node_modules/next/server.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$packages$2f$client$2f$app$2f$api$2f$chat$2f$logic$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/OnePersonCompany/friendsAI/packages/client/app/api/chat/logic.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$packages$2f$client$2f$app$2f$api$2f$feishu$2f$bitable$2f$logic$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/OnePersonCompany/friendsAI/packages/client/app/api/feishu/bitable/logic.ts [app-route] (ecmascript)");
;
;
;
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
    'Occurred At'
]);
function createRequestId() {
    return `chat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
function sanitizeForLog(value, maxLength) {
    if (typeof value !== 'string') {
        return undefined;
    }
    return value.replace(/[\r\n\t\0]/g, ' ').slice(0, maxLength);
}
function summarizeToolList(input) {
    if (!Array.isArray(input)) {
        return undefined;
    }
    return input.slice(0, 10).map((item)=>sanitizeForLog(item, 32) ?? typeof item);
}
function parseFeishuFieldMapping(raw) {
    const normalized = raw.trim();
    if (!normalized) {
        return {};
    }
    const parsed = JSON.parse(normalized);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error('FEISHU_FIELD_MAPPING_JSON must be an object');
    }
    return Object.entries(parsed).reduce((acc, [rawKey, rawValue])=>{
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
            [key]: value
        };
    }, {});
}
function summarizeRawBody(rawBody) {
    if (!rawBody || typeof rawBody !== 'object' || Array.isArray(rawBody)) {
        return {
            rawBodyType: Array.isArray(rawBody) ? 'array' : typeof rawBody
        };
    }
    const candidate = rawBody;
    const messages = Array.isArray(candidate.messages) ? candidate.messages : [];
    return {
        contactId: sanitizeForLog(candidate.contact?.id, 64),
        messageCount: messages.length,
        messageRoles: messages.slice(0, 5).map((message)=>{
            if (!message || typeof message !== 'object') {
                return 'invalid';
            }
            return sanitizeForLog(message.role, 24) ?? 'missing';
        }),
        enabledTools: summarizeToolList(candidate.tools?.enabled),
        disabledTools: summarizeToolList(candidate.tools?.disabled),
        feishuMode: sanitizeForLog(candidate.tools?.feishuTemplateMessage?.mode, 24)
    };
}
function mapExtractedFields(extractedFields, fieldMapping) {
    if (!extractedFields) {
        return undefined;
    }
    return Object.entries(extractedFields).reduce((acc, [key, value])=>{
        const mappedKey = fieldMapping[key] ?? key;
        return {
            ...acc,
            [mappedKey]: value
        };
    }, {});
}
async function POST(request) {
    const requestId = createRequestId();
    const startedAt = Date.now();
    let rawBodySummary = {};
    try {
        if (!LOCAL_AI_API_KEY) {
            console.error('[api/chat] local AI key missing', {
                requestId
            });
            return __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: '本地 AI 服务未配置密钥',
                requestId
            }, {
                status: 500
            });
        }
        let rawBody;
        try {
            rawBody = await request.json();
        } catch  {
            console.error('[api/chat] invalid json body', {
                requestId,
                elapsedMs: Date.now() - startedAt
            });
            return __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: '请求体 JSON 无效',
                requestId
            }, {
                status: 400
            });
        }
        rawBodySummary = summarizeRawBody(rawBody);
        console.info('[api/chat] request received', {
            requestId,
            ...rawBodySummary
        });
        const parsed = (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$packages$2f$client$2f$app$2f$api$2f$chat$2f$logic$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["parseChatRequestBody"])(rawBody);
        const payload = (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$packages$2f$client$2f$app$2f$api$2f$chat$2f$logic$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["buildProxyPayload"])(parsed, LOCAL_AI_MODEL);
        let feishuFieldMapping = {};
        try {
            feishuFieldMapping = parseFeishuFieldMapping(FEISHU_FIELD_MAPPING_JSON);
        } catch (error) {
            console.warn('[api/chat] invalid feishu field mapping config', {
                requestId,
                error: error instanceof Error ? error.message : String(error)
            });
        }
        const proxyResponse = await fetch(`${LOCAL_AI_BASE_URL}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${LOCAL_AI_API_KEY}`
            },
            body: JSON.stringify(payload),
            signal: AbortSignal.timeout(45000)
        });
        if (!proxyResponse.ok) {
            if (proxyResponse.status === 429) {
                console.warn('[api/chat] upstream rate limited', {
                    requestId,
                    status: proxyResponse.status,
                    statusText: proxyResponse.statusText,
                    elapsedMs: Date.now() - startedAt
                });
                return __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                    reply: '当前 AI 服务请求较多，请稍后重试。',
                    requestId,
                    rateLimited: true
                }, {
                    status: 200
                });
            }
            console.error('[api/chat] upstream failed', {
                requestId,
                status: proxyResponse.status,
                statusText: proxyResponse.statusText,
                elapsedMs: Date.now() - startedAt
            });
            return __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: '本地 AI 代理请求失败',
                requestId
            }, {
                status: 502
            });
        }
        const proxyData = await proxyResponse.json();
        const reply = (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$packages$2f$client$2f$app$2f$api$2f$chat$2f$logic$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["extractAssistantReply"])(proxyData);
        const latestUserMessage = [
            ...parsed.messages
        ].reverse().find((message)=>message.role === 'user');
        const sourceMessageId = `source-${Date.now()}`;
        const canExtractContactInfo = (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$packages$2f$client$2f$app$2f$api$2f$chat$2f$logic$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["isToolEnabled"])(parsed, 'extract_contact_info');
        const canUseFeishuTemplateMessage = FEISHU_CHAT_TOOL_ENABLED && (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$packages$2f$client$2f$app$2f$api$2f$chat$2f$logic$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["isToolEnabled"])(parsed, 'feishu_template_message');
        const feishuMode = parsed.tools?.feishuTemplateMessage?.mode ?? 'sync';
        const extractedContactCard = canExtractContactInfo && latestUserMessage ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$packages$2f$client$2f$app$2f$api$2f$chat$2f$logic$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["extractContactCardFromText"])(latestUserMessage.content, parsed.contact.name, sourceMessageId) : null;
        const contactCard = canExtractContactInfo ? extractedContactCard ?? undefined : undefined;
        const toolResult = canExtractContactInfo ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$packages$2f$client$2f$app$2f$api$2f$chat$2f$logic$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["buildToolResult"])(extractedContactCard) : undefined;
        const extractedFields = canExtractContactInfo ? mapExtractedFields(extractedContactCard ? {
            ...extractedContactCard.email ? {
                Email: extractedContactCard.email
            } : {},
            ...extractedContactCard.phone ? {
                Phone: extractedContactCard.phone
            } : {},
            ...extractedContactCard.company ? {
                Company: extractedContactCard.company
            } : {},
            ...extractedContactCard.title ? {
                Title: extractedContactCard.title
            } : {},
            ...extractedContactCard.tags && extractedContactCard.tags.length > 0 ? {
                Tags: extractedContactCard.tags.join(', ')
            } : {}
        } : undefined, feishuFieldMapping) : undefined;
        if (canUseFeishuTemplateMessage && feishuMode === 'sync' && FEISHU_SYNC_ENABLED && FEISHU_APP_ID && FEISHU_APP_SECRET && FEISHU_BITABLE_APP_TOKEN && FEISHU_BITABLE_TABLE_ID && latestUserMessage && latestUserMessage.role === 'user') {
            try {
                const feishuPayload = (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$packages$2f$client$2f$app$2f$api$2f$feishu$2f$bitable$2f$logic$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["parseBitableSyncRequestBody"])({
                    contactId: parsed.contact.id,
                    contactName: parsed.contact.name,
                    messageId: sourceMessageId,
                    role: 'user',
                    content: latestUserMessage.content,
                    occurredAt: new Date().toISOString(),
                    source: 'chat',
                    extractedFields
                });
                await (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$packages$2f$client$2f$app$2f$api$2f$feishu$2f$bitable$2f$logic$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["syncMessageToBitable"])({
                    payload: feishuPayload,
                    config: {
                        baseUrl: FEISHU_BASE_URL,
                        appId: FEISHU_APP_ID,
                        appSecret: FEISHU_APP_SECRET,
                        appToken: FEISHU_BITABLE_APP_TOKEN,
                        tableId: FEISHU_BITABLE_TABLE_ID
                    }
                });
            } catch (error) {
                console.error('[api/chat] feishu sync failed', {
                    requestId,
                    contactId: sanitizeForLog(parsed.contact.id, 64),
                    messageId: sourceMessageId,
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        }
        console.info('[api/chat] request completed', {
            requestId,
            contactId: sanitizeForLog(parsed.contact.id, 64),
            messageCount: parsed.messages.length,
            extractedContactCard: Boolean(contactCard),
            elapsedMs: Date.now() - startedAt
        });
        return __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            reply,
            toolResult,
            contactCard,
            requestId
        });
    } catch (error) {
        if (error instanceof __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$packages$2f$client$2f$app$2f$api$2f$chat$2f$logic$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ValidationError"]) {
            console.error('[api/chat] validation failed', {
                requestId,
                error: error.message,
                elapsedMs: Date.now() - startedAt,
                ...rawBodySummary
            });
            return __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: error.message,
                requestId
            }, {
                status: 400
            });
        }
        console.error('[api/chat] unexpected failure', {
            requestId,
            error: error instanceof Error ? error.message : String(error),
            elapsedMs: Date.now() - startedAt,
            ...rawBodySummary
        });
        return __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: '请求处理失败',
            requestId
        }, {
            status: 500
        });
    }
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__3d4ce3cd._.js.map