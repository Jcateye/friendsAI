import { useState } from 'react'
import { View, Text, Switch } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { AtIcon } from 'taro-ui'
import Header from '../../components/Header'
import { authApi } from '../../services/api'
import { removeStorage, showToast } from '../../utils'
import './index.scss'

interface SettingItem {
  id: string
  icon: string
  title: string
  type: 'arrow' | 'switch' | 'text'
  value?: string | boolean
}

const SettingsPage: React.FC = () => {
  const [notifications, setNotifications] = useState(true)
  const [darkMode, setDarkMode] = useState(false)
  const [autoSync, setAutoSync] = useState(true)

  const handleBack = () => {
    Taro.navigateBack()
  }

  const settingSections = [
    {
      title: '账户',
      items: [
        { id: 'profile', icon: 'user', title: '个人资料', type: 'arrow' as const },
        { id: 'security', icon: 'lock', title: '安全设置', type: 'arrow' as const },
        { id: 'privacy', icon: 'eye', title: '隐私设置', type: 'arrow' as const }
      ]
    },
    {
      title: '偏好',
      items: [
        { id: 'notifications', icon: 'bell', title: '通知', type: 'switch' as const, value: notifications },
        { id: 'darkMode', icon: 'moon', title: '深色模式', type: 'switch' as const, value: darkMode },
        { id: 'autoSync', icon: 'reload', title: '自动同步', type: 'switch' as const, value: autoSync }
      ]
    },
    {
      title: '数据',
      items: [
        { id: 'connector', icon: 'link', title: '连接器', type: 'arrow' as const },
        { id: 'export', icon: 'download', title: '导出数据', type: 'arrow' as const },
        { id: 'clear', icon: 'trash', title: '清除缓存', type: 'arrow' as const }
      ]
    },
    {
      title: '关于',
      items: [
        { id: 'version', icon: 'info', title: '版本', type: 'text' as const, value: 'v1.0.0' },
        { id: 'feedback', icon: 'message', title: '反馈建议', type: 'arrow' as const },
        { id: 'about', icon: 'heart', title: '关于我们', type: 'arrow' as const }
      ]
    }
  ]

  const handleSettingClick = (item: SettingItem) => {
    if (item.type === 'arrow') {
      if (item.id === 'connector') {
        Taro.navigateTo({ url: '/pages/connector/index' })
      } else {
        Taro.showToast({ title: item.title, icon: 'none' })
      }
    }
  }

  const handleSwitchChange = (id: string, value: boolean) => {
    switch (id) {
      case 'notifications':
        setNotifications(value)
        break
      case 'darkMode':
        setDarkMode(value)
        break
      case 'autoSync':
        setAutoSync(value)
        break
    }
  }

  return (
    <View className="settings-page">
      <Header title="设置" showBack onBack={handleBack} />

      <View className="settings-content">
        {settingSections.map(section => (
          <View key={section.title} className="setting-section">
            <Text className="section-title">{section.title}</Text>
            <View className="section-items">
              {section.items.map(item => (
                <View
                  key={item.id}
                  className="setting-item"
                  onClick={() => handleSettingClick(item)}
                >
                  <View className="item-left">
                    <View className="item-icon">
                      <AtIcon value={item.icon} size="18" color="#666" />
                    </View>
                    <Text className="item-title">{item.title}</Text>
                  </View>
                  <View className="item-right">
                    {item.type === 'arrow' && (
                      <AtIcon value="chevron-right" size="18" color="#ccc" />
                    )}
                    {item.type === 'switch' && (
                      <Switch
                        checked={item.value as boolean}
                        onChange={(e) => handleSwitchChange(item.id, e.detail.value)}
                        color="#000"
                      />
                    )}
                    {item.type === 'text' && (
                      <Text className="item-value">{item.value}</Text>
                    )}
                  </View>
                </View>
              ))}
            </View>
          </View>
        ))}

        <View className="logout-section">
          <View
            className="logout-btn"
            onClick={async () => {
              try {
                const refreshToken = Taro.getStorageSync('refreshToken')
                if (refreshToken) {
                  await authApi.logout(refreshToken)
                }
                removeStorage('token')
                removeStorage('refreshToken')
                removeStorage('workspaceId')
                removeStorage('user')
                showToast('已退出', 'success')
                Taro.reLaunch({ url: '/pages/login/index' })
              } catch (error) {
                showToast('退出失败')
              }
            }}
          >
            <Text className="logout-text">退出登录</Text>
          </View>
        </View>
      </View>
    </View>
  )
}

export default SettingsPage
