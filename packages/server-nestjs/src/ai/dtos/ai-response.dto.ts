export interface AITextMessage {
  message_type: 'text';
  content: string;
}

export interface AIToolCall {
  message_type: 'tool_call';
  tool_calls: Array<{
    id: string;
    type: string;
    function: {
      name: string;
      arguments: string;
    };
  }>;
}

export type AIResponse = AITextMessage | AIToolCall;
