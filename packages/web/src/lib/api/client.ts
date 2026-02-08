import type {
  // Auth
  RegisterRequest,
  LoginRequest,
  RefreshRequest,
  LogoutRequest,
  AuthResponse,
  // Contact
  Contact,
  CreateContactRequest,
  UpdateContactRequest,
  ContactListResponse,
  ContactContext,
  // Conversation
  Conversation,
  CreateConversationRequest,
  Message,
  GetMessagesRequest,
  // Event
  Event,
  CreateEventRequest,
  // Briefing
  BriefSnapshot,
  // Conversation Archive
  ConversationArchiveResponse,
  // Tool Confirmation
  ToolConfirmation,
  CreateToolConfirmationRequest,
  ConfirmToolRequest,
  RejectToolRequest,
  ToolConfirmationStatus,
} from './types';

const API_BASE = '/v1';

/**
 * 获取认证 token（从 localStorage）
 */
function getAuthToken(): string | null {
  return localStorage.getItem('auth_token') || localStorage.getItem('token');
}

/**
 * 设置认证 token
 */
export function setAuthToken(token: string): void {
  localStorage.setItem('auth_token', token);
  localStorage.setItem('token', token);
}

/**
 * 清除认证 token
 */
export function clearAuthToken(): void {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('token');
  localStorage.removeItem('refresh_token');
}

/**
 * 创建带认证头的 fetch 请求
 */
async function fetchWithAuth(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = getAuthToken();
  const headers = new Headers(options.headers);
  
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  
  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }
  
  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });
    return response;
  } catch (error) {
    throw error;
  }
}

/**
 * 处理 API 响应错误
 */
async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    // 先读取错误信息（响应体只能读取一次）
    const errorText = await response.text();
    let errorMessage = `Request failed: ${response.status} ${response.statusText}`;
    try {
      const errorJson = JSON.parse(errorText);
      errorMessage = errorJson.message || errorMessage;
    } catch {
      errorMessage = errorText || errorMessage;
    }
    
    // 401 未授权，清除 token 并重定向到登录页
    if (response.status === 401) {
      clearAuthToken();
      // 如果不在登录页，重定向到登录页并传递错误信息
      if (window.location.pathname !== '/login') {
        // 使用更友好的错误信息
        const friendlyMessage = errorMessage || '登录已过期，请重新登录';
        // 通过 URL 参数传递错误信息
        const errorParam = encodeURIComponent(friendlyMessage);
        window.location.href = `/login?error=${errorParam}`;
      }
    }
    
    throw new Error(errorMessage);
  }
  
  // 处理空响应（如 204 No Content）
  if (response.status === 204 || response.headers.get('content-length') === '0') {
    return undefined as T;
  }
  
  // 检查响应是否有内容
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return response.json();
  }
  
  // 如果没有 JSON 内容，返回空对象
  return {} as T;
}

/**
 * API 客户端
 */
