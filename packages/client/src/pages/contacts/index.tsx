import { useState, useEffect } from 'react'
import { View, Text, Input } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { AtIcon } from 'taro-ui'
import Header from '../../components/Header'
import TabBar from '../../components/TabBar'
import ContactCard from '../../components/ContactCard'
import GlobalDrawer from '../../components/GlobalDrawer'
import { Contact } from '../../types'
import { contactApi } from '../../services/api'
import './index.scss'

type ContactFilter = 'all' | 'recent' | 'pending' | 'starred'

const ContactsPage: React.FC = () => {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [searchKeyword, setSearchKeyword] = useState('')
  const [activeFilter, setActiveFilter] = useState<ContactFilter>('all')
  const [loading, setLoading] = useState(true)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const isFiltered = Boolean(searchKeyword) || activeFilter !== 'all'
  const emptyTitle = isFiltered ? '未找到匹配的联系人' : '开始建立你的联系人库'
  const emptyDesc = isFiltered
    ? '试试调整关键词或筛选条件'
    : '新增或导入联系人，开始记录每次交流'

  const loadContacts = async (filter: ContactFilter, keyword?: string) => {
    setLoading(true)
    try {
      const data = await contactApi.getList(filter, keyword)
      setContacts(data)
    } catch (error) {
      console.error('Failed to load contacts:', error)
      setContacts([])
    } finally {
      setLoading(false)
    }
  }

  useDidShow(() => {
    loadContacts(activeFilter, searchKeyword)
  })

  useEffect(() => {
    const handler = setTimeout(() => {
      loadContacts(activeFilter, searchKeyword)
    }, 300)
    return () => clearTimeout(handler)
  }, [searchKeyword, activeFilter])

  const filters: { key: ContactFilter; label: string }[] = [
    { key: 'all', label: '全部' },
    { key: 'recent', label: '最近联系' },
    { key: 'pending', label: '待跟进' },
    { key: 'starred', label: '重点' },
  ]

  const handleFilterClick = (filter: ContactFilter) => {
    setActiveFilter(filter)
  }

  const groupedContacts = contacts.reduce((acc: Record<string, Contact[]>, contact: Contact) => {
    // Derive initial from name if not provided by API
    const initial = (contact.initial || (contact.name ? contact.name[0] : '#')).toUpperCase();
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
    Taro.navigateTo({ url: '/pages/contact-form/index' })
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

      <View className="filter-tabs">
        {filters.map(filter => (
          <View
            key={filter.key}
            className={`filter-tab ${activeFilter === filter.key ? 'active' : ''}`}
            onClick={() => handleFilterClick(filter.key)}
          >
            <Text className="filter-text">{filter.label}</Text>
          </View>
        ))}
      </View>

      <View className="contacts-content">
        {loading ? (
          <View className="loading-state">
            <Text>加载中...</Text>
          </View>
        ) : contacts.length === 0 ? (
          <View className="empty-state">
            <View className="empty-icon">
              <AtIcon value="user" size="32" color="#C9C9C9" />
            </View>
            <Text className="empty-title">{emptyTitle}</Text>
            <Text className="empty-desc">{emptyDesc}</Text>
            <View className="empty-add-btn" onClick={handleAddContact}>
              <AtIcon value="add" size="14" color="#FFFFFF" />
              <Text className="empty-add-text">添加联系人</Text>
            </View>
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
