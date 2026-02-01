import Taro from '@tarojs/taro'
import type {
  User,
  ConversationRecord,
  ConversationDetail,
  Contact,
  ContactDetail,
  ContactEvent,
  FollowUpItem,
  WeeklyStats,
  ActionItem,
  ToolTask,
  ExtractedItem,
  BriefSnapshot,
  JournalEntry
} from '@/types'
import { getAvatarColor, getInitial } from '@/utils'
import {
  enqueueOutbox,
  flushOutbox,
  generateId,
  getContactsCacheRaw,
  getJournalsCacheRaw,
  setContactsCacheRaw,
  setJournalsCacheRaw,
} from '@/services/offlineStore'

const BASE_URL = process.env.TARO_APP_API_BASE_URL || 'http://localhost:3000/v1'

const getWorkspaceId = () => Taro.getStorageSync('workspaceId')

const request = async <T,>(options: Taro.request.Option): Promise<T> => {
  try {
    const token = Taro.getStorageSync('token')
    const workspaceId = getWorkspaceId()
    const doReq = (accessToken?: string) =>
      Taro.request({
      ...options,
      url: `${BASE_URL}${options.url}`,
      header: {
        'Content-Type': 'application/json',
        Authorization: accessToken ? `Bearer ${accessToken}` : token ? `Bearer ${token}` : '',
        ...(workspaceId ? { 'X-Workspace-Id': workspaceId } : {}),
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

const mapContact = (raw: any): Contact => ({
  id: raw.id,
  name: raw.name,
  initial: getInitial(raw.name || ''),
  avatarColor: getAvatarColor(raw.name || ''),
  company: raw.company,
  role: raw.role,
  tags: raw.tags || [],
  lastContactTime: raw.lastContactTime,
  lastContactSummary: raw.lastContactSummary,
})

export const authApi = {
  register: (data: { email?: string; phone?: string; name: string; password: string }) =>
    request<{ accessToken: string; refreshToken: string; user: User; workspace: { id: string; name: string } }>({
      url: '/auth/register',
      method: 'POST',
      data,
    }),

  login: (emailOrPhone: string, password: string) =>
    request<{ accessToken: string; refreshToken: string; user: User; workspace?: { id: string; name: string } }>({
      url: '/auth/login',
      method: 'POST',
      data: { emailOrPhone, password },
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

export const journalApi = {
  list: () =>
    request<{ items: JournalEntry[] }>({
      url: '/journal-entries',
      method: 'GET',
    })
      .then((res) => {
        setJournalsCacheRaw(res.items)
        return res
      })
      .catch(async () => {
        await flushOutbox().catch(() => undefined)
        return { items: getJournalsCacheRaw() as JournalEntry[] }
      }),

  create: (data: { rawText: string; contactIds?: string[] }) =>
    (async () => {
      const id = generateId()
      try {
        const created = await request<JournalEntry>({
          url: '/journal-entries',
          method: 'POST',
          data: { ...data, id },
        })
        const cached = getJournalsCacheRaw()
        setJournalsCacheRaw([created, ...cached.filter((j: any) => j.id !== created.id)])
        return created
      } catch (error) {
        const offline: JournalEntry = {
          id,
          workspace_id: getWorkspaceId(),
          author_id: '',
          raw_text: data.rawText,
          status: 'new',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
        const cached = getJournalsCacheRaw()
        setJournalsCacheRaw([offline, ...cached.filter((j: any) => j.id !== id)])
        enqueueOutbox({
          id,
          kind: 'journal_create',
          url: '/journal-entries',
          method: 'POST',
          data: { ...data, id },
          createdAt: new Date().toISOString(),
        })
        return offline
      }
    })(),

  get: (id: string) =>
    request<JournalEntry>({
      url: `/journal-entries/${id}`,
      method: 'GET',
    }).catch(() => {
      const cached = getJournalsCacheRaw()
      const found = cached.find((j: any) => j.id === id)
      if (found) return found as JournalEntry
      throw new Error('Not found')
    }),

  extract: (id: string) =>
    request<{ items: ExtractedItem[] }>({
      url: `/journal-entries/${id}/extract`,
      method: 'POST',
      data: {},
    }),

  listExtracted: (id: string) =>
    request<{ items: ExtractedItem[] }>({
      url: `/journal-entries/${id}/extract`,
      method: 'GET',
    }),

  confirmExtracted: (id: string, data: { itemId: string; action: 'confirm' | 'reject' | 'edit'; payloadJson?: any; contactId?: string }) =>
    request<any>({
      url: `/journal-entries/${id}/confirm`,
      method: 'POST',
      data,
    }),
}

export const conversationApi = {
  getList: async () => {
    const data = await journalApi.list()
    return data.items.map((entry) => ({
      id: entry.id,
      title: entry.raw_text.slice(0, 20) || '记录',
      summary: entry.raw_text.slice(0, 60) || '',
      status: entry.status === 'processed' ? 'archived' : 'pending',
      createdAt: entry.created_at,
      updatedAt: entry.updated_at,
    })) as ConversationRecord[]
  },

  getDetail: async (id: string) => {
    const entry = await journalApi.get(id)
    return {
      id: entry.id,
      title: entry.raw_text.slice(0, 20) || '记录',
      summary: entry.raw_text.slice(0, 60) || '',
      status: entry.status === 'processed' ? 'archived' : 'pending',
      createdAt: entry.created_at,
      updatedAt: entry.updated_at,
      originalContent: entry.raw_text,
    } as ConversationDetail
  },

  create: async (content: string) => {
    const entry = await journalApi.create({ rawText: content })
    return {
      id: entry.id,
      title: entry.raw_text.slice(0, 20) || '记录',
      summary: entry.raw_text.slice(0, 60) || '',
      status: 'pending',
      createdAt: entry.created_at,
      updatedAt: entry.updated_at,
      originalContent: entry.raw_text,
    } as ConversationDetail
  },
}

export const contactApi = {
  getList: async () => {
    try {
      const data = await request<{ items: any[] }>({
        url: '/contacts',
        method: 'GET',
      })
      setContactsCacheRaw(data.items)
      return data.items.map(mapContact)
    } catch (error) {
      await flushOutbox().catch(() => undefined)
      return getContactsCacheRaw().map(mapContact)
    }
  },

  create: (data: { name: string; notes?: string }) =>
    (async () => {
      const id = generateId()
      try {
        const created = await request<any>({
          url: '/contacts',
          method: 'POST',
          data: { ...data, id },
        })
        const cached = getContactsCacheRaw()
        setContactsCacheRaw([created, ...cached.filter((c: any) => c.id !== created.id)])
        return created
      } catch (error) {
        const offline = { id, name: data.name, notes: data.notes ?? null, offline: true }
        const cached = getContactsCacheRaw()
        setContactsCacheRaw([offline, ...cached.filter((c: any) => c.id !== id)])
        enqueueOutbox({
          id,
          kind: 'contact_create',
          url: '/contacts',
          method: 'POST',
          data: { ...data, id },
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
    request<BriefSnapshot | null>({
      url: `/contacts/${id}/brief`,
      method: 'GET',
    }),

  refreshBrief: (id: string) =>
    request<BriefSnapshot>({
      url: `/contacts/${id}/brief`,
      method: 'POST',
      data: { forceRefresh: true },
    }),
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

export const toolTaskApi = {
  list: (status: 'pending' | 'confirmed' | 'running' | 'done' | 'failed' | 'all' = 'pending') =>
    request<{ items: ToolTask[] }>({
      url: `/tool-tasks?status=${status}`,
      method: 'GET',
    }),

  listPending: () => toolTaskApi.list('pending'),

  confirm: (id: string) =>
    request<ToolTask>({
      url: `/tool-tasks/${id}/confirm`,
      method: 'POST',
      data: {},
    }),

  listExecutions: (id: string) =>
    request<{ items: any[] }>({
      url: `/tool-tasks/${id}/executions`,
      method: 'GET',
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

    const events = (context.recentEvents || []).map((event: any) => ({
      id: event.id,
      type: 'meeting',
      date: event.occurred_at || event.occurredAt,
      summary: event.summary,
    })) as ContactEvent[]

    return {
      ...contact,
      events,
      facts: (context.stableFacts || []).map((f: any) => `${f.key}: ${f.value}`),
      actions: (context.openActions || []).map((a: any) => a.suggestion_reason || '待办'),
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
