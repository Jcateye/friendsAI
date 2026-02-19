import type { AgentRunRequest, AgentStreamEvent } from '../agent.types';
import type {
  AgentEngineChatOptions,
  AgentEngineChatRequest,
  AgentEngineName,
  AgentEngineRunOptions,
  AgentEngineRunResult,
} from './engine.types';

export interface IAgentEngine {
  readonly name: AgentEngineName;
  isAvailable?(): boolean;
  streamChat(
    request: AgentEngineChatRequest,
    options?: AgentEngineChatOptions,
  ): AsyncGenerator<AgentStreamEvent>;
  run(
    agentId: AgentRunRequest['agentId'],
    operation: string | null | undefined,
    input: Record<string, unknown>,
    options?: AgentEngineRunOptions,
  ): Promise<AgentEngineRunResult>;
}
