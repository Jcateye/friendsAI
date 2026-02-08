FriendsAI 后端 Multi-Agent 分层改造方案（统一入口版）
简要总结
目标：把当前“单一聊天 Orchestrator + 分散 AI 服务（briefing/archive/action-panel）”升级为统一 Agent 层，对外提供 5 类 AI 能力。
约束：本轮先做设计方案（你已选择“只做设计文档，不改代码”）。
核心决策（已确认）：
统一入口：新增 POST /v1/agent/run，保留 POST /v1/agent/chat 聊天流式兼容。
Agent 拆分：共 5 个，archive_brief 为单 Agent（通过 operation 区分）。
缓存：新增通用 agent_snapshots 表，sourceHash + TTL 双策略。
兼容：保留旧 API 并委托到新 Agent 层。
标题概要：会话结束后进程内异步触发，回写 conversations.title + 新增 conversations.summary。
一、目标架构（决策完成）
Client
 ├─ POST /v1/agent/chat (SSE/Vercel stream, chat only)
 ├─ POST /v1/agent/run  (JSON, all agents)
 └─ Legacy endpoints (brief/archive/action-panel)
        │
        ▼
Agent API Facade (Controller)
        │
        ▼
AgentRunService
 ├─ AgentCapabilityRegistry
 ├─ AgentSnapshotService
 ├─ AgentInputFactory / SourceHashBuilder
 └─ AgentAsyncTaskScheduler (in-process, for post-chat title/summary)
        │
        ├─ chat_conversation (streaming)
        ├─ archive_brief (operation=archive_extract | brief_generate)
        ├─ title_summary
        ├─ network_action
        └─ contact_insight
二、Agent 能力清单（5 个，固定 ID）
chat_conversation

作用：现有聊天流式对话（保留当前能力）。
协议：SSE / Vercel AI stream。
触发：/v1/agent/chat（默认），/v1/agent/run 可选兼容但默认不走流。
archive_brief

作用：统一“归档 + 简报”能力。
operation=archive_extract：输入 conversationId，输出 ConversationArchiveResponse（兼容现有归档结构）。
operation=brief_generate：输入 contactId，输出 BriefSnapshot（兼容现有简报结构）。
TTL：24h。
title_summary

作用：生成会话标题与概要。
输入：conversationId（可含 forceRefresh）。
输出：{ conversationId, title, summary, sourceHash, generatedAt }。
副作用：写回 conversations.title、conversations.summary。
TTL：24h。
触发：聊天成功后异步触发 + 可手动调用。
network_action

作用：全体联系人归纳与行动建议（对应你说的“全体联系人归纳行动建议 Agent”）。
输入：userId, limit?。
输出：{ followUps, recommendations, synthesis, nextActions }。
TTL：12h。
contact_insight

作用：单联系人深入洞察。
输入：contactId, userId, depth?。
输出：{ profileSummary, relationshipSignals, opportunities, risks, suggestedActions, openingLines, citations }。
TTL：6h。
三、公共 API / 接口变更（对实现者无歧义）
新增 POST /v1/agent/run

请求体（统一）：
agentId：上述 5 个之一（必填）。
operation：仅 archive_brief 使用（archive_extract | brief_generate）。
input：Agent 输入对象（必填）。
options：{ useCache?: boolean=true, forceRefresh?: boolean=false }。
响应体（统一包裹）：
runId, agentId, operation?, cached, snapshotId?, generatedAt, data。
保留 POST /v1/agent/chat

新增可选字段 agentId，默认 chat_conversation。
若传入非 chat_conversation，返回 400（unsupported_agent_for_chat_endpoint），引导改走 /v1/agent/run。
维持当前 format=sse|vercel-ai 行为不变。
兼容桥接（旧 API 不改响应形状）

