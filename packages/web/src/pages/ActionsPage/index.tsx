import { useState, useEffect } from 'react'
import { ChevronRight, Clock, Sparkles, BarChart3, RefreshCw, AlertCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Header } from '../../components/layout/Header'
import { api } from '../../lib/api/client'
import type { NetworkActionData } from '../../lib/api/agent-types'

export function ActionsPage() {
  const navigate = useNavigate()

  const [networkData, setNetworkData] = useState<NetworkActionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

  // 提取联系人名称（从 contactId 中）
  const getContactName = (contactId: string) => {
    // 如果 contactId 是 UUID 格式，尝试从缓存或 API 获取
    // 这里简化处理，返回 ID 的前几位
    return contactId.substring(0, 8)
  }

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
          <div className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <span className="text-[13px] text-text-muted font-primary">分析中...</span>
            </div>
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
                    <Clock className="w-4 h-4 text-warning" />
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
                      <div className="w-10 h-10 bg-warning-tint rounded-md flex items-center justify-center">
                        <span className="text-warning font-semibold text-[14px]">
                          {item.contactName[0]}
                        </span>
                      </div>
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
                      <span
                        className={`px-2 py-0.5 text-[11px] font-medium rounded font-primary ${
                          item.priority === 'high'
                            ? 'bg-red-tint text-red'
                            : item.priority === 'medium'
                              ? 'bg-warning-tint text-warning'
                              : 'bg-bg-surface text-text-muted'
                        }`}
                      >
                        {item.priority === 'high' ? '高' : item.priority === 'medium' ? '中' : '低'}
                      </span>
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
                    <Sparkles className="w-4 h-4 text-primary" />
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
                      <span
                        className={`px-2 py-0.5 text-[11px] font-medium rounded font-primary ${
                          action.priority === 'high'
                            ? 'bg-red-tint text-red'
                            : action.priority === 'medium'
                              ? 'bg-warning-tint text-warning'
                              : 'bg-bg-surface text-text-muted'
                        }`}
                      >
                        {action.priority === 'high' ? '高' : action.priority === 'medium' ? '中' : '低'}
                      </span>
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
                  <Sparkles className="w-12 h-12 text-text-muted" />
                  <p className="text-[14px] text-text-secondary font-primary">
                    {networkData.synthesis || '暂无行动建议'}
                  </p>
                </div>
              )}
          </>
        ) : null}
      </div>
    </div>
  )
}
