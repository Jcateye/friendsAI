import { ChevronRight, Clock, Sparkles, BarChart3 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Header } from '../../components/layout/Header'

interface FollowUpItem {
  id: string
  name: string
  reason: string
  daysAgo: number
}

interface SuggestionItem {
  id: string
  name: string
  reason: string
  opener: string
}

const mockFollowUps: FollowUpItem[] = [
  { id: '1', name: '张伟', reason: '3天未联系，有待跟进事项', daysAgo: 3 },
  { id: '2', name: '李明', reason: '上次约定本周回复', daysAgo: 5 },
]

const mockSuggestions: SuggestionItem[] = [
  {
    id: '1',
    name: '王芳',
    reason: '最近有新动态，可能有合作机会',
    opener: '最近看到贵公司的新产品发布...',
  },
]

export function ActionsPage() {
  const navigate = useNavigate()

  return (
    <div className="flex flex-col h-full">
      <Header title="行动" showMenu />

      {/* Scroll Content */}
      <div className="flex-1 flex flex-col gap-4 p-4 overflow-y-auto">
        {/* Follow Up Card */}
        <div className="bg-bg-card rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-border">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-warning" />
              <span className="text-[14px] font-semibold text-text-primary font-primary">
                待跟进
              </span>
              <span className="px-1.5 py-0.5 bg-warning-tint text-warning text-[11px] font-medium rounded font-primary">
                {mockFollowUps.length}
              </span>
            </div>
            <ChevronRight className="w-5 h-5 text-text-muted" />
          </div>

          <div className="flex flex-col">
            {mockFollowUps.map((item, index) => (
              <button
                key={item.id}
                onClick={() => navigate(`/contacts/${item.id}`)}
                className={`flex items-center gap-3 px-4 py-3 text-left ${
                  index < mockFollowUps.length - 1 ? 'border-b border-border' : ''
                }`}
              >
                <div className="w-10 h-10 bg-warning-tint rounded-md flex items-center justify-center">
                  <span className="text-warning font-semibold">
                    {item.name[0]}
                  </span>
                </div>
                <div className="flex-1">
                  <p className="text-[14px] font-medium text-text-primary font-primary">
                    {item.name}
                  </p>
                  <p className="text-[13px] text-text-secondary font-primary">
                    {item.reason}
                  </p>
                </div>
                <span className="text-[12px] text-text-muted font-primary">
                  {item.daysAgo}天前
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Suggestions Card */}
        <div className="bg-bg-card rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-border">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-[14px] font-semibold text-text-primary font-primary">
                AI 建议联系
              </span>
            </div>
            <ChevronRight className="w-5 h-5 text-text-muted" />
          </div>

          <div className="flex flex-col gap-3 px-4 py-3">
            {mockSuggestions.map((item) => (
              <div
                key={item.id}
                className="flex flex-col gap-2 p-3 bg-primary-tint rounded-md"
              >
                <div className="flex items-center gap-2">
                  <span className="text-[14px] font-medium text-text-primary font-primary">
                    {item.name}
                  </span>
                  <span className="text-[13px] text-text-secondary font-primary">
                    · {item.reason}
                  </span>
                </div>
                <p className="text-[13px] text-primary font-primary italic">
                  "{item.opener}"
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Weekly Review Card */}
        <div className="bg-bg-card rounded-lg p-4 flex flex-col gap-3">
          <span className="text-[16px] font-semibold text-text-primary font-display">
            本周回顾
          </span>
          <div className="flex gap-3">
            <div className="flex-1 flex flex-col items-center gap-1 p-3 bg-bg-surface rounded-md">
              <BarChart3 className="w-5 h-5 text-primary" />
              <span className="text-[20px] font-semibold text-text-primary font-primary">
                12
              </span>
              <span className="text-[12px] text-text-muted font-primary">
                互动次数
              </span>
            </div>
            <div className="flex-1 flex flex-col items-center gap-1 p-3 bg-bg-surface rounded-md">
              <span className="text-[20px] font-semibold text-text-primary font-primary">
                5
              </span>
              <span className="text-[12px] text-text-muted font-primary">
                新联系人
              </span>
            </div>
            <div className="flex-1 flex flex-col items-center gap-1 p-3 bg-bg-surface rounded-md">
              <span className="text-[20px] font-semibold text-text-primary font-primary">
                3
              </span>
              <span className="text-[12px] text-text-muted font-primary">
                待跟进
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
