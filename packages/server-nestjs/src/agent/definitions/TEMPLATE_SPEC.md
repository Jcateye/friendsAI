# FriendsAI Agent Prompt 模板规范

## 概述

本文档定义了 FriendsAI Agent 系统中 Prompt 模板的设计规范，确保所有 Agent 的输出风格一致、质量可控。

---

## 目录结构

每个 Agent 定义遵循以下目录结构：

```
definitions/
└── {agent_id}/
    ├── agent.json              # Agent 定义配置
    ├── defaults.json           # 默认输入值
    ├── templates/
    │   ├── system.mustache     # System Prompt（角色定义）
    │   └── user.mustache       # User Prompt（数据注入）
    └── schemas/
        └── output.schema.json  # 输出 JSON Schema
```

---

## 模板结构规范

### system.mustache - System Prompt

定义 AI 的角色、任务、输出格式和质量标准。

#### 必需章节

```mustache
You are an expert {domain} specializing in {specialization}.

Your task is to {primary_task}.

## Output Format

You MUST respond with a valid JSON object:
```json
{example_json_structure}
```

## Output Language

**Default: Chinese (中文)**

- Always output in Chinese unless {exception_condition}
- {language_handling_rules}

## Guidelines

- {guideline_1}
- {guideline_2}

## Quality Standards

- {quality_standard_1}
- {quality_standard_2}
```

#### 可选章节

- `## Analysis Depth: {{variable}}` - 用于支持可配置的分析深度
- `## Operation Mode: {{operation}}` - 用于支持多种操作模式

### user.mustache - User Prompt

注入数据和触发任务。

#### 推荐结构

```mustache
## {Context_Section_Name}

**Key:** {{value}}
**Count:** {{array.length}}

{{#array}}
### [{{index}}] {{itemField}}
{{content}}

{{/array}}
{{^array}}
No {items} available.

{{/array}}

## Task

{specific_task_description}

Output in **Chinese** unless {exception_condition}.
```

---

## Mustache 语法规范

### 基础变量

```mustache
{{variableName}}
```

### 条件渲染

```mustache
{{#fieldName}}
存在时显示
{{/fieldName}}

{{^fieldName}}
不存在时显示
{{/fieldName}}
```

### 列表遍历

```mustache
{{#items}}
- {{name}}: {{value}}
{{/items}}
```

### 带索引的列表

```mustache
{{#messages}}
### [{{index}}] {{role}}
{{content}}
{{/messages}}
```

---

## 输出语言规范

所有 Agent **默认输出中文**，除非：

1. 输入内容明确为纯英文
2. 涉及专业术语需保留原文

### System Prompt 模板

```mustache
## Output Language

**Default: Chinese (中文)**

- Always output in Chinese unless the input is clearly English-only
- For mixed languages, use Chinese as the primary language
- Preserve proper names, company names, and technical terms in original language
```

### User Prompt 提示

```mustache
Output in **Chinese** unless the data is clearly English-only.
```

---

## 各 Agent 模板清单

### title_summary

| 文件 | 路径 | 用途 |
|------|------|------|
| system | `templates/system.mustache` | 定义标题和摘要生成规则 |
| user | `templates/user.mustache` | 注入对话消息 |
| schema | `schemas/output.schema.json` | 定义 title/summary 结构 |

**输入变量：**
- `conversationId` - 对话 ID
- `messages[]` - 消息列表
- `language` - 语言（可选，默认 zh）

### archive_brief

| 文件 | 路径 | 用途 |
|------|------|------|
| system | `templates/system.mustache` | 定义归档提取和简报生成规则 |
| user | `templates/user.mustache` | 根据操作类型注入数据 |
| schema | `schemas/output.schema.json` | 定义 twoOf 输出结构 |

**输入变量：**
- `operation` - 操作类型（archive_extract / brief_generate）
- 根据 operation 变化的数据字段

### contact_insight

| 文件 | 路径 | 用途 |
|------|------|------|
| system | `system.mustache` | 定义联系人洞察分析规则 |
| user | `user.mustache` | 注入联系人信息和交互历史 |
| schema | `output.schema.json` | 定义洞察输出结构 |

**输入变量：**
- `contactId` - 联系人 ID
- `depth` - 分析深度（brief / standard / deep）
- `contact` - 联系人基本信息
- `recentInteractions[]` - 最近交互
- `archivedData` - 归档数据（events, facts, todos）

### network_action

| 文件 | 路径 | 用途 |
|------|------|------|
| system | `system.mustache` | 定义全体联系人归纳规则 |
| user | `user.mustache` | 注入所有联系人数据 |
| schema | `output.schema.json` | 定义行动建议结构 |

---

## 质量检查清单

创建新 Agent 模板时，确保：

- [ ] System Prompt 包含角色定义
- [ ] System Prompt 包含输出格式 JSON 示例
- [ ] System Prompt 包含输出语言规范（默认中文）
- [ ] User Prompt 使用条件渲染处理空值
- [ ] User Prompt 明确任务触发语句
- [ ] Output Schema 与 JSON 示例一致
- [ ] 模板风格与现有 Agent 保持一致

---

## 变考示例

### 完整的 system.mustache 示例

```mustache
You are an expert {domain} specializing in {specialization}.

Your task is to {primary_task_description}.

## Output Format

You MUST respond with a valid JSON object:
```json
{
  "field1": "type description",
  "field2": ["array", "items"]
}
```

## Output Language

**Default: Chinese (中文)**

- Always output in Chinese unless the input is clearly English-only
- Preserve proper names and technical terms in original language

## Guidelines

- Guideline 1
- Guideline 2

## Quality Standards

- Quality standard 1
- Quality standard 2
```

### 完整的 user.mustache 示例

```mustache
## {Context Name}

**Field:** {{value}}
**Count:** {{items.length}}

{{#items}}
### [{{index}}] {{name}}
{{description}}

{{/items}}
{{^items}}
No items available.

{{/items}}

## Task

{Specific task description}

Output in **Chinese** unless the data is clearly English-only.
```
