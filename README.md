# FriendsAI

AI-powered relationship management app - 智能社交关系管理应用

## 1. 项目简介

这是一个基于 **AI Native** 理念设计的个人/小团队人脉管理系统。与传统 CRM 不同，它不依赖繁琐的表单输入，而是通过**自然语言交互**（对话录音/笔记）来自动沉淀人脉数据。系统利用大语言模型（LLM）进行信息提取、画像构建，并利用向量数据库实现智能检索和推荐。

### 核心价值
*   **无感输入**：记录即归档，AI 自动提取联系人、事件、待办。
*   **智能辅助**：会前一键生成简报，会后自动整理纪要。
*   **主动推荐**：基于关系深度和时间维度的"行动面板"，通过 AI 建议"今天该联系谁"。

## 主线说明（NestJS v2）

- 后端主线：`packages/server-nestjs`（NestJS，API 前缀 `/v1`）
- 前端主线：`packages/web`（Vite React + Assistant-UI）
- 数据库：`friendsai_v2`（通过 `DATABASE_URL` 指向）

## 2. 项目结构

```
friendsAI/
├── packages/
│   ├── web/                 # [MAIN] 前端应用 (Vite React)
│   │   ├── src/
│   │   │   ├── app/         # 应用入口与路由
│   │   │   ├── components/  # 通用组件 (layout, chat, a2ui)
│   │   │   ├── pages/       # 页面组件
│   │   │   ├── runtime/     # 聊天运行时 (AI SDK transport)
│   │   │   ├── api/         # API 客户端
│   │   │   ├── schemas/     # zod 校验 schema
│   │   │   └── styles/      # 全局样式 (Tailwind)
│   │   └── ...
│   │
│   ├── server-nestjs/       # [MAIN] AI 原生后端服务 (NestJS, /v1)
│   │   ├── src/
│   │   │   ├── action-panel/ # 行动面板模块
│   │   │   ├── ai/           # AI 核心与向量服务
│   │   │   ├── auth/         # 认证模块
│   │   │   ├── briefings/    # 会前简报模块
│   │   │   ├── contacts/     # 联系人管理
│   │   │   ├── conversations/# 对话处理与 AI 解析
│   │   │   ├── events/       # 事件管理
│   │   │   └── entities/     # 数据库实体
│   │   ├── Dockerfile
│   │   └── ...
│   │
├── designs/                 # 设计文件 (.pen)
├── docs/                    # 项目文档
├── docker-compose.yml       # 数据库编排 (PostgreSQL + PGVector)
└── README.md
```

## 3. 技术栈

### 前端 (packages/web)

| 技术 | 说明 |
|------|------|
| **构建** | Vite 5 + TypeScript |
| **框架** | React 18 |
| **路由** | React Router v6 |
| **聊天 UI** | Assistant-UI（React 组件库，集成 Vercel AI SDK） |
| **AI 流式** | Vercel AI SDK（前端 hooks + stream protocol） |
| **状态管理** | React Context + hooks（复杂场景可上 Zustand） |
| **样式** | Tailwind CSS |
| **校验** | zod（A2UI/ToolTrace schema 运行时校验） |
| **测试** | Vitest + Testing Library（E2E 可选 Playwright） |
| **产品形态** | Web-first 移动端（优先手机浏览器；可选 PWA/Capacitor 打包） |

### 后端 (packages/server-nestjs) - AI Native 后端
- **框架**: NestJS (Node.js + TypeScript)
- **数据库**: PostgreSQL 15
- **向量扩展**: PGVector (用于存储和检索 Embedding)
- **ORM**: TypeORM
- **AI SDK**: OpenAI Node.js SDK
- **测试**: Jest


## 4. 功能模块详解

### 🛡️ 认证与用户模块 (Auth & Users)
*   **功能**：处理用户注册、登录、登出。
*   **机制**：JWT access/refresh（refresh 持久化），密码采用 bcrypt 哈希存储。

### 👥 联系人管理 (Contacts)
*   **功能**：联系人全生命周期管理。
*   **特点**：支持 JSONB 格式的灵活画像（Profile）和标签系统，适应非结构化信息存储。

### 💬 对话与事件 (Conversations & Events)
*   **功能**：
    *   **对话**：记录用户输入的自然语言笔记。
    *   **事件**：存储具体的日程和交互记录。
*   **AI 能力**：所有内容自动生成 Embedding 向量，支持语义搜索。

### 🧠 AI 处理器 (Conversation Processor)
*   **核心逻辑**：
    1.  接收自然语言输入。
    2.  调用 LLM 提取联系人、事件、事实和待办事项。
    3.  自动更新或创建关联的实体数据。
    4.  归档解析结果。

### 📝 会前简报 (Briefings)
*   **功能**：在见面前生成"作弊小抄"。
*   **逻辑**：聚合联系人基础信息 + 最近 5 次对话 + 最近 5 个事件 -> LLM 生成简要回顾和话题建议。

### 🚀 行动面板 (Action Panel)
*   **功能**：首页仪表盘。
*   **待跟进**：基于最后交互时间排序。
*   **AI 推荐**：智能推荐"即刻联系"的对象，并生成推荐理由和开场白。

