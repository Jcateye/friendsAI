# AI原生人脉管理系统 - 开发笔记

## 2026-01-31 进度记录

### 已完成任务

#### Task 1: NestJS 项目初始化 ✅
- 在 `packages/server-nestjs` 创建 NestJS 项目
- 配置 TypeScript 严格模式
- ESLint 和 Prettier 已配置
- 测试通过

#### Task 2: PostgreSQL + PGVector 环境搭建 ✅
- 使用 Docker 启动 PostgreSQL 容器
- 端口: 5434 (避免与现有服务冲突)
- 数据库: friends_ai_db
- PGVector 扩展已启用 (版本 0.5.1)
- 连接信息: postgres/postgres@localhost:5434

#### Task 3: TypeORM 集成配置 ✅
- 安装 @nestjs/typeorm, typeorm, pg
- 配置 AppModule 导入 TypeOrmModule
- 使用 autoLoadEntities 自动加载实体
- 集成测试通过

#### Task 4: 用户认证模块 ✅
- 安装 bcrypt, express-session, connect-pg-simple
- 创建 AuthModule, AuthController, AuthService
- 实现注册和登录 API
- 密码使用 bcrypt 哈希存储
- 所有测试通过 (5/5)

#### Task 5: Session 管理 ✅
- 已包含在认证模块中
- 使用 express-session 和 connect-pg-simple
- Session 存储在 PostgreSQL

#### Task 6: 核心数据模型设计 ✅
- User 实体: id, email, password, name, contacts[], conversations[]
- Contact 实体: id, name, email, phone, company, position, profile (JSONB), tags, events[], conversations[]
- Conversation 实体: id, content, embedding (vector), parsedData (JSONB), isArchived
- Event 实体: id, title, description, details (JSONB), eventDate, embedding (vector)

#### Task 7: 数据库迁移与模型同步 ✅
- 使用 TypeORM synchronize (开发环境)
- 所有实体表已自动创建
- 关系已正确建立

### 技术决策记录

1. **使用 Docker 运行 PostgreSQL**: 避免本地安装冲突，便于管理
2. **使用 autoLoadEntities**: 简化实体管理，自动加载所有实体
3. **使用 synchronize**: 开发环境快速迭代，生产环境应使用迁移
4. **实体关系设计**: User 1:N Contact, Contact 1:N Event/Conversation
5. **JSONB 字段**: 用于存储灵活的 profile 和 details 数据
6. **Vector 字段**: 用于存储对话和事件的嵌入向量

### 遇到的问题及解决方案

1. **端口冲突**: PostgreSQL 5432 和 5433 都被占用，使用 5434
2. **实体关系错误**: TypeORM 需要所有相关实体都在 entities 数组中
3. **测试配置**: 测试模块需要显式导入所有实体，不能仅依赖 autoLoadEntities

### 下一步计划

- Task 8: 联系人模块 CRUD API
- Task 9: 对话与事件记录模块 API
- Task 10: AI Agent SDK 集成
