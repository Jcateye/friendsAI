import { useState } from 'react'
import { AlertTriangle, Sparkles, Clock } from 'lucide-react'
import type { ActionCard as ActionCardType, ActionQueues } from '../../lib/api/agent-types'
import { ActionCard } from '../ActionCard'

interface ActionQueueProps {
  queues: ActionQueues
  onFeedback?: (actionId: string, status: string, reasonCode?: string, editedMessage?: string) => void
}

const queueConfig = {
  urgentRepairs: {
    label: '紧急修复',
    icon: <AlertTriangle className="w-4 h-4" />,
    color: 'text-red-500',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-100',
    description: '需要立即处理的关键关系',
  },
  opportunityBridges: {
    label: '机会桥接',
    icon: <Sparkles className="w-4 h-4" />,
    color: 'text-primary',
    bgColor: 'bg-primary-tint',
    borderColor: 'border-primary-tint',
    description: '深化合作关系的良机',
  },
  lightTouches: {
    label: '轻触达',
    icon: <Clock className="w-4 h-4" />,
    color: 'text-info',
    bgColor: 'bg-info-tint',
    borderColor: 'border-info-tint',
    description: '保持联系的低成本互动',
  },
}

export function ActionQueue({ queues, onFeedback }: ActionQueueProps) {
  const [activeTab, setActiveTab] = useState<keyof ActionQueues>('urgentRepairs')

  const handleAccept = (actionId: string, editedMessage?: string) => {
    onFeedback?.(actionId, editedMessage ? 'edited' : 'accepted', undefined, editedMessage)
  }

  const handleDismiss = (actionId: string, reasonCode: string) => {
    onFeedback?.(actionId, 'dismissed', reasonCode)
  }

  const queueEntries = Object.entries(queues) as Array<[keyof ActionQueues, ActionCardType[]]>
  const totalActions = queueEntries.reduce((sum, [, actions]) => sum + actions.length, 0)

  return (
    <div className="flex flex-col gap-4">
      {/* Tab Navigation */}
      <div className="flex border-b border-border">
        {queueEntries.map(([key, actions]) => {
          const config = queueConfig[key]
          const isActive = activeTab === key
          const count = actions.length

          return (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex-1 flex flex-col items-center gap-1 px-4 py-3 transition-colors ${
                isActive ? 'bg-bg-card' : 'hover:bg-bg-surface'
              }`}
            >
              <div className="flex items-center gap-1">
                <span className={isActive ? config.color : 'text-text-muted'}>
                  {config.icon}
                </span>
                <span className={`text-[13px] font-medium font-primary ${
                  isActive ? 'text-text-primary' : 'text-text-secondary'
                }`}>
                  {config.label}
                </span>
                {count > 0 && (
                  <span className={`px-1.5 py-0.5 text-[11px] font-medium rounded font-primary ${
                    isActive ? config.bgColor + ' ' + config.color : 'bg-bg-surface text-text-muted'
                  }`}>
                    {count}
                  </span>
                )}
              </div>
              <span className={`text-[11px] font-primary ${
                isActive ? 'text-text-muted' : 'text-text-muted opacity-70'
              }`}>
                {config.description}
              </span>
            </button>
          )
        })}
      </div>

      {/* Queue Content */}
      <div className="flex flex-col gap-3">
        {queues[activeTab].length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <span className={`text-4xl mb-3 ${queueConfig[activeTab].color} opacity-50`}>
              {queueConfig[activeTab].icon}
            </span>
            <p className="text-[14px] text-text-secondary font-primary">
              暂无{queueConfig[activeTab].label}行动
            </p>
            <p className="text-[13px] text-text-muted font-primary mt-1">
              {totalActions === 0
                ? '等待 AI 分析您的联系人网络...'
                : '其他队列中有待处理行动'}
            </p>
          </div>
        ) : (
          queues[activeTab].map((card) => (
            <ActionCard
              key={card.actionId}
              card={card}
              onAccept={handleAccept}
              onDismiss={handleDismiss}
            />
          ))
        )}
      </div>

      {/* Queue Summary */}
      {totalActions > 0 && (
        <div className="flex items-center justify-between px-4 py-3 bg-bg-surface rounded-md">
          <span className="text-[13px] text-text-secondary font-primary">
            共 {totalActions} 个待处理行动
          </span>
          <span className="text-[13px] text-text-muted font-primary">
            预计耗时{' '}
            {queueEntries.reduce((sum, [, actions]) =>
              sum + actions.reduce((s, a) => s + a.effortMinutes, 0), 0
            )}{' '}
            分钟
          </span>
        </div>
      )}
    </div>
  )
}
