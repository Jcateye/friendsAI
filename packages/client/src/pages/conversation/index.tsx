import { View, Text, Textarea } from '@tarojs/components'
import { useState, useEffect } from 'react'
import Taro, { useDidShow } from '@tarojs/taro'
import Header from '@/components/Header'
import TabBar from '@/components/TabBar'
import RecordCard from '@/components/RecordCard'
import GlobalDrawer from '@/components/GlobalDrawer'
import type { ConversationRecord } from '@/types'
import { mockData, conversationApi } from '@/services/api'
import { navigateTo, showToast, showLoading, hideLoading } from '@/utils'
import './index.scss'

const ConversationPage: React.FC = () => {
  const [inputText, setInputText] = useState('')
  const [records, setRecords] = useState<ConversationRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [drawerVisible, setDrawerVisible] = useState(false)

  useDidShow(() => {
    loadRecords()
  })

  const loadRecords = async () => {
    try {
      setLoading(true)
      setRecords(mockData.records)
    } catch (error) {
      showToast('加载失败')
    } finally {
      setLoading(false)
    }
  }

  const handleSend = async () => {
    if (!inputText.trim()) {
      showToast('请输入内容')
      return
    }

    try {
      showLoading('处理中...')
      const result = await conversationApi.create(inputText)
      hideLoading()
      setInputText('')
      navigateTo(`/pages/conversation-detail/index?id=${result.id}`)
    } catch (error) {
      hideLoading()
      navigateTo('/pages/conversation-detail/index?id=2')
    }
  }

  const handleRecordClick = (id: string) => {
    navigateTo(`/pages/conversation-detail/index?id=${id}`)
  }

  const handleMenuClick = () => {
    setDrawerVisible(true)
  }

  const handleSettingsClick = () => {
    setDrawerVisible(false)
    navigateTo('/pages/settings/index')
  }

  return (
    <View className="conversation-page">
      <Header
        title="对话"
        showMenu
        onMenuClick={handleMenuClick}
      />

      <View className="main-content">
        <View className="input-card">
          <View className="input-area">
            <Textarea
              className="input-textarea"
              placeholder="写下今天见了谁、聊了什么…&#10;（10分钟搞定）"
              value={inputText}
              onInput={(e) => setInputText(e.detail.value)}
              maxlength={2000}
            />
          </View>
          <View className="input-actions">
            <View className="voice-btn">
              <View className="icon-mic" />
            </View>
            <View className="send-btn" onClick={handleSend}>
              <View className="icon-send" />
              <Text className="send-text">发送</Text>
            </View>
          </View>
        </View>

        <View className="recent-section">
          <View className="section-header">
            <Text className="section-title">最近记录</Text>
            <Text className="view-all" onClick={() => setDrawerVisible(true)}>查看全部</Text>
          </View>

          {loading ? (
            <View className="loading-state">
              <Text className="loading-text">加载中...</Text>
            </View>
          ) : records.length === 0 ? (
            <View className="empty-state">
              <Text className="empty-text">暂无记录</Text>
            </View>
          ) : (
            <View className="record-list">
              {records.slice(0, 3).map((record) => (
                <RecordCard
                  key={record.id}
                  record={record}
                  onClick={() => handleRecordClick(record.id)}
                />
              ))}
            </View>
          )}
        </View>
      </View>

      <TabBar current="conversation" />

      <GlobalDrawer
        visible={drawerVisible}
        records={records}
        onClose={() => setDrawerVisible(false)}
        onSettingsClick={handleSettingsClick}
      />
    </View>
  )
}

export default ConversationPage
