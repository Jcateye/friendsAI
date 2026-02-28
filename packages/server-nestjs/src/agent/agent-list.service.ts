import { Injectable, Logger } from '@nestjs/common';
import { AgentDefinitionRegistry } from './runtime/agent-definition-registry.service';
import type { SupportedAgentId } from './agent.types';
import type {
  AgentCatalogResponseDto,
  AgentInfoDto,
  AgentListResponseDto,
  AgentOperationDto,
} from './dto/agent-list.dto';

const AGENT_METADATA: Record<
  SupportedAgentId,
  {
    name: string;
    description: string;
    usage: string;
    endpoint: string;
    operations?: Array<{
      name: string;
      description: string;
    }>;
  }
> = {
  chat_conversation: {
    name: 'Chat Conversation Agent',
    description: '实时流式对话 Agent，支持工具调用和上下文管理',
    usage: '使用 POST /v1/agent/chat 进行流式对话，支持 SSE 和 Vercel AI 格式',
    endpoint: 'POST /v1/agent/chat',
  },
  archive_brief: {
    name: 'Archive Brief Agent',
    description: '统一归档提取和简报生成能力',
    usage: '使用 POST /v1/agent/run，设置 agentId=archive_brief，通过 operation 参数区分操作类型',
    endpoint: 'POST /v1/agent/run',
    operations: [
      {
        name: 'archive_extract',
        description: '提取并总结会话归档，输入 conversationId，输出归档结构化结果',
      },
      {
        name: 'brief_generate',
        description: '生成联系人会前简报，输入 contactId，输出简报内容',
      },
    ],
  },
  title_summary: {
    name: 'Title Summary Agent',
    description: '生成会话标题与概要',
    usage: '使用 POST /v1/agent/run，设置 agentId=title_summary，输入 conversationId',
    endpoint: 'POST /v1/agent/run',
  },
  network_action: {
    name: 'Network Action Agent',
    description: '全体联系人归纳与行动建议',
    usage: '使用 POST /v1/agent/run，设置 agentId=network_action，输入 userId',
    endpoint: 'POST /v1/agent/run',
  },
  contact_insight: {
    name: 'Contact Insight Agent',
    description: '单联系人深入洞察分析',
    usage: '使用 POST /v1/agent/run，设置 agentId=contact_insight，输入 contactId 和 userId',
    endpoint: 'POST /v1/agent/run',
  },
};

@Injectable()
export class AgentListService {
  private readonly logger = new Logger(AgentListService.name);

  constructor(private readonly definitionRegistry: AgentDefinitionRegistry) {}

  async getAgentList(): Promise<AgentListResponseDto> {
    const supportedAgents: SupportedAgentId[] = [
      'chat_conversation',
      'archive_brief',
      'title_summary',
      'network_action',
      'contact_insight',
    ];

    const agents: AgentInfoDto[] = [];

    for (const agentId of supportedAgents) {
      try {
        const agentInfo = await this.getAgentInfo(agentId);
        agents.push(agentInfo);
      } catch (error) {
        this.logger.warn(
          `Failed to load agent info for ${agentId}: ${error instanceof Error ? error.message : String(error)}`,
        );
        const metadata = AGENT_METADATA[agentId];
        agents.push({
          id: agentId,
          name: metadata?.name,
          description: metadata?.description,
          version: 'unknown',
          status: 'unavailable',
          statusError: error instanceof Error ? error.message : 'Unknown error',
          usage: metadata?.usage,
          endpoint: metadata?.endpoint,
          operations: metadata?.operations?.map((op) => ({
            name: op.name,
            description: op.description,
          })),
        });
      }
    }

    return {
      agents,
      total: agents.length,
    };
  }

