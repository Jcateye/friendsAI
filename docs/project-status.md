# friendsAI 项目现状（MVP）

## 变更历史（秒级）

### 2026-02-11 23:12:00 +0800
- 类型：POC 收尾（名片确认 + 飞书工具开关）
- 摘要：完成“识别名片后用户确认再添加联系人”流程、前端飞书工具开关与 sync/preview 透传、服务端飞书工具总开关与字段提取映射增强，并补充对应测试。
- 当前状态：
  - `packages/client/app/chat/page.tsx`：支持飞书工具开关、sync/preview 模式、名片确认后入库。
  - `packages/client/components/chat/ContactPreviewCard.tsx`：新增“确认添加联系人/暂不添加”交互。
  - `packages/client/stores/chat.ts`：新增 `updateMessage`，用于消息级状态更新。
  - `packages/client/app/api/chat/route.ts`：新增 `FEISHU_CHAT_TOOL_ENABLED` 服务端开关；`sync` 才写飞书；透传 `extractedFields`。
  - `packages/client/app/api/feishu/bitable/logic.ts`：支持 `extractedFields` 校验与入表字段合并。
  - `packages/client/app/api/chat/route.test.ts`、`packages/client/app/api/feishu/bitable/logic.test.ts`：新增开关/模式/字段映射相关用例。
  - `packages/client/.env.example`：新增 `FEISHU_CHAT_TOOL_ENABLED` 示例配置。
  - `docs/AI-Messages-logic.md`：更新为最新链路说明（确认式名片 + 飞书工具开关）。
- 影响文件：
  - `docs/project-status.md`
  - `docs/AI-Messages-logic.md`
  - `packages/client/.env.example`
  - `packages/client/app/chat/page.tsx`
  - `packages/client/components/chat/MessageList.tsx`
  - `packages/client/components/chat/ContactPreviewCard.tsx`
  - `packages/client/stores/chat.ts`
  - `packages/client/types/index.ts`
  - `packages/client/app/api/chat/route.ts`
  - `packages/client/app/api/chat/route.test.ts`
  - `packages/client/app/api/feishu/bitable/logic.ts`
  - `packages/client/app/api/feishu/bitable/logic.test.ts`

### 2026-02-11 21:40:44 +0800
- 类型：MVP 状态追加（聊天链路 + 飞书同步）
- 摘要：完成本地 AI 聊天 API 接入、Dexie 本地持久化接入、首页本地存储提示、飞书多维表 best-effort 同步（服务端触发）与对应逻辑测试增强。
- 当前状态：
  - `packages/client/app/api/chat/route.ts`：聊天代理成功后在服务端尝试同步飞书多维表；失败不阻断聊天主流程。
  - `packages/client/app/api/feishu/bitable/logic.ts`：完成请求体校验、字段映射、token 获取、写入多维表逻辑；`source` 限制为 `chat`。
  - `packages/client/app/api/feishu/bitable/route.ts`：保留独立写入入口并增加内部令牌校验（`x-internal-token`）。
  - `packages/client/app/chat/page.tsx`：聊天读写 Dexie，联系人与消息刷新后可恢复；移除前端直连飞书写入。
  - `packages/client/app/page.tsx`：增加“本地存储模式”灰色小字提示。
  - `packages/client/app/api/chat/logic.test.ts`、`packages/client/app/api/feishu/bitable/logic.test.ts`：测试通过（当前 21 个用例）。
- 影响文件：
  - `docs/project-status.md`
  - `packages/client/.env.example`
  - `packages/client/app/page.tsx`
  - `packages/client/app/chat/page.tsx`
  - `packages/client/app/api/chat/route.ts`
  - `packages/client/app/api/feishu/bitable/logic.ts`
  - `packages/client/app/api/feishu/bitable/route.ts`
  - `packages/client/app/api/feishu/bitable/logic.test.ts`

### 2026-02-11 16:30:52 +0800
- 类型：文档回补
- 摘要：按要求恢复初始化版本的 project-status 主体内容，并保留历史记录采用头插方式。
- 影响文件：
  - `docs/project-status.md`

