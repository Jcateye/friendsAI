import { RootPortal, View, Text } from '@tarojs/components'
import './index.scss'

interface ConfirmBarProps {
  visible: boolean
  title: string
  description?: string
  hintText?: string
  confirmText?: string
  cancelText?: string
  confirmDisabled?: boolean
  maskClosable?: boolean
  onConfirm: () => void
  onCancel: () => void
}

const ConfirmBar: React.FC<ConfirmBarProps> = ({
  visible,
  title,
  description,
  hintText,
  confirmText = '确认执行',
  cancelText = '取消',
  confirmDisabled = false,
  maskClosable = false,
  onConfirm,
  onCancel,
}) => {
  if (!visible) return null

  const handleConfirm = () => {
    if (!confirmDisabled) {
      onConfirm()
    }
  }

  const handleMaskClick = () => {
    if (maskClosable) {
      onCancel()
    }
  }

  return (
    <RootPortal>
      <View className="confirm-bar-root">
        <View className="confirm-bar-mask" onClick={handleMaskClick} />
        <View className="confirm-bar" onClick={(e) => e.stopPropagation()}>
          <View className="confirm-bar-head">
            <View className="confirm-icon">
              <View className="icon-alert" />
            </View>
            <View className="confirm-texts">
              <Text className="confirm-title">{title}</Text>
              {description && <Text className="confirm-desc">{description}</Text>}
              {hintText && <Text className="confirm-hint">{hintText}</Text>}
            </View>
          </View>

          <View className="confirm-actions">
            <View className="cancel-btn" onClick={onCancel}>
              <Text className="cancel-text">{cancelText}</Text>
            </View>
            <View
              className={`confirm-btn ${confirmDisabled ? 'disabled' : ''}`}
              onClick={handleConfirm}
            >
              <Text className="confirm-text">{confirmText}</Text>
            </View>
          </View>
        </View>
      </View>
    </RootPortal>
  )
}

export default ConfirmBar
