import { Search, Settings } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useState } from 'react'

interface DrawerRecord {
  id: string
  title: string
  subtitle: string
  date: string
  timeDisplay?: string
  status?: 'archived' | 'pending' | 'draft'
}

interface GlobalDrawerProps {
  isOpen: boolean
  onClose: () => void
  records?: DrawerRecord[]
}

const filterChips = [
  { key: 'all', label: '全部' },
  { key: 'pending', label: '待确认' },
  { key: 'archived', label: '已归档' },
]

const getStatusColor = (status?: string) => {
  switch (status) {
    case 'archived':
      return 'bg-primary-tint text-primary'
    case 'pending':
      return 'bg-accent-tint text-accent'
    default:
      return 'bg-bg-surface text-text-muted'
  }
}

const getStatusLabel = (status?: string) => {
  switch (status) {
    case 'archived':
      return '已归档'
    case 'pending':
      return '待确认'
    case 'draft':
      return '草稿'
    default:
      return ''
  }
}

export function GlobalDrawer({ isOpen, onClose, records = [] }: GlobalDrawerProps) {
  const navigate = useNavigate()
  const [activeFilter, setActiveFilter] = useState('all')

  if (!isOpen) return null

  const filteredRecords =
    activeFilter === 'all'
      ? records
      : records.filter((r) => r.status === activeFilter)

  return (
    <div className="fixed inset-0 z-50">
      {/* Overlay - #00000040 = bg-black/25 */}
      <div
        className="absolute inset-0 bg-black/25"
        onClick={onClose}
      />

      {/* Drawer Panel - 300px width, right side rounded */}
      <div className="absolute left-0 top-0 bottom-0 w-[300px] bg-white rounded-r-[16px] flex flex-col shadow-xl">
        {/* Top Section */}
        <div className="flex flex-col gap-4 pt-[60px] px-4 pb-4">
          {/* Search */}
          <div className="flex items-center gap-2.5 h-11 px-3.5 bg-[#F7F6F3] rounded-[12px]">
            <Search className="w-[18px] h-[18px] text-[#8E8E93]" />
            <input
              type="text"
              placeholder="搜索人名/关键词/日期"
              className="flex-1 bg-transparent text-[14px] text-[#2D2D2D] placeholder:text-[#8E8E93] outline-none font-primary"
            />
          </div>

          {/* Filter Chips */}
          <div className="flex gap-2">
            {filterChips.map((chip) => (
              <button
                key={chip.key}
                onClick={() => setActiveFilter(chip.key)}
                className={`px-3 h-[30px] rounded-full text-[12px] font-medium font-primary ${
                  activeFilter === chip.key
                    ? 'bg-[#7C9070] text-white'
                    : 'bg-[#F7F6F3] text-[#6B6B6B]'
                }`}
              >
                {chip.label}
              </button>
            ))}
          </div>

          {/* Title - font-display = Fraunces, 18px, 600 */}
          <h2 className="text-[18px] font-semibold text-[#2D2D2D] font-display">
            会话记录库
          </h2>
        </div>

        {/* Record List */}
        <div className="flex-1 flex flex-col px-4 overflow-y-auto">
          {filteredRecords.length === 0 ? (
            <div className="flex items-center justify-center h-full text-[#8E8E93] text-[14px] font-primary">
              暂无记录
            </div>
          ) : (
            filteredRecords.map((record) => (
              <button
                key={record.id}
                onClick={() => {
                  navigate(`/conversation/${record.id}`)
                  onClose()
                }}
                className="flex items-center gap-3 py-3.5 border-b border-[#F0EFEC] text-left w-full"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-semibold text-[#2D2D2D] font-primary truncate">
                    {record.title}
                  </p>
                  <p className="text-[12px] text-[#6B6B6B] font-primary truncate">
                    {record.subtitle}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className="text-[11px] text-[#8E8E93] font-primary">
                    {record.timeDisplay || record.date}
                  </span>
                  {record.status && (
                    <span
                      className={`text-[10px] font-medium font-primary px-1.5 py-0.5 rounded ${getStatusColor(
                        record.status,
                      )}`}
                    >
                      {getStatusLabel(record.status)}
                    </span>
                  )}
                </div>
              </button>
            ))
          )}
        </div>

        {/* Bottom Section - Settings */}
        <button
          onClick={() => {
            navigate('/settings')
            onClose()
          }}
          className="flex items-center justify-center gap-3 px-4 py-4 border-t border-[#F0EFEC] shrink-0"
        >
          <Settings className="w-5 h-5 text-[#8E8E93]" />
          <span className="text-[14px] font-medium text-[#6B6B6B] font-primary">
            设置
          </span>
        </button>
      </div>
    </div>
  )
}
