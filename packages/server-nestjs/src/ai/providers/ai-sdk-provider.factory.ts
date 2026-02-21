import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import type { EmbeddingModel, LanguageModel } from 'ai';
import type {
  ProviderFactory,
  ResolvedRuntimeEmbeddingConfig,
  ResolvedRuntimeLlmConfig,
} from './llm-config.types';
import { LlmConfigurationError } from './llm-config.types';

export class AiSdkProviderFactory implements ProviderFactory {
  createLanguageModel(config: ResolvedRuntimeLlmConfig): LanguageModel {
    switch (config.provider) {
      case 'openai': {
        const apiKey = this.requireApiKey(config.apiKey, 'openai');
        const provider = createOpenAI({
          apiKey,
          baseURL: config.baseURL,
        });
        return provider.languageModel(config.model);
      }
      case 'claude': {
        const apiKey = this.requireApiKey(config.apiKey, 'claude');
        const provider = createAnthropic({
          apiKey,
          baseURL: config.baseURL,
          name: 'anthropic',
        });
        return provider.languageModel(config.model);
      }
      case 'gemini': {
        const apiKey = this.requireApiKey(config.apiKey, 'gemini');
        const provider = createGoogleGenerativeAI({
          apiKey,
          baseURL: config.baseURL,
          name: 'google',
        });
        return provider.languageModel(config.model);
      }
      case 'openai-compatible': {
        if (!config.baseURL) {
          throw new LlmConfigurationError(
            'llm_provider_not_configured',
            'openai-compatible provider requires LLM_BASE_URL.',
          );
        }
        const provider = createOpenAICompatible({
          name: 'openaiCompatible',
          baseURL: config.baseURL,
          apiKey: config.apiKey,
        });
        return provider.languageModel(config.model);
      }
      default:
        throw new LlmConfigurationError(
          'unsupported_llm_provider',
          `Unsupported LLM provider: ${String(config.provider)}`,
        );
    }
  }

  createEmbeddingModel(config: ResolvedRuntimeEmbeddingConfig): EmbeddingModel {
    switch (config.provider) {
      case 'openai': {
        const apiKey = this.requireApiKey(config.apiKey, 'openai');
        const provider = createOpenAI({
          apiKey,
          baseURL: config.baseURL,
        });
        return provider.embeddingModel(config.model);
      }
      case 'gemini': {
        const apiKey = this.requireApiKey(config.apiKey, 'gemini');
        const provider = createGoogleGenerativeAI({
          apiKey,
          baseURL: config.baseURL,
          name: 'google',
        });
        return provider.textEmbeddingModel(config.model);
      }
      case 'openai-compatible': {
        if (!config.baseURL) {
          throw new LlmConfigurationError(
            'llm_provider_not_configured',
            'openai-compatible embedding provider requires LLM_BASE_URL.',
          );
        }
        const provider = createOpenAICompatible({
          name: 'openaiCompatible',
          baseURL: config.baseURL,
          apiKey: config.apiKey,
        });
        return provider.embeddingModel(config.model);
      }
      case 'claude':
        throw new LlmConfigurationError(
          'unsupported_llm_provider',
          'claude provider does not support embeddings in current runtime.',
        );
      default:
        throw new LlmConfigurationError(
          'unsupported_llm_provider',
          `Unsupported embedding provider: ${String(config.provider)}`,
        );
    }
  }

  private requireApiKey(apiKey: string | undefined, provider: string): string {
    if (!apiKey || apiKey.trim().length === 0) {
      throw new LlmConfigurationError(
        'llm_provider_not_configured',
        `${provider} provider API key is not configured.`,
      );
    }
    return apiKey;
  }
}
