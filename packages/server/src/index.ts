import { createApp } from '@/app/app';
import { env } from '@/config/env';

const app = createApp();

app.listen(env.port, () => {
  // eslint-disable-next-line no-console
  console.log(`Server running on http://localhost:${env.port}`);
});

export default app;
