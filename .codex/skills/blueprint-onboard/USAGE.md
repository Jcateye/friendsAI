# blueprint-onboard 使用说明（新人版）

这份说明用于团队共享：看完就能用，不需要先理解脚本细节。

## 1. 这个技能是干什么的

`blueprint-onboard` 用来把设计文档转成可维护的蓝图资产，并持续更新：

- `Roadmap/Blueprint Tree.md`（目录树主视图）
- `Roadmap/Dependencies.md`（依赖风险）
- `Roadmap/Milestones.md`（里程碑）
- `Architecture/Architecture A - Layers.md`（分层）
- `Architecture/Architecture B - Containers.md`（容器）
- `Stories/US-*.md`（叶子 Story）
- `README.md`（文字版设计说明）

一句话：它维护“结构真相源”，不负责执行看板。

## 2. 什么时候用

- 新项目设计完成，第一次生成蓝图。
- 设计发生变更，需要追加到现有蓝图。
- 某个 Story 状态变化（例如 done/blocked），要同步进度图。

## 2.5 新项目第一步：建立 blueprint 软链接

在新项目根目录执行（先 `--dry-run` 预览）：

```bash
# 预览动作（不会修改）
bash skills/blueprint-onboard/scripts/setup_blueprint_symlink.sh --dry-run

# 真正执行：默认写到 project-view/<当前项目名>/blueprint
bash skills/blueprint-onboard/scripts/setup_blueprint_symlink.sh
```

可选模式：

```bash
# 指定 Obsidian Vault
bash skills/blueprint-onboard/scripts/setup_blueprint_symlink.sh --vault "/abs/path/to/vault"

# 直接指定 blueprint 真实目录
bash skills/blueprint-onboard/scripts/setup_blueprint_symlink.sh --target "/abs/path/to/blueprint"
```

## 3. 两种使用方式

### 方式 A：让 coding agent 代你执行（推荐）

你直接说自然语言即可，不用手跑脚本。

示例：

- `根据这份设计文档生成蓝图（路径：...）`
- `把 US-202 更新为 doing，进度 60%，并刷新蓝图`
- `把“标题概要异步任务”对应 Story 标记 done`

建议总是提供 `US-xxx`，可避免歧义。

### 方式 B：命令式（你自己执行）

```bash
# 标记 Story 完成
python3 skills/blueprint-onboard/scripts/blueprint_cli.py story-done --id US-202

# 更新 Story 进度
python3 skills/blueprint-onboard/scripts/blueprint_cli.py story-update --id US-202 --status doing --progress 60

# 校验蓝图结构
python3 skills/blueprint-onboard/scripts/blueprint_cli.py validate
```

默认操作目录是当前项目的 `./blueprint`（可用 `--blueprint-dir` 覆盖）。

## 4. 输入建议（让结果更准）

至少给一个锚点：

- `US-xxx`（最推荐）
- `C-xxx`
- 明确关键词（例如 `title_summary`, `legacy adapter`）

如果只给模糊描述，agent 会先追问再改，避免改错。

## 5. 日常协作建议

- 每次需求变更：先更新 Story，再更新依赖/里程碑。
- 每周至少一次：跑 `validate` 确认图类型和 Story 字段完整。
- Story 完成时：同步 `status/progress`，保持 Tree 进度可读。

## 6. 常见问题

- 问：为什么图没变化？
  - 答：先确认改的是正确 `US-xxx`；再跑一次 `validate` 看是否有错误。

- 问：会不会覆盖手工备注？
  - 答：不会。文件使用 `AUTO/MANUAL` 分区，脚本只重写 `AUTO`。

- 问：能不能只改一个 Story，不重做全部图？
  - 答：可以。`story-update` 只改指定 Story，但会顺带重渲染图，保证汇总进度一致。
