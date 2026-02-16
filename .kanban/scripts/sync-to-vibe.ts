#!/usr/bin/env bun
/**
 * sync-to-vibe.ts
 *
 * 将本地 board.json 中未同步的任务批量同步到 vibe_kanban
 *
 * 使用方法:
 *   bun run .kanban/scripts/sync-to-vibe.ts
 *   bun run .kanban/scripts/sync-to-vibe.ts --dry-run  # 只预览，不实际同步
 */

import { readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'

// ========== 常量配置 ==========
const PROJECT_ID = '343327b4-f3bf-4465-b7dc-4641ac74527d'
const BOARD_PATH = resolve(__dirname, '../board.json')
const VIBE_API_BASE = process.env.VIBE_KANBAN_API || 'http://127.0.0.1:9005/api'

// ========== 类型定义 ==========
interface LocalTask {
  id: string
  title: string
  description: string
  status: string
  vibe_task_id?: string | null
  vibe_status?: string | null
  vibe_synced_at?: string | null
  workspace_session_id?: string | null
  [key: string]: unknown
}

interface Board {
  project: string
  tasks: LocalTask[]
  [key: string]: unknown
}

interface VibeTaskResponse {
  success: boolean
  data?: {
    id: string
    title: string
    description: string
    status: string
    project_id: string
  }
  error?: string
}

// ========== 辅助函数 ==========
function loadBoard(): Board {
  try {
    const content = readFileSync(BOARD_PATH, 'utf-8')
    return JSON.parse(content)
  } catch (error) {
    console.error('❌ 读取 board.json 失败:', error)
    process.exit(1)
  }
}

function saveBoard(board: Board): void {
  try {
    const content = JSON.stringify(board, null, 2)
    writeFileSync(BOARD_PATH, content, 'utf-8')
    console.log('✅ board.json 已更新')
  } catch (error) {
    console.error('❌ 保存 board.json 失败:', error)
    process.exit(1)
  }
}

async function createVibeTask(task: LocalTask): Promise<VibeTaskResponse['data']> {
  const url = `${VIBE_API_BASE}/projects/${PROJECT_ID}/tasks`

  console.log(`📤 调用 API: POST ${url}`)

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: `${task.id}: ${task.title}`,
        description: `本地任务 ID: ${task.id}\n\n${task.description}`
      })
    })

    const result: VibeTaskResponse = await response.json()

    if (!result.success || !result.data) {
      throw new Error(result.error || 'API 返回失败')
    }

    return result.data
  } catch (error) {
    throw new Error(`API 调用失败: ${error}`)
  }
}

// ========== 主函数 ==========
async function main() {
  const isDryRun = process.argv.includes('--dry-run')

  console.log('🚀 开始同步任务到 vibe_kanban...\n')
  console.log(`🔗 API 地址: ${VIBE_API_BASE}`)
  console.log(`📁 项目 ID: ${PROJECT_ID}\n`)

  // 1. 加载本地看板
  const board = loadBoard()
  console.log(`📋 加载了 ${board.tasks.length} 个本地任务\n`)

  // 2. 过滤未同步的任务
  const unsyncedTasks = board.tasks.filter(task => !task.vibe_task_id && task.status !== 'done')

  if (unsyncedTasks.length === 0) {
    console.log('✨ 所有任务已同步，无需操作')
    return
  }

  console.log(`📊 发现 ${unsyncedTasks.length} 个未同步任务:\n`)
  unsyncedTasks.forEach((task, i) => {
    console.log(`   ${i + 1}. ${task.id} - ${task.title} [${task.status}]`)
  })
  console.log()

  if (isDryRun) {
    console.log('🔍 --dry-run 模式，跳过实际同步')
    return
  }

  // 3. 批量同步
  let successCount = 0
  let failCount = 0

  for (const task of unsyncedTasks) {
    try {
      console.log(`\n⏳ 同步中: ${task.id} - ${task.title}`)

      const vibeTask = await createVibeTask(task)

      if (!vibeTask) {
        throw new Error('API 返回的任务数据为空')
      }

      // 更新本地记录
      task.vibe_task_id = vibeTask.id
      task.vibe_status = vibeTask.status
      task.vibe_synced_at = new Date().toISOString()

      console.log(`   ✅ 已创建远程任务: ${vibeTask.id}`)
      successCount++

      // 添加延迟避免过快请求
      await new Promise(resolve => setTimeout(resolve, 100))

    } catch (error) {
      console.error(`   ❌ 同步失败: ${error}`)
      failCount++
    }
  }

  // 4. 保存更新后的 board.json
  if (successCount > 0) {
    saveBoard(board)
  }

  // 5. 输出总结
  console.log('\n' + '='.repeat(50))
  console.log(`📈 同步完成: ${successCount} 成功, ${failCount} 失败`)
  console.log('='.repeat(50))
}

// ========== 执行 ==========
main().catch(error => {
  console.error('💥 脚本执行失败:', error)
  process.exit(1)
})
