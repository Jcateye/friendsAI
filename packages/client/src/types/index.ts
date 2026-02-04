export interface User {
  id: string
  email?: string | null
  phone?: string | null
  name?: string
}

export type RecordStatus = 'pending' | 'archived'

// Tool Trace Status
export type ToolTraceStatus =
  | 'pending'
  | 'running'
  | 'success'
  | 'failed'
  | 'timeout'
  | 'canceled'

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

export interface ConversationDetail extends ConversationRecord {
  originalContent: string
  archiveResult?: ArchiveResult
}

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

export type EventType = 'meeting' | 'call' | 'visit' | 'email' | 'note' | 'other'

export interface ContactEvent {
  id: string
  type: EventType
  date: string
  location?: string
  summary: string
  todoCount?: number
}

export interface ExtractedFact {
  id: string
  content: string
  type: 'trait' | 'preference' | 'info'
}

export interface TodoItem {
  id: string
  content: string
  suggestedDate?: string
  completed: boolean
}

export interface ArchiveResult {
  recognizedPeople: Contact[]
  newEvents: ContactEvent[]
  extractedFacts: ExtractedFact[]
  todoItems: TodoItem[]
}

export interface ContactDetail extends Contact {
  briefing?: ContactBriefing
  events: ContactEvent[]
  facts?: string[]
  actions?: string[]
}

export interface ContactBriefing {
  lastSummary: string
  pendingTodos: string[]
  traits: string[]
  suggestion: string
}

export interface FollowUpItem {
  id: string
  contact: Contact
  reason: string
  urgent: boolean
}

export interface MessageTemplate {
  id: string
  name: string
  description: string
  defaultContent?: string
}

export type ChatRole = 'user' | 'assistant' | 'tool'

export interface ChatSession {
  id: string
  title?: string | null
  createdAt: string
  updatedAt: string
}

export interface ChatMessage {
  id: string
  sessionId: string
  role: ChatRole
  content: string
  metadata?: Record<string, any>
  createdAt: string
}

export interface WeeklyStats {
  records: number
  visits: number
  progress: number
}

export interface ActionItem {
  id: string
  contact_id?: string
  due_at?: string | null
  status: string
  suggestion_reason?: string
  source_entry_id?: string
  contact_name?: string
}

export interface ToolTask {
  id: string
  action_item_id: string
  type: string
  payload_json: Record<string, any>
  execute_at?: string | null
  status: string
  contact_id?: string
  contact_name?: string
  last_execution_status?: string | null
  last_execution_response?: any
  last_execution_at?: string | null
}

export interface JournalEntry {
  id: string
  workspace_id: string
  author_id: string
  raw_text: string
  status: string
  created_at: string
  updated_at: string
}

export interface ExtractedItem {
  id: string
  journal_entry_id: string
  type: 'event' | 'fact' | 'action'
  payload_json: Record<string, any>
  status: string
  created_at: string
  updated_at: string
}

export interface BriefSnapshot {
  id: string
  contact_id: string
  content: string
  generated_at: string
  source_hash: string
}

export type TabType = 'conversation' | 'contacts' | 'action'

export interface LoadingState {
  loading: boolean
  error: string | null
}

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

// Tool Confirmation Types
export type ToolConfirmationStatus = 'pending' | 'confirmed' | 'rejected' | 'failed'

export interface ToolConfirmation {
  id: string
  toolName: string
  payload: Record<string, any> | null
  result: Record<string, any> | null
  status: ToolConfirmationStatus
  error: string | null
  conversationId: string | null
  userId: string | null
  confirmedAt: string | null
  rejectedAt: string | null
  executedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateToolConfirmationDto {
  toolName: string
  payload?: Record<string, any>
  conversationId?: string
  userId?: string
}

export interface Connector {
  id: string
  type: string
  name: string
  enabled: boolean
}
