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
    "parseChatRequestBody",
    ()=>parseChatRequestBody
]);
class ValidationError extends Error {
    constructor(message){
        super(message);
        this.name = 'ValidationError';
    }
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
    if (body.messages.length > 50) {
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
    if (normalizedMessages.some((message)=>message.content.length === 0 || message.content.length > 4000)) {
        throw new ValidationError('消息内容超出限制');
    }
    return {
        contact: {
            id: contactId,
            name: contactName
        },
        messages: normalizedMessages
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
"[project]/OnePersonCompany/friendsAI/packages/client/app/api/chat/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "POST",
    ()=>POST
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/OnePersonCompany/friendsAI/node_modules/next/server.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$packages$2f$client$2f$app$2f$api$2f$chat$2f$logic$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/OnePersonCompany/friendsAI/packages/client/app/api/chat/logic.ts [app-route] (ecmascript)");
;
;
const LOCAL_AI_BASE_URL = process.env.LOCAL_AI_BASE_URL ?? 'http://127.0.0.1:9739/v1';
const LOCAL_AI_MODEL = process.env.LOCAL_AI_MODEL ?? 'gemini-3-flash';
const LOCAL_AI_API_KEY = process.env.LOCAL_AI_API_KEY ?? '';
async function POST(request) {
    try {
        if (!LOCAL_AI_API_KEY) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: '本地 AI 服务未配置密钥'
            }, {
                status: 500
            });
        }
        const rawBody = await request.json();
        const parsed = (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$packages$2f$client$2f$app$2f$api$2f$chat$2f$logic$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["parseChatRequestBody"])(rawBody);
        const payload = (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$packages$2f$client$2f$app$2f$api$2f$chat$2f$logic$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["buildProxyPayload"])(parsed, LOCAL_AI_MODEL);
        const proxyResponse = await fetch(`${LOCAL_AI_BASE_URL}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${LOCAL_AI_API_KEY}`
            },
            body: JSON.stringify(payload),
            signal: AbortSignal.timeout(15000)
        });
        if (!proxyResponse.ok) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: '本地 AI 代理请求失败'
            }, {
                status: 502
            });
        }
        const proxyData = await proxyResponse.json();
        const reply = (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$packages$2f$client$2f$app$2f$api$2f$chat$2f$logic$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["extractAssistantReply"])(proxyData);
        const latestUserMessage = [
            ...parsed.messages
        ].reverse().find((message)=>message.role !== 'assistant');
        const sourceMessageId = `source-${Date.now()}`;
        const contactCard = latestUserMessage ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$packages$2f$client$2f$app$2f$api$2f$chat$2f$logic$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["extractContactCardFromText"])(latestUserMessage.content, parsed.contact.name, sourceMessageId) : null;
        const toolResult = (0, __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$packages$2f$client$2f$app$2f$api$2f$chat$2f$logic$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["buildToolResult"])(contactCard);
        return __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            reply,
            toolResult,
            contactCard
        });
    } catch (error) {
        if (error instanceof __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$packages$2f$client$2f$app$2f$api$2f$chat$2f$logic$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ValidationError"]) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: error.message
            }, {
                status: 400
            });
        }
        return __TURBOPACK__imported__module__$5b$project$5d2f$OnePersonCompany$2f$friendsAI$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: '请求处理失败'
        }, {
            status: 500
        });
    }
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__d73e59f7._.js.map