### 2026-02-11 16:27:40 +0800
- 提交：`e3971cab530defe5d35c5287db649ce84a8adb78`
- 类型：`feat: wire local AI chat and persistence`
- 摘要：打通本地 AI 代理聊天链路，接入 Dexie 持久化，完善联系人与消息 UI 交互，并补充 API 逻辑测试与项目现状文档。
- 影响文件：
  - `docs/project-status.md`
  - `package-lock.json`
  - `packages/client/app/api/chat/logic.test.ts`
  - `packages/client/app/api/chat/logic.ts`
  - `packages/client/app/api/chat/route.ts`
  - `packages/client/app/chat/page.tsx`
  - `packages/client/components/chat/ChatComposer.tsx`
  - `packages/client/components/chat/MessageBubble.tsx`
  - `packages/client/components/chat/MessageList.tsx`
  - `packages/client/components/drawer/ContactsDrawer.tsx`
  - `packages/client/lib/db.ts`
  - `packages/client/package.json`
  - `packages/client/types/index.ts`
  - `packages/client/vitest.config.ts`

### 2026-02-11 16:00:00 +0800
- 类型：现状盘点快照（回补）
- 摘要：补录 16 点阶段的项目可用功能与未接通项说明。

#### 当前可用功能（已落地）
1. 首页介绍 + 跳转聊天页
   - 首页文案、卡片和“开始聊天”按钮可用
   - 入口：`/packages/client/app/page.tsx`
2. 聊天主界面（移动端布局）
   - 聊天页整体结构、顶部栏、消息区、输入区完整
   - 入口：`/packages/client/app/chat/page.tsx`
3. 联系人抽屉（左侧）
   - 可打开/关闭抽屉
   - 可切换当前联系人，切换后显示该联系人的会话
   - 代码：`/packages/client/components/drawer/ContactsDrawer.tsx`、`/packages/client/components/chat/ChatHeader.tsx`
4. 单联系人单会话（前端状态层）
   - Zustand 中按 `contactId -> messages[]` 管理会话
   - 代码：`/packages/client/stores/chat.ts`
5. 发送消息与“AI 回应”模拟
   - 输入框回车/发送按钮可发消息
   - 发送后会追加用户消息，再模拟 tool 消息，再模拟 assistant 文本回复
   - 代码：`/packages/client/app/chat/page.tsx`、`/packages/client/components/chat/ChatComposer.tsx`
6. Tool 消息渲染
   - 消息气泡支持 `toolCalls` 展示（工具名 + result）
   - 代码：`/packages/client/components/chat/MessageBubble.tsx`
7. 基础 UI 主题与移动端样式
   - Tailwind v4 + 全局样式生效，页面是移动端优先视觉
   - 代码：`/packages/client/app/globals.css`、`/packages/client/app/layout.tsx`
8. 类型定义与本地 DB schema 已准备
   - 类型定义齐全（Contact/Message/ToolCall/ContactCard 等）
   - Dexie 表结构已定义
   - 代码：`/packages/client/types/index.ts`、`/packages/client/lib/db.ts`

#### 当前“已写但未真正接通”的部分
1. Dexie 持久化未接入业务流
   - `db` 被 import 到聊天页，但没有实际读写联系人/消息
   - 现状是内存态（刷新丢失）
2. AI SDK / assistant-ui 依赖已安装但未使用
   - `@ai-sdk/react`、`@assistant-ui/react` 在依赖里
   - 目前聊天回复是 `setTimeout` 模拟，不是真实模型调用
   - 见 `/packages/client/package.json`
3. ContactPreviewCard 组件未挂载
   - 组件存在，但 MessageList 里未实际渲染卡片（只渲染 MessageBubble）
   - 代码：`/packages/client/components/chat/ContactPreviewCard.tsx`、`/packages/client/components/chat/MessageList.tsx`
4. 工具栏按钮/语音按钮只有 UI，无行为
   - ChatComposer 里的工具按钮和麦克风按钮暂无功能逻辑
   - 代码：`/packages/client/components/chat/ChatComposer.tsx`
