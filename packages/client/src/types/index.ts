// User & Auth
export interface User {
  id: string
  email: string
  name?: string
  avatar?: string
}

// Record Status
export type RecordStatus = 'pending' | 'archived'

// Conversation Record
export interface ConversationRecord {
  id: string
  title: string
  summary: string
  status: RecordStatus
  createdAt: string
  updatedAt: string
  contactIds?: string[]
}

// Contact
export interface Contact {
  id: string
  name: string
  initial: string
  avatarColor: string
  company?: string
  role?: string
  tags?: string[]
  lastContactTime?: string
  lastContactSummary?: string
}

// Event Types
export type EventType = 'meeting' | 'call' | 'visit' | 'email' | 'note' | 'other'

// Event/Activity
export interface ContactEvent {
  id: string
  type: EventType
  date: string
  location?: string
  summary: string
  todoCount?: number
}

// Extracted Facts
export interface ExtractedFact {
  id: string
  content: string
  type: 'trait' | 'preference' | 'info'
}

// Todo Item
export interface TodoItem {
  id: string
  content: string
  suggestedDate?: string
  completed: boolean
}

// AI Archive Result
export interface ArchiveResult {
  recognizedPeople: Contact[]
  newEvents: ContactEvent[]
  extractedFacts: ExtractedFact[]
  todoItems: TodoItem[]
}

// Conversation Detail
export interface ConversationDetail extends ConversationRecord {
  originalContent: string
  archiveResult?: ArchiveResult
}

// Contact Detail with Briefing
export interface ContactDetail extends Contact {
  briefing?: ContactBriefing
  events: ContactEvent[]
}

// Contact Briefing
export interface ContactBriefing {
  lastSummary: string
  pendingTodos: string[]
  traits: string[]
  suggestion: string
}

// Follow-up Item
export interface FollowUpItem {
  id: string
  contact: Contact
  reason: string
  urgent: boolean
}

// Suggestion Item
export interface SuggestionItem {
  id: string
  contactName: string
  reason: string
  openingSuggestion: string
}

// Weekly Stats
export interface WeeklyStats {
  records: number
  visits: number
  progress: number
}

// Connector
export interface Connector {
  id: string
  name: string
  type: 'feishu' | 'wechat' | 'dingtalk'
  connected: boolean
  scopes?: string[]
  org?: string
  user?: string
}

// Message Template
export interface MessageTemplate {
  id: string
  name: string
  description: string
}

// Tab Type
export type TabType = 'conversation' | 'contacts' | 'action'

// Loading State
export interface LoadingState {
  loading: boolean
  error: string | null
}

// Filter Type
export type FilterType = 'all' | 'pending' | 'archived' | 'recent' | 'follow' | 'important'

// Agent Core Types
export type IsoDateString = string

export type JsonPrimitive = string | number | boolean | null
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue }

export type AgentRunStatus = 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled'

// Tool State Machine
export type ToolStatus =
  | 'idle'
  | 'queued'
  | 'running'
  | 'awaiting_input'
  | 'succeeded'
  | 'failed'
  | 'cancelled'

export interface AgentError {
  code: string
  message: string
  retryable?: boolean
  details?: JsonValue
}

export interface ToolState {
  id: string
  name: string
  status: ToolStatus
  input?: JsonValue
  output?: JsonValue
  error?: AgentError
  startedAt?: IsoDateString
  endedAt?: IsoDateString
}

export interface ToolStateUpdate {
  toolId: string
  name: string
  status: ToolStatus
  previousStatus?: ToolStatus
  at: IsoDateString
  message?: string
  input?: JsonValue
  output?: JsonValue
  error?: AgentError
}

// Agent Messages
export type AgentMessageRole = 'system' | 'user' | 'assistant' | 'tool'

export interface AgentMessage {
  id: string
  role: AgentMessageRole
  content: string
  createdAt: IsoDateString
  toolCallId?: string
  references?: AgentReference[]
  metadata?: Record<string, JsonValue>
}

export interface AgentMessageDelta {
  id: string
  delta: string
  role?: AgentMessageRole
  toolCallId?: string
}

export interface AgentToolCall {
  id: string
  name: string
  args: Record<string, JsonValue>
}

export interface AgentToolResult {
  toolCallId: string
  output?: JsonValue
  error?: AgentError
}

// Three-layer Context
export interface AgentGlobalContext {
  user?: User
  contacts?: Contact[]
  connectors?: Connector[]
  preferences?: Record<string, JsonValue>
  locale?: string
  timezone?: string
}

export interface AgentSessionContext {
  sessionId: string
  conversationId?: string
  history?: AgentMessage[]
  toolState?: Record<string, ToolState>
  references?: AgentReference[]
  vars?: Record<string, JsonValue>
}

export interface AgentRequestContext {
  requestId: string
  traceId?: string
  input?: string
  channel?: string
  deadlineMs?: number
  metadata?: Record<string, JsonValue>
}

export interface AgentContextLayers {
  global: AgentGlobalContext
  session: AgentSessionContext
  request: AgentRequestContext
}

export type AgentContextPatch =
  | { layer: 'global'; patch: Partial<AgentGlobalContext> }
  | { layer: 'session'; patch: Partial<AgentSessionContext> }
  | { layer: 'request'; patch: Partial<AgentRequestContext> }

// References
export type ReferenceSource = 'user' | 'system' | 'tool' | 'external'

export interface TextSpan {
  start: number
  end: number
}

interface ReferenceBase {
  id?: string
  label?: string
  source?: ReferenceSource
  span?: TextSpan
  meta?: Record<string, JsonValue>
}

export type AgentReference =
  | (ReferenceBase & { kind: 'contact'; id: string; snapshot?: Contact })
  | (ReferenceBase & { kind: 'event'; id: string; snapshot?: ContactEvent })
  | (ReferenceBase & { kind: 'conversation'; id: string; snapshot?: ConversationRecord })
  | (ReferenceBase & { kind: 'fact'; id: string; snapshot?: ExtractedFact })
  | (ReferenceBase & { kind: 'todo'; id: string; snapshot?: TodoItem })
  | (ReferenceBase & { kind: 'message'; id: string; snapshot?: AgentMessage })
  | (ReferenceBase & { kind: 'url'; uri: string; title?: string; snippet?: string })
  | (ReferenceBase & { kind: 'file'; path: string; title?: string })
  | (ReferenceBase & { kind: 'external'; uri: string; title?: string; snippet?: string })

// SSE Events
export interface SseEvent<TType extends string, TData> {
  event: TType
  data: TData
  id?: string
  retry?: number
}

export interface AgentRunStart {
  runId: string
  agentId?: string
  createdAt: IsoDateString
  input?: string
  context?: AgentContextLayers
}

export interface AgentRunEnd {
  runId: string
  status: AgentRunStatus
  finishedAt: IsoDateString
  output?: string
  error?: AgentError
}

export type AgentSseEvent =
  | SseEvent<'agent.start', AgentRunStart>
  | SseEvent<'agent.delta', AgentMessageDelta>
  | SseEvent<'agent.message', AgentMessage>
  | SseEvent<'tool.state', ToolStateUpdate>
  | SseEvent<'context.patch', AgentContextPatch>
  | SseEvent<'agent.end', AgentRunEnd>
  | SseEvent<'error', AgentError>
  | SseEvent<'ping', { at: IsoDateString }>
