# FriendsAI

AI-powered relationship management app - 智能社交关系管理应用

## 1. 项目简介

这是一个基于 **AI Native** 理念设计的个人/小团队人脉管理系统。与传统 CRM 不同，它不依赖繁琐的表单输入，而是通过**自然语言交互**（对话录音/笔记）来自动沉淀人脉数据。系统利用大语言模型（LLM）进行信息提取、画像构建，并利用向量数据库实现智能检索和推荐。

### 核心价值
*   **无感输入**：记录即归档，AI 自动提取联系人、事件、待办。
*   **智能辅助**：会前一键生成简报，会后自动整理纪要。
*   **主动推荐**：基于关系深度和时间维度的“行动面板”，通过 AI 建议“今天该联系谁”。

## 2. 项目结构

```
friendsAI/
├── packages/
│   ├── client/              # 前端应用 (Taro 跨平台)
│   │   ├── src/
│   │   └── ...
│   │
│   ├── server-nestjs/       # [NEW] AI 原生后端服务 (NestJS)
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
│   └── server/              # [DEPRECATED] 旧版后端 (Express)
│
├── designs/                 # 设计文件 (.pen)
├── docs/                    # 项目文档
├── docker-compose.yml       # 数据库编排 (PostgreSQL + PGVector)
└── README.md
```

## 3. 技术栈

### 前端 (packages/client)
- **框架**: Taro 3.6 (跨平台小程序框架)
- **UI**: React 18 + taro-ui
- **语言**: TypeScript

### 后端 (packages/server-nestjs)
- **框架**: NestJS (Node.js + TypeScript)
- **数据库**: PostgreSQL 15
- **向量扩展**: PGVector (用于存储和检索 Embedding)
- **ORM**: TypeORM
- **AI SDK**: OpenAI Node.js SDK
- **测试**: Jest

## 4. 功能模块详解

### 🛡️ 认证与用户模块 (Auth & Users)
*   **功能**：处理用户注册、登录、登出。
*   **机制**：基于 Session 的认证，密码采用 bcrypt 哈希存储。

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
*   **功能**：在见面前生成“作弊小抄”。
*   **逻辑**：聚合联系人基础信息 + 最近 5 次对话 + 最近 5 个事件 -> LLM 生成简要回顾和话题建议。

### 🚀 行动面板 (Action Panel)
*   **功能**：首页仪表盘。
*   **待跟进**：基于最后交互时间排序。
*   **AI 推荐**：智能推荐“即刻联系”的对象，并生成推荐理由和开场白。

## 5. 快速开始

### 前置要求
- Node.js v16+
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
    OPENAI_API_KEY=sk-your-actual-api-key
    ```

3.  **安装并启动后端**
    ```bash
    cd packages/server-nestjs
    npm install
    npm run start:dev
    ```
    服务将运行在 `http://localhost:3000`。

4.  **运行测试**
    ```bash
    npm run test
    ```

## 6. 遗留问题与技术债务

### ⚠️ Task 12: `ConversationProcessorService` 单元测试
*   **状态**：核心业务逻辑已实现并经过代码审查，但对应的单元测试文件 (`conversation-processor.service.spec.ts`) 目前无法通过。
*   **原因**：
    *   NestJS 测试模块中复杂的依赖注入（特别是 `ConfigService` 和 `AiService` 的交互）。
    *   Jest `spyOn` 与 TypeScript 类型推断在模拟对象状态传递时的冲突。
    *   需要精确匹配多行 AI Prompt 字符串。
*   **建议**：在后续迭代中，建议人工介入重构此测试，或补充端到端 (E2E) 测试以覆盖此核心路径。

## License

Private