5. “新增联系人”按钮无功能
   - 抽屉里的 Plus 按钮目前无事件逻辑
   - 代码：`/packages/client/components/drawer/ContactsDrawer.tsx`
6. 无后端 API 路由
   - `app/api` 下没有接口文件（当前无真实服务交互）
7. 测试基本为空
   - 项目里没有业务代码的 test/spec（除了 node_modules 里的第三方示例）
   - 目前尚未形成可验证测试面

#### 一句话结论
你现在是一个可交互的前端 MVP 壳子：
“能聊、能切联系人、能展示 tool 消息（模拟）”，但还没进入“真实 AI + 本地持久化 + API + 测试”阶段。

### 2026-02-11 15:00:00 +0800
- 类型：项目初始化完成（回补）
- 摘要：基于 `designs/friendsAI-mvp.pen` 生成移动端优先聊天应用初版，完成前端骨架与核心组件。

#### ✅ 项目生成完成
基于 `designs/friendsAI-mvp.pen` 设计文件，已成功创建移动端优先的聊天应用。

#### 📁 项目结构
```text
packages/client/
├── app/
│   ├── page.tsx           # 首页 (介绍页面)
│   ├── chat/page.tsx      # 聊天页面
│   ├── layout.tsx         # 根布局
│   └── globals.css        # 全局样式
├── components/
│   ├── chat/
│   │   ├── ChatHeader.tsx         # 聊天头部
│   │   ├── MessageList.tsx        # 消息列表
│   │   ├── MessageBubble.tsx      # 消息气泡 (支持 Tool 消息)
│   │   ├── ContactPreviewCard.tsx # 联系人预览卡片
│   │   └── ChatComposer.tsx       # 输入框 + 工具栏
│   └── drawer/
│       └── ContactsDrawer.tsx     # 联系人抽屉
├── stores/
│   └── chat.ts            # Zustand 状态管理
├── lib/
│   └── db.ts              # Dexie 数据库配置
└── types/
    └── index.ts           # TypeScript 类型定义
```

#### 🛠️ 技术栈
- Next.js 16.1.6 (App Router)
- TypeScript
- Tailwind CSS v4
- Zustand (状态管理)
- Dexie (IndexedDB ORM)
- Vercel AI SDK (`@ai-sdk/react`)
- Assistant UI (`@assistant-ui/react`)

#### ✨ 功能特性
- 左侧联系人抽屉（可滑出/收起）
- 单联系人单会话（每个联系人独立对话）
- Tool 消息渲染（显示 AI 工具调用结果）
- 联系人预览卡片（展示提取的联系人信息）
- 移动端优先设计（375px 宽度，触摸友好）

#### 🚀 运行方式
```bash
# 前端已在运行：http://localhost:10087
# 访问首页：http://localhost:10087
# 访问聊天页：http://localhost:10087/chat
```
服务器已在后台运行，可以在浏览器中访问查看效果。

### 2026-02-11 15:30:00 +0800
- 类型：项目管理脚本增强 + 阶段总结（回补）
- 摘要：补录 15:30 阶段对 `project.sh` 的增强能力、运行方式与当时项目状态结论。

#### 更新内容
- 新增功能
  - 端口配置：前端 `10087`，后端 `4001`
  - 端口占用检测：自动检测并清理被占用端口
  - `install`：安装项目依赖
  - `clean`：清理所有构建和缓存
  - 增强 `status`：显示详细服务状态和端口信息

#### 使用方法
```bash
# 启动服务
./project.sh start           # 启动前后端
./project.sh start client    # 仅启动前端
./project.sh start server    # 仅启动后端

# 停止服务
./project.sh stop            # 停止前后端
./project.sh stop client     # 停止前端
./project.sh stop server     # 停止后端

# 重启
./project.sh restart         # 重启前后端

# 构建
./project.sh build           # 构建前后端
./project.sh build client    # 构建前端

# 查看日志
./project.sh logs            # 前端日志
./project.sh logs server     # 后端日志

# 查看状态
./project.sh status          # 服务状态

# 其他
./project.sh install         # 安装依赖
./project.sh clean           # 清理缓存
./project.sh clean-logs      # 清理日志
```

