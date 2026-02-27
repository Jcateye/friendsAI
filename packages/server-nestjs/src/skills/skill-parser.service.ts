import { Injectable } from '@nestjs/common';
import { generateUlid } from '../utils/ulid';
import type { SkillCatalogItem, SkillInvocationIntent } from './skills.types';

interface ParserInput {
  text?: string;
  composer?: Record<string, unknown>;
  catalog: SkillCatalogItem[];
  traceId?: string;
}

interface Candidate {
  action: SkillCatalogItem['actions'][number];
  confidence: number;
}

@Injectable()
export class SkillParserService {
  private readonly naturalLanguageThreshold = Number(process.env.SKILL_NL_THRESHOLD ?? 0.78);

  parse(input: ParserInput): SkillInvocationIntent {
    const traceId = input.traceId ?? generateUlid();
    const text = typeof input.text === 'string' ? input.text.trim() : '';

    const fromComposer = this.parseComposer(input.composer, input.catalog, traceId);
    if (fromComposer) {
      return fromComposer;
    }

    const fromSlash = this.parseSlash(text, input.catalog, traceId);
    if (fromSlash) {
      return fromSlash;
    }

    const fromCodeBlock = this.parseCodeBlock(text, input.catalog, traceId);
    if (fromCodeBlock) {
      return fromCodeBlock;
    }

    const fromShanjiLink = this.parseShanjiLink(text, input.catalog, traceId);
    if (fromShanjiLink) {
      return fromShanjiLink;
    }

    if (text.length > 0) {
      return this.parseNaturalLanguage(text, input.catalog, traceId);
    }

    return {
      matched: false,
      status: 'ignored',
      source: 'none',
      confidence: 0,
      traceId,
      warnings: [],
    };
  }

  private parseComposer(
    composer: Record<string, unknown> | undefined,
    catalog: SkillCatalogItem[],
    traceId: string,
  ): SkillInvocationIntent | null {
    if (!composer) {
      return null;
    }

    const skillActionId =
      typeof composer.skillActionId === 'string' ? composer.skillActionId.trim() : '';

    if (!skillActionId) {
      return null;
    }

    const action = this.findActionById(skillActionId, catalog);
    if (!action) {
      return {
        matched: false,
        status: 'failed',
        source: 'composer_action',
        confidence: 1,
        traceId,
        warnings: [`Unknown skillActionId: ${skillActionId}`],
      };
    }

    const args = this.parseRawInputs(composer.rawInputs);

    return {
      matched: true,
      status: 'parsed',
      skillKey: action.skillKey,
      operation: action.operation,
      args,
      source: 'composer_action',
      confidence: 1,
      traceId,
      warnings: [],
      execution: {
        agentId: action.run.agentId,
        operation: action.run.operation,
        input: {
          ...(action.run.inputTemplate ?? {}),
          ...args,
        },
      },
    };
  }

  private parseSlash(
    text: string,
    catalog: SkillCatalogItem[],
    traceId: string,
  ): SkillInvocationIntent | null {
    const slashMatch = text.match(/^\/skill\s+([a-zA-Z0-9_-]+)(?::([a-zA-Z0-9_-]+))?\s*(.*)$/s);
    if (!slashMatch) {
      return null;
    }

    const skillKey = slashMatch[1];
    const operation = slashMatch[2] ?? undefined;
    const payload = slashMatch[3]?.trim() ?? '';

    const action = this.findAction(skillKey, operation, catalog);
    if (!action) {
      return {
        matched: false,
        status: 'failed',
        skillKey,
        operation,
        source: 'slash',
        confidence: 1,
        traceId,
        warnings: [`Skill or operation not found: ${skillKey}${operation ? `:${operation}` : ''}`],
      };
    }

    const args = this.parseStructuredPayload(payload);
    const warnings: string[] = [];
    if (payload.length > 0 && Object.keys(args).length === 0) {
      warnings.push('Failed to parse slash payload, fallback to empty args');
    }

    return {
      matched: true,
      status: 'parsed',
      skillKey: action.skillKey,
      operation: action.operation,
      args,
      source: 'slash',
      confidence: 1,
      traceId,
      warnings,
      execution: {
        agentId: action.run.agentId,
        operation: action.run.operation,
        input: {
          ...(action.run.inputTemplate ?? {}),
          ...args,
        },
      },
    };
  }

