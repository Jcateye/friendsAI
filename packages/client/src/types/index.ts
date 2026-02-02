export interface User {
  id: string
  email?: string | null
  phone?: string | null
  name?: string
}

export type RecordStatus = 'pending' | 'archived'

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
