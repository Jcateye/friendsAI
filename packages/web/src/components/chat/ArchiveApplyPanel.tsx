/**
 * ArchiveApplyPanel 组件
 * 用于显示 Agent 提取的归档数据，并提供一键应用操作
 * - 创建/更新联系人
 * - 创建事件
 * - 添加到时间轴
 */

import { useEffect, useMemo, useState } from 'react'
import { Check, X, UserPlus, CalendarPlus, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react'
import type { ArchiveExtractData } from '../../lib/api/agent-types'
import type { Contact } from '../../lib/api/types'
import { api } from '../../lib/api/client'

// ==================== 类型定义 ====================

export interface ExtractedContact {
  name: string
  company?: string
  position?: string
  email?: string
  phone?: string
  role?: string
}

export interface ExtractedFact {
  content: string
  category?: string
}

export interface ExtractedDate {
  description: string
  date?: string
  type?: 'deadline' | 'meeting' | 'milestone' | 'other'
}

export interface ArchiveApplyPanelProps {
  /** 提取的归档数据 */
  data: ArchiveExtractData
  /** 会话 ID（用于关联） */
  conversationId: string
  /** 现有联系人列表（用于去重检查） */
  existingContacts?: Contact[]
  /** 应用成功回调 */
  onApplySuccess?: (type: 'contact' | 'event' | 'fact', count: number) => void
  /** 关闭面板 */
  onClose?: () => void
}

interface ApplyStatus {
  type: 'pending' | 'loading' | 'success' | 'error'
  message?: string
}

// ==================== 辅助函数 ====================

/**
 * 检查联系人是否已存在（基于姓名）
 */
function findExistingContact(
  extracted: ExtractedContact,
  existingContacts: Contact[] = []
): Contact | null {
  const normalizedName = extracted.name.toLowerCase().trim()
  const normalizedEmail = extracted.email?.toLowerCase().trim()

  if (normalizedEmail) {
    const byEmail = existingContacts.find((c) => c.email?.toLowerCase().trim() === normalizedEmail)
    if (byEmail) return byEmail
  }

  const byExactName = existingContacts.find((c) => (c.name?.toLowerCase().trim() || '') === normalizedName)
  if (byExactName) return byExactName

  return null
}

function buildContactLookupKeys(contact: ExtractedContact): string[] {
  const keys: string[] = []
  const normalizedName = contact.name?.toLowerCase().trim()
  const normalizedEmail = contact.email?.toLowerCase().trim()
  if (normalizedName) keys.push(`name:${normalizedName}`)
  if (normalizedEmail) keys.push(`email:${normalizedEmail}`)
  return keys
}

const NON_MEANINGFUL_VALUES = new Set([
  '无',
  '暂无',
  '未知',
  '不详',
  '未提供',
  'none',
  'null',
  'n/a',
  '-',
])

function normalizeExtractedText(value?: string): string | undefined {
  if (typeof value !== 'string') return undefined
  const normalized = value.trim()
  if (!normalized) return undefined
  if (NON_MEANINGFUL_VALUES.has(normalized.toLowerCase())) return undefined
  return normalized
}

function normalizeTags(input: Array<string | undefined | null>): string[] {
  const result: string[] = []
  const seen = new Set<string>()
  for (const item of input) {
    const normalized = normalizeExtractedText(item ?? undefined)
    if (!normalized) continue
    if (normalized === '已更新') continue
    if (seen.has(normalized)) continue
    seen.add(normalized)
    result.push(normalized)
  }
  return result
}

// ==================== 子组件 ====================

interface ContactItemProps {
  contact: ExtractedContact
  existingContact: Contact | null
  status: ApplyStatus
  onToggle: () => void
  onCreate: () => Promise<void>
  onUpdate: () => Promise<void>
}

function ContactItem({ contact, existingContact, status, onToggle, onCreate, onUpdate }: ContactItemProps) {
  const [expanded, setExpanded] = useState(false)
  const isSelected = status.type !== 'pending' || status.message === 'selected'

  return (
    <div
      className={`p-3 rounded-lg border transition-colors ${
        status.type === 'success'
          ? 'bg-green-50 border-green-200'
          : status.type === 'error'
            ? 'bg-red-50 border-red-200'
            : isSelected
              ? 'bg-primary-tint border-primary'
              : 'bg-bg-card border-border'
      }`}
    >
      <div className="flex items-start gap-3">
        {/* 选择按钮 */}
        {status.type === 'pending' && (
          <button
            onClick={onToggle}
            className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
              isSelected
                ? 'bg-primary border-primary'
                : 'border-border hover:border-primary'
            }`}
          >
            {isSelected && <Check className="w-3 h-3 text-white" />}
          </button>
        )}

        {/* 联系人信息 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-text-primary">{contact.name}</span>
            {existingContact && (
              <span className="px-1.5 py-0.5 text-[11px] bg-warning-tint text-warning rounded">
                已存在
              </span>
            )}
            {contact.role && (
              <span className="px-1.5 py-0.5 text-[11px] bg-info-tint text-info rounded">
                {contact.role}
              </span>
            )}
          </div>

          <div className="mt-1 text-[13px] text-text-secondary">
            {[contact.company, contact.position, contact.email]
              .filter(Boolean)
              .join(' · ') || '无详细信息'}
          </div>

          {/* 展开的详细信息 */}
          {expanded && (
            <div className="mt-2 p-2 bg-bg-surface rounded text-[12px] text-text-secondary">
              <div className="grid grid-cols-2 gap-2">
                {contact.company && (
                  <div>
                    <span className="text-text-muted">公司：</span>
                    {contact.company}
                  </div>
                )}
                {contact.position && (
                  <div>
                    <span className="text-text-muted">职位：</span>
                    {contact.position}
                  </div>
                )}
                {contact.email && (
                  <div className="col-span-2">
                    <span className="text-text-muted">邮箱：</span>
                    {contact.email}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 操作按钮 */}
        <div className="flex items-center gap-2">
          {(contact.company || contact.position || contact.email) && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-1 text-text-muted hover:text-text-secondary"
            >
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          )}

          {status.type === 'pending' && isSelected && (
            <>
              {existingContact ? (
                <button
                  onClick={onUpdate}
                  className="px-3 py-1.5 text-[12px] bg-warning text-white rounded-md hover:opacity-90"
                >
                  更新
                </button>
              ) : (
                <button
                  onClick={onCreate}
                  className="px-3 py-1.5 text-[12px] bg-primary text-white rounded-md hover:opacity-90"
                >
                  创建
                </button>
              )}
            </>
          )}

          {status.type === 'loading' && (
            <div className="px-3 py-1.5 text-[12px] text-text-muted">处理中...</div>
          )}

          {status.type === 'success' && (
            <div className="flex items-center gap-1 text-green-600">
              <Check className="w-4 h-4" />
              <span className="text-[12px]">已完成</span>
            </div>
          )}

          {status.type === 'error' && (
            <div className="flex items-center gap-1 text-red-500">
              <AlertCircle className="w-4 h-4" />
              <span className="text-[12px]">失败</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

interface DateItemProps {
  date: ExtractedDate
  status: ApplyStatus
  onToggle: () => void
  onCreate: () => Promise<void>
}

function DateItem({ date, status, onToggle, onCreate }: DateItemProps) {
  const isSelected = status.type !== 'pending' || status.message === 'selected'

  const getTypeColor = (type?: string) => {
    switch (type) {
      case 'deadline':
        return 'text-red-500 bg-red-50'
      case 'meeting':
        return 'text-primary bg-primary-tint'
      case 'milestone':
        return 'text-accent bg-accent/10'
      default:
        return 'text-text-muted bg-bg-surface'
    }
  }

  return (
    <div
      className={`p-3 rounded-lg border transition-colors ${
        status.type === 'success'
          ? 'bg-green-50 border-green-200'
          : status.type === 'error'
            ? 'bg-red-50 border-red-200'
            : isSelected
              ? 'bg-primary-tint border-primary'
              : 'bg-bg-card border-border'
      }`}
    >
      <div className="flex items-start gap-3">
        {status.type === 'pending' && (
          <button
            onClick={onToggle}
            className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
              isSelected
                ? 'bg-primary border-primary'
                : 'border-border hover:border-primary'
            }`}
          >
            {isSelected && <Check className="w-3 h-3 text-white" />}
          </button>
        )}

        <div className="flex-1">
          <div className="flex items-center gap-2">
            <CalendarPlus className="w-4 h-4 text-text-muted" />
            <span className="text-[13px] text-text-primary">{date.description}</span>
            {date.type && (
              <span className={`px-1.5 py-0.5 text-[11px] rounded ${getTypeColor(date.type)}`}>
                {date.type === 'deadline' ? '截止' : date.type === 'meeting' ? '会议' : date.type === 'milestone' ? '里程碑' : '其他'}
              </span>
            )}
          </div>
          {date.date && (
            <div className="mt-1 text-[12px] text-text-muted">
              时间：{date.date}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {status.type === 'pending' && isSelected && (
            <button
              onClick={onCreate}
              className="px-3 py-1.5 text-[12px] bg-primary text-white rounded-md hover:opacity-90"
            >
              创建事件
            </button>
          )}

          {status.type === 'loading' && (
            <div className="px-3 py-1.5 text-[12px] text-text-muted">处理中...</div>
          )}

          {status.type === 'success' && (
            <div className="flex items-center gap-1 text-green-600">
              <Check className="w-4 h-4" />
              <span className="text-[12px]">已创建</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

interface FactItemProps {
  fact: ExtractedFact
  status: ApplyStatus
  onToggle: () => void
  onApply: () => Promise<void>
}

function FactItem({ fact, status, onToggle, onApply }: FactItemProps) {
  const isSelected = status.type !== 'pending' || status.message === 'selected'

  return (
    <div
      className={`p-2.5 rounded-lg border transition-colors ${
        status.type === 'success'
          ? 'bg-green-50 border-green-200'
          : isSelected
            ? 'bg-primary-tint border-primary'
            : 'bg-bg-card border-border'
      }`}
    >
      <div className="flex items-start gap-2">
        {status.type === 'pending' && (
          <button
            onClick={onToggle}
            className={`mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${
              isSelected
                ? 'bg-primary border-primary'
                : 'border-border hover:border-primary'
            }`}
          >
            {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
          </button>
        )}

        <div className="flex-1 text-[13px] text-text-primary">{fact.content}</div>

        <div className="flex items-center gap-2">
          {fact.category && (
            <span className="px-1.5 py-0.5 text-[11px] bg-bg-surface text-text-muted rounded">
              {fact.category}
            </span>
          )}

          {status.type === 'pending' && isSelected && (
            <button
              onClick={onApply}
              className="px-2 py-1 text-[11px] bg-primary text-white rounded hover:opacity-90"
            >
              应用
            </button>
          )}

          {status.type === 'success' && (
            <Check className="w-4 h-4 text-green-600" />
          )}
        </div>
      </div>
    </div>
  )
}

// ==================== 主组件 ====================

export function ArchiveApplyPanel({
  data,
  conversationId,
  existingContacts = [],
  onApplySuccess,
  onClose,
}: ArchiveApplyPanelProps) {
  const contacts = data.payload.contacts || []
  const facts = data.payload.facts || []
  const dates = data.payload.dates || []

  // 联系人应用状态管理
  const [contactStates, setContactStates] = useState<
    Record<string, ApplyStatus>
  >({})
  // 事件应用状态管理
  const [dateStates, setDateStates] = useState<Record<string, ApplyStatus>>(
    {}
  )
  // 事实应用状态管理
  const [factStates, setFactStates] = useState<Record<string, ApplyStatus>>(
    {}
  )
  const [localContacts, setLocalContacts] = useState<Contact[]>(existingContacts)
  const [resolvedContactIds, setResolvedContactIds] = useState<Record<string, string>>({})

  useEffect(() => {
    setLocalContacts(existingContacts)
  }, [existingContacts])

  const extractedContacts = useMemo(
    () =>
      contacts
        .filter(
          (contact): contact is ExtractedContact =>
            typeof contact?.name === 'string' && contact.name.trim().length > 0,
        )
        .map((contact) => ({
          ...contact,
          name: contact.name.trim(),
          company: normalizeExtractedText(contact.company),
          position: normalizeExtractedText(contact.position),
          email: normalizeExtractedText(contact.email),
          phone: normalizeExtractedText(contact.phone),
          role: normalizeExtractedText(contact.role),
        })),
    [contacts],
  )

  const rememberResolvedContact = (contact: ExtractedContact, contactId: string) => {
    const keys = buildContactLookupKeys(contact)
    setResolvedContactIds((prev) => {
      const next = { ...prev }
      for (const key of keys) {
        next[key] = contactId
      }
      return next
    })
  }

  const resolveBestContactId = (descriptionOrContent?: string): string | null => {
    const normalizedText = (descriptionOrContent || '').toLowerCase()

    for (const contact of extractedContacts) {
      const keys = buildContactLookupKeys(contact)
      for (const key of keys) {
        const mapped = resolvedContactIds[key]
        if (mapped && (!normalizedText || normalizedText.includes(contact.name.toLowerCase()))) {
          return mapped
        }
      }
    }

    for (const contact of extractedContacts) {
      const existing = findExistingContact(contact, localContacts)
      if (existing) {
        return existing.id
      }
    }

    if (localContacts.length === 1) {
      return localContacts[0].id
    }

    return null
  }

  // 处理联系人创建
  const handleCreateContact = async (contact: ExtractedContact, index: number) => {
    const key = `contact-${index}`
    setContactStates((prev) => ({ ...prev, [key]: { type: 'loading' } }))

    try {
      const company = normalizeExtractedText(contact.company)
      const position = normalizeExtractedText(contact.position)
      const email = normalizeExtractedText(contact.email)
      const phone = normalizeExtractedText(contact.phone)
      const role = normalizeExtractedText(contact.role)

      const newContact = await api.contacts.create({
        name: contact.name,
        email,
        phone,
        company,
        position,
        note: role ? `归档角色：${role}` : undefined,
        tags: normalizeTags([company ? '公司' : '个人', role]),
      })

      setLocalContacts((prev) => [newContact, ...prev.filter((c) => c.id !== newContact.id)])
      rememberResolvedContact(contact, newContact.id)

      setContactStates((prev) => ({ ...prev, [key]: { type: 'success' } }))
      onApplySuccess?.('contact', 1)

      // 尝试创建事件记录这次对话
      if (conversationId) {
        try {
          await api.events.create({
            contactId: newContact.id,
            title: `与 ${contact.name} 的对话`,
            description: `通过对话归档识别并创建了联系人`,
          })
        } catch {
          // 忽略事件创建失败
        }
      }
    } catch (error) {
      setContactStates((prev) => ({
        ...prev,
        [key]: {
          type: 'error',
          message: error instanceof Error ? error.message : '创建失败',
        },
      }))
    }
  }

  // 处理联系人更新
  const handleUpdateContact = async (
    extracted: ExtractedContact,
    existing: Contact,
    index: number
  ) => {
    const key = `contact-${index}`
    setContactStates((prev) => ({ ...prev, [key]: { type: 'loading' } }))

    try {
      const company = normalizeExtractedText(extracted.company)
      const position = normalizeExtractedText(extracted.position)
      const email = normalizeExtractedText(extracted.email)
      const phone = normalizeExtractedText(extracted.phone)
      const role = normalizeExtractedText(extracted.role)

      const cleanedTags = normalizeTags([
        ...(existing.tags || []),
        company ? '公司' : null,
        role,
      ])

      // 合并现有信息和提取的信息
      const updates: Parameters<typeof api.contacts.update>[1] = {}
      updates.tags = cleanedTags

      // 只有当提取的信息更完整时才更新
      if (company && !existing.company) {
        updates.company = company
      }
      if (position && !existing.position) {
        updates.position = position
      }
      if (email && !existing.email) {
        updates.email = email
      }
      if (phone && !existing.phone) {
        updates.phone = phone
      }
      if (role) {
        const roleLine = `归档角色：${role}`
        updates.note = existing.note?.includes(roleLine)
          ? existing.note
          : existing.note
            ? `${existing.note}\n${roleLine}`
            : roleLine
      }

      const updated = await api.contacts.update(existing.id, updates)
      setLocalContacts((prev) => [updated, ...prev.filter((c) => c.id !== updated.id)])
      rememberResolvedContact(extracted, existing.id)

      setContactStates((prev) => ({ ...prev, [key]: { type: 'success' } }))
      onApplySuccess?.('contact', 1)
    } catch (error) {
      setContactStates((prev) => ({
        ...prev,
        [key]: {
          type: 'error',
          message: error instanceof Error ? error.message : '更新失败',
        },
      }))
    }
  }

  // 处理事件创建
  const handleCreateDate = async (date: ExtractedDate, index: number) => {
    const key = `date-${index}`
    setDateStates((prev) => ({ ...prev, [key]: { type: 'loading' } }))

    try {
      const contactId = resolveBestContactId(date.description)
      if (!contactId) {
        throw new Error('未找到可关联的联系人，请先创建/更新联系人后再创建时间事项')
      }

      const normalizedEventDate =
        date.date && !Number.isNaN(new Date(date.date).getTime())
          ? new Date(date.date).toISOString()
          : undefined

      await api.events.create({
        contactId,
        title: date.description,
        description: date.type
          ? `${date.type === 'deadline' ? '截止' : date.type === 'meeting' ? '会议' : '里程碑'}事项`
          : undefined,
        eventDate: normalizedEventDate,
        details: {
          ...(normalizedEventDate ? { occurredAt: normalizedEventDate } : {}),
          source: 'archive_apply_panel',
          sourceConversationId: conversationId,
        },
      })

      setDateStates((prev) => ({ ...prev, [key]: { type: 'success' } }))
      onApplySuccess?.('event', 1)
    } catch (error) {
      setDateStates((prev) => ({
        ...prev,
        [key]: {
          type: 'error',
          message: error instanceof Error ? error.message : '创建失败',
        },
      }))
    }
  }

  // 处理事实应用（添加到上下文）
  const handleApplyFact = async (_fact: ExtractedFact, index: number) => {
    const key = `fact-${index}`
    setFactStates((prev) => ({ ...prev, [key]: { type: 'loading' } }))

    try {
      const contactId = resolveBestContactId(_fact.content)
      if (!contactId) {
        throw new Error('未找到可关联的联系人，请先创建/更新联系人后再应用信息点')
      }

      await api.contacts.addFact(contactId, {
        content: _fact.content,
        metadata: {
          category: _fact.category ?? null,
          source: 'archive_apply_panel',
        },
        sourceConversationId: conversationId,
      })

      setFactStates((prev) => ({ ...prev, [key]: { type: 'success' } }))
      onApplySuccess?.('fact', 1)
    } catch (error) {
      setFactStates((prev) => ({
        ...prev,
        [key]: {
          type: 'error',
          message: error instanceof Error ? error.message : '应用失败',
        },
      }))
    }
  }

  // 计算统计数据
  const contactStats = {
    total: extractedContacts.length,
    selected: Object.values(contactStates).filter(
      (s) => s.type === 'success' || s.message === 'selected'
    ).length,
    existing: extractedContacts.filter((c) => findExistingContact(c, localContacts)).length,
  }

  const hasAnyData = extractedContacts.length > 0 || facts.length > 0 || dates.length > 0

  return (
    <div className="bg-bg-card rounded-lg shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-bg-surface border-b border-border">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <UserPlus className="w-4 h-4 text-primary" />
            <span className="text-[14px] font-semibold text-text-primary font-primary">
              归档应用
            </span>
          </div>

          {hasAnyData && (
            <div className="flex items-center gap-3 text-[12px] text-text-muted">
              {contacts.length > 0 && (
                <span>
                  {contactStats.selected}/{contactStats.total} 联系人
                  {contactStats.existing > 0 && ` (${contactStats.existing} 已存在)`}
                </span>
              )}
              {facts.length > 0 && <span>{facts.length} 信息点</span>}
              {dates.length > 0 && <span>{dates.length} 时间事项</span>}
            </div>
          )}
        </div>

        <button
          onClick={onClose}
          className="p-1 text-text-muted hover:text-text-secondary"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="p-4 max-h-[60vh] overflow-y-auto">
        {!hasAnyData ? (
          <div className="text-center py-8">
            <p className="text-[14px] text-text-muted">
              本次归档未提取到可应用的信息
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {/* 联系人 */}
            {extractedContacts.length > 0 && (
              <div>
                <h4 className="text-[13px] font-semibold text-text-secondary mb-2 flex items-center gap-2">
                  <UserPlus className="w-4 h-4" />
                  识别的联系人 ({extractedContacts.length})
                </h4>
                <div className="flex flex-col gap-2">
                  {extractedContacts.map((contact, index) => {
                    const key = `contact-${index}`
                    const existing = findExistingContact(contact, localContacts)
                    return (
                      <ContactItem
                        key={key}
                        contact={contact}
                        existingContact={existing}
                        status={contactStates[key] || { type: 'pending' }}
                        onToggle={() => {
                          setContactStates((prev) => ({
                            ...prev,
                            [key]: {
                              type: 'pending',
                              message: prev[key]?.message === 'selected' ? undefined : 'selected',
                            },
                          }))
                        }}
                        onCreate={() => handleCreateContact(contact, index)}
                        onUpdate={() =>
                          existing
                            ? handleUpdateContact(contact, existing, index)
                            : Promise.resolve()
                        }
                      />
                    )
                  })}
                </div>
              </div>
            )}

            {/* 时间事项 */}
            {dates.length > 0 && (
              <div>
                <h4 className="text-[13px] font-semibold text-text-secondary mb-2 flex items-center gap-2">
                  <CalendarPlus className="w-4 h-4" />
                  时间事项 ({dates.length})
                </h4>
                <div className="flex flex-col gap-2">
                  {dates.map((date, index) => {
                    const key = `date-${index}`
                    return (
                      <DateItem
                        key={key}
                        date={date}
                        status={dateStates[key] || { type: 'pending' }}
                        onToggle={() => {
                          setDateStates((prev) => ({
                            ...prev,
                            [key]: {
                              type: 'pending',
                              message: prev[key]?.message === 'selected' ? undefined : 'selected',
                            },
                          }))
                        }}
                        onCreate={() => handleCreateDate(date, index)}
                      />
                    )
                  })}
                </div>
              </div>
            )}

            {/* 事实/信息 */}
            {facts.length > 0 && (
              <div>
                <h4 className="text-[13px] font-semibold text-text-secondary mb-2">
                  提取的信息 ({facts.length})
                </h4>
                <div className="flex flex-col gap-1.5">
                  {facts.map((fact, index) => {
                    const key = `fact-${index}`
                    return (
                      <FactItem
                        key={key}
                        fact={fact}
                        status={factStates[key] || { type: 'pending' }}
                        onToggle={() => {
                          setFactStates((prev) => ({
                            ...prev,
                            [key]: {
                              type: 'pending',
                              message: prev[key]?.message === 'selected' ? undefined : 'selected',
                            },
                          }))
                        }}
                        onApply={() => handleApplyFact(fact, index)}
                      />
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer Actions */}
      {hasAnyData && (
        <div className="px-4 py-3 bg-bg-surface border-t border-border flex items-center justify-between">
          <p className="text-[12px] text-text-muted">
            选择需要应用的项目，点击对应按钮即可创建/更新
          </p>
        </div>
      )}
    </div>
  )
}
