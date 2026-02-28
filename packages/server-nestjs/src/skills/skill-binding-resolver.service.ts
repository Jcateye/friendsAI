import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, IsNull, Repository } from 'typeorm';
import { createHash } from 'crypto';
import {
  SkillBinding,
  SkillDefinition,
  SkillReleaseRule,
  SkillVersion,
} from '../v3-entities';
import type { SkillCatalogItem, SkillManifest } from './skills.types';

interface ResolveCatalogInput {
  tenantId: string;
  agentScope?: string;
  capability?: string;
}

interface ResolveCatalogOutput {
  items: SkillCatalogItem[];
  warnings: string[];
}

@Injectable()
export class SkillBindingResolverService {
  constructor(
    @InjectRepository(SkillDefinition, 'v3')
    private readonly definitionRepo: Repository<SkillDefinition>,
    @InjectRepository(SkillVersion, 'v3')
    private readonly versionRepo: Repository<SkillVersion>,
    @InjectRepository(SkillReleaseRule, 'v3')
    private readonly releaseRuleRepo: Repository<SkillReleaseRule>,
    @InjectRepository(SkillBinding, 'v3')
    private readonly bindingRepo: Repository<SkillBinding>,
  ) {}

  async resolveCatalog(input: ResolveCatalogInput): Promise<ResolveCatalogOutput> {
    const warnings: string[] = [];

    const [definitions, bindings] = await Promise.all([
      this.definitionRepo.find({
        where: [
          { scopeType: 'global', scopeId: IsNull(), enabled: true },
          { scopeType: 'tenant', scopeId: input.tenantId, enabled: true },
        ],
      }),
      this.loadBindings(input),
    ]);

    const selectedDefinitions = new Map<string, SkillDefinition>();
    for (const definition of definitions) {
      const existing = selectedDefinitions.get(definition.skillKey);
      if (!existing) {
        selectedDefinitions.set(definition.skillKey, definition);
        continue;
      }
      if (existing.scopeType === 'global' && definition.scopeType === 'tenant') {
        selectedDefinitions.set(definition.skillKey, definition);
      }
    }

    const items: SkillCatalogItem[] = [];

    for (const definition of selectedDefinitions.values()) {
      const version = await this.pickActiveVersion(definition, input.tenantId);
      if (!version) {
        continue;
      }

      const manifest = this.toManifest(definition.skillKey, definition.displayName, version.manifest);
      if (!manifest || !Array.isArray(manifest.operations) || manifest.operations.length === 0) {
        warnings.push(`Invalid manifest for ${definition.skillKey}@${version.version}`);
        continue;
      }

      items.push({
        key: definition.skillKey,
        displayName: manifest.displayName,
        description: manifest.description,
        source: definition.scopeType,
        scopeType: definition.scopeType,
        scopeId: definition.scopeId,
        version: version.version,
        status: version.status,
        parserRules: version.parserRules ?? undefined,
        actions: manifest.operations
          .filter((operation) => operation.run?.agentId)
          .map((operation) => ({
            actionId: `${definition.skillKey}:${operation.name}`,
            skillKey: definition.skillKey,
            operation: operation.name,
            name: operation.displayName || operation.name,
            description: operation.description,
            run: {
              agentId: operation.run!.agentId,
              operation: operation.run?.operation,
              inputTemplate: operation.run?.inputTemplate,
            },
            riskLevel: operation.riskLevel,
          })),
      });
    }

    for (const binding of bindings.sort((a, b) => b.priority - a.priority)) {
      const target = items.find((item) => item.key === binding.skillKey);
      if (!target) {
        warnings.push(`Binding points to missing skill key ${binding.skillKey}`);
        continue;
      }

      const bucket = this.stableBucket(`${input.tenantId}:${binding.skillKey}:${binding.scopeType}:${binding.scopeId}`);
      if (bucket >= binding.rolloutPercent) {
        target.binding = {
          scopeType: binding.scopeType,
          scopeId: binding.scopeId,
          priority: binding.priority,
          enabled: false,
          rolloutPercent: binding.rolloutPercent,
          pinnedVersion: binding.pinnedVersion,
        };
        continue;
      }

      if (!binding.enabled) {
        const index = items.findIndex((item) => item.key === binding.skillKey);
        if (index >= 0) {
          items.splice(index, 1);
        }
        continue;
      }

      if (binding.pinnedVersion) {
        const definition = selectedDefinitions.get(binding.skillKey);
        if (definition) {
          const pinnedVersion = await this.versionRepo.findOne({
            where: {
              definitionId: definition.id,
              version: binding.pinnedVersion,
            },
          });
          if (pinnedVersion) {
            const pinnedManifest = this.toManifest(definition.skillKey, definition.displayName, pinnedVersion.manifest);
            if (pinnedManifest && Array.isArray(pinnedManifest.operations)) {
              target.version = pinnedVersion.version;
              target.status = pinnedVersion.status;
              target.actions = pinnedManifest.operations
                .filter((operation) => operation.run?.agentId)
                .map((operation) => ({
                  actionId: `${definition.skillKey}:${operation.name}`,
                  skillKey: definition.skillKey,
                  operation: operation.name,
                  name: operation.displayName || operation.name,
                  description: operation.description,
                  run: {
                    agentId: operation.run!.agentId,
                    operation: operation.run?.operation,
                    inputTemplate: operation.run?.inputTemplate,
                  },
                  riskLevel: operation.riskLevel,
                }));
            }
          } else {
            warnings.push(`Pinned version not found: ${binding.skillKey}@${binding.pinnedVersion}`);
          }
        }
      }

      target.binding = {
        scopeType: binding.scopeType,
        scopeId: binding.scopeId,
        priority: binding.priority,
        enabled: binding.enabled,
        rolloutPercent: binding.rolloutPercent,
        pinnedVersion: binding.pinnedVersion,
      };
    }

    items.sort((a, b) => a.displayName.localeCompare(b.displayName));

    return {
      items,
      warnings,
    };
  }

