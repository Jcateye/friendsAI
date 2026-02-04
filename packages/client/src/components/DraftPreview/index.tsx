import { View, Text } from '@tarojs/components'
import { useEffect, useState } from 'react'
import './index.scss'

export interface DraftItem {
  id?: string
  title?: string
  content: string
  meta?: string
  badgeText?: string
}

interface DraftPreviewProps {
  drafts?: DraftItem[]
  selectedIndex?: number
  title?: string
  emptyText?: string
  onSelect?: (index: number) => void
}

const DraftPreview: React.FC<DraftPreviewProps> = ({
  drafts = [],
  selectedIndex,
  title = '草稿预览',
  emptyText = '暂无草稿内容',
  onSelect,
}) => {
  const [localIndex, setLocalIndex] = useState(0)
  const resolvedIndex = selectedIndex ?? localIndex

  useEffect(() => {
    if (selectedIndex !== undefined) {
      setLocalIndex(selectedIndex)
      return
    }
    if (resolvedIndex >= drafts.length && drafts.length > 0) {
      setLocalIndex(0)
    }
  }, [selectedIndex, drafts.length, resolvedIndex])

  const handleSelect = (index: number) => {
    if (index === resolvedIndex) return
    if (selectedIndex === undefined) {
      setLocalIndex(index)
    }
    onSelect?.(index)
  }

  return (
    <View className="draft-preview">
      {title && <Text className="draft-preview-label">{title}</Text>}

      {drafts.length === 0 ? (
        <View className="draft-preview-empty">
          <Text className="draft-preview-empty-text">{emptyText}</Text>
        </View>
      ) : (
        <View className="draft-preview-list">
          {drafts.map((draft, index) => {
            const selected = index === resolvedIndex
            const label = draft.title || `草稿 ${index + 1}`
            return (
              <View
                key={draft.id ?? `${label}-${index}`}
                className={`draft-preview-item ${selected ? 'selected' : ''}`}
                onClick={() => handleSelect(index)}
              >
                <View className={`draft-preview-radio ${selected ? 'checked' : ''}`}>
                  {selected && <View className="draft-preview-radio-dot" />}
                </View>
                <View className="draft-preview-info">
                  <View className="draft-preview-header">
                    <Text className="draft-preview-title">{label}</Text>
                    {draft.badgeText && (
                      <View className="draft-preview-badge">
                        <Text className="draft-preview-badge-text">{draft.badgeText}</Text>
                      </View>
                    )}
                  </View>
                  <Text className="draft-preview-content">{draft.content}</Text>
                  {draft.meta && <Text className="draft-preview-meta">{draft.meta}</Text>}
                </View>
              </View>
            )
          })}
        </View>
      )}
    </View>
  )
}

export default DraftPreview
