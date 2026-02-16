# FriendsAI 开发运行指南（MVP）

## 1) 启动 Postgres（推荐：Docker + pgvector）

在项目根目录：

```bash
docker compose -f docker-compose.dev.yml up -d
```

你也可以直接使用一键脚本（会自动启动 DB + 迁移 + API + 前端）：

```bash
./project.sh start:mvp
```

默认会在本机暴露 `localhost:5434`（容器内仍是 5432），数据库名/用户/密码都是 `friendsai`。

## 2) 配置后端环境变量

创建并修改：

```bash
touch packages/server-nestjs/.env
```

建议最小可用配置：

- `DATABASE_URL=postgres://friendsai:friendsai@localhost:5434/friendsai_v2`
- `JWT_SECRET=...`（随便一串即可）
- `OPENAI_API_KEY=...`
- 可选：`OPENAI_MODEL=gpt-4o-mini` / `OPENAI_EMBEDDING_MODEL=text-embedding-3-small`

## 3) 迁移数据库

```bash
npm run server:migrate
```

## 4) 启动后端 API

```bash
npm run server:dev
```

## 5) 启动前端（H5）

```bash
npm run client:dev
```

默认会用 `TARO_APP_API_BASE_URL`（没配置则走 `http://localhost:3000/v1`）。H5 端口从 `CLIENT_PORT` 读取（默认 10086）。
