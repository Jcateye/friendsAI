import Taro from '@tarojs/taro'
import type {
  User,
  ConversationRecord,
  ConversationDetail,
  Contact,
  ContactDetail,
  FollowUpItem,
  SuggestionItem,
  WeeklyStats,
  Connector,
  MessageTemplate,
} from '@/types'

// 本地开发环境使用 localhost，生产环境使用真实域名
const BASE_URL = process.env.NODE_ENV === 'development' 
  ? 'http://localhost:3000' 
  : 'https://api.friendsai.com'

// Request wrapper
const request = async <T,>(options: Taro.request.Option): Promise<T> => {
  try {
    const token = Taro.getStorageSync('token')
    const response = await Taro.request({
      ...options,
      url: `${BASE_URL}${options.url}`,
      header: {
        'Content-Type': 'application/json',
        Authorization: token ? `Bearer ${token}` : '',
        ...options.header,
      },
    })

    if (response.statusCode >= 200 && response.statusCode < 300) {
      return response.data as T
    }
    throw new Error(response.data?.message || '请求失败')
  } catch (error) {
    console.error('API Error:', error)
    throw error
  }
}

// Auth APIs
export const authApi = {
  sendCode: (email: string) =>
    request<{ success: boolean }>({
      url: '/auth/send-code',
      method: 'POST',
      data: { email },
    }),

  login: (email: string, code: string) =>
    request<{ token: string; user: User }>({
      url: '/auth/login-by-code',
      method: 'POST',
      data: { email, code },
    }),

  logout: () =>
    request<{ success: boolean }>({
      url: '/auth/logout',
      method: 'POST',
    }),
}

// Conversation APIs
export const conversationApi = {
  getList: (filter?: string) =>
    request<ConversationRecord[]>({
      url: `/conversations${filter ? `?filter=${filter}` : ''}`,
      method: 'GET',
    }),

  getDetail: (id: string) =>
    request<ConversationDetail>({
      url: `/conversations/${id}`,
      method: 'GET',
    }),

  create: (content: string) =>
    request<ConversationDetail>({
      url: '/conversations',
      method: 'POST',
      data: { content },
    }),

  archive: (id: string, edits?: Partial<ConversationDetail>) =>
    request<ConversationDetail>({
      url: `/conversations/${id}/archive`,
      method: 'POST',
      data: edits,
    }),

  delete: (id: string) =>
    request<{ success: boolean }>({
      url: `/conversations/${id}`,
      method: 'DELETE',
    }),
}

// Contact APIs
export const contactApi = {
  getList: (filter?: string, search?: string) =>
    request<Contact[]>({
      url: `/contacts?${filter ? `filter=${filter}&` : ''}${search ? `search=${search}` : ''}`,
      method: 'GET',
    }),

  create: (payload: Partial<Contact>) =>
    request<ContactDetail>({
      url: '/contacts',
      method: 'POST',
      data: payload,
    }),

  getDetail: (id: string) =>
    request<ContactDetail>({
      url: `/contacts/${id}`,
      method: 'GET',
    }),

  update: (id: string, payload: Partial<Contact>) =>
    request<ContactDetail>({
      url: `/contacts/${id}`,
      method: 'PATCH',
      data: payload,
    }),

  refreshBriefing: (id: string) =>
    request<ContactDetail>({
      url: `/contacts/${id}/briefing`,
      method: 'POST',
    }),

  addEvent: (id: string, event: Partial<ContactDetail['events'][0]>) =>
    request<ContactDetail>({
      url: `/contacts/${id}/events`,
      method: 'POST',
      data: event,
    }),
}

// Action APIs
export const actionApi = {
  getFollowUps: () =>
    request<FollowUpItem[]>({
      url: '/actions/follow-ups',
      method: 'GET',
    }),

  getSuggestions: () =>
    request<SuggestionItem[]>({
      url: '/actions/suggestions',
      method: 'GET',
    }),

  getWeeklyStats: () =>
    request<WeeklyStats>({
      url: '/actions/weekly-stats',
      method: 'GET',
    }),
}

