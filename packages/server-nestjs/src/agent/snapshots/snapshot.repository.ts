import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { AgentSnapshot, ScopeType } from '../../entities/agent-snapshot.entity';

export interface FindSnapshotParams {
  agentId: string;
  operation?: string | null;
  userId?: string | null;
  scopeType: ScopeType;
  scopeId?: string | null;
  sourceHash: string;
  promptVersion: string;
}

@Injectable()
export class SnapshotRepository {
  constructor(
    @InjectRepository(AgentSnapshot)
    private repository: Repository<AgentSnapshot>,
  ) {}

  async findBySourceHash(params: FindSnapshotParams): Promise<AgentSnapshot | null> {
    const where: any = {
      agentId: params.agentId,
      userId: params.userId ?? null,
      scopeType: params.scopeType,
      scopeId: params.scopeId ?? null,
      sourceHash: params.sourceHash,
      promptVersion: params.promptVersion,
    };
    
    // TypeORM doesn't accept null directly for optional fields, use undefined instead
    if (params.operation !== null && params.operation !== undefined) {
      where.operation = params.operation;
    } else {
      where.operation = null;
    }
    
    const snapshot = await this.repository.findOne({
      where,
    });

    return snapshot;
  }

  async create(data: {
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
    expiresAt?: Date | null;
  }): Promise<AgentSnapshot> {
    const snapshot = this.repository.create({
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
      expiresAt: data.expiresAt ?? null,
    });
    return this.repository.save(snapshot);
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }

  async update(snapshot: AgentSnapshot): Promise<AgentSnapshot> {
    snapshot.updatedAt = new Date();
    return this.repository.save(snapshot);
  }

  async findExpiredSnapshots(beforeDate: Date): Promise<AgentSnapshot[]> {
    return this.repository.find({
      where: {
        expiresAt: LessThan(beforeDate),
      },
    });
  }

  async deleteExpiredSnapshots(beforeDate: Date): Promise<number> {
    const result = await this.repository
      .createQueryBuilder()
      .delete()
      .from(AgentSnapshot)
      .where('expiresAt < :beforeDate', { beforeDate })
      .execute();
    return result.affected ?? 0;
  }
}

