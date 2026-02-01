import { env } from '@/config/env';
import { getAiProvider } from '@/infrastructure/ai';

(async () => {
  const ai = getAiProvider();
  const items = await ai.extract('Hello\nWe talked about pricing.\nWe agreed: send updated proposal by Friday.');
  // eslint-disable-next-line no-console
  console.log('AI_PROVIDER', env.aiProvider);
  // eslint-disable-next-line no-console
  console.log(JSON.stringify(items, null, 2));
})();
