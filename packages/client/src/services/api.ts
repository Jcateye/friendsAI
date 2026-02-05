import Taro from '@tarojs/taro'
import type {
  User,
  ConversationRecord,
  ConversationArchive,
  ArchiveResult,
  Contact,
  ContactDetail,
  ContactEvent,
  FollowUpItem,
  WeeklyStats,
  ActionItem,
  BriefSnapshot,
  MessageTemplate,
  ToolConfirmation,
  CreateToolConfirmationDto,
  ToolConfirmationStatus
} from '@/types'
import { getAvatarColor, getInitial } from '@/utils'
import {
  enqueueOutbox,
  flushOutbox,
  generateId,
  getContactsCacheRaw,
  setContactsCacheRaw,
} from '@/services/offlineStore'

// H5 runtime may not define `process`, so guard access.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const env = (typeof process !== 'undefined' ? (process as any).env : {}) as Record<string, string>
const resolveBaseUrl = () => {
  if (env.TARO_APP_API_BASE_URL) return env.TARO_APP_API_BASE_URL
  if (typeof window !== 'undefined' && window.location?.hostname) {
    return `http://${window.location.hostname}:3000/v1`
  }
  return 'http://localhost:3000/v1'
}
const BASE_URL = resolveBaseUrl()

const toQueryString = (params: Record<string, string | undefined>) => {
  const entries = Object.entries(params).filter(([, value]) => value)
  if (entries.length === 0) {
    return ''
  }
  const query = entries
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value as string)}`)
    .join('&')
  return `?${query}`
}

// Request wrapper
const request = async <T,>(options: Taro.request.Option): Promise<T> => {
  try {
    const token = Taro.getStorageSync('token')
    const doReq = (accessToken?: string) =>
      Taro.request({
      ...options,
      url: `${BASE_URL}${options.url}`,
      header: {
        'Content-Type': 'application/json',
        Authorization: accessToken ? `Bearer ${accessToken}` : token ? `Bearer ${token}` : '',
        ...options.header,
      },
    })

    const response = await doReq()

    if (response.statusCode >= 200 && response.statusCode < 300) {
      return response.data as T
    }

    // Auto refresh once on 401 for production-ish MVP stability.
    if (response.statusCode === 401 && options.url !== '/auth/refresh') {
      const refreshToken = Taro.getStorageSync('refreshToken')
      if (refreshToken) {
        try {
          const refreshed = await Taro.request({
            url: `${BASE_URL}/auth/refresh`,
            method: 'POST',
            header: { 'Content-Type': 'application/json' },
            data: { refreshToken },
          })
          if (refreshed.statusCode >= 200 && refreshed.statusCode < 300) {
            const data = refreshed.data as any
            if (data?.accessToken) Taro.setStorageSync('token', data.accessToken)
            if (data?.refreshToken) Taro.setStorageSync('refreshToken', data.refreshToken)
            const retryResp = await doReq(data.accessToken)
            if (retryResp.statusCode >= 200 && retryResp.statusCode < 300) {
              return retryResp.data as T
            }
          }
        } catch (e) {
          // ignore and fall through
        }
      }
    }

    throw new Error((response.data as any)?.message || '请求失败')
  } catch (error) {
    console.error('API Error:', error)
    throw error
  }
}

const mapContact = (raw: any): Contact => {
  const name = raw.displayName || raw.name || ''
  return {
    id: raw.id,
    name,
    initial: getInitial(name || ''),
    avatarColor: getAvatarColor(name || ''),
    company: raw.company,
    role: raw.role || raw.position,
    tags: raw.tags || [],
    lastContactTime: raw.lastContactTime || raw.lastContactAt,
    lastContactSummary: raw.lastContactSummary || raw.lastSummary,
  }
}

const mapConversationRecord = (raw: any): ConversationRecord => ({
  id: raw.id,
  title: raw.title || raw.summary || '对话',
  summary: raw.summary || raw.latestMessage || '',
  status: raw.status || (raw.archived ? 'archived' : 'pending'),
  createdAt: raw.createdAt || raw.created_at,
  updatedAt: raw.updatedAt || raw.updated_at || raw.createdAt || raw.created_at,
  contactIds: raw.contactIds || raw.contact_ids,
})

const mapAgentMessage = (raw: any) => ({
  id: raw.id,
  role: raw.role,
  content: raw.content,
  createdAt: raw.createdAt || raw.created_at,
  toolCallId: raw.toolCallId || raw.tool_call_id,
  references: raw.references,
  metadata: raw.metadata || raw.metadata_json || raw.metadataJson || {},
})

const mapArchiveResult = (raw: any): ArchiveResult => {
  const people = raw?.recognizedPeople ?? raw?.contacts ?? []
  const events = raw?.newEvents ?? raw?.events ?? []
  const facts = raw?.extractedFacts ?? raw?.facts ?? []
  const todos = raw?.todoItems ?? raw?.todos ?? []

  return {
    recognizedPeople: (people || []).map(mapContact),
    newEvents: (events || []).map((event: any) => ({
      id: event.id,
      type: event.type || 'other',
      date: event.date || event.occurredAt || event.occurred_at || '',
      location: event.location,
      summary: event.summary || event.title || event.description || '',
      todoCount: event.todoCount,
    })),
    extractedFacts: (facts || []).map((fact: any) => ({
      id: fact.id,
      content: fact.content || fact.value || '',
      type: fact.type === 'trait' || fact.type === 'preference' ? fact.type : 'info',
    })),
    todoItems: (todos || []).map((todo: any) => ({
      id: todo.id,
      content: todo.content || '',
      suggestedDate: todo.suggestedDate || todo.suggested_date || todo.dueAt || todo.due_at,
      completed: Boolean(todo.completed),
    })),
  }
}

const mapConversationArchive = (raw: any): ConversationArchive => ({
  id: raw.id,
  conversationId: raw.conversationId || raw.conversation_id,
  status: raw.status || 'ready_for_review',
  summary: raw.summary ?? null,
  payload: mapArchiveResult(raw.payload || raw.archiveResult || raw.result || {}),
  createdAt: raw.createdAt || raw.created_at,
  updatedAt: raw.updatedAt || raw.updated_at,
})

const mapBriefSnapshot = (raw: any, fallbackContactId?: string): BriefSnapshot => ({
  id: raw.id || fallbackContactId || '',
  contact_id: raw.contactId || raw.contact_id || fallbackContactId || '',
  content: raw.content || '',
  generated_at: raw.generatedAt || raw.generated_at || '',
  source_hash: raw.sourceHash || raw.source_hash || '',
})

export const authApi = {
  register: (data: { email?: string; phone?: string; name: string; password?: string; verifyCode?: string }) =>
    request<{ accessToken: string; refreshToken: string; user: User; workspace: { id: string; name: string } }>({
      url: '/auth/register',
      method: 'POST',
      data,
    }),

  login: (emailOrPhone: string, password?: string, verifyCode?: string) =>
    request<{ accessToken: string; refreshToken: string; user: User; workspace?: { id: string; name: string } }>({
      url: '/auth/login',
      method: 'POST',
      data: { emailOrPhone, password, verifyCode },
    }),

  refresh: (refreshToken: string) =>
    request<{ accessToken: string; refreshToken: string }>({
      url: '/auth/refresh',
      method: 'POST',
      data: { refreshToken },
    }),

  logout: (refreshToken: string) =>
    request<{ status: string }>({
      url: '/auth/logout',
      method: 'POST',
      data: { refreshToken },
    }),
}

export const conversationApi = {
  list: async () => {
    const data = await request<any>({
      url: '/conversations',
      method: 'GET',
    })
    const items = Array.isArray(data) ? data : data.items || []
    return items.map(mapConversationRecord)
  },

  create: async (data?: { title?: string }) =>
    request<any>({
      url: '/conversations',
      method: 'POST',
      data: data ?? {},
    }).then(mapConversationRecord),

  get: async (id: string) =>
    request<any>({
      url: `/conversations/${id}`,
      method: 'GET',
    }).then(mapConversationRecord),

  listMessages: async (conversationId: string) => {
    const data = await request<any>({
      url: `/conversations/${conversationId}/messages`,
      method: 'GET',
    })
    const items = Array.isArray(data) ? data : data.items || []
    return items.map(mapAgentMessage)
  },

  createArchive: async (conversationId: string) =>
    request<any>({
      url: `/conversations/${conversationId}/archive`,
      method: 'POST',
      data: {},
    }).then(mapConversationArchive),
}

export const conversationArchiveApi = {
  apply: (archiveId: string) =>
    request<any>({
      url: `/conversation-archives/${archiveId}/apply`,
      method: 'POST',
      data: {},
    }).then(mapConversationArchive),

  discard: (archiveId: string) =>
    request<any>({
      url: `/conversation-archives/${archiveId}/discard`,
      method: 'POST',
      data: {},
    }).then(mapConversationArchive),
}

export const contactApi = {
  getList: async () => {
    try {
      const data = await request<any>({
        url: '/contacts',
        method: 'GET',
      })
      const items = Array.isArray(data) ? data : data.items || []
      setContactsCacheRaw(items)
      return items.map(mapContact)
    } catch (error) {
      await flushOutbox().catch(() => undefined)
      return getContactsCacheRaw().map(mapContact)
    }
  },

  create: (data: { name: string; notes?: string; tags?: string[] }) =>
    (async () => {
      const id = generateId()
      const payload = { displayName: data.name, note: data.notes, tags: data.tags }
      try {
        const created = await request<any>({
          url: '/contacts',
          method: 'POST',
          data: payload,
        })
        const cached = getContactsCacheRaw()
        setContactsCacheRaw([created, ...cached.filter((c: any) => c.id !== created.id)])
        return created
      } catch (error) {
        const offline = { id, displayName: data.name, note: data.notes ?? null, tags: data.tags ?? [], offline: true }
        const cached = getContactsCacheRaw()
        setContactsCacheRaw([offline, ...cached.filter((c: any) => c.id !== id)])
        enqueueOutbox({
          id,
          kind: 'contact_create',
          url: '/contacts',
          method: 'POST',
          data: payload,
          createdAt: new Date().toISOString(),
        })
        return offline
      }
    })(),

  getDetail: async (id: string) => {
    try {
      const contact = await request<any>({
        url: `/contacts/${id}`,
        method: 'GET',
      })
      return mapContact(contact)
    } catch (error) {
      const cached = getContactsCacheRaw()
      const found = cached.find((c: any) => c.id === id)
      if (found) return mapContact(found)
      throw error
    }
  },

  getContext: (id: string) =>
    request<any>({
      url: `/contacts/${id}/context`,
      method: 'GET',
    }),

  getBrief: (id: string) =>
    request<any | null>({
      url: `/contacts/${id}/brief`,
      method: 'GET',
    }).then((data) => (data ? mapBriefSnapshot(data, id) : null)),

  refreshBrief: (id: string) =>
    request<any>({
      url: `/contacts/${id}/brief/refresh`,
      method: 'POST',
      data: {},
    }).then((data) => mapBriefSnapshot(data, id)),
}

export const actionApi = {
  getOpenActions: (contactId?: string) =>
    request<{ items: ActionItem[] }>({
      url: `/action-items${contactId ? `?contactId=${contactId}` : ''}`,
      method: 'GET',
    }),

  update: (id: string, data: { status?: string; dueAt?: string }) =>
    request<ActionItem>({
      url: `/action-items/${id}`,
      method: 'PATCH',
      data,
    }),
}

export const feishuApi = {
  getTemplates: () =>
    request<{ items: MessageTemplate[] }>({
      url: '/feishu/message-templates',
      method: 'GET',
    }),

  sendTemplateMessage: (data: { templateId: string; receiverName: string; content: string }) =>
    request<{ id: string; status: 'success' | 'error'; response?: Record<string, any> }>({
      url: '/feishu/messages/send',
      method: 'POST',
      data,
    }),

  feishuOAuthAuthorize: (params?: { redirectUri?: string; state?: string; scope?: string }) =>
    request<{ url: string }>({
      url: `/feishu/oauth/url${toQueryString({
        redirect_uri: params?.redirectUri,
        state: params?.state,
        scope: params?.scope,
      })}`,
      method: 'GET',
    }),

  feishuOAuthCallback: (code: string, state?: string) =>
    request<{ success: boolean; message?: string }>({
      url: '/feishu/oauth/callback',
      method: 'POST',
      data: { code, state },
    }),

  feishuOAuthToken: (_code?: string) =>
    request<{ success: boolean; token?: string; message?: string }>({
      url: '/feishu/tenant-token',
      method: 'GET',
    }),

  feishuOAuthRefresh: (_refreshToken: string) =>
    request<{ success: boolean; message?: string }>({
      url: '/feishu/tenant-token',
      method: 'GET',
    }),
}

export const toolConfirmationApi = {
  create: (data: CreateToolConfirmationDto) =>
    request<ToolConfirmation>({
      url: '/tool-confirmations',
      method: 'POST',
      data,
    }),

  list: (status?: ToolConfirmationStatus, userId?: string) =>
    request<any>({
      url: `/tool-confirmations${status ? `?status=${status}` : ''}${userId ? `${status ? '&' : '?'}userId=${userId}` : ''}`,
      method: 'GET',
    }).then((data) => ({
      items: Array.isArray(data) ? data : data.items || [],
    })),

  getOne: (id: string) =>
    request<ToolConfirmation>({
      url: `/tool-confirmations/${id}`,
      method: 'GET',
    }),

  confirm: (id: string, payload?: Record<string, any>) =>
    request<ToolConfirmation>({
      url: `/tool-confirmations/${id}/confirm`,
      method: 'POST',
      data: { payload },
    }),

  reject: (id: string, reason?: string) =>
    request<ToolConfirmation>({
      url: `/tool-confirmations/${id}/reject`,
      method: 'POST',
      data: { reason },
    }),
}

export const api = {
  getContacts: async () => {
    const data = await contactApi.getList()
    return data
  },

  getContactDetail: async (id: string) => {
    const contact = await contactApi.getDetail(id)
    const [context, brief] = await Promise.all([
      contactApi.getContext(id),
      contactApi.getBrief(id),
    ])

    const events = (context.events || context.recentEvents || []).map((event: any) => ({
      id: event.id,
      type: event.type || 'meeting',
      date: event.date || event.occurred_at || event.occurredAt || '',
      summary: event.summary || event.title || event.description || '',
    })) as ContactEvent[]

    return {
      ...contact,
      events,
      facts: (context.facts || context.stableFacts || []).map((f: any) => f.content || `${f.key}: ${f.value}`),
      actions: (context.todos || context.openActions || []).map((a: any) => a.content || a.suggestion_reason || '待办'),
      briefing: brief
        ? {
            lastSummary: brief.content,
            pendingTodos: [],
            traits: [],
            suggestion: '',
          }
        : undefined,
    } as ContactDetail
  },
}

export const mockData = {
  records: [] as ConversationRecord[],
  contacts: [] as Contact[],
  followUps: [] as FollowUpItem[],
  weeklyStats: { records: 0, visits: 0, progress: 0 } as WeeklyStats,
}
