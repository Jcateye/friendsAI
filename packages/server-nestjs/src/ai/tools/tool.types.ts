export type ToolPermission = 'allow' | 'confirm' | 'deny';

export interface ToolExecutionContext {
  userId?: string;
  conversationId?: string;
  metadata?: Record<string, unknown>;
}

export interface ToolCall {
  id?: string;
  name: string;
  arguments?: unknown;
}

export interface ToolExecutionResult {
  status: 'success' | 'denied' | 'requires_confirmation' | 'error';
  toolName: string;
  callId?: string;
  confirmationId?: string;
  result?: unknown;
  error?: string;
}

export type ToolPermissionResolver<TArgs = unknown> = (
  context: ToolExecutionContext,
  args: TArgs,
) => ToolPermission | Promise<ToolPermission>;

export interface ToolDefinition<TArgs = unknown, TResult = unknown> {
  name: string;
  description?: string;
  parameters?: Record<string, unknown>;
  handler: (args: TArgs, context: ToolExecutionContext) => TResult | Promise<TResult>;
  permission?: ToolPermission | ToolPermissionResolver<TArgs>;
}