## 5. 快速开始

### 前置要求
- Node.js >= 18.0.0
- Bun >= 1.2.0（可选，用于 monorepo 脚本）
- Docker (用于运行数据库)
- OpenAI API Key

### 启动步骤

1.  **启动基础设施**
    在项目根目录运行：
    ```bash
    docker-compose up -d
    ```
    *   启动 PostgreSQL (端口 5434) 和 PGVector。

2.  **配置后端环境**
    进入 `packages/server-nestjs` 并创建 `.env` 文件：
    ```env
    DATABASE_URL=postgres://friendsai:friendsai@localhost:5434/friendsai_v2
    JWT_SECRET=dev-smoke-secret
    OPENAI_API_KEY=your-openai-api-key
    ```

3.  **安装依赖并运行 migrations**
    ```bash
    cd packages/server-nestjs
    npm install
    npm run migrate
    ```

4.  **启动后端**
    ```bash
    npm run start:dev
    ```
    服务将运行在 `http://localhost:3000`，健康检查：`http://localhost:3000/v1/health`。

5.  **启动前端**
    ```bash
    cd packages/web
    npm install
    npm run dev
    ```
    前端将运行在 `http://localhost:10086`。

### Smoke 测试（NestJS 主线）

```bash
node scripts/smoke-v2.js
```

可选环境变量：
`SMOKE_BASE_URL`（默认 `http://localhost:3000/v1`）、`SMOKE_EMAIL`、`SMOKE_PASSWORD`。

> 注意：聊天与简报依赖 `OPENAI_API_KEY`。

### 使用 bun 脚本（主线）

```bash
bun run dev              # 同时启动前后端
bun run web:dev          # 前端开发模式
bun run server:dev       # 后端开发
bun run build            # 构建前后端
```

### bun 脚本说明

| 命令 | 说明 |
|------|------|
| `bun run dev` | 同时启动前后端开发服务 |
| `bun run build` | 构建前后端 |
| `bun run web:dev` | 前端 Vite 开发模式 |
| `bun run web:build` | 构建前端 |
| `bun run web:preview` | 预览前端构建产物 |
| `bun run server:dev` | 后端开发模式 |
| `bun run server:build` | 构建后端 |
| `bun run server:start` | 启动后端生产服务 |

### 使用 project.sh 脚本

```bash
./project.sh start           # 启动前后端
./project.sh start web       # 仅启动前端
./project.sh start server    # 仅启动后端
./project.sh start:mvp       # 启动 MVP（DB + 迁移 + 前后端）
./project.sh stop            # 停止所有服务
./project.sh logs web        # 查看前端日志
./project.sh logs server     # 查看后端日志
./project.sh status          # 查看服务状态
```

## 6. 项目模块说明

### packages/web - 前端模块

| 目录/文件 | 说明 |
|-----------|------|
| `src/app/` | 应用入口、路由配置、Provider |
| `src/pages/` | 页面组件 (LoginPage, ChatPage, ContactsPage 等) |
| `src/components/layout/` | 布局组件 (AppShell, Header, TabBar, GlobalDrawer) |
| `src/components/chat/` | 聊天相关组件 (Assistant-UI wrappers) |
| `src/components/a2ui/` | A2UI 渲染器 (ArchiveReviewCard, ConfirmBar 等) |
| `src/runtime/` | 聊天运行时 (AI SDK transport, stream parser) |
| `src/api/` | API 客户端封装 |
| `src/schemas/` | zod 校验 schema (A2UI, ToolTrace, DTOs) |
| `src/styles/` | 全局样式 (Tailwind CSS 变量) |

### designs/ - 设计文件

| 文件 | 说明 |
|------|------|
| `pencil-friendsAI.pen` | FriendsAI 主设计文件 |

### logs/ - 运行日志

| 文件 | 说明 |
|------|------|
| `web.log` | 前端服务日志 |
| `server.log` | 后端服务日志 |

## 7. 注意事项

### 前端开发
1. 前端代码位于 `packages/web/src`
2. 路径别名 `@/*` 映射到 `packages/web/src/*`
3. 使用 Tailwind CSS，设计令牌定义在 `src/styles/globals.css`
4. 图标使用 Lucide React

### 后端开发
1. 后端代码位于 `packages/server-nestjs/src`
2. 使用环境文件 `packages/server-nestjs/.env.development` / `packages/server-nestjs/.env.production` 配置环境变量
3. 端口通过 `PORT` 配置（开发默认 3000）

### 前端配置
1. 前端环境文件位于 `packages/web/.env.development` / `packages/web/.env.production`
2. 开发端口通过 `WEB_PORT` 配置（默认 10086）
3. API 代理已配置，`/v1/*` 请求会转发到后端

### Monorepo 结构
1. 使用 npm workspaces 管理多包
2. 共享依赖会提升到根目录 `node_modules`
3. 各包的专属依赖在各自的 `package.json` 中声明

### 设计文件
1. 所有 `.pen` 设计文件统一存放在 `designs/` 目录
2. 使用 Pencil MCP 工具编辑设计文件

## License

Private
