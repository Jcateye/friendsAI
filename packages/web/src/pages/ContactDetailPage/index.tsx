import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Copy, RefreshCw, ChevronRight, FlaskConical } from 'lucide-react'
import { Header } from '../../components/layout/Header'
import { useDemoMode } from '../../contexts/DemoModeContext'
import { api } from '../../lib/api'
import type { Contact as ApiContact, ContactContext } from '../../lib/api/types'

interface TimelineEvent {
  id: string
  date: string
  title: string
  description: string
}

// 模拟数据
const mockContact: {
  id: string
  name: string
  initials: string
  color: string
  company: string
  position: string
  tags: Array<{ label: string; type: 'primary' | 'warning' }>
  briefing: {
    keyInfo: string
    todos: string[]
  }
} = {
  id: '1',
  name: '张伟',
  initials: '张',
  color: '#C9B8A8',
  company: '某投资公司',
  position: '合伙人',
  tags: [
    { label: '投资人', type: 'primary' },
    { label: '重要', type: 'warning' },
  ],
  briefing: {
    keyInfo: '张伟是某投资公司合伙人，专注AI领域投资。上次见面讨论了Q1投资计划，对你的项目表示浓厚兴趣。',
    todos: ['发送项目BP', '安排下次会议'],
  },
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

const colors = ['#C9B8A8', '#7C9070', '#5B9BD5', '#E57373', '#81C784', '#64B5F6', '#FFB74D', '#BA68C8']

function getNameColor(name: string): string {
  const colorIndex = name.charCodeAt(0) % colors.length
  return colors[colorIndex]
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '/')
}

