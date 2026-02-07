/**
 * API 类型定义
 * 与后端 DTO/Entity 完全匹配
 */

// ==================== Auth ====================

export interface RegisterRequest {
  email?: string;
  phone?: string;
  password: string;
  name?: string;
}

export interface LoginRequest {
  emailOrPhone: string;
  password: string;
}

export interface RefreshRequest {
  refreshToken: string;
}

export interface LogoutRequest {
  refreshToken: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: {
    id: string;
    email: string | null;
    phone: string | null;
    name: string | null;
  };
}

// ==================== Contact ====================

export interface Contact {
  id: string;
  name: string;
  alias?: string | null;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  position?: string | null;
  profile?: Record<string, any> | null;
  tags?: string[] | null;
  note?: string | null;
  userId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateContactRequest {
  name?: string;
  displayName?: string;
  email?: string;
  phone?: string;
  company?: string;
  position?: string;
  note?: string;
  profile?: Record<string, any>;
  tags?: string[];
}

export interface UpdateContactRequest {
  name?: string;
  displayName?: string;
  email?: string;
  phone?: string;
  company?: string;
  position?: string;
  note?: string;
  profile?: Record<string, any>;
  tags?: string[];
}

export interface ContactListResponse {
  items: Contact[];
  total: number;
}

export interface ContactContext {
  events: Event[];
  facts: Array<{
    id: string;
    content: string;
    conversationId?: string | null;
    createdAt?: string;
  }>;
  todos: Array<{
    id: string;
    content: string;
    dueDate?: string | null;
    conversationId?: string | null;
    createdAt?: string;
  }>;
  recentEvents: Array<{
    id: string;
    summary: string;
    occurredAt: string;
    occurred_at: string;
    title: string | null;
  }>;
  stableFacts: Array<{
    content: string;
  }>;
  openActions: Array<{
    id: string;
    suggestion_reason: string;
    due_at?: string | null;
  }>;
}

// ==================== Conversation ====================

export interface Conversation {
  id: string;
  title?: string | null;
  content: string;
  embedding?: number[] | null;
  parsedData?: Record<string, any>;
  isArchived: boolean;
  status: string;
  userId: string;
  contactId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateConversationRequest {
  title?: string;
  content?: string;
  contactId?: string;
}

export interface Message {
  id: string;
  role: string;
  content: string;
  metadata?: Record<string, any> | null;
  citations?: Record<string, any> | null;
  conversationId: string;
  createdAt: string;
}

export interface GetMessagesRequest {
  conversationId: string;
  limit?: number;
  before?: string;
}

// ==================== Event ====================

export interface Event {
  id: string;
  title: string;
  description?: string | null;
  details?: Record<string, any>;
  eventDate?: string | null;
  embedding?: number[] | null;
  sourceConversationId?: string | null;
  sourceMessageIds?: string[] | null;
  contactId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEventRequest {
  title: string;
  description?: string;
  contactId: string;
  details?: Record<string, any>;
}

// ==================== Briefing ====================

export interface BriefSnapshot {
  id: string;
  contact_id: string;
  content: string;
  generated_at: string;
  source_hash: string;
}

// ==================== Conversation Archive ====================

export interface Citation {
  messageId: string;
  start?: number;
  end?: number;
}

export interface ArchiveContact {
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  position?: string;
  citations?: Citation[];
}

export interface ArchiveEvent {
  title: string;
  description?: string;
  eventDate?: string;
  contactId?: string;
  contactRef?: string;
  citations?: Citation[];
}

export interface ArchiveFact {
  key: string;
  value: string;
  contactId?: string;
  contactRef?: string;
  citations?: Citation[];
}

export interface ArchiveTodo {
  description: string;
  dueDate?: string;
  contactId?: string;
  contactRef?: string;
  citations?: Citation[];
}

export interface ArchivePayload {
  contacts?: ArchiveContact[];
  events?: ArchiveEvent[];
  facts?: ArchiveFact[];
  todos?: ArchiveTodo[];
}

export interface ConversationArchiveResponse {
  id: string;
  status: string;
  summary: string | null;
  payload: ArchivePayload | null;
}

// ==================== Tool Confirmation ====================

export type ToolConfirmationStatus = 'pending' | 'confirmed' | 'rejected';

export interface ToolConfirmation {
  id: string;
  toolName: string;
  payload?: Record<string, any>;
  conversationId?: string | null;
  status: ToolConfirmationStatus;
  userId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateToolConfirmationRequest {
  toolName: string;
  payload?: Record<string, any>;
  conversationId?: string;
}

export interface ConfirmToolRequest {
  id: string;
  payload?: Record<string, any>;
}

export interface RejectToolRequest {
  id: string;
  reason?: string;
}

// ==================== Legacy (for backward compatibility) ====================

export interface ToolState {
  id: string;
  name: string;
  status: 'idle' | 'queued' | 'running' | 'awaiting_input' | 'succeeded' | 'failed' | 'cancelled';
  confirmationId?: string;
  message?: string;
  input?: unknown;
  output?: unknown;
  error?: {
    code: string;
    message: string;
  };
}
