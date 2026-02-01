export interface ToolExecutionResult {
  status: 'success' | 'error';
  response: Record<string, unknown>;
}

export interface ToolProvider {
  execute(type: string, payload: Record<string, unknown>): Promise<ToolExecutionResult>;
}

export class MockToolProvider implements ToolProvider {
  async execute(type: string, payload: Record<string, unknown>): Promise<ToolExecutionResult> {
    return {
      status: 'success',
      response: {
        message: `Mock executed tool: ${type}`,
        payload
      }
    };
  }
}
