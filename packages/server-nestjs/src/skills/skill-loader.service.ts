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
import { generateUlid } from '../utils/ulid';
import { SkillBindingResolverService } from './skill-binding-resolver.service';
import type {
  EnginePolicy,
  OpenClawReloadProtocol,
  OpenClawReloadRequestV2,
  OpenClawReloadResponseV2,
  SkillCatalogItem,
  SkillRuntimeMountDetailsV2,
  SkillRuntimePlan,
} from './skills.types';

interface ReconcileInput {
  tenantId: string;
  agentScope: string;
  capability?: string;
  engine: 'local' | 'openclaw';
}

interface ReloadRuntimeResult {
  attempts: number;
  gatewaySummary: SkillRuntimeMountDetailsV2['gatewaySummary'];
}

class ReloadRuntimeError extends Error {
  constructor(
    message: string,
    readonly attempts: number,
    readonly gatewaySummary: SkillRuntimeMountDetailsV2['gatewaySummary'],
  ) {
    super(message);
  }
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
      const traceId = generateUlid();
      const phaseDurations: SkillRuntimeMountDetailsV2['phaseDurationsMs'] = {
        resolve: 0,
        buildPlan: 0,
        persistPending: 0,
        reload: 0,
        persistFinal: 0,
      };

      const resolveStart = Date.now();
      const existing = await this.mountRepo.findOne({
        where: {
          tenantId: input.tenantId,
          engine: input.engine,
          agentScope: input.agentScope,
        },
      });
      const resolved = await this.bindingResolver.resolveCatalog({
        tenantId: input.tenantId,
        agentScope: input.agentScope,
        capability: input.capability,
      });
      const previousAppliedSkills = this.extractAppliedSkills(existing?.details ?? null);
      phaseDurations.resolve = Date.now() - resolveStart;

      const buildPlanStart = Date.now();
      const plan = await this.buildPlan(resolved.items, input.tenantId, previousAppliedSkills);
      phaseDurations.buildPlan = Date.now() - buildPlanStart;

