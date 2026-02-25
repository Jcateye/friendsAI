import { useCallback, useEffect, useMemo, useState } from 'react'
import { Building2, ChevronRight, Info, Link2 } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { Header } from '../../components/layout/Header'
import { api } from '../../lib/api/client'

type FeishuBindStatus = 'loading' | 'bound' | 'unbound' | 'error'

const FEISHU_OAUTH_STATE_KEY = 'feishu_oauth_expected_state'

function isTrustedFeishuAuthorizeUrl(authorizeUrl: string): boolean {
  try {
    const parsed = new URL(authorizeUrl)
    return parsed.protocol === 'https:' && parsed.hostname === 'open.feishu.cn'
  } catch {
    return false
  }
}

export function SettingsConnectorPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [bindStatus, setBindStatus] = useState<FeishuBindStatus>('loading')
  const [isBinding, setIsBinding] = useState(false)
  const [isUnbinding, setIsUnbinding] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const loadBindingStatus = useCallback(async () => {
    try {
      setBindStatus('loading')
      const result = await api.feishuOAuth.getMyToken()
      setBindStatus(result.success && result.valid ? 'bound' : 'unbound')
    } catch {
      setBindStatus('error')
    }
  }, [])

  useEffect(() => {
    void loadBindingStatus()
  }, [loadBindingStatus])

  useEffect(() => {
    const oauthStatus = searchParams.get('feishu_oauth')
    if (!oauthStatus) {
      return
    }

    const nextFeedback =
      oauthStatus === 'success'
        ? { type: 'success' as const, message: '飞书绑定成功' }
        : {
            type: 'error' as const,
            message: searchParams.get('reason') === 'oauth_denied' ? '你已取消飞书授权' : '飞书绑定失败，请稍后重试',
          }
    setFeedback(nextFeedback)

    const nextParams = new URLSearchParams(searchParams)
    nextParams.delete('feishu_oauth')
    nextParams.delete('reason')
    nextParams.delete('message')
    setSearchParams(nextParams, { replace: true })
    void loadBindingStatus()
  }, [loadBindingStatus, searchParams, setSearchParams])

  const handleBindFeishu = useCallback(async () => {
    try {
      setFeedback(null)
      setIsBinding(true)
      const result = await api.feishuOAuth.getAuthorizeUrlForMe()
      if (!isTrustedFeishuAuthorizeUrl(result.authorizeUrl)) {
        throw new Error('授权链接无效，请联系管理员检查飞书配置')
      }

      const authorizeUrl = new URL(result.authorizeUrl)
      const callbackState = authorizeUrl.searchParams.get('state')
      if (!callbackState) {
        throw new Error('授权链接缺少 state 参数，请检查飞书配置')
      }

      sessionStorage.setItem(FEISHU_OAUTH_STATE_KEY, callbackState)
      window.location.href = authorizeUrl.toString()
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error instanceof Error ? error.message : '获取飞书授权链接失败',
      })
    } finally {
      setIsBinding(false)
    }
  }, [])

  const handleUnbindFeishu = useCallback(async () => {
    try {
      setFeedback(null)
      setIsUnbinding(true)
      await api.feishuOAuth.deleteMyToken()
      setFeedback({ type: 'success', message: '飞书解绑成功' })
      await loadBindingStatus()
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error instanceof Error ? error.message : '飞书解绑失败',
      })
    } finally {
      setIsUnbinding(false)
    }
  }, [loadBindingStatus])

  const handleTestConnection = useCallback(async () => {
    try {
      setFeedback(null)
      setIsTesting(true)
      const result = await api.feishuOAuth.checkMyTokenValid()
      setFeedback({
        type: result.valid ? 'success' : 'error',
        message: result.valid ? '连接测试通过' : '连接测试失败，请重新授权',
      })
      await loadBindingStatus()
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error instanceof Error ? error.message : '连接测试失败，请稍后重试',
      })
    } finally {
      setIsTesting(false)
    }
  }, [loadBindingStatus])

  const statusView = useMemo(() => {
    if (bindStatus === 'bound') {
      return {
        dotClassName: 'bg-[#7C9070]',
        textClassName: 'text-[#7C9070]',
        text: '已连接',
      }
    }

    if (bindStatus === 'loading') {
      return {
        dotClassName: 'bg-text-muted',
        textClassName: 'text-text-muted',
        text: '加载中',
      }
    }

    if (bindStatus === 'error') {
      return {
        dotClassName: 'bg-[#D4845E]',
        textClassName: 'text-[#D4845E]',
        text: '查询失败',
      }
    }

    return {
      dotClassName: 'bg-text-muted',
      textClassName: 'text-text-muted',
      text: '未连接',
    }
  }, [bindStatus])

  const canTestAndUnbind = bindStatus === 'bound' && !isUnbinding && !isTesting
  const canBind = bindStatus !== 'bound' && !isBinding

  return (
    <div className="flex h-full flex-col bg-bg-page">
      <Header title="设置" showBack />

      <div className="flex flex-1 flex-col gap-5 overflow-y-auto p-4">
        {feedback && (
          <div
            className={`rounded-md border px-4 py-3 text-sm ${
              feedback.type === 'success'
                ? 'border-green-200 bg-green-50 text-green-700'
                : 'border-red-200 bg-red-50 text-red-600'
            }`}
          >
            {feedback.message}
          </div>
        )}

        <div className="overflow-hidden rounded-2xl bg-bg-card">
          <div className="border-b border-border px-4 py-3">
            <span className="font-primary text-[12px] font-medium text-text-muted">连接器</span>
          </div>

          <div className="flex flex-col gap-3 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#3370FF]">
                  <span className="font-primary text-[18px] font-semibold text-white">飞</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="font-primary text-[16px] font-semibold text-text-primary">飞书</span>
                  <div className="flex items-center gap-1.5">
                    <span className={`h-2 w-2 rounded ${statusView.dotClassName}`} />
                    <span className={`font-primary text-[13px] font-medium ${statusView.textClassName}`}>
                      {statusView.text}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  className="h-8 rounded-lg border border-border bg-white px-3 font-primary text-[12px] font-medium text-[#6B6B6B] disabled:opacity-60"
                  onClick={handleTestConnection}
                  disabled={!canTestAndUnbind}
                >
                  {isTesting ? '测试中...' : '测试'}
                </button>
                <button
                  className="h-8 rounded-lg border border-[#D4845E] bg-white px-3 font-primary text-[12px] font-medium text-[#D4845E] disabled:opacity-60"
                  onClick={handleUnbindFeishu}
                  disabled={!canTestAndUnbind}
                >
                  {isUnbinding ? '解绑中...' : '解绑'}
                </button>
              </div>
            </div>

            <div className="border-t border-border pt-3">
              <span className="font-primary text-[11px] font-medium text-text-muted">当前授权范围</span>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {(bindStatus === 'bound' ? ['消息模板', '留痕记录', '内部下发'] : ['未授权范围']).map((scope) => (
                  <span
                    key={scope}
                    className="flex h-6 items-center rounded-md bg-bg-page px-2.5 font-primary text-[11px] text-[#6B6B6B]"
                  >
                    {scope}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <Building2 className="h-3.5 w-3.5 text-text-muted" />
              <span className="font-primary text-[12px] text-text-muted">
                {bindStatus === 'bound' ? '当前账号已绑定飞书组织' : '当前账号尚未绑定飞书组织'}
              </span>
            </div>
          </div>
        </div>

        <button
          className="flex w-full items-center justify-between rounded-2xl bg-bg-card px-4 py-3.5 text-left disabled:cursor-not-allowed disabled:opacity-60"
          onClick={handleBindFeishu}
          disabled={!canBind}
        >
          <div className="flex items-center gap-2.5">
            <Link2 className="h-4.5 w-4.5 text-text-muted" />
            <span className="font-primary text-[15px] text-text-primary">
              {isBinding ? '绑定中...' : bindStatus === 'bound' ? '飞书已绑定' : '绑定飞书账号'}
            </span>
          </div>
          <ChevronRight className="h-[18px] w-[18px] text-text-muted" />
        </button>

        <div className="flex gap-2.5 rounded-xl bg-[#5B9BD515] px-3.5 py-3">
          <Info className="mt-0.5 h-4 w-4 flex-none text-[#5B9BD5]" />
          <p className="font-primary text-[12px] leading-6 text-[#5B9BD5]">
            连接飞书后，可在对话中按需调用模板/留痕/内部下发。不会自动向外部渠道发送消息。
          </p>
        </div>
      </div>
    </div>
  )
}