export function ContactDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { isDemoMode } = useDemoMode()

  // Demo Mode data
  const demoData = {
    contact: mockContact,
    events: mockEvents,
    loading: false,
    error: null,
  }

  // Real API data
  const [realContact, setRealContact] = useState<ApiContact | null>(null)
  const [realContext, setRealContext] = useState<ContactContext | null>(null)
  const [realLoading, setRealLoading] = useState(false)
  const [realError, setRealError] = useState<string | null>(null)

  useEffect(() => {
    if (!isDemoMode && id) {
      setRealLoading(true)
      setRealError(null)
      Promise.all([api.contacts.get(id), api.contacts.getContext(id)])
        .then(([contactData, contextData]) => {
          setRealContact(contactData)
          setRealContext(contextData)
        })
        .catch((error) => {
          setRealError(error instanceof Error ? error.message : '加载失败')
        })
        .finally(() => {
          setRealLoading(false)
        })
    }
  }, [isDemoMode, id])

  const contact = isDemoMode ? null : (realContact ? toDemoContact(realContact, realContext) : null)
  const events = isDemoMode ? demoData.events : (realContext ? toTimelineEvents(realContext) : [])
  const loading = isDemoMode ? demoData.loading : realLoading
  const error = isDemoMode ? demoData.error : realError

  // 如果是 demo 模式，使用 mock 数据；否则使用 API 数据
  const displayContact = isDemoMode ? mockContact : (contact || mockContact)
  const displayEvents = isDemoMode ? mockEvents : events

  if (loading) {
    return (
      <div className="flex flex-col h-full">
        <Header title="联系人详情" showBack />
        <div className="flex-1 flex items-center justify-center">
          <span className="text-text-muted text-[14px] font-primary">加载中...</span>
        </div>
      </div>
    )
  }

  if (error && !isDemoMode) {
    return (
      <div className="flex flex-col h-full">
        <Header title="联系人详情" showBack />
        <div className="flex-1 flex flex-col items-center justify-center gap-2">
          <span className="text-text-muted text-[14px] font-primary">{error}</span>
          <button onClick={() => navigate('/contacts')} className="text-primary text-[13px] font-medium font-primary">
            返回列表
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <Header
        title="联系人详情"
        showBack
        showEdit
        rightElement={
          !isDemoMode && (
            <div className="flex items-center gap-1 px-2 py-1 bg-success-tint rounded-md">
              <FlaskConical className="w-3 h-3 text-success" />
              <span className="text-[10px] text-success font-medium font-primary">API</span>
            </div>
          )
        }
      />

      {/* Scroll Content */}
      <div className="flex-1 flex flex-col gap-4 p-4 overflow-y-auto">
        {/* Profile Card */}
        <div className="flex items-center gap-4 p-5 bg-bg-card rounded-lg">
          <div
            className="w-16 h-16 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: displayContact.color || getNameColor(displayContact.name || '') }}
          >
            <span className="text-white text-2xl font-semibold">
              {displayContact.initials || (displayContact.name || '').charAt(0)}
            </span>
          </div>
          <div className="flex-1 flex flex-col gap-1">
            <h2 className="text-[18px] font-semibold text-text-primary font-display">
              {displayContact.name || '未命名'}
            </h2>
            <p className="text-[14px] text-text-secondary font-primary">
              {[displayContact.company, displayContact.position].filter(Boolean).join(' · ') || '暂无职位信息'}
            </p>
            <div className="flex gap-2 mt-1">
              {displayContact.tags?.map((tag, index) => (
                <span
                  key={index}
                  className={`px-2 py-0.5 text-[11px] font-medium rounded font-primary ${
                    (tag as any).type === 'warning'
                      ? 'bg-warning-tint text-warning'
                      : 'bg-primary-tint text-primary'
                  }`}
                >
                  {(tag as any).label || tag}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Briefing Card */}
        <div className="bg-bg-card rounded-lg shadow-sm overflow-hidden">
          {/* Briefing Header */}
          <div className="flex items-center justify-between px-5 py-4 bg-primary-tint">
            <span className="text-[14px] font-semibold text-text-primary font-primary">会前简报</span>
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
              <h4 className="text-[13px] font-semibold text-text-secondary font-primary mb-2">关键信息</h4>
              <p className="text-[14px] text-text-primary font-primary leading-relaxed">
                {displayContact.briefing?.keyInfo || '暂无关键信息'}
              </p>
            </div>
            {(displayContact.briefing?.todos?.length || 0) > 0 && (
              <div>
                <h4 className="text-[13px] font-semibold text-text-secondary font-primary mb-2">待跟进事项</h4>
                <ul className="list-disc list-inside text-[14px] text-text-primary font-primary">
                  {displayContact.briefing.todos.map((todo, index) => (
                    <li key={index}>{todo}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Timeline Section */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-[14px] font-semibold text-text-primary font-primary">互动时间轴</span>
            <button className="text-[13px] text-text-muted font-primary flex items-center gap-1">
              查看全部
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {displayEvents.map((event) => (
            <div key={event.id} className="flex flex-col gap-3 p-3.5 bg-bg-card rounded-md">
              <div className="flex items-center justify-between">
                <span className="text-[13px] text-text-muted font-primary">{event.date}</span>
                <span className="text-[13px] font-medium text-text-primary font-primary">{event.title}</span>
              </div>
              <p className="text-[14px] text-text-secondary font-primary">{event.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Helper functions to convert API data to UI format
function toDemoContact(contact: ApiContact, context: ContactContext | null) {
  const name = contact.name || '未命名'
  return {
    id: contact.id,
    name,
    initials: name.charAt(0),
    color: getNameColor(name),
    company: contact.company || '',
    position: contact.position || '',
    tags: (contact.tags || []).map((tag) => ({ label: tag, type: 'primary' as const })),
    briefing: {
      keyInfo: context?.stableFacts?.map((f) => f.content).join('; ') || '暂无关键信息',
      todos:
        context?.openActions?.map((a) => a.suggestion_reason).filter(Boolean) ||
        context?.todos?.map((t) => t.content).filter(Boolean) ||
        [],
    },
  }
}

function toTimelineEvents(context: ContactContext | null): TimelineEvent[] {
  const events: TimelineEvent[] = []

  // Add recent events
  context?.recentEvents?.forEach((event) => {
    events.push({
      id: event.id,
      date: formatDate(event.occurredAt || event.occurred_at),
      title: event.title || '事件',
      description: event.summary || '',
    })
  })

  return events
}
