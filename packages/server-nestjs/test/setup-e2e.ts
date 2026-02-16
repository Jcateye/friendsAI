process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';
process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'test-openai-key';
process.env.AGENT_METRICS_ENABLED = 'false';

const defaultE2eDbUrl = 'postgres://friendsai:friendsai@localhost:5434/friendsai_test';
process.env.DATABASE_URL = process.env.E2E_DATABASE_URL || defaultE2eDbUrl;
process.env.DATABASE_URL_V3 =
  process.env.E2E_DATABASE_URL_V3 || process.env.E2E_DATABASE_URL || defaultE2eDbUrl;
