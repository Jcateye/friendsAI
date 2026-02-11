# friendsAI 项目现状（MVP）

> 更新时间：2026-02-11

## 当前可用功能

1. 首页介绍与聊天页跳转
   - 首页文案、功能卡片与“开始聊天”按钮可用。
   - 入口：`packages/client/app/page.tsx`

2. 聊天主界面（移动端优先）
   - 聊天页包含头部、消息区、输入区的完整结构。
   - 入口：`packages/client/app/chat/page.tsx`

3. 左侧联系人抽屉 + 新增联系人
   - 可打开/关闭抽屉。
   - 可切换当前联系人，切换后展示对应会话。
   - 支持新增联系人并自动切换到新联系人。
   - 相关文件：
     - `packages/client/components/drawer/ContactsDrawer.tsx`
     - `packages/client/components/chat/ChatHeader.tsx`
     - `packages/client/app/chat/page.tsx`

4. 单联系人单会话（前端状态 + 本地持久化）
   - Zustand 按 `contactId -> messages[]` 管理会话消息。
   - 联系人和消息已接入 Dexie（IndexedDB）持久化。
   - 刷新页面后可从浏览器本地恢复数据。
   - 相关文件：
     - `packages/client/stores/chat.ts`
     - `packages/client/lib/db.ts`
     - `packages/client/app/chat/page.tsx`

5. 真实 AI 对话链路（本地代理）
   - 聊天发送后通过 `/api/chat` 调用本地 OpenAI 兼容代理：
     - `LOCAL_AI_BASE_URL`（默认 `http://127.0.0.1:9739/v1`）
     - `LOCAL_AI_MODEL`（默认 `gemini-3-flash`）
     - `LOCAL_AI_API_KEY`（必填）
   - API 路由：`packages/client/app/api/chat/route.ts`

6. Tool 消息渲染 + 联系人预览卡片挂载
   - 消息气泡支持 `toolCalls` 的工具名与结果展示。
   - 联系人信息提取结果会以 `ContactPreviewCard` 在消息流中展示。
   - 相关文件：
     - `packages/client/components/chat/MessageBubble.tsx`
     - `packages/client/components/chat/MessageList.tsx`
     - `packages/client/components/chat/ContactPreviewCard.tsx`

7. 输入区工具按钮与语音按钮已接通基础行为
   - 工具按钮会生成对应 tool 提示消息。
   - 语音按钮会生成“暂未接入语音输入”的提示消息。
   - 相关文件：
     - `packages/client/components/chat/ChatComposer.tsx`
     - `packages/client/app/chat/page.tsx`

8. 输入校验与错误处理增强
   - `/api/chat` 对请求体做了严格校验（角色、长度、条数限制）。
   - 上游请求增加 15 秒超时。
   - 区分校验错误（400）与服务错误（500）。
   - 相关文件：
     - `packages/client/app/api/chat/logic.ts`
     - `packages/client/app/api/chat/route.ts`

9. 基础测试已建立
   - 新增 Vitest 配置与 API 逻辑测试。
   - 当前测试：`packages/client/app/api/chat/logic.test.ts`（10 条通过）。
   - 相关文件：
     - `packages/client/vitest.config.ts`
     - `packages/client/package.json`

## 当前仍待完善项

1. AI SDK / assistant-ui 尚未真正接入 UI 组件链路
   - 目前已打通 API 路由与代理调用，但 UI 仍是自定义聊天组件。

2. 缺少集成测试与 E2E 测试
   - 目前仅有 API 逻辑单测，尚未覆盖路由集成和关键用户流程。

3. 生产级安全能力仍可加强
   - 建议后续补充：鉴权、限流、以及更细粒度审计日志。

4. Lint 在当前环境存在依赖解析问题
   - `npm run -w client lint` 仍报 ESLint 模块解析错误（环境/依赖树问题）。

## 结论

项目已从“前端壳子”升级为“可本地持久化 + 可真实调用本地 AI 代理”的可用 MVP：
- 能聊天
- 能切换/新增联系人
- 能显示 tool 消息与联系人提取卡片
- 数据能保存在用户浏览器 IndexedDB
- 已具备基础测试与 API 校验能力

下一阶段建议优先：
1. 接入 assistant-ui / AI SDK 到 UI 聊天链路
2. 增加路由集成测试与 E2E
3. 补齐鉴权/限流等生产级防护
