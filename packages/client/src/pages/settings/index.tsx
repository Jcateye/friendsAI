import { useState, useEffect } from 'react'
import { View, Text, Switch } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { AtIcon } from 'taro-ui'
import Header from '../../components/Header'
import './index.scss'
import { userApi, authApi } from '../../services/api' 
import { UserProfileDto, UpdateUserProfileDto, SettingItem } from '../../types/user.dto' 


const SettingsPage: React.FC = () => {
  const [userProfile, setUserProfile] = useState<UserProfileDto | null>(null)
  const [notifications, setNotifications] = useState(true)
  const [darkMode, setDarkMode] = useState(false)
  const [autoSync, setAutoSync] = useState(true)

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const profile = await userApi.getProfile()
        setUserProfile(profile)
        setNotifications(profile.notificationsEnabled || false)
        setDarkMode(profile.darkModeEnabled || false)
        setAutoSync(profile.autoSyncEnabled || false)
      } catch (error) {
        console.error('Failed to fetch user profile:', error)
        Taro.showToast({ title: '加载用户资料失败', icon: 'none' })
      }
    }
    fetchUserProfile()
  }, [])

  const handleBack = () => {
    Taro.navigateBack()
  }

  const handleUpdatePreference = async (id: string, value: boolean) => {
    try {
      let updateDto: UpdateUserProfileDto = {}
      switch (id) {
        case 'notifications':
          updateDto = { notificationsEnabled: value }
          break
        case 'darkMode':
          updateDto = { darkModeEnabled: value }
          break
        case 'autoSync':
          updateDto = { autoSyncEnabled: value }
          break
      }
      if (Object.keys(updateDto).length > 0) {
        await userApi.updateSettings(updateDto)
        const updatedProfile = await userApi.getProfile()
        setUserProfile(updatedProfile)
        setNotifications(updatedProfile.notificationsEnabled || false)
        setDarkMode(updatedProfile.darkModeEnabled || false)
        setAutoSync(updatedProfile.autoSyncEnabled || false)
        Taro.showToast({ title: '设置更新成功', icon: 'success' })
      }
    } catch (error) {
      console.error('Failed to update preference:', error)
      Taro.showToast({ title: '更新设置失败', icon: 'none' })
    }
  }

  const handleSwitchChange = (id: string, value: boolean) => {
    handleUpdatePreference(id, value)
  }

  const settingSections = [
    {
      title: '账户',
      items: [
        { id: 'profile', icon: 'user', title: '个人资料', type: 'arrow' as const, value: userProfile?.name || userProfile?.email || '未设置' },
        { id: 'email', icon: 'mail', title: '邮箱', type: 'text' as const, value: userProfile?.email || '未设置' },
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
        Taro.showToast({ title: item.title + '功能待实现', icon: 'none' })
      }
    } else if (item.id === 'export') {
        // TODO: Call userApi.exportData()
        Taro.showToast({ title: '导出数据功能待实现', icon: 'none' })
    } else if (item.id === 'clear') {
        // TODO: Call userApi.clearData()
        Taro.showToast({ title: '清除缓存功能待实现', icon: 'none' })
    }
  }

  const handleLogout = async () => {
    try {
      await authApi.logout()
      Taro.removeStorageSync('token')
      Taro.removeStorageSync('user')
      Taro.reLaunch({ url: '/pages/login/index' })
    } catch (error) {
      console.error('Failed to logout:', error)
      Taro.showToast({ title: '退出登录失败', icon: 'none' })
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
                  onClick={() => item.type === 'arrow' || item.type === 'text' ? handleSettingClick(item) : {}}
                >
                  <View className="item-left">
                    <View className="item-icon">
                      <AtIcon value={item.icon} size="18" color="#666" />
                    </View>
                    <Text className="item-title">{item.title}</Text>
                  </View>
                  <View className="item-right">
                    {item.id === 'email' && <Text className="item-value">{userProfile?.email || '未设置'}</Text>}
                    {item.type === 'arrow' && item.id !== 'email' && (
                      <AtIcon value="chevron-right" size="18" color="#ccc" />
                    )}
                    {item.type === 'switch' && (
                      <Switch
                        checked={item.value as boolean}
                        onChange={(e) => handleSwitchChange(item.id, e.detail.value)}
                        color="#000"
                      />
                    )}
                    {item.type === 'text' && item.id !== 'email' && (
                      <Text className="item-value">{item.value}</Text>
                    )}
                  </View>
                </View>
              ))}
            </View>
          </View>
        ))}

        <View className="logout-section">
          <View className="logout-btn" onClick={handleLogout}>
            <Text className="logout-text">退出登录</Text>
          </View>
        </View>
      </View>
    </View>
  )
}

export default SettingsPage


