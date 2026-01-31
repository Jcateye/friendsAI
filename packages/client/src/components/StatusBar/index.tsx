import { View, Text } from '@tarojs/components'
import { useState, useEffect } from 'react'
import { getStatusBarHeight } from '@/utils'
import './index.scss'

const StatusBar: React.FC = () => {
  const [height, setHeight] = useState(44)
  const [time, setTime] = useState('9:41')

  useEffect(() => {
    setHeight(getStatusBarHeight())

    const updateTime = () => {
      const now = new Date()
      setTime(`${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`)
    }

    updateTime()
    const timer = setInterval(updateTime, 60000)
    return () => clearInterval(timer)
  }, [])

  return (
    <View className="status-bar" style={{ height: `${height}px` }}>
      <Text className="time">{time}</Text>
      <View className="status-icons">
        <View className="icon-signal" />
        <View className="icon-wifi" />
        <View className="icon-battery" />
      </View>
    </View>
  )
}

export default StatusBar
