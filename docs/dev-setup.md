# FriendsAI 开发运行指南（MVP）

## 1) 启动 Postgres（推荐：Docker + pgvector）

在项目根目录：

```bash
docker compose -f docker-compose.dev.yml up -d
```

默认会在本机暴露 `localhost:5432`，数据库名/用户/密码都是 `friendsai`。

## 2) 配置后端环境变量

复制并修改：

```bash
cp packages/server/.env.example packages/server/.env
```

建议最小可用配置：

- `DATABASE_URL=postgres://friendsai:friendsai@localhost:5432/friendsai`
- `JWT_SECRET=...`（随便一串即可）

## 3) 迁移数据库

```bash
npm run server:migrate
```

## 4) 启动后端 API + Worker

```bash
npm run server:dev
```

另开一个终端：

```bash
npm run -w @friends-ai/server worker
```

如果你想用编译后的产物启动（更贴近生产），先 build 再：

```bash
npm run server:build
npm run -w @friends-ai/server start
```

Worker：

```bash
npm run -w @friends-ai/server worker:start
```

## 5) AI 配置（你本地的 LLM Proxy + OpenAI Embeddings）

你给的本地 LLM Proxy（OpenAI 兼容）：
- `AI_PROVIDER=openai_compat`
- `AI_BASE_URL=http://127.0.0.1:9739/v1`
- `AI_MODEL=gemini-3-flash`

Embeddings 只用 OpenAI：
- `EMBEDDING_BASE_URL=https://api.openai.com/v1`
- `EMBEDDING_API_KEY=你的 OpenAI key`
- `EMBEDDING_MODEL=text-embedding-3-small`（和 pgvector 1536 维保持一致）

可选：当本地模型不可用时自动 fallback 到云端：
- `AI_ROUTING_MODE=auto`
- `AI_FALLBACK_BASE_URL=https://api.openai.com/v1`
- `AI_FALLBACK_API_KEY=你的 OpenAI key`
- `AI_FALLBACK_MODEL=gpt-4o-mini`

你可以跑脚本快速验证：

```bash
npm run -w @friends-ai/server test:ai
npm run -w @friends-ai/server test:embedding
npm run -w @friends-ai/server test:smoke
```

## 6) 启动前端（H5）

```bash
npm run client:dev
```

默认会用 `TARO_APP_API_BASE_URL`（没配置则走 `http://localhost:3000/v1`）。
