import { Search, ChevronRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Header } from '../../components/layout/Header'

interface Contact {
  id: string
  name: string
  initials: string
  color: string
  lastInteraction: string
  tags: string[]
}

const mockContacts: Contact[] = [
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

export function ContactsPage() {
  const navigate = useNavigate()

  return (
    <div className="flex flex-col h-full">
      <Header title="联系人" showMenu />

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
      </div>

      {/* Contact List */}
      <div className="flex-1 flex flex-col px-4 py-2 overflow-y-auto">
        {mockContacts.map((contact) => (
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
              <span className="text-white text-lg font-semibold">
                {contact.initials}
              </span>
            </div>

            {/* Info */}
            <div className="flex-1 flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="text-[15px] font-semibold text-text-primary font-primary">
                  {contact.name}
                </span>
                {contact.tags.map((tag) => (
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
        ))}
      </div>
    </div>
  )
}