      if (existing?.appliedHash === plan.desiredHash) {
        const persistStart = Date.now();
        existing.status = 'skipped';
        existing.desiredHash = plan.desiredHash;
        existing.details = this.buildMountDetails({
          warnings: resolved.warnings,
          plan,
          traceId,
          phaseDurations,
          reloadAttempts: 0,
          gatewaySummary: {
            executionMode: 'hash-unchanged',
          },
          existingDetails: existing.details,
          appliedSkills: previousAppliedSkills,
        });
        existing.lastReconcileAt = new Date();
        await this.mountRepo.save(existing);
        phaseDurations.persistFinal = Date.now() - persistStart;

        existing.details = this.buildMountDetails({
          warnings: resolved.warnings,
          plan,
          traceId,
          phaseDurations,
          reloadAttempts: 0,
          gatewaySummary: {
            executionMode: 'hash-unchanged',
          },
          existingDetails: existing.details,
          appliedSkills: previousAppliedSkills,
        });
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
      mount.details = this.buildMountDetails({
        warnings: resolved.warnings,
        plan,
        traceId,
        phaseDurations,
        reloadAttempts: 0,
        gatewaySummary: {
          executionMode: 'pending',
        },
        existingDetails: mount.details,
      });
      mount.lastReconcileAt = new Date();

      const persistPendingStart = Date.now();
      await this.mountRepo.save(mount);
      phaseDurations.persistPending = Date.now() - persistPendingStart;

      let reloadResult: ReloadRuntimeResult = {
        attempts: 0,
        gatewaySummary: {
          executionMode: input.engine === 'openclaw' ? 'not-started' : 'local-engine',
        },
      };
      const reloadStart = Date.now();
      try {
        reloadResult = await this.reloadRuntime(input, plan, traceId);
        phaseDurations.reload = Date.now() - reloadStart;

        const persistFinalStart = Date.now();
        mount.appliedHash = plan.desiredHash;
        mount.status = 'applied';
        mount.details = this.buildMountDetails({
          warnings: resolved.warnings,
          plan,
          traceId,
          phaseDurations,
          reloadAttempts: reloadResult.attempts,
          gatewaySummary: reloadResult.gatewaySummary,
          existingDetails: mount.details,
          appliedSkills: plan.skills.map((skill) => ({
            key: skill.key,
            version: skill.version,
            checksum: skill.checksum,
          })),
          appliedAt: new Date().toISOString(),
        });
        mount.lastReconcileAt = new Date();
        await this.mountRepo.save(mount);
        phaseDurations.persistFinal = Date.now() - persistFinalStart;

        mount.details = this.buildMountDetails({
          warnings: resolved.warnings,
          plan,
          traceId,
          phaseDurations,
          reloadAttempts: reloadResult.attempts,
          gatewaySummary: reloadResult.gatewaySummary,
          existingDetails: mount.details,
          appliedSkills: plan.skills.map((skill) => ({
            key: skill.key,
            version: skill.version,
            checksum: skill.checksum,
          })),
          appliedAt: new Date().toISOString(),
        });
        await this.mountRepo.save(mount);

        return {
          status: 'applied',
          plan,
        };
      } catch (error) {
        phaseDurations.reload = Date.now() - reloadStart;

        const policy = this.resolveEnginePolicy();
        const parsed = this.parseReloadError(error);
        const fallbackAllowed = policy === 'fallback_local' && input.engine === 'openclaw';
        const finalStatus: ReconcileResult['status'] = fallbackAllowed ? 'applied' : 'failed';

        const persistFinalStart = Date.now();
        mount.status = finalStatus;
        mount.appliedHash = fallbackAllowed ? plan.desiredHash : mount.appliedHash;
        mount.details = this.buildMountDetails({
          warnings: resolved.warnings,
          plan,
          traceId,
          phaseDurations,
          reloadAttempts: parsed.attempts,
          gatewaySummary: {
            ...(parsed.gatewaySummary ?? {}),
            fallback: fallbackAllowed,
          },
          existingDetails: mount.details,
          appliedSkills: fallbackAllowed
            ? plan.skills.map((skill) => ({
                key: skill.key,
                version: skill.version,
                checksum: skill.checksum,
              }))
            : previousAppliedSkills,
          appliedAt: fallbackAllowed ? new Date().toISOString() : undefined,
          error: parsed.message,
          degraded: fallbackAllowed,
          fallbackReason: fallbackAllowed ? parsed.message : undefined,
        });
        mount.lastReconcileAt = new Date();
        await this.mountRepo.save(mount);
        phaseDurations.persistFinal = Date.now() - persistFinalStart;

        mount.details = this.buildMountDetails({
          warnings: resolved.warnings,
          plan,
          traceId,
          phaseDurations,
          reloadAttempts: parsed.attempts,
          gatewaySummary: {
            ...(parsed.gatewaySummary ?? {}),
            fallback: fallbackAllowed,
          },
          existingDetails: mount.details,
          appliedSkills: fallbackAllowed
            ? plan.skills.map((skill) => ({
                key: skill.key,
                version: skill.version,
                checksum: skill.checksum,
              }))
            : previousAppliedSkills,
          appliedAt: fallbackAllowed ? new Date().toISOString() : undefined,
          error: parsed.message,
          degraded: fallbackAllowed,
          fallbackReason: fallbackAllowed ? parsed.message : undefined,
        });
        await this.mountRepo.save(mount);

        if (fallbackAllowed) {
          return {
            status: 'applied',
            plan,
            message: `OpenClaw reload failed, fallback_local applied: ${parsed.message}`,
          };
        }

        return {
          status: 'failed',
          plan,
          message: parsed.message,
        };
      }
    });
  }

  private resolveEnginePolicy(): EnginePolicy {
    return process.env.SKILL_RUNTIME_ENGINE_POLICY === 'fallback_local'
      ? 'fallback_local'
      : 'strict_openclaw';
  }

  private resolveReloadProtocol(): OpenClawReloadProtocol {
    return process.env.SKILL_OPENCLAW_RELOAD_PROTOCOL === 'v1' ? 'v1' : 'v2';
  }

  private resolveReloadTimeoutMs(): number {
    const value = Number(process.env.SKILL_OPENCLAW_RELOAD_TIMEOUT_MS ?? '6000');
    if (!Number.isFinite(value) || value < 1000) {
      return 6000;
    }
    return Math.floor(value);
  }

  private resolveReloadMaxRetries(): number {
    const value = Number(process.env.SKILL_OPENCLAW_RELOAD_MAX_RETRIES ?? '2');
    if (!Number.isFinite(value) || value < 0) {
      return 2;
    }
    return Math.floor(value);
  }

  private resolveRetryBackoffMs(attempt: number): number {
    const base = Number(process.env.SKILL_OPENCLAW_RETRY_BACKOFF_MS ?? '250');
    const safeBase = Number.isFinite(base) && base > 0 ? Math.floor(base) : 250;
    return safeBase * Math.max(1, attempt);
  }

  private async buildPlan(
    items: SkillCatalogItem[],
    tenantId: string,
    previousAppliedSkills: Array<{ key: string; version: string; checksum: string }>,
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

    skills.sort((a, b) => a.key.localeCompare(b.key) || a.version.localeCompare(b.version));

    const desiredHash = createHash('sha256')
      .update(
        JSON.stringify(
          skills.map((skill) => ({
            key: skill.key,
            version: skill.version,
            checksum: skill.checksum,
          })),
        ),
      )
      .digest('hex');

    const previousMap = new Map(
      previousAppliedSkills.map((skill) => [`${skill.key}@${skill.version}`, skill.checksum]),
    );
    const currentSet = new Set(skills.map((skill) => `${skill.key}@${skill.version}`));

    const loadActions = skills
      .filter((skill) => {
        const previousChecksum = previousMap.get(`${skill.key}@${skill.version}`);
        return !previousChecksum || previousChecksum !== skill.checksum;
      })
      .map((skill) => `load:${skill.key}@${skill.version}`);

    const unloadActions = previousAppliedSkills
      .filter((skill) => !currentSet.has(`${skill.key}@${skill.version}`))
      .map((skill) => `unload:${skill.key}@${skill.version}`)
      .sort((a, b) => a.localeCompare(b));

    return {
      desiredHash,
      skills,
      loadActions,
      unloadActions,
    };
  }

  private extractAppliedSkills(
    details: Record<string, unknown> | null,
  ): Array<{ key: string; version: string; checksum: string }> {
    const appliedRaw = details?.appliedSkills;
    if (!Array.isArray(appliedRaw)) {
      return [];
    }

    const parsed = appliedRaw
      .map((skill) => {
        if (!skill || typeof skill !== 'object') {
          return null;
        }
        const row = skill as Record<string, unknown>;
        const key = typeof row.key === 'string' ? row.key.trim() : '';
        const version = typeof row.version === 'string' ? row.version.trim() : '';
        const checksum = typeof row.checksum === 'string' ? row.checksum.trim() : '';
        if (!key || !version || !checksum) {
          return null;
        }
        return {
          key,
          version,
          checksum,
        };
      })
      .filter((row): row is { key: string; version: string; checksum: string } => Boolean(row));

    parsed.sort((a, b) => a.key.localeCompare(b.key) || a.version.localeCompare(b.version));
    return parsed;
  }

  private buildMountDetails(params: {
    warnings: string[];
    plan: SkillRuntimePlan;
    traceId: string;
    phaseDurations: SkillRuntimeMountDetailsV2['phaseDurationsMs'];
    reloadAttempts: number;
    gatewaySummary: SkillRuntimeMountDetailsV2['gatewaySummary'];
    existingDetails: Record<string, unknown> | null;
    appliedSkills?: Array<{ key: string; version: string; checksum: string }>;
    appliedAt?: string;
    error?: string;
    degraded?: boolean;
    fallbackReason?: string;
  }): SkillRuntimeMountDetailsV2 {
    const existingDetails = (params.existingDetails as SkillRuntimeMountDetailsV2 | null) ?? null;
    const details: SkillRuntimeMountDetailsV2 = {
      ...(existingDetails ?? {}),
      warnings: params.warnings,
      loadActions: params.plan.loadActions,
      unloadActions: params.plan.unloadActions,
      traceId: params.traceId,
      phaseDurationsMs: {
        resolve: params.phaseDurations?.resolve ?? 0,
        buildPlan: params.phaseDurations?.buildPlan ?? 0,
        persistPending: params.phaseDurations?.persistPending ?? 0,
        reload: params.phaseDurations?.reload ?? 0,
        persistFinal: params.phaseDurations?.persistFinal ?? 0,
      },
      reloadAttempts: params.reloadAttempts,
      gatewaySummary: params.gatewaySummary,
      appliedSkills:
        params.appliedSkills ??
        (Array.isArray(existingDetails?.appliedSkills) ? existingDetails.appliedSkills : undefined),
    };

    if (params.appliedAt) {
      details.appliedAt = params.appliedAt;
    }
    if (params.error) {
      details.error = params.error;
    } else {
      delete details.error;
    }
    if (params.degraded) {
      details.degraded = true;
    } else {
      delete details.degraded;
    }
    if (params.fallbackReason) {
      details.fallbackReason = params.fallbackReason;
    } else {
      delete details.fallbackReason;
    }

    return details;
  }

  private parseReloadError(error: unknown): {
    message: string;
    attempts: number;
    gatewaySummary: SkillRuntimeMountDetailsV2['gatewaySummary'];
  } {
    if (error instanceof ReloadRuntimeError) {
      return {
        message: error.message,
        attempts: error.attempts,
        gatewaySummary: error.gatewaySummary,
      };
    }

    return {
      message: error instanceof Error ? error.message : String(error),
      attempts: 0,
      gatewaySummary: {
        responseSnippet: error instanceof Error ? error.message : String(error),
      },
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

  private async reloadRuntime(
    input: ReconcileInput,
    plan: SkillRuntimePlan,
    traceId: string,
  ): Promise<ReloadRuntimeResult> {
    if (input.engine !== 'openclaw') {
      return {
        attempts: 0,
        gatewaySummary: {
          executionMode: 'local-engine',
        },
      };
    }

    if (!this.openClawSyncEnabled) {
      this.logger.warn('SKILL_OPENCLAW_SYNC_ENABLED=false, skip OpenClaw reload');
      return {
        attempts: 0,
        gatewaySummary: {
          executionMode: 'sync-disabled',
        },
      };
    }

    const gatewayUrl = process.env.OPENCLAW_GATEWAY_URL;
    if (!gatewayUrl) {
      throw new ReloadRuntimeError(
        'OPENCLAW_GATEWAY_URL is required when SKILL_OPENCLAW_SYNC_ENABLED=true',
        0,
        { responseSnippet: 'missing gateway url' },
      );
    }

    const protocol = this.resolveReloadProtocol();
    const token = process.env.OPENCLAW_GATEWAY_TOKEN;
    const timeoutMs = this.resolveReloadTimeoutMs();
    const maxRetries = this.resolveReloadMaxRetries();
    const totalAttempts = 1 + maxRetries;
    const endpoint = `${gatewayUrl.replace(/\/$/, '')}/skills/reload`;

    for (let attempt = 1; attempt <= totalAttempts; attempt += 1) {
      try {
        const response = await this.fetchWithTimeout(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(
            protocol === 'v2'
              ? this.buildReloadRequestV2(input, plan, traceId)
              : {
                  tenantId: input.tenantId,
                  agentScope: input.agentScope,
                  desiredHash: plan.desiredHash,
                  skills: plan.skills,
                },
          ),
        }, timeoutMs);

        const responseBody = await response.text();
        const parsedJson = responseBody ? this.safeParseJson(responseBody) : null;

        const gatewaySummary: SkillRuntimeMountDetailsV2['gatewaySummary'] = {
          statusCode: response.status,
          responseSnippet: responseBody.slice(0, 300),
          executionMode:
            protocol === 'v2' && parsedJson && typeof parsedJson === 'object'
              ? String((parsedJson as Record<string, unknown>).executionMode ?? '')
              : undefined,
          acceptedAtMs:
            protocol === 'v2' && parsedJson && typeof parsedJson === 'object'
              ? this.asNumber((parsedJson as Record<string, unknown>).acceptedAtMs)
              : undefined,
        };

        if (!response.ok) {
          const message = `OpenClaw reload failed: ${response.status} ${response.statusText}`;
          const retryable = this.isRetryableStatus(response.status);
          if (retryable && attempt < totalAttempts) {
            await this.sleep(this.resolveRetryBackoffMs(attempt));
            continue;
          }
          throw new ReloadRuntimeError(message, attempt, gatewaySummary);
        }

        if (protocol === 'v2') {
          const parsed = this.validateReloadResponseV2(parsedJson, input, plan, attempt);
          return {
            attempts: attempt,
            gatewaySummary: {
              ...gatewaySummary,
              executionMode: parsed.executionMode,
              acceptedAtMs: parsed.acceptedAtMs,
            },
          };
        }

        return {
          attempts: attempt,
          gatewaySummary,
        };
      } catch (error) {
        if (error instanceof ReloadRuntimeError) {
          throw error;
        }

        const message = error instanceof Error ? error.message : String(error);
        const retryable = this.isRetryableError(error);
        if (retryable && attempt < totalAttempts) {
          await this.sleep(this.resolveRetryBackoffMs(attempt));
          continue;
        }

        throw new ReloadRuntimeError(message, attempt, {
          responseSnippet: message.slice(0, 300),
        });
      }
    }

    throw new ReloadRuntimeError('OpenClaw reload exhausted retry budget', totalAttempts, {
      responseSnippet: 'retry_budget_exhausted',
    });
  }

  private buildReloadRequestV2(
    input: ReconcileInput,
    plan: SkillRuntimePlan,
    traceId: string,
  ): OpenClawReloadRequestV2 {
    return {
      tenantId: input.tenantId,
      agentScope: input.agentScope,
      desiredHash: plan.desiredHash,
      skills: plan.skills,
      loadActions: plan.loadActions,
      unloadActions: plan.unloadActions,
      traceId,
      protocolVersion: 'v2',
    };
  }

  private validateReloadResponseV2(
    raw: unknown,
    input: ReconcileInput,
    plan: SkillRuntimePlan,
    attempt: number,
  ): OpenClawReloadResponseV2 {
    if (!raw || typeof raw !== 'object') {
      throw new ReloadRuntimeError('OpenClaw reload v2 response must be a JSON object', attempt, {
        responseSnippet: 'invalid_json_response',
      });
    }

    const row = raw as Record<string, unknown>;
    const ok = row.ok === true;
    const executionMode = typeof row.executionMode === 'string' ? row.executionMode : '';
    const tenantId = typeof row.tenantId === 'string' ? row.tenantId : '';
    const agentScope = typeof row.agentScope === 'string' ? row.agentScope : '';
    const desiredHash = typeof row.desiredHash === 'string' ? row.desiredHash : '';
    const acceptedAtMs = this.asNumber(row.acceptedAtMs);

    if (!ok || !executionMode || !tenantId || !agentScope || !desiredHash || acceptedAtMs === undefined) {
      throw new ReloadRuntimeError('OpenClaw reload v2 response missing required fields', attempt, {
        responseSnippet: JSON.stringify(row).slice(0, 300),
      });
    }

    if (tenantId !== input.tenantId || agentScope !== input.agentScope || desiredHash !== plan.desiredHash) {
      throw new ReloadRuntimeError('OpenClaw reload v2 response does not match request context', attempt, {
        responseSnippet: JSON.stringify(row).slice(0, 300),
      });
    }

    return {
      ok,
      executionMode,
      tenantId,
      agentScope,
      desiredHash,
      acceptedAtMs,
      summary: typeof row.summary === 'object' && row.summary !== null
        ? (row.summary as Record<string, unknown>)
        : undefined,
    };
  }

  private asNumber(value: unknown): number | undefined {
    return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
  }

  private safeParseJson(value: string): unknown {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }

  private isRetryableStatus(status: number): boolean {
    return status === 408 || status === 429 || status >= 500;
  }

  private isRetryableError(error: unknown): boolean {
    if (error instanceof Error) {
      const message = `${error.name}:${error.message}`.toLowerCase();
      return (
        message.includes('aborterror') ||
        message.includes('timed out') ||
        message.includes('timeout') ||
        message.includes('fetch failed') ||
        message.includes('network')
      );
    }
    return false;
  }

  private async fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(url, {
        ...init,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }
  }

  private async sleep(ms: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms));
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
