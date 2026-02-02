import { useState, useEffect } from 'react'
import { View, Text, ScrollView } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import { AtIcon } from 'taro-ui'
import Header from '../../components/Header'
import { ContactDetail, ContactEvent } from '../../types'
import { contactApi } from '../../services/api' // Change import from api to contactApi
import { formatDate, getAvatarStyle } from '../../utils'
import './index.scss'

const ContactDetailPage: React.FC = () => {
  const router = useRouter()
  const { id } = router.params
  const [contact, setContact] = useState<ContactDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadContact = async () => {
      if (!id) {
        setLoading(false) // If no ID, stop loading and show no contact
        return
      }
      setLoading(true)
      try {
        const data = await contactApi.getDetail(id) // Use contactApi.getDetail
        setContact(data)
      } catch (error) {
        console.error('Failed to load contact:', error)
        Taro.showToast({ title: '加载失败', icon: 'error' })
        setContact(null) // Ensure contact is null on error
      } finally {
        setLoading(false)
      }
    }
    loadContact()
  }, [id])

  const handleBack = () => {
    Taro.navigateBack()
  }

  const handleEdit = () => {
    Taro.showToast({ title: '编辑联系人', icon: 'none' })
  }

  const handleStartConversation = () => {
    Taro.showToast({ title: '开始对话', icon: 'none' })
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

        {briefingText && (
          <View className="section">
            <Text className="section-title">简介</Text>
            <View className="briefing-card">
              <Text className="briefing-text">{briefingText}</Text>
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
