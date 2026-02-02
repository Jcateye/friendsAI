import dotenv from 'dotenv';

dotenv.config();

const required = (key: string, fallback?: string) => {
  const value = process.env[key] ?? fallback;
  if (!value) {
    throw new Error(`Missing env var: ${key}`);
  }
  return value;
};

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 3000),
  databaseUrl: required('DATABASE_URL', process.env.DB_URL),
  jwtSecret: required('JWT_SECRET'),
  jwtIssuer: process.env.JWT_ISSUER ?? 'friends-ai',
  jwtAccessTtlSec: Number(process.env.JWT_ACCESS_TTL_SEC ?? 60 * 60),
  jwtRefreshTtlSec: Number(process.env.JWT_REFRESH_TTL_SEC ?? 60 * 60 * 24 * 30),
  aiProvider: process.env.AI_PROVIDER ?? 'mock',
  // Primary model endpoint (usually your local proxy)
  aiBaseUrl: process.env.AI_BASE_URL ?? process.env.AI_PRIMARY_BASE_URL ?? 'https://api.openai.com/v1',
  aiApiKey: process.env.AI_API_KEY ?? process.env.AI_PRIMARY_API_KEY ?? '',
  aiModel: process.env.AI_MODEL ?? process.env.AI_PRIMARY_MODEL ?? 'gpt-4o-mini',

  // Optional fallback endpoint (usually OpenAI cloud) for auto failover
  aiFallbackBaseUrl: process.env.AI_FALLBACK_BASE_URL ?? '',
  aiFallbackApiKey: process.env.AI_FALLBACK_API_KEY ?? '',
  aiFallbackModel: process.env.AI_FALLBACK_MODEL ?? '',

  // primary | fallback | auto
  aiRoutingMode: process.env.AI_ROUTING_MODE ?? 'primary',

  // Embeddings: often a different provider/model (e.g. only OpenAI has it)
  embeddingBaseUrl:
    process.env.EMBEDDING_BASE_URL ??
    process.env.AI_FALLBACK_BASE_URL ??
    process.env.AI_BASE_URL ??
    'https://api.openai.com/v1',
  embeddingApiKey:
    process.env.EMBEDDING_API_KEY ??
    process.env.AI_FALLBACK_API_KEY ??
    process.env.AI_API_KEY ??
    '',
  // Keep default aligned with pgvector dimension 1536 in our schema.
  embeddingModel: process.env.EMBEDDING_MODEL ?? 'text-embedding-3-small',
  briefCacheTtlSec: Number(process.env.BRIEF_CACHE_TTL_SEC ?? 60 * 10),
  toolWorkerIntervalMs: Number(process.env.TOOL_WORKER_INTERVAL_MS ?? 5000),
  toolProvider: process.env.TOOL_PROVIDER ?? 'mock',
  toolWebhookUrl: process.env.TOOL_WEBHOOK_URL ?? '',
  // Dev-only universal verify code (disabled in production unless explicitly set).
  devVerifyCode: (() => {
    if (process.env.DEV_VERIFY_CODE) return process.env.DEV_VERIFY_CODE;
    const nodeEnv = process.env.NODE_ENV ?? 'development';
    return nodeEnv === 'production' ? '' : '123456';
  })()
};
