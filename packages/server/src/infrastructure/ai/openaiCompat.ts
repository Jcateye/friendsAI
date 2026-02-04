import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { generateText, Output, type LanguageModel } from 'ai';
import { z } from 'zod';
import { env } from '@/config/env';
import { AiProvider, ContactContext, ExtractedItem } from './provider';

const ExtractedItemSchema = z.object({
  type: z.enum(['event', 'fact', 'action']),
  payload: z.record(z.string(), z.unknown())
});

const ExtractResponseSchema = z.object({
  items: z.array(ExtractedItemSchema)
});

export class OpenAICompatibleProvider implements AiProvider {
  private model: LanguageModel;
  private fallbackModel: LanguageModel | null;
  private routingMode: 'primary' | 'fallback' | 'auto';

  constructor() {
    this.routingMode = (env.aiRoutingMode as 'primary' | 'fallback' | 'auto') ?? 'primary';

    const primary = createOpenAICompatible({
      baseURL: env.aiBaseUrl,
      name: 'friendsai-openai-compat-primary',
      apiKey: env.aiApiKey || undefined
    });
    this.model = primary(env.aiModel);

    if (env.aiFallbackBaseUrl) {
      const fallback = createOpenAICompatible({
        baseURL: env.aiFallbackBaseUrl,
        name: 'friendsai-openai-compat-fallback',
        apiKey: env.aiFallbackApiKey || undefined
      });
      this.fallbackModel = fallback(env.aiFallbackModel || env.aiModel);
    } else {
      this.fallbackModel = null;
    }
  }

  private async withRouting<T>(fn: (model: LanguageModel) => Promise<T>): Promise<T> {
    if (this.routingMode === 'fallback') {
      if (!this.fallbackModel) {
        throw new Error('AI_ROUTING_MODE=fallback but AI_FALLBACK_BASE_URL is not configured');
      }
      return fn(this.fallbackModel);
    }

    if (this.routingMode === 'primary') {
      return fn(this.model);
    }

    // auto: try primary then fallback
    try {
      return await fn(this.model);
    } catch (err) {
      if (!this.fallbackModel) {
        throw err;
      }
      return fn(this.fallbackModel);
    }
  }

  async extract(journalText: string): Promise<ExtractedItem[]> {
    const system =
      'You extract structured candidate items from a meeting note. ' +
      'Return a JSON object that matches the provided schema. ' +
      'No markdown, no explanation.';

    const prompt = [
      'Meeting note:',
      journalText,
      '',
      'Rules:',
      '- For event payload: { summary: string, occurredAt?: string }',
      '- For fact payload: { key: string, value: string, confidence?: number }',
      '- For action payload: { title: string, dueAt?: string, toolTask?: { type: string, payload: object, executeAt?: string } }',
      '- Keep items minimal and high-signal; confidence defaults to 0.6.'
    ].join('\n');

    try {
      const result = await this.withRouting((model) =>
        generateText({
          model,
          system,
          prompt,
          temperature: 0.2,
          maxRetries: 2,
          output: Output.object({
            name: 'ExtractedItems',
            // Prevent TS from exploding on deep zod inference while still validating at runtime.
            schema: ExtractResponseSchema as any
          })
        })
      );

      const parsed = ExtractResponseSchema.safeParse((result as any).output);
      if (!parsed.success) {
        return [];
      }
      return parsed.data.items;
    } catch {
      return [];
    }
  }

  async brief(context: ContactContext): Promise<string> {
    const system =
      'You write a 5-minute pre-meeting brief for a relationship CRM. ' +
      'Be concise, actionable, and refer to facts/events/actions. ' +
      'Return plain text only.';

    const prompt = [
      'Context JSON:',
      JSON.stringify(context),
      '',
      'Output format:',
      '- One-line header',
      '- Key facts (bullets)',
      '- Recent timeline (bullets)',
      '- Open actions (bullets)',
      '- Suggested next message (1-2 sentences)'
    ].join('\n');

    const result = await this.withRouting((model) =>
      generateText({
        model,
        system,
        prompt,
        temperature: 0.4,
        maxRetries: 2
      })
    );

    return (result as { text: string }).text.trim();
  }
}
