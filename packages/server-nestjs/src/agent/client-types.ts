export type IsoDateString = string;

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

export interface AgentError {
  code: string;
  message: string;
  retryable?: boolean;
  details?: JsonValue;
}

export type ToolStatus =
  | 'idle'
  | 'queued'
  | 'running'
  | 'awaiting_input'
  | 'succeeded'
  | 'failed'
  | 'cancelled';

export interface ToolStateUpdate {
  toolId: string;
  name: string;
  status: ToolStatus;
  previousStatus?: ToolStatus;
  at: IsoDateString;
  confirmationId?: string;
  message?: string;
  input?: JsonValue;
  output?: JsonValue;
  error?: AgentError;
}

export type AgentMessageRole = 'system' | 'user' | 'assistant' | 'tool';

export interface AgentReference {
  kind: string;
  [key: string]: JsonValue | undefined;
}

export interface AgentMessage {
  id: string;
  role: AgentMessageRole;
  content: string;
  createdAt: IsoDateString;
  createdAtMs?: number;
  toolCallId?: string;
  references?: AgentReference[];
  metadata?: Record<string, JsonValue>;
}

export interface AgentMessageDelta {
  id: string;
  delta: string;
  role?: AgentMessageRole;
  toolCallId?: string;
}

export interface Contact {
  id: string;
  name: string;
  initial: string;
  avatarColor: string;
  company?: string;
  role?: string;
  tags?: string[];
  lastContactTime?: string;
  lastContactSummary?: string;
}

export interface Connector {
  id: string;
  type: string;
  name: string;
  enabled: boolean;
}

export interface ToolState {
  id: string;
  name: string;
  status: ToolStatus;
  confirmationId?: string;
  message?: string;
  input?: JsonValue;
  output?: JsonValue;
  error?: AgentError;
  startedAt?: IsoDateString;
  endedAt?: IsoDateString;
}

export interface AgentGlobalContext {
  user?: {
    id: string;
    email?: string | null;
    phone?: string | null;
    name?: string | null;
  };
  contacts?: Contact[];
  connectors?: Connector[];
  preferences?: Record<string, JsonValue>;
  locale?: string;
  timezone?: string;
}

export interface AgentSessionContext {
  sessionId: string;
  conversationId?: string;
  history?: AgentMessage[];
  toolState?: Record<string, ToolState>;
  references?: AgentReference[];
  vars?: Record<string, JsonValue>;
}

export interface AgentRequestContext {
  requestId: string;
  traceId?: string;
  input?: string;
  channel?: string;
  deadlineMs?: number;
  metadata?: Record<string, JsonValue>;
}

export interface AgentContextLayers {
  global: AgentGlobalContext;
  session: AgentSessionContext;
  request: AgentRequestContext;
}

export type AgentContextPatch =
  | { layer: 'global'; patch: Partial<AgentGlobalContext> }
  | { layer: 'session'; patch: Partial<AgentSessionContext> }
  | { layer: 'request'; patch: Partial<AgentRequestContext> };

export type AgentRunStatus = 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled';

export interface AgentRunStart {
  runId: string;
  agentId?: string;
  createdAt: IsoDateString;
  input?: string;
  context?: AgentContextLayers;
}

export interface AgentRunEnd {
  runId: string;
  status: AgentRunStatus;
  finishedAt: IsoDateString;
  output?: string;
  error?: AgentError;
}

export interface SseEvent<TType extends string, TData> {
  event: TType;
  data: TData;
  id?: string;
  retry?: number;
}

export type AgentSseEvent =
  | SseEvent<'agent.start', AgentRunStart>
  | SseEvent<'agent.delta', AgentMessageDelta>
  | SseEvent<'agent.message', AgentMessage>
  | SseEvent<'tool.state', ToolStateUpdate>
  | SseEvent<'context.patch', AgentContextPatch>
  | SseEvent<'agent.end', AgentRunEnd>
  | SseEvent<'error', AgentError>
  | SseEvent<'ping', { at: IsoDateString }>;
