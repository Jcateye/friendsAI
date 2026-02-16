# FriendsAI 多 Agent 并行开发工作流

## 架构选择：双层架构（本地规划 + 远程执行）

### 为什么选择这个方案？

**问题：** 多个 coding agent 并行开发时，本地 board.json 会出现并发冲突
- Agent A 和 Agent B 同时读写 board.json → 状态覆盖
- 多个分支修改同一文件 → Git merge 冲突
- 无法原子性锁定任务 → Race condition

**解决方案：** 分离规划层和执行层

```
┌─────────────────────────────────────────┐
│         本地 board.json                  │
│   (规划层 - Planning Layer)              │
│   ✓ 详细任务分解                          │
│   ✓ 依赖关系图                            │
│   ✓ 实现步骤                              │
│   ✓ 验收标准                              │
│   ✓ Git 版本控制                          │
│   ✓ 人类可读的完整上下文                   │
└─────────────────┬───────────────────────┘
                  │ 单向同步（手动或脚本）
                  ↓
┌─────────────────────────────────────────┐
│      vibe_kanban 远程服务                │
│   (执行层 - Execution Layer)             │
│   ✓ 任务状态实时同步（API）               │
│   ✓ Agent 并发锁机制                      │
│   ✓ Workspace Session 管理               │
│   ✓ 原子性状态更新                        │
└─────────────────┬───────────────────────┘
                  │
         ┌────────┴────────┬──────────┐
         ↓                 ↓          ↓
    Agent A           Agent B     Agent C
   (worktree 1)     (worktree 2) (worktree 3)
   独立工作空间      独立工作空间   独立工作空间
```

---

## 数据结构调整

### 本地 board.json 新增字段

```json
{
  "tasks": [
    {
      "id": "TASK-001",
      "title": "Router冲突修复",
      "phase": "Task 1",
      "priority": "P0",
      "status": "todo",
      "assignee": "opencode",

      // ========== 新增字段 ==========
      "vibe_task_id": null,           // vibe_kanban 任务 ID（同步后填充）
      "vibe_status": null,            // vibe_kanban 最新状态（定期拉取）
      "vibe_synced_at": null,         // 最后同步时间
      "workspace_session_id": null,   // 工作空间会话 ID（如果使用）
      // ==============================

      "estimate": "0.5天",
      "dependencies": [],
      "files": {...},
      "description": "...",
      "requirements": {...},
      "implementation_steps": [...],
      "acceptance_criteria": [...]
    }
  ]
}
```

### vibe_kanban 任务结构（简化版）

```typescript
{
  id: string                    // 由 vibe_kanban 生成
  title: string                 // 对应 "TASK-XXX: 标题"
  description: string           // 存储本地任务 ID 引用
  status: 'todo' | 'inprogress' | 'inreview' | 'done' | 'cancelled'
  project_id: string           // "343327b4-f3bf-4465-b7dc-4641ac74527d"
}
```

---

## 完整工作流程

### Phase 1: 任务规划（本地）

**谁负责：** 项目经理 / 架构师 / 人类开发者

```bash
# 1. 编辑本地 board.json
vi .kanban/board.json

# 2. 添加详细任务
{
  "id": "TASK-010",
  "title": "实现用户认证模块",
  "phase": "Task 3",
  "priority": "P1",
  "status": "todo",
  "assignee": "claude-code",
  "dependencies": ["TASK-005", "TASK-007"],
  "implementation_steps": [
    "1. 创建 JWT 工具类",
    "2. 实现登录接口",
    "3. 添加认证中间件"
  ],
  "acceptance_criteria": [
    "POST /login 返回 JWT token",
    "受保护路由需要 token",
    "token 过期自动刷新"
  ],
  "vibe_task_id": null  // 待同步
}

# 3. 提交到 Git
git add .kanban/board.json
git commit -m "feat: add TASK-010 user authentication planning"
```

---

### Phase 2: 同步到 vibe_kanban

