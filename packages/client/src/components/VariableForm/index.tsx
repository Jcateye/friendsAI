import { View, Text, Input, Textarea, Picker } from '@tarojs/components'
import { useEffect, useMemo, useState } from 'react'
import './index.scss'

export interface VariableOption {
  label: string
  value: string | number
}

export type VariableFieldType = 'text' | 'number' | 'date' | 'textarea' | 'select'

export interface VariableField {
  name: string
  label: string
  placeholder?: string
  required?: boolean
  type?: VariableFieldType
  options?: VariableOption[]
  value?: string | number
  helperText?: string
  multiline?: boolean
  rows?: number
  maxLength?: number
}

interface VariableFormProps {
  variables?: VariableField[]
  values?: Record<string, string | number>
  title?: string
  description?: string
  emptyText?: string
  aiHintText?: string
  onChange?: (values: Record<string, string | number>) => void
  onFieldChange?: (name: string, value: string | number) => void
}

const VariableForm: React.FC<VariableFormProps> = ({
  variables = [],
  values,
  title = '填写内容',
  description,
  emptyText = '暂无需填写的变量',
  aiHintText,
  onChange,
  onFieldChange,
}) => {
  const initialValues = useMemo(() => {
    const nextValues: Record<string, string | number> = {}
    variables.forEach((variable) => {
      if (!variable?.name) return
      if (variable.value !== undefined) {
        nextValues[variable.name] = variable.value
      } else {
        nextValues[variable.name] = ''
      }
    })
    return nextValues
  }, [variables])

  const [localValues, setLocalValues] = useState<Record<string, string | number>>(initialValues)

  useEffect(() => {
    if (values) return
    setLocalValues(initialValues)
  }, [initialValues, values])

  const resolvedValues = values ?? localValues

  const updateValue = (name: string, nextValue: string | number) => {
    const nextValues = { ...resolvedValues, [name]: nextValue }
    if (!values) {
      setLocalValues(nextValues)
    }
    onChange?.(nextValues)
    onFieldChange?.(name, nextValue)
  }

  const renderFieldControl = (field: VariableField) => {
    const currentValue = resolvedValues[field.name] ?? ''
    const isTextarea = field.type === 'textarea' || field.multiline
    const maxLength = field.maxLength ?? 500

    if (field.type === 'select' && field.options?.length) {
      const selectedIndex = field.options.findIndex((option) => option.value === currentValue)
      const selectedOption = selectedIndex >= 0 ? field.options[selectedIndex] : null

      return (
        <Picker
          mode="selector"
          range={field.options}
          rangeKey="label"
          value={selectedIndex >= 0 ? selectedIndex : 0}
          onChange={(event) => {
            const nextIndex = Number(event.detail.value)
            const nextOption = field.options?.[nextIndex]
            if (nextOption) {
              updateValue(field.name, nextOption.value)
            }
          }}
        >
          <View className={`field-input field-select ${selectedOption ? '' : 'is-placeholder'}`}>
            <Text className={`field-select-text ${selectedOption ? '' : 'is-placeholder'}`}>
              {selectedOption?.label || field.placeholder || '请选择'}
            </Text>
          </View>
        </Picker>
      )
    }

    if (field.type === 'date') {
      const displayValue = typeof currentValue === 'string' ? currentValue : ''
      return (
        <Picker
          mode="date"
          value={displayValue}
          onChange={(event) => updateValue(field.name, event.detail.value)}
        >
          <View className={`field-input field-select ${displayValue ? '' : 'is-placeholder'}`}>
            <Text className={`field-select-text ${displayValue ? '' : 'is-placeholder'}`}>
              {displayValue || field.placeholder || '请选择日期'}
            </Text>
          </View>
        </Picker>
      )
    }

    if (isTextarea) {
      return (
        <Textarea
          className="field-input field-textarea"
          value={String(currentValue)}
          maxlength={maxLength}
          placeholder={field.placeholder}
          autoHeight={false}
          onInput={(event) => updateValue(field.name, event.detail.value)}
        />
      )
    }

    return (
      <Input
        className="field-input"
        value={String(currentValue)}
        type={field.type === 'number' ? 'number' : 'text'}
        maxlength={maxLength}
        placeholder={field.placeholder}
        onInput={(event) => updateValue(field.name, event.detail.value)}
      />
    )
  }

  return (
    <View className="variable-form">
      {title && <Text className="variable-form-title">{title}</Text>}
      {description && <Text className="variable-form-desc">{description}</Text>}

      {variables.length === 0 ? (
        <View className="variable-form-empty">
          <Text className="variable-form-empty-text">{emptyText}</Text>
        </View>
      ) : (
        <View className="variable-form-list">
          {variables.map((field) => (
            <View key={field.name} className="variable-form-field">
              <View className="field-label-row">
                <Text className="field-label">{field.label}</Text>
                {field.required && <Text className="field-required">*</Text>}
              </View>
              {renderFieldControl(field)}
              {field.helperText && <Text className="field-helper">{field.helperText}</Text>}
            </View>
          ))}
        </View>
      )}

      {aiHintText && (
        <View className="variable-form-ai-hint">
          <View className="ai-hint-icon" />
          <Text className="ai-hint-text">{aiHintText}</Text>
        </View>
      )}
    </View>
  )
}

export default VariableForm
