import { useState, useEffect } from 'react'
import { AlertCircle, RefreshCw, BarChart3 } from 'lucide-react'
import { Header } from '../../components/layout/Header'
import { ActionQueue } from '../../components/ActionQueue'
import { WeeklyPlan } from '../../components/WeeklyPlan'
import { ActionQueueSkeleton, WeeklyPlanSkeleton } from '../../components/loading'
import { api } from '../../lib/api/client'
import type { NetworkActionData } from '../../lib/api/agent-types'

export function ActionsPage() {
  const [networkData, setNetworkData] = useState<NetworkActionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false)

  const loadNetworkAction = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }
    setError(null)

    try {
      const result = await api.agent.runNetworkAction({ limit: 10 })
      setNetworkData(result.data)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : '加载失败'
      setError(errorMsg)
      console.error('Failed to load network action:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadNetworkAction()
  }, [])

  const handleRefresh = () => {
    loadNetworkAction(true)
  }

  const handleFeedback = async (actionId: string, status: string, reasonCode?: string, editedMessage?: string) => {
    if (feedbackSubmitting) return

    setFeedbackSubmitting(true)
    try {
      await api.agent.submitFeedback({
        runId: networkData?.metadata?.sourceHash || '',
        agentId: 'network_action',
        actionId,
        status: status as any,
        reasonCode: reasonCode as any,
        editedMessage,
      })

      // Remove the action card from local state after successful feedback
      if (networkData?.queues) {
        setNetworkData({
          ...networkData,
          queues: {
            urgentRepairs: networkData.queues.urgentRepairs.filter((c) => c.actionId !== actionId),
            opportunityBridges: networkData.queues.opportunityBridges.filter((c) => c.actionId !== actionId),
            lightTouches: networkData.queues.lightTouches.filter((c) => c.actionId !== actionId),
          },
          weeklyPlan: networkData.weeklyPlan?.map((day) => ({
            ...day,
            actions: day.actions.filter((c) => c.actionId !== actionId),
          })),
        })
      }
    } catch (err) {
      console.error('Failed to submit feedback:', err)
    } finally {
      setFeedbackSubmitting(false)
    }
  }

  // Check if new action card format is available
  const hasNewActionFormat = networkData?.queues && networkData.weeklyPlan

  return (
    <div className="flex flex-col h-full">
      <Header
        title="行动"
        showMenu
        rightElement={
          <button
            onClick={handleRefresh}
            disabled={loading || refreshing}
            className="p-2 rounded-md hover:bg-bg-surface transition-colors disabled:opacity-50"
            aria-label="刷新"
          >
            <RefreshCw className={`w-5 h-5 text-text-secondary ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        }
      />

      {/* Scroll Content */}
      <div className="flex-1 flex flex-col gap-4 p-4 overflow-y-auto">
        {loading ? (
          <div className="flex flex-col gap-4">
            <WeeklyPlanSkeleton />
            <ActionQueueSkeleton />
          </div>
        ) : error ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3">
            <AlertCircle className="w-8 h-8 text-warning" />
            <span className="text-[14px] text-text-secondary font-primary">{error}</span>
            <button
              onClick={handleRefresh}
              className="px-4 py-2 bg-primary text-white rounded-md text-[13px] font-primary"
            >
              重试
            </button>
          </div>
        ) : networkData ? (
          <>
            {/* New Action Card Format */}
            {hasNewActionFormat ? (
              <>
                {/* Network Synthesis */}
                {networkData.synthesis && (
                  <div className="bg-bg-card rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <BarChart3 className="w-4 h-4 text-primary" />
                      <span className="text-[14px] font-semibold text-text-primary font-primary">
                        关系盘点
                      </span>
                    </div>
                    <p className="text-[14px] text-text-secondary font-primary leading-relaxed">
                      {networkData.synthesis}
                    </p>
                  </div>
                )}

                {/* Weekly Plan */}
                {networkData.weeklyPlan && networkData.weeklyPlan.length > 0 && (
                  <WeeklyPlan plan={networkData.weeklyPlan} />
                )}

                {/* Action Queues */}
                {networkData.queues && (
                  <ActionQueue
                    queues={networkData.queues}
                    onFeedback={handleFeedback}
                  />
                )}
              </>
            ) : (
              /* Legacy Format - Fallback */
              <>
                {/* 关系盘点 */}
                {networkData.synthesis && (
                  <div className="bg-bg-card rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <BarChart3 className="w-4 h-4 text-primary" />
                      <span className="text-[14px] font-semibold text-text-primary font-primary">
                        关系盘点
                      </span>
                    </div>
                    <p className="text-[14px] text-text-secondary font-primary leading-relaxed">
                      {networkData.synthesis}
                    </p>
                  </div>
                )}

                {/* 待跟进 */}
                {networkData.followUps.length > 0 && (
                  <div className="bg-bg-card rounded-lg overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3.5 border-b border-border">
                      <div className="flex items-center gap-2">
                        <span className="text-[14px] font-semibold text-text-primary font-primary">
                          待跟进
                        </span>
                        <span className="px-1.5 py-0.5 bg-warning-tint text-warning text-[11px] font-medium rounded font-primary">
                          {networkData.followUps.length}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col">
                      {networkData.followUps.map((item, index) => (
                        <div
                          key={item.contactId}
                          className={`flex items-center gap-3 px-4 py-3 ${
                            index < networkData.followUps.length - 1 ? 'border-b border-border' : ''
                          }`}
                        >
                          <div className="flex-1">
                            <p className="text-[14px] font-medium text-text-primary font-primary">
                              {item.contactName}
                            </p>
                            <p className="text-[13px] text-text-secondary font-primary">
                              {item.reason}
                            </p>
                            <p className="text-[12px] text-primary font-primary mt-0.5">
                              建议：{item.suggestedAction}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 关系网络建议 */}
                {networkData.recommendations.length > 0 && (
                  <div className="bg-bg-card rounded-lg overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3.5 border-b border-border">
                      <div className="flex items-center gap-2">
                        <span className="text-[14px] font-semibold text-text-primary font-primary">
                          关系网络建议
                        </span>
                      </div>
                      <span className="px-1.5 py-0.5 bg-primary-tint text-primary text-[11px] font-medium rounded font-primary">
                        {networkData.recommendations.length}
                      </span>
                    </div>

                    <div className="flex flex-col gap-3 px-4 py-3">
                      {networkData.recommendations.map((item, index) => (
                        <div
                          key={index}
                          className="flex flex-col gap-2 p-3 bg-primary-tint rounded-md"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[13px] text-text-muted font-primary uppercase">
                              {item.type === 'connection' ? '连接建议' : item.type === 'followup' ? '跟进建议' : '介绍建议'}
                            </span>
                            <span className="text-[12px] text-text-muted font-primary">
                              置信度 {Math.round(item.confidence * 100)}%
                            </span>
                          </div>
                          <p className="text-[14px] text-text-primary font-primary">
                            {item.description}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 下一步行动 */}
                {networkData.nextActions.length > 0 && (
                  <div className="bg-bg-card rounded-lg p-4">
                    <h3 className="text-[14px] font-semibold text-text-primary font-primary mb-3">
                      建议行动
                    </h3>
                    <div className="flex flex-col gap-2">
                      {networkData.nextActions.map((action, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-3 p-3 bg-bg-surface rounded-md"
                        >
                          <div className="flex-1">
                            <p className="text-[14px] text-text-primary font-primary">
                              {action.action}
                            </p>
                            {action.estimatedTime && (
                              <p className="text-[12px] text-text-muted font-primary mt-0.5">
                                预计时间：{action.estimatedTime}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 空状态 */}
                {networkData.followUps.length === 0 &&
                  networkData.recommendations.length === 0 &&
                  networkData.nextActions.length === 0 && (
                    <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center p-8">
                      <p className="text-[14px] text-text-secondary font-primary">
                        {networkData.synthesis || '暂无行动建议'}
                      </p>
                    </div>
                  )}
              </>
            )}
          </>
        ) : null}
      </div>
    </div>
  )
}
