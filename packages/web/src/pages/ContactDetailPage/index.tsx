import { Copy, RefreshCw, ChevronRight } from 'lucide-react'
import { Header } from '../../components/layout/Header'

interface TimelineEvent {
  id: string
  date: string
  title: string
  description: string
}

const mockEvents: TimelineEvent[] = [
  {
    id: '1',
    date: '2026/01/28',
    title: '项目讨论',
    description: '讨论了Q1投资计划，张伟表示对AI领域很感兴趣',
  },
  {
    id: '2',
    date: '2026/01/20',
    title: '初次见面',
    description: '在创业活动上认识，交换了联系方式',
  },
]

export function ContactDetailPage() {
  return (
    <div className="flex flex-col h-full">
      <Header title="联系人详情" showBack showEdit />

      {/* Scroll Content */}
      <div className="flex-1 flex flex-col gap-4 p-4 overflow-y-auto">
        {/* Profile Card */}
        <div className="flex items-center gap-4 p-5 bg-bg-card rounded-lg">
          <div className="w-16 h-16 rounded-lg bg-[#C9B8A8] flex items-center justify-center">
            <span className="text-white text-2xl font-semibold">张</span>
          </div>
          <div className="flex-1 flex flex-col gap-1">
            <h2 className="text-[18px] font-semibold text-text-primary font-display">
              张伟
            </h2>
            <p className="text-[14px] text-text-secondary font-primary">
              某投资公司 · 合伙人
            </p>
            <div className="flex gap-2 mt-1">
              <span className="px-2 py-0.5 bg-primary-tint text-primary text-[11px] font-medium rounded font-primary">
                投资人
              </span>
              <span className="px-2 py-0.5 bg-warning-tint text-warning text-[11px] font-medium rounded font-primary">
                重要
              </span>
            </div>
          </div>
        </div>

        {/* Briefing Card */}
        <div className="bg-bg-card rounded-lg shadow-sm overflow-hidden">
          {/* Briefing Header */}
          <div className="flex items-center justify-between px-5 py-4 bg-primary-tint">
            <span className="text-[14px] font-semibold text-text-primary font-primary">
              会前简报
            </span>
            <div className="flex items-center gap-3">
              <button className="flex items-center gap-1 text-[13px] text-primary font-medium font-primary">
                <RefreshCw className="w-4 h-4" />
                刷新
              </button>
              <button className="flex items-center gap-1 text-[13px] text-primary font-medium font-primary">
                <Copy className="w-4 h-4" />
                复制
              </button>
            </div>
          </div>

          {/* Briefing Content */}
          <div className="flex flex-col gap-4 p-5">
            <div>
              <h4 className="text-[13px] font-semibold text-text-secondary font-primary mb-2">
                关键信息
              </h4>
              <p className="text-[14px] text-text-primary font-primary leading-relaxed">
                张伟是某投资公司合伙人，专注AI领域投资。上次见面讨论了Q1投资计划，对你的项目表示浓厚兴趣。
              </p>
            </div>
            <div>
              <h4 className="text-[13px] font-semibold text-text-secondary font-primary mb-2">
                待跟进事项
              </h4>
              <ul className="list-disc list-inside text-[14px] text-text-primary font-primary">
                <li>发送项目BP</li>
                <li>安排下次会议</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Timeline Section */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-[14px] font-semibold text-text-primary font-primary">
              互动时间轴
            </span>
            <button className="text-[13px] text-text-muted font-primary flex items-center gap-1">
              查看全部
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {mockEvents.map((event) => (
            <div
              key={event.id}
              className="flex flex-col gap-3 p-3.5 bg-bg-card rounded-md"
            >
              <div className="flex items-center justify-between">
                <span className="text-[13px] text-text-muted font-primary">
                  {event.date}
                </span>
                <span className="text-[13px] font-medium text-text-primary font-primary">
                  {event.title}
                </span>
              </div>
              <p className="text-[14px] text-text-secondary font-primary">
                {event.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
