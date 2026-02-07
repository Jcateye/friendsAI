import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Mic, Image, Send, ChevronRight } from 'lucide-react'
import { Header } from '../../components/layout/Header'

interface RecentRecord {
  id: string
  title: string
  subtitle: string
  time: string
}

const mockRecords: RecentRecord[] = [
  {
    id: '1',
    title: '今日记录 2026/01/28',
    subtitle: '与张伟讨论了项目进度',
    time: '10:30',
  },
  {
    id: '2',
    title: '昨日记录 2026/01/27',
    subtitle: '与李明确认了合作细节',
    time: '昨天',
  },
  {
    id: '3',
    title: '2026/01/26',
    subtitle: '团队周会纪要',
    time: '2天前',
  },
]

export function ChatPage() {
  const navigate = useNavigate()
  const [inputText, setInputText] = useState('')

  const handleSubmit = () => {
    if (!inputText.trim()) return
    // TODO: Send message to AI
    navigate('/conversation/new')
  }

  return (
    <div className="flex flex-col h-full">
      <Header title="对话" showMenu showNewChat />

      {/* Main Content */}
      <div className="flex-1 flex flex-col gap-5 p-4 overflow-y-auto">
        {/* Input Card */}
        <div className="bg-bg-card rounded-lg p-5 shadow-sm flex flex-col gap-4">
          {/* Input Area */}
          <div className="bg-bg-surface rounded-md p-4 min-h-[100px]">
            <textarea
              placeholder="写下今天的记录，或问我任何问题..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="w-full h-full bg-transparent text-[15px] text-text-primary placeholder:text-text-muted outline-none resize-none font-primary"
              rows={3}
            />
          </div>

          {/* Input Actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button className="w-9 h-9 flex items-center justify-center rounded-full bg-bg-surface">
                <Mic className="w-5 h-5 text-text-muted" />
              </button>
              <button className="w-9 h-9 flex items-center justify-center rounded-full bg-bg-surface">
                <Image className="w-5 h-5 text-text-muted" />
              </button>
            </div>
            <button
              onClick={handleSubmit}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-primary"
            >
              <Send className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* Recent Section */}
        <div className="flex flex-col gap-3">
          {/* Recent Header */}
          <div className="flex items-center justify-between">
            <span className="text-[14px] font-semibold text-text-primary font-primary">
              最近记录
            </span>
            <button className="text-[13px] text-text-muted font-primary flex items-center gap-1">
              查看全部
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Record List */}
          {mockRecords.map((record) => (
            <button
              key={record.id}
              onClick={() => navigate(`/conversation/${record.id}`)}
              className="flex items-center gap-3 p-4 bg-bg-card rounded-md text-left"
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
              <span className="text-[12px] text-text-muted font-primary">
                {record.time}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