  private parseCodeBlock(
    text: string,
    catalog: SkillCatalogItem[],
    traceId: string,
  ): SkillInvocationIntent | null {
    const match = text.match(/```skill\s*([\s\S]*?)```/i);
    if (!match) {
      return null;
    }

    const body = match[1]?.trim() ?? '';
    if (!body) {
      return {
        matched: false,
        status: 'failed',
        source: 'codeblock',
        confidence: 1,
        traceId,
        warnings: ['Empty skill codeblock payload'],
      };
    }

    const parsed = this.parseStructuredPayload(body);
    const skillKey = typeof parsed.skillKey === 'string' ? parsed.skillKey : typeof parsed.skill === 'string' ? parsed.skill : undefined;
    const operation = typeof parsed.operation === 'string' ? parsed.operation : undefined;

    if (!skillKey) {
      return {
        matched: false,
        status: 'failed',
        source: 'codeblock',
        confidence: 1,
        traceId,
        warnings: ['skillKey is required in skill codeblock'],
      };
    }

    const action = this.findAction(skillKey, operation, catalog);
    if (!action) {
      return {
        matched: false,
        status: 'failed',
        source: 'codeblock',
        confidence: 1,
        traceId,
        skillKey,
        operation,
        warnings: [`Skill or operation not found: ${skillKey}${operation ? `:${operation}` : ''}`],
      };
    }

    const args =
      parsed.args && this.isRecord(parsed.args)
        ? parsed.args
        : Object.fromEntries(
            Object.entries(parsed).filter(([key]) => !['skill', 'skillKey', 'operation'].includes(key)),
          );

    return {
      matched: true,
      status: 'parsed',
      skillKey: action.skillKey,
      operation: action.operation,
      args,
      source: 'codeblock',
      confidence: 0.95,
      traceId,
      warnings: [],
      execution: {
        agentId: action.run.agentId,
        operation: action.run.operation,
        input: {
          ...(action.run.inputTemplate ?? {}),
          ...args,
        },
      },
    };
  }

  private parseShanjiLink(
    text: string,
    catalog: SkillCatalogItem[],
    traceId: string,
  ): SkillInvocationIntent | null {
    if (!text) {
      return null;
    }

    const url = this.extractShanjiUrl(text);
    if (!url) {
      return null;
    }

    const action = this.findAction('dingtalk_shanji', 'extract', catalog);
    if (!action) {
      return null;
    }

    const meetingAgentToken = this.extractShanjiMeetingToken(text);
    const args: Record<string, unknown> = {
      url,
    };
    if (meetingAgentToken) {
      args.meetingAgentToken = meetingAgentToken;
    }

    return {
      matched: true,
      status: 'parsed',
      skillKey: action.skillKey,
      operation: action.operation,
      args,
      source: 'natural_language',
      confidence: 1,
      traceId,
      warnings: [],
      execution: {
        agentId: action.run.agentId,
        operation: action.run.operation,
        input: {
          ...(action.run.inputTemplate ?? {}),
          ...args,
        },
      },
    };
  }

  private extractShanjiUrl(text: string): string | undefined {
    const match = text.match(
      /https?:\/\/shanji\.dingtalk\.com\/app\/transcribes\/[A-Za-z0-9_%\-]+/i,
    );
    if (!match) {
      return undefined;
    }
    return match[0].trim();
  }