**谁负责：** 同步脚本 / Claude Code

```typescript
// 伪代码示例（之后可以写成自动化脚本）
import { readFileSync, writeFileSync } from 'fs'
import { vibeKanban } from '@vibe/client'

const board = JSON.parse(readFileSync('.kanban/board.json', 'utf-8'))
const projectId = '343327b4-f3bf-4465-b7dc-4641ac74527d'

for (const task of board.tasks) {
  // 只同步未同步的任务
  if (!task.vibe_task_id && task.status !== 'done') {
    const vibeTask = await vibeKanban.create_task({
      project_id: projectId,
      title: `${task.id}: ${task.title}`,
      description: `本地任务 ID: ${task.id}\n\n${task.description}`
    })

    // 更新本地记录
    task.vibe_task_id = vibeTask.id
    task.vibe_status = vibeTask.status
    task.vibe_synced_at = new Date().toISOString()
  }
}

// 写回本地
writeFileSync('.kanban/board.json', JSON.stringify(board, null, 2))
```

**手动同步（Claude Code）：**
```bash
# 在 Claude Code 中执行
"请将 board.json 中所有未同步的任务（vibe_task_id 为 null）同步到 vibe_kanban"
```

---

### Phase 3: Agent 领取任务

**谁负责：** Coding Agent (codex / opencode / claude-code)

#### 方式 1: 直接更新状态（推荐）

```bash
# Agent 查询可用任务
tasks = list_tasks(project_id, status='todo')

# 选择任务（基于本地 assignee 建议）
task = tasks.find(t => t.title.startsWith('TASK-010'))

# 原子性更新状态（避免冲突）
update_task(task.id, {
  status: 'inprogress'
})

# 开始开发
git checkout -b feature/task-010
# ... 编写代码 ...
```

#### 方式 2: 使用 Workspace Session（高级）

```bash
# 创建隔离工作空间
session = start_workspace_session(
  task_id: task.id,
  executor: 'CLAUDE_CODE',
  repos: [{
    repo_id: '8c6e9216-d3c6-4933-bd96-543bc7ee703a',
    base_branch: 'main'
  }]
)

# 在独立 worktree 中开发
# 物理隔离，完全无冲突
```

---

### Phase 4: 状态同步回本地

**谁负责：** 定时同步脚本 / 手动更新

```typescript
// 定期拉取 vibe_kanban 最新状态
const vibeTask = await vibeKanban.get_task(task.vibe_task_id)

// 更新本地记录
task.vibe_status = vibeTask.status
task.vibe_synced_at = new Date().toISOString()

// 如果远程已完成，本地也标记完成
if (vibeTask.status === 'done' && task.status !== 'done') {
  task.status = 'done'
  // 可选：触发通知或后续任务
}
```

---

### Phase 5: 任务完成与合并

**谁负责：** Agent + 人类审核

```bash
# 1. Agent 完成开发
update_task(vibe_task_id, { status: 'inreview' })

# 2. 创建 PR
gh pr create --title "feat: implement user authentication (TASK-010)"

# 3. 人类审核通过后
update_task(vibe_task_id, { status: 'done' })

# 4. 同步回本地 board.json
# 执行同步脚本或手动更新
task.status = 'done'
task.vibe_status = 'done'
```

---

## 并发场景处理

### 场景 1: 两个 Agent 同时领取任务

```bash
时间线：
00:00 - Agent A 调用 list_tasks() 看到 TASK-010 (status='todo')
00:01 - Agent B 调用 list_tasks() 看到 TASK-010 (status='todo')
00:02 - Agent A 调用 update_task(TASK-010, 'inprogress') ✓
00:03 - Agent B 调用 update_task(TASK-010, 'inprogress') ✓ (覆盖但无影响)

问题：两个 Agent 可能同时开始同一任务
解决：
1. 建议 Agent 先检查 assignee 字段（本地 board.json）
2. 使用 workspace session 会自动锁定
3. 人为协调：不同 Agent 处理不同 priority/phase
```

