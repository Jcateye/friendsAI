import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  AgentDefinitionPublishLog,
  AgentDefinitionReleaseRule,
  AgentDefinitionVersion,
} from '../v3-entities';
import { mkdirSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';

interface CreateDefinitionVersionInput {
  version: string;
  templateBundle: Record<string, unknown>;
  schema: Record<string, unknown>;
}

interface ValidateDefinitionInput {
  templateBundle: Record<string, unknown>;
  schema: Record<string, unknown>;
}

interface PublishDefinitionInput {
  rolloutPercent?: number;
}

@Injectable()
export class AgentDefinitionCenterService {
  private readonly logger = new Logger(AgentDefinitionCenterService.name);
  private readonly enabled = process.env.AGENT_DEFINITION_CENTER_ENABLED !== 'false';

  constructor(
    @InjectRepository(AgentDefinitionVersion, 'v3')
    private readonly versionRepo: Repository<AgentDefinitionVersion>,
    @InjectRepository(AgentDefinitionReleaseRule, 'v3')
    private readonly ruleRepo: Repository<AgentDefinitionReleaseRule>,
    @InjectRepository(AgentDefinitionPublishLog, 'v3')
    private readonly logRepo: Repository<AgentDefinitionPublishLog>,
  ) {}

  async listVersions(agentId: string): Promise<AgentDefinitionVersion[]> {
    return this.versionRepo.find({
      where: { agentId },
      order: { updatedAt: 'DESC' },
    });
  }

  async createVersion(
    agentId: string,
    userId: string | null,
    input: CreateDefinitionVersionInput,
  ): Promise<AgentDefinitionVersion> {
    if (!this.enabled) {
      throw new BadRequestException('agent_definition_center_disabled');
    }

    if (!input.version || !input.templateBundle || !input.schema) {
      throw new BadRequestException('version/templateBundle/schema are required');
    }

    const exists = await this.versionRepo.findOne({ where: { agentId, version: input.version } });
    if (exists) {
      throw new BadRequestException(`version already exists: ${input.version}`);
    }

    const validation = this.validateDefinition({
      templateBundle: input.templateBundle,
      schema: input.schema,
    });

    if (!validation.valid) {
      throw new BadRequestException({
        code: 'definition_validation_failed',
        message: 'invalid definition payload',
        details: validation.errors,
      });
    }

    const version = this.versionRepo.create({
      agentId,
      version: input.version,
      status: 'draft',
      templateBundle: input.templateBundle,
      schema: input.schema,
      createdBy: userId,
    });

    return this.versionRepo.save(version);
  }

  validateDefinition(input: ValidateDefinitionInput): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    const systemTemplate = input.templateBundle?.systemTemplate;
    const userTemplate = input.templateBundle?.userTemplate;

    if (typeof systemTemplate !== 'string' || systemTemplate.trim().length === 0) {
      errors.push('templateBundle.systemTemplate is required');
    }

    if (typeof userTemplate !== 'string' || userTemplate.trim().length === 0) {
      errors.push('templateBundle.userTemplate is required');
    }

    if (!input.schema || typeof input.schema !== 'object') {
      errors.push('schema must be an object');
    } else if (!('type' in input.schema)) {
      errors.push('schema.type is required');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  async publishVersion(
    agentId: string,
    version: string,
    userId: string | null,
    input: PublishDefinitionInput,
  ): Promise<{
    published: boolean;
    version: AgentDefinitionVersion;
    releaseRule: AgentDefinitionReleaseRule;
    exportPath: string;
  }> {
    if (!this.enabled) {
      throw new BadRequestException('agent_definition_center_disabled');
    }

    const target = await this.versionRepo.findOne({
      where: {
        agentId,
        version,
      },
    });

    if (!target) {
      throw new NotFoundException(`definition version not found: ${agentId}@${version}`);
    }

    const validation = this.validateDefinition({
      templateBundle: target.templateBundle,
      schema: target.schema,
    });

    if (!validation.valid) {
      await this.logPublish(agentId, version, 'publish', 'failed', userId, {
        validationErrors: validation.errors,
      });
      throw new BadRequestException({
        code: 'definition_validation_failed',
        message: 'publish blocked by validation errors',
        details: validation.errors,
      });
    }

    await this.versionRepo.update(
      {
        agentId,
        status: 'active',
      },
      {
        status: 'deprecated',
      },
    );

    target.status = 'active';
    const savedVersion = await this.versionRepo.save(target);

    const rolloutPercent = this.normalizeRolloutPercent(input.rolloutPercent);

    const existingRule = await this.ruleRepo.findOne({
      where: {
        agentId,
        version,
      },
    });

    await this.ruleRepo.update(
      {
        agentId,
      },
      {
        isActive: false,
      },
    );

    const activeRule = await this.ruleRepo.save(
      existingRule
        ? Object.assign(existingRule, {
            rolloutPercent,
            isActive: true,
            createdBy: userId,
          })
        : this.ruleRepo.create({
            agentId,
            version,
            rolloutPercent,
            isActive: true,
            createdBy: userId,
          }),
    );

    const exportPath = this.exportToGitSnapshot(savedVersion, activeRule);

    await this.logPublish(agentId, version, 'publish', 'succeeded', userId, {
      rolloutPercent,
      exportPath,
    });

    return {
      published: true,
      version: savedVersion,
      releaseRule: activeRule,
      exportPath,
    };
  }

  private normalizeRolloutPercent(value: number | undefined): number {
    if (!Number.isFinite(value)) {
      return 100;
    }
    return Math.max(0, Math.min(100, Math.floor(Number(value))));
  }

  private exportToGitSnapshot(
    version: AgentDefinitionVersion,
    releaseRule: AgentDefinitionReleaseRule,
  ): string {
    const exportRoot =
      process.env.AGENT_DEFINITION_EXPORT_DIR ??
      resolve(process.cwd(), 'packages/server-nestjs/exports/agent-definitions');

    const targetDir = join(exportRoot, version.agentId);
    mkdirSync(targetDir, { recursive: true });

    const filePath = join(targetDir, `${version.version}.json`);
    writeFileSync(
      filePath,
      JSON.stringify(
        {
          agentId: version.agentId,
          version: version.version,
          status: version.status,
          templateBundle: version.templateBundle,
          schema: version.schema,
          releaseRule: {
            rolloutPercent: releaseRule.rolloutPercent,
            isActive: releaseRule.isActive,
          },
          exportedAt: new Date().toISOString(),
        },
        null,
        2,
      ),
      'utf8',
    );

    return filePath;
  }

  private async logPublish(
    agentId: string,
    version: string,
    action: string,
    result: 'succeeded' | 'failed',
    userId: string | null,
    details: Record<string, unknown>,
  ): Promise<void> {
    await this.logRepo.save(
      this.logRepo.create({
        agentId,
        version,
        action,
        result,
        createdBy: userId,
        details,
      }),
    );
  }
}