// Connector APIs
export const connectorApi = {
  getList: () =>
    request<Connector[]>({
      url: '/connectors',
      method: 'GET',
    }),

  connect: (type: string) =>
    request<Connector>({
      url: `/connectors/${type}/connect`,
      method: 'POST',
    }),

  disconnect: (type: string) =>
    request<{ success: boolean }>({
      url: `/connectors/${type}/disconnect`,
      method: 'POST',
    }),

  test: (type: string) =>
    request<{ success: boolean }>({
      url: `/connectors/${type}/test`,
      method: 'POST',
    }),

  getTemplates: (type: string) =>
    request<MessageTemplate[]>({
      url: `/connectors/${type}/templates`,
      method: 'GET',
    }),

  sendMessage: (type: string, templateId: string, contactId: string, content: string) =>
    request<{ success: boolean }>({
      url: `/connectors/${type}/send`,
      method: 'POST',
      data: { templateId, contactId, content },
    }),
}

// User APIs
export const userApi = {
  getProfile: () =>
    request<User>({
      url: '/user/profile',
      method: 'GET',
    }),

  updateSettings: (settings: Record<string, any>) =>
    request<{ success: boolean }>({
      url: '/user/settings',
      method: 'PUT',
      data: settings,
    }),

  exportData: () =>
    request<{ url: string }>({
      url: '/user/export',
      method: 'POST',
    }),

  clearData: () =>
    request<{ success: boolean }>({
      url: '/user/clear',
      method: 'DELETE',
    }),
}

// Legacy API shim for pages expecting `api.*`
export const api = {
  getContacts: async () => {
    try {
      return await contactApi.getList()
    } catch (error) {
      console.warn('Fallback to mock contacts due to API error:', error)
      return mockData.contacts
    }
  },
  getContactDetail: async (id: string) => {
    try {
      return await contactApi.getDetail(id)
    } catch (error) {
      console.warn('Fallback to mock contact detail due to API error:', error)
      const fallback = mockData.contacts.find(contact => contact.id === id)
      if (!fallback) {
        throw error
      }
      return {
        ...fallback,
        events: [],
        briefing: {
          lastSummary: fallback.lastContactSummary || '',
          pendingTodos: [],
          traits: [],
          suggestion: '',
        },
      }
    }
  },
}

// Mock data for development
export const mockData = {
  records: [
    {
      id: '1',
      title: '拜访-张三 CEO',
      summary: '讨论了Q2合作方案，对方对报价有疑虑',
      status: 'archived' as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: '2',
      title: '今日记录 2026/01/28',
      summary: '见了李四和王五，聊到新项目启动计划',
      status: 'pending' as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: '3',
      title: '电话-赵六',
      summary: '确认下周三的会议时间和地点',
      status: 'archived' as const,
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      updatedAt: new Date(Date.now() - 86400000).toISOString(),
    },
  ],
  contacts: [
    {
      id: '1',
      name: '张三',
      initial: '张',
      avatarColor: '#C9B8A8',
      company: 'ABC公司',
      role: 'CEO',
      lastContactTime: new Date(Date.now() - 3 * 86400000).toISOString(),
      lastContactSummary: '上次聊到报价，待发优化方案',
    },
    {
      id: '2',
      name: '李四',
      initial: '李',
      avatarColor: '#7C9070',
      company: 'XYZ公司',
      role: '产品总监',
      lastContactTime: new Date(Date.now() - 7 * 86400000).toISOString(),
      lastContactSummary: '新项目启动计划讨论中',
    },
    {
      id: '3',
      name: '王五',
      initial: '王',
      avatarColor: '#5B9BD5',
      company: 'DEF公司',
      role: 'CTO',
      lastContactTime: new Date(Date.now() - 14 * 86400000).toISOString(),
      lastContactSummary: '已完成合同签署，待跟进实施',
    },
  ],
  followUps: [
    {
      id: '1',
      contact: {
        id: '1',
        name: '张三',
        initial: '张',
        avatarColor: '#C9B8A8',
      },
      reason: '答应周五发报价方案',
      urgent: true,
    },
    {
      id: '2',
      contact: {
        id: '4',
        name: '赵六',
        initial: '赵',
        avatarColor: '#9B8AA8',
      },
      reason: '已沉默14天',
      urgent: false,
    },
  ],
  weeklyStats: {
    records: 5,
    visits: 3,
    progress: 2,
  },
}
