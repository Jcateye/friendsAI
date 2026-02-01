import { ToolProvider, ToolExecutionResult } from './provider';

export class WebhookToolProvider implements ToolProvider {
  private url: string;

  constructor(url: string) {
    this.url = url;
  }

  async execute(type: string, payload: Record<string, unknown>): Promise<ToolExecutionResult> {
    const resp = await fetch(this.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, payload })
    });

    const text = await resp.text();
    return {
      status: resp.ok ? 'success' : 'error',
      response: {
        httpStatus: resp.status,
        body: text
      }
    };
  }
}
