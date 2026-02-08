Agent 模板引擎化改造：Prompt / Memory / Tools 可配置架构（决策完成版）
简要总结
你要的方向是对的：把“每个 Agent 的能力定义”从分散的 service 代码里抽出来，变成可配置、可版本化的 Agent 资产。
已锁定决策：
模板语法：Mustache
模板来源：代码库文件（Git 管理 + 版本号）
缺变量策略：告警 + 默认值（每 Agent 独立 defaults.json）
Agent 定义格式：JSON
Memory 策略：声明式策略 + 统一 runtime 实现
Tools 策略：白名单 + 最小权限
输出校验：schema 失败即报错并记录
目标结果：你后续改 Agent 逻辑时，主要改模板/JSON，而不是到处改业务 service。
一、现状定位（你现在要改逻辑时会遇到的分散点）
通用系统 prompt：context-builder.ts
callAgent 固定 prompt：ai.service.ts
Briefing prompt：briefing.service.ts
Conversation 结构提取 prompt：conversation-processor.service.ts
Action panel 推荐 prompt：action-panel.service.ts
Chat 记忆与流式编排：agent.orchestrator.ts
短期内存：agent-message.store.ts
持久消息：messages.service.ts
二、目标目录（以后“改 Agent 逻辑”只看这两块）
1) 每个 Agent 的定义资产（JSON + 模板）
根目录：/Users/haoqi/OnePersonCompany/friendsAI/packages/server-nestjs/src/agent/capabilities
每个 Agent 目录示例（contact_insight）：
agent.json（核心能力定义）
prompt.system.mustache.md
prompt.user.mustache.md
defaults.json（缺变量默认值）
input.schema.json
output.schema.json
memory.policy.json
tools.policy.json
2) 统一运行时（只写一次）
agent-definition-registry.service.ts
prompt-template-renderer.service.ts
template-context-builder.service.ts
memory-runtime.service.ts
tool-runtime.service.ts
agent-runner.service.ts
三、agent.json 统一契约（你真正维护的“Agent 逻辑入口”）
每个 agent.json 最少包含：

id, version, description
prompt
systemTemplate, userTemplate
missingVarPolicy: warn_with_defaults
defaultsFile: defaults.json
model
provider, model, temperature, maxTokens
memory
historyWindow, includeConversationHistory
includeContactContext, includeVectorRecall, snapshotTTL
tools
mode: allowlist
allowedTools: []
requiresConfirmationForWrite: true
validation
inputSchema, outputSchema
onOutputInvalid: fail
cache
enabled, ttlSeconds, sourceHashFields
四、调用流水线（你说的“上层预置 JSON → Agent 渲染 → 拼装提示词/内存/工具 → LLM”）
AgentRunService 接收 agentId + input
agent-definition-registry 读取对应 agent.json
template-context-builder 组装上下文 JSON（用户/联系人/会话/引用）
prompt-template-renderer 用 Mustache 渲染 system/user prompt
变量缺失：记录 warning，落默认值
memory-runtime 按 memory.policy 注入历史/检索记忆
tool-runtime 按 tools.policy 组装工具白名单
调用 LLM（流式或非流式）
output.schema 校验，失败即报错+日志
写入 snapshot / conversation / event（按 Agent 副作用策略）
五、你以后怎么改每个 Agent（可操作手册）
改提示词：编辑 prompt.system.mustache.md / prompt.user.mustache.md
改变量默认值：编辑 defaults.json
改内存窗口与召回：编辑 memory.policy.json
改工具权限：编辑 tools.policy.json
改输出结构：编辑 output.schema.json
改模型参数：编辑 agent.json 的 model 节点
原则：业务行为尽量配置化；只有“复杂业务计算”留在 runtime/service 里。

六、公共 API / 接口影响（与前面方案一致）
保持 POST /v1/agent/chat（聊天流式）
新增统一入口 POST /v1/agent/run（非聊天能力 + 可扩展）
旧接口继续保留并委托新 Agent 运行时：
brief / archive / action-panel
七、测试方案
配置加载测试：agent.json、schema、模板文件完整性
渲染测试：缺变量告警 + defaults 生效
安全测试：禁止模板执行逻辑（Mustache only）
工具测试：白名单外调用被拒绝
输出测试：schema 失败触发 fail + 结构化错误日志
回归测试：旧 endpoint 输出形状不变
八、显式假设与默认
agent.json 负责“声明”，复杂执行逻辑仍在 TS runtime（JSON 不承载函数）
模板仅支持 Mustache（不引入 helper 执行）
默认值按 Agent 维度独立管理，不做全局共享
输出结构化是强约束，宁可 fail 不 silently 产脏数据