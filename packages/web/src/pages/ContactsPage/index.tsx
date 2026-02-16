import { useEffect, useState } from 'react'
import { Search, ChevronRight, FlaskConical, Plus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Header } from '../../components/layout/Header'
import { useDemoMode } from '../../contexts/DemoModeContext'
import { api } from '../../lib/api'
import type { Contact as ApiContact } from '../../lib/api/types'
import { ContactFormModal } from '../../components/contacts/ContactFormModal'

interface UiContact {
  id: string
  name: string
  initials: string
  color: string
  lastInteraction: string
  tags: string[]
}

const mockContacts: UiContact[] = [
  {
    id: '1',
    name: '张伟',
    initials: '张',
    color: '#C9B8A8',
    lastInteraction: '2天前见面',
    tags: ['投资人', '重要'],
  },
  {
    id: '2',
    name: '李明',
    initials: '李',
    color: '#7C9070',
    lastInteraction: '上周通话',
    tags: ['合作伙伴'],
  },
  {
    id: '3',
    name: '王芳',
    initials: '王',
    color: '#5B9BD5',
    lastInteraction: '3天前邮件',
    tags: ['客户'],
  },
]

const filterChips = ['全部', '最近', '重要']

// 将 API Contact 转换为 UI Contact 格式
function toUiContact(contact: ApiContact): UiContact {
  const name = contact.name || '未命名'
  const firstChar = name.charAt(0)
  const colors = ['#C9B8A8', '#7C9070', '#5B9BD5', '#E57373', '#81C784', '#64B5F6', '#FFB74D', '#BA68C8']
  const colorIndex = name.charCodeAt(0) % colors.length

  return {
    id: contact.id,
    name,
    initials: firstChar,
    color: colors[colorIndex],
    lastInteraction: contact.updatedAt
      ? `${new Date(contact.updatedAt).toLocaleDateString('zh-CN')} 更新`
      : '最近互动',
    tags: contact.tags || [],
  }
}

export function ContactsPage() {
  const navigate = useNavigate()
  const { isDemoMode, toggleDemoMode } = useDemoMode()

  // Demo Mode: 使用模拟数据
  const demoContacts = mockContacts
  const demoLoading = false
  const demoError = null

  // Real API: 获取真实数据
  const [realContacts, setRealContacts] = useState<UiContact[]>([])
  const [realLoading, setRealLoading] = useState(false)
  const [realError, setRealError] = useState<string | null>(null)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

  const loadContacts = () => {
    if (!isDemoMode) {
      setRealLoading(true)
      setRealError(null)
      api.contacts
        .list(1, 50)
        .then((response) => {
          setRealContacts(response.items.map(toUiContact))
        })
        .catch((error) => {
          setRealError(error instanceof Error ? error.message : '加载失败')
        })
        .finally(() => {
          setRealLoading(false)
        })
    }
  }

  useEffect(() => {
    loadContacts()
  }, [isDemoMode])

  const contacts = isDemoMode ? demoContacts : realContacts
  const loading = isDemoMode ? demoLoading : realLoading
  const error = isDemoMode ? demoError : realError

  return (
    <div className="flex flex-col h-full">
      <Header
        title="联系人"
        showMenu
        rightElement={
          <div className="flex items-center gap-1">
            {!isDemoMode && (
              <button
                onClick={() => setIsCreateModalOpen(true)}
                aria-label="新建联系人"
                className="p-1 -mr-1 rounded-md transition-colors text-text-primary hover:bg-bg-surface"
                title="新建联系人"
              >
                <Plus className="w-5 h-5" />
              </button>
            )}
            <button
              onClick={toggleDemoMode}
              aria-label="切换Demo模式"
              className={`p-1 -mr-1 rounded-md transition-colors ${
                isDemoMode ? 'bg-primary-tint text-primary' : 'text-text-muted'
              }`}
              title={isDemoMode ? 'Demo模式: 开启' : 'Demo模式: 关闭'}
            >
              <FlaskConical className="w-5 h-5" />
            </button>
          </div>
        }
      />

      {/* Search Section */}
      <div className="bg-bg-card px-4 pb-3 flex flex-col gap-3">
        {/* Search Bar */}
        <div className="flex items-center gap-2.5 h-11 px-3.5 bg-bg-page rounded-md">
          <Search className="w-[18px] h-[18px] text-text-muted" />
          <input
            type="text"
            placeholder="搜索联系人或问问题..."
            className="flex-1 bg-transparent text-[14px] text-text-primary placeholder:text-text-muted outline-none font-primary"
          />
        </div>

        {/* Filter Chips */}
        <div className="flex gap-2">
          {filterChips.map((chip, index) => (
            <button
              key={chip}
              className={`h-8 px-3.5 rounded-full text-[13px] font-medium font-primary ${
                index === 0
                  ? 'bg-primary text-white'
                  : 'bg-bg-card text-text-secondary border border-border'
              }`}
            >
              {chip}
            </button>
          ))}
        </div>

        {/* Demo Mode Indicator */}
        {isDemoMode && (
          <div className="flex items-center gap-1.5 px-3 py-2 bg-warning-tint rounded-md">
            <FlaskConical className="w-4 h-4 text-warning" />
            <span className="text-[12px] text-warning font-medium font-primary">
              Demo模式 - 显示模拟数据
            </span>
          </div>
        )}
      </div>

      {/* Contact List */}
      <div className="flex-1 flex flex-col px-4 py-2 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-32 text-text-muted text-[14px] font-primary">
            加载中...
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-32 gap-2">
            <span className="text-text-muted text-[14px] font-primary">{error}</span>
            <button
              onClick={() => window.location.reload()}
              className="text-primary text-[13px] font-medium font-primary"
            >
              重试
            </button>
          </div>
        ) : contacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-text-muted text-[14px] font-primary">
            暂无联系人
          </div>
        ) : (
          contacts.map((contact) => (
            <button
              key={contact.id}
              onClick={() => navigate(`/contacts/${contact.id}`)}
              className="flex items-center gap-3 py-3.5 border-b border-border text-left"
            >
              {/* Avatar */}
              <div
                className="w-12 h-12 rounded-md flex items-center justify-center"
                style={{ backgroundColor: contact.color }}
              >
                <span className="text-white text-lg font-semibold">{contact.initials}</span>
              </div>

              {/* Info */}
              <div className="flex-1 flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="text-[15px] font-semibold text-text-primary font-primary">
                    {contact.name}
                  </span>
                  {contact.tags.map((tag: string) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 bg-primary-tint text-primary text-[11px] font-medium rounded font-primary"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <span className="text-[13px] text-text-secondary font-primary">
                  {contact.lastInteraction}
                </span>
              </div>

              <ChevronRight className="w-5 h-5 text-text-muted" />
            </button>
          ))
        )}
      </div>

      {/* Create Contact Modal */}
      {!isDemoMode && (
        <ContactFormModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={() => {
            loadContacts()
            setIsCreateModalOpen(false)
          }}
        />
      )}
    </div>
  )
}
