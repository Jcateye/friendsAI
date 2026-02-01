import { env } from '@/config/env';
import { MockToolProvider, ToolProvider } from './provider';
import { WebhookToolProvider } from './webhookProvider';

export const getToolProvider = (): ToolProvider => {
  if (env.toolProvider === 'webhook') {
    if (!env.toolWebhookUrl) {
      throw new Error('TOOL_WEBHOOK_URL is required when TOOL_PROVIDER=webhook');
    }
    return new WebhookToolProvider(env.toolWebhookUrl);
  }
  return new MockToolProvider();
};
