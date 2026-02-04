import { Injectable } from '@nestjs/common';

export type JsonSchema = {
  type?: string;
  description?: string;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  items?: JsonSchema;
  enum?: Array<string | number | boolean | null>;
  anyOf?: JsonSchema[];
  oneOf?: JsonSchema[];
  allOf?: JsonSchema[];
  additionalProperties?: boolean;
};

export type ToolHandler<TArgs = unknown, TResult = unknown> = (
  args: TArgs
) => Promise<TResult> | TResult;

export interface ToolDefinition<TArgs = unknown, TResult = unknown> {
  name: string;
  description: string;
  parameters: JsonSchema;
  handler?: ToolHandler<TArgs, TResult>;
}

export interface AiSdkTool<TArgs = unknown, TResult = unknown> {
  description?: string;
  parameters?: JsonSchema;
  execute?: ToolHandler<TArgs, TResult>;
}

@Injectable()
export class ToolRegistry {
  private readonly tools = new Map<string, ToolDefinition>();

  register(tool: ToolDefinition): void {
    if (!tool?.name) {
      throw new Error('Tool name is required.');
    }
    if (this.tools.has(tool.name)) {
      throw new Error(`Tool "${tool.name}" is already registered.`);
    }
    this.tools.set(tool.name, tool);
  }

  registerMany(tools: ToolDefinition[]): void {
    for (const tool of tools) {
      this.register(tool);
    }
  }

  get(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  list(): ToolDefinition[] {
    return Array.from(this.tools.values());
  }

  toAiSdkTools(): Record<string, AiSdkTool> {
    const tools: Record<string, AiSdkTool> = {};
    for (const tool of this.tools.values()) {
      tools[tool.name] = {
        description: tool.description,
        parameters: tool.parameters,
        execute: tool.handler,
      };
    }
    return tools;
  }
}
