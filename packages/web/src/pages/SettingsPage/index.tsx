import { ChevronRight, LogOut, Download, Trash2, Shield, Bell, MessageSquare } from 'lucide-react'
import { Header } from '../../components/layout/Header'

interface SettingItem {
  icon: React.ReactNode
  label: string
  value?: string
  danger?: boolean
}

interface SettingSection {
  title: string
  items: SettingItem[]
}

const sections: SettingSection[] = [
  {
    title: '账号',
    items: [
      { icon: null, label: '邮箱', value: 'user@example.com' },
      { icon: <LogOut className="w-5 h-5" />, label: '退出登录', danger: true },
    ],
  },
  {
    title: '数据',
    items: [
      { icon: <Download className="w-5 h-5" />, label: '导出数据' },
      { icon: <Trash2 className="w-5 h-5" />, label: '清除缓存' },
    ],
  },
  {
    title: 'AI 设置',
    items: [
      { icon: <Shield className="w-5 h-5" />, label: '严格模式', value: '开启' },
      { icon: <Shield className="w-5 h-5" />, label: '隐私保护', value: '标准' },
    ],
  },
  {
    title: '通知',
    items: [{ icon: <Bell className="w-5 h-5" />, label: '提醒设置', value: '开启' }],
  },
  {
    title: '反馈',
    items: [{ icon: <MessageSquare className="w-5 h-5" />, label: '提交反馈' }],
  },
]

export function SettingsPage() {
  return (
    <div className="flex flex-col h-full bg-bg-page">
      <Header title="设置" showBack />

      {/* Scroll Content */}
      <div className="flex-1 flex flex-col gap-5 p-4 overflow-y-auto">
        {sections.map((section) => (
          <div key={section.title} className="bg-bg-card rounded-lg overflow-hidden">
            {/* Section Header */}
            <div className="px-4 py-3 border-b border-border">
              <span className="text-[13px] font-semibold text-text-muted font-primary">
                {section.title}
              </span>
            </div>

            {/* Section Items */}
            {section.items.map((item, index) => (
              <button
                key={item.label}
                className={`flex items-center justify-between w-full px-4 py-3.5 text-left ${
                  index < section.items.length - 1 ? 'border-b border-border' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  {item.icon && (
                    <span className={item.danger ? 'text-red-500' : 'text-text-muted'}>
                      {item.icon}
                    </span>
                  )}
                  <span
                    className={`text-[15px] font-primary ${
                      item.danger ? 'text-red-500' : 'text-text-primary'
                    }`}
                  >
                    {item.label}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {item.value && (
                    <span className="text-[14px] text-text-muted font-primary">
                      {item.value}
                    </span>
                  )}
                  <ChevronRight className="w-5 h-5 text-text-muted" />
                </div>
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
