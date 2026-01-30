import { View, Text, Textarea, ScrollView } from '@tarojs/components'
import { useState } from 'react'
import type { MessageTemplate } from '@/types'
import './index.scss'

interface BottomSheetProps {
  visible: boolean
  title: string
  subtitle?: string
  templates: MessageTemplate[]
  initialContent?: string
  onClose: () => void
  onSend: (templateId: string, content: string) => void
}

const BottomSheet: React.FC<BottomSheetProps> = ({
  visible,
  title,
  subtitle,
  templates,
  initialContent = '',
  onClose,
  onSend,
}) => {
  const [selectedTemplate, setSelectedTemplate] = useState(templates[0]?.id || '')
  const [content, setContent] = useState(initialContent)

  const handleSend = () => {
    if (selectedTemplate && content.trim()) {
      onSend(selectedTemplate, content)
    }
  }

  if (!visible) return null

  return (
    <View className="bottom-sheet-overlay" onClick={onClose}>
      <View className="bottom-sheet" onClick={(e) => e.stopPropagation()}>
        <View className="sheet-handle">
          <View className="handle-bar" />
        </View>

        <View className="sheet-header">
          <View className="header-left">
            <View className="header-icon">
              <View className="icon-send" />
            </View>
            <View className="header-titles">
              <Text className="sheet-title">{title}</Text>
              {subtitle && <Text className="sheet-subtitle">{subtitle}</Text>}
            </View>
          </View>
          <View className="close-btn" onClick={onClose}>
            <View className="icon-x" />
          </View>
        </View>

        <ScrollView className="sheet-content" scrollY>
          <View className="template-section">
            <Text className="section-label">选择模板</Text>
            <View className="template-list">
              {templates.map((template) => (
                <View
                  key={template.id}
                  className={`template-item ${selectedTemplate === template.id ? 'selected' : ''}`}
                  onClick={() => setSelectedTemplate(template.id)}
                >
                  <View className={`radio ${selectedTemplate === template.id ? 'checked' : ''}`}>
                    {selectedTemplate === template.id && <View className="radio-dot" />}
                  </View>
                  <View className="template-info">
                    <Text className="template-name">{template.name}</Text>
                    <Text className="template-desc">{template.description}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          <View className="variable-section">
            <Text className="section-label">填写内容</Text>
            <View className="field">
              <Text className="field-label">跟进内容</Text>
              <Textarea
                className="field-input"
                value={content}
                onInput={(e) => setContent(e.detail.value)}
                placeholder="请输入内容..."
                maxlength={500}
              />
            </View>
            {initialContent && (
              <View className="ai-suggest">
                <View className="icon-sparkles" />
                <Text className="suggest-text">AI 已根据上下文自动填充内容</Text>
              </View>
            )}
          </View>
        </ScrollView>

        <View className="action-bar">
          <View className="cancel-btn" onClick={onClose}>
            <Text className="cancel-text">取消</Text>
          </View>
          <View className="send-btn" onClick={handleSend}>
            <View className="icon-send-white" />
            <Text className="send-text">发送消息</Text>
          </View>
        </View>
      </View>
    </View>
  )
}

export default BottomSheet
