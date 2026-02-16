# Agent × 前端联调剩余工作清单（OpenSpec 拆分）

## 背景
本清单按 OpenSpec 风格将联调工作拆为可交付分片，并标注优先级、预计天数、当前状态。

## 已完成（本次提交）

### Track A：协议闭环（P0）
- [x] A1. `awaiting_input` 在 Vercel AI stream 中透传为 `2:` 自定义事件
  - 后端输出 `tool.awaiting_input`，携带 `toolCallId / toolName / confirmationId / input / message`
  - 预计：0.5 天（已完成）
- [x] A2. 前端 `useAgentChat` 解析 `tool.awaiting_input`，并注入 `pendingConfirmations`
  - 预计：0.5 天（已完成）
- [x] A3. 适配器单测更新
  - `awaiting_input` 从“忽略”改为“输出确认事件”
  - 预计：0.5 天（已完成）

### Track B：构建可交付（P0）
- [x] B1. 修复 web build 阻断项（unused imports/vars）
  - ActionsPage 清理未使用变量
  - ConversationDetailPage 清理未使用 `archiveData`
  - 预计：0.5 天（已完成）
- [x] B2. 修复 A2UI 组件中的 `require` 类型问题
  - 使用 ESM import 替代 CommonJS require
  - 预计：0.5 天（已完成）

## 剩余工作（建议按周推进）

### Track C：动作语义闭环（P1，2 天）
- [ ] C1. `CustomMessageRenderer` 的 A2UI action handler 落地
  - 目前 `confirm_tool` 分支为空，仅日志输出
  - 预计：1 天
- [ ] C2. A2UI action 到 API 调用适配层
  - 将 `custom/navigate/submit` 映射为统一 dispatcher
  - 预计：1 天

### Track D：产品交互收口（P1，2 天）
- [ ] D1. 聊天输入中的附件/工具选项
  - 当前页面发送逻辑忽略 `_files/_tools`
  - 短期：禁用并标注；中期：补协议
  - 预计：1 天
- [ ] D2. SkillPanel 占位能力收敛
  - 对非落地能力增加“即将上线”标识或隐藏
  - 预计：1 天

### Track E：端到端回归（P1，1 天）
- [ ] E1. 回归脚本
  - 新会话创建、流式回复、awaiting_input、confirm/reject 全流程
  - 预计：1 天

## 里程碑
- M1（已达成）：协议闭环 + build 通过
- M2（目标 +2 天）：动作语义闭环（C）
- M3（目标 +4 天）：产品交互收口（D）
- M4（目标 +5 天）：端到端回归（E）
