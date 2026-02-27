import type { SkillCatalogItem, SkillManifest } from './skills.types';

const BUILTIN_MANIFESTS: SkillManifest[] = [
  {
    key: 'dingtalk_shanji',
    displayName: '钉钉闪记解析',
    description: '解析钉钉闪记链接并提取摘要与音频链接',
    operations: [
      {
        name: 'extract',
        displayName: '解析闪记',
        description: '提取闪记正文与音频播放链接',
        riskLevel: 'low',
        run: {
          agentId: 'dingtalk_shanji',
          operation: 'extract',
        },
      },
    ],
  },
  {
    key: 'archive_brief',
    displayName: '会话归档',
    description: '提取归档信息并生成简报',
    operations: [
      {
        name: 'archive_extract',
        displayName: '提取归档',
        description: '提取对话归档结构化内容',
        riskLevel: 'medium',
        run: {
          agentId: 'archive_brief',
          operation: 'archive_extract',
        },
      },
      {
        name: 'brief_generate',
        displayName: '生成简报',
        description: '生成会前简报',
        riskLevel: 'medium',
        run: {
          agentId: 'archive_brief',
          operation: 'brief_generate',
        },
      },
    ],
  },
  {
    key: 'contact_insight',
    displayName: '联系人洞察',
    description: '分析联系人关系机会和风险',
    operations: [
      {
        name: 'default',
        displayName: '生成洞察',
        description: '对单联系人生成结构化洞察',
        riskLevel: 'medium',
        run: {
          agentId: 'contact_insight',
          operation: null,
          inputTemplate: {
            depth: 'standard',
          },
        },
      },
    ],
  },
  {
    key: 'network_action',
    displayName: '网络行动',
    description: '生成全联系人行动建议',
    operations: [
      {
        name: 'default',
        displayName: '生成行动建议',
        description: '生成今日可执行关系行动',
        riskLevel: 'low',
        run: {
          agentId: 'network_action',
          operation: null,
        },
      },
    ],
  },
];

export function getBuiltinSkillCatalog(): SkillCatalogItem[] {
  return BUILTIN_MANIFESTS.map((manifest) => ({
    key: manifest.key,
    displayName: manifest.displayName,
    description: manifest.description,
    source: 'builtin',
    scopeType: 'global',
    scopeId: null,
    version: 'builtin-1.0.0',
    status: 'active',
    actions: manifest.operations.map((operation) => ({
      actionId: `${manifest.key}:${operation.name}`,
      skillKey: manifest.key,
      operation: operation.name,
      name: operation.displayName || operation.name,
      description: operation.description,
      run: {
        agentId: operation.run.agentId,
        operation: operation.run.operation,
        inputTemplate: operation.run.inputTemplate,
      },
      riskLevel: operation.riskLevel,
    })),
  }));
}
