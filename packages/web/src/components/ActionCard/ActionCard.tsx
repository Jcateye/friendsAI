import { useState } from 'react'
import { Check, Edit2, X, Clock, AlertTriangle, Sparkles, ChevronDown, ChevronUp } from 'lucide-react'
import type { ActionCard as ActionCardType } from '../../lib/api/agent-types'

interface ActionCardProps {
  card: ActionCardType
  onAccept?: (actionId: string, editedMessage?: string) => void
  onDismiss?: (actionId: string, reasonCode: string) => void
}

const goalLabels = {
  maintain: '保持联系',
  grow: '深化关系',
  repair: '关系修复',
}

const goalIcons = {
  maintain: <Clock className="w-4 h-4" />,
  grow: <Sparkles className="w-4 h-4" />,
  repair: <AlertTriangle className="w-4 h-4" />,
}

const riskLevelColors = {
  low: 'text-info',
  medium: 'text-warning',
  high: 'text-red-500',
}

const riskLevelBgColors = {
  low: 'bg-info-tint',
  medium: 'bg-warning-tint',
  high: 'bg-red-50',
}

export function ActionCard({ card, onAccept, onDismiss }: ActionCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedMessage, setEditedMessage] = useState(card.draftMessage)
  const [isExpanded, setIsExpanded] = useState(false)
  const [isDismissMenuOpen, setIsDismissMenuOpen] = useState(false)

  const handleAccept = () => {
    if (isEditing && editedMessage !== card.draftMessage) {
      onAccept?.(card.actionId, editedMessage)
    } else {
      onAccept?.(card.actionId)
    }
    setIsEditing(false)
  }

  const handleDismiss = (reasonCode: string) => {
    onDismiss?.(card.actionId, reasonCode)
    setIsDismissMenuOpen(false)
  }

  const handleEdit = () => {
    setIsEditing(true)
    setIsExpanded(true)
  }

  const handleCancelEdit = () => {
    setEditedMessage(card.draftMessage)
    setIsEditing(false)
  }

  return (
    <div className="bg-bg-card rounded-lg overflow-hidden shadow-sm">
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-bg-surface transition-colors"
        onClick={() => !isEditing && setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <span className={`text-primary`}>
            {goalIcons[card.goal]}
          </span>
          <span className="text-[13px] font-medium text-text-secondary font-primary uppercase">
            {goalLabels[card.goal]}
          </span>
          <span
            className={`px-2 py-0.5 text-[11px] font-medium rounded font-primary ${riskLevelBgColors[card.riskLevel]} ${riskLevelColors[card.riskLevel]}`}
          >
            {card.riskLevel === 'low' ? '低风险' : card.riskLevel === 'medium' ? '中风险' : '高风险'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[12px] text-text-muted font-primary">
            {card.effortMinutes} 分钟
          </span>
          <span className="text-[12px] text-text-muted font-primary">
            置信度 {Math.round(card.confidence * 100)}%
          </span>
          {!isEditing && (
            isExpanded ? <ChevronUp className="w-4 h-4 text-text-muted" /> : <ChevronDown className="w-4 h-4 text-text-muted" />
          )}
        </div>
      </div>

      {/* Expanded Content */}
      {(isExpanded || isEditing) && (
        <div className="px-4 py-3 border-t border-border">
          {/* Why Now */}
          <div className="mb-3">
            <span className="text-[12px] font-medium text-text-muted font-primary">为什么现在</span>
            <p className="text-[14px] text-text-primary font-primary mt-1">
              {card.whyNow}
            </p>
          </div>

          {/* Draft Message */}
          <div className="mb-3">
            <span className="text-[12px] font-medium text-text-muted font-primary">草稿消息</span>
            {isEditing ? (
              <textarea
                value={editedMessage}
                onChange={(e) => setEditedMessage(e.target.value)}
                className="w-full mt-1 px-3 py-2 bg-bg-surface border border-border rounded-md text-[14px] text-text-primary font-primary resize-none focus:outline-none focus:ring-2 focus:ring-primary-tint focus:border-primary"
                rows={4}
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <div className="mt-1 p-3 bg-primary-tint rounded-md">
                <p className="text-[14px] text-text-primary font-primary whitespace-pre-wrap">
                  {card.draftMessage}
                </p>
              </div>
            )}
          </div>

          {/* Evidence (if available) */}
          {card.evidence && card.evidence.length > 0 && !isEditing && (
            <div className="mb-3">
              <span className="text-[12px] font-medium text-text-muted font-primary">依据</span>
              <ul className="mt-1 space-y-1">
                {card.evidence.map((evidence, index) => (
                  <li key={index} className="text-[13px] text-text-secondary font-primary flex items-start gap-1">
                    <span className="text-primary">•</span>
                    <span>{evidence.reference}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between mt-4">
            {isEditing ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleCancelEdit()
                  }}
                  className="px-3 py-1.5 bg-bg-surface text-text-primary rounded-md text-[13px] font-medium font-primary hover:bg-bg-card transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleAccept()
                  }}
                  className="px-3 py-1.5 bg-primary text-white rounded-md text-[13px] font-medium font-primary hover:opacity-90 transition-opacity flex items-center gap-1"
                >
                  <Check className="w-3 h-3" />
                  接受修改
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleAccept()
                  }}
                  className="px-3 py-1.5 bg-primary text-white rounded-md text-[13px] font-medium font-primary hover:opacity-90 transition-opacity flex items-center gap-1"
                >
                  <Check className="w-3 h-3" />
                  接受
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleEdit()
                  }}
                  className="px-3 py-1.5 bg-bg-surface text-text-primary border border-border rounded-md text-[13px] font-medium font-primary hover:bg-bg-card transition-colors flex items-center gap-1"
                >
                  <Edit2 className="w-3 h-3" />
                  编辑
                </button>
                <div className="relative">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setIsDismissMenuOpen(!isDismissMenuOpen)
                    }}
                    className="px-3 py-1.5 bg-bg-surface text-text-secondary rounded-md text-[13px] font-medium font-primary hover:bg-bg-card transition-colors flex items-center gap-1"
                  >
                    <X className="w-3 h-3" />
                    忽略
                  </button>
                  {isDismissMenuOpen && (
                    <div className="absolute top-full left-0 mt-1 w-40 bg-bg-card border border-border rounded-md shadow-lg z-10">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDismiss('not_relevant')
                        }}
                        className="w-full px-3 py-2 text-left text-[13px] text-text-primary font-primary hover:bg-bg-surface transition-colors"
                      >
                        不相关
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDismiss('too_generic')
                        }}
                        className="w-full px-3 py-2 text-left text-[13px] text-text-primary font-primary hover:bg-bg-surface transition-colors"
                      >
                        太泛泛
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDismiss('tone_off')
                        }}
                        className="w-full px-3 py-2 text-left text-[13px] text-text-primary font-primary hover:bg-bg-surface transition-colors"
                      >
                        语气不对
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDismiss('timing_bad')
                        }}
                        className="w-full px-3 py-2 text-left text-[13px] text-text-primary font-primary hover:bg-bg-surface transition-colors"
                      >
                        时机不好
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDismiss('other')
                        }}
                        className="w-full px-3 py-2 text-left text-[13px] text-text-primary font-primary hover:bg-bg-surface transition-colors"
                      >
                        其他
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {card.requiresConfirmation && !isEditing && (
              <span className="text-[11px] text-warning font-primary flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                需要确认后执行
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
