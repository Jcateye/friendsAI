import { View, Text, Input, Textarea } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import { useEffect, useState } from 'react'
import Header from '@/components/Header'
import { contactApi } from '@/services/api'
import { showToast, showLoading, hideLoading } from '@/utils'
import './index.scss'

const ContactEditPage: React.FC = () => {
  const router = useRouter()
  const { id } = router.params
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    const loadContact = async () => {
      if (!id) {
        showToast('联系人不存在')
        Taro.navigateBack()
        return
      }
      try {
        const contact = await contactApi.getDetail(id)
        setName(contact.name || '')
        setNotes(contact.notes || '')
      } catch (error) {
        showToast('加载失败')
      } finally {
        setLoading(false)
      }
    }
    loadContact()
  }, [id])

  const handleSave = async () => {
    if (!id) return
    if (!name.trim()) {
      showToast('请输入姓名')
      return
    }
    try {
      showLoading('保存中...')
      await contactApi.update(id, { name: name.trim(), notes: notes.trim() || undefined })
      hideLoading()
      showToast('已保存', 'success')
      Taro.navigateBack()
    } catch (error) {
      hideLoading()
      showToast('保存失败')
    }
  }

  return (
    <View className="contact-edit-page">
      <Header title="编辑联系人" showBack />
      <View className="content">
        {loading ? (
          <View className="loading-state">
            <Text>加载中...</Text>
          </View>
        ) : (
          <>
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
          </>
        )}
      </View>
    </View>
  )
}

export default ContactEditPage
