#!/usr/bin/env bun
/**
 * check-conflicts.ts
 *
 * 检查当前进行中的任务是否存在文件修改冲突
 * 防止多个 agent 同时修改相同文件
 *
 * 使用方法:
 *   bun run .kanban/scripts/check-conflicts.ts
 *   bun run .kanban/scripts/check-conflicts.ts --assignee=opencode  # 只检查特定 agent 的任务
 */

import { readFileSync } from 'fs'
import { resolve } from 'path'

// ========== 常量配置 ==========
const BOARD_PATH = resolve(__dirname, '../board.json')

// ========== 类型定义 ==========
interface LocalTask {
  id: string
  title: string
  status: string
  assignee?: string
  vibe_status?: string | null
  files?: {
    create?: string[]
    modify?: string[]
    delete?: string[]
  }
  [key: string]: unknown
}

interface Board {
  project: string
  tasks: LocalTask[]
  [key: string]: unknown
}

interface FileConflict {
  file: string
  tasks: Array<{
    id: string
    title: string
    assignee: string
    status: string
    operation: 'create' | 'modify' | 'delete'
  }>
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

function isTaskInProgress(task: LocalTask): boolean {
  // 检查任务是否在进行中
  // 优先使用 vibe_status（更准确的实时状态）
  const status = task.vibe_status || task.status
  return status === 'in_progress' || status === 'inprogress'
}

function extractFiles(task: LocalTask): Array<{ file: string; operation: 'create' | 'modify' | 'delete' }> {
  const result: Array<{ file: string; operation: 'create' | 'modify' | 'delete' }> = []

  if (!task.files) return result

  if (task.files.create) {
    task.files.create.forEach(file => result.push({ file, operation: 'create' }))
  }
  if (task.files.modify) {
    task.files.modify.forEach(file => result.push({ file, operation: 'modify' }))
  }
  if (task.files.delete) {
    task.files.delete.forEach(file => result.push({ file, operation: 'delete' }))
  }

  return result
}

function findConflicts(tasks: LocalTask[]): FileConflict[] {
  // 构建文件 → 任务映射表
  const fileMap = new Map<string, Array<{
    task: LocalTask
    operation: 'create' | 'modify' | 'delete'
  }>>()

  for (const task of tasks) {
    const files = extractFiles(task)
    for (const { file, operation } of files) {
      if (!fileMap.has(file)) {
        fileMap.set(file, [])
      }
      fileMap.get(file)!.push({ task, operation })
    }
  }

  // 找出冲突（同一文件被多个任务操作）
  const conflicts: FileConflict[] = []

  for (const [file, items] of fileMap.entries()) {
    if (items.length > 1) {
      conflicts.push({
        file,
        tasks: items.map(item => ({
          id: item.task.id,
          title: item.task.title,
          assignee: item.task.assignee || 'unassigned',
          status: item.task.vibe_status || item.task.status,
          operation: item.operation
        }))
      })
    }
  }

  return conflicts
}

// ========== 主函数 ==========
function main() {
  const assigneeFilter = process.argv.find(arg => arg.startsWith('--assignee='))?.split('=')[1]

  console.log('🔍 检查任务文件冲突...\n')

  // 1. 加载本地看板
  const board = loadBoard()
  console.log(`📋 加载了 ${board.tasks.length} 个本地任务\n`)

  // 2. 过滤进行中的任务
  let inProgressTasks = board.tasks.filter(isTaskInProgress)

  if (assigneeFilter) {
    inProgressTasks = inProgressTasks.filter(task => task.assignee === assigneeFilter)
    console.log(`🎯 过滤 assignee=${assigneeFilter}\n`)
  }

  if (inProgressTasks.length === 0) {
    console.log('✨ 没有进行中的任务，无需检查冲突')
    return
  }

  console.log(`⏳ 发现 ${inProgressTasks.length} 个进行中的任务:\n`)
  inProgressTasks.forEach(task => {
    console.log(`   • ${task.id} - ${task.title} [${task.assignee}]`)
  })
  console.log()

  // 3. 检查文件冲突
  const conflicts = findConflicts(inProgressTasks)

  if (conflicts.length === 0) {
    console.log('✅ 没有发现文件冲突，可以安全并行开发')
    return
  }

  // 4. 输出冲突报告
  console.log('⚠️  发现文件冲突:\n')
  console.log('='.repeat(80))

  conflicts.forEach((conflict, index) => {
    console.log(`\n${index + 1}. 文件: ${conflict.file}`)
    console.log('   冲突任务:')
    conflict.tasks.forEach(task => {
      console.log(`     - ${task.id} (${task.assignee}) [${task.operation}] - ${task.title}`)
    })
  })

  console.log('\n' + '='.repeat(80))
  console.log(`\n❌ 发现 ${conflicts.length} 个文件冲突`)
  console.log('\n💡 建议:')
  console.log('   1. 调整任务优先级，按依赖顺序完成')
  console.log('   2. 使用 git worktree 物理隔离不同 agent 的工作空间')
  console.log('   3. 修改任务范围，避免修改相同文件')
  console.log('='.repeat(80))

  // 返回非 0 状态码表示有冲突
  process.exit(1)
}

// ========== 执行 ==========
try {
  main()
} catch (error) {
  console.error('💥 脚本执行失败:', error)
  process.exit(1)
}
