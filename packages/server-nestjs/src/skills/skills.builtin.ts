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
        run: undefined,
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
      run: operation.run
        ? {
            agentId: operation.run.agentId,
            operation: operation.run.operation,
            inputTemplate: operation.run.inputTemplate,
          }
        : undefined,
      riskLevel: operation.riskLevel,
    })),
  }));
}
