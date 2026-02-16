import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, IsNull, Repository } from 'typeorm';
import { createHash } from 'crypto';
import { mkdirSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';
import {
  SkillDefinition,
  SkillRuntimeMount,
  SkillVersion,
} from '../v3-entities';
import { SkillBindingResolverService } from './skill-binding-resolver.service';
import type { SkillCatalogItem, SkillRuntimePlan } from './skills.types';

interface ReconcileInput {
  tenantId: string;
  agentScope: string;
  capability?: string;
  engine: 'local' | 'openclaw';
}

export interface ReconcileResult {
  status: 'applied' | 'failed' | 'skipped';
  plan: SkillRuntimePlan;
  message?: string;
}

@Injectable()
export class SkillLoaderService {
  private readonly logger = new Logger(SkillLoaderService.name);
  private readonly openClawSyncEnabled = process.env.SKILL_OPENCLAW_SYNC_ENABLED === 'true';
  private readonly inFlightLocks = new Set<string>();

  constructor(
    @InjectRepository(SkillRuntimeMount, 'v3')
    private readonly mountRepo: Repository<SkillRuntimeMount>,
    @InjectRepository(SkillDefinition, 'v3')
    private readonly definitionRepo: Repository<SkillDefinition>,
    @InjectRepository(SkillVersion, 'v3')
    private readonly versionRepo: Repository<SkillVersion>,
    private readonly bindingResolver: SkillBindingResolverService,
  ) {}

  async reconcile(input: ReconcileInput): Promise<ReconcileResult> {
    if (!input.tenantId) {
      throw new BadRequestException('tenantId is required');
    }
    if (!input.agentScope) {
      throw new BadRequestException('agentScope is required');
    }

    const lockKey = `skills:mount:${input.engine}:${input.tenantId}:${input.agentScope}`;
    return this.withLock(lockKey, async () => {
      const resolved = await this.bindingResolver.resolveCatalog({
        tenantId: input.tenantId,
        agentScope: input.agentScope,
        capability: input.capability,
      });

      const plan = await this.buildPlan(resolved.items, input.tenantId);
      const existing = await this.mountRepo.findOne({
        where: {
          tenantId: input.tenantId,
          engine: input.engine,
          agentScope: input.agentScope,
        },
      });

      if (existing?.appliedHash === plan.desiredHash) {
        existing.status = 'skipped';
        existing.desiredHash = plan.desiredHash;
        existing.details = {
          warnings: resolved.warnings,
          loadActions: plan.loadActions,
          unloadActions: plan.unloadActions,
        };
        existing.lastReconcileAt = new Date();
        await this.mountRepo.save(existing);
        return {
          status: 'skipped',
          plan,
          message: 'desired hash unchanged',
        };
      }

      const mount = existing
        ? existing
        : this.mountRepo.create({
            tenantId: input.tenantId,
            engine: input.engine,
            agentScope: input.agentScope,
            desiredHash: plan.desiredHash,
            appliedHash: null,
            status: 'pending',
            details: null,
            lastReconcileAt: new Date(),
          });

      mount.status = 'pending';
      mount.desiredHash = plan.desiredHash;
      mount.details = {
        warnings: resolved.warnings,
        loadActions: plan.loadActions,
        unloadActions: plan.unloadActions,
      };
      mount.lastReconcileAt = new Date();
      await this.mountRepo.save(mount);

      try {
        await this.reloadRuntime(input, plan);

        mount.appliedHash = plan.desiredHash;
        mount.status = 'applied';
        mount.details = {
          ...(mount.details ?? {}),
          appliedAt: new Date().toISOString(),
        };
        mount.lastReconcileAt = new Date();
        await this.mountRepo.save(mount);

        return {
          status: 'applied',
          plan,
        };
      } catch (error) {
        mount.status = 'failed';
        mount.details = {
          ...(mount.details ?? {}),
          error: error instanceof Error ? error.message : String(error),
        };
        mount.lastReconcileAt = new Date();
        await this.mountRepo.save(mount);

        return {
          status: 'failed',
          plan,
          message: error instanceof Error ? error.message : String(error),
        };
      }
    });
  }

  private async buildPlan(
    items: SkillCatalogItem[],
    tenantId: string,
  ): Promise<SkillRuntimePlan> {
    const skills = await Promise.all(
      items.map(async (item) => {
        const { version, checksum } = await this.resolveChecksum(item, tenantId);
        const exportPath = this.exportSkillSnapshot(item, version, tenantId);
        return {
          key: item.key,
          version,
          checksum,
          exportPath,
        };
      }),
    );

    skills.sort((a, b) => a.key.localeCompare(b.key));

    const desiredHash = createHash('sha256')
      .update(JSON.stringify(skills.map((skill) => ({ key: skill.key, version: skill.version, checksum: skill.checksum }))))
      .digest('hex');

    return {
      desiredHash,
      skills,
      loadActions: skills.map((skill) => `load:${skill.key}@${skill.version}`),
      unloadActions: [],
    };
  }

  private async resolveChecksum(item: SkillCatalogItem, tenantId: string): Promise<{ version: string; checksum: string }> {
    if (item.source === 'builtin') {
      const checksum = createHash('sha256')
        .update(JSON.stringify({ tenantId, key: item.key, version: item.version, actions: item.actions }))
        .digest('hex');
      return {
        version: item.version,
        checksum,
      };
    }

    const where: FindOptionsWhere<SkillDefinition> = item.scopeId !== null
      ? {
          skillKey: item.key,
          scopeType: item.scopeType,
          scopeId: item.scopeId,
        }
      : {
          skillKey: item.key,
          scopeType: item.scopeType,
          scopeId: IsNull(),
        };

    const definition = await this.definitionRepo.findOne({ where });

    if (!definition) {
      return {
        version: item.version,
        checksum: createHash('sha256').update(`${tenantId}:${item.key}:${item.version}`).digest('hex'),
      };
    }

    const version = await this.versionRepo.findOne({
      where: {
        definitionId: definition.id,
        version: item.version,
      },
    });

    return {
      version: item.version,
      checksum:
        version?.checksum ?? createHash('sha256').update(`${tenantId}:${item.key}:${item.version}`).digest('hex'),
    };
  }

  private exportSkillSnapshot(item: SkillCatalogItem, version: string, tenantId: string): string {
    const exportRoot =
      process.env.SKILL_EXPORT_DIR ?? resolve(process.cwd(), 'packages/server-nestjs/exports/skills');
    const targetDir = join(exportRoot, item.key);
    mkdirSync(targetDir, { recursive: true });

    const filePath = join(targetDir, `${version}.json`);
    writeFileSync(
      filePath,
      JSON.stringify(
        {
          tenantId,
          key: item.key,
          version,
          displayName: item.displayName,
          description: item.description,
          source: item.source,
          actions: item.actions,
          exportedAt: new Date().toISOString(),
        },
        null,
        2,
      ),
      'utf8',
    );

    return filePath;
  }

  private async reloadRuntime(input: ReconcileInput, plan: SkillRuntimePlan): Promise<void> {
    if (input.engine !== 'openclaw') {
      return;
    }

    if (!this.openClawSyncEnabled) {
      this.logger.warn('SKILL_OPENCLAW_SYNC_ENABLED=false, skip OpenClaw reload');
      return;
    }

    const gatewayUrl = process.env.OPENCLAW_GATEWAY_URL;
    if (!gatewayUrl) {
      throw new Error('OPENCLAW_GATEWAY_URL is required when SKILL_OPENCLAW_SYNC_ENABLED=true');
    }

    const token = process.env.OPENCLAW_GATEWAY_TOKEN;
    const response = await fetch(`${gatewayUrl.replace(/\/$/, '')}/skills/reload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        tenantId: input.tenantId,
        agentScope: input.agentScope,
        desiredHash: plan.desiredHash,
        skills: plan.skills,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenClaw reload failed: ${response.status} ${response.statusText}`);
    }
  }

  private async withLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
    if (this.inFlightLocks.has(key)) {
      throw new BadRequestException({
        code: 'skill_reconcile_conflict',
        message: 'A reconcile request is already running for this scope.',
      });
    }

    this.inFlightLocks.add(key);
    try {
      return await fn();
    } finally {
      this.inFlightLocks.delete(key);
    }
  }
}
