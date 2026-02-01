import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { embed } from 'ai';
import { env } from '@/config/env';

export const embedText = async (text: string) => {
  const provider = createOpenAICompatible({
    baseURL: env.embeddingBaseUrl,
    name: 'friendsai-embeddings',
    apiKey: env.embeddingApiKey || undefined
  });

  // Use text embedding model (OpenAI-compatible /v1/embeddings).
  const model = provider.textEmbeddingModel(env.embeddingModel);
  const result = await embed({
    model,
    value: text,
    maxRetries: 2
  });

  return result.embedding;
};
