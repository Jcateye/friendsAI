import { env } from '@/config/env';
import { embedText } from '@/infrastructure/ai/embeddings';

(async () => {
  const embedding = await embedText('Hello world');
  // eslint-disable-next-line no-console
  console.log('EMBEDDING_BASE_URL', env.embeddingBaseUrl);
  // eslint-disable-next-line no-console
  console.log('EMBEDDING_MODEL', env.embeddingModel);
  // eslint-disable-next-line no-console
  console.log('dim', embedding.length);
})();
