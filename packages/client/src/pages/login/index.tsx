import { View, Text, Input } from '@tarojs/components'
import { useState } from 'react'
import Taro from '@tarojs/taro'
import { authApi } from '@/services/api'
import { showToast, showLoading, hideLoading, setStorage } from '@/utils'
import './index.scss'

const LoginPage: React.FC = () => {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [emailOrPhone, setEmailOrPhone] = useState('')
  const [password, setPassword] = useState('')
  const [verifyCode, setVerifyCode] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    if (!emailOrPhone || (!password && !verifyCode)) {
      showToast('请填写完整信息')
      return
    }

    try {
      setLoading(true)
      showLoading('登录中...')
      const result = await authApi.login(emailOrPhone, password || undefined, verifyCode || undefined)
      setStorage('token', result.accessToken)
      setStorage('refreshToken', result.refreshToken)
      if (result.workspace?.id) {
        setStorage('workspaceId', result.workspace.id)
      }
      setStorage('user', result.user)

      hideLoading()
      showToast('登录成功', 'success')
      Taro.switchTab({ url: '/pages/conversation/index' })
    } catch (error) {
      hideLoading()
      showToast('登录失败，请检查信息')
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async () => {
    if (!emailOrPhone || !name || (!password && !verifyCode)) {
      showToast('请填写完整信息')
      return
    }
    try {
      setLoading(true)
      showLoading('注册中...')
      const payload: { email?: string; phone?: string; name: string; password?: string; verifyCode?: string } = {
        name,
        password: password || undefined,
        verifyCode: verifyCode || undefined,
      }
      if (emailOrPhone.includes('@')) {
        payload.email = emailOrPhone
      } else {
        payload.phone = emailOrPhone
      }
      const result = await authApi.register(payload)
      // Register also issues tokens (auto-login) for smoother MVP UX.
      if (result.accessToken) setStorage('token', result.accessToken)
      if (result.refreshToken) setStorage('refreshToken', result.refreshToken)
      if (result.workspace?.id) setStorage('workspaceId', result.workspace.id)
      setStorage('user', result.user)
      hideLoading()
      showToast('注册成功', 'success')
      Taro.switchTab({ url: '/pages/conversation/index' })
    } catch (error) {
      hideLoading()
      showToast('注册失败，请重试')
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
          {mode === 'register' && (
            <View className="input-wrapper">
              <Input
                className="input-field"
                type="text"
                placeholder="姓名"
                value={name}
                onInput={(e) => setName(e.detail.value)}
              />
            </View>
          )}
          <View className="input-wrapper">
            <Input
              className="input-field"
              type="text"
              placeholder="邮箱或手机号"
              value={emailOrPhone}
              onInput={(e) => setEmailOrPhone(e.detail.value)}
            />
          </View>

          <View className="input-wrapper">
            <Input
              className="input-field"
              type="password"
              placeholder="密码（或填验证码 123456）"
              value={password}
              onInput={(e) => setPassword(e.detail.value)}
            />
          </View>
          <View className="input-wrapper">
            <Input
              className="input-field"
              type="text"
              placeholder="验证码（开发阶段：123456）"
              value={verifyCode}
              onInput={(e) => setVerifyCode(e.detail.value)}
            />
          </View>

          <View
            className={`login-btn ${loading ? 'disabled' : ''}`}
            onClick={mode === 'login' ? handleLogin : handleRegister}
          >
            <Text className="login-text">{mode === 'login' ? '登录' : '注册'}</Text>
          </View>

          <View className="switch-mode" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
            <Text className="switch-text">
              {mode === 'login' ? '没有账号？去注册' : '已有账号？去登录'}
            </Text>
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
