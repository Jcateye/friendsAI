import type OpenAI from 'openai';

type JsonSchema = Record<string, unknown>;

type ToolDefinition = OpenAI.Chat.Completions.ChatCompletionTool;

type ParameterSchema = {
  type: 'object';
  properties: Record<string, JsonSchema>;
  required?: string[];
  additionalProperties?: boolean;
};

const baseObject = (properties: Record<string, JsonSchema>, required: string[] = []): ParameterSchema => ({
  type: 'object',
  properties,
  required: required.length ? required : undefined,
  additionalProperties: false,
});

export const FEISHU_AGENT_TOOLS: ToolDefinition[] = [
  {
    type: 'function',
    function: {
      name: 'feishu_list_message_templates',
      description: 'List available Feishu message templates for the current tenant.',
      parameters: baseObject(
        {
          tenantId: { type: 'string', description: 'Tenant ID or tenant key for the Feishu workspace.' },
          query: { type: 'string', description: 'Optional search query to filter templates.' },
          pageSize: { type: 'integer', minimum: 1, maximum: 50, description: 'Max number of templates to return.' },
          pageToken: { type: 'string', description: 'Pagination token from a previous response.' },
        },
        ['tenantId']
      ),
    },
  },
  {
    type: 'function',
    function: {
      name: 'feishu_send_template_message',
      description: 'Send a Feishu message using a predefined template and variables.',
      parameters: baseObject(
        {
          recipientType: {
            type: 'string',
            enum: ['user', 'chat'],
            description: 'Target type to receive the message.',
          },
          recipientId: { type: 'string', description: 'User ID or chat ID in Feishu.' },
          templateId: { type: 'string', description: 'Message template ID.' },
          templateVariables: {
            type: 'object',
            description: 'Key-value data to render the template.',
            additionalProperties: true,
          },
          language: { type: 'string', description: 'Optional template language code.' },
          traceId: { type: 'string', description: 'Optional trace ID for audit or correlation.' },
        },
        ['recipientType', 'recipientId', 'templateId', 'templateVariables']
      ),
    },
  },
  {
    type: 'function',
    function: {
      name: 'feishu_create_trace_record',
      description: 'Create an internal trace/log record in Feishu for follow-up or compliance.',
      parameters: baseObject(
        {
          title: { type: 'string', description: 'Short title for the trace record.' },
          content: { type: 'string', description: 'Detailed content of the record.' },
          occurredAt: { type: 'string', description: 'ISO-8601 datetime when the activity occurred.' },
          relatedContactName: { type: 'string', description: 'Human-readable contact name for context.' },
          relatedContactId: { type: 'string', description: 'Optional Feishu contact ID for linking.' },
          tags: { type: 'array', items: { type: 'string' }, description: 'Optional tags for categorization.' },
          visibility: {
            type: 'string',
            enum: ['internal', 'private'],
            description: 'Visibility scope for the record.',
          },
          attachmentUrls: {
            type: 'array',
            items: { type: 'string' },
            description: 'Optional attachment URLs.',
          },
        },
        ['title', 'content']
      ),
    },
  },
  {
    type: 'function',
    function: {
      name: 'feishu_dispatch_internal_notice',
      description: 'Dispatch an internal notice in Feishu to users, chats, or departments.',
      parameters: baseObject(
        {
          title: { type: 'string', description: 'Notice title.' },
          content: { type: 'string', description: 'Notice body content.' },
          targetType: {
            type: 'string',
            enum: ['user', 'chat', 'department'],
            description: 'Target audience type for the notice.',
          },
          targetIds: {
            type: 'array',
            items: { type: 'string' },
            description: 'Target IDs based on targetType.',
          },
          priority: {
            type: 'string',
            enum: ['low', 'normal', 'high', 'urgent'],
            description: 'Delivery priority for the notice.',
          },
          requiresAck: { type: 'boolean', description: 'Whether recipients must acknowledge the notice.' },
          deadline: { type: 'string', description: 'Optional ISO-8601 deadline for acknowledgement.' },
        },
        ['title', 'content', 'targetType', 'targetIds']
      ),
    },
  },
];
