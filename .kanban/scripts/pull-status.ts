#!/usr/bin/env bun
/**
 * pull-status.ts
 *
 * 从 vibe_kanban 拉取最新任务状态，并更新本地 board.json
 *
 * 使用方法:
 *   bun run .kanban/scripts/pull-status.ts
 *   bun run .kanban/scripts/pull-status.ts --auto-update  # 自动更新本地 status
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
  status: string
  vibe_task_id?: string | null
  vibe_status?: string | null
  vibe_synced_at?: string | null
  [key: string]: unknown
}

interface Board {
  project: string
  tasks: LocalTask[]
  [key: string]: unknown
}

interface VibeTask {
  id: string
  title: string
  status: 'todo' | 'inprogress' | 'inreview' | 'done' | 'cancelled'
}

interface VibeTaskResponse {
  success: boolean
  data?: VibeTask
  error?: string
}

// 状态映射: vibe_kanban → 本地
const STATUS_MAP: Record<string, string> = {
  'todo': 'todo',
  'inprogress': 'in_progress',
  'inreview': 'review',
  'done': 'done',
  'cancelled': 'backlog'
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

async function getVibeTask(taskId: string): Promise<VibeTask | null> {
  const url = `${VIBE_API_BASE}/tasks/${taskId}`

  console.log(`📥 调用 API: GET ${url}`)

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    })

    const result: VibeTaskResponse = await response.json()

    if (!result.success || !result.data) {
      console.warn(`   ⚠️  任务不存在或 API 返回失败: ${result.error}`)
      return null
    }

    return result.data
  } catch (error) {
    console.error(`   ❌ API 调用失败: ${error}`)
    return null
  }
}

// ========== 主函数 ==========
async function main() {
  const autoUpdate = process.argv.includes('--auto-update')

  console.log('🔄 开始从 vibe_kanban 拉取状态...\n')
  console.log(`🔗 API 地址: ${VIBE_API_BASE}`)
  console.log(`📁 项目 ID: ${PROJECT_ID}\n`)

  // 1. 加载本地看板
  const board = loadBoard()
  console.log(`📋 加载了 ${board.tasks.length} 个本地任务\n`)

  // 2. 过滤已同步的任务
  const syncedTasks = board.tasks.filter(task => task.vibe_task_id)

  if (syncedTasks.length === 0) {
    console.log('⚠️  没有已同步的任务，请先运行 sync-to-vibe.ts')
    return
  }

  console.log(`🔗 发现 ${syncedTasks.length} 个已同步任务\n`)

  // 3. 拉取远程状态
  const updates: Array<{
    taskId: string
    localStatus: string
    vibeStatus: string
    changed: boolean
  }> = []

  for (const task of syncedTasks) {
    try {
      const vibeTask = await getVibeTask(task.vibe_task_id!)

      if (!vibeTask) {
        console.log(`⚠️  ${task.id}: 远程任务不存在 (${task.vibe_task_id})`)
        continue
      }

      const changed = task.vibe_status !== vibeTask.status

      updates.push({
        taskId: task.id,
        localStatus: task.vibe_status || 'unknown',
        vibeStatus: vibeTask.status,
        changed
      })

      if (changed) {
        console.log(`🔄 ${task.id}: ${task.vibe_status} → ${vibeTask.status}`)

        // 更新远程状态记录
        task.vibe_status = vibeTask.status
        task.vibe_synced_at = new Date().toISOString()

        // 如果开启自动更新，同步更新本地 status
        if (autoUpdate) {
          const newLocalStatus = STATUS_MAP[vibeTask.status] || task.status
          if (task.status !== newLocalStatus) {
            console.log(`   📝 本地状态同步: ${task.status} → ${newLocalStatus}`)
            task.status = newLocalStatus
          }
        }
      } else {
        console.log(`✅ ${task.id}: 状态一致 (${vibeTask.status})`)
      }

      // 添加延迟避免过快请求
      await new Promise(resolve => setTimeout(resolve, 50))

    } catch (error) {
      console.error(`❌ ${task.id}: 拉取失败 - ${error}`)
    }
  }

  // 4. 统计变化
  const changedCount = updates.filter(u => u.changed).length

  console.log('\n' + '='.repeat(60))
  console.log(`📊 状态对比完成: ${changedCount} 个任务有变化`)

  if (changedCount > 0 && !autoUpdate) {
    console.log('\n💡 提示: 使用 --auto-update 参数可自动更新本地 status 字段')
  }

  // 5. 保存更新
  if (changedCount > 0 || autoUpdate) {
    saveBoard(board)
  }

  console.log('='.repeat(60))
}

// ========== 执行 ==========
main().catch(error => {
  console.error('💥 脚本执行失败:', error)
  process.exit(1)
})
