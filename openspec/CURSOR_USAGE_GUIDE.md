# OpenSpec 在 Cursor v2.2.3 中的使用指南

## 概述

你的项目中已经配置好了 OpenSpec 的 **Skills** 和 **Commands**。OpenSpec 是一个规范驱动的开发工作流工具，帮助你通过结构化的方式管理需求、设计和实现。

## 当前配置状态

✅ **OpenSpec CLI**: 已安装 (版本 1.1.1)  
✅ **Skills**: 已配置在 `.cursor/skills/` 目录  
✅ **Commands**: 已配置在 `.cursor/commands/` 目录  
✅ **项目配置**: `openspec/config.yaml` 已存在

## 使用方法

### 方式一：使用 Commands（推荐）

在 Cursor 的聊天界面中，直接输入命令：

#### 1. 开始新变更（New Change）
```
/opsx:new <change-name>
```
或
```
/opsx:new
```
（如果不提供名称，AI 会询问你想要做什么）

**示例**：
```
/opsx:new add-user-authentication
```

#### 2. 快速创建所有工件（Fast Forward）
```
/opsx:ff <change-name>
```
一次性创建 proposal、specs、design、tasks 所有工件。

#### 3. 继续现有变更
```
/opsx:continue <change-name>
```
继续完成未完成的工件（proposal、specs、design、tasks）。

#### 4. 实现任务（Apply）
```
/opsx:apply <change-name>
```
根据 tasks.md 中的任务清单进行实现。

#### 5. 验证实现
```
/opsx:verify <change-name>
```
验证实现是否与规范一致。

#### 6. 归档变更
```
/opsx:archive <change-name>
```
将完成的变更归档到 `openspec/changes/archive/` 目录。

#### 7. 探索模式
```
/opsx:explore
```
在开始实现前，先探索和理解问题。

#### 8. 同步规范
```
/opsx:sync <change-name>
```
将变更中的 delta specs 同步到主规范。

#### 9. 新手引导
```
/opsx:onboard
```
完整的 OpenSpec 工作流教程（约 15-20 分钟）。

### 方式二：使用 Skills

Skills 是 AI Agent 的能力扩展。当你在对话中提到相关需求时，AI 会自动识别并使用相应的 skill。

**可用的 Skills**：
- `openspec-new-change`: 创建新变更
- `openspec-continue-change`: 继续现有变更
- `openspec-apply-change`: 实现任务
- `openspec-verify-change`: 验证实现
- `openspec-archive-change`: 归档变更
- `openspec-explore`: 探索模式
- `openspec-ff-change`: 快速创建所有工件
- `openspec-sync-specs`: 同步规范
- `openspec-onboard`: 新手引导

**使用示例**：
```
我想创建一个新的功能来添加用户认证
```
AI 会自动识别并使用 `openspec-new-change` skill。

## 工作流程

### 标准工作流（Spec-Driven）

1. **探索** (`/opsx:explore`)
   - 理解问题和现有代码

2. **创建变更** (`/opsx:new <name>`)
   - 创建变更目录结构

3. **创建工件**（按顺序）：
   - **Proposal** (`proposal.md`): 为什么做这个变更
   - **Specs** (`specs/*/spec.md`): 详细需求（WHAT）
   - **Design** (`design.md`): 技术设计（HOW）
   - **Tasks** (`tasks.md`): 实现任务清单

4. **实现** (`/opsx:apply <name>`)
   - 根据 tasks.md 逐项实现

5. **验证** (`/opsx:verify <name>`)
   - 验证实现是否符合规范

6. **归档** (`/opsx:archive <name>`)
   - 将完成的变更归档

### 快速工作流

如果你想快速开始，可以使用：
```
/opsx:ff <change-name>
```
这会一次性创建所有工件，然后你可以：
```
/opsx:apply <change-name>
```

## 关于 MCP（Model Context Protocol）

**重要说明**：OpenSpec 目前主要通过 **Skills** 和 **Commands** 的方式集成到 Cursor，而不是通过 MCP Server。

### 如果你想配置 MCP（可选）

虽然 OpenSpec 不直接提供 MCP Server，但你可以：

1. **检查是否已有 MCP 配置**：
   - 项目级：`.cursor/mcp.json`
   - 全局：`~/.cursor/mcp.json`

2. **配置 MCP**（如果需要）：
   - 按 `Cmd+Shift+J` (macOS) 或 `Ctrl+Shift+J` (Windows/Linux) 打开 Cursor Settings
   - 找到 **Tools & Integrations** → **MCP Servers**
   - 添加新的 MCP Server 配置

**注意**：对于 OpenSpec，你不需要配置 MCP。现有的 Skills 和 Commands 已经足够使用。

## 项目结构

```
openspec/
├── config.yaml              # OpenSpec 项目配置
├── project.md               # 项目描述
├── specs/                   # 主规范目录
│   ├── <capability>/
│   │   └── spec.md
├── changes/                 # 活跃变更
│   ├── <change-name>/
│   │   ├── proposal.md
│   │   ├── design.md
│   │   ├── tasks.md
│   │   └── specs/
│   │       └── <capability>/
│   │           └── spec.md
│   └── archive/             # 已归档变更
│       └── YYYY-MM-DD-<name>/
.cursor/
├── commands/                # Cursor 命令定义
│   ├── opsx-new.md
│   ├── opsx-apply.md
│   └── ...
└── skills/                  # Cursor Skills
    ├── openspec-new-change/
    ├── openspec-apply-change/
    └── ...
```

## 常用命令速查

| 命令 | 用途 |
|------|------|
| `/opsx:onboard` | 新手引导教程 |
| `/opsx:new <name>` | 创建新变更 |
| `/opsx:ff <name>` | 快速创建所有工件 |
| `/opsx:continue <name>` | 继续现有变更 |
| `/opsx:apply <name>` | 实现任务 |
| `/opsx:verify <name>` | 验证实现 |
| `/opsx:archive <name>` | 归档变更 |
| `/opsx:explore` | 探索模式 |
| `/opsx:sync <name>` | 同步规范 |

## 开始使用

### 第一次使用

1. **运行新手引导**：
   ```
   /opsx:onboard
   ```
   这会带你完成一个完整的工作流示例。

2. **或者直接开始**：
   ```
   /opsx:new my-first-change
   ```

### 查看现有变更

```bash
openspec list
```

### 查看变更状态

```bash
openspec status --change <name>
```

## 注意事项

1. **Cursor v2.2.3** 支持 Skills 和 Commands，这些功能已经配置好，可以直接使用。

2. **MCP** 不是必需的。OpenSpec 通过 Skills 和 Commands 集成，不需要额外的 MCP Server 配置。

3. **Skills 自动识别**：当你描述需求时，AI 会自动识别并使用相应的 skill，无需手动指定。

4. **命令优先级**：Commands（如 `/opsx:new`）比自然语言描述更明确，推荐使用命令。

## 获取帮助

- OpenSpec CLI 帮助：`openspec --help`
- 查看变更列表：`openspec list`
- 查看变更状态：`openspec status --change <name>`

## 下一步

1. 运行 `/opsx:onboard` 完成新手引导
2. 或直接使用 `/opsx:new` 创建你的第一个变更
3. 使用 `/opsx:ff` 快速创建所有工件
4. 使用 `/opsx:apply` 开始实现

祝你使用愉快！🎉








