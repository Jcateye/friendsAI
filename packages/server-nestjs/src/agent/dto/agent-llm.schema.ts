import { z } from 'zod';
import type {
  LlmProviderName,
  LlmRequestConfig,
  LlmProviderOptions,
} from '../../ai/providers/llm-types';

const MAX_PROVIDER_OPTIONS_BYTES = 64 * 1024;

export const LEGACY_LLM_FIELDS = ['model', 'temperature', 'maxTokens', 'max_tokens'] as const;

const PROVIDER_ALIAS_MAP: Record<string, LlmProviderName> = {
  anthropic: 'claude',
  google: 'gemini',
};

const PROVIDER_OPTIONS_KEY_ALIAS_MAP: Record<string, string> = {
  claude: 'anthropic',
  gemini: 'google',
  'openai-compatible': 'openaiCompatible',
  openai_compatible: 'openaiCompatible',
};

const NumberField = z
  .number({ message: 'must be a number' })
  .refine((value) => Number.isFinite(value), { message: 'must be finite' });

const LlmSchema = z.object({
  provider: z.string().trim().min(1),
  model: z.string().trim().min(1),
  temperature: NumberField.optional(),
  maxOutputTokens: z.number().int().positive().optional(),
  topP: NumberField.optional(),
  topK: z.number().int().positive().optional(),
  stopSequences: z.array(z.string()).max(16).optional(),
  seed: z.number().int().optional(),
  presencePenalty: NumberField.optional(),
  frequencyPenalty: NumberField.optional(),
  providerOptions: z.record(z.string(), z.record(z.string(), z.unknown())).optional(),
});

export class AgentLlmValidationError extends Error {
  readonly code: 'invalid_llm_request' | 'unsupported_llm_provider';
  readonly details?: unknown;

  constructor(code: 'invalid_llm_request' | 'unsupported_llm_provider', message: string, details?: unknown) {
    super(message);
    this.code = code;
    this.details = details;
    this.name = 'AgentLlmValidationError';
  }
}

export function findLegacyLlmFields(body: unknown): string[] {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return [];
  }

  const payload = body as Record<string, unknown>;
  return LEGACY_LLM_FIELDS.filter((key) => key in payload);
}

export function parseAgentLlmOrThrow(body: unknown): LlmRequestConfig {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new AgentLlmValidationError('invalid_llm_request', 'Request body must be an object.');
  }

  const payload = body as Record<string, unknown>;
  const parsed = LlmSchema.safeParse(payload.llm);
  if (!parsed.success) {
    throw new AgentLlmValidationError('invalid_llm_request', 'Invalid llm request payload.', parsed.error.flatten());
  }

  const provider = normalizeProvider(parsed.data.provider);
  if (!provider) {
    throw new AgentLlmValidationError(
      'unsupported_llm_provider',
      `Unsupported LLM provider: ${parsed.data.provider}`,
    );
  }

  const providerOptions = normalizeProviderOptions(parsed.data.providerOptions);
  ensureSerializable(providerOptions);

  const llm: LlmRequestConfig = {
    provider,
    model: parsed.data.model,
    temperature: parsed.data.temperature,
    maxOutputTokens: parsed.data.maxOutputTokens,
    topP: parsed.data.topP,
    topK: parsed.data.topK,
    stopSequences: parsed.data.stopSequences,
    seed: parsed.data.seed,
    presencePenalty: parsed.data.presencePenalty,
    frequencyPenalty: parsed.data.frequencyPenalty,
    providerOptions,
  };

  return llm;
}

function normalizeProvider(raw: string): LlmProviderName | null {
  const normalized = raw.trim().toLowerCase();

  if (normalized in PROVIDER_ALIAS_MAP) {
    return PROVIDER_ALIAS_MAP[normalized];
  }

  if (
    normalized === 'openai' ||
    normalized === 'claude' ||
    normalized === 'gemini' ||
    normalized === 'openai-compatible'
  ) {
    return normalized;
  }

  return null;
}

function normalizeProviderOptions(options: LlmProviderOptions | undefined): LlmProviderOptions | undefined {
  if (!options || Object.keys(options).length === 0) {
    return undefined;
  }

  const normalized: LlmProviderOptions = {};

  for (const [rawKey, rawValue] of Object.entries(options)) {
    if (!rawValue || typeof rawValue !== 'object' || Array.isArray(rawValue)) {
      continue;
    }

    const key = PROVIDER_OPTIONS_KEY_ALIAS_MAP[rawKey] ?? rawKey;
    normalized[key] = rawValue;
  }

  if (Object.keys(normalized).length === 0) {
    return undefined;
  }

  return normalized;
}

function ensureSerializable(value: unknown): void {
  if (value === undefined) {
    return;
  }

  const visited = new WeakSet<object>();
  walkJson(value, '$', visited);

  const encoded = JSON.stringify(value);
  if (encoded === undefined) {
    throw new AgentLlmValidationError('invalid_llm_request', 'llm.providerOptions cannot be serialized.');
  }

  const size = Buffer.byteLength(encoded, 'utf8');
  if (size > MAX_PROVIDER_OPTIONS_BYTES) {
    throw new AgentLlmValidationError(
      'invalid_llm_request',
      `llm.providerOptions is too large (${size} bytes > ${MAX_PROVIDER_OPTIONS_BYTES} bytes).`,
    );
  }
}

function walkJson(value: unknown, path: string, visited: WeakSet<object>): void {
  if (value === null) {
    return;
  }

  const valueType = typeof value;

  if (valueType === 'string' || valueType === 'boolean') {
    return;
  }

  if (valueType === 'number') {
    if (!Number.isFinite(value as number)) {
      throw new AgentLlmValidationError('invalid_llm_request', `${path} must be a finite number.`);
    }
    return;
  }

  if (valueType !== 'object') {
    throw new AgentLlmValidationError(
      'invalid_llm_request',
      `${path} contains unsupported type: ${valueType}.`,
    );
  }

  const objectValue = value as object;

  if (visited.has(objectValue)) {
    throw new AgentLlmValidationError('invalid_llm_request', `${path} contains circular references.`);
  }
  visited.add(objectValue);

  if (Array.isArray(value)) {
    value.forEach((item, index) => walkJson(item, `${path}[${index}]`, visited));
    visited.delete(objectValue);
    return;
  }

  for (const [key, nestedValue] of Object.entries(value as Record<string, unknown>)) {
    walkJson(nestedValue, `${path}.${key}`, visited);
  }

  visited.delete(objectValue);
}
