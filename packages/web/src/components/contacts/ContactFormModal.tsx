import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { api } from '../../lib/api'
import type { Contact, CreateContactRequest, UpdateContactRequest } from '../../lib/api/types'

interface ContactFormModalProps {
  isOpen: boolean
  onClose: () => void
  contact?: Contact | null
  onSuccess?: () => void
}

export function ContactFormModal({ isOpen, onClose, contact, onSuccess }: ContactFormModalProps) {
  const [formData, setFormData] = useState<CreateContactRequest>({
    name: '',
    email: '',
    phone: '',
    company: '',
    position: '',
    note: '',
    tags: [],
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tagInput, setTagInput] = useState('')

  const isEditMode = !!contact

  useEffect(() => {
    if (contact) {
      setFormData({
        name: contact.name || '',
        email: contact.email || '',
        phone: contact.phone || '',
        company: contact.company || '',
        position: contact.position || '',
        note: contact.note || '',
        tags: contact.tags || [],
      })
    } else {
      setFormData({
        name: '',
        email: '',
        phone: '',
        company: '',
        position: '',
        note: '',
        tags: [],
      })
    }
    setError(null)
    setTagInput('')
  }, [contact, isOpen])

  const handleChange = (field: keyof CreateContactRequest, value: string | string[]) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags?.includes(tagInput.trim())) {
      handleChange('tags', [...(formData.tags || []), tagInput.trim()])
      setTagInput('')
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    handleChange(
      'tags',
      formData.tags?.filter((tag) => tag !== tagToRemove) || []
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const trimmedName = formData.name?.trim()
    if (!trimmedName) {
      setError('姓名不能为空')
      return
    }

    setIsSubmitting(true)
    try {
      // 清理数据：将空字符串转换为 undefined，确保 name 字段正确
      const cleanData = {
        name: trimmedName,
        email: formData.email?.trim() || undefined,
        phone: formData.phone?.trim() || undefined,
        company: formData.company?.trim() || undefined,
        position: formData.position?.trim() || undefined,
        note: formData.note?.trim() || undefined,
        tags: formData.tags && formData.tags.length > 0 ? formData.tags : undefined,
      }

      if (isEditMode && contact) {
        await api.contacts.update(contact.id, cleanData as UpdateContactRequest)
      } else {
        await api.contacts.create(cleanData)
      }
      onSuccess?.()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : '操作失败')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md mx-4 bg-bg-card rounded-lg shadow-lg max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-text-primary font-display">
            {isEditMode ? '编辑联系人' : '新建联系人'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-bg-surface transition-colors"
            aria-label="关闭"
          >
            <X className="w-5 h-5 text-text-muted" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4">
          {error && (
            <div className="mb-4 p-3 bg-red-50 rounded-md">
              <span className="text-[13px] text-red-500 font-primary">{error}</span>
            </div>
          )}

          <div className="flex flex-col gap-4">
            {/* Name */}
            <div>
              <label className="block text-[13px] font-medium text-text-primary font-primary mb-1.5">
                姓名 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name || ''}
                onChange={(e) => handleChange('name', e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-border bg-bg-page text-text-primary font-primary text-[15px] focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="请输入姓名"
                required
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-[13px] font-medium text-text-primary font-primary mb-1.5">
                邮箱
              </label>
              <input
                type="email"
                value={formData.email || ''}
                onChange={(e) => handleChange('email', e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-border bg-bg-page text-text-primary font-primary text-[15px] focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="请输入邮箱"
              />
            </div>

            {/* Phone */}
            <div>
              <label className="block text-[13px] font-medium text-text-primary font-primary mb-1.5">
                电话
              </label>
              <input
                type="tel"
                value={formData.phone || ''}
                onChange={(e) => handleChange('phone', e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-border bg-bg-page text-text-primary font-primary text-[15px] focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="请输入电话"
              />
            </div>

            {/* Company */}
            <div>
              <label className="block text-[13px] font-medium text-text-primary font-primary mb-1.5">
                公司
              </label>
              <input
                type="text"
                value={formData.company || ''}
                onChange={(e) => handleChange('company', e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-border bg-bg-page text-text-primary font-primary text-[15px] focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="请输入公司"
              />
            </div>

            {/* Position */}
            <div>
              <label className="block text-[13px] font-medium text-text-primary font-primary mb-1.5">
                职位
              </label>
              <input
                type="text"
                value={formData.position || ''}
                onChange={(e) => handleChange('position', e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-border bg-bg-page text-text-primary font-primary text-[15px] focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="请输入职位"
              />
            </div>

            {/* Tags */}
            <div>
              <label className="block text-[13px] font-medium text-text-primary font-primary mb-1.5">
                标签
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleAddTag()
                    }
                  }}
                  className="flex-1 px-3 py-2 rounded-md border border-border bg-bg-page text-text-primary font-primary text-[15px] focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="输入标签后按回车添加"
                />
                <button
                  type="button"
                  onClick={handleAddTag}
                  className="px-4 py-2 bg-primary-tint text-primary rounded-md text-[13px] font-medium font-primary hover:opacity-90"
                >
                  添加
                </button>
              </div>
              {formData.tags && formData.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-primary-tint text-primary text-[12px] font-medium rounded font-primary"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="hover:text-primary/70"
                        aria-label={`删除标签 ${tag}`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Note */}
            <div>
              <label className="block text-[13px] font-medium text-text-primary font-primary mb-1.5">
                备注
              </label>
              <textarea
                value={formData.note || ''}
                onChange={(e) => handleChange('note', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 rounded-md border border-border bg-bg-page text-text-primary font-primary text-[15px] focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                placeholder="请输入备注"
              />
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="flex gap-2 p-4 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 px-4 py-2.5 bg-bg-surface text-text-primary rounded-md font-medium font-primary hover:bg-bg-card transition-colors disabled:opacity-50"
          >
            取消
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex-1 px-4 py-2.5 bg-primary text-white rounded-md font-medium font-primary hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {isSubmitting ? '保存中...' : isEditMode ? '保存' : '创建'}
          </button>
        </div>
      </div>
    </div>
  )
}

