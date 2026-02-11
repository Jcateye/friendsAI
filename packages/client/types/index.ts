// Database types for FriendsAI

export interface Contact {
  id: string;
  name: string;
  avatarColor: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Message {
  id: string;
  contactId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  toolCalls?: ToolCall[];
  createdAt: Date;
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
  result?: string;
}

export interface Conversation {
  id: string;
  contactId: string;
  lastMessageAt: Date;
  messageCount: number;
}

export interface ContactCard {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  company?: string;
  title?: string;
  notes?: string;
  tags?: string[];
  createdAt: Date;
  sourceMessageId: string;
}