### 场景 2: 本地和远程状态不一致

```bash
本地:  TASK-010.status = 'todo'
远程:  TASK-010.vibe_status = 'inprogress'

解决策略：
- 以 vibe_kanban 为准（Source of Truth）
- 定期同步脚本拉取最新状态
- 本地 status 可以手动调整用于规划，但执行时以 vibe_status 为准
```

### 场景 3: Git 代码冲突

```bash
Agent A 和 Agent B 修改了同一个文件

解决：
1. 使用 Git worktree 物理隔离
   git worktree add ../friendsAI-agent-a -b task-010-a
   git worktree add ../friendsAI-agent-b -b task-011-b

2. 任务依赖管理
   本地 board.json 中定义 dependencies
   Agent 只能领取依赖已完成的任务

3. 文件锁定（可选）
   board.json 中 "files.modify" 字段声明修改文件
   Agent 检查是否有其他任务正在修改相同文件
```

---

## 最佳实践

### ✅ DO

1. **本地规划详细，远程执行简单**
   - board.json 保留所有规划细节
   - vibe_kanban 只跟踪状态和分配

2. **定期同步**
   ```bash
   # 每天或每次规划后
   npm run sync:tasks  # 本地 → vibe_kanban
   npm run pull:status # vibe_kanban → 本地
   ```

3. **使用 Workspace Session**
   - 物理隔离代码修改
   - 自动任务锁定
   - 便于回滚和清理

4. **遵守依赖关系**
   - Agent 检查 `dependencies` 字段
   - 只领取依赖已完成的任务

5. **提交时关联任务 ID**
   ```bash
   git commit -m "feat: implement JWT utils (TASK-010)"
   ```

### ❌ DON'T

1. **不要在本地 board.json 中直接修改 `vibe_task_id`**
   - 只能通过同步脚本填充

2. **不要跳过同步直接在 vibe_kanban 创建任务**
   - 失去本地详细规划的好处

3. **不要手动编辑 vibe_kanban 任务描述**
   - 保持单向数据流：本地 → 远程

4. **不要让多个 Agent 处理有文件重叠的任务**
   - 检查 `files.modify` 字段
   - 优先完成前置任务

---

## 工具和脚本

### 同步脚本位置

```bash
.kanban/
├── board.json           # 主任务看板
├── WORKFLOW.md          # 本文档
└── scripts/
    ├── sync-to-vibe.ts  # 本地 → vibe_kanban
    ├── pull-status.ts   # vibe_kanban → 本地
    └── check-conflicts.ts  # 检查任务文件冲突
```

### 创建同步脚本（TODO）

```bash
# 之后需要创建的脚本
1. sync-to-vibe.ts      # 批量同步未同步任务
2. pull-status.ts       # 拉取远程状态更新
3. check-conflicts.ts   # 检查并发任务是否修改相同文件
```

---

## 快速参考

### vibe_kanban 项目信息

```
Project ID: 343327b4-f3bf-4465-b7dc-4641ac74527d
Project Name: friendsAI
Repo ID: 8c6e9216-d3c6-4933-bd96-543bc7ee703a
Repo Name: friendsAI
```

### 常用 MCP 命令

```typescript
// 查看任务列表
list_tasks(project_id: "343327b4-...", status?: "todo")

// 创建任务
create_task(
  project_id: "343327b4-...",
  title: "TASK-XXX: 任务标题",
  description: "本地任务 ID: TASK-XXX"
)

// 更新任务状态
update_task(task_id, { status: "inprogress" })

// 获取任务详情
get_task(task_id)

// 启动工作空间
start_workspace_session(
  task_id,
  executor: "CLAUDE_CODE",
  repos: [{ repo_id: "8c6e9216-...", base_branch: "main" }]
)
```

---

## 版本历史

- **2026-02-03**: 初始版本，定义双层架构工作流
