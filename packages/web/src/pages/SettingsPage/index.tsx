import { useCallback, useEffect, useMemo, useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { Header } from '../../components/layout/Header'
import { api, clearAuthToken } from '../../lib/api/client'
import { useNavigate, useSearchParams } from 'react-router-dom'

type FeishuBindStatus = 'loading' | 'bound' | 'unbound' | 'error'

interface SettingItem {
  label: string
  value?: string
  danger?: boolean
  disabled?: boolean
  showChevron?: boolean
  onClick?: () => void
  rightElement?: React.ReactNode
}

interface SettingSection {
  title: string
  items: SettingItem[]
}

const REMEMBERED_EMAIL_KEY = 'remembered_email'

export function SettingsPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [bindStatus, setBindStatus] = useState<FeishuBindStatus>('loading')
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [userEmail, setUserEmail] = useState('')

  useEffect(() => {
    setUserEmail(localStorage.getItem(REMEMBERED_EMAIL_KEY) ?? '未设置')
  }, [])

  const loadBindingStatus = useCallback(async () => {
    try {
      setBindStatus('loading')
      const result = await api.feishuOAuth.getMyToken()
      const isBound = result.success && result.valid === true
      setBindStatus(isBound ? 'bound' : 'unbound')
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

  const handleLogout = useCallback(() => {
    const refreshToken = localStorage.getItem('refresh_token')

    const completeLogout = () => {
      clearAuthToken()
      navigate('/login', { replace: true })
    }

    if (!refreshToken) {
      completeLogout()
      return
    }

    void api.auth
      .logout({ refreshToken })
      .then(() => {
        completeLogout()
      })
      .catch(() => {
        completeLogout()
      })
  }, [navigate])

  const connectorStatusText =
    bindStatus === 'bound' ? '已连接' : bindStatus === 'unbound' ? '未连接' : bindStatus === 'error' ? '查询失败' : '加载中'

  const sections: SettingSection[] = useMemo(
    () => [
      {
        title: '账号',
        items: [
          { label: '邮箱', value: userEmail, showChevron: false },
          { label: '退出登录', danger: true, showChevron: false, onClick: handleLogout },
        ],
      },
      {
        title: '连接器',
        items: [
          {
            label: '飞书',
            value: connectorStatusText,
            showChevron: true,
            onClick: () => navigate('/settings/connectors/feishu'),
          },
        ],
      },
      {
        title: '数据',
        items: [
          { label: '导出数据', showChevron: true, disabled: true },
          { label: '清空数据', showChevron: true, danger: true, disabled: true },
        ],
      },
      {
        title: 'AI',
        items: [
          { label: '提取严格度', value: '平衡', showChevron: false, disabled: true },
          { label: '隐私说明', showChevron: false, disabled: true },
        ],
      },
      {
        title: '通知',
        items: [
          {
            label: '待跟进提醒',
            showChevron: false,
            rightElement: (
              <div className="flex h-7 w-12 items-center justify-end rounded-full bg-[#7C9070] p-0.5">
                <div className="h-6 w-6 rounded-full bg-white" />
              </div>
            ),
          },
        ],
      },
      {
        title: '反馈',
        items: [{ label: '提交反馈 / 联系支持', showChevron: true, disabled: true }],
      },
    ],
    [connectorStatusText, handleLogout, navigate, userEmail],
  )

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

        {sections.map((section) => (
          <div key={section.title} className="overflow-hidden rounded-2xl bg-bg-card">
            <div className="border-b border-border px-4 py-3">
              <span className="font-primary text-[12px] font-medium text-text-muted">{section.title}</span>
            </div>

            {section.items.map((item, index) => {
              const rowClassName = `flex w-full items-center justify-between px-4 py-3.5 text-left ${
                index < section.items.length - 1 ? 'border-b border-border' : ''
              } ${item.disabled ? 'cursor-not-allowed opacity-60' : ''}`
              const rowContent = (
                <>
                  <span className={`font-primary text-[15px] ${item.danger ? 'text-[#D4845E]' : 'text-text-primary'}`}>
                    {item.label}
                  </span>
                  <div className="flex items-center gap-2">
                    {item.value && (
                      <span
                        className={`font-primary text-[14px] ${item.value === '平衡' ? 'text-[#7C9070]' : 'text-text-muted'}`}
                      >
                        {item.value}
                      </span>
                    )}
                    {item.rightElement}
                    {item.showChevron && <ChevronRight className="h-[18px] w-[18px] text-text-muted" />}
                  </div>
                </>
              )

              if (item.onClick) {
                return (
                  <button key={item.label} className={rowClassName} disabled={item.disabled} onClick={item.onClick}>
                    {rowContent}
                  </button>
                )
              }

              return (
                <div key={item.label} className={rowClassName} aria-disabled={item.disabled ? true : undefined}>
                  {rowContent}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
