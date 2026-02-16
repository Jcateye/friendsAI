import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { StatusBar } from '../../components/layout/StatusBar'
import { api } from '../../lib/api/client'

/**
 * 获取认证 token（从 localStorage）
 */
function getAuthToken(): string | null {
  return localStorage.getItem('auth_token') || localStorage.getItem('token')
}

const REMEMBERED_EMAIL_KEY = 'remembered_email'

export function LoginPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSendingCode, setIsSendingCode] = useState(false)
  const [codeSent, setCodeSent] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [codeMessage, setCodeMessage] = useState<string | null>(null)

  // 如果已经登录，重定向到主页
  useEffect(() => {
    const token = getAuthToken()
    if (token) {
      navigate('/chat', { replace: true })
    }
  }, [navigate])

  // 页面加载时，从 URL 参数中读取错误信息，从 localStorage 读取保存的账号
  useEffect(() => {
    // 检查 URL 参数中是否有错误信息
    const errorParam = searchParams.get('error')
    if (errorParam) {
      setError(decodeURIComponent(errorParam))
      // 清除 URL 参数，避免刷新页面时重复显示
      setSearchParams({}, { replace: true })
    }

    // 从 localStorage 读取保存的账号
    const rememberedEmail = localStorage.getItem(REMEMBERED_EMAIL_KEY)
    if (rememberedEmail) {
      setEmail(rememberedEmail)
    }
  }, [searchParams, setSearchParams])

  // 倒计时逻辑
  useEffect(() => {
    if (countdown <= 0) return
    const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
    return () => clearTimeout(timer)
  }, [countdown])

  const handleSendCode = useCallback(async () => {
    if (!email.trim() || countdown > 0 || isSendingCode) return

    setError(null)
    setCodeMessage(null)
    setIsSendingCode(true)

    try {
      const result = await api.auth.sendCode({ emailOrPhone: email.trim() })
      setCodeSent(true)
      setCountdown(60)
      setCodeMessage(result.message)
    } catch (err) {
      setError(err instanceof Error ? err.message : '发送验证码失败')
    } finally {
      setIsSendingCode(false)
    }
  }, [email, countdown, isSendingCode])

  const handleLogin = async () => {
    setError(null)
    setIsLoading(true)

    try {
      // 使用 email 和 code 作为 password 进行登录
      await api.auth.login({
        emailOrPhone: email,
        password: code,
      })

      // 登录成功，保存账号到 localStorage
      if (email.trim()) {
        localStorage.setItem(REMEMBERED_EMAIL_KEY, email.trim())
      }

      // 登录成功，导航到聊天页面
      navigate('/chat')
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败，请重试')
    } finally {
      setIsLoading(false)
    }
  }

  const isLoginDisabled = !email.trim() || !code.trim() || isLoading
  const isSendDisabled = !email.trim() || countdown > 0 || isSendingCode

  return (
    <div className="flex flex-col h-full bg-bg-page px-6 pt-[60px] pb-10 justify-between">
      <StatusBar />

      {/* Top Section */}
      <div className="flex flex-col gap-12">
        {/* Logo Area */}
        <div className="flex flex-col items-center gap-4 pt-10">
          <div className="w-[72px] h-[72px] bg-primary rounded-[18px] flex items-center justify-center">
            <span className="text-white text-2xl font-bold">F</span>
          </div>
          <h1 className="text-[28px] font-semibold text-text-primary font-display">
            FriendsAI
          </h1>
          <p className="text-[15px] text-text-secondary font-primary text-center">
            会后写日记，会前一键简报
          </p>
        </div>

        {/* Form Area */}
        <div className="flex flex-col gap-4">
          {/* Error Message */}
          {error && (
            <div className="px-4 py-2 bg-red-50 rounded-md border border-red-200">
              <p className="text-[13px] text-red-600 font-primary">{error}</p>
            </div>
          )}

          {/* Code Sent Message */}
          {codeMessage && !error && (
            <div className="px-4 py-2 bg-green-50 rounded-md border border-green-200">
              <p className="text-[13px] text-green-600 font-primary">{codeMessage}</p>
            </div>
          )}

          {/* Email Input */}
          <div className="flex items-center h-[52px] px-4 bg-bg-card rounded-md border border-border">
            <input
              type="email"
              placeholder="输入邮箱或手机号"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 bg-transparent text-[15px] text-text-primary placeholder:text-text-muted outline-none font-primary"
              disabled={isLoading}
            />
          </div>

          {/* Code Row */}
          <div className="flex gap-3 h-[52px]">
            <div className="flex-1 flex items-center px-4 bg-bg-card rounded-md border border-border">
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="输入验证码"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="flex-1 bg-transparent text-[15px] text-text-primary placeholder:text-text-muted outline-none font-primary"
                disabled={isLoading}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !isLoginDisabled) {
                    handleLogin()
                  }
                }}
              />
            </div>
            <button
              onClick={handleSendCode}
              className="px-4 bg-bg-card rounded-md border border-border text-[14px] text-text-secondary font-medium font-primary whitespace-nowrap disabled:opacity-50 transition-opacity"
              disabled={isSendDisabled}
            >
              {isSendingCode
                ? '发送中...'
                : countdown > 0
                  ? `${countdown}s`
                  : codeSent
                    ? '重新获取'
                    : '获取验证码'}
            </button>
          </div>

          {/* Login Button */}
          <button
            onClick={handleLogin}
            disabled={isLoginDisabled}
            className="h-[52px] bg-primary rounded-md flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
          >
            <span className="text-[16px] font-semibold text-white font-primary">
              {isLoading ? '登录中...' : '登录 / 注册'}
            </span>
          </button>
        </div>
      </div>

      {/* Bottom Section */}
      <div className="flex items-center justify-center">
        <p className="text-[12px] text-text-muted font-primary text-center">
          登录即表示同意《隐私政策》和《用户协议》
        </p>
      </div>
    </div>
  )
}
