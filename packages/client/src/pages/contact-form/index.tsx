import { useEffect, useMemo, useState } from 'react'
import { View, Text, Input } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import Header from '../../components/Header'
import { contactApi } from '../../services/api'
import { showToast } from '../../utils'
import './index.scss'

type ContactFormState = {
  name: string
  email: string
  phone: string
  company: string
  position: string
  tags: string
}

const emptyState: ContactFormState = {
  name: '',
  email: '',
  phone: '',
  company: '',
  position: '',
  tags: '',
}

const ContactFormPage: React.FC = () => {
  const router = useRouter()
  const contactId = useMemo(() => router.params?.id, [router.params])
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState<ContactFormState>(emptyState)

  useEffect(() => {
    const loadContact = async () => {
      if (!contactId) return
      try {
        setLoading(true)
        const detail = await contactApi.getDetail(contactId)
        setForm({
          name: detail.name || '',
          email: '',
          phone: '',
          company: detail.company || '',
          position: detail.role || '',
          tags: (detail.tags || []).join(', '),
        })
      } catch (error) {
        console.error('Failed to load contact for edit:', error)
        showToast('加载联系人失败')
      } finally {
        setLoading(false)
      }
    }

    loadContact()
  }, [contactId])

  const handleChange = (key: keyof ContactFormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      showToast('请输入联系人姓名')
      return
    }

    const payload = {
      name: form.name.trim(),
      email: form.email.trim() || undefined,
      phone: form.phone.trim() || undefined,
      company: form.company.trim() || undefined,
      position: form.position.trim() || undefined,
      tags: form.tags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
    }

    try {
      setLoading(true)
      showToast('保存中...', 'loading')
      if (contactId) {
        await contactApi.update(contactId, payload)
        showToast('联系人已更新', 'success')
      } else {
        await contactApi.create(payload)
        showToast('联系人已创建', 'success')
      }
      Taro.navigateBack()
    } catch (error) {
      console.error('Failed to submit contact:', error)
      showToast('保存失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <View className="contact-form-page">
      <Header
        title={contactId ? '编辑联系人' : '新增联系人'}
        showBack
        onBack={() => Taro.navigateBack()}
      />
      <View className="form-content">
        <View className="form-card">
          <View className="field-row">
            <Text className="field-label">姓名</Text>
            <Input
              className="field-input"
              placeholder="请输入姓名"
              value={form.name}
              onInput={(e) => handleChange('name', e.detail.value)}
            />
          </View>
          <View className="field-row">
            <Text className="field-label">邮箱</Text>
            <Input
              className="field-input"
              placeholder="请输入邮箱"
              value={form.email}
              onInput={(e) => handleChange('email', e.detail.value)}
            />
          </View>
          <View className="field-row">
            <Text className="field-label">电话</Text>
            <Input
              className="field-input"
              placeholder="请输入电话"
              value={form.phone}
              onInput={(e) => handleChange('phone', e.detail.value)}
            />
          </View>
          <View className="field-row">
            <Text className="field-label">公司</Text>
            <Input
              className="field-input"
              placeholder="请输入公司"
              value={form.company}
              onInput={(e) => handleChange('company', e.detail.value)}
            />
          </View>
          <View className="field-row">
            <Text className="field-label">职位</Text>
            <Input
              className="field-input"
              placeholder="请输入职位"
              value={form.position}
              onInput={(e) => handleChange('position', e.detail.value)}
            />
          </View>
          <View className="field-row">
            <Text className="field-label">标签</Text>
            <Input
              className="field-input"
              placeholder="多个标签用逗号分隔"
              value={form.tags}
              onInput={(e) => handleChange('tags', e.detail.value)}
            />
            <Text className="tag-hint">示例：重要客户, 老同学</Text>
          </View>
        </View>

        <View
          className={`submit-btn ${loading ? 'disabled' : ''}`}
          onClick={() => !loading && handleSubmit()}
        >
          <Text>{loading ? '保存中...' : '保存联系人'}</Text>
        </View>
      </View>
    </View>
  )
}

export default ContactFormPage