#### 15:30 阶段项目现状总结
- 项目结构
  - `packages/client`：Next.js 前端（MVP）
  - `packages/server-nestjs`：NestJS 后端
  - `project.sh`：项目管理脚本
- 前端页面
  - `/` 首页：已完成
  - `/chat` 聊天页：已完成
- 前端核心组件
  - `ChatHeader`、`MessageList`、`MessageBubble`、`ContactPreviewCard`、`ChatComposer`、`ContactsDrawer`
- 状态与数据层
  - `stores/chat.ts`（Zustand）
  - `lib/db.ts`（Dexie schema）
  - `types/index.ts`（类型定义）
- 当时待完善重点
  - P0：真实 AI 集成、联系人 CRUD、消息持久化
  - P1：工具栏功能、联系人卡片渲染
  - P2：抽屉动画、桌面端适配

---

> 更新时间：2026-02-11

## 当前可用功能

1. 首页介绍与聊天页跳转
   - 首页文案、功能卡片与“开始聊天”按钮可用。
   - 入口：`packages/client/app/page.tsx`

2. 聊天主界面（移动端优先）
   - 聊天页包含头部、消息区、输入区的完整结构。
   - 入口：`packages/client/app/chat/page.tsx`

3. 左侧联系人抽屉
   - 可打开/关闭抽屉。
   - 可切换当前联系人，切换后展示对应会话。
   - 相关文件：
     - `packages/client/components/drawer/ContactsDrawer.tsx`
     - `packages/client/components/chat/ChatHeader.tsx`

4. 单联系人单会话（前端状态）
   - Zustand 按 `contactId -> messages[]` 管理会话消息。
   - 相关文件：`packages/client/stores/chat.ts`

5. 发送消息与 AI 回复模拟
   - 支持输入、回车发送、发送按钮。
   - 发送后追加用户消息，再模拟 tool 消息，再模拟 assistant 文本回复。
   - 相关文件：
     - `packages/client/app/chat/page.tsx`
     - `packages/client/components/chat/ChatComposer.tsx`

6. Tool 消息渲染
   - 消息气泡支持 `toolCalls` 的工具名与结果展示。
   - 相关文件：`packages/client/components/chat/MessageBubble.tsx`

7. UI 样式与基础布局
   - Tailwind CSS v4 + 全局样式已生效，符合移动端优先设计。
   - 相关文件：
     - `packages/client/app/globals.css`
     - `packages/client/app/layout.tsx`

8. 类型与本地数据库 Schema 准备完成
   - 类型定义齐全（Contact/Message/ToolCall/ContactCard 等）。
   - Dexie 表结构已定义。
   - 相关文件：
     - `packages/client/types/index.ts`
     - `packages/client/lib/db.ts`

## 已有但未接通/未完成项

1. Dexie 持久化未接入消息与联系人流程
   - 当前数据主要在内存状态中，刷新页面会丢失。

2. AI SDK / assistant-ui 依赖未接入真实对话链路
   - 目前回复逻辑是 `setTimeout` 模拟，不是实际模型调用。

3. 联系人预览卡片组件未挂载到消息流
   - `ContactPreviewCard` 已实现，但消息列表尚未实际渲染该组件。

4. 输入区工具按钮与语音按钮仅有 UI
   - 暂无实际功能逻辑。

5. 抽屉中的“新增联系人”按钮无行为
   - UI 已存在，业务逻辑未实现。

6. 尚无 API 路由
   - `packages/client/app/api` 目录下暂无接口实现。

7. 测试尚未建立
   - 当前缺少业务代码的单元测试、集成测试与 E2E 测试。

## 结论

当前项目已具备“可交互的前端 MVP 壳子”：
- 能聊天
- 能切联系人
- 能展示 tool 消息（模拟）

下一阶段重点应放在：
1. 接入 Dexie 持久化
2. 接入真实 AI 调用/API
3. 建立测试体系（单元 + 集成 + E2E）
