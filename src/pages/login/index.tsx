import { View, Text, Input } from '@tarojs/components'
import { useState } from 'react'
import Taro from '@tarojs/taro'
import { authApi } from '@/services/api'
import { showToast, showLoading, hideLoading, setStorage } from '@/utils'
import './index.scss'

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [countdown, setCountdown] = useState(0)
  const [loading, setLoading] = useState(false)

  const handleSendCode = async () => {
    if (!email || countdown > 0) return

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showToast('请输入正确的邮箱地址')
      return
    }

    try {
      showLoading('发送中...')
      await authApi.sendCode(email)
      hideLoading()
      showToast('验证码已发送', 'success')

      setCountdown(60)
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } catch (error) {
      hideLoading()
      showToast('发送失败，请重试')
    }
  }

  const handleLogin = async () => {
    if (!email || !code) {
      showToast('请填写完整信息')
      return
    }

    try {
      setLoading(true)
      showLoading('登录中...')
      const result = await authApi.login(email, code)
      hideLoading()

      setStorage('token', result.token)
      setStorage('user', result.user)

      showToast('登录成功', 'success')
      Taro.switchTab({ url: '/pages/conversation/index' })
    } catch (error) {
      hideLoading()
      showToast('登录失败，请检查验证码')
    } finally {
      setLoading(false)
    }
  }

  return (
    <View className="login-page">
      <View className="top-section">
        <View className="logo-area">
          <View className="logo-icon">
            <View className="icon-users" />
          </View>
          <Text className="app-name">FriendsAI</Text>
          <Text className="tagline">会后写日记，会前一键简报</Text>
        </View>

        <View className="form-area">
          <View className="input-wrapper">
            <Input
              className="input-field"
              type="text"
              placeholder="输入邮箱"
              value={email}
              onInput={(e) => setEmail(e.detail.value)}
            />
          </View>

          <View className="code-row">
            <View className="input-wrapper code-input">
              <Input
                className="input-field"
                type="number"
                placeholder="验证码"
                maxlength={6}
                value={code}
                onInput={(e) => setCode(e.detail.value)}
              />
            </View>
            <View
              className={`get-code-btn ${countdown > 0 ? 'disabled' : ''}`}
              onClick={handleSendCode}
            >
              <Text className="get-code-text">
                {countdown > 0 ? `${countdown}s` : '获取验证码'}
              </Text>
            </View>
          </View>

          <View
            className={`login-btn ${loading ? 'disabled' : ''}`}
            onClick={handleLogin}
          >
            <Text className="login-text">登录 / 注册</Text>
          </View>
        </View>
      </View>

      <View className="bottom-section">
        <Text className="privacy-text">登录即表示同意《隐私政策》和《用户协议》</Text>
      </View>
    </View>
  )
}

export default LoginPage
