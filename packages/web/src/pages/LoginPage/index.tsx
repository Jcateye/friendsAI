import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { StatusBar } from '../../components/layout/StatusBar'

export function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')

  const handleLogin = () => {
    // TODO: Implement actual login logic
    navigate('/chat')
  }

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
          {/* Email Input */}
          <div className="flex items-center h-[52px] px-4 bg-bg-card rounded-md border border-border">
            <input
              type="email"
              placeholder="输入邮箱或手机号"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 bg-transparent text-[15px] text-text-primary placeholder:text-text-muted outline-none font-primary"
            />
          </div>

          {/* Code Row */}
          <div className="flex gap-3 h-[52px]">
            <div className="flex-1 flex items-center px-4 bg-bg-card rounded-md border border-border">
              <input
                type="text"
                placeholder="验证码"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="flex-1 bg-transparent text-[15px] text-text-primary placeholder:text-text-muted outline-none font-primary"
              />
            </div>
            <button className="px-4 bg-bg-card rounded-md border border-border text-[14px] text-text-secondary font-medium font-primary whitespace-nowrap">
              获取验证码
            </button>
          </div>

          {/* Login Button */}
          <button
            onClick={handleLogin}
            className="h-[52px] bg-primary rounded-md flex items-center justify-center"
          >
            <span className="text-[16px] font-semibold text-white font-primary">
              登录 / 注册
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
