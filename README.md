# FriendsAI

AI-powered relationship management app - 智能社交关系管理应用

## 项目结构

```
friendsAI/
├── packages/
│   ├── client/              # 前端应用 (Taro 跨平台)
│   │   ├── src/
│   │   │   ├── components/  # 可复用组件
│   │   │   ├── pages/       # 页面
│   │   │   ├── services/    # API 服务层
│   │   │   ├── types/       # TypeScript 类型
│   │   │   └── utils/       # 工具函数
│   │   ├── config/          # 环境配置
│   │   └── package.json
│   │
│   └── server/              # 后端服务 (Express)
│       ├── src/
│       │   ├── routes/      # 路由
│       │   ├── controllers/ # 控制器
│       │   ├── services/    # 业务逻辑
│       │   ├── models/      # 数据模型
│       │   ├── middleware/  # 中间件
│       │   └── index.ts     # 入口文件
│       └── package.json
│
├── designs/                 # 设计文件 (.pen)
│   ├── pencil-friendsAI.pen # 主设计文件
│   └── ...
│
├── docs/                    # 项目文档
│   ├── AGENTS.md            # AI 助手指南
│   └── CLAUDE.md            # Claude 配置
│
├── openspec/                # 项目规范和变更管理
├── logs/                    # 运行日志 (gitignore)
├── package.json             # Monorepo 根配置
├── project.sh               # 项目管理脚本
└── README.md
```

## 技术栈

### 前端 (packages/client)
- **框架**: Taro 3.6 (跨平台小程序框架)
- **UI**: React 18 + taro-ui
- **语言**: TypeScript
- **样式**: SCSS
- **构建**: Webpack 5

### 后端 (packages/server)
- **框架**: Express.js
- **语言**: TypeScript
- **运行时**: Node.js 18+
- **包管理**: Bun

## 快速开始

更完整的后端 + 本地 LLM proxy + OpenAI embeddings 配置见：`docs/dev-setup.md`。

### 环境要求
- Node.js >= 18.0.0
- Bun >= 1.2.0

### 安装依赖

```bash
bun install
```

### 使用 project.sh 脚本 (推荐)

```bash
./project.sh start           # 启动前后端服务
./project.sh start client    # 仅启动前端
./project.sh start server    # 仅启动后端
./project.sh stop            # 停止所有服务
./project.sh restart         # 重启服务
./project.sh status          # 查看服务状态
./project.sh logs client     # 查看前端日志
./project.sh logs server     # 查看后端日志
./project.sh build           # 构建前后端
./project.sh build client    # 仅构建前端
./project.sh clean-logs      # 清理日志文件
```

### MVP 一键启动

```bash
./project.sh start:mvp
```

### 使用 bun 脚本

```bash
bun run dev              # 同时启动前后端
bun run client:dev       # 前端 H5 开发
bun run client:dev:weapp # 微信小程序开发
bun run server:dev       # 后端开发
bun run build            # 构建前后端
```

## 可用命令

### project.sh 脚本

| 命令 | 说明 |
|------|------|
| `./project.sh start [target]` | 启动服务 (client/server/all) |
| `./project.sh stop [target]` | 停止服务 |
| `./project.sh restart [target]` | 重启服务 |
| `./project.sh build [target]` | 构建项目 |
| `./project.sh logs [target]` | 查看日志 |
| `./project.sh status` | 查看服务状态 |
| `./project.sh clean-logs` | 清理日志 |

### bun 脚本

| 命令 | 说明 |
|------|------|
| `bun run dev` | 同时启动前后端开发服务 |
| `bun run build` | 构建前后端 |
| `bun run client:dev` | 前端 H5 开发模式 |
| `bun run client:dev:weapp` | 前端微信小程序开发模式 |
| `bun run client:build` | 构建前端 H5 |
| `bun run client:build:weapp` | 构建微信小程序 |
| `bun run server:dev` | 后端开发模式 |
| `bun run server:build` | 构建后端 |
| `bun run server:start` | 启动后端生产服务 |

## 目录说明

### packages/client - 前端模块

| 目录/文件 | 说明 |
|-----------|------|
| `src/components/` | 可复用 UI 组件 (TabBar, Header, ContactCard 等) |
| `src/pages/` | 页面组件 (login, contacts, conversation 等) |
| `src/services/api.ts` | API 接口封装 |
| `src/types/` | TypeScript 类型定义 |
| `src/utils/` | 工具函数 |
| `config/` | 环境配置 (dev.ts, prod.ts) |

### packages/server - 后端模块

| 目录 | 说明 |
|------|------|
| `src/routes/` | API 路由定义 |
| `src/controllers/` | 请求处理控制器 |
| `src/services/` | 业务逻辑服务 |
| `src/models/` | 数据模型 |
| `src/middleware/` | Express 中间件 |
| `src/utils/` | 工具函数 |
| `src/types/` | TypeScript 类型定义 |

### designs/ - 设计文件

| 文件 | 说明 |
|------|------|
| `pencil-friendsAI.pen` | FriendsAI 主设计文件 |
| `pencil-codex.pen` | Codex 相关设计 |
| `pencil-gemini.pen` | Gemini 相关设计 |

### docs/ - 项目文档

| 文件 | 说明 |
|------|------|
| `AGENTS.md` | AI 助手使用指南 |
| `CLAUDE.md` | Claude 配置说明 |

### logs/ - 运行日志

| 文件 | 说明 |
|------|------|
| `client.log` | 前端服务日志 |
| `server.log` | 后端服务日志 |

## 注意事项

### 前端开发
1. 前端代码位于 `packages/client/src`
2. 路径别名 `@/*` 映射到 `packages/client/src/*`
3. 小程序开发需要配置微信开发者工具，指向 `packages/client/dist` 目录
4. 修改 `packages/client/project.config.json` 中的 `appid` 为你的小程序 ID

### 后端开发
1. 后端代码位于 `packages/server/src`
2. 使用环境文件 `packages/server/.env.development` / `packages/server/.env.production` 配置环境变量
3. 端口通过 `PORT` 配置（开发默认 3000）

### 前端配置
1. 前端环境文件位于 `packages/client/.env.development` / `packages/client/.env.production`
2. H5 端口通过 `CLIENT_PORT` 配置（开发默认 10086）
3. API 基地址通过 `TARO_APP_API_BASE_URL` 配置

### Monorepo 结构
1. 使用 npm workspaces 管理多包
2. 共享依赖会提升到根目录 `node_modules`
3. 各包的专属依赖在各自的 `package.json` 中声明
4. 使用 `-w` 参数可以在根目录运行子包脚本

### 设计文件
1. 所有 `.pen` 设计文件统一存放在 `designs/` 目录
2. 使用 Pencil MCP 工具编辑设计文件

## License

Private