  private async loadBindings(input: ResolveCatalogInput): Promise<SkillBinding[]> {
    const conditions: FindOptionsWhere<SkillBinding>[] = [
      {
        tenantId: input.tenantId,
        scopeType: 'tenant',
        scopeId: input.tenantId,
      },
    ];

    if (input.agentScope) {
      conditions.push({
        tenantId: input.tenantId,
        scopeType: 'agent',
        scopeId: input.agentScope,
      });
    }

    if (input.capability) {
      conditions.push({
        tenantId: input.tenantId,
        scopeType: 'capability',
        scopeId: input.capability,
      });
    }

    return this.bindingRepo.find({
      where: conditions,
    });
  }

  private async pickActiveVersion(
    definition: SkillDefinition,
    tenantId: string,
  ): Promise<SkillVersion | null> {
    const version = await this.versionRepo.findOne({
      where: {
        definitionId: definition.id,
        status: 'active',
      },
      order: {
        updatedAt: 'DESC',
      },
    });

    if (!version) {
      return null;
    }

    const rule = await this.releaseRuleRepo.findOne({
      where: [
        {
          definitionId: definition.id,
          version: version.version,
          scopeType: 'tenant',
          scopeId: tenantId,
          isActive: true,
        },
        {
          definitionId: definition.id,
          version: version.version,
          scopeType: 'global',
          scopeId: IsNull(),
          isActive: true,
        },
      ],
      order: {
        scopeType: 'DESC',
      },
    });

    if (!rule) {
      return version;
    }

    const bucket = this.stableBucket(`${tenantId}:${definition.skillKey}:${version.version}`);
    if (bucket >= rule.rolloutPercent) {
      return null;
    }

    return version;
  }

  private toManifest(
    key: string,
    displayName: string,
    rawManifest: Record<string, unknown>,
  ): SkillManifest | null {
    if (!rawManifest || typeof rawManifest !== 'object') {
      return null;
    }

    const manifest = rawManifest as unknown as SkillManifest;
    return {
      ...manifest,
      key: manifest.key || key,
      displayName: manifest.displayName || displayName,
    };
  }

  private stableBucket(seed: string): number {
    const hash = createHash('sha256').update(seed).digest('hex');
    return parseInt(hash.slice(0, 8), 16) % 100;
  }
}
