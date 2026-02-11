# FriendsAI Agent V1 API 文档

## 1. 概述

FriendsAI Agent V1 提供完整的事件追踪、飞书集成和增强的 Agent 能力 API。

**基础 URL**: \`http://localhost:3000/v1\`

**认证方式**: Bearer Token (JWT)

## 2. 认证

### 获取 Token
\`\`\`bash
curl -X POST http://localhost:3000/v1/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{"email":"user@example.com","password":"password"}'
\`\`\`

## 3. 事件追踪 API

### 3.1 记录事件
**端点**: \`POST /v1/actions/track\`

### 3.2 查询每周指标
**端点**: \`GET /v1/metrics/weekly?days=7\`

### 3.3 查询事件列表
**端点**: \`GET /v1/metrics/events?limit=10\`

## 4. 飞书集成 API

### 4.1 获取授权 URL
**端点**: \`GET /v1/connectors/feishu/oauth/authorize/me\`

### 4.2 获取用户 Token
**端点**: \`GET /v1/connectors/feishu/oauth/token/me\`

### 4.3 验证 Token
**端点**: \`GET /v1/connectors/feishu/oauth/token/me/valid\`

## 5. Agent 运行 API (增强)

### 5.1 contact_insight (增强)
新增字段: \`priorityScore\`, \`reasonTags\`, \`relationshipRiskLevel\`

### 5.2 network_action (增强)
新增字段: \`timingReason\`, \`valueFirstSuggestion\`, \`followupPlan\`

详细文档请参考代码实现。
