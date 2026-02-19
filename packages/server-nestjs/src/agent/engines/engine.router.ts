import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import type { AgentRunRequest, AgentStreamEvent } from '../agent.types';
import type { IAgentEngine } from './engine.interface';
import { EnginePolicyResolver } from './engine-policy.resolver';
import { LocalEngine } from './local.engine';
import type {
  AgentEngineChatOptions,
  AgentEngineChatRequest,
  AgentEngineName,
  AgentEngineRunOptions,
  AgentEngineRunResult,
  RuntimeRouterDecision,
} from './engine.types';
import { OPENCLAW_ENGINE_TOKEN } from './engine.types';

@Injectable()
export class EngineRouter {
  private readonly logger = new Logger(EngineRouter.name);

  constructor(
    private readonly policyResolver: EnginePolicyResolver,
    private readonly localEngine: LocalEngine,
    @Optional()
    @Inject(OPENCLAW_ENGINE_TOKEN)
    private readonly openclawEngine?: IAgentEngine,
  ) {}

  streamChat(
    request: AgentEngineChatRequest,
    options?: AgentEngineChatOptions,
  ): AsyncGenerator<AgentStreamEvent> {
    const decision = this.policyResolver.resolve({
      endpoint: 'chat',
      userId: request.userId,
      operation: null,
    });

    return this.streamWithFallback(decision, request, options);
  }

  async run(
    agentId: AgentRunRequest['agentId'],
    operation: string | null | undefined,
    input: Record<string, unknown>,
    options?: AgentEngineRunOptions,
  ): Promise<AgentEngineRunResult> {
    const decision = this.policyResolver.resolve({
      endpoint: 'run',
      userId: options?.userId,
      agentId,
      operation,
    });

    const primaryEngine = this.resolveAvailableEngine(decision.primaryEngine);
    if (!primaryEngine) {
      return this.runFallbackOrThrow(decision, agentId, operation, input, options, undefined);
    }

    try {
      return await primaryEngine.run(agentId, operation, input, options);
    } catch (error) {
      return this.runFallbackOrThrow(decision, agentId, operation, input, options, error);
    }
  }

  private async *streamWithFallback(
    decision: RuntimeRouterDecision,
    request: AgentEngineChatRequest,
    options?: AgentEngineChatOptions,
  ): AsyncGenerator<AgentStreamEvent> {
    const primaryEngine = this.resolveAvailableEngine(decision.primaryEngine);
    if (!primaryEngine) {
      yield* this.streamFallbackOrThrow(decision, request, options, undefined);
      return;
    }

    let emitted = false;

    try {
      for await (const event of primaryEngine.streamChat(request, options)) {
        emitted = true;
        yield event;
      }
      return;
    } catch (error) {
      if (emitted) {
        throw error;
      }
      yield* this.streamFallbackOrThrow(decision, request, options, error);
    }
  }

  private async runFallbackOrThrow(
    decision: RuntimeRouterDecision,
    agentId: AgentRunRequest['agentId'],
    operation: string | null | undefined,
    input: Record<string, unknown>,
    options: AgentEngineRunOptions | undefined,
    error: unknown,
  ): Promise<AgentEngineRunResult> {
    const fallbackEngine = this.resolveFallbackEngine(decision);
    if (!fallbackEngine) {
      if (error) {
        throw error;
      }
      throw new Error(`Engine ${decision.primaryEngine} is not available`);
    }

    this.logFallback(decision, error);
    return fallbackEngine.run(agentId, operation, input, options);
  }

  private async *streamFallbackOrThrow(
    decision: RuntimeRouterDecision,
    request: AgentEngineChatRequest,
    options: AgentEngineChatOptions | undefined,
    error: unknown,
  ): AsyncGenerator<AgentStreamEvent> {
    const fallbackEngine = this.resolveFallbackEngine(decision);
    if (!fallbackEngine) {
      if (error) {
        throw error;
      }
      throw new Error(`Engine ${decision.primaryEngine} is not available`);
    }

    this.logFallback(decision, error);
    yield* fallbackEngine.streamChat(request, options);
  }

  private resolveFallbackEngine(decision: RuntimeRouterDecision): IAgentEngine | null {
    if (!decision.fallbackEngine) {
      return null;
    }
    if (decision.fallbackEngine === decision.primaryEngine) {
      return null;
    }
    return this.resolveAvailableEngine(decision.fallbackEngine);
  }

  private resolveAvailableEngine(engineName: AgentEngineName): IAgentEngine | null {
    const engine = this.resolveEngine(engineName);
    if (!engine) {
      return null;
    }
    if (typeof engine.isAvailable === 'function' && !engine.isAvailable()) {
      return null;
    }
    return engine;
  }

  private resolveEngine(engineName: AgentEngineName): IAgentEngine | null {
    if (engineName === 'local') {
      return this.localEngine;
    }

    if (engineName === 'openclaw') {
      return this.openclawEngine?.name === 'openclaw' ? this.openclawEngine : null;
    }

    return null;
  }

  private logFallback(decision: RuntimeRouterDecision, error: unknown): void {
    const errorMessage = error instanceof Error ? error.message : undefined;
    this.logger.warn(
      `Fallback to ${decision.fallbackEngine} from ${decision.primaryEngine}${
        errorMessage ? `: ${errorMessage}` : ''
      }`,
    );
  }
}
