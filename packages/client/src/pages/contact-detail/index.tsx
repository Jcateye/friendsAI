import { useState, useEffect } from 'react'
import { View, Text, ScrollView } from '@tarojs/components'
import Taro, { useRouter, useDidShow } from '@tarojs/taro'
import { AtIcon } from 'taro-ui'
import Header from '../../components/Header'
import { ContactDetail, ContactEvent } from '../../types'
import { api, contactApi, chatApi } from '../../services/api'
import { formatDate, getAvatarStyle } from '../../utils'
import './index.scss'

const ContactDetailPage: React.FC = () => {
  const router = useRouter()
  const { id } = router.params
  const [contact, setContact] = useState<ContactDetail | null>(null)
  const [loading, setLoading] = useState(true)

  const loadContact = async () => {
    if (!id) return
    setLoading(true)
    try {
      const data = await api.getContactDetail(id)
      setContact(data)
    } catch (error) {
      console.error('Failed to load contact:', error)
      Taro.showToast({ title: '加载失败', icon: 'error' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadContact()
  }, [id])

  useDidShow(() => {
    loadContact()
  })

  const handleBack = () => {
    Taro.navigateBack()
  }

  const handleEdit = () => {
    if (!id) return
    Taro.navigateTo({ url: `/pages/contact-edit/index?id=${id}` })
  }

  const handleStartConversation = async () => {
    if (!id || !contact) return
    const defaultSessionKey = 'conversation_default_session_id'
    const contactSessionKey = `contact_chat_session_${id}`
    try {
      Taro.showLoading({ title: '打开中...', mask: true })
      let sessionId = Taro.getStorageSync(contactSessionKey)
      if (!sessionId) {
        const created = await chatApi.createSession({
          firstMessage: `开始与${contact.name}对话`,
          title: contact.name,
        })
        sessionId = created.session.id
        Taro.setStorageSync(contactSessionKey, sessionId)
      }
      Taro.setStorageSync(defaultSessionKey, sessionId)
      Taro.hideLoading()
      Taro.navigateTo({ url: '/pages/conversation/index' })
    } catch (error) {
      Taro.hideLoading()
      Taro.showToast({ title: '打开失败', icon: 'error' })
    }
  }

  const handleRefreshBrief = async () => {
    if (!id) return
    try {
      Taro.showLoading({ title: '生成中...', mask: true })
      await contactApi.refreshBrief(id)
      const refreshed = await api.getContactDetail(id)
      setContact(refreshed)
      Taro.hideLoading()
      Taro.showToast({ title: '简报已更新', icon: 'success' })
    } catch (error) {
      Taro.hideLoading()
      Taro.showToast({ title: '更新失败', icon: 'error' })
    }
  }

  const renderEventIcon = (type: ContactEvent['type']) => {
    const iconMap = {
      meeting: 'calendar',
      call: 'phone',
      visit: 'calendar',
      email: 'mail',
      note: 'file-generic',
      other: 'file-generic',
    }
    return iconMap[type] || 'file-generic'
  }

  if (loading) {
    return (
      <View className="contact-detail-page">
        <Header title="" showBack onBack={handleBack} />
        <View className="loading-state">
          <Text>加载中...</Text>
        </View>
      </View>
    )
  }

  if (!contact) {
    return (
      <View className="contact-detail-page">
        <Header title="" showBack onBack={handleBack} />
        <View className="error-state">
          <Text>联系人不存在</Text>
        </View>
      </View>
    )
  }

  const avatarStyle = getAvatarStyle(contact.avatarColor)
  const briefingText = contact.briefing?.lastSummary || contact.briefing?.suggestion

  return (
    <View className="contact-detail-page">
      <Header
        title=""
        showBack
        onBack={handleBack}
        rightAction={
          <View className="edit-btn" onClick={handleEdit}>
            <AtIcon value="edit" size="20" color="#000" />
          </View>
        }
      />

      <ScrollView scrollY className="detail-content">
        <View className="profile-section">
          <View className="avatar-large" style={avatarStyle}>
            <Text className="avatar-text">{contact.initial}</Text>
          </View>
          <Text className="contact-name">{contact.name}</Text>
          {(contact.role || contact.company) && (
            <Text className="contact-role">
              {contact.role}{contact.role && contact.company && ' · '}{contact.company}
            </Text>
          )}
          {contact.tags && contact.tags.length > 0 && (
            <View className="tags-row">
              {contact.tags.map((tag, index) => (
                <View key={index} className="tag">
                  <Text className="tag-text">{tag}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        <View className="action-buttons">
          <View className="action-btn primary" onClick={handleStartConversation}>
            <AtIcon value="message" size="20" color="#fff" />
            <Text className="action-text">开始对话</Text>
          </View>
        </View>

        <View className="section">
          <View className="section-header">
            <Text className="section-title">简介</Text>
            <View className="refresh-btn" onClick={handleRefreshBrief}>
              <AtIcon value="reload" size="14" color="#7C9070" />
              <Text className="refresh-text">刷新</Text>
            </View>
          </View>
          <View className="briefing-card">
            <Text className="briefing-text">{briefingText || '暂无简报，点击刷新生成'}</Text>
          </View>
        </View>

        {contact.facts && contact.facts.length > 0 && (
          <View className="section">
            <Text className="section-title">画像事实</Text>
            <View className="briefing-card">
              {contact.facts.slice(0, 8).map((f, idx) => (
                <Text key={idx} className="briefing-text">- {f}{'\n'}</Text>
              ))}
            </View>
          </View>
        )}

        {contact.actions && contact.actions.length > 0 && (
          <View className="section">
            <Text className="section-title">待办</Text>
            <View className="briefing-card">
              {contact.actions.slice(0, 8).map((a, idx) => (
                <Text key={idx} className="briefing-text">- {a}{'\n'}</Text>
              ))}
            </View>
          </View>
        )}

        {contact.events && contact.events.length > 0 && (
          <View className="section">
            <Text className="section-title">最近动态</Text>
            <View className="events-list">
              {contact.events.map(event => (
                <View key={event.id} className="event-item">
                  <View className="event-icon">
                    <AtIcon value={renderEventIcon(event.type)} size="16" color="#666" />
                  </View>
                  <View className="event-content">
                    <Text className="event-title">{event.summary}</Text>
                    <Text className="event-date">{formatDate(event.date)}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  )
}

export default ContactDetailPage
