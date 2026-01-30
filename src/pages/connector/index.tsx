import { useState } from 'react'
import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { AtIcon } from 'taro-ui'
import Header from '../../components/Header'
import './index.scss'

interface Connector {
  id: string
  name: string
  icon: string
  description: string
  connected: boolean
  color: string
}

const ConnectorPage: React.FC = () => {
  const [connectors, setConnectors] = useState<Connector[]>([
    {
      id: 'wechat',
      name: '微信',
      icon: 'message',
      description: '同步微信联系人和聊天记录',
      connected: true,
      color: '#07C160'
    },
    {
      id: 'calendar',
      name: '日历',
      icon: 'calendar',
      description: '同步日历事件和会议安排',
      connected: true,
      color: '#FF9500'
    },
    {
      id: 'email',
      name: '邮箱',
      icon: 'mail',
      description: '同步邮件联系人和通讯',
      connected: false,
      color: '#007AFF'
    },
    {
      id: 'linkedin',
      name: 'LinkedIn',
      icon: 'linkedin',
      description: '同步职业社交网络',
      connected: false,
      color: '#0A66C2'
    },
    {
      id: 'notion',
      name: 'Notion',
      icon: 'file-generic',
      description: '同步笔记和文档',
      connected: false,
      color: '#000000'
    },
    {
      id: 'feishu',
      name: '飞书',
      icon: 'message',
      description: '同步飞书通讯录和消息',
      connected: false,
      color: '#3370FF'
    }
  ])

  const handleBack = () => {
    Taro.navigateBack()
  }

  const handleConnectorToggle = (connectorId: string) => {
    setConnectors(prev =>
      prev.map(c =>
        c.id === connectorId
          ? { ...c, connected: !c.connected }
          : c
      )
    )
    const connector = connectors.find(c => c.id === connectorId)
    if (connector) {
      Taro.showToast({
        title: connector.connected ? `已断开 ${connector.name}` : `已连接 ${connector.name}`,
        icon: 'none'
      })
    }
  }

  const connectedList = connectors.filter(c => c.connected)
  const availableList = connectors.filter(c => !c.connected)

  return (
    <View className="connector-page">
      <Header title="连接器" showBack onBack={handleBack} />

      <View className="connector-content">
        {connectedList.length > 0 && (
          <View className="connector-section">
            <Text className="section-title">已连接</Text>
            <View className="connector-list">
              {connectedList.map(connector => (
                <View
                  key={connector.id}
                  className="connector-item"
                  onClick={() => handleConnectorToggle(connector.id)}
                >
                  <View
                    className="connector-icon"
                    style={{ backgroundColor: connector.color }}
                  >
                    <AtIcon value={connector.icon} size="20" color="#fff" />
                  </View>
                  <View className="connector-info">
                    <Text className="connector-name">{connector.name}</Text>
                    <Text className="connector-desc">{connector.description}</Text>
                  </View>
                  <View className="connector-status connected">
                    <AtIcon value="check" size="16" color="#07C160" />
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {availableList.length > 0 && (
          <View className="connector-section">
            <Text className="section-title">可用连接</Text>
            <View className="connector-list">
              {availableList.map(connector => (
                <View
                  key={connector.id}
                  className="connector-item"
                  onClick={() => handleConnectorToggle(connector.id)}
                >
                  <View
                    className="connector-icon"
                    style={{ backgroundColor: connector.color }}
                  >
                    <AtIcon value={connector.icon} size="20" color="#fff" />
                  </View>
                  <View className="connector-info">
                    <Text className="connector-name">{connector.name}</Text>
                    <Text className="connector-desc">{connector.description}</Text>
                  </View>
                  <View className="connector-status">
                    <AtIcon value="add" size="16" color="#999" />
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}
      </View>
    </View>
  )
}

export default ConnectorPage