  private extractShanjiMeetingToken(text: string): string | undefined {
    if (!text) {
      return undefined;
    }

    const explicitMatch = text.match(
      /dt-meeting-agent-token[\s:=："']*([A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)/i,
    );
    if (explicitMatch?.[1]) {
      return explicitMatch[1].trim();
    }

    const jwtMatches = text.match(/[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g);
    if (!jwtMatches || jwtMatches.length === 0) {
      return undefined;
    }

    const likelyJwt = jwtMatches.find((item) => item.startsWith('eyJ'));
    if (!likelyJwt) {
      return undefined;
    }
    return likelyJwt.trim();
  }

  private parseNaturalLanguage(
    text: string,
    catalog: SkillCatalogItem[],
    traceId: string,
  ): SkillInvocationIntent {
    const normalized = this.normalize(text);
    const candidates: Candidate[] = [];

    for (const item of catalog) {
      for (const action of item.actions) {
        let score = 0;
        const skillKey = this.normalize(item.key);
        const displayName = this.normalize(item.displayName);
        const opName = this.normalize(action.operation);
        const actionName = this.normalize(action.name);

        if (skillKey && normalized.includes(skillKey)) {
          score += 0.5;
        }
        if (displayName && normalized.includes(displayName)) {
          score += 0.35;
        }
        if (opName && normalized.includes(opName)) {
          score += 0.2;
        }
        if (actionName && normalized.includes(actionName)) {
          score += 0.2;
        }

        if (action.description) {
          for (const token of this.tokenize(action.description)) {
            if (token.length >= 2 && normalized.includes(token)) {
              score += 0.04;
            }
          }
        }

        score = Math.min(1, score);
        if (score > 0) {
          candidates.push({ action, confidence: Number(score.toFixed(2)) });
        }
      }
    }

    candidates.sort((a, b) => b.confidence - a.confidence);

    if (candidates.length === 0 || candidates[0].confidence < this.naturalLanguageThreshold) {
      return {
        matched: false,
        status: 'ignored',
        source: 'natural_language',
        confidence: candidates[0]?.confidence ?? 0,
        traceId,
        warnings: [],
      };
    }

    const top = candidates[0];
    const second = candidates[1];

    if (second && top.confidence - second.confidence < 0.1) {
      return {
        matched: false,
        status: 'awaiting_selection',
        source: 'natural_language',
        confidence: top.confidence,
        traceId,
        warnings: ['Ambiguous skill intent, user selection required'],
        candidates: [top, second].map((candidate) => ({
          skillKey: candidate.action.skillKey,
          operation: candidate.action.operation,
          confidence: candidate.confidence,
        })),
      };
    }

    if (top.action.riskLevel && top.action.riskLevel !== 'low') {
      return {
        matched: false,
        status: 'awaiting_selection',
        source: 'natural_language',
        confidence: top.confidence,
        traceId,
        warnings: ['Explicit command is required for medium/high risk skill actions'],
        candidates: [
          {
            skillKey: top.action.skillKey,
            operation: top.action.operation,
            confidence: top.confidence,
          },
        ],
      };
    }

    return {
      matched: true,
      status: 'parsed',
      skillKey: top.action.skillKey,
      operation: top.action.operation,
      args: {},
      source: 'natural_language',
      confidence: top.confidence,
      traceId,
      warnings: [],
      execution: {
        agentId: top.action.run.agentId,
        operation: top.action.run.operation,
        input: {
          ...(top.action.run.inputTemplate ?? {}),
        },
      },
    };
  }

  private parseRawInputs(rawInputs: unknown): Record<string, unknown> {
    if (this.isRecord(rawInputs)) {
      return rawInputs;
    }
    if (typeof rawInputs === 'string') {
      try {
        const parsed = JSON.parse(rawInputs);
        return this.isRecord(parsed) ? parsed : {};
      } catch {
        return {};
      }
    }
    return {};
  }

  private parseStructuredPayload(payload: string): Record<string, unknown> {
    if (!payload) {
      return {};
    }

    try {
      const parsed = JSON.parse(payload);
      if (this.isRecord(parsed)) {
        return parsed;
      }
    } catch {
      // ignore and try fallback formats
    }

    const kvArgs = this.parseKvPayload(payload);
    if (Object.keys(kvArgs).length > 0) {
      return kvArgs;
    }

    const yamlArgs = this.parseYamlLikePayload(payload);
    if (Object.keys(yamlArgs).length > 0) {
      return yamlArgs;
    }

    return {};
  }

  private parseKvPayload(payload: string): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    const kvRegex = /(\w+)=((?:"[^"]*")|(?:'[^']*')|(?:\S+))/g;
    let match: RegExpExecArray | null;

    while ((match = kvRegex.exec(payload)) !== null) {
      const key = match[1];
      const rawValue = match[2];
      result[key] = this.parseScalar(rawValue);
    }

    return result;
  }

  private parseYamlLikePayload(payload: string): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    const lines = payload.split('\n').map((line) => line.trim()).filter(Boolean);

    for (const line of lines) {
      const index = line.indexOf(':');
      if (index <= 0) {
        continue;
      }
      const key = line.slice(0, index).trim();
      const value = line.slice(index + 1).trim();
      if (!key) {
        continue;
      }
      result[key] = this.parseScalar(value);
    }

    return result;
  }

  private parseScalar(value: string): unknown {
    const trimmed = value.trim();
    if (
      (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'"))
    ) {
      return trimmed.slice(1, -1);
    }
    if (trimmed === 'true') {
      return true;
    }
    if (trimmed === 'false') {
      return false;
    }
    if (!Number.isNaN(Number(trimmed)) && trimmed.length > 0) {
      return Number(trimmed);
    }
    return trimmed;
  }

  private findActionById(
    actionId: string,
    catalog: SkillCatalogItem[],
  ): SkillCatalogItem['actions'][number] | null {
    for (const item of catalog) {
      const found = item.actions.find((action) => action.actionId === actionId);
      if (found) {
        return found;
      }
    }
    return null;
  }

  private findAction(
    skillKey: string,
    operation: string | undefined,
    catalog: SkillCatalogItem[],
  ): SkillCatalogItem['actions'][number] | null {
    const skill = catalog.find((item) => item.key === skillKey);
    if (!skill) {
      return null;
    }

    if (!operation) {
      return skill.actions[0] ?? null;
    }

    return skill.actions.find((action) => action.operation === operation) ?? null;
  }

  private tokenize(value: string): string[] {
    return this.normalize(value)
      .split(/\s+/)
      .map((token) => token.trim())
      .filter(Boolean);
  }

  private normalize(value: string): string {
    return value.toLowerCase().replace(/[^\w\u4e00-\u9fa5]+/g, ' ').trim();
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  }
}
