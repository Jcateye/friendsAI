import { useState, useEffect } from 'react'
import { View, Text, Input } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { AtIcon } from 'taro-ui'
import Header from '../../components/Header'
import TabBar from '../../components/TabBar'
import ContactCard from '../../components/ContactCard'
import GlobalDrawer from '../../components/GlobalDrawer'
import { Contact } from '../../types'
import { api } from '../../services/api'
import './index.scss'

const ContactsPage: React.FC = () => {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [searchKeyword, setSearchKeyword] = useState('')
  const [loading, setLoading] = useState(true)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const loadContacts = async () => {
    setLoading(true)
    try {
      const data = await api.getContacts()
      setContacts(data)
    } catch (error) {
      console.error('Failed to load contacts:', error)
    } finally {
      setLoading(false)
    }
  }

  useDidShow(() => {
    loadContacts()
  })

  useEffect(() => {
    loadContacts()
  }, [])

  const filteredContacts = contacts.filter(contact =>
    contact.name.toLowerCase().includes(searchKeyword.toLowerCase()) ||
    contact.company?.toLowerCase().includes(searchKeyword.toLowerCase()) ||
    contact.tags?.some(tag => tag.toLowerCase().includes(searchKeyword.toLowerCase()))
  )

  // Group contacts by initial
  const groupedContacts = filteredContacts.reduce((acc, contact) => {
    const initial = contact.initial.toUpperCase()
    if (!acc[initial]) {
      acc[initial] = []
    }
    acc[initial].push(contact)
    return acc
  }, {} as Record<string, Contact[]>)

  const sortedInitials = Object.keys(groupedContacts).sort()

  const handleContactClick = (contact: Contact) => {
    Taro.navigateTo({
      url: `/pages/contact-detail/index?id=${contact.id}`
    })
  }

  const handleAddContact = () => {
    Taro.navigateTo({ url: '/pages/contact-create/index' })
  }

  return (
    <View className="contacts-page">
      <Header
        title="联系人"
        onMenuClick={() => setDrawerOpen(true)}
        rightAction={
          <View className="add-btn" onClick={handleAddContact}>
            <AtIcon value="add" size="20" color="#000" />
          </View>
        }
      />

      <View className="search-bar">
        <View className="search-input-wrapper">
          <AtIcon value="search" size="16" color="#999" />
          <Input
            className="search-input"
            placeholder="搜索联系人..."
            value={searchKeyword}
            onInput={(e) => setSearchKeyword(e.detail.value)}
          />
          {searchKeyword && (
            <View className="clear-btn" onClick={() => setSearchKeyword('')}>
              <AtIcon value="close-circle" size="14" color="#999" />
            </View>
          )}
        </View>
      </View>

      <View className="contacts-content">
        {loading ? (
          <View className="loading-state">
            <Text>加载中...</Text>
          </View>
        ) : filteredContacts.length === 0 ? (
          <View className="empty-state">
            <Text className="empty-text">
              {searchKeyword ? '未找到匹配的联系人' : '暂无联系人'}
            </Text>
          </View>
        ) : (
          <View className="contacts-list">
            {sortedInitials.map(initial => (
              <View key={initial} className="contact-group">
                <View className="group-header">
                  <Text className="group-initial">{initial}</Text>
                </View>
                {groupedContacts[initial].map(contact => (
                  <ContactCard
                    key={contact.id}
                    contact={contact}
                    onClick={() => handleContactClick(contact)}
                  />
                ))}
              </View>
            ))}
          </View>
        )}
      </View>

      <TabBar current="contacts" />

      <GlobalDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />
    </View>
  )
}

export default ContactsPage
