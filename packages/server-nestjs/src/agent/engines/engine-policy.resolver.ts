import { Injectable, Logger } from '@nestjs/common';
import type { AgentEngineName, AgentEngineRequest, RuntimeRouterDecision } from './engine.types';

@Injectable()
export class EnginePolicyResolver {
  private readonly logger = new Logger(EnginePolicyResolver.name);

  resolve(request: AgentEngineRequest): RuntimeRouterDecision {
    const primaryEngine = this.resolveDefaultEngine();
    const fallbackEngine = this.resolveFallbackEngine(primaryEngine);

    return {
      request,
      primaryEngine,
      fallbackEngine,
    };
  }

  private resolveDefaultEngine(): AgentEngineName {
    const configured = process.env.AGENT_ENGINE_DEFAULT;
    if (configured === 'local' || configured === 'openclaw') {
      return configured;
    }

    if (configured && configured.trim().length > 0) {
      this.logger.warn(`Invalid AGENT_ENGINE_DEFAULT=${configured}, fallback to local`);
    }

    return 'local';
  }

  private resolveFallbackEngine(primaryEngine: AgentEngineName): AgentEngineName | null {
    const configured = process.env.AGENT_ENGINE_FALLBACK;

    if (configured === 'none') {
      return null;
    }

    if (configured === undefined || configured.length === 0 || configured === 'local') {
      return primaryEngine === 'openclaw' ? 'local' : null;
    }

    this.logger.warn(`Invalid AGENT_ENGINE_FALLBACK=${configured}, fallback to local`);
    return primaryEngine === 'openclaw' ? 'local' : null;
  }
}
