import { env } from '@/config/env';
import { AiProvider, MockAiProvider } from './provider';
import { OpenAICompatibleProvider } from './openaiCompat';

export const getAiProvider = (): AiProvider => {
  if (env.aiProvider === 'mock') {
    return new MockAiProvider();
  }
  if (env.aiProvider === 'openai_compat') {
    return new OpenAICompatibleProvider();
  }
  return new MockAiProvider();
};
