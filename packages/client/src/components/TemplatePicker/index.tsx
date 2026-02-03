import { View, Text } from '@tarojs/components'
import type { MessageTemplate } from '@/types'
import './index.scss'

interface TemplatePickerProps {
  templates?: MessageTemplate[]
  value?: string
  label?: string
  emptyText?: string
  onChange?: (templateId: string) => void
}

const TemplatePicker: React.FC<TemplatePickerProps> = ({
  templates = [],
  value = '',
  label = '选择模板',
  emptyText = '暂无可用模板',
  onChange,
}) => {
  const handleSelect = (templateId: string) => {
    if (templateId === value) return
    onChange?.(templateId)
  }

  return (
    <View className="template-picker">
      <Text className="template-picker-label">{label}</Text>
      <View className="template-picker-list">
        {templates.length === 0 ? (
          <View className="template-picker-empty">
            <Text className="template-picker-empty-text">{emptyText}</Text>
          </View>
        ) : (
          templates.map((template) => {
            const selected = template.id === value
            return (
              <View
                key={template.id}
                className={`template-picker-item ${selected ? 'selected' : ''}`}
                onClick={() => handleSelect(template.id)}
              >
                <View className={`template-picker-radio ${selected ? 'checked' : ''}`}>
                  {selected && <View className="template-picker-radio-dot" />}
                </View>
                <View className="template-picker-info">
                  <Text className="template-picker-name">{template.name}</Text>
                  <Text className="template-picker-desc">{template.description}</Text>
                </View>
              </View>
            )
          })
        )}
      </View>
    </View>
  )
}

export default TemplatePicker
