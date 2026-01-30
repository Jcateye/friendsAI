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
