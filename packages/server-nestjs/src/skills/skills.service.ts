import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, IsNull, Repository } from 'typeorm';
import { createHash } from 'crypto';
import { mkdirSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';
import {
  SkillBinding,
  SkillDefinition,
  SkillInvocationLog,
  SkillPublishLog,
  SkillReleaseRule,
  SkillRuntimeMount,
  SkillVersion,
} from '../v3-entities';
import { generateUlid } from '../utils/ulid';
import { SkillBindingResolverService } from './skill-binding-resolver.service';
import { ReconcileResult, SkillLoaderService } from './skill-loader.service';
import { SkillParserService } from './skill-parser.service';
import { getBuiltinSkillCatalog } from './skills.builtin';
import type {
  SkillCatalogItem,
  SkillInvocationIntent,
  SkillManifest,
} from './skills.types';

interface CreateSkillInput {
  key: string;
  displayName: string;
  description?: string;
  scopeType?: 'global' | 'tenant';
  scopeId?: string;
  enabled?: boolean;
}

interface CreateSkillVersionInput {
  version: string;
  manifest: Record<string, unknown>;
  parserRules?: Record<string, unknown>;
  scopeType?: 'global' | 'tenant';
  scopeId?: string;
}

interface PublishSkillVersionInput {
  scopeType?: 'global' | 'tenant';
  scopeId?: string;
  rolloutPercent?: number;
}

interface UpsertBindingInput {
  tenantId?: string;
  scopeType: 'tenant' | 'agent' | 'capability';
  scopeId: string;
  skillKey: string;
  priority?: number;
  enabled?: boolean;
  rolloutPercent?: number;
  pinnedVersion?: string | null;
}

interface ReconcileRuntimeInput {
  tenantId?: string;
  engine?: 'local' | 'openclaw';
  agentScope?: string;
  capability?: string;
}

interface ParseDebugInput {
  tenantId?: string;
  text?: string;
  composer?: Record<string, unknown>;
  agentScope?: string;
  capability?: string;
}

@Injectable()
export class SkillsService {
  private readonly logger = new Logger(SkillsService.name);
  private readonly centerEnabled = process.env.SKILL_CENTER_ENABLED !== 'false';
  private readonly parserEnabled = process.env.SKILL_INPUT_PARSER_ENABLED === 'true';
  private readonly dynamicActionsEnabled = process.env.SKILL_DYNAMIC_ACTIONS_ENABLED !== 'false';
  private catalogSchemaAvailable = true;

  constructor(
    @InjectRepository(SkillDefinition, 'v3')
    private readonly definitionRepo: Repository<SkillDefinition>,
    @InjectRepository(SkillVersion, 'v3')
    private readonly versionRepo: Repository<SkillVersion>,
    @InjectRepository(SkillReleaseRule, 'v3')
    private readonly releaseRuleRepo: Repository<SkillReleaseRule>,
    @InjectRepository(SkillBinding, 'v3')
    private readonly bindingRepo: Repository<SkillBinding>,
    @InjectRepository(SkillRuntimeMount, 'v3')
    private readonly mountRepo: Repository<SkillRuntimeMount>,
    @InjectRepository(SkillInvocationLog, 'v3')
    private readonly invocationLogRepo: Repository<SkillInvocationLog>,
    @InjectRepository(SkillPublishLog, 'v3')
    private readonly publishLogRepo: Repository<SkillPublishLog>,
    private readonly resolver: SkillBindingResolverService,
    private readonly loader: SkillLoaderService,
    private readonly parser: SkillParserService,
  ) {}

  async getCatalog(
    tenantId: string,
    options?: {
      agentScope?: string;
      capability?: string;
    },
  ): Promise<{
    items: SkillCatalogItem[];
    warnings: string[];
  }> {
    const builtin = getBuiltinSkillCatalog();

    if (!this.dynamicActionsEnabled) {
      return {
        items: builtin,
        warnings: ['dynamic_skills_disabled'],
      };
    }

    if (!this.centerEnabled) {
      return {
        items: builtin,
        warnings: ['skill_center_disabled'],
      };
    }

    if (!this.catalogSchemaAvailable) {
      return {
        items: builtin,
        warnings: ['skill_center_schema_missing'],
      };
    }

    let resolved: { items: SkillCatalogItem[]; warnings: string[] };
    try {
      resolved = await this.resolver.resolveCatalog({
        tenantId,
        agentScope: options?.agentScope,
        capability: options?.capability,
      });
    } catch (error) {
      if (this.isMissingRelationError(error)) {
        this.catalogSchemaAvailable = false;
        this.logger.warn(
          'Skills tables are missing in DATABASE_URL_V3; falling back to builtin skill catalog until migrations are applied.',
        );
        return {
          items: builtin,
          warnings: ['skill_center_schema_missing'],
        };
      }

      this.logger.warn(
        `Failed to resolve dynamic skills catalog, fallback to builtin: ${error instanceof Error ? error.message : String(error)}`,
      );
      return {
        items: builtin,
        warnings: ['skill_center_resolver_error'],
      };
    }

    const merged = new Map<string, SkillCatalogItem>();
    for (const item of builtin) {
      merged.set(item.key, item);
    }
    for (const item of resolved.items) {
      merged.set(item.key, item);
    }

    return {
      items: Array.from(merged.values()),
      warnings: resolved.warnings,
    };
  }

  async createSkill(userId: string | null, tenantId: string, input: CreateSkillInput): Promise<SkillDefinition> {
    this.ensureCenterEnabled();

    const key = input.key?.trim();
    const displayName = input.displayName?.trim();

    if (!key || !displayName) {
      throw new BadRequestException('key and displayName are required');
    }

    const scopeType = input.scopeType === 'global' ? 'global' : 'tenant';
    const scopeId = scopeType === 'global' ? null : input.scopeId?.trim() || tenantId;
    const scopeWhere: FindOptionsWhere<SkillDefinition> = scopeId !== null
      ? { skillKey: key, scopeType, scopeId }
      : { skillKey: key, scopeType, scopeId: IsNull() };

    const exists = await this.definitionRepo.findOne({
      where: scopeWhere,
    });

    if (exists) {
      throw new BadRequestException(`skill already exists: ${key} (${scopeType}:${scopeId ?? 'null'})`);
    }

    const entity = this.definitionRepo.create({
      skillKey: key,
      displayName,
      description: input.description?.trim() || null,
      scopeType,
      scopeId,
      enabled: input.enabled !== false,
      createdBy: userId,
    });

    return this.definitionRepo.save(entity);
  }

  async createVersion(
    skillKey: string,
    userId: string | null,
    tenantId: string,
    input: CreateSkillVersionInput,
  ): Promise<SkillVersion> {
    this.ensureCenterEnabled();

    const definition = await this.findDefinition(skillKey, tenantId, input.scopeType, input.scopeId);
    if (!definition) {
      throw new NotFoundException(`skill definition not found: ${skillKey}`);
    }

    this.validateManifest(input.manifest, skillKey);

    const version = input.version?.trim();
    if (!version) {
      throw new BadRequestException('version is required');
    }

    const exists = await this.versionRepo.findOne({
      where: {
        definitionId: definition.id,
        version,
      },
    });

    if (exists) {
      throw new BadRequestException(`version already exists: ${skillKey}@${version}`);
    }

    const checksum = createHash('sha256').update(JSON.stringify(input.manifest)).digest('hex');

    const entity = this.versionRepo.create({
      definitionId: definition.id,
      version,
      status: 'draft',
      manifest: input.manifest,
      parserRules: input.parserRules ?? null,
      checksum,
      createdBy: userId,
    });

    return this.versionRepo.save(entity);
  }

  async publishVersion(
    skillKey: string,
    version: string,
    userId: string | null,
    tenantId: string,
    input: PublishSkillVersionInput,
  ): Promise<{
    published: boolean;
    definition: SkillDefinition;
    version: SkillVersion;
    releaseRule: SkillReleaseRule;
    exportPath: string;
  }> {
    this.ensureCenterEnabled();

    const definition = await this.findDefinition(skillKey, tenantId, input.scopeType, input.scopeId);
    if (!definition) {
      throw new NotFoundException(`skill definition not found: ${skillKey}`);
    }

    const target = await this.versionRepo.findOne({
      where: {
        definitionId: definition.id,
        version,
      },
    });

    if (!target) {
      throw new NotFoundException(`skill version not found: ${skillKey}@${version}`);
    }

    this.validateManifest(target.manifest, skillKey);

    await this.versionRepo.update(
      {
        definitionId: definition.id,
        status: 'active',
      },
      {
        status: 'deprecated',
      },
    );

    target.status = 'active';
    const savedVersion = await this.versionRepo.save(target);

    const scopeType = input.scopeType === 'tenant' ? 'tenant' : 'global';
    const scopeId = scopeType === 'tenant' ? (input.scopeId?.trim() || tenantId) : null;
    const releaseRuleScopeWhere: FindOptionsWhere<SkillReleaseRule> = scopeId !== null
      ? { definitionId: definition.id, scopeType, scopeId }
      : { definitionId: definition.id, scopeType, scopeId: IsNull() };

    await this.releaseRuleRepo.update(
      releaseRuleScopeWhere,
      {
        isActive: false,
      },
    );

    const rolloutPercent = this.normalizeRolloutPercent(input.rolloutPercent);

    const existingRule = await this.releaseRuleRepo.findOne({
      where: {
        ...releaseRuleScopeWhere,
        version,
      },
    });

    const releaseRule = await this.releaseRuleRepo.save(
      existingRule
        ? Object.assign(existingRule, {
            rolloutPercent,
            isActive: true,
            createdBy: userId,
          })
        : this.releaseRuleRepo.create({
            definitionId: definition.id,
            version,
            scopeType,
            scopeId,
            rolloutPercent,
            isActive: true,
            createdBy: userId,
          }),
    );

    const exportPath = this.exportVersionSnapshot(definition, savedVersion, releaseRule, tenantId);
    await this.publishLogRepo.save(
      this.publishLogRepo.create({
        definitionId: definition.id,
        skillKey: definition.skillKey,
        version: savedVersion.version,
        scopeType: releaseRule.scopeType,
        scopeId: releaseRule.scopeId,
        rolloutPercent: releaseRule.rolloutPercent,
        exportPath,
        publishedBy: userId,
        publishedAt: new Date(),
        metadata: {
          releaseRuleId: releaseRule.id,
          checksum: savedVersion.checksum,
        },
      }),
    );

    return {
      published: true,
      definition,
      version: savedVersion,
      releaseRule,
      exportPath,
    };
  }

  async upsertBinding(userId: string | null, tenantId: string, input: UpsertBindingInput): Promise<SkillBinding> {
    this.ensureCenterEnabled();

    if (!input.scopeType || !input.scopeId || !input.skillKey) {
      throw new BadRequestException('scopeType, scopeId and skillKey are required');
    }

    const effectiveTenantId = input.tenantId?.trim() || tenantId;

    const existing = await this.bindingRepo.findOne({
      where: {
        tenantId: effectiveTenantId,
        scopeType: input.scopeType,
        scopeId: input.scopeId,
        skillKey: input.skillKey,
      },
    });

    const entity = existing
      ? Object.assign(existing, {
          priority: Number.isFinite(input.priority) ? Number(input.priority) : existing.priority,
          enabled: typeof input.enabled === 'boolean' ? input.enabled : existing.enabled,
          rolloutPercent: this.normalizeRolloutPercent(input.rolloutPercent, existing.rolloutPercent),
          pinnedVersion:
            input.pinnedVersion !== undefined ? input.pinnedVersion : existing.pinnedVersion,
          createdBy: userId,
        })
      : this.bindingRepo.create({
          tenantId: effectiveTenantId,
          scopeType: input.scopeType,
          scopeId: input.scopeId,
          skillKey: input.skillKey,
          priority: Number.isFinite(input.priority) ? Number(input.priority) : 100,
          enabled: input.enabled !== false,
          rolloutPercent: this.normalizeRolloutPercent(input.rolloutPercent),
          pinnedVersion: input.pinnedVersion ?? null,
          createdBy: userId,
        });

    return this.bindingRepo.save(entity);
  }

  async disableBinding(userId: string | null, tenantId: string, bindingId: string): Promise<SkillBinding> {
    this.ensureCenterEnabled();

    const binding = await this.bindingRepo.findOne({
      where: {
        id: bindingId,
        tenantId,
      },
    });

    if (!binding) {
      throw new NotFoundException(`binding not found: ${bindingId}`);
    }

    binding.enabled = false;
    binding.createdBy = userId;
    return this.bindingRepo.save(binding);
  }

  async reconcileRuntime(
    userId: string | null,
    tenantId: string,
    input: ReconcileRuntimeInput,
  ): Promise<ReconcileResult> {
    void userId;
    this.ensureCenterEnabled();
    const normalizedTenantId = input.tenantId?.trim() || tenantId;
    const requestedEngine = input.engine;
    if (requestedEngine && requestedEngine !== 'local' && requestedEngine !== 'openclaw') {
      throw new BadRequestException('engine must be local or openclaw');
    }
    const engine = requestedEngine ?? 'local';
    const agentScope = input.agentScope?.trim() || tenantId;
    if (!agentScope) {
      throw new BadRequestException('agentScope is required');
    }
    if (!normalizedTenantId) {
      throw new BadRequestException('tenantId is required');
    }
    const capability = input.capability?.trim() || undefined;

    return this.loader.reconcile({
      tenantId: normalizedTenantId,
      engine,
      agentScope,
      capability,
    });
  }

  async parseDebug(userId: string | null, tenantId: string, input: ParseDebugInput): Promise<SkillInvocationIntent> {
    void userId;
    this.ensureParserEnabled();
    this.ensureDebugAllowed();

    const effectiveTenantId = input.tenantId?.trim() || tenantId;
    const catalog = await this.getCatalog(effectiveTenantId, {
      agentScope: input.agentScope,
      capability: input.capability,
    });

    const intent = this.parser.parse({
      text: input.text,
      composer: input.composer,
      catalog: catalog.items,
    });

    await this.logInvocation({
      tenantId: effectiveTenantId,
      conversationId: null,
      sessionId: null,
      rawInput: input.text ?? null,
      intent,
    });

    return intent;
  }

  async parseInvocationFromChat(input: {
    tenantId: string;
    conversationId?: string;
    sessionId?: string;
    text?: string;
    composer?: Record<string, unknown>;
    agentScope?: string;
    capability?: string;
  }): Promise<SkillInvocationIntent | null> {
    if (!this.parserEnabled) {
      return null;
    }

    const catalog = await this.getCatalog(input.tenantId, {
      agentScope: input.agentScope,
      capability: input.capability,
    });

    const intent = this.parser.parse({
      text: input.text,
      composer: input.composer,
      catalog: catalog.items,
    });

    await this.logInvocation({
      tenantId: input.tenantId,
      conversationId: input.conversationId ?? null,
      sessionId: input.sessionId ?? null,
      rawInput: input.text ?? null,
      intent,
    });

    return intent;
  }

  async listRuntimeMounts(tenantId: string): Promise<SkillRuntimeMount[]> {
    return this.mountRepo.find({
      where: {
        tenantId,
      },
      order: {
        updatedAt: 'DESC',
      },
    });
  }

  private async findDefinition(
    skillKey: string,
    tenantId: string,
    scopeType?: 'global' | 'tenant',
    scopeId?: string,
  ): Promise<SkillDefinition | null> {
    if (scopeType === 'global') {
      return this.definitionRepo.findOne({
        where: {
          skillKey,
          scopeType: 'global',
          scopeId: IsNull(),
        },
      });
    }

    if (scopeType === 'tenant') {
      return this.definitionRepo.findOne({
        where: {
          skillKey,
          scopeType: 'tenant',
          scopeId: scopeId?.trim() || tenantId,
        },
      });
    }

    const [tenantDefinition, globalDefinition] = await Promise.all([
      this.definitionRepo.findOne({
        where: {
          skillKey,
          scopeType: 'tenant',
          scopeId: tenantId,
        },
      }),
      this.definitionRepo.findOne({
        where: {
          skillKey,
          scopeType: 'global',
          scopeId: IsNull(),
        },
      }),
    ]);

    return tenantDefinition ?? globalDefinition;
  }

  private validateManifest(manifest: Record<string, unknown>, skillKey: string): void {
    if (!manifest || typeof manifest !== 'object') {
      throw new BadRequestException('manifest is required');
    }

    const candidate = manifest as Partial<SkillManifest>;

    if (!candidate.displayName || typeof candidate.displayName !== 'string') {
      throw new BadRequestException('manifest.displayName is required');
    }

    if (!Array.isArray(candidate.operations) || candidate.operations.length === 0) {
      throw new BadRequestException('manifest.operations must be a non-empty array');
    }

    for (const operation of candidate.operations) {
      if (!operation || typeof operation !== 'object') {
        throw new BadRequestException('manifest.operations contains invalid entries');
      }
      const op = operation as { name?: string; run?: { agentId?: string } };
      if (!op.name || typeof op.name !== 'string') {
        throw new BadRequestException('manifest.operations[].name is required');
      }
      if (!op.run || typeof op.run !== 'object' || !op.run.agentId) {
        throw new BadRequestException('manifest.operations[].run.agentId is required');
      }
    }

    if (candidate.key && candidate.key !== skillKey) {
      throw new BadRequestException('manifest.key must match route skillKey');
    }
  }

  private exportVersionSnapshot(
    definition: SkillDefinition,
    version: SkillVersion,
    releaseRule: SkillReleaseRule,
    tenantId: string,
  ): string {
    const exportRoot =
      process.env.SKILL_EXPORT_DIR ??
      resolve(process.cwd(), 'packages/server-nestjs/exports/skills');

    const targetDir = join(exportRoot, definition.skillKey);
    mkdirSync(targetDir, { recursive: true });

    const filePath = join(targetDir, `${version.version}.json`);
    writeFileSync(
      filePath,
      JSON.stringify(
        {
          skillKey: definition.skillKey,
          version: version.version,
          scopeType: definition.scopeType,
          scopeId: definition.scopeId,
          displayName: definition.displayName,
          manifest: version.manifest,
          parserRules: version.parserRules,
          releaseRule: {
            scopeType: releaseRule.scopeType,
            scopeId: releaseRule.scopeId,
            rolloutPercent: releaseRule.rolloutPercent,
            isActive: releaseRule.isActive,
          },
          tenantId,
          exportedAt: new Date().toISOString(),
        },
        null,
        2,
      ),
      'utf8',
    );

    return filePath;
  }

  private async logInvocation(input: {
    tenantId: string;
    conversationId: string | null;
    sessionId: string | null;
    rawInput: string | null;
    intent: SkillInvocationIntent;
  }): Promise<void> {
    await this.invocationLogRepo.save(
      this.invocationLogRepo.create({
        tenantId: input.tenantId,
        conversationId: input.conversationId,
        sessionId: input.sessionId,
        traceId: input.intent.traceId || generateUlid(),
        matched: input.intent.matched,
        skillKey: input.intent.skillKey ?? null,
        operation: input.intent.operation ?? null,
        source: input.intent.source,
        confidence: Number.isFinite(input.intent.confidence)
          ? Number(input.intent.confidence.toFixed(2))
          : null,
        status: input.intent.status,
        warnings: input.intent.warnings,
        args: input.intent.args ?? null,
        rawInput: input.rawInput,
        errorCode: input.intent.status === 'failed' ? 'skill_parse_failed' : null,
        errorMessage:
          input.intent.status === 'failed' && input.intent.warnings.length > 0
            ? input.intent.warnings.join('; ')
            : null,
      }),
    );
  }

  private normalizeRolloutPercent(value: number | undefined, fallback = 100): number {
    if (!Number.isFinite(value)) {
      return fallback;
    }
    return Math.max(0, Math.min(100, Math.floor(Number(value))));
  }

  private ensureCenterEnabled(): void {
    if (!this.centerEnabled) {
      throw new BadRequestException('skill_center_disabled');
    }
  }

  private ensureParserEnabled(): void {
    if (!this.parserEnabled) {
      throw new BadRequestException('skill_input_parser_disabled');
    }
  }

  private ensureDebugAllowed(): void {
    const isProd = (process.env.NODE_ENV ?? '').toLowerCase() === 'production';
    if (!isProd) {
      return;
    }
    if (process.env.SKILL_PARSE_DEBUG_ALLOW_IN_PROD === 'true') {
      return;
    }
    throw new ForbiddenException('skill_parse_debug_forbidden_in_production');
  }

  private isMissingRelationError(error: unknown): boolean {
    if (!error || typeof error !== 'object') {
      return false;
    }

    const candidate = error as {
      code?: string;
      message?: string;
      driverError?: { code?: string; message?: string };
    };

    if (candidate.code === '42P01' || candidate.driverError?.code === '42P01') {
      return true;
    }

    const message = `${candidate.message ?? ''} ${candidate.driverError?.message ?? ''}`.toLowerCase();
    return message.includes('relation') && message.includes('does not exist');
  }
}
