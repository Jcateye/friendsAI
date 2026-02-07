import { Search, Settings, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface DrawerRecord {
  id: string
  title: string
  subtitle: string
  date: string
}

const mockRecords: DrawerRecord[] = [
  { id: '1', title: '今日记录', subtitle: '与张伟讨论项目', date: '2026/01/28' },
  { id: '2', title: '昨日记录', subtitle: '与李明确认合作', date: '2026/01/27' },
  { id: '3', title: '周会纪要', subtitle: '团队进度同步', date: '2026/01/26' },
]

const filterChips = ['全部', '未归档', '已归档']

interface GlobalDrawerProps {
  isOpen: boolean
  onClose: () => void
}

export function GlobalDrawer({ isOpen, onClose }: GlobalDrawerProps) {
  const navigate = useNavigate()

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/25"
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div className="absolute left-0 top-0 bottom-0 w-[300px] bg-bg-card rounded-r-lg flex flex-col">
        {/* Top Section */}
        <div className="flex flex-col gap-4 pt-[60px] px-4 pb-4">
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center"
          >
            <X className="w-5 h-5 text-text-muted" />
          </button>

          {/* Search */}
          <div className="flex items-center gap-2.5 h-11 px-3.5 bg-bg-page rounded-md">
            <Search className="w-[18px] h-[18px] text-text-muted" />
            <input
              type="text"
              placeholder="搜索会话记录..."
              className="flex-1 bg-transparent text-[14px] text-text-primary placeholder:text-text-muted outline-none font-primary"
            />
          </div>

          {/* Filter Chips */}
          <div className="flex gap-2">
            {filterChips.map((chip, index) => (
              <button
                key={chip}
                className={`px-3 py-1.5 rounded-full text-[12px] font-medium font-primary ${
                  index === 0
                    ? 'bg-primary text-white'
                    : 'bg-bg-surface text-text-secondary'
                }`}
              >
                {chip}
              </button>
            ))}
          </div>

          {/* Title */}
          <h2 className="text-[18px] font-semibold text-text-primary font-display">
            会话记录库
          </h2>
        </div>

        {/* Record List */}
        <div className="flex-1 flex flex-col px-4 overflow-y-auto">
          {mockRecords.map((record) => (
            <button
              key={record.id}
              onClick={() => {
                navigate(`/conversation/${record.id}`)
                onClose()
              }}
              className="flex items-center gap-3 py-3.5 border-b border-border text-left"
            >
              <div className="w-10 h-10 bg-primary-tint rounded-md flex items-center justify-center">
                <span className="text-primary text-sm">📝</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-medium text-text-primary font-primary truncate">
                  {record.title}
                </p>
                <p className="text-[13px] text-text-secondary font-primary truncate">
                  {record.subtitle}
                </p>
              </div>
              <span className="text-[11px] text-text-muted font-primary">
                {record.date}
              </span>
            </button>
          ))}
        </div>

        {/* Bottom Section */}
        <button
          onClick={() => {
            navigate('/settings')
            onClose()
          }}
          className="flex items-center gap-3 px-4 py-4 border-t border-border"
        >
          <Settings className="w-5 h-5 text-text-muted" />
          <span className="text-[14px] font-medium text-text-secondary font-primary">
            设置
          </span>
        </button>
      </div>
    </div>
  )
}
