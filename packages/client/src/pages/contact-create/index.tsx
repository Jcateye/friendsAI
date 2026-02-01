import { View, Text, Input, Textarea } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useState } from 'react'
import Header from '@/components/Header'
import { contactApi } from '@/services/api'
import { showToast, showLoading, hideLoading } from '@/utils'
import './index.scss'

const ContactCreatePage: React.FC = () => {
  const [name, setName] = useState('')
  const [notes, setNotes] = useState('')

  const handleSave = async () => {
    if (!name.trim()) {
      showToast('请输入姓名')
      return
    }
    try {
      showLoading('保存中...')
      await contactApi.create({ name: name.trim(), notes: notes.trim() || undefined })
      hideLoading()
      showToast('已创建', 'success')
      Taro.navigateBack()
    } catch (error) {
      hideLoading()
      showToast('创建失败')
    }
  }

  return (
    <View className="contact-create-page">
      <Header title="添加联系人" showBack />
      <View className="content">
        <View className="field">
          <Text className="label">姓名</Text>
          <View className="input-wrapper">
            <Input
              className="input"
              type="text"
              placeholder="例如：张三"
              value={name}
              onInput={(e) => setName(e.detail.value)}
            />
          </View>
        </View>

        <View className="field">
          <Text className="label">备注</Text>
          <View className="input-wrapper">
            <Textarea
              className="textarea"
              placeholder="可选：公司/职位/关系/背景..."
              value={notes}
              onInput={(e) => setNotes(e.detail.value)}
              maxlength={1000}
            />
          </View>
        </View>

        <View className="save-btn" onClick={handleSave}>
          <Text className="save-text">保存</Text>
        </View>
      </View>
    </View>
  )
}

export default ContactCreatePage
