import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { SnapshotRepository, FindSnapshotParams } from './snapshot.repository';
import { AgentSnapshot, ScopeType } from '../../entities/agent-snapshot.entity';

export interface FindSnapshotOptions {
  forceRefresh?: boolean;
}

export interface FindSnapshotResult {
  snapshot: AgentSnapshot | null;
  cached: boolean;
}

export interface CreateSnapshotData {
  agentId: string;
  operation?: string | null;
  scopeType: ScopeType;
  scopeId?: string | null;
  userId?: string | null;
  sourceHash: string;
  promptVersion: string;
  model?: string | null;
  input: Record<string, any>;
  output: Record<string, any>;
  ttlSeconds?: number;
}

@Injectable()
export class SnapshotService {
  private readonly logger = new Logger(SnapshotService.name);

  constructor(private readonly repository: SnapshotRepository) {}

  /**
   * Compute sourceHash for caching
   * Standard format: SHA256(JSON.stringify({ agentId, operation, input }))
   */
  computeSourceHash(
    agentId: string,
    operation: string | null | undefined,
    input: Record<string, any>,
  ): string {
    try {
      const data = JSON.stringify({
        agentId,
        operation: operation ?? null,
        input,
      });
      return crypto.createHash('sha256').update(data).digest('hex');
    } catch (error) {
      this.logger.error(`Error computing sourceHash: ${error.message}`, error.stack);
      throw new Error(`snapshot_hash_build_failed: ${error.message}`);
    }
  }

  /**
   * Find snapshot by sourceHash with TTL check
   * Returns null if not found or expired, and cached flag indicates if it was a cache hit
   */
  async findSnapshot(
    params: FindSnapshotParams,
    options: FindSnapshotOptions = {},
  ): Promise<FindSnapshotResult> {
    // Force refresh bypasses cache
    if (options.forceRefresh) {
      return { snapshot: null, cached: false };
    }

    try {
      const snapshot = await this.repository.findBySourceHash(params);

      if (!snapshot) {
        return { snapshot: null, cached: false };
      }

      // Check if expired
      if (snapshot.expiresAt) {
        // Validate expiresAt is a valid Date
        if (!(snapshot.expiresAt instanceof Date) || isNaN(snapshot.expiresAt.getTime())) {
          this.logger.error(`Invalid expiresAt for snapshot ${snapshot.id}: ${snapshot.expiresAt}`);
          throw new Error(`snapshot_expiry_invalid: Invalid expiresAt value`);
        }

        const now = new Date();
        if (snapshot.expiresAt < now) {
          this.logger.debug(`Snapshot ${snapshot.id} expired at ${snapshot.expiresAt}`);
          return { snapshot: null, cached: false };
        }
      }

      // Cache hit
      return { snapshot, cached: true };
    } catch (error) {
      this.logger.error(`Error finding snapshot: ${error.message}`, error.stack);
      throw new Error(`snapshot_deserialize_failed: ${error.message}`);
    }
  }

  /**
   * Create a new snapshot with optional TTL
   */
  async createSnapshot(data: CreateSnapshotData): Promise<AgentSnapshot> {
    try {
      // Calculate expiresAt if TTL is provided
      let expiresAt: Date | null = null;
      if (data.ttlSeconds !== undefined && data.ttlSeconds !== null) {
        if (data.ttlSeconds < 0) {
          throw new Error(`snapshot_expiry_invalid: TTL cannot be negative`);
        }
        if (data.ttlSeconds > 0) {
          expiresAt = new Date(Date.now() + data.ttlSeconds * 1000);
          // Validate the calculated date
          if (isNaN(expiresAt.getTime())) {
            throw new Error(`snapshot_expiry_invalid: Invalid calculated expiresAt`);
          }
        }
      }

      const snapshot = await this.repository.create({
        agentId: data.agentId,
        operation: data.operation ?? null,
        scopeType: data.scopeType,
        scopeId: data.scopeId ?? null,
        userId: data.userId ?? null,
        sourceHash: data.sourceHash,
        promptVersion: data.promptVersion,
        model: data.model ?? null,
        input: data.input,
        output: data.output,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      });

      this.logger.debug(`Created snapshot ${snapshot.id} for agent ${data.agentId}`);
      return snapshot;
    } catch (error) {
      this.logger.error(`Error creating snapshot: ${error.message}`, error.stack);
      if (error.message.includes('unique constraint')) {
        // If unique constraint violation, try to update existing snapshot
        const existing = await this.repository.findBySourceHash({
          agentId: data.agentId,
          operation: data.operation ?? null,
          userId: data.userId ?? null,
          scopeType: data.scopeType,
          scopeId: data.scopeId ?? null,
          sourceHash: data.sourceHash,
          promptVersion: data.promptVersion,
        });

        if (existing) {
          // Update existing snapshot
          let expiresAt: Date | null = null;
          if (data.ttlSeconds !== undefined && data.ttlSeconds !== null) {
            if (data.ttlSeconds < 0) {
              throw new Error(`snapshot_expiry_invalid: TTL cannot be negative`);
            }
            if (data.ttlSeconds > 0) {
              expiresAt = new Date(Date.now() + data.ttlSeconds * 1000);
              if (isNaN(expiresAt.getTime())) {
                throw new Error(`snapshot_expiry_invalid: Invalid calculated expiresAt`);
              }
            }
          }

          existing.input = data.input;
          existing.output = data.output;
          existing.model = data.model ?? null;
          existing.expiresAt = expiresAt ? new Date(expiresAt) : null;

          const updated = await this.repository.update(existing);
          this.logger.debug(`Updated existing snapshot ${existing.id} for agent ${data.agentId}`);
          return updated;
        }
      }
      throw new Error(`snapshot_hash_build_failed: ${error.message}`);
    }
  }

  /**
   * Invalidate a snapshot by deleting it
   */
  async invalidateSnapshot(id: string): Promise<void> {
    try {
      await this.repository.delete(id);
      this.logger.debug(`Invalidated snapshot ${id}`);
    } catch (error) {
      this.logger.error(`Error invalidating snapshot: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Clean up expired snapshots
   */
  async cleanupExpiredSnapshots(): Promise<number> {
    try {
      const now = new Date();
      const deletedCount = await this.repository.deleteExpiredSnapshots(now);
      this.logger.log(`Cleaned up ${deletedCount} expired snapshots`);
      return deletedCount;
    } catch (error) {
      this.logger.error(`Error cleaning up expired snapshots: ${error.message}`, error.stack);
      throw error;
    }
  }
}

