import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import * as crypto from 'crypto';
import { AgentSnapshot } from '../entities/agent-snapshot.entity';

/**
 * 快照服务
 * 负责 Agent 运行结果的缓存管理
 */
@Injectable()
export class SnapshotService {
  constructor(
    @InjectRepository(AgentSnapshot)
    private readonly snapshotRepository: Repository<AgentSnapshot>,
  ) {}

  /**
   * 计算 sourceHash
   * 基于 agentId, operation 和 input 数据
   */
  computeSourceHash(
    agentId: string,
    operation: string | null,
    input: Record<string, unknown>
  ): string {
    const data = JSON.stringify({ agentId, operation, input });
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * 计算 scopeHash
   * 用于快速查找（通常基于 userId, contactId 等范围标识）
   */
  computeScopeHash(scope: Record<string, unknown>): string {
    const data = JSON.stringify(scope);
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * 查找有效的快照（未过期）
   */
  async findValidSnapshot(
    agentId: string,
    sourceHash: string,
    operation?: string | null
  ): Promise<AgentSnapshot | null> {
    const now = Date.now();
    
    const where: any = {
      agentId,
      sourceHash,
      expiresAtMs: LessThan(now),
    };
    
    // TypeORM doesn't accept null directly for optional fields
    if (operation !== null && operation !== undefined) {
      where.operation = operation;
    } else {
      where.operation = null;
    }
    
    const snapshot = await this.snapshotRepository.findOne({
      where,
    });

    // 如果找到快照但已过期，返回 null
    if (snapshot && snapshot.expiresAtMs && snapshot.expiresAtMs < now) {
      return null;
    }

    return snapshot;
  }

  /**
   * 创建快照
   */
  async createSnapshot(
    agentId: string,
    operation: string | null,
    sourceHash: string,
    scopeHash: string,
    input: Record<string, unknown>,
    output: Record<string, unknown>,
    ttlMs: number
  ): Promise<AgentSnapshot> {
    const now = Date.now();
    const expiresAtMs = ttlMs > 0 ? now + ttlMs : null;

    const snapshot = this.snapshotRepository.create({
      agentId,
      operation,
      sourceHash,
      scopeHash,
      inputData: input,
      outputData: output,
      ttlMs,
      expiresAtMs,
    });

    return await this.snapshotRepository.save(snapshot);
  }

  /**
   * 删除过期快照
   */
  async deleteExpiredSnapshots(): Promise<number> {
    const now = Date.now();
    const result = await this.snapshotRepository.delete({
      expiresAtMs: LessThan(now),
    });
    return result.affected || 0;
  }

  /**
   * 根据 scopeHash 删除快照
   */
  async deleteByScopeHash(scopeHash: string): Promise<number> {
    const result = await this.snapshotRepository.delete({ scopeHash });
    return result.affected || 0;
  }

  /**
   * 根据 agentId 和 scopeHash 删除快照
   */
  async deleteByAgentAndScope(
    agentId: string,
    scopeHash: string
  ): Promise<number> {
    const result = await this.snapshotRepository.delete({
      agentId,
      scopeHash,
    });
    return result.affected || 0;
  }
}