  getChatCatalog(): AgentCatalogResponseDto {
    return {
      items: [
        {
          agentId: 'archive_brief',
          name: '会话归档',
          description: '提取归档并生成会话相关结构化结果',
          operations: [
            {
              id: 'archive_brief:archive_extract',
              agentId: 'archive_brief',
              name: '提取归档',
              description: '提取对话归档结构化内容',
              operation: 'archive_extract',
              entryMode: 'run',
            },
            {
              id: 'archive_brief:brief_generate',
              agentId: 'archive_brief',
              name: '生成简报',
              description: '基于当前对话联系人生成会前简报',
              operation: 'brief_generate',
              entryMode: 'run',
            },
          ],
        },
        {
          agentId: 'contact_insight',
          name: '联系人洞察',
          description: '分析联系人关系机会和风险',
          operations: [
            {
              id: 'contact_insight:default',
              agentId: 'contact_insight',
              name: '生成洞察',
              description: '对当前对话联系人生成结构化洞察',
              operation: null,
              entryMode: 'run',
              defaultInputTemplate: {
                depth: 'standard',
              },
            },
          ],
        },
        {
          agentId: 'network_action',
          name: '网络行动',
          description: '生成今日可执行关系行动',
          operations: [
            {
              id: 'network_action:default',
              agentId: 'network_action',
              name: '生成行动建议',
              description: '生成全局关系行动建议',
              operation: null,
              entryMode: 'run',
            },
          ],
        },
      ],
    };
  }

  private async getAgentInfo(
    agentId: SupportedAgentId,
  ): Promise<AgentInfoDto> {
    const metadata = AGENT_METADATA[agentId];

    if (agentId === 'chat_conversation') {
      return {
        id: agentId,
        name: metadata?.name,
        description: metadata?.description,
        version: '1.0.0',
        status: 'available',
        usage: metadata?.usage,
        endpoint: metadata?.endpoint,
        tools: {
          mode: 'allowlist',
          allowedTools: [],
        },
        memory: {
          strategy: 'conversation',
        },
      };
    }

    try {
      const bundle = await this.definitionRegistry.loadDefinition(agentId);
      const definition = bundle.definition;
      const operations: AgentOperationDto[] = [];

      if (agentId === 'archive_brief' && metadata?.operations) {
        for (const opMeta of metadata.operations) {
          const operation: AgentOperationDto = {
            name: opMeta.name,
            description: opMeta.description,
          };

          if (bundle.outputSchema && typeof bundle.outputSchema === 'object') {
            const outputSchema = bundle.outputSchema as {
              oneOf?: Array<{
                properties?: {
                  operation?: { const?: string };
                  [key: string]: unknown;
                };
              }>;
            };

            if (outputSchema.oneOf) {
              const opSchema = outputSchema.oneOf.find(
                (schema) => schema.properties?.operation?.const === opMeta.name,
              );
              if (opSchema) {
                operation.outputSchema = opSchema as Record<string, unknown>;
              }
            }
          }

          operations.push(operation);
        }
      }

      return {
        id: definition.id,
        name: metadata?.name || definition.id,
        description: metadata?.description,
        version: definition.version,
        status: 'available',
        operations: operations.length > 0 ? operations : undefined,
        tools: definition.tools
          ? {
              mode: definition.tools.mode,
              allowedTools: definition.tools.allowedTools,
            }
          : undefined,
        cache: definition.cache
          ? {
              ttl: definition.cache.ttl,
            }
          : undefined,
        memory: definition.memory
          ? {
              strategy: definition.memory.strategy,
              maxTokens: definition.memory.maxTokens,
            }
          : undefined,
        inputSchema: bundle.inputSchema as Record<string, unknown> | undefined,
        outputSchema: bundle.outputSchema as Record<string, unknown> | undefined,
        usage: metadata?.usage,
        endpoint: metadata?.endpoint,
      };
    } catch (error) {
      return {
        id: agentId,
        name: metadata?.name,
        description: metadata?.description,
        version: 'unknown',
        status: 'unavailable',
        statusError: error instanceof Error ? error.message : 'Unknown error',
        usage: metadata?.usage,
        endpoint: metadata?.endpoint,
        operations: metadata?.operations?.map((op) => ({
          name: op.name,
          description: op.description,
        })),
      };
    }
  }
}