/v1/contacts/:contactId/brief -> 委托 archive_brief + brief_generate + useCache=true
/v1/contacts/:contactId/brief/refresh -> 委托 archive_brief + brief_generate + forceRefresh=true
/v1/conversations/:conversationId/archive -> 委托 archive_brief + archive_extract
/v1/action-panel/dashboard -> 委托 network_action，再映射回当前字段 followUps/recommendedContacts（向后兼容）。
四、数据模型与迁移
修改 conversations 表

新增 summary text null（epoch 规则不受影响，文本字段）。
新增 agent_snapshots 表（epoch ms 存储）

关键字段：
id uuid
agentId text
operation text null
scopeType text（conversation|contact|user|global）
scopeId uuid null
userId uuid null
sourceHash text
promptVersion text
model text null
input jsonb
output jsonb
expiresAt bigint
createdAt bigint
updatedAt bigint
索引：
命中索引：(agentId, operation, userId, scopeType, scopeId, sourceHash, promptVersion)
过期索引：(expiresAt)
查询索引：(agentId, userId, scopeType, scopeId, updatedAt desc)
五、实现分层与文件落点（规划）
现有文件复用/改造

agent.controller.ts
agent.orchestrator.ts
briefing.service.ts
conversation-archives.service.ts
action-panel.service.ts
新增目录建议

/Users/haoqi/OnePersonCompany/friendsAI/packages/server-nestjs/src/agent/capabilities/*
/Users/haoqi/OnePersonCompany/friendsAI/packages/server-nestjs/src/agent/runtime/*
/Users/haoqi/OnePersonCompany/friendsAI/packages/server-nestjs/src/agent/snapshots/*
/Users/haoqi/OnePersonCompany/friendsAI/packages/server-nestjs/src/agent/contracts/*
文档交付（本轮设计）

README.md：替换默认 Nest 模板，写入 Agent 分层架构、接口、缓存策略。
可选同步：openspec 新 change（proposal/design/tasks）记录该架构改造。
六、运行时规则（无待决策项）
缓存命中规则：

sourceHash 相同且未过期 -> 命中。
forceRefresh=true -> 跳过缓存并写新快照。
sourceHash 计算包含 promptVersion + model + 业务输入 + 关键数据指纹。
异步触发规则（title_summary）：

触发点：chat_conversation 成功并已持久化 assistant message 后。
机制：进程内任务调度（非阻塞主请求）。
失败策略：记录日志，不影响聊天响应；允许手动重跑 /v1/agent/run。
TTL 分层（已定）：

contact_insight: 6h
network_action: 12h
archive_brief: 24h
title_summary: 24h（并回写会话字段）
七、测试与验收场景
单元测试

AgentCapabilityRegistry：未知 agentId 报错、正确分发。
AgentSnapshotService：命中/过期/forceRefresh/sourceHash 变化。
TitleSummaryCapability：写回 conversations.title/summary。
Legacy adapter：旧接口映射字段不变。
集成测试

POST /v1/agent/run：
network_action 返回 JSON 包裹结构。
contact_insight 二次请求命中缓存 cached=true。
archive_brief 两种 operation 输出形状正确。
POST /v1/agent/chat：
仍按既有 SSE 顺序输出。
完成后可观察到异步标题概要更新（可轮询 conversation）。
回归测试（兼容）

/v1/contacts/:id/brief 与 /refresh 结构不变。
/v1/conversations/:id/archive 行为不变。
/v1/action-panel/dashboard 仍含 followUps 与 recommendedContacts。
迁移验收

新库执行迁移成功。
老库增量迁移成功（含 conversations.summary 与 agent_snapshots）。
索引生效且查询计划符合缓存读取路径。
八、显式假设与默认值
仅后端改造，不要求本轮前端立即切 /v1/agent/run。
不引入外部队列，先用进程内异步任务（后续可升级）。
不合并现有两套 ToolRegistry（本轮新增 AgentCapabilityRegistry，避免影响现有工具链）。
标题长度默认控制在简短可读（实现时按前端展示空间约束处理），概要用于列表摘要与检索提示。
旧 API 暂不加硬性废弃时间，先“可兼容运行”一段迭代周期。