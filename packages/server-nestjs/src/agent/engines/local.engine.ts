import { Injectable } from '@nestjs/common';
import type { AgentRunRequest, AgentStreamEvent } from '../agent.types';
import { AgentOrchestrator } from '../agent.orchestrator';
import { AgentRuntimeExecutor } from '../runtime/agent-runtime-executor.service';
import type { IAgentEngine } from './engine.interface';
import type {
  AgentEngineChatOptions,
  AgentEngineChatRequest,
  AgentEngineRunOptions,
  AgentEngineRunResult,
} from './engine.types';

@Injectable()
export class LocalEngine implements IAgentEngine {
  readonly name = 'local' as const;

  constructor(
    private readonly agentOrchestrator: AgentOrchestrator,
    private readonly agentRuntimeExecutor: AgentRuntimeExecutor,
  ) {}

  streamChat(
    request: AgentEngineChatRequest,
    options?: AgentEngineChatOptions,
  ): AsyncGenerator<AgentStreamEvent> {
    return this.agentOrchestrator.streamChat(request, options);
  }

  async run(
    agentId: AgentRunRequest['agentId'],
    operation: string | null | undefined,
    input: Record<string, unknown>,
    options?: AgentEngineRunOptions,
  ): Promise<AgentEngineRunResult> {
    return this.agentRuntimeExecutor.execute(agentId, operation, input, options);
  }
}
