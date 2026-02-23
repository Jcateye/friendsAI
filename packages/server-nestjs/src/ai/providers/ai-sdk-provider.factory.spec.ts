import { AiSdkProviderFactory } from './ai-sdk-provider.factory';
import { LlmConfigurationError } from './llm-config.types';

describe('AiSdkProviderFactory', () => {
  let factory: AiSdkProviderFactory;

  beforeEach(() => {
    factory = new AiSdkProviderFactory();
  });

  it('creates language model for openai', () => {
    const model = factory.createLanguageModel({
      provider: 'openai',
      model: 'gpt-4.1-mini',
      apiKey: 'openai-test-key',
    });

    expect(model).toBeDefined();
  });

  it('creates language model for claude', () => {
    const model = factory.createLanguageModel({
      provider: 'claude',
      model: 'claude-3-7-sonnet',
      apiKey: 'anthropic-test-key',
    });

    expect(model).toBeDefined();
  });

  it('creates language model for gemini', () => {
    const model = factory.createLanguageModel({
      provider: 'gemini',
      model: 'gemini-2.0-flash',
      apiKey: 'google-test-key',
    });

    expect(model).toBeDefined();
  });

  it('creates language model for openai-compatible', () => {
    const model = factory.createLanguageModel({
      provider: 'openai-compatible',
      model: 'gpt-4.1-mini',
      baseURL: 'https://example.com/v1',
      apiKey: 'openai-compatible-key',
    });

    expect(model).toBeDefined();
  });

  it('throws llm_provider_not_configured when openai key is missing', () => {
    expect(() =>
      factory.createLanguageModel({
        provider: 'openai',
        model: 'gpt-4.1-mini',
      }),
    ).toThrow(LlmConfigurationError);

    try {
      factory.createLanguageModel({
        provider: 'openai',
        model: 'gpt-4.1-mini',
      });
    } catch (error) {
      expect(error).toBeInstanceOf(LlmConfigurationError);
      expect((error as LlmConfigurationError).code).toBe('llm_provider_not_configured');
    }
  });

  it('throws llm_provider_not_configured when openai-compatible baseURL is missing', () => {
    expect(() =>
      factory.createLanguageModel({
        provider: 'openai-compatible',
        model: 'gpt-4.1-mini',
        apiKey: 'test-key',
      }),
    ).toThrow(LlmConfigurationError);
  });

  it('creates embedding model for openai', () => {
    const model = factory.createEmbeddingModel({
      provider: 'openai',
      model: 'text-embedding-3-small',
      apiKey: 'openai-test-key',
    });

    expect(model).toBeDefined();
  });

  it('creates embedding model for gemini', () => {
    const model = factory.createEmbeddingModel({
      provider: 'gemini',
      model: 'text-embedding-004',
      apiKey: 'google-test-key',
    });

    expect(model).toBeDefined();
  });

  it('throws unsupported_llm_provider for claude embedding', () => {
    try {
      factory.createEmbeddingModel({
        provider: 'claude',
        model: 'claude-3-7-sonnet',
        apiKey: 'anthropic-test-key',
      });
      throw new Error('expected failure');
    } catch (error) {
      expect(error).toBeInstanceOf(LlmConfigurationError);
      expect((error as LlmConfigurationError).code).toBe('unsupported_llm_provider');
    }
  });
});
