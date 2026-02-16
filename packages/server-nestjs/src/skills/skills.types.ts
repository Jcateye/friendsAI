import type { SupportedAgentId } from '../agent/agent.types';
import type { SkillInvocationSource, SkillInvocationStatus } from '../v3-entities';

export interface SkillManifestOperation {
  name: string;
  displayName?: string;
  description?: string;
  riskLevel?: 'low' | 'medium' | 'high';
  run: {
    agentId: SupportedAgentId | string;
    operation?: string | null;
    inputTemplate?: Record<string, unknown>;
  };
}

export interface SkillManifest {
  key: string;
  displayName: string;
  description?: string;
  operations: SkillManifestOperation[];
  inputSchema?: Record<string, unknown>;
  policy?: Record<string, unknown>;
  runtimeHints?: Record<string, unknown>;
}

export interface SkillActionOptionV2 {
  actionId: string;
  skillKey: string;
  operation: string;
  name: string;
  description?: string;
  run: {
    agentId: string;
    operation?: string | null;
    inputTemplate?: Record<string, unknown>;
  };
  riskLevel?: 'low' | 'medium' | 'high';
}

export interface SkillCatalogItem {
  key: string;
  displayName: string;
  description?: string;
  source: 'global' | 'tenant' | 'builtin';
  scopeType: 'global' | 'tenant';
  scopeId: string | null;
  version: string;
  status: string;
  actions: SkillActionOptionV2[];
  parserRules?: Record<string, unknown>;
  binding?: {
    scopeType: string;
    scopeId: string;
    priority: number;
    enabled: boolean;
    rolloutPercent: number;
    pinnedVersion: string | null;
  };
}

export interface SkillInvocationIntent {
  matched: boolean;
  status: SkillInvocationStatus;
  skillKey?: string;
  operation?: string;
  args?: Record<string, unknown>;
  source: SkillInvocationSource;
  confidence: number;
  traceId: string;
  warnings: string[];
  candidates?: Array<{
    skillKey: string;
    operation?: string;
    confidence: number;
  }>;
  execution?: {
    agentId: string;
    operation?: string | null;
    input: Record<string, unknown>;
  };
}

export interface SkillRuntimePlan {
  desiredHash: string;
  skills: Array<{
    key: string;
    version: string;
    checksum: string;
    exportPath: string;
  }>;
  loadActions: string[];
  unloadActions: string[];
}

export interface SkillParseError {
  code: string;
  message: string;
  tokenSpan?: {
    start: number;
    end: number;
  };
  retryable?: boolean;
}
