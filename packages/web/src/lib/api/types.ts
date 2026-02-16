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

export interface SendCodeRequest {
  emailOrPhone: string;
}

export interface SendCodeResponse {
  success: boolean;
  message: string;
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
  createdAtMs?: number;
  updatedAt: string;
  updatedAtMs?: number;
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
  createdAtMs?: number;
  updatedAt: string;
  updatedAtMs?: number;
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
  createdAtMs?: number;
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
  eventDateMs?: number | null;
  embedding?: number[] | null;
  sourceConversationId?: string | null;
  sourceMessageIds?: string[] | null;
  contactId?: string | null;
  createdAt: string;
  createdAtMs?: number;
  updatedAt: string;
  updatedAtMs?: number;
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

export type ToolConfirmationStatus = 'pending' | 'confirmed' | 'rejected' | 'failed';

export interface ToolConfirmation {
  id: string;
  toolName: string;
  payload?: Record<string, any>;
  conversationId?: string | null;
  status: ToolConfirmationStatus;
  userId?: string | null;
  createdAt: string;
  createdAtMs?: number;
  updatedAt: string;
  updatedAtMs?: number;
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

export interface BatchConfirmToolRequest {
  items: Array<{
    id: string;
    payload?: Record<string, any>;
  }>;
}

export interface BatchRejectToolRequest {
  templateReason?: string;
  items: Array<{
    id: string;
    reason?: string;
  }>;
}

export interface ToolConfirmationBatchResult {
  total: number;
  succeeded: number;
  failed: number;
  items: Array<{
    id: string;
    success: boolean;
    status?: ToolConfirmationStatus;
    code?: string;
    message?: string;
  }>;
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

// ==================== Daily Action Digest ====================

export interface DailyActionDigestItem {
  id: string;
  rank: number;
  actionType: string;
  sourceAgentId: string;
  sourceRef: string | null;
  title: string;
  description: string;
  priorityScore: number;
  confidence: number | null;
  payload: Record<string, unknown> | null;
}

export interface DailyActionDigest {
  date: string;
  generatedAt: string;
  items: DailyActionDigestItem[];
}

// ==================== Relationship Health ====================

export interface RelationshipHealthSummary {
  averageScore: number;
  highRiskCount: number;
  mediumRiskCount: number;
  lowRiskCount: number;
  totalContacts: number;
  generatedAt: string;
}

export interface RelationshipRiskQueueItem {
  contactId: string;
  contactName: string;
  score: number;
  riskLevel: 'low' | 'medium' | 'high';
  suggestedAction: string;
  factors: Array<{
    key: string;
    weight: number;
    value: number;
    reason: string;
  }>;
}

export interface RelationshipRiskQueue {
  generatedAt: string;
  items: RelationshipRiskQueueItem[];
}

// ==================== Feishu Closed Loop ====================

export interface FeishuMessageTemplate {
  id: string;
  userId: string;
  title: string;
  content: string;
  variables: string[] | null;
  status: 'active' | 'disabled' | 'archived';
  createdAt: string;
  updatedAt: string;
}

export interface SendFeishuTemplateMessageRequest {
  templateId: string;
  recipientOpenId: string;
  variables?: Record<string, string>;
  conversationId?: string;
  archiveId?: string;
  toolConfirmationId?: string;
}

export interface SendFeishuTemplateMessageResponse {
  success: boolean;
  deliveryId: string;
  messageId?: string;
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  retryable: boolean;
  errorCode?: string;
  error?: string;
}

// ==================== Skills ====================

export interface SkillActionOptionV2 {
  actionId: string;
  skillKey: string;
  operation: string;
  name: string;
  description?: string;
  run?: {
    agentId: string;
    operation?: string | null;
    inputTemplate?: Record<string, unknown>;
  };
  riskLevel?: 'low' | 'medium' | 'high';
}

export interface SkillCatalogItem {
  key: string;
  displayName: string;
  description?: string;
  source: 'global' | 'tenant' | 'builtin';
  scopeType: 'global' | 'tenant';
  scopeId: string | null;
  version: string;
  status: string;
  actions: SkillActionOptionV2[];
  parserRules?: Record<string, unknown>;
  binding?: {
    scopeType: string;
    scopeId: string;
    priority: number;
    enabled: boolean;
    rolloutPercent: number;
    pinnedVersion: string | null;
  };
}

export interface SkillCatalogResponse {
  items: SkillCatalogItem[];
  warnings: string[];
}

export interface SkillInvocationIntentResponse {
  matched: boolean;
  status: string;
  skillKey?: string;
  operation?: string;
  args?: Record<string, unknown>;
  source: string;
  confidence: number;
  traceId: string;
  warnings: string[];
  candidates?: Array<{
    skillKey: string;
    operation?: string;
    confidence: number;
  }>;
  execution?: {
    agentId: string;
    operation?: string | null;
    input: Record<string, unknown>;
  };
}
