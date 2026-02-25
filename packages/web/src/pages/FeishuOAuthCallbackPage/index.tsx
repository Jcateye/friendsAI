import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../../lib/api/client'

const FEISHU_OAUTH_STATE_KEY = 'feishu_oauth_expected_state'

export function FeishuOAuthCallbackPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [statusText, setStatusText] = useState('正在处理飞书授权结果...')

  useEffect(() => {
    let cancelled = false

    const processCallback = async () => {
      try {
        const expectedState = sessionStorage.getItem(FEISHU_OAUTH_STATE_KEY)
        const callbackState = searchParams.get('state')
        if (!expectedState || !callbackState || expectedState !== callbackState) {
          sessionStorage.removeItem(FEISHU_OAUTH_STATE_KEY)
          if (!cancelled) {
            const safeMessage = '授权状态校验失败，请重新绑定'
            setStatusText(`${safeMessage}，正在返回设置页...`)
            navigate(`/settings?feishu_oauth=error&reason=state_invalid&message=${encodeURIComponent(safeMessage)}`, {
              replace: true,
            })
          }
          return
        }

        sessionStorage.removeItem(FEISHU_OAUTH_STATE_KEY)

        const result = await api.feishuOAuth.handleCallback({
          code: searchParams.get('code') ?? undefined,
          state: callbackState,
          error: searchParams.get('error') ?? undefined,
          error_description: searchParams.get('error_description') ?? undefined,
        })

        if (cancelled) {
          return
        }

        if (result.success) {
          setStatusText('飞书绑定成功，正在返回设置页...')
          navigate('/settings?feishu_oauth=success', { replace: true })
          return
        }

        const safeMessage = '飞书绑定失败，请稍后重试'
        const reason = searchParams.get('error') === 'access_denied' ? 'oauth_denied' : 'oauth_failed'
        setStatusText(`${safeMessage}，正在返回设置页...`)
        navigate(`/settings?feishu_oauth=error&reason=${reason}&message=${encodeURIComponent(safeMessage)}`, {
          replace: true,
        })
      } catch (error) {
        if (cancelled) {
          return
        }

        const safeMessage = '飞书绑定失败，请稍后重试'
        setStatusText(`${safeMessage}，正在返回设置页...`)
        navigate(`/settings?feishu_oauth=error&reason=oauth_failed&message=${encodeURIComponent(safeMessage)}`, {
          replace: true,
        })
      }
    }

    void processCallback()

    return () => {
      cancelled = true
    }
  }, [navigate, searchParams])

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-page px-6">
      <div className="w-full max-w-md rounded-lg border border-border bg-bg-card p-6 text-center">
        <p className="text-sm text-text-secondary">{statusText}</p>
      </div>
    </div>
  )
}
