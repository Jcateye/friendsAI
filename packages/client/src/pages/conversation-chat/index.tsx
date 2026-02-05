import { View, Text } from '@tarojs/components'
import { useEffect } from 'react'
import { useRouter } from '@tarojs/taro'
import Header from '@/components/Header'
import { setStorage, switchTab } from '@/utils'
import './index.scss'

const ConversationChatPage: React.FC = () => {
  const router = useRouter()
  const { id } = router.params

  useEffect(() => {
    if (id) {
      setStorage('conversation_active_id', id)
    }
    switchTab('/pages/conversation/index')
  }, [id])

  return (
    <View className="chat-page">
      <Header title="对话" showBack />
      <View className="loading-state">
        <Text>正在切换...</Text>
      </View>
    </View>
  )
}

export default ConversationChatPage