export const api = {
  /**
   * 认证相关 API
   */
  auth: {
    /**
     * 注册用户
     */
    async register(request: RegisterRequest): Promise<AuthResponse> {
      const response = await fetchWithAuth(`${API_BASE}/auth/register`, {
        method: 'POST',
        body: JSON.stringify(request),
      });
      const result = await handleResponse<AuthResponse>(response);
      if (result.accessToken) {
        setAuthToken(result.accessToken);
        if (result.refreshToken) {
          localStorage.setItem('refresh_token', result.refreshToken);
        }
      }
      return result;
    },

    /**
     * 用户登录
     */
    async login(request: LoginRequest): Promise<AuthResponse> {
      const response = await fetchWithAuth(`${API_BASE}/auth/login`, {
        method: 'POST',
        body: JSON.stringify(request),
      });
      const result = await handleResponse<AuthResponse>(response);
      if (result.accessToken) {
        setAuthToken(result.accessToken);
        if (result.refreshToken) {
          localStorage.setItem('refresh_token', result.refreshToken);
        }
      }
      return result;
    },

    /**
     * 刷新 token
     */
    async refresh(request: RefreshRequest): Promise<AuthResponse> {
      const response = await fetchWithAuth(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        body: JSON.stringify(request),
      });
      const result = await handleResponse<AuthResponse>(response);
      if (result.accessToken) {
        setAuthToken(result.accessToken);
        if (result.refreshToken) {
          localStorage.setItem('refresh_token', result.refreshToken);
        }
      }
      return result;
    },

    /**
     * 用户登出
     */
    async logout(request: LogoutRequest): Promise<{ success: boolean }> {
      const response = await fetchWithAuth(`${API_BASE}/auth/logout`, {
        method: 'POST',
        body: JSON.stringify(request),
      });
      const result = await handleResponse<{ success: boolean }>(response);
      clearAuthToken();
      return result;
    },
  },

  /**
   * 联系人相关 API
   */
  contacts: {
    /**
     * 创建联系人
     */
    async create(request: CreateContactRequest): Promise<Contact> {
      const response = await fetchWithAuth(`${API_BASE}/contacts`, {
        method: 'POST',
        body: JSON.stringify(request),
      });
      return handleResponse<Contact>(response);
    },

    /**
     * 获取联系人列表（支持分页）
     */
    async list(page: number = 1, limit: number = 10): Promise<ContactListResponse> {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      const response = await fetchWithAuth(`${API_BASE}/contacts?${params}`);
      return handleResponse<ContactListResponse>(response);
    },

    /**
     * 获取单个联系人
     */
    async get(id: string): Promise<Contact> {
      const response = await fetchWithAuth(`${API_BASE}/contacts/${id}`);
      return handleResponse<Contact>(response);
    },

    /**
     * 更新联系人
     */
    async update(id: string, request: UpdateContactRequest): Promise<Contact> {
      const response = await fetchWithAuth(`${API_BASE}/contacts/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(request),
      });
      return handleResponse<Contact>(response);
    },

    /**
     * 删除联系人
     */
    async delete(id: string): Promise<void> {
      const response = await fetchWithAuth(`${API_BASE}/contacts/${id}`, {
        method: 'DELETE',
      });
      await handleResponse(response);
    },

    /**
     * 获取联系人上下文
     */
    async getContext(id: string): Promise<ContactContext> {
      const response = await fetchWithAuth(`${API_BASE}/contacts/${id}/context`);
      return handleResponse<ContactContext>(response);
    },
  },

  /**
   * 会话相关 API
   */
  conversations: {
    /**
     * 创建新会话
     */
    async create(request: CreateConversationRequest): Promise<Conversation> {
      const response = await fetchWithAuth(`${API_BASE}/conversations`, {
        method: 'POST',
        body: JSON.stringify(request),
      });
      return handleResponse<Conversation>(response);
    },

    /**
     * 获取会话列表
     */
    async list(): Promise<Conversation[]> {
      const response = await fetchWithAuth(`${API_BASE}/conversations`);
      return handleResponse<Conversation[]>(response);
    },

    /**
     * 获取单个会话
     */
    async get(id: string): Promise<Conversation> {
      const response = await fetchWithAuth(`${API_BASE}/conversations/${id}`);
      return handleResponse<Conversation>(response);
    },

    /**
     * 获取会话消息列表
     */
    async getMessages(request: GetMessagesRequest): Promise<Message[]> {
      const params = new URLSearchParams();
      if (request.limit) params.set('limit', request.limit.toString());
      if (request.before) params.set('before', request.before);
      const response = await fetchWithAuth(`${API_BASE}/conversations/${request.conversationId}/messages?${params}`);
      return handleResponse<Message[]>(response);
    },
  },

  /**
   * 事件相关 API
   */
  events: {
    /**
     * 创建事件
     */
    async create(request: CreateEventRequest): Promise<Event> {
      const response = await fetchWithAuth(`${API_BASE}/events`, {
        method: 'POST',
        body: JSON.stringify(request),
      });
      return handleResponse<Event>(response);
    },

    /**
     * 根据联系人获取事件列表
     */
    async findByContact(contactId: string): Promise<Event[]> {
      const response = await fetchWithAuth(`${API_BASE}/events/contact/${contactId}`);
      return handleResponse<Event[]>(response);
    },
  },

  /**
   * 简报相关 API
   */
  briefings: {
    /**
     * 获取联系人简报
     */
    async getBriefing(contactId: string): Promise<BriefSnapshot | null> {
      const response = await fetchWithAuth(`${API_BASE}/contacts/${contactId}/brief`);
      return handleResponse<BriefSnapshot | null>(response);
    },

    /**
     * 刷新联系人简报
     */
    async refreshBriefing(contactId: string): Promise<BriefSnapshot> {
      const response = await fetchWithAuth(`${API_BASE}/contacts/${contactId}/brief`, {
        method: 'POST',
      });
      return handleResponse<BriefSnapshot>(response);
    },

    /**
     * 显式刷新联系人简报
     */
    async refreshBriefingExplicit(contactId: string): Promise<BriefSnapshot> {
      const response = await fetchWithAuth(`${API_BASE}/contacts/${contactId}/brief/refresh`, {
        method: 'POST',
      });
      return handleResponse<BriefSnapshot>(response);
    },
  },

  /**
   * 会话归档相关 API
   */
  conversationArchives: {
    /**
     * 创建归档
     */
    async createArchive(conversationId: string): Promise<ConversationArchiveResponse> {
      const response = await fetchWithAuth(`${API_BASE}/conversations/${conversationId}/archive`, {
        method: 'POST',
      });
      return handleResponse<ConversationArchiveResponse>(response);
    },

    /**
     * 应用归档
     */
    async applyArchive(archiveId: string): Promise<ConversationArchiveResponse> {
      const response = await fetchWithAuth(`${API_BASE}/conversation-archives/${archiveId}/apply`, {
        method: 'POST',
      });
      return handleResponse<ConversationArchiveResponse>(response);
    },

    /**
     * 丢弃归档
     */
    async discardArchive(archiveId: string): Promise<ConversationArchiveResponse> {
      const response = await fetchWithAuth(`${API_BASE}/conversation-archives/${archiveId}/discard`, {
        method: 'POST',
      });
      return handleResponse<ConversationArchiveResponse>(response);
    },
  },

  /**
   * 工具确认相关 API
   */
  toolConfirmations: {
    /**
     * 创建工具确认
     */
    async create(request: CreateToolConfirmationRequest): Promise<ToolConfirmation> {
      const response = await fetchWithAuth(`${API_BASE}/tool-confirmations`, {
        method: 'POST',
        body: JSON.stringify(request),
      });
      return handleResponse<ToolConfirmation>(response);
    },

    /**
     * 获取工具确认列表（支持筛选）
     */
    async list(
      status?: ToolConfirmationStatus,
      userId?: string,
      conversationId?: string
    ): Promise<ToolConfirmation[]> {
      const params = new URLSearchParams();
      if (status) params.set('status', status);
      if (userId) params.set('userId', userId);
      if (conversationId) params.set('conversationId', conversationId);
      const response = await fetchWithAuth(`${API_BASE}/tool-confirmations?${params}`);
      return handleResponse<ToolConfirmation[]>(response);
    },

    /**
     * 获取单个工具确认
     */
    async get(id: string): Promise<ToolConfirmation> {
      const response = await fetchWithAuth(`${API_BASE}/tool-confirmations/${id}`);
      return handleResponse<ToolConfirmation>(response);
    },

    /**
     * 确认工具执行
     */
    async confirm(request: ConfirmToolRequest): Promise<ToolConfirmation> {
      const response = await fetchWithAuth(`${API_BASE}/tool-confirmations/${request.id}/confirm`, {
        method: 'POST',
        body: JSON.stringify({ payload: request.payload }),
      });
      return handleResponse<ToolConfirmation>(response);
    },

    /**
     * 拒绝工具执行
     */
    async reject(request: RejectToolRequest): Promise<ToolConfirmation> {
      const response = await fetchWithAuth(`${API_BASE}/tool-confirmations/${request.id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason: request.reason }),
      });
      return handleResponse<ToolConfirmation>(response);
    },
  },
};
