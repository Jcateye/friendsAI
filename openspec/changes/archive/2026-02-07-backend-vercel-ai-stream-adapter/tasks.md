# Tasks for 后端 Vercel AI SDK 流格式适配器

## 1. 设计与准备

- [ ] **1.1** 研究 Vercel AI SDK 流协议格式
  - 阅读 [Vercel AI SDK Stream Protocol](https://sdk.vercel.ai/docs/ai-sdk-ui/stream-protocol)
  - 确认各事件类型的 JSON 格式要求

- [ ] **1.2** 分析现有 AgentStreamEvent 结构
  - 文件：`packages/server-nestjs/src/agent/agent.orchestrator.ts`
  - 确认所有事件类型：`agent.start`, `agent.delta`, `agent.message`, `tool.state`, `agent.end`, `error`, `ping`

## 2. 实现适配器

- [ ] **2.1** 创建 VercelAiStreamAdapter 类
  - 文件：`packages/server-nestjs/src/agent/adapters/vercel-ai-stream.adapter.ts`
  - 实现 `transform(event: AgentStreamEvent): string` 方法
  - 处理所有事件类型的格式转换

- [ ] **2.2** 实现文本流转换 (agent.delta → 0:)
  - 格式：`0:${JSON.stringify(text)}\n`

- [ ] **2.3** 实现消息完成转换 (agent.message → d:)
  - 格式：`d:${JSON.stringify({finishReason:'stop'})}\n`

- [ ] **2.4** 实现工具调用转换 (tool.state → 9:/a:)
  - running: `9:${JSON.stringify({toolCallId,toolName,args})}\n`
  - succeeded: `a:${JSON.stringify({toolCallId,result})}\n`

- [ ] **2.5** 实现 A2UI 数据转换 (ui → 2:)
  - 格式：`2:${JSON.stringify([{type:'a2ui',payload}])}\n`

- [ ] **2.6** 实现错误转换 (error → 3:)
  - 格式：`3:${JSON.stringify(errorMessage)}\n`

## 3. 集成到 Controller

- [ ] **3.1** 修改 AgentController.chat() 方法
  - 文件：`packages/server-nestjs/src/agent/agent.controller.ts`
  - 添加 `@Query('format') format: 'sse' | 'vercel-ai' = 'sse'` 参数

- [ ] **3.2** 根据 format 参数选择适配器
  ```typescript
  const adapter = format === 'vercel-ai'
    ? new VercelAiStreamAdapter()
    : null; // 使用现有逻辑
  ```

- [ ] **3.3** 设置正确的响应头
  ```typescript
  if (format === 'vercel-ai') {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('X-Vercel-AI-Data-Stream', 'v1');
  }
  ```

## 4. 测试

- [ ] **4.1** 编写单元测试
  - 文件：`packages/server-nestjs/src/agent/adapters/vercel-ai-stream.adapter.spec.ts`
  - 测试各事件类型的格式转换

- [ ] **4.2** 测试向后兼容性
  - 确认不带 format 参数时返回现有格式

- [ ] **4.3** 集成测试
  - 使用 curl 测试流输出
  - 验证 Vercel AI SDK 可解析

## 5. 验收

- [ ] **5.1** 手动验证命令
  ```bash
  # 现有格式
  curl -X POST "http://localhost:3000/v1/agent/chat" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"message": "hello"}'

  # Vercel AI SDK 格式
  curl -X POST "http://localhost:3000/v1/agent/chat?format=vercel-ai" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"message": "hello"}'
  ```

- [ ] **5.2** 确认所有现有测试通过
  ```bash
  cd packages/server-nestjs && pnpm test
  ```
