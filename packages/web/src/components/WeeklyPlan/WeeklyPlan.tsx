import { Calendar, Clock, TrendingUp } from 'lucide-react'
import type { WeeklyPlanDay as WeeklyPlanDayType } from '../../lib/api/agent-types'

interface WeeklyPlanProps {
  plan: WeeklyPlanDayType[]
}

const dayOrder: Array<WeeklyPlanDayType['day']> = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const dayLabels: Record<WeeklyPlanDayType['day'], string> = {
  Mon: '周一',
  Tue: '周二',
  Wed: '周三',
  Thu: '周四',
  Fri: '周五',
  Sat: '周六',
  Sun: '周日',
}

export function WeeklyPlan({ plan }: WeeklyPlanProps) {
  const sortedPlan = [...plan].sort((a, b) => dayOrder.indexOf(a.day) - dayOrder.indexOf(b.day))
  const totalMinutes = sortedPlan.reduce((sum, day) => sum + day.maxMinutes, 0)
  const totalActions = sortedPlan.reduce((sum, day) => sum + day.actions.length, 0)

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary" />
          <h3 className="text-[16px] font-semibold text-text-primary font-display">
            本周计划
          </h3>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <TrendingUp className="w-4 h-4 text-info" />
            <span className="text-[13px] text-text-secondary font-primary">
              {totalActions} 个行动
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4 text-warning" />
            <span className="text-[13px] text-text-secondary font-primary">
              {totalMinutes} 分钟
            </span>
          </div>
        </div>
      </div>

      {/* Week View */}
      <div className="flex flex-col gap-2">
        {sortedPlan.map((dayPlan) => {
          const dayTotalMinutes = dayPlan.actions.reduce((sum, action) => sum + action.effortMinutes, 0)
          const utilizationPercent = dayPlan.maxMinutes > 0
            ? Math.min(100, (dayTotalMinutes / dayPlan.maxMinutes) * 100)
            : 0

          return (
            <div
              key={dayPlan.day}
              className="flex items-center gap-3 px-4 py-3 bg-bg-card rounded-md hover:bg-bg-surface transition-colors"
            >
              {/* Day Label */}
              <div className="w-12 flex-shrink-0">
                <span className="text-[13px] font-medium text-text-primary font-primary">
                  {dayLabels[dayPlan.day]}
                </span>
              </div>

              {/* Action Preview */}
              <div className="flex-1 min-w-0">
                {dayPlan.actions.length === 0 ? (
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-bg-surface rounded-full overflow-hidden">
                      <div
                        className="h-full bg-transparent rounded-full"
                        style={{ width: '0%' }}
                      />
                    </div>
                    <span className="text-[12px] text-text-muted font-primary whitespace-nowrap">
                      无安排
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col gap-1">
                    {dayPlan.actions.slice(0, 2).map((action) => (
                      <div
                        key={action.actionId}
                        className="text-[13px] text-text-secondary font-primary truncate"
                      >
                        {action.contactName && (
                          <span className="font-medium text-text-primary">{action.contactName}</span>
                        )}{' '}
                        {action.whyNow.substring(0, 40)}
                        {action.whyNow.length > 40 ? '...' : ''}
                      </div>
                    ))}
                    {dayPlan.actions.length > 2 && (
                      <span className="text-[12px] text-primary font-primary">
                        +{dayPlan.actions.length - 2} 更多
                      </span>
                    )}

                    {/* Progress Bar */}
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 h-1.5 bg-bg-surface rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            utilizationPercent >= 90
                              ? 'bg-red-400'
                              : utilizationPercent >= 70
                                ? 'bg-warning'
                                : 'bg-primary'
                          }`}
                          style={{ width: `${utilizationPercent}%` }}
                        />
                      </div>
                      <span className="text-[11px] text-text-muted font-primary whitespace-nowrap">
                        {dayTotalMinutes}/{dayPlan.maxMinutes}分钟
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Goal Badge */}
              {dayPlan.actions.length > 0 && dayPlan.actions[0].goal && (
                <div className="flex-shrink-0">
                  <span
                    className={`px-2 py-0.5 text-[11px] font-medium rounded font-primary ${
                      dayPlan.actions[0].goal === 'repair'
                        ? 'bg-red-50 text-red-500'
                        : dayPlan.actions[0].goal === 'grow'
                          ? 'bg-primary-tint text-primary'
                          : 'bg-info-tint text-info'
                    }`}
                  >
                    {dayPlan.actions[0].goal === 'repair'
                      ? '修复'
                      : dayPlan.actions[0].goal === 'grow'
                        ? '深化'
                        : '保持'}
                  </span>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Empty State */}
      {totalActions === 0 && (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
          <Calendar className="w-12 h-12 text-text-muted mb-3" />
          <p className="text-[14px] text-text-secondary font-primary">
            本周暂无计划行动
          </p>
          <p className="text-[13px] text-text-muted font-primary mt-1">
            等待 AI 为您制定本周关系维护计划...
          </p>
        </div>
      )}
    </div>
  )
}
